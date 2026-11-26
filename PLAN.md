# DailyGames Hub — Implementation Plan

A no-login "marketplace" and tracker for daily web games (Krillion, Daily Tens, Wordle, Connections, …).
Personal data lives in the browser (like the games themselves). An anonymous sync code links devices.

## 1. Decisions (from Q&A)

| Topic | Decision |
|---|---|
| Backend role | Shared catalog + link preview + anonymous sync + community submissions |
| Tracking | Played-today checkmarks, streaks & calendar heatmap, paste/parse share results |
| Stack | Next.js (App Router, TypeScript) + SQLite via Drizzle |
| Hosting | Vercel → SQLite runs on **Turso (libSQL)** in prod, a local `.db` file in dev |
| Moderation | Auto-publish + user reports (auto-hide at threshold) + rate limiting |
| Sync | Secret sync code / QR, automatic last-write-wins sync per record |
| Seed | ~40 curated games across categories |
| Opening games | New tab; on return, a "Did you finish? Paste result" sheet |
| Add by URL | Added to your favorites; "Share to marketplace" checkbox on by default |
| Look | Clean, playful cards, light/dark, mobile-first |

### Changes at approval
- `/admin` is protected by **GitHub sign-in (Auth.js)**, limited to the usernames in `ADMIN_GITHUB_LOGINS`. It replaces the token-in-URL idea.
- New **usage dashboard** at `/admin`:
  - total users (anonymous devices) over time
  - daily, weekly and monthly active users, and new users
  - games played per day
  - most-played and most-favorited games
  - mobile/desktop split
  - sync and catalog counts
- The data comes from anonymous `visit`/`play` pings (`/api/events`), stored as salted device hashes.

## 2. Tech stack

- **Next.js 15** (App Router, Route Handlers for API), TypeScript, React Server Components for catalog pages
- **Tailwind CSS + shadcn/ui** (Radix) for the UI, `lucide-react` icons
- **Drizzle ORM** + `@libsql/client` (works for local SQLite files and Turso)
- **Zod** to validate every API input
- **Dexie (IndexedDB)** for client data, with a small `localStorage` key for device ID/theme
- **PWA**: web manifest + service worker (Serwist), so it installs to the home screen and works offline for today's list
- **Testing**: Vitest (parsers, streak math, sync merge, URL normalization), Playwright (main flows)
- **Lint/format**: ESLint + Prettier; GitHub Actions CI (lint, typecheck, test)

## 3. Architecture

```
Browser (Next.js client)
 ├─ IndexedDB (Dexie): favorites, customGames, plays, settings, outbox
 ├─ Sync engine: push outbox / pull changes  ──►  /api/sync
 ├─ Catalog views (server-rendered)          ──►  /api/games, RSC
 └─ Add-by-URL                               ──►  /api/preview, /api/games (POST)

Vercel (Next.js Route Handlers)
 └─ Drizzle ─► Turso / libSQL (SQLite)
```

No accounts. Identity takes two forms:
- **deviceId**: a random UUID per browser. Only its salted hash is sent and stored, for rate limits, report de-duplication and favorite counts.
- **syncSecret**: a random 128-bit secret, shown as a code like `K7QF-9M2X-…` or a QR code. The server stores only `sha256(secret)` as the sync space ID. Anyone holding the code can read and write that space, so the UI treats it like a password.

## 4. Data model

### Server (SQLite / Turso)

- `games`: id, slug, name, url, normalized_url (unique), host, description, icon_url, category (word/geo/trivia/math/music/movies/logic/other), tags (json), source (`seed`|`community`), status (`active`|`hidden`|`removed`), report_count, favorite_count, submitter_hash, created_at, updated_at
- `reports`: id, game_id, reporter_hash, reason (`broken`|`spam`|`duplicate`|`not_daily`|`other`), note, created_at; unique(game_id, reporter_hash)
- `sync_spaces`: id (hash of secret), created_at, last_seen_at
- `sync_records`: space_id, kind (`favorite`|`customGame`|`play`|`setting`), key, payload (json), updated_at (client ms), deleted (bool), server_seq (autoincrement); PK(space_id, kind, key)
- `rate_limits`: bucket key, window start, count (simple fixed window, so Redis isn't needed)

### Client (IndexedDB)

- `favorites`: gameRef (catalog id or `custom:<uuid>`), order, addedAt, updatedAt, deleted
- `customGames`: private games (name, url, icon, category)
- `plays`: key `<gameRef>|<YYYY-MM-DD>`, completedAt, resultText, parsed `{ score, max, failed, timeSec, grid }`, updatedAt, deleted
- `settings`: theme, day-start hour (default midnight local), and the toggle for the "prompt after play" sheet
- `outbox`: pending changes for sync

"Today" uses the **browser's local date**. An optional "day starts at" setting covers night owls.

## 5. API (Route Handlers)

| Method & path | Purpose |
|---|---|
| `GET /api/games?q=&category=&sort=popular\|new\|az&cursor=` | Search and browse active games |
| `GET /api/games/[slug]` | Game details |
| `POST /api/preview { url }` | Fetch page metadata (og:title/description, favicon/apple-touch-icon/manifest icons) and say whether the game already exists |
| `POST /api/games { url, name, category, description }` | Publish a community game. Dedupes on normalized URL and returns the existing game on a match |
| `POST /api/games/[id]/report { reason, note }` | One report per device. **3 unique reports → auto-hidden** |
| `POST /api/games/[id]/favorite { on }` | Anonymous favorite counter for "Popular" (deduped per device hash) |
| `POST /api/sync { since, changes[] }` | Header `X-Sync-Key`. Applies changes with last-write-wins on `updated_at` and returns all records with `server_seq > since` plus a new cursor |
| `DELETE /api/sync` | Deletes the sync space ("unlink everywhere") |
| `POST /api/events { type: visit\|play }` | Anonymous usage pings behind the admin dashboard |
| `/admin`, `/admin/games` (GitHub sign-in) | Usage dashboard and moderation: restore, hide, remove or edit games |

**Safety for `/api/preview` (SSRF):**
- Allow only http/https on ports 80/443.
- Resolve DNS and block private, loopback and link-local IPs.
- Allow at most 3 redirects, each re-checked.
- 5 s timeout and a 1 MB body cap; read only the HTML `<head>`.

**Abuse limits:**
- Rate limits per IP hash and device hash: preview 30/hour, publish 10/day, reports 20/day.
- Reject URLs that aren't reachable.
- A basic blocklist of hosts and words.

## 6. Share-result parsing

Pluggable parser registry: `{ id, matchHost, matchText(regex), parse(text) → ParsedResult }`.
- **Specific parsers** to start: Wordle, Connections, Strands, NYT Mini (time), Spelling Bee (rank), Quordle, Worldle, Globle, Tradle, Framed, Bandle, Nerdle, Waffle, Costcodle, plus **Krillion** and **Daily Tens**. I'll check real share strings for these two during the build.
- **Generic fallback**: keep the raw text and extract `N/M`, `X/M` (fail), times like `1:23`, and the emoji grid.
- The pasted text auto-detects which game it belongs to, so pasting on the Today page can check off the right game.
- The "Paste" button uses the Clipboard API where allowed, with a textarea fallback.

## 7. UI / pages

1. **Today (`/`)**
   - Shows your favorites as playful tiles (favicon, name, category color) and a progress ring ("4 of 7 done").
   - Each tile has Play (opens a new tab), a quick ✓, and the parsed result once you've done it.
   - Drag to reorder.
   - When you come back to the tab after hitting Play, a bottom sheet asks "Finished Krillion? Paste result / Mark done / Not yet".
2. **Explore (`/explore`)**: the marketplace. Search, category chips, Popular/New/A–Z sorting, and a ☆ on every card to favorite it.
3. **Add (`/add`)**, also a ➕ button in the header:
   - Paste a URL to get a live preview card with editable name and category.
   - "Share to marketplace" checkbox, on by default.
   - If the game already exists you get "Already in the marketplace — added to favorites".
   - Also supports `/add?url=…`, so a bookmarklet or share sheet can send links straight in (PWA share target on Android).
4. **Game page (`/g/[slug]`)**: description, your streak, a mini calendar, past results, and a Report button.
5. **Stats (`/stats`)**:
   - Calendar heatmap (shading = share of favorites done that day).
   - Overall streak (days with ≥1 game) and "perfect-day" streak (all favorites done).
   - Per-game streaks, best streak, and win rate where it can be parsed.
6. **Settings (`/settings`)**:
   - Sync: show code/QR, "Link another device" (enter code / scan), unlink, regenerate.
   - Export/import JSON, theme, day-start hour, and clear data.

The design is mobile-first with a bottom tab bar on phones and a top nav on desktop, plus light and dark themes. Everything works offline for the Today page; changes sync when you're back online.

## 8. Sync engine details

- Every local write goes to IndexedDB and adds an outbox entry.
- Sync is debounced (2 s) after changes, and also runs on focus, on coming back online and every 5 minutes.
- Merge rule: last write wins per `(kind, key)` on `updatedAt`. Deletes are kept as tombstones so they propagate.
- **Linking a device**: on the new device you choose either "merge" (default) or "replace local with synced". It then adopts the secret and does a full pull.
- Sync is enabled lazily: no server sync space exists until you open Settings → Sync, or it's created automatically on the first change. **Proposed default: sync on automatically**, so a cleared cache doesn't lose data as long as you saved the code.

## 9. Seed catalog (~40)

- **Word**: Wordle, Connections, Strands, Spelling Bee, Mini Crossword, Letter Boxed, Quordle, Waffle, Octordle, Contexto, Squaredle
- **Trivia/number**: Krillion, Daily Tens, Nerdle, Mathler, Numble, Digits-style games
- **Geo**: Worldle, Globle, Tradle, GeoGrid, Travle, Flagle
- **Media**: Framed, Moviedle, Bandle, Heardle-style, Cinenerdle
- **Logic/other**: Costcodle, Queens (LinkedIn), Tango, Pinpoint, Timeguessr, Wikitrivia

I'll check each URL is live during the build and drop any that are dead. Seeding is a Drizzle script (`npm run db:seed`) and safe to re-run.

## 10. Project structure

```
src/
  app/(app)/{page.tsx, explore, add, g/[slug], stats, settings}
  app/api/{games, preview, sync}/…
  app/admin/
  components/ (GameTile, GameCard, ResultSheet, Heatmap, ProgressRing, …)
  lib/client/ (db.ts Dexie, sync.ts, today.ts, streaks.ts)
  lib/parsers/ (registry + one file per game + generic)
  lib/server/ (db.ts, schema.ts, preview.ts, ssrf.ts, ratelimit.ts, normalizeUrl.ts)
drizzle/ (migrations)   scripts/seed.ts   tests/ (vitest + playwright)
```

## 11. Deployment (Vercel)

- Create a Turso DB and set env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `HASH_SALT`, and optionally `ADMIN_TOKEN`.
- `drizzle-kit migrate` runs in the build step, and the seed runs once.
- Local dev uses `file:local.db`, with no Turso needed.
- README covers one-click setup.

## 12. Build phases

1. **Scaffold**: Next.js, Tailwind/shadcn, Drizzle schema + migrations, seed script, CI.
2. **Catalog**: Explore page, games API, game detail page, favoriting into IndexedDB.
3. **Today + tracking**: tiles, check-off, return-from-tab result sheet, parser registry + tests.
4. **Add by URL**: preview endpoint with SSRF guard, publish/dedupe, private custom games, `/add?url=` + PWA share target.
5. **Stats**: streak math (tested across timezones and DST), heatmap, per-game history.
6. **Community safety**: reports, auto-hide, rate limits, optional admin page.
7. **Sync**: sync endpoint, outbox engine, code/QR linking, merge tests.
8. **PWA + polish**: offline, dark mode, empty states, accessibility pass, Playwright end-to-end tests, README/deploy docs.

Each phase is committed to `claude/modest-darwin-j5g6p0`, and I verify in a headless browser with screenshots.

## 13. Open assumptions (tell me if any are wrong)

- The app name is a placeholder ("DailyGames Hub").
- Favorite counts are anonymous aggregates used only for "Popular" sorting.
- No push notifications or reminders in v1.
- Sync is on by default once there's data, and the code appears in Settings.
- The auto-hide threshold is 3 reports.
