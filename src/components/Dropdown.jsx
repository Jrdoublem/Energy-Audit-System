import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from './icons';

function normalizeOptions(options) {
  return options.map((o) => (typeof o === 'object' && o !== null ? o : { value: o, label: o }));
}

// Fully custom, theme-aware replacement for native <select> — the browser's
// own dropdown popup can't be restyled (no CSS hook for its arrow/border/
// hover), so matching the site's look means owning the whole open/close,
// keyboard-nav, and option-list rendering ourselves.
export function Select({
  value, onChange, options, placeholder = '', onOpen,
  className = '', triggerClassName = '', panelClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const ref = useRef(null);
  const opts = normalizeOptions(options);
  const selected = opts.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, opts.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
      if (e.key === 'Enter' && highlight >= 0 && opts[highlight]) {
        onChange(opts[highlight].value);
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, highlight, opts, onChange]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            if (!o && onOpen) onOpen();
            return !o;
          });
          setHighlight(opts.findIndex((o2) => o2.value === value));
        }}
        className={triggerClassName || 'flex items-center gap-1.5 w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5]'}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDownIcon className={`w-3.5 h-3.5 shrink-0 ml-auto transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute z-30 mt-1.5 rounded-xl bg-white dark:bg-[#111F35] border border-[#0F2854]/10 dark:border-white/10 shadow-lg py-1 max-h-60 overflow-y-auto ${panelClassName || 'w-full'}`}>
          {opts.length === 0 && (
            <p className="px-3.5 py-2 text-sm text-gray-400 dark:text-[#7E93AF]">ไม่มีตัวเลือก</p>
          )}
          {opts.map((o, i) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${
                o.value === value
                  ? 'font-semibold text-[#0F2854] dark:text-[#E7EEF7] bg-[#EAF4FC] dark:bg-white/10'
                  : i === highlight
                    ? 'bg-[#F4F7FC] dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7]'
                    : 'text-gray-700 dark:text-[#C3D2E5]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Free-text input + filtered suggestion list — the styled equivalent of
// <input list="..."> + <datalist>, which also can't be restyled natively.
// Typing anything is still allowed; the list only ever suggests.
export function Combobox({
  value, onChange, options, placeholder = '', autoFocus = false,
  className = '', inputClassName = '', panelClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const ref = useRef(null);
  const filtered = value.trim()
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && open && highlight >= 0 && filtered[highlight]) {
      e.preventDefault();
      onChange(filtered[highlight]);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={inputClassName}
      />
      {open && filtered.length > 0 && (
        <div className={`absolute z-30 mt-1.5 rounded-xl bg-white dark:bg-[#111F35] border border-[#0F2854]/10 dark:border-white/10 shadow-lg py-1 max-h-52 overflow-y-auto ${panelClassName || 'w-full'}`}>
          {filtered.map((o, i) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                i === highlight ? 'bg-[#F4F7FC] dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7]' : 'text-gray-700 dark:text-[#C3D2E5]'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
