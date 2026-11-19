import { redirect } from 'next/navigation';
import { PoemCard } from '../components/PoemCard';
import { getCurrentUser } from '@/lib/auth';
import { getUserMemorizations, getMemorizationStats } from '@/lib/memorization';
import { getUserFavoritedPoemIds } from '@/lib/favorites';
import { isReviewDue } from '@/lib/spaced-repetition';
import Link from 'next/link';

const masteryLevelConfig = {
  NEW: { label: '新增', color: 'bg-white text-mist-700', icon: '📝' },
  LEARNING: {
    label: '学习中',
    color: 'bg-mist-100 text-mist-700',
    icon: '📚',
  },
  YOUNG: { label: '熟悉', color: 'bg-mist-200 text-mist-700', icon: '🌱' },
  MATURE: { label: '掌握', color: 'bg-mist-300 text-mist-700', icon: '🎯' },
  MASTERED: {
    label: '精通',
    color: 'bg-mist-400 text-mist-700',
    icon: '🏆',
  },
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
        badge={isDue ? '待复习' : undefined}
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
            <h1 className='text-3xl font-bold text-zinc-900'>我的背诵</h1>
            <p className='text-zinc-600'>
              共 {memorizations.length} 首诗词
              {!user.emailVerified && (
                <span className='ml-2 text-sm text-amber-600'>
                  （未验证用户上限：{MAX_MEMORIZATIONS_UNVERIFIED} 首）
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
                    即将达到背诵上限
                  </p>
                  <p className='mt-1 text-sm text-amber-700'>
                    您还可以添加{' '}
                    {MAX_MEMORIZATIONS_UNVERIFIED - memorizations.length}{' '}
                    首诗词到背诵列表。 验证邮箱即可解锁无限背诵！
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {memorizations.length > 0 ? (
          <div className='flex flex-col gap-8 lg:flex-row lg:items-start'>
            {/* Left: 待复习 and the mastery levels; each card picks the list
                shown on the right. A plain stack from lg up, a grid above
                the list on smaller screens. */}
            <aside className='lg:sticky lg:top-24 lg:w-60 lg:shrink-0'>
              <h2 className='mb-4 text-xl font-semibold text-zinc-900'>
                掌握程度
              </h2>
              <nav className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-1'>
                <ListCard
                  href='/memorization'
                  label='待复习'
                  count={dueMemorizations.length}
                  isSelected={selectedLevel === null}
                  className='bg-purple-100 text-purple-800'
                />
                {Object.entries(masteryLevelConfig).map(([key, config]) => (
                  <ListCard
                    key={key}
                    href={`/memorization?level=${key}`}
                    label={config.label}
                    count={stats.byMasteryLevel[key] || 0}
                    isSelected={key === selectedLevel}
                    className={config.color}
                  />
                ))}
              </nav>
            </aside>

            {/* Right: the selected list */}
            <section className='min-w-0 flex-1'>
              <div className='mb-4 flex items-center justify-between gap-4'>
                <h2 className='flex items-center gap-2 text-xl font-semibold text-zinc-900'>
                  {selectedLevel ? (
                    <>
                      <span>{masteryLevelConfig[selectedLevel].icon}</span>
                      <span>{masteryLevelConfig[selectedLevel].label}</span>
                    </>
                  ) : (
                    <span>待复习</span>
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
                    ? '这一等级还没有诗词'
                    : '今天没有需要复习的诗词。到期的诗词会出现在这里。'}
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className='rounded-lg border border-zinc-200 bg-white p-12 text-center'>
            <p className='text-lg text-zinc-600'>
              您还没有添加任何诗词到背诵列表
            </p>
            <p className='mt-2 text-sm text-zinc-500'>
              去探索页面发现想要背诵的诗词吧
            </p>
            <Link
              href='/'
              className='mt-4 inline-block rounded-lg bg-zinc-900 px-6 py-2 text-white hover:bg-zinc-800'
            >
              去探索
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
