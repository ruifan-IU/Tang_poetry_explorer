import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import type { PoemFontId } from '@/lib/poem-fonts';
import { FontSwitcher } from './FontSwitcher';
import { HomeLink } from './HomeLink';
import { NavSearch } from './NavSearch';
import { UserMenu } from './UserMenu';
import { VerificationBanner } from './VerificationBanner';

export async function Navbar({ poemFont }: { poemFont: PoemFontId }) {
  const user = await getCurrentUser();

  return (
    <nav className='sticky top-0 z-50 border-b border-zinc-200 bg-zinc-100 shadow-sm'>
      {user && !user.emailVerified && (
        <VerificationBanner userEmail={user.email} />
      )}
      <div className='container mx-auto flex flex-wrap items-center justify-between gap-y-3 px-4 py-4'>
        {/* Logo/Brand */}
        <HomeLink className='flex items-center gap-2'>
          <span className='text-2xl font-bold text-zinc-900'>唐诗博览</span>
        </HomeLink>

        {/* useSearchParams() needs a Suspense boundary outside it */}
        <Suspense>
          <NavSearch />
        </Suspense>

        {/* Navigation Links */}
        <div className='flex items-center gap-6'>
          <Link
            href='/about'
            className='text-zinc-700 transition-colors hover:text-zinc-900'
          >
            关于
          </Link>
          <FontSwitcher initialFont={poemFont} />
          {/* Shown signed out too, so readers can find these features; the
              login page sends them on to the page once they've signed in. */}
          <Link
            href={user ? '/favorites' : '/login?redirect=/favorites'}
            className='text-zinc-700 transition-colors hover:text-zinc-900'
          >
            收藏
          </Link>
          <Link
            href={user ? '/memorization' : '/login?redirect=/memorization'}
            className='text-zinc-700 transition-colors hover:text-zinc-900'
          >
            背诵
          </Link>

          {/* Auth Section */}
          {user ? (
            <UserMenu user={user} />
          ) : (
            <div className='flex items-center gap-3'>
              <Link
                href='/login'
                className='text-zinc-700 transition-colors hover:text-zinc-900'
              >
                登录
              </Link>
              <Link
                href='/signup'
                className='rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800'
              >
                注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
