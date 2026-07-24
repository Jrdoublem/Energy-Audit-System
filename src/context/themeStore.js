import { createContext, useContext } from 'react';

export const ThemeContext = createContext(null);

const KEY = 'theme';

function systemPrefersDark() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function loadTheme() {
  const saved = localStorage.getItem(KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return systemPrefersDark() ? 'dark' : 'light';
}

export function persistTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(KEY, theme);
}

// Shared across the app via ThemeProvider (src/context/ThemeProvider.jsx) so
// the sidebar's toggle and Dashboard's SVG chart colors (set via plain JS
// fill/stroke attributes, which `dark:` CSS classes can't reach) stay in
// sync — a per-component useState would not re-render siblings on toggle.
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
