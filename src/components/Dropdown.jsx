import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from './icons';
import { useLang } from '../context/languageStore.js';

// Shared "floating menu" panel styling for Select/Combobox popovers — rounded
// scroll-inset rows plus a slim custom scrollbar so overflow content doesn't
// look like it's clipped by a plain browser scrollbar cutting into the
// rounded corners.
const DROPDOWN_PANEL_CLASS = 'rounded-2xl bg-white dark:bg-[#111F35] border border-[#0F2854]/10 dark:border-white/10 shadow-xl shadow-[#0F2854]/10 dark:shadow-black/30 p-1.5 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full';
const DROPDOWN_ROW_CLASS = 'w-full text-left px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-colors';

function normalizeOptions(options) {
  return options.map((o) => (typeof o === 'object' && o !== null ? o : { value: o, label: o }));
}

// Popovers used to live inside the trigger's own relatively-positioned
// wrapper, so any ancestor `Panel` (which sets overflow-hidden to clip its
// own rounded corners) silently clipped the open dropdown too. Portaling to
// <body> and tracking the trigger's live viewport position sidesteps that —
// the panel now floats freely above everything, anchored to the trigger.
function useAnchoredRect(anchorRef, open) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef]);
  return rect;
}

// Fully custom, theme-aware replacement for native <select> — the browser's
// own dropdown popup can't be restyled (no CSS hook for its arrow/border/
// hover), so matching the site's look means owning the whole open/close,
// keyboard-nav, and option-list rendering ourselves.
export function Select({
  value, onChange, options, placeholder = '', onOpen,
  className = '', triggerClassName = '', panelClassName = '',
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const ref = useRef(null);
  const panelRef = useRef(null);
  const opts = normalizeOptions(options);
  const selected = opts.find((o) => o.value === value);
  const rect = useAnchoredRect(ref, open);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
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
      {open && rect && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}
          className={`z-50 max-h-60 ${DROPDOWN_PANEL_CLASS} ${panelClassName}`}
        >
          {opts.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400 dark:text-[#7E93AF]">{t.common.noOptions}</p>
          )}
          {opts.map((o, i) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              onMouseEnter={() => setHighlight(i)}
              className={`${DROPDOWN_ROW_CLASS} flex items-center justify-between gap-2 ${
                o.value === value
                  ? 'font-semibold text-[#0F2854] dark:text-[#E7EEF7] bg-[#EAF4FC] dark:bg-white/10'
                  : i === highlight
                    ? 'bg-[#F4F7FC] dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7]'
                    : 'text-gray-700 dark:text-[#C3D2E5]'
              }`}
            >
              {o.label}
              {o.value === value && <CheckIcon className="w-3.5 h-3.5 text-[#4988C4] shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
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
  const panelRef = useRef(null);
  const filtered = value.trim()
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;
  const rect = useAnchoredRect(ref, open && filtered.length > 0);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
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
      {open && filtered.length > 0 && rect && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}
          className={`z-50 max-h-52 ${DROPDOWN_PANEL_CLASS} ${panelClassName}`}
        >
          {filtered.map((o, i) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              onMouseEnter={() => setHighlight(i)}
              className={`${DROPDOWN_ROW_CLASS} ${
                i === highlight ? 'bg-[#F4F7FC] dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7]' : 'text-gray-700 dark:text-[#C3D2E5]'
              }`}
            >
              {o}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
