import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getMessages } from '@/lib/locale-server';
import type { PoemFontId } from '@/lib/poem-fonts';
import type { ThemeId } from '@/lib/theme';
import { FontSwitcher } from './FontSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { HomeLink } from './HomeLink';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavSearch } from './NavSearch';
import { UserMenu } from './UserMenu';
import { VerificationBanner } from './VerificationBanner';

export async function Navbar({
  poemFont,
  theme,
}: {
  poemFont: PoemFontId;
  theme: ThemeId;
}) {
  const user = await getCurrentUser();
  const t = await getMessages();

  return (
    <nav className='sticky top-0 z-50 border-b border-zinc-200 bg-zinc-100 shadow-sm'>
      {user && !user.emailVerified && (
        <VerificationBanner userEmail={user.email} />
      )}
      <div className='container mx-auto flex flex-wrap items-center justify-between gap-y-3 px-4 py-4'>
        {/* Logo/Brand */}
        <HomeLink className='flex items-center gap-2'>
          <span className='text-2xl font-bold text-zinc-900'>{t.brand}</span>
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
            {t.nav.about}
          </Link>
          <FontSwitcher initialFont={poemFont} />
          <ThemeSwitcher initialTheme={theme} />
          <LanguageSwitcher />
          {/* Reading settings on the left, the reader's own pages and
              account on the right. Decorative, so screen readers skip it. */}
          <span aria-hidden className='text-zinc-300'>
            |
          </span>
          {/* Shown signed out too, so readers can find these features; the
              login page sends them on to the page once they've signed in. */}
          <Link
            href={user ? '/favorites' : '/login?redirect=/favorites'}
            className='text-zinc-700 transition-colors hover:text-zinc-900'
          >
            {t.nav.favorites}
          </Link>
          <Link
            href={user ? '/memorization' : '/login?redirect=/memorization'}
            className='text-zinc-700 transition-colors hover:text-zinc-900'
          >
            {t.nav.memorization}
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
                {t.nav.login}
              </Link>
              <Link
                href='/signup'
                className='rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800'
              >
                {t.nav.signup}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
