import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../../components/ui';
import { useTheme } from '../../context/themeStore.js';
import { useLang } from '../../context/languageStore.js';
import { saveHistoryItem } from '../../context/historyStore.js';
import MeasureSelect from '../history/MeasureSelect';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardIcon,
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
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useLang();
  const isDark = theme === 'dark';

  const handleMeasureClick = () => {
    if (onMeasure) { onMeasure(); } else { setShowMeasure(true); }
  };

  const GRADE_CONFIG = getGradeConfig(t);
  const cfg = GRADE_CONFIG[result.grade] || GRADE_CONFIG.ok;

  const metrics = result.metrics || [
    { key: 'coolingLoad', label: 'Cooling Load', value: result.coolingLoad != null ? Number(result.coolingLoad).toFixed(2) : '-', unit: 'TR' },
    { key: 'powerCF', label: 'Power (CF)', value: result.powerCF ?? '-', unit: 'kW' },
    { key: 'efficiency', label: 'Efficiency', value: result.efficiency || '-', unit: 'kW/TR' },
  ];

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

  return (
    <>
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
            คำนวณใหม่
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
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider mb-4">
            <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
            ผลลัพธ์การวัดสมรรถนะ (PERFORMANCE METRICS)
          </div>

          <div className={`grid gap-3 ${metrics.length >= 4 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {metrics.map(({ key, label, value, unit }) => (
              <div
                key={key || label}
                className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 gap-1"
              >
                <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] leading-tight font-semibold">{label}</p>
                <p className="text-xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] leading-none font-mono tracking-tight">{value}</p>
                <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">{unit}</p>
              </div>
            ))}
          </div>
        </Panel>

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
        <Panel className="p-6 rounded-3xl border-t-4 border-t-[#4988C4] space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
            <svg className="w-4 h-4 text-[#4988C4]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            มาตรการประหยัดพลังงาน (CORRECTIVE MEASURES)
          </div>

          <p className="text-sm text-gray-500 dark:text-[#7E93AF] leading-relaxed">
            {readOnly
              ? 'เลือกมาตรการแก้ไขเพื่อประเมินศักยภาพการประหยัดพลังงาน และบันทึกแผนงาน'
              : t.calcResult.wantMoreSavings}
          </p>

          <button
            type="button"
            onClick={handleMeasureClick}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            {readOnly ? t.calcResult.selectCorrectiveMeasure : t.calcResult.selectMeasure}
          </button>
        </Panel>
      </div>

      {showMeasure && (
        <MeasureSelect item={item} result={result} onClose={() => setShowMeasure(false)} />
      )}
    </>
  );
}

export default CalcResult;
