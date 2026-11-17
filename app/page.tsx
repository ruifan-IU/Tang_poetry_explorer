import { Suspense } from 'react';
import Image from 'next/image';
import { PoemCard } from './components/PoemCard';
import { FilterSidebar } from './components/FilterSidebar';
import { PoemFeed } from './components/PoemFeed';
import {
  FEED_PAGE_SIZE,
  getRecommendedPoemsPage,
  newRecommendationSeed,
  getFilteredPoems,
  countFilteredPoems,
  getAllTags,
  searchPoems,
} from '@/lib/queries';
import { getCurrentUser } from '@/lib/auth';
import { getUserFavoritedPoemIds } from '@/lib/favorites';
import { getUserMemorizingPoemIds } from '@/lib/memorization';

// All poems come from 全唐诗, so there's no dynasty or type (诗/词/文) to
// filter by; the Dynasty table and Poem.type stay in the schema for when
// other collections are added.
type SearchParams = Promise<{
  tagId?: string | string[];
  q?: string;
}>;

export default async function ExplorePage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;

  // Parse filters from URL
  const tagIdList = [searchParams.tagId ?? []]
    .flat()
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  const tagIds = tagIdList.length > 0 ? tagIdList : undefined;
  const query = searchParams.q;

  // Get current user and their favorites/memorizations
  const user = await getCurrentUser();
  const [favoritedPoemIds, memorizingPoemIds] = user
    ? await Promise.all([
        getUserFavoritedPoemIds(user.userId),
        getUserMemorizingPoemIds(user.userId),
      ])
    : [[], []];

  // Without a search, the page shows an endless feed (PoemFeed): the
  // selected tags' poems best known first, or with no tags the recommended
  // poems. Its first page is rendered here, the rest fetched on scroll from
  // `pagesUrl`, which carries what fixes the order.
  const seed = newRecommendationSeed();
  const pagesUrl = query
    ? null
    : tagIds
    ? `/api/poems/tagged?${tagIds.map((id) => `tagId=${id}`).join('&')}`
    : `/api/poems/recommended?seed=${seed}`;

  // Fetch data in parallel
  const [poems, tags, tagTotal] = await Promise.all([
    query
      ? searchPoems(query, 30)
      : tagIds
      ? getFilteredPoems({ tagIds })
      : getRecommendedPoemsPage(seed),
    getAllTags(),
    tagIds && !query ? countFilteredPoems({ tagIds }) : null,
  ]);
  const selectedTagNames = tags
    .filter((tag) => tagIds?.includes(tag.id))
    .map((tag) => tag.name);

  return (
    <div className="relative min-h-screen">
      {/* Background: fixed to the viewport so it stays put while the feed
          scrolls, under a parchment wash that keeps the cards readable. */}
      <div aria-hidden className="fixed inset-0 -z-10">
        <Image
          src="/landing.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-stone-50/80" />
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* The search bar is in the navbar (NavSearch), so it stays on screen. */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Tag list: a sticky left column that scrolls on its own */}
          <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto">
            <Suspense
              fallback={
                <div className="rounded-lg border border-zinc-200 bg-white p-4 text-center text-sm text-zinc-600">
                  加载筛选器...
                </div>
              }
            >
              <FilterSidebar tags={tags} />
            </Suspense>
          </aside>

          {/* Poems List - Main Content */}
          <main className="flex-1">
            {/* Results info */}
            <div className="mb-6">
              <p className="text-sm text-zinc-600">
                {query
                  ? `搜索 "${query}" 找到 ${poems.length} 首诗词`
                  : tagIds
                  ? `${selectedTagNames.join('、')} · 共 ${tagTotal} 首，按知名度排序`
                  : '为您推荐名篇佳作'}
              </p>
            </div>
            <Suspense
              fallback={
                <div className="text-center text-zinc-600">加载中...</div>
              }
            >
              {pagesUrl && poems.length > 0 ? (
                // key: new tags or a new visit (new seed) start a new list
                // rather than appending to the old one.
                <PoemFeed
                  key={pagesUrl}
                  initialPoems={poems}
                  pagesUrl={pagesUrl}
                  pageSize={FEED_PAGE_SIZE}
                  favoritedPoemIds={favoritedPoemIds}
                  memorizingPoemIds={memorizingPoemIds}
                  isAuthenticated={!!user}
                />
              ) : poems.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {poems.map((poem) => (
                    <PoemCard
                      key={poem.id}
                      poem={poem}
                      isFavorited={favoritedPoemIds.includes(poem.id)}
                      isMemorizing={memorizingPoemIds.includes(poem.id)}
                      isAuthenticated={!!user}
                    />
                  ))}
                </div>
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
