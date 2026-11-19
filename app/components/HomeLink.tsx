'use client';

import Link from 'next/link';

/**
 * The navbar's link home. From the plain home page itself (no search or
 * filters), a click reloads the page instead, which reshuffles the
 * recommended feed: a client-side navigation to the same URL would keep the
 * feed, since PoemFeed deliberately survives server refreshes (see its key
 * in app/page.tsx). Everywhere else it's an ordinary client-side link.
 */
export function HomeLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let cmd/ctrl/shift/middle clicks open a new tab or window as usual.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.location.pathname === '/' && window.location.search === '') {
      e.preventDefault();
      window.location.assign('/');
    }
  };

  return (
    <Link href='/' onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
