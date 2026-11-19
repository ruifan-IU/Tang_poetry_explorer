import { Suspense } from 'react';
import { FilterSidebar } from './components/FilterSidebar';
import { PoemFeed } from './components/PoemFeed';
import {
  FEED_PAGE_SIZE,
  getRecommendedPoemsPage,
  newRecommendationSeed,
  getFilteredPoems,
  countFilteredPoems,
  getFilterNames,
  getTopPoets,
  getTopTags,
} from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { getUserFavoritedPoemIds } from '@/lib/favorites';
import { getUserMemorizingPoemIds } from '@/lib/memorization';

// All poems come from 全唐诗, so there's no dynasty or type (诗/词/文) to
// filter by; the Dynasty table and Poem.type stay in the schema for when
// other collections are added.
type SearchParams = Promise<{
  poetId?: string | string[];
  tagId?: string | string[];
  q?: string;
}>;

// How many of the best-known poets and most-used tags the sidebar offers.
const SIDEBAR_POETS = 50;
const SIDEBAR_TAGS = 50;

// Positive integer ids from a repeatable query parameter; undefined if none.
function parseIds(param: string | string[] | undefined) {
  const ids = [param ?? []]
    .flat()
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return ids.length > 0 ? ids : undefined;
}

export default async function ExplorePage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;

  // Parse filters from URL
  // Trimmed the same way as in /api/poems/filtered, so both agree.
  const query = searchParams.q?.trim() || undefined;
  const poetIds = parseIds(searchParams.poetId);
  const tagIds = parseIds(searchParams.tagId);
  // A search is a filter like the others: it combines with poets and tags.
  const filters = { query, poetIds, tagIds };
  const filtered = query !== undefined || poetIds !== undefined || tagIds !== undefined;

  // Get current user and their favorites/memorizations
  const user = await getCurrentUser();
  const [favoritedPoemIds, memorizingPoemIds] = user
    ? await Promise.all([
        getUserFavoritedPoemIds(user.userId),
        getUserMemorizingPoemIds(user.userId),
      ])
    : [[], []];

  // The page shows an endless feed (PoemFeed): the poems matching the
  // search and the selected poets and tags, best known first, or with none
  // of those the recommended poems. Its first page is rendered here, the
  // rest fetched on scroll from `pagesUrl`, which carries what fixes the order.
  const seed = newRecommendationSeed();
  const filterParams = new URLSearchParams([
    ...(query ? [['q', query]] : []),
    ...(poetIds ?? []).map((id) => ['poetId', String(id)]),
    ...(tagIds ?? []).map((id) => ['tagId', String(id)]),
  ]);
  const pagesUrl = filtered
    ? `/api/poems/filtered?${filterParams}`
    : `/api/poems/recommended?seed=${seed}`;

  // Fetch data in parallel
  const [poems, poets, tags, total, { poetNames, tagNames }] = await Promise.all([
    filtered ? getFilteredPoems(filters) : getRecommendedPoemsPage(seed),
    getTopPoets(SIDEBAR_POETS),
    getTopTags(SIDEBAR_TAGS),
    filtered ? countFilteredPoems(filters) : null,
    getFilterNames(poetIds, tagIds),
  ]);
  // e.g. 搜索 "明月" · 李白、杜甫 · 唐诗三百首
  const filterLabel = [
    query ? [`搜索 "${query}"`] : [],
    poetNames,
    tagNames,
  ]
    .filter((names) => names.length > 0)
    .map((names) => names.join('、'))
    .join(' · ');

  return (
    <div className="relative min-h-screen">
      {/* The background painting is PageBackground, in the root layout. */}

      <div className="container mx-auto px-4 py-8">
        {/* The search bar is in the navbar (NavSearch), so it stays on screen. */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Filters (poets, tags): a sticky left column that scrolls on its own */}
          <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto">
            <Suspense
              fallback={
                <div className="rounded-lg border border-zinc-200 bg-white p-4 text-center text-sm text-zinc-600">
                  加载筛选器...
                </div>
              }
            >
              <FilterSidebar poets={poets} tags={tags} />
            </Suspense>
          </aside>

          {/* Poems List - Main Content */}
          <main className="flex-1">
            {/* Results info */}
            <div className="mb-6">
              <p className="text-sm text-zinc-600">
                {filtered
                  ? `${filterLabel} · 共 ${total} 首，按知名度排序`
                  : '为您推荐名篇佳作'}
              </p>
            </div>
            <Suspense
              fallback={
                <div className="text-center text-zinc-600">加载中...</div>
              }
            >
              {poems.length > 0 ? (
                // key: a new search, new tags or a new visit (new seed)
                // start a new list rather than appending to the old one.
                <PoemFeed
                  key={pagesUrl}
                  initialPoems={poems}
                  pagesUrl={pagesUrl}
                  pageSize={FEED_PAGE_SIZE}
                  favoritedPoemIds={favoritedPoemIds}
                  memorizingPoemIds={memorizingPoemIds}
                  isAuthenticated={!!user}
                />
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
                  <p className="text-lg text-zinc-600">
                    没有找到符合条件的诗词
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    请尝试调整筛选条件
                  </p>
                </div>
              )}
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
