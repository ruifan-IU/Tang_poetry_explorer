import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPoetById } from '@/lib/queries';
import { PoetIntroduction } from '@/app/components/PoetIntroduction';
import { SaveCount } from '@/app/components/SaveCount';

type Params = Promise<{ id: string }>;

export default async function PoetDetailPage(props: { params: Params }) {
  const params = await props.params;
  const poet = await getPoetById(Number(params.id));

  if (!poet) {
    notFound();
  }

  return (
    <div className='min-h-screen py-12'>
      <div className='container mx-auto max-w-4xl px-4'>
        {/* Header Card */}
        <div className='mb-8 rounded-lg border border-zinc-200 bg-white p-8'>
          <div className='flex flex-col gap-6 md:flex-row md:items-start'>
            {/* Poet Info */}
            <div className='flex-1'>
              <div className='mb-4 flex items-start justify-between'>
                <div>
                  <h1 className='mb-2 text-4xl font-bold text-zinc-900'>
                    {poet.name}
                  </h1>
                </div>
                <SaveCount count={poet.stars} className='text-lg' />
              </div>
            </div>
          </div>
        </div>

        {/* Introduction */}
        {poet.introduction && (
          <PoetIntroduction introduction={poet.introduction} />
        )}

        {/* Poems by this poet */}
        <section className='rounded-lg border border-zinc-200 bg-white p-8'>
          <div className='mb-6 flex items-center justify-between'>
            <h2 className='text-2xl font-semibold text-zinc-900'>代表作品</h2>
            <p className='text-sm text-zinc-600'>
              共 {poet.poems.length} 首
              {poet.poems.length >= 10 && '（显示前10首）'}
            </p>
          </div>

          {poet.poems.length > 0 ? (
            <div className='space-y-4'>
              {poet.poems.map((poem) => (
                <Link
                  key={poem.id}
                  href={`/poems/${poem.id}`}
                  className='block rounded-lg border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:bg-zinc-100'
                >
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1'>
                      <h3 className='mb-2 text-lg font-semibold text-zinc-900'>
                        {poem.title}
                      </h3>
                      <p className='line-clamp-2 font-serif text-base text-zinc-600'>
                        {poem.content.split('\n').slice(0, 2).join('\n')}
                      </p>
                    </div>
                    <SaveCount count={poem.stars} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className='text-center text-zinc-600'>暂无收录作品</p>
          )}
        </section>
      </div>
    </div>
  );
}
