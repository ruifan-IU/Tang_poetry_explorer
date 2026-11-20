// The typefaces readers can choose for poem text. The choice is stored in
// the `poemFont` cookie, set on <html data-poem-font> by the root layout,
// and mapped to a font stack in app/globals.css. Their names, in each
// interface language, are in lib/messages.ts (`fonts`).
export const POEM_FONTS = [
  'noto',
  'cactus',
  'wenkai',
  'mashanzheng',
  'longcang',
] as const;

export type PoemFontId = (typeof POEM_FONTS)[number];

export const DEFAULT_POEM_FONT: PoemFontId = 'noto';
export const POEM_FONT_COOKIE = 'poemFont';

export function isPoemFont(value: unknown): value is PoemFontId {
  return POEM_FONTS.some((font) => font === value);
}
