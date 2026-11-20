'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALES, LOCALE_COOKIE } from '@/lib/locale';
import { useLocale } from './LocaleProvider';

/**
 * One button that switches the interface to the other language. It's
 * labelled in the language it switches to ("English" / "中文"), so a
 * reader who can't read the current one can still find it.
 *
 * Unlike the font and theme, which CSS applies at once, the text is
 * rendered by Server Components, so after saving the cookie the page is
 * refreshed from the server. Client state (the feed's scroll position and
 * loaded poems) survives the refresh.
 */
export function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const other = LOCALES.find((l) => l.id !== locale)!;

  return (
    <button
      lang={other.htmlLang}
      disabled={isPending}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${other.id}; path=/; max-age=31536000; samesite=lax`;
        startTransition(() => router.refresh());
      }}
      className='rounded-lg border border-zinc-300 px-2 py-1 text-sm text-zinc-700 transition-colors hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-50'
    >
      {other.label}
    </button>
  );
}
