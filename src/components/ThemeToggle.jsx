import { useTheme } from '../context/themeStore.js';
import { useLang } from '../context/languageStore.js';
import { MoonIcon, SunIcon } from './icons';

// Deliberately the same structural pattern as LangToggle (h-6 rounded-full
// pill, two h-full px-2.5 segments, active segment gets the same accent fill)
// — the two controls sit side by side in the sidebar, so any difference in
// shape/height between them (the previous sliding-knob switch vs. this
// segmented pill) read as visually mismatched rather than a matched pair.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLang();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center h-6 rounded-full border border-white/20 overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => setTheme('light')}
        title={t.nav.switchToLight}
        className={`h-full px-2.5 flex items-center justify-center transition-colors ${
          !isDark ? 'bg-[#38BDF8] text-[#0F2854]' : 'text-white/40 hover:text-white/70'
        }`}
      >
        <SunIcon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        title={t.nav.switchToDark}
        className={`h-full px-2.5 flex items-center justify-center transition-colors ${
          isDark ? 'bg-[#38BDF8] text-[#0F2854]' : 'text-white/40 hover:text-white/70'
        }`}
      >
        <MoonIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
