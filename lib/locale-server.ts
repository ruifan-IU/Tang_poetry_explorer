import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { MESSAGES } from './messages';
import {
  LOCALE_COOKIE,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from './locale';

/**
 * The interface language for this request: the reader's choice (the
 * `locale` cookie, set by LanguageSwitcher), else a guess from the browser.
 * Cached per request, since the layout and the page both ask.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromAcceptLanguage((await headers()).get('accept-language'));
});

/** The interface text for this request, for Server Components. */
export async function getMessages() {
  return MESSAGES[await getLocale()];
}
