# Discord integration

dane.gg's Discord features (webchat bridge, online/offline presence widget, custom emoji
sync) are powered by a separate bot process — nothing in this repo depends on it to run.
Without it, the site just shows no live Discord status and the webchat only carries
web-originated messages.

This guide describes the website's HTTP and WebSocket interfaces so you can implement a
bridge in your own bot. The bot connects to Discord and forwards events to these endpoints.

## Features

| Feature | Direction | How |
| --- | --- | --- |
| Webchat bridge | Discord ⇄ site | Bot holds an authenticated WebSocket connection to `/ws/chat` and relays messages both ways |
| Online/offline widget | Discord → site | Bot watches one Discord user's presence and `POST`s `0`/`1` to a webhook |
| Custom emoji sync | Discord → site | Bot pushes the guild's custom emoji list to a webhook whenever it changes, so `:emoji:` works in webchat |

Implement only the features you need; presence tracking and emoji sync are optional.

## 1. Create the Discord application & bot

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → **Add Bot** → copy the token.
3. Still on the **Bot** tab, under **Privileged Gateway Intents**, enable:
   - **Server Members Intent** — needed to resolve a message author's display name/role color
   - **Message Content Intent** — needed to read the content of messages in the bridged channel
   - **Presence Intent** — only if you want the online/offline widget

   Discord rejects the gateway connection with a "disallowed intents" error if your bot
   requests an intent that isn't enabled here.
4. **OAuth2 → URL Generator**: scope `bot`, permissions **View Channel**, **Send Messages**,
   **Read Message History**. Open the generated URL and invite the bot to your server.
5. Enable Developer Mode in Discord (User Settings → Advanced) so you can right-click to
   copy IDs, then grab your server ID and the ID of the channel you want to bridge.

## 2. Configure dane.gg

The bot authenticates to dane.gg using the same API keys as everything else in
`Admin → API Keys` (`/admin/api-keys`) — there's no separate credential system for it.

1. Create a key with permission **Chat Only** → this is `WEBCHAT_API_KEY`. It's used for the
   WebSocket bridge only; it does not work against the webhook endpoints below.
2. If you want presence tracking and/or emoji sync, create a second key with permission
   **Webhooks Only** → this is `WEBHOOK_AUTH_TOKEN`. (You can use one **Full Access** key for
   both, but separate scoped keys limit each credential to its intended use.)
3. `Admin → Chat` (`/admin/chat`) has a "Discord chat integration" toggle
   (`discord_chat_integration_enabled` in `site_config`). It must be **on** for the bridge to
   relay messages. Have your bot poll this setting periodically and stop forwarding when it's off.

## 3. The webchat bridge protocol (`/ws/chat`)

Connect a WebSocket client to `wss://your-domain/ws/chat` (or `ws://localhost:3001/ws/chat`
in local dev) with one of:

- `Authorization: Bearer dk_<your key>`
- `X-API-Key: dk_<your key>`

using the **Chat Only** (or **Full Access**) key from step 2.1.

### Authentication

The server accepts public chat connections, so an open connection alone does not confirm
API key authentication. Authenticated admin or API key connections receive an `adminConfig`
event. Public events such as `system`, `userCount`, and available message history do not
confirm authentication.

A privileged command sent without authentication returns an error:

```json
{ "type": "error", "message": "Unauthorized" }
```

Check the key, its scope, and its expiry before reconnecting after an authentication error.

### Messages the server sends you

Chat events use JSON objects with a `type` field. Deletion commands use raw text as described below. The main chat events are:

- `{"type":"message","data":{id, timestamp, nickname, message, formatted, color?, source}}` —
  a chat message. `source` is `"web"`, `"discord"`, or `"admin"`. **Ignore messages where
  `source === "discord"`** — those originated from your own bridge and echoing them back would
  loop.
- `{"type":"error","message":"..."}` — see handshake note above.

### Sending a Discord message into webchat

Send a **raw text frame** (not JSON-wrapped) of the form:

```
/discord {"nickname":"...","message":"...","color":"#rrggbb","discordMessageId":"123456789"}
```

- `nickname` and `message` are required; `color` and `discordMessageId` are optional.
- Nicknames are sanitized and limited to 50 characters. Messages over 1000 characters
  and JSON payloads over 5000 characters are rejected.
- `color` must match `^#[0-9A-Fa-f]{6}$` or it's silently dropped.
- `discordMessageId`, if present, must be a numeric string ≤100 chars (Discord snowflake).
- Requires: admin/API-key authenticated connection, and `discord_chat_integration_enabled`
  must be on (Admin → Chat) — otherwise you get an `error` frame explaining which.

The server broadcasts your message back out to all clients as a `message` frame with
`source: "discord"` and a server-generated `id`.

### Reporting the Discord-side message ID back

After you relay a webchat-originated message to Discord and get a Discord message ID for it,
tell the server so deletions can round-trip later:

```
/set_discord_message_id <siteMessageId> <discordMessageId>
```

`siteMessageId` is the `id` field from the `message` frame you received from webchat.

### Deletion, both directions

- **Discord → site**: if a message gets deleted in your bridged Discord channel, send
  `/delete_from_discord <discordMessageId>` and the server deletes the matching site message
  (matched via the mapping you stored above).
- **Site → Discord**: the server can push `/delete_discord_message <discordMessageId>` to you
  (raw text, same shape) when an admin deletes a bridged message on the site — your bot should
  delete that message on Discord in response.

### Enable or disable the chat bridge

`Admin → Chat` (`/admin/chat`) has a "Discord chat integration" toggle
(`discord_chat_integration_enabled` in `site_config`, readable at
`GET /api/config/discord_chat_integration_enabled` → `{"success":true,"data":{"value":bool}}`,
404 if never set — treat 404 as enabled). Poll it periodically, for example every 30 seconds,
and stop sending `/discord` while it's off; the server also enforces it server-side and will
error if you send anyway.

## 4. The presence webhook (online/offline widget)

```
POST /webhooks/discord-status/update
Authorization: Bearer dk_<key with Webhooks Only or Full Access>
Content-Type: application/json

{"status": 0 | 1}
```

`1` = online (map Discord `online`/`idle`/`dnd` → `1`), `0` = offline (`offline`/`invisible`/
not in guild → `0`). Watch Discord Gateway presence updates for one specific user (your own
account) and POST only when the mapped value changes — debounce a few seconds so rapid
status flapping doesn't spam the endpoint. Responses: `200` success, `400` if `status` isn't
`0`/`1`, `401` for missing credentials, and `403` for an invalid key or insufficient scope.

## 5. The emoji sync webhook (`:emoji:` support in webchat)

```
POST /webhooks/discord-emojis/sync
Authorization: Bearer dk_<key with Webhooks Only or Full Access>
Content-Type: application/json

{"emojis": [{"id": "123", "name": "pog", "imageUrl": "https://cdn.discordapp.com/emojis/123.png", "animated": false}]}
```

Send the **full current list** of the guild's custom emoji on startup and whenever it changes
(create/update/delete) — this is a full sync, not a diff; anything you omit gets marked
deleted server-side. `imageUrl` for animated emoji should point at the `.gif` CDN variant.
Response: `{"success":true,"synced":n,"skipped":n}`. To translate between the two syntaxes
yourself: Discord's `<:name:id>` / `<a:name:id>` ↔ the site's `:name:`.

## Verifying it's working

- After connecting with a valid key, sending `/discord {"nickname":"test","message":"hi"}`
  should show up in the site's chat widget without an `error` frame coming back.
- A message typed in the site's chat widget should arrive as a `message` frame over your
  WebSocket connection (with `source` other than `"discord"`).
- `POST /webhooks/discord-status/update` with `{"status":1}` should flip the homepage
  online/offline indicator after its next data refresh.
- `POST /webhooks/discord-emojis/sync` should make `:name:` render as an image in webchat.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `/discord` (or other bot-only command) returns `{"type":"error","message":"Unauthorized"}` | Key wrong, inactive, expired, or wrong permission scope (needs Chat Only/Full Access for the WS bridge) |
| Webhook calls return `403` | Key is invalid, inactive, expired, or lacks `Webhooks Only`/`Full Access` permission |
| Webhook calls return `401` | Authentication credentials are missing |
| Bot won't log in to Discord at all | A requested gateway intent isn't enabled in the Developer Portal (step 1.3) |
| `/discord` returns an error mentioning "integration is disabled" | `discord_chat_integration_enabled` is off in `Admin → Chat` |
