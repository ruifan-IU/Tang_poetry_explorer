'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMessages } from '@/app/components/LocaleProvider';

type Poem = {
  id: number;
  title: string;
  content: string;
  poet: {
    name: string;
  };
};

type Memorization = {
  id: number;
  masteryLevel: string;
  interval: number;
  repetitions: number;
  totalReviews: number;
  correctReviews: number;
  poem: Poem;
};

type ReviewResponse = 'again' | 'hard' | 'good' | 'easy';

export default function PracticePage() {
  // useSearchParams() needs a Suspense boundary outside it
  return (
    <Suspense fallback={null}>
      <PracticeSession />
    </Suspense>
  );
}

function PracticeSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useMessages();
  // A poem picked on the memorization page (?poemId=) is practiced first,
  // due or not; after it, the session continues with the poems that are due.
  const [chosenPoemId, setChosenPoemId] = useState(searchParams.get('poemId'));
  const [memorization, setMemorization] = useState<Memorization | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    fetchNextReview(chosenPoemId);
  }, []);

  // Back to the due queue: drop ?poemId= so a reload doesn't reopen the poem.
  const leaveChosenPoem = () => {
    setChosenPoemId(null);
    router.replace('/memorization/practice');
  };

  const fetchNextReview = async (poemId: string | null) => {
    try {
      setIsLoading(true);
      setError(false);
      const response = await fetch(
        poemId === null
          ? '/api/memorization/review'
          : `/api/memorization/review?poemId=${encodeURIComponent(poemId)}`
      );

      if (response.status === 401) {
        const here = poemId === null ? '/memorization/practice' : `/memorization/practice?poemId=${poemId}`;
        router.push(`/login?redirect=${encodeURIComponent(here)}`);
        return;
      }

      // The picked poem isn't in the list or isn't due (a stale link, or a
      // tab left open): practice whatever is due instead.
      if (poemId !== null && [400, 404, 409].includes(response.status)) {
        leaveChosenPoem();
        await fetchNextReview(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch next review');
      }

      const data = await response.json();

      if (!data.nextReview) {
        setMemorization(null);
      } else {
        setMemorization(data.nextReview);
        setShowAnswer(false);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (response: ReviewResponse) => {
    if (!memorization) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/memorization/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poemId: memorization.poem.id,
          response,
        }),
      });

      // Not due (already reviewed in another tab, or a page left open from
      // before): there's nothing to record, and retrying can't succeed, so
      // move on rather than showing an error.
      if (res.status === 409) {
        if (chosenPoemId !== null) leaveChosenPoem();
        await fetchNextReview(null);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to submit review');
      }

      const data = await res.json();

      // Increment review count
      setReviewCount(prev => prev + 1);

      // Fetch next review; a picked poem is done once rated
      if (chosenPoemId !== null) leaveChosenPoem();
      await fetchNextReview(null);
    } catch (err) {
      console.error('Submit error:', err);
      alert(t.practice.submitFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{t.practice.loadFailed}</p>
          <button
            onClick={() => fetchNextReview(chosenPoemId)}
            className="rounded-lg bg-purple-600 px-6 py-2 text-white hover:bg-purple-700"
          >
            {t.common.retry}
          </button>
        </div>
      </div>
    );
  }

  if (!memorization) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="rounded-lg border border-zinc-200 bg-white p-12">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                {t.practice.doneTitle}
              </h1>
              <p className="text-zinc-600 mb-2">
                {t.practice.doneBody}
              </p>
              {reviewCount > 0 && (
                <p className="text-sm text-zinc-500 mb-6">
                  {t.practice.reviewedTotal(reviewCount)}
                </p>
              )}
              <div className="flex gap-4 justify-center">
                <Link
                  href="/memorization"
                  className="rounded-lg bg-zinc-900 px-6 py-2 text-white hover:bg-zinc-800"
                >
                  {t.practice.backToList}
                </Link>
                <Link
                  href="/"
                  className="rounded-lg border border-zinc-300 px-6 py-2 text-zinc-700 hover:bg-zinc-50"
                >
                  {t.practice.keepExploring}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const masteryLevelColors = {
    NEW: 'bg-zinc-100 text-zinc-700',
    LEARNING: 'bg-blue-100 text-blue-700',
    YOUNG: 'bg-green-100 text-green-700',
    MATURE: 'bg-purple-100 text-purple-700',
    MASTERED: 'bg-amber-100 text-amber-700',
  };
  const level = memorization.masteryLevel as keyof typeof masteryLevelColors;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/memorization"
              className="text-zinc-600 hover:text-zinc-900 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t.practice.back}
            </Link>
            <div className="flex items-center gap-4">
              {reviewCount > 0 && (
                <span className="text-sm text-zinc-600">
                  {t.practice.reviewedSoFar(reviewCount)}
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${masteryLevelColors[level]}`}>
                {t.mastery[level]}
              </span>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-lg">
            {/* Question */}
            <div className="mb-8">
              <h2 lang="zh-CN" className="text-2xl font-bold text-zinc-900 mb-2">
                {memorization.poem.title}
              </h2>
              <p lang="zh-CN" className="text-zinc-600">
                {memorization.poem.poet.name}
              </p>
            </div>

            {/* Content */}
            <div className="mb-8">
              {!showAnswer ? (
                <div className="text-center py-12">
                  <p className="text-zinc-500 mb-6">
                    {t.practice.recallPrompt}
                  </p>
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="rounded-lg bg-purple-600 px-8 py-3 text-white font-medium hover:bg-purple-700"
                  >
                    {t.practice.showAnswer}
                  </button>
                </div>
              ) : (
                <div>
                  <div lang="zh-CN" className="mb-8 whitespace-pre-line font-serif text-2xl text-zinc-800 leading-loose">
                    {memorization.poem.content}
                  </div>

                  {/* Statistics */}
                  <div className="mb-8 grid grid-cols-3 gap-4 p-4 rounded-lg bg-zinc-50">
                    <div className="text-center">
                      <p className="text-sm text-zinc-600">{t.practice.totalReviews}</p>
                      <p className="text-xl font-bold text-zinc-900">{memorization.totalReviews}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-zinc-600">{t.practice.correctReviews}</p>
                      <p className="text-xl font-bold text-zinc-900">{memorization.correctReviews}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-zinc-600">{t.practice.accuracy}</p>
                      <p className="text-xl font-bold text-zinc-900">
                        {memorization.totalReviews > 0
                          ? Math.round((memorization.correctReviews / memorization.totalReviews) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>

                  {/* Review Buttons */}
                  <div>
                    <p className="text-sm text-zinc-600 mb-3 text-center">
                      {t.practice.howWell}
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      <button
                        onClick={() => handleSubmitReview('again')}
                        disabled={isSubmitting}
                        className="rounded-lg bg-red-50 px-4 py-3 text-red-700 font-medium hover:bg-red-100 disabled:opacity-50"
                      >
                        <div className="text-sm">{t.practice.grades.again.label}</div>
                        <div className="text-xs text-red-600 mt-1">{t.practice.grades.again.hint}</div>
                      </button>
                      <button
                        onClick={() => handleSubmitReview('hard')}
                        disabled={isSubmitting}
                        className="rounded-lg bg-amber-50 px-4 py-3 text-amber-700 font-medium hover:bg-amber-100 disabled:opacity-50"
                      >
                        <div className="text-sm">{t.practice.grades.hard.label}</div>
                        <div className="text-xs text-amber-600 mt-1">{t.practice.grades.hard.hint}</div>
                      </button>
                      <button
                        onClick={() => handleSubmitReview('good')}
                        disabled={isSubmitting}
                        className="rounded-lg bg-green-50 px-4 py-3 text-green-700 font-medium hover:bg-green-100 disabled:opacity-50"
                      >
                        <div className="text-sm">{t.practice.grades.good.label}</div>
                        <div className="text-xs text-green-600 mt-1">{t.practice.grades.good.hint}</div>
                      </button>
                      <button
                        onClick={() => handleSubmitReview('easy')}
                        disabled={isSubmitting}
                        className="rounded-lg bg-blue-50 px-4 py-3 text-blue-700 font-medium hover:bg-blue-100 disabled:opacity-50"
                      >
                        <div className="text-sm">{t.practice.grades.easy.label}</div>
                        <div className="text-xs text-blue-600 mt-1">{t.practice.grades.easy.hint}</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
