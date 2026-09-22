# Third-party integrations

dane.gg has five optional integrations, each gated purely by whether its env vars are set —
none of them are required for the site to run. This doc covers what each one needs, where to
get credentials, and non-obvious behavior worth knowing before you flip one on.

| Integration | Powers | Configured via |
| --- | --- | --- |
| [Twitter/X](#twitterx) | "Recently on X" widget on the homepage | `.env` + `Admin → Configuration` |
| [Last.fm](#lastfm) | "Recently Played" now-playing widget | `.env` only |
| [GitHub contributions](#github-contributions) | Contribution calendar widget | `.env` + `Admin → Configuration` |
| [Uptime Kuma](#uptime-kuma) | Service status widget | `.env` + `Admin → Configuration` |
| [ntfy](#ntfy-push-notifications) | Push notifications for admin logins etc. | `.env` + `Admin → Notifications` |

## Twitter/X

**What it does:** periodically fetches the latest tweet(s) from one account and stores them
in the `tweets` table; the homepage widget reads the most recent one. On first startup it also
does a one-time full-history backfill.

**How it authenticates — read this first:** this does not use the official paid Twitter API.
It uses [`twitter-openapi-typescript`](https://www.npmjs.com/package/twitter-openapi-typescript),
an unofficial client that authenticates as a *logged-in browser session* via cookies
(`backend/src/services/twitterApiService.ts:initialize`). That means:

- You need `auth_token` and `ct0` cookie values from an actual logged-in x.com session (your
  own account, or a throwaway one — whichever tweets you want to backfill needs to be visible
  to that account). Log into x.com in a browser, open DevTools → Application/Storage →
  Cookies, and copy those two values.
- `TWITTER_COOKIES` is a raw `Cookie:`-header-style string: `auth_token=...; ct0=...`
  (semicolon-separated `key=value` pairs — the service parses it exactly like a browser would
  send it).
- Because this rides on a real session rather than an API key, it's inherently fragile: X can
  invalidate the session, rate-limit it, or flag the account for automated behavior. Poll
  conservatively — the default is every 2 minutes, and the service logs a warning that
  "polling too frequently may trigger rate limits or account restrictions."

**Env vars:**

| Variable | Required | Notes |
| --- | --- | --- |
| `TWITTER_COOKIES` | Yes | `auth_token=...; ct0=...` from a logged-in session |
| `TWITTER_USERNAME` | Yes* | Account to fetch tweets from. *Can also be set from `Admin → Configuration` (DB value wins if set — see below) |
| `TWITTER_PROXY_PROFILE_IMAGES` | No (default `true`) | Proxies `pbs.twimg.com` avatar images through the backend so browser tracking-protection doesn't block them |
| `TWITTER_FETCH_CRON` | No (default `*/2 * * * *`) | Standard cron expression for the polling job |
| `TWITTER_HEALTH_CHECK_CRON` | No (default `0 */2 * * *`) | How often to verify the session is still valid |
| `TWITTER_FETCH_PRUNE_DELETED` | No (default `true`) | On each poll, remove DB tweets newer than the API's latest if the newest tweet was deleted upstream |
| `TWITTER_FULL_BACKFILL_ENABLED` | No (default `true`) | Run a one-time full-history backfill on startup |
| `TWITTER_FULL_BACKFILL_BATCH_SIZE` / `_MAX_PAGES` / `_MAX_NEW_TWEETS` / `_MIN_INTERVAL_MS` / `_PRUNE_DELETED` | No | Tune backfill size/frequency — see `.env.example.dev` for defaults |
| `TWITTER_MAX_STORED_TWEETS` | No (default `0` = unlimited) | Cap how many tweets are retained in the DB |

**Note on `TWITTER_USERNAME`:** the scheduler checks the `twitter_username` key in
`site_config` (settable from `Admin → Configuration`) *before* falling back to the env var —
so you can change which account is tracked without redeploying. Same pattern as
`github_username` below.

## Last.fm

**What it does:** shows your currently-playing (or most recently played) track via the
official Last.fm API — no scraping involved, this one's straightforward.

**Setup:**

1. Get an API key at [last.fm/api/account/create](https://www.last.fm/api/account/create)
   (needs a Last.fm account; the key is free).
2. Set both env vars — there's no admin-panel override for this one, unlike Twitter/GitHub.

| Variable | Required |
| --- | --- |
| `LASTFM_API_KEY` | Yes |
| `LASTFM_USERNAME` | Yes — the Last.fm username whose scrobbles to show |

If no track is currently playing, the widget falls back to the last-played track. If Last.fm
doesn't have artwork for a track, the service falls back to an iTunes Search API lookup for
cover art (no credentials needed for that fallback — it's a public endpoint).

## GitHub contributions

**What it does:** renders a GitHub-style contribution calendar (like the one on GitHub
profiles) via GitHub's GraphQL API.

**Setup:**

1. [Generate a personal access token](https://github.com/settings/tokens) — classic or
   fine-grained. Only public profile data is queried, so it needs **no special scopes**.
2. Set `GITHUB_TOKEN`. `GITHUB_ENABLED` and `GITHUB_USERNAME` can be set via env *or* from
   `Admin → Configuration` (`github_enabled` / `github_username` in `site_config` — same
   DB-overrides-env pattern as Twitter).

| Variable | Required | Notes |
| --- | --- | --- |
| `GITHUB_TOKEN` | Yes | No special scopes needed for public contribution data |
| `GITHUB_ENABLED` | No | Also toggleable from `Admin → Configuration` |
| `GITHUB_USERNAME` | No | Also settable from `Admin → Configuration` |

The widget endpoint (`GET /api/widgets/github-contributions`) caches the result in memory for
10 minutes regardless of how often the page is loaded.

## Uptime Kuma

**What it does:** pulls monitor status from a self-hosted
[Uptime Kuma](https://github.com/louislam/uptime-kuma) instance for the status widget. Which
monitors are shown is chosen from `Admin → Configuration` (stored as
`uptime_kuma_selected_monitors` in `site_config`), not by env var.

**Two modes, based on which env vars you set:**

| Variable | Required | Effect |
| --- | --- | --- |
| `UPTIME_KUMA_URL` | Yes | Base URL of your Uptime Kuma instance |
| `UPTIME_KUMA_API_KEY` | No | If set, uses Uptime Kuma's REST API (full monitor list, needed to populate the picker in `Admin → Configuration`). If unset, falls back to scraping a public status page — you'll need at least one status page configured in Uptime Kuma for that fallback to return anything |

Without `UPTIME_KUMA_URL` set at all, the public status endpoint just returns an empty list —
no error, the widget quietly shows nothing.

## ntfy (push notifications)

**What it does:** sends push notifications (via [ntfy](https://ntfy.sh), self-hostable or the
public instance) for admin-panel security events, and optionally Twitter connection
health. Unlike the widgets above, this isn't visitor-facing — it's an ops/alerting channel for
you as the site owner.

**Events that trigger a notification** (all customizable — title/body/priority/tags/icon/click
URL — from `Admin → Notifications`, backed by `ntfy_settings` in `site_config`):

| Event | When |
| --- | --- |
| Admin login success | Every successful admin login, with username/IP/2FA status |
| Admin login failed | Governed by `ADMIN_LOGIN_NOTIFY_FAILED`: `lockout` (default, only notify on lockout) / `each` (notify every failed attempt) / `off` |
| Admin login lockout | IP locked out after `ADMIN_LOGIN_MAX_FAILED_ATTEMPTS` failures |
| Twitter connection failed/restored | Twitter integration's health check changes state (debounced — see `NOTIFICATION_COOLDOWN` in `twitterApiService.ts`) |
| Test notification | Manually triggered from `Admin → Notifications` to verify setup |

Message templates support placeholders like `{username}`, `{ip}`, `{time}`, `{totp}`,
`{attemptCount}`, `{maxAttempts}`, `{lockoutMinutes}`, `{error}` depending on the event.

**Env vars:**

| Variable | Required | Notes |
| --- | --- | --- |
| `NTFY_TOPIC` | Yes (this is what gates the whole feature — `isConfigured()` just checks this) | Topic name on your ntfy server |
| `NTFY_URL` | No (default `https://ntfy.sh`) | Point this at a self-hosted instance if you run one |
| `NTFY_TOKEN` | No | Bearer token auth, if your topic/server requires it |
| `NTFY_USERNAME` / `NTFY_PASSWORD` | No | Basic auth, alternative to `NTFY_TOKEN` |
| `ADMIN_LOGIN_NOTIFY_FAILED` | No (default `lockout`) | `lockout` / `each` / `off` — see table above |

If you're using the public `ntfy.sh` with no auth, anyone who knows your topic name can read
your notifications — pick a topic name that isn't guessable (a random topic like a subscribed
`Admin → Notifications` test send makes this obvious quickly), or self-host, or set
`NTFY_TOKEN`/basic auth.
