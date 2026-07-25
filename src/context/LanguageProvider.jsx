import { useCallback, useEffect, useMemo, useState } from 'react';
import { LanguageContext, loadLang, persistLang } from './languageStore.js';
import { TRANSLATIONS } from '../i18n/translations.js';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(loadLang);

  useEffect(() => { persistLang(lang); }, [lang]);

  const setLang = useCallback((l) => setLangState(l), []);
  const toggleLang = useCallback(() => {
    setLangState((l) => (l === 'th' ? 'en' : 'th'));
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t: TRANSLATIONS[lang] }),
    [lang, setLang, toggleLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
