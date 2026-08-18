import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../../components/ui';
import { useTheme } from '../../context/themeStore.js';
import { useLang } from '../../context/languageStore.js';
import { saveHistoryItem } from '../../context/historyStore.js';
import MeasureSelect from '../history/MeasureSelect';
import { MEASURES } from '../history/measuresData.js';
import ChillerLoadCurve from '../../components/ChillerLoadCurve';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardIcon,
  SparkleIcon,
} from '../../components/icons';

function getGradeConfig(t) {
  return {
    good: {
      label: t.calcResult.gradeGoodLabel,
      desc: t.calcResult.gradeGoodDesc,
      accentColor: '#22C55E',
      gradientFrom: '#DCFCE7',
      gradientTo: '#F0FBF4',
      gradientFromDark: '#14532D',
      gradientToDark: '#0B1B33',
      iconGradient: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)',
      iconRing: 'ring-emerald-300 dark:ring-emerald-700',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badgeCls: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
      borderTop: 'border-t-emerald-500',
      focusRing: 'focus:ring-emerald-300',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    ok: {
      label: t.calcResult.gradeOkLabel,
      desc: t.calcResult.gradeOkDesc,
      accentColor: '#F97316',
      gradientFrom: '#FFEDD5',
      gradientTo: '#FFF8F0',
      gradientFromDark: '#4A2E0F',
      gradientToDark: '#0B1B33',
      iconGradient: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
      iconRing: 'ring-orange-300 dark:ring-orange-700',
      textColor: 'text-orange-500 dark:text-orange-400',
      badgeCls: 'bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30',
      borderTop: 'border-t-orange-400',
      focusRing: 'focus:ring-orange-300',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
          <circle cx="12" cy="12" r="9" strokeLinecap="round" />
        </svg>
      ),
    },
    poor: {
      label: t.calcResult.gradePoorLabel,
      desc: t.calcResult.gradePoorDesc,
      accentColor: '#EF4444',
      gradientFrom: '#FFE2E2',
      gradientTo: '#FFF5F5',
      gradientFromDark: '#4A1616',
      gradientToDark: '#0B1B33',
      iconGradient: 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)',
      iconRing: 'ring-red-300 dark:ring-red-700',
      textColor: 'text-red-500 dark:text-red-400',
      badgeCls: 'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30',
      borderTop: 'border-t-red-500',
      focusRing: 'focus:ring-red-300',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  };
}

function CalcResult({ item, result, onBack, readOnly = false, onMeasure }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);
  const [quickMeasure, setQuickMeasure] = useState('');
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useLang();
  const isDark = theme === 'dark';

  const cfg = getGradeConfig(t)[result?.grade || 'ok'];

  const handleMeasureClick = () => {
    setQuickMeasure('');
    if (onMeasure) { onMeasure(); } else { setShowMeasure(true); }
  };

  // Suggest intelligent measures based on efficiency grade:
  // - 'good': Do NOT suggest replacement ("เปลี่ยน..."), suggest light maintenance/tuning instead.
  // - 'ok': Suggest tuning/cleaning, do NOT suggest full equipment replacement.
  // - 'poor': Suggest corrective actions including high-efficiency replacement.
  const categoryMeasures = MEASURES[item?.category] || [];
  const recommendedMeasures = (function getRecommendations() {
    if (result?.grade === 'good' || result?.grade === 'ok') {
      return categoryMeasures.filter((m) => !m.startsWith('เปลี่ยน')).slice(0, 3);
    }
    return categoryMeasures.slice(0, 3);
  })();

  const handleRecommendedClick = (m) => {
    setQuickMeasure(m);
    if (onMeasure) { onMeasure(); } else { setShowMeasure(true); }
  };

  const isChiller = item?.category === 'chiller' || result?.coolingLoad != null;
  const ultraFromMetrics = result?.metrics?.find(
    (m) => m.key === 'ultraflowSonic' || m.label?.toLowerCase().includes('ultraflow')
  )?.value;

  const ultraVal =
    result?.ultraflowSonic ??
    result?.inputs?.ultraflowSonic ??
    ultraFromMetrics ??
    result?.flowRate ??
    result?.flow ??
    (isChiller && result?.coolingLoad ? (Number(result.coolingLoad) * 24 / 10).toFixed(0) : null);

  const ultraUnit = result?.flowUnit ?? result?.inputs?.flowUnit ?? 'GPM';

  const baseMetrics = result.metrics || [
    { key: 'coolingLoad', label: 'Cooling Load', value: result.coolingLoad != null ? Number(result.coolingLoad).toFixed(2) : '-', unit: 'TR' },
    { key: 'powerCF', label: 'Power (CF)', value: result.powerCF ?? '-', unit: 'kW' },
    { key: 'efficiency', label: 'Efficiency', value: result.efficiency || '-', unit: 'kW/TR' },
  ];
  const hasUltra = baseMetrics.some((m) => m.key === 'ultraflowSonic' || m.label?.toLowerCase().includes('ultraflow'));
  const metrics = hasUltra
    ? baseMetrics
    : ultraVal != null
    ? [{ key: 'ultraflowSonic', label: 'Ultraflow Sonic', value: String(ultraVal), unit: ultraUnit }, ...baseMetrics]
    : baseMetrics;

  const handleSave = async () => {
    setSaving(true);
    try {
      const record = {
        id: Date.now(),
        savedAt: new Date().toISOString(),
        note,
        item,
        result,
      };
      await saveHistoryItem(record);
      navigate('/history');
    } finally {
      setSaving(false);
    }
  };

  const gradeGrp = {
    good: { label: 'ดีมาก (Good)', short: 'GOOD' },
    ok: { label: 'พอใช้ (OK)', short: 'OK' },
    poor: { label: 'ต้องปรับปรุง (Poor)', short: 'POOR' },
  };

  if (showMeasure) {
    return (
      <MeasureSelect
        item={item}
        result={result}
        onClose={() => setShowMeasure(false)}
        initialMeasure={quickMeasure || undefined}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
            ผลการคำนวณประสิทธิภาพ
          </h2>
          <p className="text-sm text-gray-400 dark:text-[#7E93AF] mt-0.5">
            อุปกรณ์ <span className="font-bold font-mono text-[#0F2854] dark:text-[#E7EEF7]">{item.id}</span> · {item.factory || '-'}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {readOnly ? 'ย้อนกลับ' : 'คำนวณใหม่'}
        </button>
      </div>

      {/* GRADE HERO CARD */}
      <Panel
        className={`p-6 rounded-3xl border-t-4 ${cfg.borderTop} space-y-4`}
        style={isDark
          ? { background: `linear-gradient(160deg, ${cfg.gradientFromDark} 0%, ${cfg.gradientToDark} 100%)` }
          : { background: `linear-gradient(160deg, ${cfg.gradientFrom} 0%, ${cfg.gradientTo} 100%)` }
        }
      >
        <div className="flex items-center gap-4">
          {/* Grade icon */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ring-4 ${cfg.iconRing} shadow-lg text-white shrink-0`}
            style={{ background: cfg.iconGradient }}
          >
            {cfg.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-2xl font-extrabold leading-tight ${cfg.textColor}`}>{cfg.label}</h3>
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-widest ${cfg.badgeCls}`}>
                เกรด {gradeGrp[result.grade]?.short || '-'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-[#7E93AF] mt-1 leading-relaxed">
              {typeof cfg.desc === 'function' ? cfg.desc(item.id || item.brandModel || 'อุปกรณ์') : cfg.desc}
            </p>
          </div>
        </div>
      </Panel>

      {/* METRICS GRID */}
      <Panel className="p-6 rounded-3xl">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
            <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
            ผลลัพธ์การวัดสมรรถนะ (PERFORMANCE METRICS)
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            ค่าตรวจวัดจริง (Actual Measured Values)
          </span>
        </div>

        <div className={`grid gap-3.5 ${metrics.length >= 4 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {metrics.map(({ key, label, value, unit }) => {
            const isEff = key === 'efficiency';
            const isPctLoad = key === 'pctCoolingLoad';

            if (isEff) {
              return (
                <div
                  key={key || label}
                  className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-teal-500/10 dark:from-emerald-500/25 dark:via-emerald-500/15 dark:to-teal-500/15 border-2 border-emerald-500 dark:border-emerald-400 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20 gap-1 relative overflow-hidden"
                >
                  <div className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                    <span>★</span>
                    <span>{label}</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 leading-none font-mono tracking-tight my-0.5">
                    {value}
                  </p>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm">
                    {unit || 'kW/TR'} (หลัก)
                  </span>
                </div>
              );
            }

            if (isPctLoad) {
              return (
                <div
                  key={key || label}
                  className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-500/15 border-2 border-blue-400 dark:border-blue-500/40 gap-1 shadow-sm"
                >
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-tight font-extrabold">{label}</p>
                  <p className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-300 leading-none font-mono tracking-tight my-0.5">{value}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-300 font-mono font-bold">{unit}</p>
                </div>
              );
            }

            return (
              <div
                key={key || label}
                className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 gap-1"
              >
                <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] leading-tight font-semibold">{label}</p>
                <p className="text-xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] leading-none font-mono tracking-tight">{value}</p>
                <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">{unit}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* HEAT EXCHANGER FOULING & APPROACH TEMPERATURE DIAGNOSTICS */}
      {isChiller && (() => {
        const toF = (v, u) => (u === 'C' ? (parseFloat(v) * 9) / 5 + 32 : parseFloat(v));
        const inputs = result?.inputs || {};

        const tCHWS = result?.chillTempOut != null ? Number(result.chillTempOut) : toF(inputs.chillTempOut, inputs.fieldUnits?.chillTempOut);
        const tEvap = result?.saturatedEvapTemp != null ? Number(result.saturatedEvapTemp) : toF(inputs.saturatedEvapTemp, inputs.fieldUnits?.saturatedEvapTemp);
        const evapApp = result?.evapApproach != null ? Number(result.evapApproach) : (tCHWS != null && tEvap != null && !Number.isNaN(tCHWS) && !Number.isNaN(tEvap) ? tCHWS - tEvap : null);

        const tCondOut = result?.condTempOut != null ? Number(result.condTempOut) : toF(inputs.condTempOut, inputs.fieldUnits?.condTempOut);
        const tCond = result?.saturatedCondTemp != null ? Number(result.saturatedCondTemp) : toF(inputs.saturatedCondTemp, inputs.fieldUnits?.saturatedCondTemp);
        const condApp = result?.condApproach != null ? Number(result.condApproach) : (tCond != null && tCondOut != null && !Number.isNaN(tCond) && !Number.isNaN(tCondOut) ? tCond - tCondOut : null);

        if (evapApp == null && condApp == null) return null;

        const getStatus = (app) => {
          if (app == null) return null;
          if (app < 4.0) {
            return {
              zone: 'good',
              badge: '🟢 สะอาด / ปกติ (<4°F)',
              badgeCls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300',
              advice: 'การแลกเปลี่ยนความร้อนสมบูรณ์ ท่อสะอาด ไม่มีตะกรันสะสม',
              shouldClean: false,
            };
          }
          if (app <= 6.0) {
            return {
              zone: 'warn',
              badge: '🟡 4-6°F ควรล้าง (เริ่มสกปรก)',
              badgeCls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300',
              advice: 'Approach Temp อยู่ในช่วง 4-6°F ท่อเริ่มมีคราบสกปรกสะสม ส่งผลให้กินไฟเพิ่มขึ้น แนะนำให้ดำเนินการล้างทำความสะอาด',
              shouldClean: true,
            };
          }
          return {
            zone: 'alert',
            badge: '🔴 >6°F ต้องล้างด่วน (สกปรกมาก)',
            badgeCls: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300',
            advice: 'Approach Temp สูงเกิน 6°F เกิด Fouling/ตะกรันหนาแน่น สูญเสียพลังงานสูง ต้องล้างทำความสะอาดด่วน',
            shouldClean: true,
          };
        };

        const evapStat = getStatus(evapApp);
        const condStat = getStatus(condApp);

        return (
          <Panel className="p-6 rounded-3xl space-y-5 border-t-4 border-t-indigo-500">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                  <span className="w-2 h-4 rounded-full bg-indigo-500 shrink-0" />
                  การประเมินความสกปรกและ Approach Temperature (HEAT EXCHANGER FOULING)
                </h4>
                <p className="text-xs text-gray-400 dark:text-[#7E93AF] mt-0.5">
                  เกณฑ์มาตรฐาน: Approach &le; 3°F (สะอาด) · <strong>4 - 6°F ควรล้าง</strong> · &gt; 6°F ต้องล้างด่วน
                </p>
              </div>
              {(evapStat?.shouldClean || condStat?.shouldClean) && (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 animate-pulse">
                  ⚠️ ตรวจพบจุดที่ควรล้าง (4-6°F)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Evaporator Approach Card */}
              <div className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F2854] dark:text-[#E7EEF7]">
                    <SnowflakeIcon className="w-4 h-4 text-sky-500" />
                    <span>Evaporator Approach Temp</span>
                  </div>
                  {evapStat && (
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${evapStat.badgeCls}`}>
                      {evapStat.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono ${evapStat?.shouldClean ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {evapApp != null ? `${evapApp.toFixed(1)}°F` : '-'}
                  </span>
                  {evapApp != null && (
                    <span className="text-xs text-gray-400 font-mono">
                      ({((evapApp * 5) / 9).toFixed(1)}°C)
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#111F35] border border-gray-200 dark:border-white/10 text-[11px] font-mono space-y-1">
                  <p className="text-gray-500 dark:text-[#8CA3C0]">
                    สูตร: <strong className="text-[#0F2854] dark:text-[#E7EEF7]">Temp Out − Saturated Evap</strong>
                  </p>
                  {tCHWS != null && tEvap != null && (
                    <p className="text-gray-400">
                      = {tCHWS.toFixed(1)}°F (น้ำเย็นจ่าย) − {tEvap.toFixed(1)}°F (น้ำยาระเหย) = <strong className="text-indigo-600 dark:text-indigo-400">{evapApp?.toFixed(1)}°F</strong>
                    </p>
                  )}
                </div>

                {evapStat && (
                  <p className="text-xs text-gray-600 dark:text-[#C3D2E5] leading-relaxed">
                    {evapStat.advice}
                  </p>
                )}

                {evapStat?.shouldClean && (
                  <button
                    type="button"
                    onClick={() => handleRecommendedClick('ล้าง Evaporator')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>🧹 ประเมินมาตรการ "ล้าง Evaporator"</span>
                    <span>&rarr;</span>
                  </button>
                )}
              </div>

              {/* 2. Condenser Approach Card */}
              <div className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#0F2854] dark:text-[#E7EEF7]">
                    <FlameIcon className="w-4 h-4 text-orange-500" />
                    <span>Condenser Approach Temp</span>
                  </div>
                  {condStat && (
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${condStat.badgeCls}`}>
                      {condStat.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono ${condStat?.shouldClean ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {condApp != null ? `${condApp.toFixed(1)}°F` : '-'}
                  </span>
                  {condApp != null && (
                    <span className="text-xs text-gray-400 font-mono">
                      ({((condApp * 5) / 9).toFixed(1)}°C)
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-[#111F35] border border-gray-200 dark:border-white/10 text-[11px] font-mono space-y-1">
                  <p className="text-gray-500 dark:text-[#8CA3C0]">
                    สูตร: <strong className="text-[#0F2854] dark:text-[#E7EEF7]">Saturated Cond − Temp Out</strong>
                  </p>
                  {tCond != null && tCondOut != null && (
                    <p className="text-gray-400">
                      = {tCond.toFixed(1)}°F (อุณหภูมิควบแน่น) − {tCondOut.toFixed(1)}°F (น้ำออกไป CT) = <strong className="text-indigo-600 dark:text-indigo-400">{condApp?.toFixed(1)}°F</strong>
                    </p>
                  )}
                </div>

                {condStat && (
                  <p className="text-xs text-gray-600 dark:text-[#C3D2E5] leading-relaxed">
                    {condStat.advice}
                  </p>
                )}

                {condStat?.shouldClean && (
                  <button
                    type="button"
                    onClick={() => handleRecommendedClick('ล้าง Condenser')}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>🚿 ประเมินมาตรการ "ล้าง Condenser"</span>
                    <span>&rarr;</span>
                  </button>
                )}
              </div>
            </div>
          </Panel>
        );
      })()}

      {/* CHILLER LOAD STATUS & PART-LOAD PERFORMANCE CURVE */}
      {isChiller && (
        <Panel className="p-6 rounded-3xl">
          <ChillerLoadCurve
            specTR={item?.coolingCapacity ?? item?.capacityTR}
            specKW={item?.chillerPower ?? item?.electricalPower ?? item?.power}
            specKwPerTr={item?.chillerEfficiency ?? item?.specificPower}
            coolingLoadTR={result?.coolingLoad}
            currentKW={result?.powerCF ?? result?.powerBaseline}
            kwPerTrCurrent={result?.efficiency}
          />
        </Panel>
      )}

      {/* NOTE + SAVE */}
      {!readOnly && (
        <Panel className="p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
            <svg className="w-4 h-4 text-[#4988C4]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            บันทึกข้อมูลลงประวัติ (SAVE TO HISTORY)
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">หมายเหตุ / บันทึกเพิ่มเติม</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.calcResult.notePlaceholder}
              rows={3}
              className={`w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-gray-600 dark:text-[#8CA3C0] focus:outline-none focus:ring-2 resize-none ${cfg.focusRing}`}
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm transition-all active:scale-95 shadow-md shadow-[#0F2854]/20 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <CheckIcon className="w-5 h-5" />
            {saving ? 'กำลังบันทึก...' : t.equipment.saveData}
          </button>
        </Panel>
      )}

      {/* MEASURE SECTION */}
      <Panel className={`p-6 rounded-3xl border-t-4 ${result?.grade === 'good' ? 'border-t-emerald-500' : result?.grade === 'ok' ? 'border-t-orange-400' : 'border-t-rose-500'} space-y-4`}>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
          <svg className={`w-4 h-4 ${result?.grade === 'good' ? 'text-emerald-500' : result?.grade === 'ok' ? 'text-orange-500' : 'text-rose-500'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          {result?.grade === 'good'
            ? 'มาตรการบำรุงรักษาและประหยัดพลังงาน (MAINTENANCE & OPTIMIZATION)'
            : result?.grade === 'ok'
            ? 'มาตรการปรับปรุงประสิทธิภาพ (EFFICIENCY IMPROVEMENT)'
            : 'มาตรการแก้ไขและประหยัดพลังงาน (CORRECTIVE MEASURES)'}
        </div>

        <p className="text-sm text-gray-500 dark:text-[#7E93AF] leading-relaxed">
          {result?.grade === 'good'
            ? 'อุปกรณ์มีประสิทธิภาพอยู่ในเกณฑ์ดีตามมาตรฐาน ไม่จำเป็นต้องเปลี่ยนเครื่องจักรใหม่ แต่สามารถเลือกมาตรการบำรุงรักษาเชิงป้องกัน (Preventive Maintenance) หรือปรับแต่งการทำงานเพื่อรักษาประสิทธิภาพให้ยาวนาน'
            : result?.grade === 'ok'
            ? 'อุปกรณ์มีประสิทธิภาพระดับปานกลาง สามารถเลือกมาตรการปรับปรุงและบำรุงรักษาเพื่อเพิ่มการประหยัดพลังงาน'
            : 'อุปกรณ์มีประสิทธิภาพต่ำกว่าเกณฑ์มาตรฐาน แนะนำให้พิจารณามาตรการแก้ไขเร่งด่วน หรือเปลี่ยนเครื่องจักรประสิทธิภาพสูง'}
        </p>

        {!onMeasure && recommendedMeasures.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#4988C4]">
              <SparkleIcon className="w-3.5 h-3.5" />
              {result?.grade === 'good' ? 'มาตรการบำรุงรักษาแนะนำ:' : t.calcResult.recommendedMeasures}
            </p>
            <div className="flex flex-wrap gap-2">
              {recommendedMeasures.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleRecommendedClick(m)}
                  className="px-3.5 py-2 rounded-full bg-[#EAF4FC] dark:bg-white/10 text-[#4988C4] text-xs font-bold hover:bg-[#D8EBFA] dark:hover:bg-white/15 transition-colors"
                >
                  {t.measures.names[m] || m}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleMeasureClick}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
          </svg>
          {result?.grade === 'good'
            ? 'เลือกมาตรการบำรุงรักษา / ประหยัดพลังงาน'
            : readOnly
            ? t.calcResult.selectCorrectiveMeasure
            : t.calcResult.selectMeasure}
        </button>
      </Panel>
    </div>
  );
}

export default CalcResult;
