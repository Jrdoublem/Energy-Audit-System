import { createContext, useContext } from 'react';

export const LanguageContext = createContext(null);

const KEY = 'lang';

export function loadLang() {
  return localStorage.getItem(KEY) === 'en' ? 'en' : 'th';
}

export function persistLang(lang) {
  localStorage.setItem(KEY, lang);
}

// Shared across the app via LanguageProvider (src/context/LanguageProvider.jsx)
// so the sidebar's toggle, the Login page's toggle, and every page's text
// stay in sync — the previous per-component useState implementation left
// each caller with its own copy of `lang`, so toggling in one place didn't
// re-render any other already-mounted component using the hook.
export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
}
