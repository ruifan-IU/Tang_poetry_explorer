// Background paintings for every page but the home page, all in public/.
// Edit this list when adding or removing images. (Listing public/ at
// runtime isn't an option: on Vercel those files are served from the CDN
// and aren't in the server function's filesystem.)
const BACKGROUNDS = [
  'background_0.jpg',
  'background_5.jpg',
  'background_6.jpg',
  'background_7.jpg',
  'background_8.jpg',
  'background_9.jpg',
  'background_10.jpg',
  'background_11.jpg',
  'background_12.jpg',
  'background_13.jpg',
  'background_14.jpg',
  'background_15.jpg',
].map((file) => `/${file}`);

/**
 * A random background image path, other than `except` if given (so a
 * navigation never "changes" to the same painting).
 *
 * The root layout calls this on the server for each page load, so the HTML
 * and the browser's first render agree on the image (choosing in the browser
 * would mismatch the server's pick during hydration); PageBackground calls
 * it in the browser on each navigation after that.
 */
export function randomBackground(except?: string): string {
  const exceptIndex = except === undefined ? -1 : BACKGROUNDS.indexOf(except);
  if (exceptIndex === -1) {
    return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  }
  // Pick among the other images: draw from all but one slot and step over
  // the excluded one, which keeps every other image equally likely.
  const n = Math.floor(Math.random() * (BACKGROUNDS.length - 1));
  return BACKGROUNDS[n >= exceptIndex ? n + 1 : n];
}
