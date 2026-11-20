// The interface language. Poems, poets and tags are always Chinese; this
// switches everything around them (navigation, buttons, headings, notices).
// Stored in the `locale` cookie; with no cookie, chosen from the browser's
// Accept-Language header. The root layout sets <html lang> from it.
export const LOCALES = [
  { id: 'zh', label: '中文', htmlLang: 'zh-CN' },
  { id: 'en', label: 'English', htmlLang: 'en' },
] as const;

export type Locale = (typeof LOCALES)[number]['id'];

export const DEFAULT_LOCALE: Locale = 'zh';
export const LOCALE_COOKIE = 'locale';

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale.id === value);
}

export function htmlLang(locale: Locale): string {
  return LOCALES.find((l) => l.id === locale)!.htmlLang;
}

/**
 * The language for a first-time visitor, who hasn't picked one yet. If their
 * browser's Accept-Language header includes any Chinese variant, use Chinese;
 * otherwise, use English.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  return /(?:^|,)\s*zh/i.test(header ?? '') ? 'zh' : 'en';
}
