'use client';

import { createContext, useContext } from 'react';
import { MESSAGES } from '@/lib/messages';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locale';

// Only the locale id crosses from the server: the dictionaries hold
// functions (for counts and names), which can't be passed as props to a
// client component, so the client imports them itself.
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** The interface text, for Client Components (getMessages() on the server). */
export function useMessages() {
  return MESSAGES[useLocale()];
}
