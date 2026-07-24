export function LangToggle({ lang, setLang }) {
  return (
    <div className="flex items-center rounded-full overflow-hidden border border-white/20"
      style={{ fontFamily: "'Courier New', monospace" }}>
      <button
        onClick={() => setLang('th')}
        className={`px-2.5 py-0.5 text-[10px] font-bold tracking-widest transition-all ${
          lang === 'th' ? 'bg-[#38BDF8] text-[#0F2854]' : 'text-white/40 hover:text-white/70'
        }`}
      >
        TH
      </button>
      <span className="text-white/20 text-[10px]">|</span>
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 py-0.5 text-[10px] font-bold tracking-widest transition-all ${
          lang === 'en' ? 'bg-[#38BDF8] text-[#0F2854]' : 'text-white/40 hover:text-white/70'
        }`}
      >
        EN
      </button>
    </div>
  );
}
