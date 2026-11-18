// The typefaces readers can choose for poem text. The choice is stored in
// the `poemFont` cookie, set on <html data-poem-font> by the root layout,
// and mapped to a font stack in app/globals.css.
export const POEM_FONTS = [
  { id: 'noto', label: '思源宋体' },
  { id: 'wenkai', label: '霞鹜文楷' },
  { id: 'mashanzheng', label: '马善政楷书' },
  { id: 'longcang', label: '龙藏行书' },
] as const;

export type PoemFontId = (typeof POEM_FONTS)[number]['id'];

export const DEFAULT_POEM_FONT: PoemFontId = 'noto';
export const POEM_FONT_COOKIE = 'poemFont';

export function isPoemFont(value: unknown): value is PoemFontId {
  return POEM_FONTS.some((font) => font.id === value);
}
