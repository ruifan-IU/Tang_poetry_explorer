'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FavoriteButton } from './FavoriteButton';
import { MemorizeButton } from './MemorizeButton';
import { SaveCount } from './SaveCount';

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
  // A short label beside the title, e.g. 待复习 (due) on the memorization page.
  badge?: string;
};

export function PoemCard({
  poem,
  isFavorited,
  isMemorizing = false,
  isAuthenticated,
  href,
  badge,
}: PoemCardProps) {
  const router = useRouter();
  // Updated by the 收藏 button, so the count changes as soon as the reader
  // favorites the poem.
  const [stars, setStars] = useState(poem.stars);

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
      // min-w-0: as a grid item the card would otherwise grow to fit its
      // one-line title instead of letting the title be cut off.
      className='block min-w-0 rounded-lg border border-zinc-200 bg-zinc-100 p-6 transition-shadow hover:shadow-lg'
    >
      {/* Header */}
      <div className='mb-4 flex items-start justify-between gap-4'>
        {/* min-w-0 lets this column shrink below its content's width, so a
            long title is cut off with … rather than pushing the save count out. */}
        <div className='min-w-0 flex-1'>
          <h3 className='flex items-center text-xl font-semibold text-zinc-900'>
            {/* The poem's own text is Chinese in either interface language.
                One line; hover shows the whole title. The badge doesn't
                shrink, so it stays visible beside a cut-off title. */}
            <span lang='zh-CN' title={poem.title} className='truncate'>
              {poem.title}
            </span>
            {badge && (
              <span className='ml-2 shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700'>
                {badge}
              </span>
            )}
          </h3>
          <button
            onClick={handlePoetClick}
            className='mt-2 text-left hover:underline'
          >
            <p lang='zh-CN' className='text-sm text-zinc-600'>
              {poem.poet.name}
            </p>
          </button>
        </div>
        <SaveCount count={stars} />
      </div>

      {/* Content Preview */}
      <div
        lang='zh-CN'
        className='mb-4 whitespace-pre-line font-serif text-lg leading-relaxed text-zinc-700'
      >
        {contentPreview}
        {hasMore && <span className='text-zinc-400'>...</span>}
      </div>

      {/* Tags and Buttons */}
      <div className='flex items-center justify-between gap-4'>
        {/* At most three tags, and only as many as fit on one line: the row
            is one tag tall, so a tag that would wrap lands on a second line
            that's cut off. Whole tags only -- nowrap keeps a tag's own text
            from breaking onto two lines and showing half a tag. */}
        <div
          lang='zh-CN'
          className='flex h-6 min-w-0 flex-1 flex-wrap gap-2 overflow-hidden'
        >
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
            onStarsChange={setStars}
          />
        </div>
      </div>
    </Link>
  );
}
