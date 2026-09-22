# Authentication & permissions

The backend recognizes three kinds of credential — session cookie, JWT, API key — but in
practice they're not three equally-used systems. This doc explains what each actually does
today, which guard middleware to reach for when adding a route, and the design intent behind
who gets access to what (so it doesn't get "corrected" by accident — this has happened once
already).

## 1. Session auth — what actually protects the admin panel

Login (`POST /api/auth/login`) sets a session cookie, `dane.gg.sid`
(`backend/src/index.ts`): `httpOnly`, `sameSite: strict`, `secure` gated on `COOKIE_SECURE`,
1-day `maxAge`. Sessions are stored server-side in Postgres via `connect-pg-simple` (falls
back to in-memory if `DATABASE_URL` isn't set, e.g. some test contexts), so they survive
backend restarts.

If the account has TOTP/2FA enabled, login is two steps — password first, then a TOTP code or
backup code — handled entirely inside the login flow (`backend/src/routes/totp.ts` +
`routes/auth.ts`), not as a separate per-route guard.

This is the credential that actually gates `/admin/*` — the frontend's `hooks.server.ts`
checks for `dane.gg.sid` (via `GET /api/auth/me`) before allowing an admin route through.

## 2. JWT — a secondary path, partly dead code today

Login also sets `accessToken`/`refreshToken` cookies (JWT, `JWT_EXPIRES_IN` /
`JWT_REFRESH_EXPIRES_IN` env vars), and `authenticateToken` (pure-JWT middleware) exists in
`middleware/auth.ts`. In the current codebase it's used on exactly two routes:
`GET /api/auth/verify` and `POST /api/auth/change-password`. `optionalAuth` (JWT, doesn't
fail if missing) is exported but not used by any route at all.

**Worth knowing if you touch this:** the frontend's `hooks.server.ts` has a fallback path for
SSR admin-route checks that reads a cookie literally named `authorization` and, if present,
calls `/api/auth/verify` with it. Nothing in the backend's login flow sets a cookie by that
name (it sets `accessToken`/`refreshToken`) — so as far as I can tell that fallback can't
currently trigger via normal login. The session-cookie check (tried first, in the same
function) is what's actually doing the work. This looks like drift rather than intentional
design; worth confirming and either wiring it up (e.g. mirror `accessToken` into a cookie
named `authorization`) or removing the dead branch.

## 3. API keys — for bots and external services

Format `dk_` + 40 chars, created from `Admin → API Keys` (`/admin/api-keys`), stored as a
SHA-256 hash (`api_keys` table) and validated with constant-time comparison. This is the
credential the [Discord bridge](discord-integration.md) and any custom integration you build
use — there's no separate service-account system.

Every key has exactly one **permission** scope, and unlike the other two auth methods, keys
are restricted not just by *whether* they're authenticated but by *what HTTP surface they can
touch* — enforced centrally by `enforceApiKeyHttpScope()`, which runs automatically after any
route resolves `req.user` from an API key (via `requireAuth`/`requireSession`/`apiKeyAuth`):

| Permission | HTTP methods | Allowed paths |
| --- | --- | --- |
| `full` | any | any authenticated route |
| `read` | `GET`/`HEAD`/`OPTIONS` only | any except `/webhooks/*` |
| `chat` | `GET`/`HEAD`/`OPTIONS` only | only `/api/chat`, `/api/emojis`, `/api/chat-notification-sounds` |
| `webhooks` | `POST`/`OPTIONS` only | only `/webhooks/*` |

**This table is HTTP-only.** The chat bridge's WebSocket connection (`/ws/chat`) does its own,
separate key validation in `chatService.ts` that only checks the key is active/unexpired and
has `full` or `chat` permission — it doesn't go through `enforceApiKeyHttpScope` at all, since
it's not an Express HTTP route. Don't assume the table above describes WS behavior.

`requireWebhookAccess` (used on the two `/webhooks/*` routes) is a narrower check layered on
top: admin session **or** an API key with `full`/`webhooks` permission — it's what actually
requires the scope in the table above to be correct, `enforceApiKeyHttpScope` just restricts
what a *given* scope is allowed to reach.

## Guard reference

| Guard | Accepts | Used for |
| --- | --- | --- |
| `requireAuth` / `requireSession` | Admin session, **or** any active API key (any permission — the key's own scope restricts it further) | Content management: blog, projects, themes, fonts, skills, certifications, adverts, contact, stats, config, social links, Twitter/Uptime Kuma settings, notifications |
| `requireAdmin` | Admin session or `full`-permission API key only (`req.user.isAdmin`) | **Only** user management (`users.ts`), API key management (`apiKeys.ts`), and deleting custom chat notification sounds (`chatNotificationSounds.ts`) |
| `requireWebhookAccess` | Admin session, or API key with `full`/`webhooks` permission | The two `/webhooks/*` routes |
| `authenticateToken` | JWT only (no session, no API key) | `/api/auth/verify`, `/api/auth/change-password` |
| `optionalAuth` | JWT if present, never fails | Exported, currently unused |

## The intentional part: `requireAuth`, not `requireAdmin`, is correct on content routes

This is deliberate, not an oversight: the admin panel is private (no public registration —
admins create every account), so a non-admin account is still a legitimate, trusted user of
the panel, just without user/API-key management rights. `requireAuth`/`requireSession` is the
right guard for content-management routes; `requireAdmin` is reserved for the genuinely
sensitive, account-level operations listed above.

If you're reviewing a diff and see a content route using `requireAuth` instead of
`requireAdmin`, that's not a privilege-escalation bug to "fix" — adding `requireAdmin` there
would lock out regular accounts from doing their job. (This has been added incorrectly once
already, to the adverts routes, and had to be reverted.)

## Adding a new authenticated route — which guard to use

1. **Just needs "any logged-in account"** (the common case — most content/config
   endpoints) → `requireAuth` or `requireSession` (they behave the same for HTTP; `requireAuth`
   checks the API key header first, `requireSession` checks the session cookie first — pick
   whichever matches the surrounding file's convention).
2. **Genuinely account-level / sensitive** (creating users, managing API keys, anything that
   could escalate privilege or leak credentials) → add `requireAdmin` after `requireSession`.
3. **A webhook meant for bots/external services** → `requireAuth`/`requireSession` +
   `requireWebhookAccess`, and make sure it's mounted under `/webhooks` (that path prefix is
   load-bearing for the `webhooks`-scoped key restriction above).
4. **Don't use `authenticateToken`/`optionalAuth`** for new routes unless you're specifically
   working on the JWT path — everything else in the app is built around session + API key.
