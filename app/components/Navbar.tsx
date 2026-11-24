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
import { LogoutButton } from './LogoutButton';
import { MobileMenu } from './MobileMenu';
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

  // Shown signed out too, so readers can find these features; the login
  // page sends them on to the page once they've signed in.
  const favoritesHref = user ? '/favorites' : '/login?redirect=/favorites';
  const memorizationHref = user
    ? '/memorization'
    : '/login?redirect=/memorization';
  const panelLink =
    'rounded px-3 py-2 text-zinc-700 transition-colors hover:bg-zinc-200 hover:text-zinc-900';

  return (
    <nav className='sticky top-0 z-50 border-b border-zinc-200 bg-zinc-100 shadow-sm'>
      {user && !user.emailVerified && (
        <VerificationBanner userEmail={user.email} />
      )}
      <div className='container mx-auto flex flex-wrap items-center justify-between gap-y-3 px-4 py-4'>
        {/* Logo/Brand */}
        <HomeLink className='flex items-center gap-2'>
          <span className='text-xl font-bold text-zinc-900 sm:text-2xl'>{t.brand}</span>
        </HomeLink>

        {/* useSearchParams() needs a Suspense boundary outside it */}
        <Suspense>
          <NavSearch />
        </Suspense>

        {/* Navigation Links: in a row on wide screens; on smaller ones under
            the hamburger, all but the language button. */}
        <div className='hidden items-center gap-6 lg:flex'>
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
          <Link
            href={favoritesHref}
            className='text-zinc-700 transition-colors hover:text-zinc-900'
          >
            {t.nav.favorites}
          </Link>
          <Link
            href={memorizationHref}
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

        <div className='flex items-center gap-3 lg:hidden'>
          <LanguageSwitcher />
          <MobileMenu label={t.nav.menu}>
            <div className='flex flex-col gap-1'>
              <Link href={favoritesHref} className={panelLink}>
                {t.nav.favorites}
              </Link>
              <Link href={memorizationHref} className={panelLink}>
                {t.nav.memorization}
              </Link>
              <Link href='/about' className={panelLink}>
                {t.nav.about}
              </Link>
            </div>

            <div className='mt-4 grid grid-cols-2 gap-4 border-t border-zinc-200 pt-4'>
              <FontSwitcher initialFont={poemFont} inline />
              <ThemeSwitcher initialTheme={theme} inline />
            </div>

            <div className='mt-4 border-t border-zinc-200 pt-4'>
              {user ? (
                <div className='flex items-center justify-between gap-4 px-3'>
                  <span className='truncate text-sm text-zinc-600'>
                    {user.name || user.email}
                  </span>
                  <LogoutButton className='shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-200' />
                </div>
              ) : (
                <div className='flex items-center gap-3 px-3'>
                  <Link href='/login' className='text-zinc-700 hover:text-zinc-900'>
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
          </MobileMenu>
        </div>
      </div>
    </nav>
  );
}
