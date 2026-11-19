'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PoemCard } from './PoemCard';

type Poem = React.ComponentProps<typeof PoemCard>['poem'];

type PoemFeedProps = {
  initialPoems: Poem[];
  // The API URL for later pages, without the offset: the feed appends
  // &offset=<poems so far>. It carries whatever fixes the order -- the
  // recommended feed's seed, or the search and filters. Read once, when the
  // feed mounts (see below).
  pagesUrl: string;
  pageSize: number;
  favoritedPoemIds: number[];
  memorizingPoemIds: number[];
  isAuthenticated: boolean;
};

type Status = 'idle' | 'loading' | 'done' | 'error';

/**
 * An endless list of poem cards: the home page's recommended poems, or the
 * poems matching its search and filters. The server renders the first page;
 * each time the end of the list comes near the viewport, the next page is
 * fetched from `pagesUrl`, whose fixed order lets the list continue without
 * repeats.
 *
 * The list and its order are fixed when the feed mounts: a server refresh
 * re-renders the page with new props (a new recommended seed and first
 * page), and the poems already on screen must stay put. A new list needs a
 * new `key`.
 */
export function PoemFeed({
  initialPoems,
  pagesUrl: initialPagesUrl,
  pageSize,
  favoritedPoemIds,
  memorizingPoemIds,
  isAuthenticated,
}: PoemFeedProps) {
  const [poems, setPoems] = useState(initialPoems);
  // Later pages must continue the order the first page came from, even if
  // a refresh passes a URL with a new seed.
  const [pagesUrl] = useState(initialPagesUrl);
  const [status, setStatus] = useState<Status>(
    initialPoems.length < pageSize ? 'done' : 'idle'
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  // The observer can fire again before the 'loading' state re-renders.
  const loadingRef = useRef(false);

  const favorited = useMemo(() => new Set(favoritedPoemIds), [favoritedPoemIds]);
  const memorizing = useMemo(() => new Set(memorizingPoemIds), [memorizingPoemIds]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setStatus('loading');
    try {
      const response = await fetch(`${pagesUrl}&offset=${poems.length}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { poems: next }: { poems: Poem[] } = await response.json();
      setPoems((prev) => [...prev, ...next]);
      setStatus(next.length < pageSize ? 'done' : 'idle');
    } catch {
      setStatus('error');
    } finally {
      loadingRef.current = false;
    }
  }, [pagesUrl, poems.length, pageSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (status !== 'idle' || !sentinel) return;
    // Start loading a little before the end is visible, so scrolling
    // rarely reaches an empty edge.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [status, loadMore]);

  return (
    <>
      <div className='grid gap-6 md:grid-cols-2'>
        {poems.map((poem) => (
          <PoemCard
            key={poem.id}
            poem={poem}
            isFavorited={favorited.has(poem.id)}
            isMemorizing={memorizing.has(poem.id)}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>

      <div ref={sentinelRef} className='py-8 text-center text-sm text-zinc-500'>
        {status === 'loading' && '加载中...'}
        {status === 'done' && '已经到底了'}
        {status === 'error' && (
          <button
            onClick={loadMore}
            className='rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-700 hover:bg-zinc-50'
          >
            加载失败，点击重试
          </button>
        )}
      </div>
    </>
  );
}
