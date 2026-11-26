# DailyGames Hub

A no-login marketplace and tracker for daily web games: Krillion, Daily Tens, Wordle, Connections, Worldle and more.

- **Today:** your favorite games as a checklist, with a progress ring, a daily streak, one-tap **Play** (opens a new tab), and a *"Did you finish?"* sheet when you come back.
- **Paste your results:** paste a game's share text and the app saves your score. Parsers cover Wordle, Connections, Strands, the Mini, Spelling Bee, Quordle, Octordle, Framed, Globle, Waffle, Contexto, Pinpoint, Queens/Tango/Zip, Worldle, Tradle, Nerdle, Mathler, Bandle, Costcodle, Flagle and Phrazle. Krillion and Daily Tens have best-effort parsers, and any other game gets a general one that reads `N/M` scores, times or guess counts.
- **Explore (the marketplace):** 40 starter games plus any the community adds. Search, filter by category, sort by Popular, New or A–Z, and star games to add them to your favorites.
- **Add by link:** paste any URL and the app fetches the game's name and icon. *Share to marketplace* is on by default; turn it off to keep the game private. `/add?url=…` works as a bookmarklet or Android share target.
- **Stats:** calendar heatmap, daily and perfect-day streaks, and per-game streak, best, win rate, average score or best time.
- **Sync without accounts:** the app creates a secret sync code automatically. Enter it (or scan the QR code) on another device and favorites and history sync both ways, with the latest edit winning.
- **Installable PWA** that works offline.
- **Admin** (`/admin`, sign in with GitHub, restricted to an allow-list):
  - **Usage dashboard:** total users over time, daily, weekly and monthly actives, new users, games played per day, most-played and most-favorited games, and the mobile/desktop split.
  - **Moderation queue:** community games publish instantly, and 3 reports from different devices hide a game automatically. Admins can restore, hide, remove or edit games.

## Stack

| | |
|---|---|
| App | Next.js 16 (App Router, Route Handlers, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS v4, lucide icons, hand-rolled SVG charts |
| Client storage | IndexedDB via Dexie (favorites, private games, plays, settings, sync outbox) |
| Server DB | SQLite via Drizzle ORM + libSQL: a local file in development, **Turso** in production |
| Admin auth | Auth.js (next-auth v5) with the GitHub provider and JWT sessions |
| Tests | Vitest (parsers, streak/date math, URL normalization, SSRF guard) |

## Run locally

```bash
npm install
cp .env.example .env.local     # optional for local dev
npm run db:setup               # creates ./local.db, runs migrations, seeds 40 games
npm run dev                    # http://localhost:3000
```

To preview `/admin` locally without creating a GitHub OAuth app, start the dev server with `ADMIN_DEV_BYPASS=1 npm run dev`. The bypass is ignored when `NODE_ENV=production`.

Useful scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run db:generate` (after changing `src/lib/server/schema.ts`), `npm run db:migrate`, `npm run db:seed` (safe to re-run; updates seed games by slug).

## Deploy to Vercel

1. **Database:** create a Turso database (`turso db create dailygames`), then get its URL (`turso db show dailygames --url`) and a token (`turso db tokens create dailygames`).
2. **GitHub OAuth app:** GitHub → Settings → Developer settings → OAuth Apps → *New*.
   - Homepage URL: `https://your-domain`
   - Authorization callback URL: `https://your-domain/api/auth/callback/github`
3. **Vercel project:** import the repo and set these environment variables:

   | Variable | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | `libsql://…` |
   | `TURSO_AUTH_TOKEN` | Turso token |
   | `HASH_SALT` | long random string (hashes anonymous device IDs/IPs) |
   | `AUTH_SECRET` | `npx auth secret` or `openssl rand -base64 32` |
   | `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | from the OAuth app |
   | `ADMIN_GITHUB_LOGINS` | comma-separated GitHub usernames allowed into `/admin` |
   | `BLOCKED_HOSTS` *(optional)* | extra hosts that can't be shared to the marketplace |

4. **Deploy.** The `vercel-build` script runs migrations and the (idempotent) seed before `next build`.

## How it works

### Identity and privacy
- Each browser generates a random **device ID**. The server only ever stores a salted hash of it. That hash is used for rate limits, one report per device, favorite counts, and the anonymous usage dashboard.
- **Sync code:** 128 random bits, shown as `XXXX-XXXX-…`. The server stores only `sha256(code)` and the records synced under it. Anyone who has the code can read and write that data, so the UI treats it like a password. Settings lets you link, unlink, rotate the code, or delete the synced copy.

### Sync protocol (`POST /api/sync`)
Every local write updates a record's `updatedAt` and adds a row to an outbox. The client pushes outbox records along with a cursor.

On the server, each sync space has its own sequence number:
- Each accepted change is stored with a new sequence number.
- Last-write-wins on `updatedAt`, and deletes are kept as tombstones so they propagate.
- The response returns everything after the client's cursor.

The client applies remote changes with the same rule. Sync runs 2 s after a change, and again on focus, when the browser comes back online, and every 5 minutes.

### Usage analytics
`POST /api/events` records a `visit` (at most once per device per day) and a `play` (one per game per device per day). The dashboard derives:
- total users: count of devices
- DAU, WAU and MAU: distinct devices in `daily_active`
- new users: from each device's first-seen day
- plays per day: from `play_events`

Days are in UTC.

### Moderation and abuse limits
- Community submissions are checked for a public URL. Duplicates are caught by normalizing the URL: no `www`, no tracking parameters, no trailing slash or `index.html`.
- Link shorteners and a small word list are blocked.
- Rate limits per device and IP: preview 30/h, publish 10/day, reports 20/day.
- 3 reports from different devices hide a game. When an admin restores a game, its earlier reports no longer count toward hiding it.

### Link previews (`POST /api/preview`)
- Only http/https on ports 80 and 443, with no credentials in the URL.
- DNS is resolved and private, loopback, link-local, CGNAT and multicast addresses are rejected. Each redirect (up to 3) is checked again.
- 5 s timeout, reads at most 1 MB, and stops at `</head>`.
- Extracts `og:site_name`/`og:title`, the description, and the best icon (apple-touch-icon, then icon, then a Google favicon fallback).

## Project layout

```
src/
  app/(app)/            Today, Explore, Add, Game (/g/[slug]), Stats, Settings
  app/admin/            login, usage dashboard, moderation (+ server actions)
  app/api/              games, preview, sync, events, auth
  auth.ts               Auth.js GitHub config + admin allow-list
  components/           UI (GameIcon, ResultSheet, Heatmap, charts/, …)
  lib/client/           Dexie DB, store (writes + outbox), sync engine, hooks
  lib/parsers/          share-text parsers
  lib/server/           Drizzle schema, db, games, sync, analytics, preview/SSRF, rate limiting
  lib/shared/           dates, streaks, URL normalization, categories
drizzle/                SQL migrations
scripts/                migrate + seed
tests/                  Vitest
```

## Known limitations
- I couldn't confirm the official URL or share format for **Daily Tens**, and the build environment couldn't reach either site. The seed uses `dailytens.com`; an admin can correct it under Moderation → All games → Edit. Both the Krillion and Daily Tens parsers are pattern-based (points/meters and `N/10`).
- The DNS check in the link preview runs before the fetch. A DNS-rebinding attack between the check and the fetch is still possible. It's an acceptable risk here because the server never returns the response body.
- Analytics count *browsers*, not people: one person on two browsers counts twice, and so does a cleared cache.
