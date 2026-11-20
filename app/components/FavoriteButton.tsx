'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookmarkIcon } from './SaveCount';
import { useMessages } from './LocaleProvider';

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
  const t = useMessages();

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
              t.favorite.limitReached(data.currentCount, data.maxCount),
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
      alert(t.common.actionFailed);
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
      title={isFavorited ? t.favorite.remove : t.favorite.add}
    >
      <BookmarkIcon filled={isFavorited} />
      {isFavorited ? t.favorite.saved : t.favorite.add}
    </button>
  );
}
