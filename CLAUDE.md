# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev server (Next.js App Router, http://localhost:3000)
npm run build            # prisma generate && next build
npm run lint             # ESLint (eslint-config-next core-web-vitals + typescript)

npm run prisma:generate  # Regenerate Prisma client into lib/prisma-client (custom output dir)
npm run prisma:migrate   # Create/apply a dev migration
npm run prisma:push      # Push schema changes without a migration (prototyping)
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # tsx prisma/seed.ts — loads prisma/data/cleaned/tang/*.json into the DB

node scripts/generate-dark-palette.mjs   # Regenerate app/dark-palette.css (after a Tailwind upgrade)
```

The `prisma:*` CLI scripts run via `node --env-file=.env`, and `prisma/seed.ts` loads `.env` with
`dotenv/config`, so `.env` (not `.env.local`) is the source of `DATABASE_URL`, `JWT_SECRET`, etc.
Neither overrides a variable already set, so `DATABASE_URL=... npm run prisma:seed` targets another
database. There is no test runner configured in this repo.

Local Postgres for development: `docker compose up -d db` (see `compose.yaml`; also has an optional
`pgadmin` service on port 8080).

If the dev server keeps serving stale CSS or a stale Prisma client after a change, stop it,
`rm -rf .next`, and restart: Next 16 persists its dev compile cache in `.next/dev`.

## Architecture

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript, Prisma 6 against Postgres, TailwindCSS 4,
custom JWT cookie auth (no NextAuth/Clerk), Resend for email. Deployed on Vercel with Neon Postgres.
(`@prisma/adapter-pg` and `zod` are installed but unused; `lib/validations/poetry.ts` is leftover
template boilerplate that doesn't match the schema and isn't wired into any route.)

### Prisma client has a non-default output path

The schema (`prisma/schema.prisma`) generates the client into `lib/prisma-client` instead of
`node_modules/@prisma/client`. Always import types/enums from `@/lib/prisma-client` (e.g.
`PoemType`, `MasteryLevel`), and the singleton client from `@/lib/prisma`. Run
`npm run prisma:generate` after any schema change before TypeScript will pick up new fields.

### Data model

Core content: `Dynasty` → `Poet` → `Poem` (many-to-many with `Tag`), plus `PoemAnnotation` (the
source's notes, seeded as type `BACKGROUND`). All poems are Tang (全唐诗); `Dynasty` and `Poem.type`
(`shi` | `ci` | `wen`) are kept for future collections but no longer shown or filtered on.
`Poem.contentHash` is a unique SHA256 used by the data pipeline to dedupe.

Two scores on `Poet` and `Poem`:
- `fame` — the pipeline's 0–100 score (`scripts/score_fame.py`). The app sorts by it.
- `stars` — how many users saved (收藏) the poem, incremented/decremented transactionally in
  `app/api/favorites/route.ts`, which returns the new count. Shown with a bookmark icon
  (`SaveCount`), not a star.

User-owned data hangs off `User` via two join models:
- `UserFavorite` — simple bookmarking.
- `UserMemorization` — spaced-repetition study state (SM-2 style: `easeFactor`, `interval`,
  `repetitions`, `masteryLevel` enum `NEW→LEARNING→YOUNG→MATURE→MASTERED`). Algorithm lives in
  `lib/spaced-repetition.ts` (`calculateNextReview`, `isReviewDue`, `getDegradedMasteryLevel`).
  **Only due poems can be practiced**: the memorization page links only due poems to
  `/memorization/practice?poemId=`, and `/api/memorization/review` returns 409 for a poem that isn't
  due (GET with `poemId`, and POST). Use `isReviewDue` for "due" everywhere so they agree.
  A Vercel cron job (`vercel.json` → `/api/cron/daily-review`, daily at 02:00 UTC, protected by
  `Bearer $CRON_SECRET`; refuses everything if the secret is unset) degrades overdue mastery levels
  and emails users with due reviews via Resend.

### Auth

Custom JWT-in-httpOnly-cookie auth in `lib/auth.ts` (`auth_token` cookie, 7-day expiry,
`getCurrentUser()` reads/verifies it server-side). `JWT_SECRET` has no fallback: `jwtSecret()` throws
if it's unset, outside `verifyToken`'s try/catch so a missing secret fails loudly rather than
signing everyone out. There is no middleware.ts — every API route protects itself by calling
`getCurrentUser()` and returning 401 if null. Follow this pattern for new protected routes rather
than adding centralized middleware. Passwords are hashed with bcryptjs. The login page's
`?redirect=` goes through `lib/safe-redirect.ts` (same-site paths only).

Signup includes email verification (Resend-sent link, token+expiry on `User`). Unverified users are
soft-limited to 5 favorites and 3 memorizations (`MAX_FAVORITES_UNVERIFIED` /
`MAX_MEMORIZATIONS_UNVERIFIED` in the API routes, mirrored in the pages) — see
`FAVORITES_LIMIT_IMPLEMENTATION.md` and `EMAIL_VERIFICATION_SETUP.md`. With the default
`FROM_EMAIL` (`onboarding@resend.dev`), Resend only delivers to the account owner.

### Read/query layer and the home page

`lib/queries.ts` centralizes read queries used by Server Components in `app/`. `lib/favorites.ts`
and `lib/memorization.ts` provide the per-user data-access helpers. Prefer adding to these files over
inlining Prisma calls in page components.

The home page (`app/page.tsx`; `/explore` redirects there) shows one endless feed (`PoemFeed`): the
server renders the first page and the client fetches the rest from `pagesUrl` with `&offset=`.
- No filters: `getRecommendedPoemsPage(seed)` — fame bands, shuffled within a band by
  `md5(id || seed)`, so the order is random per visit but fixed for paging.
- Search (`q`), poets (`poetId`) and tags (`tagId`), all combinable: `getFilteredPoems` /
  `countFilteredPoems` via `/api/poems/filtered`. Query AND poets AND tags; several poets or tags
  are OR'd. Ordered by fame, stars, id — the id makes the order total, which offset paging needs.
- `PoemFeed` fixes its list and `pagesUrl` on mount (so `router.refresh()` after 收藏/背诵 doesn't
  reshuffle it); it's keyed so new filters start a new list. `HomeLink` reloads the page when
  clicked on the plain home page, to reshuffle.

### Reader settings and theming

Poem font (`lib/poem-fonts.ts`, `FontSwitcher`) and appearance (`lib/theme.ts`, `ThemeSwitcher`)
are cookies the root layout reads and sets as `data-poem-font` / `data-theme` on `<html>`, so the
server HTML is already right (no flash). Both menus use `NavMenu`.

**Dark mode has no `dark:` classes.** `app/dark-palette.css` (generated by
`scripts/generate-dark-palette.mjs`) redefines every Tailwind color variable as
`light-dark(<shade>, <mirrored shade>)` (50↔950, 100↔900, …; white → zinc-900), and `color-scheme`
in `globals.css` picks the side. So write normal light-mode classes; `text-zinc-900` renders light
text in dark mode. Don't add `dark:` variants or hard-coded hex colors in components — they bypass
the palette.

Page backgrounds (`PageBackground` in the root layout): `landing.jpg` on `/`, otherwise a random
image from the list in `lib/backgrounds.ts` — picked on the server per load (avoids a hydration
mismatch) and again on each client navigation. Edit that list when adding/removing images.

### Data pipeline (scripts/, prisma/)

The Tang pipeline (`scripts/README.md` has full detail): `fetch_tang_data.py` (raw downloads +
Wikidata SPARQL) → `clean_tang_data.py` (text cleaning, author normalization, exact dedupe by hash,
near-duplicate 乐府 reprint merge, Traditional→Simplified) → `match_wikidata_poets.py` →
`score_fame.py` (adds `fame`; must be re-run after every clean) → `prisma/seed.ts`. Outputs go to
`prisma/data/cleaned/tang/` (not committed; the seed's input) and audit reports to
`prisma/data/audit/tang/` (committed). The seed validates the data before deleting anything and
refuses to delete user data unless `SEED_DELETE_USER_DATA=1`.

Legacy, pre-Tang tools: `scripts/clean_data.py`, `create_dev_subset.py`, `data_insights.py`,
`prisma/categorize-poems.ts`, and the old subset in `prisma/data/dev/` (no longer seeded).
`scripts/semantic_search.py` is an OpenAI-embeddings proof of concept, unrelated to the app's
search (a case-insensitive `contains` in `filteredPoemsWhere`).

### Path alias

`@/*` maps to the repo root (`tsconfig.json`), e.g. `@/lib/prisma`, `@/lib/prisma-client`.
