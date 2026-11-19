import { prisma } from './prisma';
import { PoemType } from './prisma-client';

// ========== Poems ==========

// Poems per page of an endless feed (recommended, or a tag's poems).
export const FEED_PAGE_SIZE = 20;

/**
 * Fame thresholds for the explore page's recommended feed, highest first.
 *
 * The feed shows every poem with fame >= bands[0] in random order, then
 * every poem with fame >= bands[1] (and below bands[0]) in random order,
 * and so on; poems below the last threshold are not in the feed, and the
 * feed ends there. Poems per fame range in the Tang data:
 *   >= 50: 436    30-50: 236    20-30: 1,028    15-20: 1,394
 *   10-15: 4,662  0-10: 42,430  0: 5,710
 */
function recommendationBands(): number[] {
  return [50, 30, 20, 15, 10];
}

/**
 * A new seed for one visit's recommended feed. The same seed gives the same
 * order, so pages fetched later continue the list without repeats.
 */
export function newRecommendationSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * One page of the recommended feed: fame bands from recommendationBands(),
 * shuffled within each band by md5(id || seed). That hash order is
 * uniformly random but fixed for a seed, so OFFSET paging works -- a
 * shuffle in JS would reshuffle on every request.
 */
export async function getRecommendedPoemsPage(
  seed: string,
  offset = 0,
  limit = FEED_PAGE_SIZE
) {
  const bands = recommendationBands();
  // A poem's band is the number of thresholds above its fame: 0 for
  // fame >= bands[0], 1 for bands[1] <= fame < bands[0], and so on. The
  // thresholds go in as one bound array rather than a nested Prisma.sql
  // fragment, which a hot-reloaded dev server's cached client can't
  // recognize and binds as a value -- silently dropping the band order.
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT "id" FROM "Poem"
    WHERE "fame" >= ${bands[bands.length - 1]}
    ORDER BY
      (SELECT count(*) FROM unnest(${bands}::float8[]) AS b(threshold)
        WHERE "fame" < b.threshold),
      md5("id"::text || ${seed}),
      "id"
    LIMIT ${limit} OFFSET ${offset}
  `;
  const ids = rows.map((r) => r.id);

  const poems = await prisma.poem.findMany({
    where: { id: { in: ids } },
    include: {
      poet: true,
      tags: true,
      dynasty: true,
    },
  });
  // `in` returns rows in the database's order; restore the sampled order.
  const byId = new Map(poems.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)!);
}

type PoemFilters = {
  query?: string;
  poetIds?: number[];
  tagIds?: number[];
  dynastyId?: number;
  type?: PoemType;
};

// A search query matches poems whose title, poet's name or text contains
// it. Several poets match poems by any of them, and several tags poems with
// any of them. The query, poets and tags together match poems that satisfy
// all three (李白 + 唐诗三百首 is 李白's poems in 唐诗三百首).
function filteredPoemsWhere({ query, poetIds, tagIds, dynastyId, type }: PoemFilters) {
  return {
    ...(query && {
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { poet: { name: { contains: query, mode: 'insensitive' as const } } },
        { content: { contains: query, mode: 'insensitive' as const } },
      ],
    }),
    ...(poetIds && poetIds.length > 0 && { poetId: { in: poetIds } }),
    ...(dynastyId && { dynastyId }),
    ...(type && { type }),
    ...(tagIds &&
      tagIds.length > 0 && {
        tags: {
          some: {
            id: { in: tagIds },
          },
        },
      }),
  };
}

/**
 * Get poems filtered by a search query, poets, tags, dynasty, and/or type,
 * best known first. `offset` pages through them for the endless feed.
 */
export async function getFilteredPoems({
  limit = FEED_PAGE_SIZE,
  offset = 0,
  ...filters
}: PoemFilters & { limit?: number; offset?: number }) {
  return prisma.poem.findMany({
    where: filteredPoemsWhere(filters),
    include: {
      poet: true,
      tags: true,
      dynasty: true,
    },
    // id last: paging needs a total order, or poems with equal fame and
    // stars could swap between requests and repeat or go missing.
    orderBy: [{ fame: 'desc' }, { stars: 'desc' }, { id: 'asc' }],
    take: limit,
    skip: offset,
  });
}

/**
 * How many poems match the filters (the total shown above the feed).
 */
export async function countFilteredPoems(filters: PoemFilters) {
  return prisma.poem.count({ where: filteredPoemsWhere(filters) });
}

/**
 * Get a single poem by ID with all relations.
 */
export async function getPoemById(id: number) {
  return prisma.poem.findUnique({
    where: { id },
    include: {
      poet: true,
      tags: true,
      dynasty: true,
      annotations: true,
    },
  });
}

// ========== Poets ==========

/**
 * The best-known poets, with their poem counts. Useful for filter sidebar.
 */
export async function getTopPoets(limit: number) {
  return prisma.poet.findMany({
    orderBy: [{ fame: 'desc' }, { id: 'asc' }],
    include: {
      _count: {
        select: { poems: true },
      },
    },
    take: limit,
  });
}

/**
 * Get all poets ordered by name.
 * Useful for filter sidebar.
 */
export async function getAllPoets() {
  return prisma.poet.findMany({
    orderBy: {
      name: 'asc',
    },
    include: {
      dynasty: true,
      _count: {
        select: { poems: true },
      },
    },
  });
}

/**
 * Get a single poet by ID with their poems.
 */
export async function getPoetById(id: number) {
  return prisma.poet.findUnique({
    where: { id },
    include: {
      dynasty: true,
      poems: {
        orderBy: [
          { fame: 'desc' },
          {
            stars: 'desc',
          },
        ],
        take: 10,
      },
    },
  });
}

/**
 * Get poets filtered by dynasty.
 */
export async function getPoetsByDynasty(dynastyId: number) {
  return prisma.poet.findMany({
    where: { dynastyId },
    orderBy: { name: 'asc' },
    include: {
      dynasty: true,
      _count: {
        select: { poems: true },
      },
    },
  });
}

// ========== Tags ==========

/**
 * The most-used tags (all of them without a limit), with their poem counts.
 * Useful for filter sidebar.
 */
export async function getTopTags(limit?: number) {
  return prisma.tag.findMany({
    // Most-used first: a name sort orders Chinese by code point, which
    // means nothing to a reader.
    orderBy: [{ poems: { _count: 'desc' } }, { name: 'asc' }],
    include: {
      _count: {
        select: { poems: true },
      },
    },
    take: limit,
  });
}

/**
 * Names of the selected poets and tags, for the heading above the feed.
 * Looked up by id rather than taken from the sidebar's lists, which only
 * hold the top 50 of each -- a link can select any poet or tag.
 */
export async function getFilterNames(poetIds: number[] = [], tagIds: number[] = []) {
  const [poets, tags] = await Promise.all([
    prisma.poet.findMany({ where: { id: { in: poetIds } }, select: { id: true, name: true } }),
    prisma.tag.findMany({ where: { id: { in: tagIds } }, select: { id: true, name: true } }),
  ]);
  // In the order they were selected, not the database's.
  const name = (rows: { id: number; name: string }[], id: number) =>
    rows.find((row) => row.id === id)?.name;
  return {
    poetNames: poetIds.map((id) => name(poets, id)).filter((n) => n !== undefined),
    tagNames: tagIds.map((id) => name(tags, id)).filter((n) => n !== undefined),
  };
}

/**
 * Get a single tag by ID with its poems.
 */
export async function getTagById(id: number) {
  return prisma.tag.findUnique({
    where: { id },
    include: {
      poems: {
        include: {
          poet: true,
          dynasty: true,
        },
        orderBy: [
          { fame: 'desc' },
          {
            stars: 'desc',
          },
        ],
        take: 20,
      },
    },
  });
}

// ========== Dynasties ==========

/**
 * Get all dynasties ordered by name.
 * Useful for filter sidebar.
 */
export async function getAllDynasties() {
  return prisma.dynasty.findMany({
    orderBy: {
      name: 'asc',
    },
    include: {
      _count: {
        select: { poems: true, poets: true },
      },
    },
  });
}

/**
 * Get a single dynasty by ID with its poets and poems.
 */
export async function getDynastyById(id: number) {
  return prisma.dynasty.findUnique({
    where: { id },
    include: {
      poets: {
        orderBy: [
          { fame: 'desc' },
          {
            stars: 'desc',
          },
        ],
        take: 10,
      },
      poems: {
        include: {
          poet: true,
        },
        orderBy: [
          { fame: 'desc' },
          {
            stars: 'desc',
          },
        ],
        take: 20,
      },
    },
  });
}

// ========== Site ==========

/**
 * How many poems, poets and tags the collection holds (the About page).
 */
export async function getCollectionStats() {
  const [poems, poets, tags] = await Promise.all([
    prisma.poem.count(),
    prisma.poet.count(),
    prisma.tag.count(),
  ]);
  return { poems, poets, tags };
}
