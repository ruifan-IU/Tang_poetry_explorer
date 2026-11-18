'use client';

import { useEffect, useRef, useState } from 'react';
import {
  POEM_FONTS,
  POEM_FONT_COOKIE,
  type PoemFontId,
} from '@/lib/poem-fonts';

// Outside the component: these write to the page and the cookie jar, which
// only ever happens in response to a click, never during render.
function applyPoemFont(id: PoemFontId) {
  document.documentElement.dataset.poemFont = id;
  document.cookie = `${POEM_FONT_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Lets the reader pick the typeface for poem text. The choice applies at
 * once (a data attribute on <html> that globals.css maps to a font stack)
 * and is saved in a cookie, so the server renders the next page with it and
 * there's no flash of the default font.
 */
export function FontSwitcher({ initialFont }: { initialFont: PoemFontId }) {
  const [font, setFont] = useState(initialFont);
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // While the menu is open, a press anywhere outside it, or Escape, closes
  // it. <details> only closes when its own summary is clicked.
  useEffect(() => {
    if (!open) return;
    const close = () => detailsRef.current?.removeAttribute('open');
    const onPointerDown = (e: PointerEvent) => {
      if (!detailsRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (id: PoemFontId) => {
    setFont(id);
    applyPoemFont(id);
    detailsRef.current?.removeAttribute('open');
  };

  return (
    <details
      ref={detailsRef}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className='relative'
    >
      <summary className='cursor-pointer list-none text-zinc-700 transition-colors hover:text-zinc-900'>
        字体
      </summary>
      <div className='absolute right-0 z-50 mt-2 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg'>
        {POEM_FONTS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => choose(id)}
            // Each option is set in its own font, as a preview.
            data-poem-font={id}
            className={`font-serif block w-full rounded px-3 py-2 text-left text-base ${
              font === id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {label}
            {font === id && <span className='ml-2 font-sans text-xs text-zinc-500'>✓</span>}
          </button>
        ))}
      </div>
    </details>
  );
}
