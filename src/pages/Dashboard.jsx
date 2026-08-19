import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { matchesFactory, useFactory, computeFactoryStats, getFactoryMeta } from '../context/factoryStore.js';
import { fetchAllEquipment } from '../context/equipmentStore.js';
import { fetchAllMeasures } from '../context/measuresStore.js';
import { fetchAllHistory } from '../context/historyStore.js';
import { fetchSettings } from '../context/settingsStore.js';
import { getSession } from '../context/authStore.js';
import { useTheme } from '../context/themeStore.js';
import { useLang } from '../context/languageStore.js';
import { Panel, SectionHeader } from '../components/ui';
import companyLogo from '../assets/Logo.png';
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  CollapseIcon,
  CompressorIcon,
  ExpandIcon,
  EyeIcon,
  FactoryIcon,
  FlameIcon,
  LightningIcon,
  SnowflakeIcon,
} from '../components/icons';

/* ── Stat card ── */
function StatCard({ label, value, unit, onClick, trend, accentColor, vsLabel }) {
  const trendUp = trend && trend > 0;
  const trendDown = trend && trend < 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative bg-white dark:bg-[#111F35] rounded-2xl p-3.5 sm:p-5 text-left shadow-[0_2px_10px_rgba(15,40,84,0.07)] hover:shadow-[0_10px_28px_rgba(15,40,84,0.14)] hover:-translate-y-0.5 transition-all border border-[#E4EBF6] dark:border-white/8 flex flex-col gap-1.5 sm:gap-2 overflow-hidden w-full"
    >
      {accentColor && <span className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: accentColor }} />}
      <p className="text-xs sm:text-sm text-gray-600 dark:text-[#8CA3C0] font-medium leading-tight truncate">{label}</p>
      <p className="text-xl sm:text-3xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] leading-none tracking-tight truncate">
        {value}
        {unit && <span className="text-xs sm:text-sm font-semibold text-gray-400 dark:text-[#7E93AF] ml-1 sm:ml-1.5 tracking-normal">{unit}</span>}
      </p>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-semibold mt-0.5 ${
          trendUp ? 'text-emerald-500' : trendDown ? 'text-red-400' : 'text-gray-400 dark:text-[#7E93AF]'
        }`}>
          {trendUp ? (
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          ) : trendDown ? (
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
              <polyline points="17 18 23 18 23 12"/>
            </svg>
          ) : (
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/></svg>
          )}
          <span className="truncate">{trendUp ? '+' : ''}{trend.toFixed(1)}% {vsLabel}</span>
        </div>
      )}
    </button>
  );
}

/* ── Quick stat row ── */
function QuickStat({ icon, label, sublabel, value, unit, onClick, border }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 sm:gap-3 p-3.5 sm:p-5 text-left hover:bg-[#F4F7FC] dark:hover:bg-white/5 transition-colors w-full min-w-0 ${border}`}
    >
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EEF3FB] dark:bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs tracking-[0.1em] sm:tracking-[0.12em] text-[#4988C4] font-semibold uppercase leading-tight truncate">{label}</p>
        {sublabel && <p className="text-[9px] sm:text-[10px] tracking-[0.08em] text-gray-400 dark:text-[#7E93AF] uppercase leading-tight mb-0.5 truncate">{sublabel}</p>}
        <p className="text-lg sm:text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] leading-tight mt-0.5 sm:mt-1 tracking-tight truncate">
          {value}
          {unit && <span className="text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-[#7E93AF] ml-1 tracking-normal">{unit}</span>}
        </p>
      </div>
    </button>
  );
}

/* ── Cumulative savings chart (Energy + Carbon) ── */
const ENERGY_COLOR = '#4988C4';
const CARBON_COLOR = '#0EA672';

// Round a max value up to a "nice" number so axis ticks land on clean steps.
function niceMax(value) {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}
function niceTicks(max) {
  return [0, max * 0.25, max * 0.5, max * 0.75, max];
}

// The chart's SVG viewBox is sized in near-1:1 units-to-pixels for whichever
// breakpoint it's rendered at — reusing the desktop's wide 740-unit viewBox
// on a narrow phone screen squashed all the axis/tooltip text down to ~5px.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

function smoothPath(pts) {
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function SavingsTrendChart({ series }) {
  const [grown, setGrown] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#28405F' : '#C8D8EE';
  const tooltipBg = isDark ? '#1C4D8D' : '#0F2854';
  useEffect(() => { const t = setTimeout(() => setGrown(true), 150); return () => clearTimeout(t); }, []);

  const months = series.map((s) => s.label);
  const ENERGY_Y_MAX = niceMax(Math.max(...series.map((s) => s.energy)));
  const CARBON_Y_MAX = niceMax(Math.max(...series.map((s) => s.carbon)));
  const ENERGY_Y_TICKS = niceTicks(ENERGY_Y_MAX);
  const CARBON_Y_TICKS = niceTicks(CARBON_Y_MAX);

  const W = isMobile ? 320 : 740; const H = isMobile ? 190 : 240;
  const padL = isMobile ? 42 : 70; const padR = isMobile ? 42 : 70;
  const padT = isMobile ? 14 : 18; const padB = isMobile ? 6 : 8;
  const axisFontSize = isMobile ? 10 : 11;
  const cW = W - padL - padR; const cH = H - padT - padB;

  const energyPts = series.map((d, i) => ({
    x: padL + (i / (series.length - 1)) * cW,
    y: padT + (1 - d.energy / ENERGY_Y_MAX) * cH,
    value: d.energy,
  }));
  const carbonPts = series.map((d, i) => ({
    x: padL + (i / (series.length - 1)) * cW,
    y: padT + (1 - d.carbon / CARBON_Y_MAX) * cH,
    value: d.carbon,
  }));

  const energyLine = smoothPath(energyPts);
  const carbonLine = smoothPath(carbonPts);
  const energyArea = `${energyLine} L ${energyPts[energyPts.length - 1].x},${padT + cH} L ${energyPts[0].x},${padT + cH} Z`;
  const carbonArea = `${carbonLine} L ${carbonPts[carbonPts.length - 1].x},${padT + cH} L ${carbonPts[0].x},${padT + cH} Z`;

  const fmtK = (v) => `${(v / 1000).toFixed(0)}K`;
  const fmtAxis = (v) => v === 0 ? '0' : v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: isMobile ? 190 : 260 }}>
        <defs>
          <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ENERGY_COLOR} stopOpacity="0.22" />
            <stop offset="90%" stopColor={ENERGY_COLOR} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CARBON_COLOR} stopOpacity="0.22" />
            <stop offset="90%" stopColor={CARBON_COLOR} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="savingsClip">
            <rect x={padL} y={padT - 8} width={cW} height={cH + 12} />
          </clipPath>
        </defs>

        {/* Grid + dual Y-axis labels (left: energy, right: carbon) */}
        {ENERGY_Y_TICKS.map((tick, i) => {
          const y = padT + (1 - tick / ENERGY_Y_MAX) * cH;
          return (
            <g key={tick}>
              <line x1={padL} y1={y} x2={W - padR} y2={y}
                stroke={gridColor} strokeWidth="1" strokeDasharray="4,4" />
              <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle"
                fontSize={axisFontSize} fill={ENERGY_COLOR}
                fontFamily="'Courier New', monospace">
                {fmtAxis(tick)}
              </text>
              <text x={W - padR + 8} y={y} textAnchor="start" dominantBaseline="middle"
                fontSize={axisFontSize} fill={CARBON_COLOR}
                fontFamily="'Courier New', monospace">
                {fmtAxis(CARBON_Y_TICKS[i])}
              </text>
            </g>
          );
        })}

        {/* Areas + lines */}
        <g clipPath="url(#savingsClip)" style={{ opacity: grown ? 1 : 0, transition: 'opacity 0.5s ease' }}>
          <path d={energyArea} fill="url(#energyGrad)" />
          <path d={carbonArea} fill="url(#carbonGrad)" />
          <path d={energyLine} fill="none" stroke={ENERGY_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <path d={carbonLine} fill="none" stroke={CARBON_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </g>

        {/* Hover regions + indicators */}
        {energyPts.map((pt, i) => {
          const slotW = cW / series.length;
          const cPt = carbonPts[i];
          const topY = Math.min(pt.y, cPt.y);
          return (
            <g key={i}>
              <rect x={pt.x - slotW / 2} y={padT} width={slotW} height={cH}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)} />
              {hoveredIdx === i && (
                <>
                  <line x1={pt.x} y1={padT} x2={pt.x} y2={padT + cH}
                    stroke="#94A9C4" strokeWidth="1" strokeDasharray="3,3" strokeOpacity="0.5" />
                  <circle cx={pt.x} cy={pt.y} r="4" fill="white" stroke={ENERGY_COLOR} strokeWidth="2" />
                  <circle cx={cPt.x} cy={cPt.y} r="4" fill="white" stroke={CARBON_COLOR} strokeWidth="2" />
                  <rect x={pt.x - 38} y={topY - 46} width={76} height={34} rx="5" fill={tooltipBg} />
                  <circle cx={pt.x - 28} cy={topY - 32} r="3" fill={ENERGY_COLOR} />
                  <text x={pt.x - 20} y={topY - 29} textAnchor="start" fontSize="10"
                    fill="white" fontFamily="'Courier New', monospace" fontWeight="bold">
                    {fmtK(pt.value)} kWh
                  </text>
                  <circle cx={pt.x - 28} cy={topY - 18} r="3" fill={CARBON_COLOR} />
                  <text x={pt.x - 20} y={topY - 15} textAnchor="start" fontSize="10"
                    fill="white" fontFamily="'Courier New', monospace" fontWeight="bold">
                    {fmtK(cPt.value)} kgCO₂e
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* X labels — mobile drops the Buddhist-year suffix (just the month
          abbreviation) since 6 full labels don't fit a phone-width row */}
      <div className="flex justify-between mt-1.5" style={{ paddingLeft: `${(padL / W * 100).toFixed(2)}%`, paddingRight: `${(padR / W * 100).toFixed(2)}%` }}>
        {months.map((label) => (
          <span key={label} className="text-[9px] lg:text-[11px] text-[#1C4D8D] dark:text-[#8CA3C0] font-mono">
            {isMobile ? label.split(' ')[0] : label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Donut chart ── */
const DONUT_COLORS = ['#0F2854', '#4988C4', '#BDE8F5', '#8CA3C0'];

function DonutChart({ segments: rawSegments, totalCount, measuresLabel }) {
  const [grown, setGrown] = useState(false);
  const { theme } = useTheme();
  const trackColor = theme === 'dark' ? '#28405F' : '#EEF3FB';
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  useEffect(() => { const timer = setTimeout(() => setGrown(true), 150); return () => clearTimeout(timer); }, []);
  const segments = rawSegments.reduce((acc, seg) => {
    const cumulative = acc.length ? acc[acc.length - 1].cumulative + acc[acc.length - 1].percent : 0;
    acc.push({ ...seg, cumulative });
    return acc;
  }, []);
  return (
    <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8 lg:gap-10">
      <div className="relative shrink-0 w-32 h-32 lg:w-40 lg:h-40">
        <svg viewBox="0 0 112 112" className="-rotate-90 w-full h-full">
          <circle cx="56" cy="56" r={radius} fill="none" stroke={trackColor} strokeWidth="14" />
          {segments.map((seg, i) => {
            const dash = ((grown ? seg.percent : 0) / 100) * circumference;
            const offset = -((seg.cumulative / 100) * circumference);
            return (
              <circle key={i} cx="56" cy="56" r={radius} fill="none"
                stroke={seg.color} strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                className="transition-all duration-700 ease-out" />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl lg:text-3xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] tracking-tight">
            {totalCount}
          </span>
          <span className="text-[10px] text-[#4988C4]/60 tracking-widest uppercase">{measuresLabel}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 lg:gap-4 w-full max-w-sm">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600 dark:text-[#8CA3C0] min-w-0 break-words text-sm">{seg.label}</span>
            <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] ml-auto shrink-0 text-sm">
              {seg.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Measure list ── */
// A saved measure has no dedicated workflow-status field, so the status pill
// is derived from the equipment's grade at the time the measure was recorded
// (grade3() in calculators.js): 'poor' equipment still needs the fix, 'ok'
// is underway, 'good' means the measure already brought it up to standard.
const GRADE_TO_MEASURE_STATUS = { poor: 'pending', ok: 'in-progress', good: 'done' };
const MEASURE_STATUS = {
  'done':        { labelKey: 'statusDone',       dot: 'bg-emerald-400', cls: 'text-emerald-600' },
  'in-progress': { labelKey: 'statusInProgress', dot: 'bg-[#4988C4]',   cls: 'text-[#4988C4]' },
  'pending':     { labelKey: 'statusPending',    dot: 'bg-amber-400',   cls: 'text-amber-600' },
};

/* ── Equipment alerts ── */
// Surfaced from each equipment item's most recent measure grade: 'poor' is
// still below standard (critical), 'ok' is worth a follow-up check soon.
const GRADE_TO_ALERT_STATUS = { poor: 'danger', ok: 'warning' };
const ALERT_STYLE = {
  danger:  { bar: 'bg-red-500',   badge: 'bg-red-50 text-red-500 border border-red-100',   dot: 'bg-red-500',   label: 'CRITICAL' },
  warning: { bar: 'bg-amber-400', badge: 'bg-amber-50 text-amber-600 border border-amber-100', dot: 'bg-amber-400', label: 'WARNING'  },
};

/* ── Category & grade styles ── */
const CATEGORY_STYLE = {
  chiller:    { badge: 'bg-sky-50 text-sky-600',      icon: SnowflakeIcon,  label: 'Chiller' },
  compressor: { badge: 'bg-violet-50 text-violet-600', icon: CompressorIcon, label: 'Compressor' },
  pump:       { badge: 'bg-cyan-50 text-cyan-600',     icon: SnowflakeIcon,  label: 'Pump' },
  boiler:     { badge: 'bg-orange-50 text-orange-600', icon: FlameIcon,      label: 'Boiler' },
  cooling:    { badge: 'bg-teal-50 text-teal-600',     icon: SnowflakeIcon,  label: 'Cooling Tower' },
  electrical: { badge: 'bg-yellow-50 text-yellow-600', icon: LightningIcon,  label: 'Electrical' },
};
const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function formatShortDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}
const GRADE_COLOR = { good: 'bg-emerald-50 text-emerald-600 border border-emerald-100', ok: 'bg-amber-50 text-amber-600 border border-amber-100', poor: 'bg-red-50 text-red-500 border border-red-100' };

/* ── Factory overview card (shown on Dashboard when "all factories" is selected) ── */
function FactoryOverviewCard({ row, onClick, t }) {
  const shownCats = row.categories.slice(0, 3);
  const extra = row.categories.length - shownCats.length;
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white dark:bg-[#111F35] rounded-2xl p-5 text-left shadow-[0_2px_10px_rgba(15,40,84,0.07)] hover:shadow-[0_10px_28px_rgba(15,40,84,0.14)] hover:-translate-y-0.5 transition-all border border-[#E4EBF6] dark:border-white/8"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
          <FactoryIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7] truncate">{row.name}</p>
          <p className="text-xs text-gray-400 dark:text-[#7E93AF]">{row.equipCount} {t.dashboard.equipmentTotalSuffix}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl bg-[#F4F7FC] dark:bg-white/5 px-2 py-2.5 text-center">
          <p className="text-[10px] text-gray-400 dark:text-[#7E93AF] mb-1 truncate">{t.dashboard.measuredCount}</p>
          <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{row.measuredCount}</p>
        </div>
        <div className="rounded-xl bg-[#F4F7FC] dark:bg-white/5 px-2 py-2.5 text-center">
          <p className="text-[10px] text-gray-400 dark:text-[#7E93AF] mb-1 truncate">{t.dashboard.totalMeasures}</p>
          <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{row.totalMeasures}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-2 py-2.5 text-center">
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mb-1 truncate">{t.dashboard.savingsMwh}</p>
          <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{Math.round(row.savingsMwh)}</p>
        </div>
      </div>

      {row.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shownCats.map((catKey) => {
            const cat = CATEGORY_STYLE[catKey];
            if (!cat) return null;
            const Icon = cat.icon;
            return (
              <span key={catKey} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${cat.badge}`}>
                <Icon className="w-3 h-3" />
                {cat.label}
              </span>
            );
          })}
          {extra > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-[#8CA3C0]">
              +{extra}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

/* ── Presentation mode ── */
// Full-screen, high-contrast layout for showing the dashboard on a projector
// or meeting-room display — bigger type, denser-but-clearer grid, no sidebar
// or nav chrome. Dark variants are wrapped in `dark` so the shared chart/donut
// components pick up their dark-mode text colors regardless of the site's
// actual theme toggle; the light variant relies on those components' normal
// light-mode classes instead. Colors are kept muted/desaturated (no pure
// saturated hues) so the page stays comfortable to look at for a long meeting.
const PRESENTATION_THEMES = [
  { key: 'navy',  swatch: '#4E6E99', base: '#0E1B2E', from: '#1B3350', dark: true },
  { key: 'paper', swatch: '#FFFFFF', base: '#F3F5F9', from: '#FFFFFF', dark: false },
];
const PRESENTATION_THEME_STORAGE_KEY = 'presentationTheme';

function PresentationStat({ label, value, unit, accentColor, c }) {
  return (
    <div className={`relative rounded-3xl p-6 xl:p-7 border overflow-hidden flex flex-col gap-2 ${c.panel}`}>
      {accentColor && <span className="absolute top-0 left-0 right-0 h-1" style={{ background: accentColor }} />}
      <p className={`text-sm xl:text-base font-semibold tracking-wide ${c.textSub}`}>{label}</p>
      <p className={`text-4xl xl:text-5xl font-extrabold leading-none tracking-tight whitespace-nowrap ${c.text}`}>
        {value}
        {unit && <span className={`text-base xl:text-lg font-semibold ml-2 tracking-normal ${c.textSub}`}>{unit}</span>}
      </p>
    </div>
  );
}

function PresentationView({
  t, dashboardStats, avgPaybackYears, savingsSeries, donutData, recentMeasures, equipmentAlerts,
  selectedFactory, onExit,
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  const [themeKey, setThemeKey] = useState(() => {
    const saved = localStorage.getItem(PRESENTATION_THEME_STORAGE_KEY);
    return PRESENTATION_THEMES.some((th) => th.key === saved) ? saved : 'navy';
  });
  const theme = PRESENTATION_THEMES.find((th) => th.key === themeKey) || PRESENTATION_THEMES[0];
  const setTheme = (key) => {
    setThemeKey(key);
    localStorage.setItem(PRESENTATION_THEME_STORAGE_KEY, key);
  };
  const isLight = !theme.dark;
  // Small set of style tokens so the page's own chrome (header, panels,
  // dividers) follows the picked theme — the shared chart/donut components
  // keep using their existing light/dark: classes via the `dark` wrapper below.
  const c = {
    text: isLight ? 'text-[#0F2854]' : 'text-white',
    textSub: isLight ? 'text-[#5B6B85]' : 'text-[#8CA3C0]',
    panel: isLight ? 'bg-white border-[#E4EBF6] shadow-[0_2px_14px_rgba(15,40,84,0.06)]' : 'bg-white/[0.05] border-white/10',
    pill: isLight ? 'bg-white border-[#E4EBF6] shadow-sm' : 'bg-white/[0.06] border-white/10',
    divide: isLight ? 'divide-[#EEF3FB]' : 'divide-white/8',
    rowBorder: isLight ? 'border-[#EEF3FB]' : 'border-white/8',
    exitBtn: isLight
      ? 'bg-[#0F2854]/[0.06] hover:bg-[#0F2854]/[0.1] text-[#0F2854] border-[#0F2854]/10'
      : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/10',
  };
  const ringColor = isLight ? '#0F2854' : '#FFFFFF';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onExit(); };
    const onFsChange = () => { if (!document.fullscreenElement) onExit(); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [onExit]);

  return (
    <div className={`${theme.dark ? 'dark' : ''} fixed inset-0 z-[100] overflow-y-auto`} style={{ backgroundColor: theme.base }}>
      <div
        className="min-h-full px-8 xl:px-14 py-7 xl:py-9 flex flex-col gap-6 xl:gap-7"
        style={{ backgroundImage: `radial-gradient(circle at top, ${theme.from}, ${theme.base} 65%)` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 flex-wrap gap-y-3">
          <div className="flex items-center gap-3.5">
            <img src={companyLogo} alt="Logo" className="w-11 h-11 xl:w-12 xl:h-12 object-contain drop-shadow" />
            <div>
              <div className={`text-lg xl:text-xl font-extrabold tracking-[0.2em] leading-tight ${c.text}`} style={{ fontFamily: "'Courier New', monospace" }}>
                ENGINSPECT
              </div>
              <div className={`text-xs xl:text-sm tracking-wide ${c.textSub}`}>{t.dashboard.presentationSubtitle}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 rounded-full pl-2.5 pr-2.5 py-2 border ${c.pill}`}>
              {PRESENTATION_THEMES.map((th) => {
                const selected = themeKey === th.key;
                return (
                  <button
                    key={th.key}
                    type="button"
                    title={t.dashboard.presentationThemeLabel}
                    onClick={() => setTheme(th.key)}
                    className={`w-5 h-5 rounded-full shrink-0 transition-transform ${selected ? 'scale-110' : 'hover:scale-110 opacity-80 hover:opacity-100'}`}
                    style={{
                      backgroundColor: th.swatch,
                      boxShadow: selected
                        ? `0 0 0 2px ${theme.base}, 0 0 0 4px ${ringColor}, inset 0 0 0 1px rgba(0,0,0,0.08)`
                        : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                    }}
                  />
                );
              })}
            </div>
            <div className={`flex items-center gap-1.5 rounded-full pl-3.5 pr-4 py-2 text-sm font-medium border ${c.pill} ${c.text}`}>
              <FactoryIcon className="w-3.5 h-3.5 text-[#4988C4] shrink-0" />
              {selectedFactory || t.dashboard.allFactoriesLabel}
            </div>
            <div className={`hidden sm:block text-xs xl:text-sm font-mono whitespace-nowrap ${c.textSub}`}>
              {t.dashboard.updatedAt} {formatShortDate(now.toISOString())} {now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button
              type="button"
              onClick={onExit}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-full border transition-colors ${c.exitBtn}`}
            >
              <CollapseIcon className="w-4 h-4" />
              {t.dashboard.exitPresentation}
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-5 shrink-0">
          <PresentationStat c={c} label={t.dashboard.statElectricity} value={dashboardStats.electricityMwh.toFixed(2)} unit={t.dashboard.statElectricityUnit} accentColor="#FACC15" />
          <PresentationStat c={c} label={t.dashboard.statHeat} value={dashboardStats.heatGj.toFixed(2)} unit={t.dashboard.statHeatUnit} accentColor="#FB923C" />
          <PresentationStat c={c} label={t.dashboard.statGhg} value={dashboardStats.ghgTonnes.toFixed(2)} unit={t.dashboard.statGhgUnit} accentColor="#4ADE80" />
          <PresentationStat c={c} label={t.dashboard.statCost} value={dashboardStats.costMillionBaht.toFixed(2)} unit={t.dashboard.statCostUnit} accentColor="#60A5FA" />
          <PresentationStat c={c} label={t.dashboard.avgPayback} value={avgPaybackYears.toFixed(1)} unit={t.dashboard.years} accentColor="#38BDF8" />
        </div>

        {/* Chart + donut */}
        <div className="grid xl:grid-cols-3 gap-5 xl:gap-6 flex-1 min-h-0">
          <div className={`xl:col-span-2 rounded-3xl border p-6 xl:p-7 flex flex-col min-h-[280px] ${c.panel}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-base xl:text-lg font-bold ${c.text}`}>{t.dashboard.cumulativeSavingsTrend}</p>
              <div className="flex items-center gap-3 text-xs xl:text-sm font-semibold">
                <span className={`flex items-center gap-1.5 ${c.text}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ENERGY_COLOR }} />
                  {t.dashboard.energyKwh}
                </span>
                <span className={`flex items-center gap-1.5 ${c.text}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CARBON_COLOR }} />
                  {t.dashboard.carbonKgco2e}
                </span>
              </div>
            </div>
            <div className="flex-1 flex items-center">
              <SavingsTrendChart series={savingsSeries} />
            </div>
          </div>
          <div className={`rounded-3xl border p-6 xl:p-7 flex flex-col min-h-[280px] ${c.panel}`}>
            <p className={`text-base xl:text-lg font-bold mb-2 ${c.text}`}>{t.dashboard.energyByMeasure}</p>
            <div className="flex-1 flex items-center">
              {donutData.totalCount > 0 ? (
                <DonutChart segments={donutData.segments} totalCount={donutData.totalCount} measuresLabel={t.dashboard.measuresWord} />
              ) : (
                <p className={`w-full text-center text-sm py-8 ${c.textSub}`}>{t.dashboard.noHistoryShort}</p>
              )}
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid xl:grid-cols-2 gap-5 xl:gap-6 shrink-0">
          <div className={`rounded-3xl border p-6 xl:p-7 ${c.panel}`}>
            <p className={`text-base xl:text-lg font-bold mb-3 ${c.text}`}>{t.dashboard.measureDetails}</p>
            {recentMeasures.length === 0 ? (
              <p className={`text-center text-sm py-4 ${c.textSub}`}>{t.dashboard.noHistoryShort}</p>
            ) : (
              <div className={`divide-y ${c.divide}`}>
                {recentMeasures.slice(0, 4).map((measure, i) => {
                  const st = MEASURE_STATUS[GRADE_TO_MEASURE_STATUS[measure.grade] || 'pending'];
                  return (
                    <div key={measure.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono text-[#4988C4]/60 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        <span className={`text-sm xl:text-base font-medium min-w-0 truncate ${c.text}`}>{t.measures.names[measure.measure] || measure.measure}</span>
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs xl:text-sm font-medium whitespace-nowrap shrink-0 ${st.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                        {t.dashboard[st.labelKey]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className={`rounded-3xl border p-6 xl:p-7 ${c.panel}`}>
            <p className={`text-base xl:text-lg font-bold mb-3 ${c.text}`}>{t.dashboard.equipmentNeedsAction}</p>
            {equipmentAlerts.length === 0 ? (
              <p className={`text-center text-sm py-4 ${c.textSub}`}>{t.dashboard.noHistoryShort}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {equipmentAlerts.slice(0, 4).map((item) => {
                  const s = ALERT_STYLE[item.status];
                  return (
                    <div key={item.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border relative overflow-hidden ${c.rowBorder}`}>
                      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${s.bar}`} />
                      <div className="min-w-0 flex-1 pl-1 flex items-center gap-2">
                        <p className={`text-sm xl:text-base font-bold font-mono ${c.text}`}>{item.name}</p>
                        <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full ${s.badge}`}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard ── */
function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLang();
  const isAdmin = getSession().role === 'admin';

  const { factories, selectedFactory, allowedFactories, factoryRecords = [] } = useFactory();

  const [presenting, setPresenting] = useState(false);
  const enterPresentation = () => {
    setPresenting(true);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };
  const exitPresentation = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setPresenting(false);
  };

  const [equipment, setEquipment] = useState([]);
  useEffect(() => { fetchAllEquipment().then(setEquipment).catch(() => setEquipment([])); }, []);

  const [measures, setMeasures] = useState([]);
  useEffect(() => { fetchAllMeasures().then(setMeasures).catch(() => setMeasures([])); }, []);

  const [history, setHistory] = useState([]);
  useEffect(() => { fetchAllHistory().then(setHistory).catch(() => setHistory([])); }, []);

  const [defaultOperatingHours, setDefaultOperatingHours] = useState('8000');
  useEffect(() => { fetchSettings().then((s) => setDefaultOperatingHours(s.defaultOperatingHours)).catch(() => {}); }, []);

  const equipmentCountByFactory = useMemo(() => {
    const counts = new Map();
    equipment.forEach((e) => counts.set(e.factory, (counts.get(e.factory) || 0) + 1));
    return counts;
  }, [equipment]);

  const factoryOverviewRows = useMemo(() => {
    return factories.map((name) => {
      const stats = computeFactoryStats(name, equipment, measures, history, defaultOperatingHours);
      const measuredIds = new Set(
        history
          .filter((h) => (h.item || h.equipment || {}).factory === name)
          .map((h) => (h.item || h.equipment || {}).id)
          .filter(Boolean)
      );
      const categories = [...new Set(equipment.filter((e) => e.factory === name).map((e) => e.category))];
      return {
        name,
        equipCount: stats.equipCount,
        measuredCount: measuredIds.size,
        totalMeasures: measures.filter((m) => m.factory === name).length,
        savingsMwh: stats.energyKWhYear / 1000,
        categories,
      };
    });
  }, [factories, equipment, measures, history, defaultOperatingHours]);

  const [measureStatusFilter, setMeasureStatusFilter] = useState('all'); // 'all' | 'potential' | 'implemented'

  const factoryScopedMeasures = useMemo(
    () => measures.filter((m) => matchesFactory(m.factory, selectedFactory, allowedFactories)),
    [measures, selectedFactory, allowedFactories],
  );

  const potentialCount = useMemo(
    () => factoryScopedMeasures.filter((m) => m.status === 'ศักยภาพ' || (!m.isImplemented && m.status !== 'ดำเนินการจริง')).length,
    [factoryScopedMeasures],
  );

  const implementedCount = useMemo(
    () => factoryScopedMeasures.filter((m) => m.status === 'ดำเนินการจริง' || m.isImplemented === true).length,
    [factoryScopedMeasures],
  );

  const scopedMeasures = useMemo(() => {
    return factoryScopedMeasures.filter((m) => {
      if (measureStatusFilter === 'potential') {
        return m.status === 'ศักยภาพ' || (!m.isImplemented && m.status !== 'ดำเนินการจริง');
      }
      if (measureStatusFilter === 'implemented') {
        return m.status === 'ดำเนินการจริง' || m.isImplemented === true;
      }
      return true;
    });
  }, [factoryScopedMeasures, measureStatusFilter]);

  // Headline dashboard numbers, aggregated from every scoped measure's
  // evalData (kept generic across categories: boiler measures represent
  // thermal/fuel kWh — everything else represents electrical kWh).
  const dashboardStats = useMemo(() => {
    const scoped = scopedMeasures;

    const sumFor = (list) => list.reduce((acc, m) => {
      const energySaved = parseFloat(m.evalData?.energySaved || 0);
      const costSaved = parseFloat(m.evalData?.costSaved || 0);
      const ghgSaved = parseFloat(m.evalData?.ghgSaved || 0);
      if (m.category === 'boiler') acc.heatKwh += energySaved;
      else acc.electricityKwh += energySaved;
      acc.costBaht += costSaved;
      acc.ghgTonnes += ghgSaved;
      return acc;
    }, { electricityKwh: 0, heatKwh: 0, ghgTonnes: 0, costBaht: 0 });

    const now = new Date();
    const inMonth = (list, year, month) => list.filter((m) => {
      const d = new Date(m.savedAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const totals = sumFor(scoped);
    const thisMonthTotals = sumFor(inMonth(scoped, now.getFullYear(), now.getMonth()));
    const lastMonthTotals = sumFor(inMonth(scoped, lastMonthDate.getFullYear(), lastMonthDate.getMonth()));

    const pctChange = (curr, prev) => {
      if (prev > 0) return ((curr - prev) / prev) * 100;
      return curr > 0 ? 100 : 0;
    };

    return {
      electricityMwh: totals.electricityKwh / 1000,
      heatGj: totals.heatKwh * 0.0036,
      ghgTonnes: totals.ghgTonnes,
      costMillionBaht: totals.costBaht / 1_000_000,
      trendElectricity: pctChange(thisMonthTotals.electricityKwh, lastMonthTotals.electricityKwh),
      trendHeat: pctChange(thisMonthTotals.heatKwh, lastMonthTotals.heatKwh),
      trendGhg: pctChange(thisMonthTotals.ghgTonnes, lastMonthTotals.ghgTonnes),
      trendCost: pctChange(thisMonthTotals.costBaht, lastMonthTotals.costBaht),
    };
  }, [scopedMeasures]);

  // Cumulative energy (kWh) + carbon (kgCO2e) saved, running total over the
  // last 6 calendar months — same energySaved/ghgSaved fields as dashboardStats.
  const savingsSeries = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
    }
    let cumEnergy = 0;
    let cumCarbon = 0;
    return months.map((d) => {
      const inMonth = scopedMeasures.filter((m) => {
        const md = new Date(m.savedAt);
        return md.getFullYear() === d.getFullYear() && md.getMonth() === d.getMonth();
      });
      cumEnergy += inMonth.reduce((s, m) => s + parseFloat(m.evalData?.energySaved || 0), 0);
      cumCarbon += inMonth.reduce((s, m) => s + parseFloat(m.evalData?.ghgSaved || 0) * 1000, 0);
      const buddhistYear = String(d.getFullYear() + 543).slice(-2);
      return { label: `${THAI_MONTHS_SHORT[d.getMonth()]} ${buddhistYear}`, energy: cumEnergy, carbon: cumCarbon };
    });
  }, [scopedMeasures]);

  // Donut: share of total GHG reduction per measure type, top 3 + "other" bucket.
  const donutData = useMemo(() => {
    const totals = new Map();
    scopedMeasures.forEach((m) => {
      const key = m.measure || '-';
      totals.set(key, (totals.get(key) || 0) + parseFloat(m.evalData?.ghgSaved || 0));
    });
    const grandTotal = [...totals.values()].reduce((a, b) => a + b, 0);
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 3);
    const restTotal = sorted.slice(3).reduce((sum, [, v]) => sum + v, 0);
    const rows = restTotal > 0 ? [...top, [t.dashboard.otherMeasures, restTotal]] : top;
    const segments = rows.map(([name, v], i) => ({
      label: t.measures.names[name] || name,
      percent: grandTotal > 0 ? Math.round((v / grandTotal) * 100) : 0,
      color: DONUT_COLORS[Math.min(i, DONUT_COLORS.length - 1)],
    }));
    return { segments, totalCount: scopedMeasures.length };
  }, [scopedMeasures, t]);

  const avgPaybackYears = useMemo(() => {
    const paybacks = scopedMeasures
      .map((m) => parseFloat(m.evalData?.payback))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (paybacks.length === 0) return 0;
    return paybacks.reduce((a, b) => a + b, 0) / paybacks.length;
  }, [scopedMeasures]);

  const recentMeasures = useMemo(() => (
    [...scopedMeasures].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).slice(0, 5)
  ), [scopedMeasures]);

  // One alert per equipment, from its most recently saved measure's grade.
  const equipmentAlerts = useMemo(() => {
    const latestByEquipment = new Map();
    scopedMeasures.forEach((m) => {
      if (!m.equipmentId) return;
      const existing = latestByEquipment.get(m.equipmentId);
      if (!existing || new Date(m.savedAt) > new Date(existing.savedAt)) {
        latestByEquipment.set(m.equipmentId, m);
      }
    });
    return [...latestByEquipment.values()]
      .filter((m) => GRADE_TO_ALERT_STATUS[m.grade])
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
      .slice(0, 5)
      .map((m) => ({ name: m.equipmentId, status: GRADE_TO_ALERT_STATUS[m.grade] }));
  }, [scopedMeasures]);

  const recentHistory = useMemo(() => {
    const scoped = history.filter((r) => matchesFactory((r.item || r.equipment || {}).factory, selectedFactory, allowedFactories));
    return [...scoped].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).slice(0, 5);
  }, [history, selectedFactory, allowedFactories]);

  if (presenting) {
    return (
      <PresentationView
        t={t}
        dashboardStats={dashboardStats}
        avgPaybackYears={avgPaybackYears}
        savingsSeries={savingsSeries}
        donutData={donutData}
        recentMeasures={recentMeasures}
        equipmentAlerts={equipmentAlerts}
        selectedFactory={selectedFactory}
        onExit={exitPresentation}
      />
    );
  }

  return (
    <AppLayout
      factoryRowBelowTitle
      factoryBeforeRole
      hideRoleBadgeMobile
      roleBadgeByAvatar
      beforeFactorySlot={
        <div className="hidden lg:flex items-center gap-1.5 p-1 bg-white dark:bg-[#111F35] rounded-full border border-[#E4EBF6] dark:border-white/10 shadow-sm">
          <button
            type="button"
            onClick={() => setMeasureStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              measureStatusFilter === 'all'
                ? 'bg-[#0F2854] text-white shadow-sm'
                : 'text-gray-600 dark:text-[#8CA3C0] hover:text-[#0F2854]'
            }`}
          >
            มาตรการทั้งหมด ({factoryScopedMeasures.length})
          </button>
          <button
            type="button"
            onClick={() => setMeasureStatusFilter('potential')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              measureStatusFilter === 'potential'
                ? 'bg-blue-100 text-blue-800 shadow-sm'
                : 'text-gray-600 dark:text-[#8CA3C0] hover:text-blue-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            ศักยภาพ ({potentialCount})
          </button>
          <button
            type="button"
            onClick={() => setMeasureStatusFilter('implemented')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              measureStatusFilter === 'implemented'
                ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                : 'text-gray-600 dark:text-[#8CA3C0] hover:text-emerald-600'
            }`}
          >
            <CheckIcon className="w-3.5 h-3.5" />
            ดำเนินการจริง ({implementedCount})
          </button>
        </div>
      }
      actions={
        <button
          type="button"
          onClick={enterPresentation}
          className="flex items-center gap-2 bg-[#0F2854] hover:bg-[#1C4D8D] dark:bg-white/10 dark:hover:bg-white/15 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm transition-colors shrink-0"
        >
          <ExpandIcon className="w-4 h-4" />
          {t.dashboard.presentationMode}
        </button>
      }
      title={
        <>
          <span className="flex lg:hidden items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-[#4988C4]" />
            Dashboard
          </span>
          <span className="hidden lg:flex flex-col gap-1">
            <span className="inline-flex items-center gap-3">
              <span className="w-2 h-8 rounded-full bg-[#4988C4]" />
              Dashboard
            </span>
            <span className="text-sm font-medium text-[#0F2854]/60 dark:text-[#7E93AF] pl-5 tracking-wide">
              {t.dashboard.subtitle}
            </span>
          </span>
        </>
      }
    >
      {selectedFactory && (
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => navigate(`/factories/${encodeURIComponent(selectedFactory)}`)}
            className="flex items-center gap-1 text-xs font-bold text-[#4988C4] hover:text-[#0F2854] dark:text-[#E7EEF7] transition-colors shrink-0"
          >
            รายละเอียดโรงงาน
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selected Factory Info Card */}
      {selectedFactory && (
        <Panel className="p-4 mb-4 bg-gradient-to-r from-[#0F2854] to-[#1C4D8D] text-white rounded-3xl shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0">
                <FactoryIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-extrabold text-white">{selectedFactory}</p>
                <p className="text-xs text-white/70">
                  {getFactoryMeta(selectedFactory, factoryRecords).province || 'ประเทศไทย'} · อุปกรณ์ลงทะเบียน {equipmentCountByFactory.get(selectedFactory) || 0} เครื่อง
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs border-t sm:border-t-0 sm:border-l border-white/15 pt-2 sm:pt-0 sm:pl-4">
              <div>
                <span className="text-white/60 block text-[11px]">มาตรการดำเนินการ</span>
                <span className="font-extrabold text-white text-sm">{scopedMeasures.length} รายการ</span>
              </div>
              <div>
                <span className="text-white/60 block text-[11px]">ผลประหยัดรวม</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {scopedMeasures.reduce((s, m) => s + parseFloat(m.evalData?.energySaved || 0), 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })} kWh
                </span>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Quick Measure Status Filter: Mobile Only (Desktop version moved to actions prop) */}
      <div className="flex lg:hidden items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#111F35] rounded-full border border-[#E4EBF6] dark:border-white/10 shadow-sm w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setMeasureStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              measureStatusFilter === 'all'
                ? 'bg-[#0F2854] text-white shadow-sm'
                : 'text-gray-600 dark:text-[#8CA3C0] hover:text-[#0F2854]'
            }`}
          >
            มาตรการทั้งหมด ({factoryScopedMeasures.length})
          </button>
          <button
            type="button"
            onClick={() => setMeasureStatusFilter('potential')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              measureStatusFilter === 'potential'
                ? 'bg-blue-100 text-blue-800 shadow-sm'
                : 'text-gray-600 dark:text-[#8CA3C0] hover:text-blue-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            ศักยภาพ ({potentialCount})
          </button>
          <button
            type="button"
            onClick={() => setMeasureStatusFilter('implemented')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              measureStatusFilter === 'implemented'
                ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                : 'text-gray-600 dark:text-[#8CA3C0] hover:text-emerald-600'
            }`}
          >
            <CheckIcon className="w-3.5 h-3.5" />
            ดำเนินการจริง ({implementedCount})
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label={t.dashboard.statElectricity}
          value={dashboardStats.electricityMwh.toFixed(2)}
          unit={t.dashboard.statElectricityUnit}
          trend={dashboardStats.trendElectricity}
          accentColor="#FACC15"
          onClick={() => navigate('/reports')}
          vsLabel={t.dashboard.vsLastMonth}
        />
        <StatCard
          label={t.dashboard.statHeat}
          value={dashboardStats.heatGj.toFixed(2)}
          unit={t.dashboard.statHeatUnit}
          trend={dashboardStats.trendHeat}
          accentColor="#FB923C"
          onClick={() => navigate('/reports')}
          vsLabel={t.dashboard.vsLastMonth}
        />
        <StatCard
          label={t.dashboard.statGhg}
          value={dashboardStats.ghgTonnes.toFixed(2)}
          unit={t.dashboard.statGhgUnit}
          trend={dashboardStats.trendGhg}
          accentColor="#4ADE80"
          onClick={() => navigate('/reports')}
          vsLabel={t.dashboard.vsLastMonth}
        />
        <StatCard
          label={t.dashboard.statCost}
          value={dashboardStats.costMillionBaht.toFixed(2)}
          unit={t.dashboard.statCostUnit}
          trend={dashboardStats.trendCost}
          accentColor="#60A5FA"
          onClick={() => navigate('/reports')}
          vsLabel={t.dashboard.vsLastMonth}
        />
      </div>

      {/* Quick stats */}
      <Panel className="grid grid-cols-2 divide-x divide-[#EEF3FB] overflow-hidden mb-5">
        <QuickStat
          icon={<ClipboardIcon className="w-5 h-5 text-[#0F2854] dark:text-[#E7EEF7]" />}
          label={t.dashboard.measuresInProgress}
          value={String(scopedMeasures.length).padStart(2, '0')}
          unit={t.common.items}
          onClick={() => navigate('/equipment')}
          border="rounded-l-2xl"
        />
        <QuickStat
          icon={<ClockIcon className="w-5 h-5 text-[#0F2854] dark:text-[#E7EEF7]" />}
          label={t.dashboard.avgPayback}
          value={avgPaybackYears.toFixed(1)}
          unit={t.dashboard.years}
          onClick={() => navigate('/history')}
          border="rounded-r-2xl"
        />
      </Panel>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Panel className="lg:col-span-2 pt-5 pb-4 flex flex-col">
          <div className="px-5">
            {/* Desktop: title, unit tag, and legend all fit on one row */}
            <div className="hidden lg:block">
              <SectionHeader
                title={t.dashboard.cumulativeSavingsTrend}
                tag="kWh & kgCO₂e"
                right={
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-[#0F2854] dark:text-[#E7EEF7]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ENERGY_COLOR }} />
                      {t.dashboard.energyKwh}
                    </span>
                    <span className="flex items-center gap-1.5 text-[#0F2854] dark:text-[#E7EEF7]">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CARBON_COLOR }} />
                      {t.dashboard.carbonKgco2e}
                    </span>
                  </div>
                }
              />
            </div>
            {/* Mobile: title alone, legend on its own row below (no room for all 3 on one line) */}
            <div className="lg:hidden">
              <SectionHeader title={t.dashboard.cumulativeSavingsTrend} />
              <div className="flex items-center gap-3 text-[11px] font-semibold -mt-2.5 mb-3.5">
                <span className="flex items-center gap-1.5 text-[#0F2854] dark:text-[#E7EEF7]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ENERGY_COLOR }} />
                  {t.dashboard.energyKwh}
                </span>
                <span className="flex items-center gap-1.5 text-[#0F2854] dark:text-[#E7EEF7]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CARBON_COLOR }} />
                  {t.dashboard.carbonKgco2e}
                </span>
              </div>
            </div>
          </div>
          <SavingsTrendChart series={savingsSeries} />
        </Panel>
        <Panel className="p-5 flex flex-col">
          <SectionHeader title={t.dashboard.energyByMeasure} tag="GHG %" />
          <div className="flex-1 flex items-center">
            {donutData.totalCount > 0 ? (
              <DonutChart segments={donutData.segments} totalCount={donutData.totalCount} measuresLabel={t.dashboard.measuresWord} />
            ) : (
              <p className="w-full text-center text-sm text-gray-400 dark:text-[#7E93AF] py-8">{t.dashboard.noHistoryShort}</p>
            )}
          </div>
        </Panel>
      </div>

      {/* Measures */}
      <Panel className="p-5 mb-5">
        <SectionHeader
          title={t.dashboard.measureDetails}
          right={
            <span className="text-[10px] font-mono font-bold text-[#4988C4] bg-[#EEF3FB] dark:bg-white/5 px-2 py-0.5 rounded-full">
              {recentMeasures.length} {t.common.items}
            </span>
          }
        />
        {recentMeasures.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-[#7E93AF] py-8">{t.dashboard.noHistoryShort}</p>
        ) : (
          <div className="divide-y divide-[#F0F4FB] dark:divide-white/8">
            {recentMeasures.map((measure, i) => {
              const st = MEASURE_STATUS[GRADE_TO_MEASURE_STATUS[measure.grade] || 'pending'];
              return (
                <button key={measure.id} type="button" onClick={() => navigate('/history')}
                  className="w-full flex items-center justify-between gap-3 text-left px-2 py-3.5 rounded-lg hover:bg-[#F4F7FC] dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-mono text-[#4988C4]/50 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-[#C3D2E5] min-w-0 break-words">{t.measures.names[measure.measure] || measure.measure}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${st.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                      {t.dashboard[st.labelKey]}
                    </span>
                    <ChevronDownIcon className="w-4 h-4 text-gray-300 dark:text-white/20 -rotate-90" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Alerts */}
      <Panel className="p-5 mb-5">
        <SectionHeader
          title={t.dashboard.equipmentNeedsAction}
          right={
            <span className="text-[10px] font-mono font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              {equipmentAlerts.length} {t.common.items}
            </span>
          }
        />
        {equipmentAlerts.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-[#7E93AF] py-8">{t.dashboard.noHistoryShort}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {equipmentAlerts.map((item) => {
              const s = ALERT_STYLE[item.status];
              return (
                <button key={item.name} type="button" onClick={() => navigate('/equipment')}
                  className="w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl hover:bg-[#F4F7FC] dark:hover:bg-white/5 transition-colors border border-[#F0F4FB] dark:border-white/8 relative overflow-hidden">
                  <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${s.bar}`} />
                  <div className="min-w-0 flex-1 pl-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] font-mono">{item.name}</p>
                      <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full ${s.badge}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-[#8CA3C0]">
                      {t.dashboard[item.status === 'danger' ? 'alertLowEfficiency' : 'alertCheckSoon']}
                    </p>
                  </div>
                  <ChevronDownIcon className="w-4 h-4 text-gray-300 dark:text-white/20 -rotate-90 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Factory overview — only when viewing all factories at once */}
      {!selectedFactory && factoryOverviewRows.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FactoryIcon className="w-5 h-5 text-[#4988C4]" />
              <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.dashboard.factoryOverview}</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/factories')}
                className="flex items-center gap-1 text-xs font-semibold text-[#4988C4] hover:text-[#0F2854] dark:text-[#E7EEF7] transition-colors"
              >
                {t.dashboard.manageFactories}
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {factoryOverviewRows.map((row) => (
              <FactoryOverviewCard
                key={row.name}
                row={row}
                t={t}
                onClick={() => navigate(`/factories/${encodeURIComponent(row.name)}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent history */}
      <Panel className="p-5">
        <SectionHeader title={t.dashboard.recentMeasurements} tag="RECENT LOGS" />

        {/* Desktop: table */}
        <table className="hidden lg:table w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 dark:text-[#7E93AF] border-b border-[#EEF3FB] dark:border-white/8">
              <th className="py-2.5 px-3 font-medium">{t.dashboard.colDate}</th>
              <th className="py-2.5 px-3 font-medium">{t.dashboard.colEquipment}</th>
              <th className="py-2.5 px-3 font-medium">{t.dashboard.colCategory}</th>
              <th className="py-2.5 px-3 font-medium">{t.dashboard.colResult}</th>
              <th className="py-2.5 px-3 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F4FB] dark:divide-white/8">
            {recentHistory.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-[#4988C4]/40 font-mono tracking-widest uppercase">
                  {t.dashboard.noHistoryLong}
                </td>
              </tr>
            ) : recentHistory.map((record) => {
              const eq = record.item || record.equipment || {};
              const cat = CATEGORY_STYLE[eq.category] || { badge: 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#8CA3C0]', icon: SnowflakeIcon, label: eq.category || '-' };
              const CatIcon = cat.icon;
              const gradeCls = GRADE_COLOR[record.result?.grade] || 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#8CA3C0]';
              const gradeText = t.common.grade[record.result?.grade] || '-';
              return (
                <tr key={record.id} className="hover:bg-[#F4F7FC] dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-[#4988C4]/60 text-xs font-mono">{formatShortDate(record.savedAt)}</td>
                  <td className="py-3 px-3 font-bold text-[#0F2854] dark:text-[#E7EEF7] font-mono">{eq.id || '-'}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.badge}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                      {cat.label}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${gradeCls}`}>{gradeText}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-end">
                      <button type="button" onClick={() => navigate('/history')}
                        className="w-8 h-8 rounded-lg bg-[#EEF3FB] dark:bg-white/5 hover:bg-[#dde8f5] dark:hover:bg-white/10 flex items-center justify-center text-[#4988C4] transition-colors">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Mobile: card list */}
        <div className="lg:hidden divide-y divide-[#F0F4FB] dark:divide-white/8">
          {recentHistory.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#4988C4]/40 font-mono tracking-widest uppercase">
              {t.dashboard.noHistoryShort}
            </p>
          ) : recentHistory.map((record) => {
            const eq = record.item || record.equipment || {};
            const cat = CATEGORY_STYLE[eq.category] || { badge: 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#8CA3C0]', icon: SnowflakeIcon, label: eq.category || '-' };
            const CatIcon = cat.icon;
            const gradeCls = GRADE_COLOR[record.result?.grade] || 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#8CA3C0]';
            const gradeText = t.common.grade[record.result?.grade] || '-';
            return (
              <button key={record.id} type="button" onClick={() => navigate('/history')}
                className="w-full text-left px-1 py-3.5 rounded-lg hover:bg-[#F4F7FC] dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] font-mono">{eq.id || '-'}</span>
                  <span className="text-[10px] text-[#4988C4]/50 font-mono">{formatShortDate(record.savedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cat.badge}`}>
                    <CatIcon className="w-3.5 h-3.5" />
                    {cat.label}
                  </span>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${gradeCls}`}>{gradeText}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>
    </AppLayout>
  );
}

export default Dashboard;