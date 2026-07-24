import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext, loadTheme, persistTheme } from './themeStore.js';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(loadTheme);

  // Apply on mount too, so the very first render (before any toggle click)
  // already has the right `.dark` class — matters if loadTheme() picked up
  // an OS dark-mode preference rather than an explicit saved choice.
  useEffect(() => { persistTheme(theme); }, [theme]);

  const setTheme = useCallback((t) => setThemeState(t), []);
  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
