'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FavoriteButtonProps = {
  poemId: number;
  initialIsFavorited: boolean;
  isAuthenticated: boolean;
  // Called with the poem's new star count after a favorite is added or
  // removed, for cards whose count wouldn't otherwise update (the home
  // page's feed keeps its poems through refreshes).
  onStarsChange?: (stars: number) => void;
};

export function FavoriteButton({
  poemId,
  initialIsFavorited,
  isAuthenticated,
  onStarsChange,
}: FavoriteButtonProps) {
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await fetch(`/api/favorites?poemId=${poemId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove favorite');
        }

        setIsFavorited(false);
        onStarsChange?.((await response.json()).stars);
      } else {
        // Add to favorites
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poemId }),
        });

        if (!response.ok) {
          const data = await response.json();

          // Handle verification limit error
          if (data.requiresVerification) {
            const shouldVerify = confirm(
              `您已收藏 ${data.currentCount} 首诗词（未验证用户上限：${data.maxCount} 首）\n\n${data.error}\n\n是否前往验证邮箱？`,
            );

            if (shouldVerify) {
              // Scroll to top to show the verification banner
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
          }

          throw new Error(data.error || 'Failed to add favorite');
        }

        setIsFavorited(true);
        onStarsChange?.((await response.json()).stars);
      }

      router.refresh();
    } catch (error) {
      console.error('Toggle favorite error:', error);
      alert('操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        isFavorited
          ? 'bg-mauve-200 text-mauve-600 hover:bg-mauve-300'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isFavorited ? '取消收藏' : '收藏'}
    >
      <svg
        className='h-4 w-4'
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke='currentColor'
        viewBox='0 0 24 24'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
        />
      </svg>
      {isFavorited ? '已收藏' : '收藏'}
    </button>
  );
}
