// Light or dark appearance. 'system' follows the operating system; the
// others force a mode. Stored in the `theme` cookie and set on
// <html data-theme> by the root layout (none for 'system'), which
// app/globals.css maps to a color-scheme.
export const THEMES = [
  { id: 'system', label: '跟随系统' },
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_THEME: ThemeId = 'system';
export const THEME_COOKIE = 'theme';

export function isTheme(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
