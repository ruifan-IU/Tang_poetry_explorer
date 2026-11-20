'use client';

import { useState } from 'react';
import { THEMES, THEME_COOKIE, type ThemeId } from '@/lib/theme';
import { NavMenu, NavMenuOption } from './NavMenu';
import { useMessages } from './LocaleProvider';

// Outside the component, like applyPoemFont: only ever runs on a click.
function applyTheme(id: ThemeId) {
  const root = document.documentElement;
  if (id === 'system') delete root.dataset.theme;
  else root.dataset.theme = id;
  document.cookie = `${THEME_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Lets the reader choose light, dark, or the system's appearance. Applies at
 * once and is saved in a cookie, so the server renders the next page in it
 * (no flash of the wrong colours) -- the same arrangement as FontSwitcher.
 */
export function ThemeSwitcher({ initialTheme }: { initialTheme: ThemeId }) {
  const [theme, setTheme] = useState(initialTheme);
  const t = useMessages();

  return (
    <NavMenu label={t.nav.theme}>
      {(close) =>
        THEMES.map((id) => (
          <NavMenuOption
            key={id}
            selected={theme === id}
            onClick={() => {
              setTheme(id);
              applyTheme(id);
              close();
            }}
          >
            {t.themes[id]}
          </NavMenuOption>
        ))
      }
    </NavMenu>
  );
}
