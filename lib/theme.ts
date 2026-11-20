// Light or dark appearance. 'system' follows the operating system; the
// others force a mode. Stored in the `theme` cookie and set on
// <html data-theme> by the root layout (none for 'system'), which
// app/globals.css maps to a color-scheme. Their names are in
// lib/messages.ts (`themes`).
export const THEMES = ['system', 'light', 'dark'] as const;

export type ThemeId = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeId = 'system';
export const THEME_COOKIE = 'theme';

export function isTheme(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme === value);
}
