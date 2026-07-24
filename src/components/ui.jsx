import { ChevronDownIcon, SearchIcon } from './icons';

/* ── White content card — the base building block used on every page ── */
export function Panel({ children, className = '', crosshair = false }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-[#EEF3FB] relative overflow-hidden ${className}`}>
      {crosshair && (
        <>
          <span className="absolute top-2.5 left-2.5 w-3 h-3 border-t border-l border-[#4988C4]/20 pointer-events-none" />
          <span className="absolute top-2.5 right-2.5 w-3 h-3 border-t border-r border-[#4988C4]/20 pointer-events-none" />
          <span className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b border-l border-[#4988C4]/20 pointer-events-none" />
          <span className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b border-r border-[#4988C4]/20 pointer-events-none" />
        </>
      )}
      {children}
    </div>
  );
}

/* ── Section title used inside a Panel ── */
export function SectionHeader({ title, tag, right, live }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="w-[3px] h-4 rounded-full bg-[#4988C4] shrink-0" />
      <p className="text-sm font-bold text-[#0F2854]">{title}</p>
      {tag && <span className="text-[9px] tracking-[0.2em] text-[#4988C4]/50 uppercase ml-1">{tag}</span>}
      {live && (
        <div className="flex items-center gap-1 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[9px] tracking-widest text-emerald-500 font-bold uppercase">LIVE</span>
        </div>
      )}
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}

/* ── Page-level title block, rendered directly on the (now light) gradient
     shell. Used by pages that render their own header (hideHeader + fullBleed
     on AppLayout) instead of going through AppLayout's `title` prop — e.g.
     pages that need a search/filter row under the title. ── */
export function PageHeader({ title, subtitle, tag, children, className = '' }) {
  return (
    <div className={`px-5 lg:px-10 pt-14 lg:pt-8 pb-5 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="w-1.5 h-7 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
        <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0F2854]">{title}</h1>
        {tag && <span className="hidden lg:inline text-[10px] tracking-[0.2em] text-[#4988C4]/60 uppercase ml-1">{tag}</span>}
      </div>
      {subtitle && <p className="text-sm font-medium text-[#0F2854]/60 pl-5 tracking-wide mt-1">{subtitle}</p>}
      {children && <div className="flex flex-wrap items-center gap-2 mt-4">{children}</div>}
    </div>
  );
}

/* ── Pill controls for the light content shell — solid white with a subtle
     border/shadow so they read as "elevated" the same way Panel cards do. ── */
export function GlassSearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative flex-1 min-w-[160px] ${className}`}>
      <SearchIcon className="w-4 h-4 text-[#4988C4] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-[#0F2854]/10 shadow-sm placeholder-gray-400 text-[#0F2854] text-sm focus:outline-none focus:ring-2 focus:ring-[#4988C4]/30 transition-colors"
      />
    </div>
  );
}

export function GlassSelect({ value, onChange, className = '', children }) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white hover:bg-[#F4F7FC] border border-[#0F2854]/10 shadow-sm text-[#0F2854] text-xs font-semibold pl-3.5 pr-8 py-2.5 rounded-full focus:outline-none cursor-pointer transition-colors"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4988C4]" />
    </div>
  );
}

export function GlassButton({ children, onClick, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-[#F4F7FC] border border-[#0F2854]/10 shadow-sm text-[#0F2854] text-sm font-semibold transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

/* Primary call-to-action button meant to sit directly on the light shell —
   solid navy-to-blue gradient (same treatment as the Login button and
   Equipment's "คำนวณ" button) so it still pops against a light background. */
export function ShellActionButton({ children, onClick, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-white text-sm font-bold shadow-lg hover:opacity-90 transition-opacity ${className}`}
      style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
    >
      {children}
    </button>
  );
}
