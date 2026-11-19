// A poem's `stars` (or a poet's, summed over their poems) is the number of
// readers who have saved it with 收藏, so it's shown with the same bookmark
// as the 收藏 button.

export function BookmarkIcon({
  filled = false,
  className = 'h-4 w-4',
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke='currentColor'
      viewBox='0 0 24 24'
    >
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z'
      />
    </svg>
  );
}

/**
 * How many readers saved a poem (or a poet's poems). `className` sets the
 * text size; the icon scales with it.
 */
export function SaveCount({
  count,
  className = 'text-sm',
}: {
  count: number;
  className?: string;
}) {
  const label = `${count.toLocaleString()} 人收藏`;
  return (
    <span
      title={label}
      aria-label={label}
      className={`flex items-center gap-1 font-medium text-mauve-600 ${className}`}
    >
      <BookmarkIcon filled className='h-[1em] w-[1em]' />
      {count.toLocaleString()}
    </span>
  );
}
