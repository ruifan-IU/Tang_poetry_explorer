import type { Metadata } from 'next';
import Link from 'next/link';
import { getCollectionStats } from '@/lib/queries';
import { POEM_FONTS } from '@/lib/poem-fonts';

export const metadata: Metadata = {
  title: '关于 · 唐诗博览',
};

export default async function AboutPage() {
  const stats = await getCollectionStats();

  return (
    <div className='min-h-screen py-12'>
      <article className='container mx-auto max-w-3xl px-4'>
        <div className='rounded-lg border border-zinc-200 bg-white p-8 leading-relaxed text-zinc-700'>
          <h1 className='mb-6 text-4xl font-bold text-zinc-900'>关于唐诗博览</h1>

          <p className='mb-8'>
            {/* One line per sentence: JSX turns a line break inside text
                into a space, which shows up in Chinese. */}
            唐诗博览收录《全唐诗》中的 {stats.poems.toLocaleString()} 首诗、
            {stats.poets.toLocaleString()} 位诗人，可以按 {stats.tags} 个主题浏览、搜索、收藏，并用间隔重复的方法背诵。
          </p>

          <h2 className='mb-3 text-xl font-semibold text-zinc-900'>推荐与排序</h2>
          <p className='mb-8'>
            每首诗有一个知名度分数，依据它是否入选《唐诗三百首》等经典选本，以及在古诗文网上受到的关注。首页的推荐从最知名的作品开始，同一档次内随机排列；选择主题后，诗按知名度从高到低排列。
          </p>

          <h2 className='mb-3 text-xl font-semibold text-zinc-900'>背诵</h2>
          <p className='mb-8'>
            加入背诵的诗会按遗忘规律安排复习：记得越牢，下次复习隔得越久。有诗到期时，我们会发邮件提醒。
            <Link href='/memorization' className='ml-1 text-zinc-900 underline'>
              开始背诵
            </Link>
          </p>

          <h2 className='mb-3 text-xl font-semibold text-zinc-900'>字体</h2>
          <p>
            诗文可以用以下字体显示，在页面顶部的“字体”中切换：
            {POEM_FONTS.map((font) => font.label).join('、')}
            。书法字体收字较少，缺少的字会用霞鹜文楷显示。
          </p>
        </div>
      </article>
    </div>
  );
}
