'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

type FilterOption = { id: number; name: string; _count: { poems: number } };

type FilterSidebarProps = {
  poets: FilterOption[];
  tags: FilterOption[];
};

/**
 * The home page's filters: the best-known poets above the most-used tags.
 * Each chip toggles its id in the URL (poetId / tagId, repeatable), and
 * clicking a selected chip again deselects it.
 */
export function FilterSidebar({ poets, tags }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const toggle = (param: 'poetId' | 'tagId', id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const selected = params.getAll(param);

    params.delete(param);
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    next.forEach((s) => params.append(param, s));

    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  return (
    <div className='space-y-4'>
      <FilterSection
        title='诗人'
        options={poets}
        selected={searchParams.getAll('poetId')}
        onToggle={(id) => toggle('poetId', id)}
      />
      <FilterSection
        title='标签'
        options={tags}
        selected={searchParams.getAll('tagId')}
        onToggle={(id) => toggle('tagId', id)}
      />

      {isPending && (
        <div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center text-sm text-zinc-600'>
          加载中...
        </div>
      )}
    </div>
  );
}

function FilterSection({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  // Phones stack the filters above the feed, so there each section starts
  // folded; from lg up they sit in their own column and are always shown.
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className='rounded-lg border border-zinc-200 bg-zinc-100 p-4'>
      <button
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className='flex w-full items-center justify-between lg:pointer-events-none'
      >
        <h3 className='ml-2 text-lg font-semibold text-zinc-900'>
          {title}
          {selected.length > 0 && (
            <span className='ml-2 text-sm font-normal text-zinc-500'>
              已选 {selected.length}
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
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onToggle(String(option.id))}
            aria-pressed={selected.includes(String(option.id))}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              selected.includes(String(option.id))
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {option.name} ({option._count.poems})
          </button>
        ))}
      </div>
    </div>
  );
}
