'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A navbar dropdown (字体, 外观): a <details> whose summary is `label`. A press
 * anywhere outside it, or Escape, closes it -- <details> on its own only
 * closes when its summary is clicked. `children` gets a `close` function, for
 * options that should close the menu once picked.
 */
export function NavMenu({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // `open` drives the <details> (and onToggle keeps it in sync when the
  // summary is clicked), so closing is just a state update.
  const close = () => setOpen(false);

  // Listening only while open, so a closed menu costs nothing.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!detailsRef.current?.contains(e.target as Node)) setOpen(false);
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

  return (
    <details
      ref={detailsRef}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className='relative'
    >
      <summary className='cursor-pointer list-none text-zinc-700 transition-colors hover:text-zinc-900'>
        {label}
      </summary>
      <div className='absolute right-0 z-50 mt-2 w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg'>
        {children(close)}
      </div>
    </details>
  );
}

/** One option in a NavMenu, with a ✓ when it's the current choice. */
export function NavMenuOption({
  selected,
  onClick,
  className = '',
  children,
  ...rest
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'className' | 'children'>) {
  return (
    <button
      {...rest}
      onClick={onClick}
      aria-pressed={selected}
      className={`block w-full rounded px-3 py-2 text-left text-base ${
        selected ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'
      } ${className}`}
    >
      {children}
      {selected && <span className='ml-2 font-sans text-xs text-zinc-500'>✓</span>}
    </button>
  );
}
