'use client';

import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { randomBackground } from '@/lib/backgrounds';

/**
 * The painting behind every page: landing.jpg on the home page, and a
 * random one elsewhere -- `background` (picked by the root layout) on page
 * load, then a new pick on each navigation. Fixed
 * to the viewport so it stays put while the page scrolls, under a parchment
 * wash that keeps text readable. Choosing by path here (rather than one
 * image per page) means each page downloads only its own image.
 */
export function PageBackground({ background }: { background: string }) {
  const pathname = usePathname();
  // The painting and the path it was picked for. When the path changes,
  // pick again right here in render rather than in an effect: React redoes
  // this render with the new state before showing anything, so the old
  // painting never flashes on the new page.
  const [picked, setPicked] = useState({ pathname, background });
  if (picked.pathname !== pathname) {
    setPicked({ pathname, background: randomBackground(picked.background) });
  }

  const src = pathname === '/' ? '/landing.jpg' : picked.background;

  return (
    <div aria-hidden className='fixed inset-0 -z-10'>
      <Image
        key={src}
        src={src}
        alt=''
        fill
        priority
        sizes='100vw'
        className='object-cover scale-[1.02]'
      />
      <div className='absolute inset-0 bg-stone-50/60' />
    </div>
  );
}
