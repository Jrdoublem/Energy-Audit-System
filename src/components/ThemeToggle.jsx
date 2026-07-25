import { useTheme } from '../context/themeStore.js';
import { MoonIcon, SunIcon } from './icons';

// A real sliding switch (not a button whose label could be misread as
// "current state" vs. "action to take") — the knob's position is the only
// thing that communicates state, same convention as any OS dark-mode switch.
// Lives on the sidebar's permanently-dark background, so no dark: variants.
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      title={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
      className="relative w-12 h-6 rounded-full border border-white/20 shrink-0 transition-colors duration-200"
      style={{ background: isDark ? '#1C4D8D' : 'rgba(255,255,255,0.08)' }}
    >
      <SunIcon className="absolute left-[5px] top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
      <MoonIcon className="absolute right-[5px] top-1/2 -translate-y-1/2 w-3 h-3 text-white/50 pointer-events-none" />
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center text-[#0F2854] transition-transform duration-200"
        style={{ transform: isDark ? 'translateX(24px)' : 'translateX(0)' }}
      >
        {isDark ? <MoonIcon className="w-3 h-3" /> : <SunIcon className="w-3 h-3" />}
      </span>
    </button>
  );
}
