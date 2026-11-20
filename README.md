# 唐诗博览 · Tang Poetry Explorer

A web app for reading, collecting and memorizing Tang dynasty poetry: all
55,896 poems of the 全唐诗 (*Complete Tang Poems*), ranked by how well known
they are. Readers can browse and search the collection, save poems, and learn
them by heart on a spaced-repetition schedule with reminder emails.

The poetry data is built by a reproducible Python pipeline. It cleans the
全唐诗 corpus, merges duplicate and reprinted poems, links poets to
[Wikidata](https://www.wikidata.org/), and scores every poem's fame from
classic anthologies and reader votes. See [Data](#data).

## Features

- **Recommended feed:** the home page opens on an endless, shuffled list of
  well-known poems. The best known come first, shuffled within each fame band,
  and it loads as you scroll.
- **Filters and search:** the 50 best-known poets and the 50 most-used tags, as
  chips in a sticky sidebar. Search covers titles, poets and poem text, and
  combines with the filters. Results are ordered by fame.
- **Poem and poet pages:** full text, notes, and the poet's best-known poems.
- **Favorites (收藏):** save poems. The save counts are shown on every poem.
- **Memorization (背诵):** SM-2 spaced repetition with five mastery levels
  (`NEW → LEARNING → YOUNG → MATURE → MASTERED`). Only poems that are due can be
  practiced, so the schedule stays accurate. The memorization page lists the
  due poems and each mastery level.
- **Daily review emails:** a scheduled job lowers the mastery level of overdue
  poems and emails readers who have reviews due.
- **Reading settings:** five poem typefaces (思源宋体, 仙人掌明体, 霞鹜文楷 and
  two calligraphy fonts), and light, dark or system appearance. Both are applied
  on the server, so pages never flash the wrong font or colors.
- **English or Chinese interface:** one click in the navbar, defaulting to the
  browser's language. The poems stay in Chinese.
- **Accounts:** email and password sign-up with email verification. Unverified
  readers can save up to 5 favorites and memorize up to 3 poems.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router), React 19, TypeScript |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Database | PostgreSQL with [Prisma 6](https://www.prisma.io/) |
| Auth | Custom JWT in an httpOnly cookie, passwords hashed with bcryptjs |
| Email | [Resend](https://resend.com/) |
| Data pipeline | Python 3, [OpenCC](https://github.com/BYVoid/OpenCC), Wikidata SPARQL |
| Hosting | Vercel (including Vercel Cron), Neon Postgres |

## Getting started

### Prerequisites

- Node.js 20+
- Docker, for local Postgres, or any PostgreSQL 15+ instance
- Python 3.10+, to build the poetry data

### Setup

```bash
git clone https://github.com/ruifan-IU/Tang_poetry_explorer.git
cd Tang_poetry_explorer
npm install
cp .env.example .env        # then fill in the variables below
```

The seed reads the pipeline's output from `prisma/data/cleaned/tang/`, which
is not committed. Build it first (see [Pipeline](#pipeline) and
[`scripts/README.md`](scripts/README.md)):

```bash
pip install opencc-python-reimplemented
python3 scripts/fetch_tang_data.py
python3 scripts/clean_tang_data.py
python3 scripts/match_wikidata_poets.py
python3 scripts/score_fame.py
```

Then start Postgres, create the schema and load the data:

```bash
docker compose up -d db     # Postgres on :5432 (add `pgadmin` for a GUI on :8080)
npm run prisma:generate     # generates the client into lib/prisma-client
npm run prisma:migrate
npm run prisma:seed         # loads prisma/data/cleaned/tang/ (about 15 s)
npm run dev                 # http://localhost:3000
```

The seed checks the data before deleting anything. It also refuses to replace a
database that holds readers' favorites or memorizations unless you set
`SEED_DELETE_USER_DATA=1`.

### Environment variables

All `prisma:*` scripts read `.env`, not `.env.local`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | for Docker | credentials for the `db` service in `compose.yaml` |
| `JWT_SECRET` | yes | signs the auth cookie. There is no default: generate one with `openssl rand -base64 32` |
| `CRON_SECRET` | in production | bearer token for `/api/cron/daily-review`. Without it, the route refuses every request |
| `RESEND_API_KEY` | for email | verification and review-reminder emails |
| `FROM_EMAIL` | no | sender address (default `onboarding@resend.dev`, which only delivers to your own Resend account; send to anyone by verifying a domain in Resend) |
| `APP_URL` | in production | base URL for links in emails (default `http://localhost:3000`) |
| `OPENAI_API_KEY` | no | only for the `scripts/semantic_search.py` experiment |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build (runs `prisma generate` first) and start |
| `npm run lint` | ESLint |
| `npm run prisma:generate` | Regenerate the Prisma client after schema changes |
| `npm run prisma:migrate` | Create and apply a dev migration |
| `npm run prisma:push` | Push schema changes without a migration (prototyping) |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:seed` | Load the poetry data into the database |
| `node scripts/generate-dark-palette.mjs` | Regenerate `app/dark-palette.css` after a Tailwind upgrade |

## Data

### Sources

| Source | What it provides | License |
|---|---|---|
| [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) | 全唐诗 poems and poet bios, plus the 唐诗三百首 and 千家诗 anthologies (and their tags) | MIT |
| [Wikidata](https://www.wikidata.org/) | Poet identifiers (QIDs), aliases, birth and death dates, sitelink counts | CC0 |
| [古诗文网](https://www.gushiwen.cn/) (an older scrape) | Per-poem reader star counts, used only as a fame signal | not redistributed; the site's texts, translations and commentary are not used |

The 古诗文网 scrape (`prisma/data/raw/LCPoetry*.json`) is not public. Without
it the pipeline still runs, but scores fame from the anthologies alone.

### Pipeline

The scripts in [`scripts/`](scripts/) rebuild the dataset from scratch:

```
fetch_tang_data.py      download the corpus and run the Wikidata SPARQL queries
clean_tang_data.py      clean the text, normalize authors, dedupe, merge reprints, convert to Simplified
match_wikidata_poets.py link local poets to Wikidata items
score_fame.py           score poet and poem fame, which the app sorts by
prisma/seed.ts          load the result into Postgres
```

Main data decisions:

- **Editorial notes.** Notes and variant readings in the 全唐诗 text, such as
  `（一作…）`, are removed from the displayed text and kept as the poem's notes.
- **Unknown authors.** The source uses about a dozen terms for an unknown author
  (不詳, 無名氏, 缺名…). These are merged into a single 佚名 poet.
- **Duplicates and reprints.** Exact copies are merged by a hash of the text.
  Near-copies, such as a poem reprinted under a 乐府 heading (杂曲歌辞·游子吟),
  are merged when the evidence is clear: 550 reprints in 549 groups. A
  leftover 乐府 heading moves from the title into the notes (1,442 poems).
- **Fame.** Poem fame comes from curated anthologies and 古诗文网 reader votes,
  not search-engine hit counts, which mostly measured how common a title is.
  Poet fame adds Wikidata sitelinks, but only to amplify evidence of their
  poetry, so emperors and monks famous for other reasons don't rank as poets.
- **Attribution.** When 全唐诗 prints one poem under two poets, the copy whose
  poet an anthology or 古诗文网 confirms is kept, and the other attribution
  goes into the poem's notes.

Every step writes a review report to `prisma/data/audit/tang/` so the
decisions can be checked by hand. [`scripts/README.md`](scripts/README.md) has
the full details.

## Project structure

```
app/
  page.tsx                home: recommended feed, filters, search
  poems/[id]/  poets/[id]/  favorites/  memorization/  about/   pages
  api/
    auth/                 signup, login, logout, me, email verification
    poems/                pages of the endless feeds (recommended, filtered)
    favorites/            add or remove favorites (updates the save counts in a transaction)
    memorization/         study list and review grading
    cron/daily-review/    daily mastery decay and reminder emails
  components/             UI components
  dark-palette.css        dark mode for every Tailwind color (generated)
lib/
  auth.ts                 JWT cookie auth; getCurrentUser()
  queries.ts              read queries: feeds, filters, search, poem and poet pages
  favorites.ts            per-user favorites data access
  memorization.ts         per-user memorization data access
  spaced-repetition.ts    SM-2 scheduling and mastery degradation
  email.ts                Resend email templates
  poem-fonts.ts, theme.ts reader settings (font, appearance)
  prisma.ts               Prisma client singleton
  prisma-client/          generated Prisma client (custom output path)
prisma/
  schema.prisma           data model
  seed.ts                 database seeding
  data/                   audit reports (committed); raw/ and cleaned/ (not committed)
scripts/                  Python data pipeline (see scripts/README.md)
```

### Data model

```
Dynasty ─< Poet ─< Poem >─< Tag
                    ├─< PoemAnnotation        (notes from the source)
User ─< UserFavorite >──┤
User ─< UserMemorization >┘   (easeFactor, interval, repetitions, masteryLevel, nextReviewAt)
```

- `stars` on `Poem` and `Poet` counts how many readers have saved them.
- `fame` on `Poem` and `Poet` is the pipeline's score (0–100) from `score_fame.py`.
- `Poem.contentHash` is a unique SHA-256 of the content, used to deduplicate poems.
- `Dynasty` and `Poem.type` (`shi` / `ci` / `wen`) stay in the schema for when
  collections beyond Tang poetry are added.

## Design notes

- **No auth middleware.** Every protected API route calls `getCurrentUser()`
  and returns 401 itself, which keeps the access check visible in each route.
- **Endless feeds with stable order.** The recommended feed shuffles poems by
  `md5(id || seed)`, so one visit's order is random but fixed. Paging with an
  offset then never repeats or skips a poem. Every other feed sorts by fame,
  then stars, then id: the id gives a total order, which offset paging needs.
- **Due poems only.** Reviewing a poem early would inflate its SM-2 interval,
  so the pages only link due poems to practice, and the review API rejects
  early reviews with 409.
- **Dark mode without `dark:` classes.** Tailwind 4 colors are CSS variables,
  so `app/dark-palette.css` redefines each as `light-dark(<shade>, <mirrored
  shade>)`, and `color-scheme` picks the side.
- **Secrets fail closed.** A missing `JWT_SECRET` throws instead of falling back
  to a known key, and a missing `CRON_SECRET` makes the cron route refuse every
  request.

More design notes:
[EMAIL_VERIFICATION_SETUP.md](EMAIL_VERIFICATION_SETUP.md) (the sign-up
verification flow),
[FAVORITES_LIMIT_IMPLEMENTATION.md](FAVORITES_LIMIT_IMPLEMENTATION.md) (the
soft limits for unverified readers) and
[MEMORIZATION_SCHEMA_DESIGN.md](MEMORIZATION_SCHEMA_DESIGN.md) (the
spaced-repetition data model).

## Deployment

The app runs on Vercel with a Neon Postgres database.

1. Import the repo into Vercel. The build runs `prisma generate && next build`.
2. Add Neon from Vercel's Storage tab, which sets `DATABASE_URL` (pooled) and
   `DATABASE_URL_UNPOOLED` (direct). Keep the functions in the same region as
   the database.
3. Set `JWT_SECRET`, `CRON_SECRET`, `APP_URL`, `RESEND_API_KEY` and
   `FROM_EMAIL` in the project's environment variables.
4. Create the schema and load the data from your machine, using the direct
   connection:

   ```bash
   DATABASE_URL='<unpooled url>' npx prisma migrate deploy
   DATABASE_URL='<unpooled url>' npm run prisma:seed
   ```

`vercel.json` schedules `/api/cron/daily-review` every day at 02:00 UTC, and
Vercel sends `CRON_SECRET` as its bearer token.
