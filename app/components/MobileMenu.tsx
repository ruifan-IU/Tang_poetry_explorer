'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * The hamburger button for small screens, and the panel it opens below the
 * navbar. `children` (the links, settings and account controls) is rendered
 * by the server Navbar and passed in, so only the open/closed state lives
 * here. A press outside, or Escape, closes it, as with NavMenu.
 *
 * The panel stays mounted while closed (just hidden), so the font and theme
 * switchers inside it keep their state between openings.
 */
export function MobileMenu({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // A click inside the panel: decide whether it should close.
  const handlePanelClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('a')) {
      setOpen(false);
    }
  };

  return (
    // No `relative` here: the panel is positioned against the sticky <nav>,
    // so it spans the navbar's full width.
    <div ref={ref}>
      <button
        type='button'
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className='rounded-lg p-1.5 text-zinc-700 transition-colors hover:bg-zinc-200 hover:text-zinc-900'
      >
        <svg
          className='h-6 w-6'
          fill='none'
          stroke='currentColor'
          strokeWidth={2}
          strokeLinecap='round'
          viewBox='0 0 24 24'
          aria-hidden
        >
          {open ? (
            <path d='M6 6l12 12M18 6L6 18' />
          ) : (
            <path d='M4 7h16M4 12h16M4 17h16' />
          )}
        </svg>
      </button>

      <div
        id={panelId}
        hidden={!open}
        onClick={handlePanelClick}
        className='absolute inset-x-0 top-full border-b border-zinc-200 bg-zinc-100 shadow-md'
      >
        <div className='container mx-auto px-4 py-4'>{children}</div>
      </div>
    </div>
  );
}
