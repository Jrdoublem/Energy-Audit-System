import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { matchesFactory, useFactory } from '../context/factoryStore.js';
import { useTheme } from '../context/themeStore.js';
import { useLang } from '../context/languageStore.js';
import { Panel, SectionHeader } from '../components/ui';
import {
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  CompressorIcon,
  EyeIcon,
  FlameIcon,
  LightningIcon,
  SnowflakeIcon,
} from '../components/icons';

/* ── Stat card ── */
function StatCard({ label, value, onClick, trend, accentColor, vsLabel }) {
  const trendUp = trend && trend > 0;
  const trendDown = trend && trend < 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative bg-white dark:bg-[#111F35] rounded-2xl p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all border border-[#EEF3FB] dark:border-white/8 flex flex-col gap-1.5 overflow-hidden"
    >
      {accentColor && <span className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: accentColor }} />}
      <p className="text-sm text-gray-600 dark:text-[#8CA3C0] font-medium leading-tight">{label}</p>
      <p className="text-3xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] leading-none" style={{ fontFamily: "'Courier New', monospace" }}>
        {value}
      </p>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-sm font-semibold mt-0.5 ${
          trendUp ? 'text-emerald-500' : trendDown ? 'text-red-400' : 'text-gray-400 dark:text-[#7E93AF]'
        }`}>
          {trendUp ? (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          ) : trendDown ? (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
              <polyline points="17 18 23 18 23 12"/>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/></svg>
          )}
          <span>{trendUp ? '+' : ''}{trend.toFixed(1)}% {vsLabel}</span>
        </div>
      )}
    </button>
  );
}

/* ── Quick stat row ── */
function QuickStat({ icon, label, sublabel, value, onClick, border }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 p-5 text-left hover:bg-[#F4F7FC] dark:hover:bg-white/5 transition-colors ${border}`}
    >
      <div className="w-10 h-10 rounded-xl bg-[#EEF3FB] dark:bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs tracking-[0.12em] text-[#4988C4] font-semibold uppercase leading-tight">{label}</p>
        {sublabel && <p className="text-[10px] tracking-[0.08em] text-gray-400 dark:text-[#7E93AF] uppercase leading-tight mb-1">{sublabel}</p>}
        <p className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] leading-tight mt-1" style={{ fontFamily: "'Courier New', monospace" }}>
          {value}
        </p>
      </div>
    </button>
  );
}

/* ── Cumulative savings chart (Energy + Carbon) ── */
// Mock cumulative series shaped like real 'measures' data would look once
// aggregated — swap for a real per-month rollup of localStorage('measures')
// (or a backend endpoint) when that aggregation exists.
const SAVINGS_SERIES = [
  { energy: 110000, carbon: 60000 },
  { energy: 230000, carbon: 140000 },
  { energy: 520000, carbon: 340000 },
  { energy: 860000, carbon: 640000 },
  { energy: 890000, carbon: 600000 },
  { energy: 1180000, carbon: 780000 },
];
const ENERGY_Y_MAX = 1200000;
const ENERGY_Y_TICKS = [0, 300000, 600000, 900000, 1200000];
const CARBON_Y_MAX = 800000;
const CARBON_Y_TICKS = [0, 200000, 400000, 600000, 800000];
const ENERGY_COLOR = '#4988C4';
const CARBON_COLOR = '#0EA672';

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

function SavingsTrendChart({ months }) {
  const [grown, setGrown] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#28405F' : '#C8D8EE';
  const tooltipBg = isDark ? '#1C4D8D' : '#0F2854';
  useEffect(() => { const t = setTimeout(() => setGrown(true), 150); return () => clearTimeout(t); }, []);

  const W = 740; const H = 240;
  const padL = 70; const padR = 70; const padT = 18; const padB = 8;
  const cW = W - padL - padR; const cH = H - padT - padB;

  const energyPts = SAVINGS_SERIES.map((d, i) => ({
    x: padL + (i / (SAVINGS_SERIES.length - 1)) * cW,
    y: padT + (1 - d.energy / ENERGY_Y_MAX) * cH,
    value: d.energy,
  }));
  const carbonPts = SAVINGS_SERIES.map((d, i) => ({
    x: padL + (i / (SAVINGS_SERIES.length - 1)) * cW,
    y: padT + (1 - d.carbon / CARBON_Y_MAX) * cH,
    value: d.carbon,
  }));

  const energyLine = smoothPath(energyPts);
  const carbonLine = smoothPath(carbonPts);
  const energyArea = `${energyLine} L ${energyPts[energyPts.length - 1].x},${padT + cH} L ${energyPts[0].x},${padT + cH} Z`;
  const carbonArea = `${carbonLine} L ${carbonPts[carbonPts.length - 1].x},${padT + cH} L ${carbonPts[0].x},${padT + cH} Z`;

  const fmtK = (v) => `${(v / 1000).toFixed(0)}K`;
  const fmtAxis = (v) => v === 0 ? '0' : v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}K`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height: 260 }}>
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
                fontSize="11" fill={ENERGY_COLOR}
                fontFamily="'Courier New', monospace">
                {fmtAxis(tick)}
              </text>
              <text x={W - padR + 8} y={y} textAnchor="start" dominantBaseline="middle"
                fontSize="11" fill={CARBON_COLOR}
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
          const slotW = cW / SAVINGS_SERIES.length;
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

      {/* X labels */}
      <div className="flex justify-between mt-1.5" style={{ paddingLeft: `${(padL / W * 100).toFixed(2)}%`, paddingRight: `${(padR / W * 100).toFixed(2)}%` }}>
        {months.map((label) => (
          <span key={label} className="text-[11px] text-[#1C4D8D] dark:text-[#8CA3C0] font-mono">{label}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Donut chart ── */
const DONUT_SEGMENTS = [
  { percent: 45, color: '#0F2854' },
  { percent: 35, color: '#4988C4' },
  { percent: 20, color: '#BDE8F5' },
];

function DonutChart({ labels, measuresLabel }) {
  const [grown, setGrown] = useState(false);
  const { theme } = useTheme();
  const trackColor = theme === 'dark' ? '#28405F' : '#EEF3FB';
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  useEffect(() => { const timer = setTimeout(() => setGrown(true), 150); return () => clearTimeout(timer); }, []);
  const segments = DONUT_SEGMENTS.map((seg, i) => ({ ...seg, label: labels[i] })).reduce((acc, seg) => {
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
          <span className="text-2xl lg:text-3xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]" style={{ fontFamily: "'Courier New', monospace" }}>
            {DONUT_SEGMENTS.length}
          </span>
          <span className="text-[10px] text-[#4988C4]/60 tracking-widest uppercase">{measuresLabel}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 lg:gap-4 w-full max-w-sm">
        {DONUT_SEGMENTS.map((seg, i) => (
          <div key={i} className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-gray-600 dark:text-[#8CA3C0] min-w-0 break-words text-sm">{seg.label}</span>
            <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] ml-auto shrink-0 text-sm" style={{ fontFamily: "'Courier New', monospace" }}>
              {seg.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Measure list ── */
const MOCK_MEASURES = [
  { labelKey: 'measure1', status: 'done' },
  { labelKey: 'measure2', status: 'in-progress' },
  { labelKey: 'measure3', status: 'pending' },
];
const MEASURE_STATUS = {
  'done':        { labelKey: 'statusDone',       dot: 'bg-emerald-400', cls: 'text-emerald-600' },
  'in-progress': { labelKey: 'statusInProgress', dot: 'bg-[#4988C4]',   cls: 'text-[#4988C4]' },
  'pending':     { labelKey: 'statusPending',    dot: 'bg-amber-400',   cls: 'text-amber-600' },
};

/* ── Equipment alerts ── */
const EQUIPMENT_ALERTS = [
  { name: 'CH-01', issueKey: 'alertLowEfficiency', status: 'danger' },
  { name: 'CH-02', issueKey: 'alertCheckSoon', status: 'warning' },
];
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

/* ── Dashboard ── */
function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLang();

  const { selectedFactory, allowedFactories } = useFactory();

  const recentHistory = useMemo(() => {
    try {
      const all = JSON.parse(localStorage.getItem('history') || '[]');
      const scoped = all.filter((r) => matchesFactory((r.item || r.equipment || {}).factory, selectedFactory, allowedFactories));
      return scoped.slice(0, 5);
    } catch { return []; }
  }, [selectedFactory, allowedFactories]);

  return (
    <AppLayout
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
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label={t.dashboard.statElectricity}
          value="00.00"
          trend={12.3}
          accentColor="#FACC15"
          onClick={() => navigate('/reports')}
          vsLabel={t.dashboard.vsLastMonth}
        />
        <StatCard
          label={t.dashboard.statHeat}
          value="00.00"
          trend={-5.1}
          accentColor="#FB923C"
          onClick={() => navigate('/reports')}
          vsLabel={t.dashboard.vsLastMonth}
        />
        <StatCard
          label={t.dashboard.statGhg}
          value="00.00"
          trend={8.7}
          accentColor="#4ADE80"
          onClick={() => navigate('/reports')}
          vsLabel={t.dashboard.vsLastMonth}
        />
        <StatCard
          label={t.dashboard.statCost}
          value="00.00"
          trend={0}
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
          value={`03 ${t.common.items}`}
          onClick={() => navigate('/equipment')}
          border="rounded-l-2xl"
        />
        <QuickStat
          icon={<ClockIcon className="w-5 h-5 text-[#0F2854] dark:text-[#E7EEF7]" />}
          label={t.dashboard.avgPayback}
          value={`00.0 ${t.dashboard.years}`}
          onClick={() => navigate('/history')}
          border="rounded-r-2xl"
        />
      </Panel>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Panel className="lg:col-span-2 pt-5 pb-4 flex flex-col">
          <div className="px-5">
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
          <SavingsTrendChart months={t.dashboard.savingsMonths} />
        </Panel>
        <Panel className="p-5 flex flex-col">
          <SectionHeader title={t.dashboard.energyByMeasure} tag="GHG %" />
          <div className="flex-1 flex items-center">
            <DonutChart
              labels={[t.dashboard.measure1, t.dashboard.measure2, t.dashboard.measure3]}
              measuresLabel={t.dashboard.measuresWord}
            />
          </div>
        </Panel>
      </div>

      {/* Measures */}
      <Panel className="p-5 mb-5">
        <SectionHeader
          title={t.dashboard.measureDetails}
          right={
            <span className="text-[10px] font-mono font-bold text-[#4988C4] bg-[#EEF3FB] dark:bg-white/5 px-2 py-0.5 rounded-full">
              {MOCK_MEASURES.length} {t.common.items}
            </span>
          }
        />
        <div className="divide-y divide-[#F0F4FB] dark:divide-white/8">
          {MOCK_MEASURES.map((measure, i) => {
            const st = MEASURE_STATUS[measure.status];
            return (
              <button key={i} type="button" onClick={() => navigate('/equipment')}
                className="w-full flex items-center justify-between gap-3 text-left px-2 py-3.5 rounded-lg hover:bg-[#F4F7FC] dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-mono text-[#4988C4]/50 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-[#C3D2E5] min-w-0 break-words">{t.dashboard[measure.labelKey]}</span>
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
      </Panel>

      {/* Alerts */}
      <Panel className="p-5 mb-5">
        <SectionHeader
          title={t.dashboard.equipmentNeedsAction}
          right={
            <span className="text-[10px] font-mono font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              {EQUIPMENT_ALERTS.length} {t.common.items}
            </span>
          }
        />
        <div className="flex flex-col gap-2">
          {EQUIPMENT_ALERTS.map((item) => {
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
                  <p className="text-xs text-gray-500 dark:text-[#8CA3C0]">{t.dashboard[item.issueKey]}</p>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-gray-300 dark:text-white/20 -rotate-90 shrink-0" />
              </button>
            );
          })}
        </div>
      </Panel>

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
