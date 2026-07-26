// Same outer footprint as ThemeToggle (h-6, rounded-full, border-white/20)
// so the two switches read as a matched pair wherever they sit side by side.
export function LangToggle({ lang, setLang }) {
  return (
    <div
      className="flex items-center h-6 rounded-full border border-white/20 overflow-hidden shrink-0"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      <button
        type="button"
        onClick={() => setLang('th')}
        className={`h-full px-2.5 text-[10px] font-bold tracking-widest transition-colors ${
          lang === 'th' ? 'bg-[#38BDF8] text-[#0F2854]' : 'text-white/40 hover:text-white/70'
        }`}
      >
        TH
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`h-full px-2.5 text-[10px] font-bold tracking-widest transition-colors ${
          lang === 'en' ? 'bg-[#38BDF8] text-[#0F2854]' : 'text-white/40 hover:text-white/70'
        }`}
      >
        EN
      </button>
    </div>
  );
}
