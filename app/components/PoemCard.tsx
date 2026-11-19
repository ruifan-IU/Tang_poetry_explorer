'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FavoriteButton } from './FavoriteButton';
import { MemorizeButton } from './MemorizeButton';

type PoemCardProps = {
  poem: {
    id: number;
    title: string;
    content: string;
    stars: number;
    poet: {
      id: number;
      name: string;
      image: string | null;
    };
    tags: Array<{
      name: string;
    }>;
  };
  isFavorited: boolean;
  isMemorizing?: boolean;
  isAuthenticated: boolean;
  // Where the card goes when clicked; the poem's own page by default.
  href?: string;
};

export function PoemCard({
  poem,
  isFavorited,
  isMemorizing = false,
  isAuthenticated,
  href,
}: PoemCardProps) {
  const router = useRouter();

  // Truncate content to first 4 lines for preview
  const contentPreview = poem.content.split('\n').slice(0, 2).join('\n');
  const hasMore = poem.content.split('\n').length > 2;

  const handlePoetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/poets/${poem.poet.id}`);
  };

  return (
    <Link
      href={href ?? `/poems/${poem.id}`}
      className='block rounded-lg border border-zinc-200 bg-zinc-100 p-6 transition-shadow hover:shadow-lg'
    >
      {/* Header */}
      <div className='mb-4 flex items-start justify-between gap-4'>
        <div className='flex-1'>
          <h3 className='text-xl font-semibold text-zinc-900'>{poem.title}</h3>
          <button
            onClick={handlePoetClick}
            className='mt-2 text-left hover:underline'
          >
            <p className='text-sm text-zinc-600'>{poem.poet.name}</p>
          </button>
        </div>
        <div className='flex items-center gap-1 text-amber-600'>
          <span className='text-sm'>⭐</span>
          <span className='text-sm font-medium'>
            {poem.stars.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Content Preview */}
      <div className='mb-4 whitespace-pre-line font-serif text-lg leading-relaxed text-zinc-700'>
        {contentPreview}
        {hasMore && <span className='text-zinc-400'>...</span>}
      </div>

      {/* Tags and Buttons */}
      <div className='flex items-center justify-between gap-4'>
        {/* At most three tags, and only as many as fit on one line: the row
            is one tag tall, so a tag that would wrap lands on a second line
            that's cut off. Whole tags only -- nowrap keeps a tag's own text
            from breaking onto two lines and showing half a tag. */}
        <div className='flex h-6 min-w-0 flex-1 flex-wrap gap-2 overflow-hidden'>
          {poem.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.name}
              className='whitespace-nowrap rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600'
            >
              {tag.name}
            </span>
          ))}
        </div>
        <div className='flex items-center gap-2 flex-shrink-0'>
          <MemorizeButton
            poemId={poem.id}
            initialIsMemorizing={isMemorizing}
            isAuthenticated={isAuthenticated}
          />
          <FavoriteButton
            poemId={poem.id}
            initialIsFavorited={isFavorited}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </Link>
  );
}
