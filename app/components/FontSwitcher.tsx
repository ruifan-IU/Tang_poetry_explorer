'use client';

import { useState } from 'react';
import {
  POEM_FONTS,
  POEM_FONT_COOKIE,
  type PoemFontId,
} from '@/lib/poem-fonts';
import { NavMenu, NavMenuOption, NavMenuSection } from './NavMenu';
import { useMessages } from './LocaleProvider';

// Outside the component: these write to the page and the cookie jar, which
// only ever happens in response to a click, never during render.
function applyPoemFont(id: PoemFontId) {
  document.documentElement.dataset.poemFont = id;
  document.cookie = `${POEM_FONT_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Lets the reader pick the typeface for poem text. The choice applies at
 * once (a data attribute on <html> that globals.css maps to a font stack)
 * and is saved in a cookie, so the server renders the next page with it and
 * there's no flash of the default font.
 */
export function FontSwitcher({
  initialFont,
  inline = false,
}: {
  initialFont: PoemFontId;
  /** Options laid out in place (the hamburger panel), not a dropdown. */
  inline?: boolean;
}) {
  const [font, setFont] = useState(initialFont);
  const t = useMessages();
  const Menu = inline ? NavMenuSection : NavMenu;

  return (
    <Menu label={t.nav.font}>
      {(close) =>
        POEM_FONTS.map((id) => (
          <NavMenuOption
            key={id}
            selected={font === id}
            onClick={() => {
              setFont(id);
              applyPoemFont(id);
              close();
            }}
            // Each option is set in its own font, as a preview.
            data-poem-font={id}
            className='font-serif'
          >
            {t.fonts[id]}
          </NavMenuOption>
        ))
      }
    </Menu>
  );
}
