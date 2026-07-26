import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon } from '../../components/icons';
import { useTheme } from '../../context/themeStore.js';
import { useLang } from '../../context/languageStore.js';
import MeasureSelect from '../history/MeasureSelect';

function getGradeConfig(t) {
  return {
  good: {
    label: t.calcResult.gradeGoodLabel,
    desc: t.calcResult.gradeGoodDesc,
    bgStyle: { background: 'linear-gradient(to bottom, #86EFAC 0%, #DCFCE7 40%, #F0FBF4 100%)' },
    bgStyleDark: { background: 'linear-gradient(to bottom, #14532D 0%, #0F2E1D 40%, #0B1B33 100%)' },
    iconGradient: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)',
    iconColor: 'text-white',
    iconRing: 'ring-green-300',
    textColor: 'text-green-600 dark:text-green-400',
    cardBorder: '#86EFAC',
    cardBorderDark: '#166534',
    cardBack: '#BBF7D0',
    cardTint: 'rgba(220,252,231,0.5)',
    focusRing: 'focus:ring-green-300',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  ok: {
    label: t.calcResult.gradeOkLabel,
    desc: t.calcResult.gradeOkDesc,
    bgStyle: { background: 'linear-gradient(to bottom, #FDBA74 0%, #FFEDD5 40%, #FFF8F0 100%)' },
    bgStyleDark: { background: 'linear-gradient(to bottom, #4A2E0F 0%, #2E2013 40%, #0B1B33 100%)' },
    iconGradient: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
    iconColor: 'text-white',
    iconRing: 'ring-orange-300',
    textColor: 'text-orange-500 dark:text-orange-400',
    cardBorder: '#FDBA74',
    cardBorderDark: '#9A3412',
    cardBack: '#FED7AA',
    cardTint: 'rgba(255,237,213,0.5)',
    focusRing: 'focus:ring-orange-300',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
        <circle cx="12" cy="12" r="9" strokeLinecap="round" />
      </svg>
    ),
  },
  poor: {
    label: t.calcResult.gradePoorLabel,
    desc: t.calcResult.gradePoorDesc,
    bgStyle: { background: 'linear-gradient(to bottom, #FCA5A5 0%, #FFE2E2 40%, #FFF5F5 100%)' },
    bgStyleDark: { background: 'linear-gradient(to bottom, #4A1616 0%, #2E1414 40%, #0B1B33 100%)' },
    iconGradient: 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)',
    iconColor: 'text-white',
    iconRing: 'ring-red-300',
    textColor: 'text-red-500 dark:text-red-400',
    cardBorder: '#FCA5A5',
    cardBorderDark: '#991B1B',
    cardBack: '#FECACA',
    cardTint: 'rgba(254,226,226,0.5)',
    focusRing: 'focus:ring-red-300',
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  };
}

function CalcResult({ item, result, onBack, readOnly = false, onMeasure }) {
  const [note, setNote] = useState('');
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
  const bgStyle = isDark ? cfg.bgStyleDark : cfg.bgStyle;
  const cardBorder = isDark ? cfg.cardBorderDark : cfg.cardBorder;
  const metrics = result.metrics || [
    { key: 'coolingLoad', label: 'Cooling Load', value: result.coolingLoad != null ? Number(result.coolingLoad).toFixed(2) : '-', unit: 'TR' },
    { key: 'powerCF', label: 'Power (CF)', value: result.powerCF ?? '-', unit: 'kW' },
    { key: 'efficiency', label: 'Efficiency', value: result.efficiency || '-', unit: 'kW/TR' },
  ];

  const handleSave = () => {
    const existing = JSON.parse(localStorage.getItem('history') || '[]');
    const record = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      note,
      item,
      result,
    };
    localStorage.setItem('history', JSON.stringify([record, ...existing]));
    navigate('/history');
  };

  return (
    <div className="flex flex-col min-h-full font-sans" style={bgStyle}>
      {/* Back button */}
      <div className="px-5 pt-12 lg:pt-6 pb-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#111F35] shadow-sm text-[#0F2854] dark:text-[#E7EEF7] hover:shadow-md transition-shadow"
        >
          <ChevronDownIcon className="w-5 h-5 rotate-90" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col items-center gap-5">

        {/* Icon */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center ring-8 ${cfg.iconColor} ${cfg.iconRing} mt-4 shadow-lg`}
          style={{ background: cfg.iconGradient }}
        >
          {cfg.icon}
        </div>

        {/* Title */}
        <h1 className={`text-3xl font-extrabold text-center leading-tight ${cfg.textColor}`}>{cfg.label}</h1>

        {/* Metrics — generic result.metrics (any category); falls back to the
            original chiller-only 3-tuple for records saved before metrics existed */}
        <div className={`w-full grid gap-2 ${metrics.length >= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {metrics.map(({ key, label, value, unit }) => (
            <div key={key || label} className="bg-white dark:bg-[#111F35] rounded-2xl p-3 text-center shadow-sm">
              <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] mb-1 leading-tight">{label}</p>
              <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{value}</p>
              <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] mt-0.5">{unit}</p>
            </div>
          ))}
        </div>

        {/* Info card (stacked) */}
        <div className="w-full relative pt-3">
          {/* Back layer — peeks above main card */}
          <div
            className="absolute inset-x-3 rounded-3xl"
            style={{
              top: 0,
              bottom: '10px',
              background: cardBorder,
            }}
          />
          {/* Main card */}
          <div
            className="relative w-full rounded-3xl p-5 flex flex-col gap-4 bg-white dark:bg-[#111F35] shadow-[0_2px_12px_rgba(0,0,0,0.07)]"
          >
            <p className="text-sm text-gray-600 dark:text-[#8CA3C0] leading-relaxed text-center">{cfg.desc(item.id || item.brandModel || t.calcResult.defaultEquipmentName)}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.calcResult.notePlaceholder}
              rows={2}
              className={`w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-[#8CA3C0] focus:outline-none focus:ring-2 resize-none ${cfg.focusRing}`}
            />
          </div>
        </div>

        {/* Save button — hidden when viewing from history */}
        {!readOnly && (
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-4 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-base transition-colors shadow-md"
          >
            {t.equipment.saveData}
          </button>
        )}

        {/* More savings */}
        <div className="w-full pb-2">
          {readOnly ? (
            <button
              type="button"
              onClick={handleMeasureClick}
              className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
            >
              {t.calcResult.selectCorrectiveMeasure}
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#111F35] rounded-full px-5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.10)]">
              <p className="text-sm font-medium text-gray-500 dark:text-[#7E93AF]">{t.calcResult.wantMoreSavings}</p>
              <button
                type="button"
                onClick={handleMeasureClick}
                className="shrink-0 px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
              >
                {t.calcResult.selectMeasure}
              </button>
            </div>
          )}
        </div>
      </div>

      {showMeasure && (
        <MeasureSelect item={item} result={result} onClose={() => setShowMeasure(false)} />
      )}
    </div>
  );
}

export default CalcResult;
