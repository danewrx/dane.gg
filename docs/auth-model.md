# Authentication & permissions

The backend uses session cookies for the browser-based admin panel and scoped API keys
for bots and external services. This guide explains how authentication works and which route guards to use. Regular panel accounts can manage content;
account administration requires additional permissions.

## Session authentication

Login (`POST /api/auth/login`) sets a session cookie, `dane.gg.sid`
(`backend/src/index.ts`): `httpOnly`, `sameSite: strict`, `secure` gated on `COOKIE_SECURE`,
1-day `maxAge`, or 30 days when “remember me” is selected. Sessions are stored server-side in Postgres via `connect-pg-simple` (falls
back to in-memory if `DATABASE_URL` isn't set, e.g. some test contexts), so they survive
backend restarts.

If the account has TOTP/2FA enabled, login is two steps — password first, then a TOTP code or
backup code — handled entirely inside the login flow (`backend/src/routes/totp.ts` +
`routes/auth.ts`), not as a separate per-route guard.

The frontend's `hooks.server.ts`
checks for `dane.gg.sid` (via `GET /api/auth/me`) before allowing an admin route through.

## Session checks, refresh, and logout

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/login` | Checks the password and any required 2FA, rotates the session ID, and sets `dane.gg.sid` |
| `GET /api/auth/me` | Returns the current account using its session; used by browser and server-rendered authentication checks |
| `POST /api/auth/refresh` | Uses `requireSession`, reloads the account from the database, updates session user fields, and returns the user |
| `POST /api/auth/change-password` | Uses `requireSession`; still requires the current password and validates the new password |
| `POST /api/auth/logout` | Destroys the server-side session, removes its admin WebSocket registration, and expires `dane.gg.sid` in the browser |

The frontend calls `refreshSession()` every 30 minutes on admin, login, and logout routes.
A failed refresh clears the client auth state and redirects to login. Refresh requires an
existing authenticated session; it cannot restore an expired session using a separate token.
If the account no longer exists, the endpoint returns an error. A changed admin flag is
copied into the session, rather than rejecting a legitimate non-admin panel account.

## API keys for bots and external services

Format `dk_` + 40 chars, created from `Admin → API Keys` (`/admin/api-keys`), stored as a
SHA-256 hash (`api_keys` table) and validated with constant-time comparison. This is the
credential the [Discord bridge](discord-integration.md) and any custom integration you build
use.

Every key has exactly one **permission** scope, and unlike browser sessions, keys
are restricted not just by *whether* they're authenticated but by *what HTTP surface they can
touch* — enforced centrally by `enforceApiKeyHttpScope()`, which runs automatically after any
route resolves `req.user` from an API key (via `requireAuth`/`requireSession`/`apiKeyAuth`):

| Permission | HTTP methods | Allowed paths |
| --- | --- | --- |
| `full` | any | Routes accepting API keys, including admin guards; endpoint-specific checks still apply |
| `read` | `GET`/`HEAD`/`OPTIONS` only | any except `/webhooks/*` |
| `chat` | `GET`/`HEAD`/`OPTIONS` only | only `/api/chat`, `/api/emojis`, `/api/chat-notification-sounds` |
| `webhooks` | `POST`/`OPTIONS` only | only `/webhooks/*` |

**This table is HTTP-only.** The chat bridge's WebSocket connection (`/ws/chat`) does its own,
separate key validation in `chatService.ts` that only checks the key is active/unexpired and
has `full` or `chat` permission — it doesn't go through `enforceApiKeyHttpScope` at all, since
it's not an Express HTTP route.

`requireWebhookAccess` (used on the two `/webhooks/*` routes) is a narrower check layered on
top: admin session **or** an API key with `full`/`webhooks` permission.

## Guard reference

| Guard | Accepts | Used for |
| --- | --- | --- |
| `requireAuth` / `requireSession` | Any authenticated account session, **or** an active, unexpired API key (any permission — the key's own scope restricts it further) | Content management: blog, projects, themes, fonts, skills, certifications, adverts, contact, stats, config, social links, Twitter/Uptime Kuma settings, notifications |
| `requireAdmin` | Admin session or `full`-permission API key only (`req.user.isAdmin`) | **Only** user management (`users.ts`), API key management (`apiKeys.ts`), and uploading/deleting custom chat notification sounds (`chatNotificationSounds.ts`) |
| `requireWebhookAccess` | Admin session, or API key with `full`/`webhooks` permission | The two `/webhooks/*` routes |

## Account roles

Administrators create all accounts; public registration is disabled. Regular accounts can
manage content and site configuration through the panel. Administrative permissions are
required for user management, API key management, and uploading or deleting custom chat
notification sounds.

Use `requireAuth` or `requireSession` for content routes so regular accounts retain access.
Add `requireAdmin` for the administrative operations listed in the guard reference.

## Adding an authenticated route

1. **Just needs "any logged-in account"** (the common case — most content/config
   endpoints) → `requireAuth` or `requireSession` (they behave the same for HTTP; `requireAuth`
   checks the API key header first, `requireSession` checks the session cookie first — pick
   whichever matches the surrounding file's convention).
2. **Genuinely account-level / sensitive** (creating users, managing API keys, anything that
   could escalate privilege or leak credentials) → add `requireAdmin` after `requireSession`.
3. **A webhook meant for bots/external services** → `requireAuth`/`requireSession` +
   `requireWebhookAccess`, and make sure it's mounted under `/webhooks` (that path prefix is
   used by the `webhooks`-scoped key restriction above).
4. **Self-service account operations** should use a real user session. Remember that
   `requireSession` also accepts API keys; add a session-only check when an endpoint must
   exclude service credentials.
