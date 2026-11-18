// A reserved name (RFC 2606) that never resolves, so it can't be mistaken
// for a real site or a setting someone forgot to fill in.
const PLACEHOLDER = 'http://redirect.invalid';

/**
 * The path on this site to go to after login, from an untrusted `redirect`
 * query value; '/' for anything that leads elsewhere.
 *
 * The value is parsed the way a browser would read it, which catches
 * `//evil.example`, `/\evil.example` and `/<tab>/evil.example` alike. Only
 * the path is returned, never the origin, and a path starting with `//`
 * (which a browser reads as another site) is refused.
 */
export function safeRedirect(value: string | null): string {
  if (!value) return '/';
  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER);
  } catch {
    // Unparseable (e.g. `http://[`); without this the login page would crash.
    return '/';
  }
  const path = url.pathname + url.search + url.hash;
  return url.origin === PLACEHOLDER && !path.startsWith('//') ? path : '/';
}
