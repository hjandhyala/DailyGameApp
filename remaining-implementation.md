# Remaining implementation: getting DailyGames Hub running

The app (Next.js 16, Drizzle + libSQL, Dexie, Auth.js) was built in a cloud session with no outbound network, so it had never been run end to end. This checklist takes it from "CI is green" to a live deployment.

**Starting point (2026-11-27)**
- CI is green on `main`: lint, typecheck, Vitest, `db:setup` and `next build`.
- All 40 seed URLs return 200, and Daily Tens (`dailytens.com`) and Krillion (`krillion.io`) are the real games.
- Missing: a local install, an env file and a database, a few runtime bugs that CI can't catch, and a deployment.

**Goal:** run locally on Node 24 LTS with the admin dev bypass, then deploy to Vercel with Turso and GitHub admin sign-in, so there's a live URL to use on a phone with cross-device sync.

🧑 = you (accounts, browser steps, pasting secrets) · 🤖 = Claude

---

## Phase 0: Unblock file access 🧑

- [x] Restart Claude Code in the repo: `cd ~/Documents/GitHub/DailyGameApp && claude --continue`.
- [x] If macOS asks whether **claude** can access the Documents folder, click **Allow**.
  - If access is still blocked: System Settings → Privacy & Security → Files & Folders → turn on *Documents* for your terminal app.

**Why:** the session that wrote this plan started before `brew upgrade claude-code`, and the upgrade deleted the binary it was running. macOS won't let a process whose binary was deleted read `~/Documents`, so every read of the repo failed with `EPERM`.

## Phase 1: Node 24 LTS 🤖

- [x] `brew install node@24 && brew unlink node && brew link --overwrite --force node@24`. `node -v` now reports v24.22.3.
  - To undo: `brew unlink node@24 && brew link node`.
- [x] Pin the version:
  - `.nvmrc` → `24`
  - `package.json` → `"engines": { "node": "24.x" }` (Vercel reads this)
  - CI → `node-version-file: .nvmrc`

## Phase 2: Fixes found in review 🤖

- [x] **2.1 Krillion and Daily Tens parsers** (`src/lib/parsers/index.ts`, `tests/parsers.test.ts`). Both were guesses that missed the real share text, so results were saved as a bare "Done". The formats below come from each site's own share code.
  - Krillion: `Krillion #45 🦐 320  🫧🐟🦑⬛🏮🌟🐟`, with `⟲`/`∞` variants for archive and unlimited play and an optional `  https://krillion.io` link. Parsed as `320 pts` out of 700, with the tier emojis kept as the grid.
  - Daily Tens: `DailyTens #123` followed by a 5×2 grid of 🏆/❌. The score is the number of 🏆, out of 10.
  - The older loose patterns stay as fallbacks.
- [x] **2.2 Admin "Edit game"** (`src/app/admin/actions.ts`, `src/app/admin/(protected)/games/page.tsx`).
  - It now recomputes `normalizedUrl`, `host` and the favicon fallback.
  - A link that another game already uses is refused with an inline alert, and the clashing game is listed underneath. Before, the edit crashed on the unique index.
- [x] **2.3 Deploys no longer overwrite admin edits** (`scripts/seed.ts`).
  - The seed is now insert-only.
  - `npm run db:seed -- --update` pushes `seed-games.ts` changes deliberately.
- [x] **2.4 Seed data and README.**
  - Octordle now points to `https://www.merriam-webster.com/games/octordle/`, where `octordle.com` redirects. A pasted `octordle.com` link now dedupes to the seed game.
  - README covers Node 24, the seed `--update` flag and the preview database. The outdated Daily Tens caveat is gone.
- [x] **2.5 `db:*` scripts read `.env.local`** via `@next/env` (`scripts/env.ts`, `scripts/client.ts`, `drizzle.config.ts`). This is the method the Next docs give for code that runs outside Next.
- [x] **2.6 Fail fast on Vercel** (`src/lib/server/db.ts`, `scripts/client.ts`). When `VERCEL` is set and `TURSO_DATABASE_URL` isn't, startup throws a clear error. Before, it silently fell back to a SQLite file that can't be written there.
- [x] **2.7 (found while testing) Admin dashboard duplicate React keys.** The "Most played" and "Most favorited" lists were keyed by game name, and two games can share a name. They're now keyed by game ID.

## Phase 3: Run locally and verify 🤖

These steps were first done in a staging copy, while the repo folder was blocked, then steps 1 to 3 were re-run in the repo.

1. [x] Run `npm ci`, then create a gitignored `.env.local` containing `HASH_SALT=<random>` and `ADMIN_DEV_BYPASS=1`.
2. [x] Run `npm run db:setup`. Expected: `✓ migrations applied` and `✓ seeded 40 new games`. A second run reports `0 new (40 already present)`.
3. [x] Run `npm test`, `npm run lint` and `npm run typecheck`. In staging, all passed with 28 tests.
4. [x] curl smoke tests against `npm run dev`:
   - All pages return 200, and `/g/does-not-exist` returns 404.
   - `/api/games` returns 40 games.
   - Preview returns existing games, fetches new sites live, and resolves redirects to existing games.
   - The SSRF guard rejects 127.0.0.1, 169.254.169.254, 10.x and localhost.
   - Events, favorites and the sync push, pull and delete all work.
5. [x] Browser walkthrough with headless Chromium. All 15 steps pass:
   1. Star games in Explore.
   2. Today checklist.
   3. **Play**, then return to the "Finished Krillion?" sheet.
   4. Real Krillion, Daily Tens and Wordle results save as `320 pts`, `7/10` and `3/6*`.
   5. Stats.
   6. The sync code is created automatically.
   7. A second device links and receives favorites and results.
   8. A change on device B syncs back to device A.
   9. Add by URL with **Share to marketplace** on; the game appears in Explore.
   10. Report a game.
   11. Admin dashboard.
   12. Admin edit refuses a duplicate link.
   13. Admin edit updates the URL and dedupe.
6. [x] Production mode (`npm run build && npm start`):
   - the service worker registers
   - Today reloads offline from the cache and IndexedDB
   - `/admin` redirects to the login page, since the dev bypass is off in production
7. Known noise, harmless: Google's favicon service returns 404 for `games.oec.world` (Tradle), so the browser logs it once and the card shows a letter icon.

## Phase 4: Deploy to Vercel, Turso and GitHub OAuth

Secrets go straight from the command that generates them into `vercel env add`, so none are printed or pasted into chat.

1. [x] 🧑 Create free accounts at **turso.tech** and **vercel.com** ("Continue with GitHub").
2. [x] Set up the Turso CLI:
   - 🤖 `brew install tursodatabase/tap/turso`
   - 🧑 `! turso auth login`
3. [x] 🤖 Run `turso db create dailygames` and `turso db create dailygames-preview`. Preview builds also run migrations, so they get their own database.
4. [x] Link the Vercel project:
   - 🧑 `! npx vercel login`
   - 🤖 `npx vercel link` (project `daily-games-hub`), then `npx vercel git connect`
5. [x] 🤖 Set the environment variables:

   | Variable | Production | Preview |
   |---|---|---|
   | `TURSO_DATABASE_URL` | `turso db show dailygames --url` | same for `dailygames-preview` |
   | `TURSO_AUTH_TOKEN` | `turso db tokens create dailygames` | preview token |
   | `HASH_SALT` | `openssl rand -hex 32` | a separate random value |
   | `AUTH_SECRET` | `openssl rand -base64 32` | (none) |
   | `ADMIN_GITHUB_LOGINS` | `hjandhyala` | (none) |

6. [x] 🤖 Deploy with `npx vercel --prod`. `vercel-build` migrates and seeds Turso. Production URL: https://daily-games-hub-eta.vercel.app
7. [ ] Custom domain `dailygamesportal.com` (registered at Wix):
   - [x] 🤖 Add `dailygamesportal.com` and `www.dailygamesportal.com` to the Vercel project, with `www` 308-redirecting to the apex.
   - [ ] 🧑 In Wix → Domains → Manage DNS records, set:
     - `A` for `@`: replace Wix's records with `216.198.79.1` and `64.29.17.1`
     - `CNAME` for `www`: `35f2bcbbbe702c90.vercel-dns-017.com`
   - [ ] 🤖 Confirm the domain verifies in Vercel and serves HTTPS.
8. [ ] 🧑 Create a GitHub OAuth app at github.com/settings/applications/new:
   - Homepage: `https://dailygamesportal.com`
   - Callback: `https://dailygamesportal.com/api/auth/callback/github`
   - Generate a client secret.
9. [ ] 🧑 Run `! npx vercel env add AUTH_GITHUB_ID production` and `! npx vercel env add AUTH_GITHUB_SECRET production`.
10. [ ] 🤖 Redeploy with `npx vercel --prod`.

## Phase 5: Verify production

- [ ] 🤖 Pages and APIs:
  - `/api/games` returns 40 games.
  - `/`, `/explore` and `/g/krillion` return 200.
  - `/manifest.webmanifest` is served.
  - Preview and sync round-trips work.
- [ ] 🧑 Admin sign-in:
  - Sign in at `/admin/login` with GitHub; the dashboard shows the visit.
  - An account that isn't on the allow-list is refused.
- [ ] 🧑 Phone:
  1. Add the site to your home screen.
  2. Star a game.
  3. Link the sync code from your laptop; data shows up on both devices.
- [ ] 🤖 CI passes on Node 24.

## Later (not needed to get it running)

- Playwright end-to-end tests in the repo. `PLAN.md` listed them; the walkthrough above could be the starting point.
- Re-check the other parsers against current share text, the same way as 2.1.
- Harden the link preview against DNS rebinding (README known limitation).
