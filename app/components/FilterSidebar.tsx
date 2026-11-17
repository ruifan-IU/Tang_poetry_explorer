'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

type FilterSidebarProps = {
  tags: Array<{ id: number; name: string; _count: { poems: number } }>;
};

export function FilterSidebar({ tags }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedTagIds = searchParams.getAll('tagId');

  // Phones stack the tag list above the feed, so there it starts folded;
  // from lg up it sits in its own column and is always shown.
  const [isOpen, setIsOpen] = useState(false);

  const handleTagToggle = (tagId: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedTagIds.includes(tagId)) {
      params.delete('tagId');
      selectedTagIds.forEach((id) => {
        if (id !== tagId) params.append('tagId', id);
      });
    } else {
      params.append('tagId', tagId);
    }

    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    startTransition(() => {
      router.push('/');
    });
  };

  const hasActiveFilters = selectedTagIds.length > 0;

  return (
    <div className='space-y-4'>
      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          className='w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50'
        >
          清除筛选 ✕
        </button>
      )}

      {/* Tags Filter */}
      <div className='rounded-lg border border-zinc-200 bg-white p-4'>
        <button
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          className='flex w-full items-center justify-between lg:pointer-events-none'
        >
          <h3 className='text-lg font-semibold text-zinc-900'>
            标签
            {hasActiveFilters && (
              <span className='ml-2 text-sm font-normal text-zinc-500'>
                已选 {selectedTagIds.length}
              </span>
            )}
          </h3>
          <span className='text-sm text-zinc-500 lg:hidden'>
            {isOpen ? '收起 ▲' : '展开 ▼'}
          </span>
        </button>

        <div
          className={`mt-3 flex-wrap gap-2 ${isOpen ? 'flex' : 'hidden'} lg:flex`}
        >
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagToggle(String(tag.id))}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                selectedTagIds.includes(String(tag.id))
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {tag.name} ({tag._count.poems})
            </button>
          ))}
        </div>
      </div>

      {isPending && (
        <div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center text-sm text-zinc-600'>
          加载中...
        </div>
      )}
    </div>
  );
}
