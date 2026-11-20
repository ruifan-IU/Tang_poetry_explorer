import { redirect } from 'next/navigation';
import { PoemCard } from '../components/PoemCard';
import { getCurrentUser } from '@/lib/auth';
import { getMessages } from '@/lib/locale-server';
import { getUserMemorizations, getMemorizationStats } from '@/lib/memorization';
import { getUserFavoritedPoemIds } from '@/lib/favorites';
import { isReviewDue } from '@/lib/spaced-repetition';
import Link from 'next/link';

// The levels' names are in lib/messages.ts (`mastery`).
const masteryLevelConfig = {
  NEW: { color: 'bg-white text-mist-700', icon: '📝' },
  LEARNING: { color: 'bg-mist-100 text-mist-700', icon: '📚' },
  YOUNG: { color: 'bg-mist-200 text-mist-700', icon: '🌱' },
  MATURE: { color: 'bg-mist-300 text-mist-700', icon: '🎯' },
  MASTERED: { color: 'bg-mist-400 text-mist-700', icon: '🏆' },
};
type MasteryLevel = keyof typeof masteryLevelConfig;

function isMasteryLevel(value: unknown): value is MasteryLevel {
  return typeof value === 'string' && value in masteryLevelConfig;
}

export default async function MemorizationPage(props: {
  searchParams: Promise<{ level?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/memorization');
  }

  // Which list the right side shows: a mastery level (?level=), or with
  // none the poems due for review. Chosen by clicking a card on the left;
  // kept in the URL so back, reload and links keep the choice.
  const { level } = await props.searchParams;
  const t = await getMessages();
  const selectedLevel = isMasteryLevel(level) ? level : null;

  const [memorizations, favoritedPoemIds, stats] = await Promise.all([
    getUserMemorizations(user.userId),
    getUserFavoritedPoemIds(user.userId),
    getMemorizationStats(user.userId),
  ]);

  const MAX_MEMORIZATIONS_UNVERIFIED = 3;
  const showLimitWarning =
    !user.emailVerified &&
    memorizations.length >= MAX_MEMORIZATIONS_UNVERIFIED - 1;

  // Only due poems can be practiced (an early review would throw off the
  // schedule): their cards open the practice page, the rest the poem page.
  const dueMemorizations = memorizations.filter((m) =>
    isReviewDue(m.nextReviewAt),
  );
  const dueIds = new Set(dueMemorizations.map((m) => m.poemId));
  const shownMemorizations = selectedLevel
    ? memorizations.filter((m) => m.masteryLevel === selectedLevel)
    : dueMemorizations;

  const renderCard = (memorization: (typeof memorizations)[number]) => {
    const isDue = dueIds.has(memorization.poemId);
    return (
      <PoemCard
        key={memorization.poem.id}
        poem={memorization.poem}
        isFavorited={favoritedPoemIds.includes(memorization.poem.id)}
        isMemorizing={true}
        isAuthenticated={true}
        href={
          isDue
            ? `/memorization/practice?poemId=${memorization.poem.id}`
            : undefined
        }
        badge={isDue ? t.memorization.due : undefined}
      />
    );
  };

  return (
    <div className='min-h-screen'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-8'>
          {/* Baseline-aligned, so the count sits on the title's text line;
              wraps below it on screens too narrow for both. */}
          <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
            <h1 className='text-3xl font-bold text-zinc-900'>
              {t.memorization.title}
            </h1>
            <p className='text-zinc-600'>
              {t.memorization.count(memorizations.length)}
              {!user.emailVerified && (
                <span className='ml-2 text-sm text-amber-600'>
                  {t.common.unverifiedLimit(MAX_MEMORIZATIONS_UNVERIFIED)}
                </span>
              )}
            </p>
          </div>

          {/* Limit Warning */}
          {showLimitWarning && (
            <div className='mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4'>
              <div className='flex items-start gap-3'>
                <svg
                  className='w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  />
                </svg>
                <div className='flex-1'>
                  <p className='text-sm font-medium text-amber-900'>
                    {t.memorization.limitTitle}
                  </p>
                  <p className='mt-1 text-sm text-amber-700'>
                    {t.memorization.limitBody(
                      MAX_MEMORIZATIONS_UNVERIFIED - memorizations.length,
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {memorizations.length > 0 ? (
          <div className='flex flex-col gap-8 lg:flex-row lg:items-start'>
            {/* Left: 待复习, then the mastery levels under their heading;
                each card picks the list shown on the right. A plain stack
                from lg up; above the list on smaller screens, with the
                levels in a grid. */}
            <aside className='lg:sticky lg:top-24 lg:w-60 lg:shrink-0'>
              <nav>
                <ListCard
                  href='/memorization'
                  label={t.memorization.due}
                  count={dueMemorizations.length}
                  isSelected={selectedLevel === null}
                  className='bg-purple-100 text-purple-800'
                />
                <h2 className='mb-4 mt-6 text-xl font-semibold text-zinc-900'>
                  {t.memorization.levels}
                </h2>
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1'>
                  {Object.entries(masteryLevelConfig).map(([key, config]) => (
                    <ListCard
                      key={key}
                      href={`/memorization?level=${key}`}
                      label={t.mastery[key as MasteryLevel]}
                      count={stats.byMasteryLevel[key] || 0}
                      isSelected={key === selectedLevel}
                      className={config.color}
                    />
                  ))}
                </div>
              </nav>
            </aside>

            {/* Right: the selected list */}
            <section className='min-w-0 flex-1'>
              <div className='mb-4 flex items-center justify-between gap-4'>
                <h2 className='flex items-center gap-2 text-xl font-semibold text-zinc-900'>
                  {selectedLevel ? (
                    <>
                      <span>{masteryLevelConfig[selectedLevel].icon}</span>
                      <span>{t.mastery[selectedLevel]}</span>
                    </>
                  ) : (
                    <span>{t.memorization.due}</span>
                  )}
                  <span className='text-base font-normal text-zinc-500'>
                    ({shownMemorizations.length})
                  </span>
                </h2>
              </div>
              {shownMemorizations.length > 0 ? (
                <div className='grid gap-6 md:grid-cols-2'>
                  {shownMemorizations.map(renderCard)}
                </div>
              ) : (
                <p className='rounded-lg border border-zinc-200 bg-white/80 p-6 text-center text-zinc-600'>
                  {selectedLevel
                    ? t.memorization.emptyLevel
                    : t.memorization.noneDue}
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className='rounded-lg border border-zinc-200 bg-white p-12 text-center'>
            <p className='text-lg text-zinc-600'>
              {t.memorization.empty}
            </p>
            <p className='mt-2 text-sm text-zinc-500'>
              {t.memorization.emptyHint}
            </p>
            <Link
              href='/'
              className='mt-4 inline-block rounded-lg bg-zinc-900 px-6 py-2 text-white hover:bg-zinc-800'
            >
              {t.common.explore}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// A card on the left that selects which list the right side shows.
function ListCard({
  href,
  label,
  count,
  isSelected,
  className,
}: {
  href: string;
  label: string;
  count: number;
  isSelected: boolean;
  className: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={isSelected ? 'page' : undefined}
      className={`flex items-center justify-between rounded-lg border p-4 transition-transform duration-150 hover:scale-105 hover:shadow-md ${className} ${
        isSelected ? 'ring-2 ring-mist-700 ring-offset-2' : ''
      }`}
    >
      <span className='text-lg font-medium'>{label}</span>
      <span className='text-2xl font-bold'>{count}</span>
    </Link>
  );
}
