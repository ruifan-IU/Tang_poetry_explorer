'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { SearchBar } from './SearchBar';

/**
 * The home page's search bar, placed in the sticky navbar so it stays on
 * screen while the feed scrolls. It searches the home page's poems, so it is
 * shown only there.
 */
export function NavSearch() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (pathname !== '/') return null;

  return (
    // Its own row on phones, between the brand and the links on wider screens.
    <div className='order-last basis-full md:order-none md:flex md:flex-1 md:basis-auto md:justify-center md:px-8'>
      {/* The navbar isn't remounted between navigations, so key the input
          on ?q= -- otherwise 清除筛选 would leave the old query in the box. */}
      <SearchBar key={searchParams.get('q') ?? ''} />
    </div>
  );
}
