import type { Metadata } from 'next';
import Link from 'next/link';
import { getCollectionStats } from '@/lib/queries';
import { POEM_FONTS } from '@/lib/poem-fonts';
import { getMessages } from '@/lib/locale-server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).about.metaTitle };
}

export default async function AboutPage() {
  const [stats, t] = await Promise.all([getCollectionStats(), getMessages()]);

  return (
    <div className='min-h-screen py-12'>
      <article className='container mx-auto max-w-3xl px-4'>
        <div className='rounded-lg border border-zinc-200 bg-white p-8 leading-relaxed text-zinc-700'>
          <h1 className='mb-6 text-4xl font-bold text-zinc-900'>
            {t.about.title}
          </h1>

          <p className='mb-8'>
            {t.about.intro(stats.poems, stats.poets, stats.tags)}
          </p>

          <h2 className='mb-3 text-xl font-semibold text-zinc-900'>
            {t.about.rankingTitle}
          </h2>
          <p className='mb-8'>{t.about.ranking}</p>

          <h2 className='mb-3 text-xl font-semibold text-zinc-900'>
            {t.about.memorizeTitle}
          </h2>
          <p className='mb-8'>
            {t.about.memorize}
            <Link href='/memorization' className='ml-1 text-zinc-900 underline'>
              {t.about.startMemorizing}
            </Link>
          </p>

          <h2 className='mb-3 text-xl font-semibold text-zinc-900'>
            {t.about.fontsTitle}
          </h2>
          <p>{t.about.fonts(POEM_FONTS.map((font) => t.fonts[font]))}</p>
        </div>
      </article>
    </div>
  );
}
