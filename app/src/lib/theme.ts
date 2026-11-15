import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

/** Must match the key read by the inline script in index.html. */
const STORAGE_KEY = 'veribounty-theme';
const META_COLORS: Record<Theme, string> = { light: '#F7F5F0', dark: '#141412' };

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLORS[theme]);
}

/**
 * Current theme and a setter. Follows the OS setting until the user picks a
 * theme explicitly; the choice is then remembered in this browser.
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(
    () => readStored() ?? (darkQuery().matches ? 'dark' : 'light'),
  );

  useEffect(() => applyTheme(theme), [theme]);

  // Track OS changes while the user hasn't chosen a theme.
  useEffect(() => {
    const query = darkQuery();
    const onChange = (e: MediaQueryListEvent) => {
      if (!readStored()) setThemeState(e.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (e.g. private mode): the theme still applies for this visit.
    }
    setThemeState(next);
  }, []);

  return [theme, setTheme];
}
