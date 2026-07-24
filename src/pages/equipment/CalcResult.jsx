import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon } from '../../components/icons';
import MeasureSelect from '../history/MeasureSelect';

const GRADE_CONFIG = {
  good: {
    label: 'ประสิทธิภาพอยู่ในเกณฑ์ดี',
    desc: (id) => `อุปกรณ์ (${id}) ทำงานได้ตามมาตรฐาน ไม่จำเป็นต้องดำเนินมาตรการปรับปรุงในขณะนี้`,
    bgStyle: { background: 'linear-gradient(to bottom, #86EFAC 0%, #DCFCE7 40%, #F0FBF4 100%)' },
    iconGradient: 'linear-gradient(135deg, #4ADE80 0%, #16A34A 100%)',
    iconColor: 'text-white',
    iconRing: 'ring-green-300',
    textColor: 'text-green-600',
    cardBorder: '#86EFAC',
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
    label: 'ประสิทธิภาพอยู่ในเกณฑ์ปานกลาง',
    desc: (id) => `อุปกรณ์ (${id}) มีประสิทธิภาพอยู่ในระดับพอใช้ ควรพิจารณามาตรการปรับปรุง`,
    bgStyle: { background: 'linear-gradient(to bottom, #FDBA74 0%, #FFEDD5 40%, #FFF8F0 100%)' },
    iconGradient: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
    iconColor: 'text-white',
    iconRing: 'ring-orange-300',
    textColor: 'text-orange-500',
    cardBorder: '#FDBA74',
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
    label: 'ประสิทธิภาพต่ำกว่าเกณฑ์',
    desc: (id) => `อุปกรณ์ (${id}) มีประสิทธิภาพต่ำกว่ามาตรฐาน ควรดำเนินมาตรการปรับปรุงโดยเร็ว`,
    bgStyle: { background: 'linear-gradient(to bottom, #FCA5A5 0%, #FFE2E2 40%, #FFF5F5 100%)' },
    iconGradient: 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)',
    iconColor: 'text-white',
    iconRing: 'ring-red-300',
    textColor: 'text-red-500',
    cardBorder: '#FCA5A5',
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

function CalcResult({ item, result, onBack, readOnly = false, onMeasure }) {
  const [note, setNote] = useState('');
  const [showMeasure, setShowMeasure] = useState(false);
  const navigate = useNavigate();

  const handleMeasureClick = () => {
    if (onMeasure) { onMeasure(); } else { setShowMeasure(true); }
  };
  const cfg = GRADE_CONFIG[result.grade] || GRADE_CONFIG.ok;
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
    <div className="flex flex-col min-h-full font-sans" style={cfg.bgStyle}>
      {/* Back button */}
      <div className="px-5 pt-12 lg:pt-6 pb-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-sm text-[#0F2854] hover:shadow-md transition-shadow"
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
            <div key={key || label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <p className="text-[11px] text-gray-400 mb-1 leading-tight">{label}</p>
              <p className="text-lg font-extrabold text-[#0F2854]">{value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{unit}</p>
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
              background: cfg.cardBorder,
            }}
          />
          {/* Main card */}
          <div
            className="relative w-full rounded-3xl p-5 flex flex-col gap-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)]"
          >
            <p className="text-sm text-gray-600 leading-relaxed text-center">{cfg.desc(item.id || item.brandModel || 'อุปกรณ์')}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="บันทึกหมายเหตุ..."
              rows={2}
              className={`w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm text-gray-600 focus:outline-none focus:ring-2 resize-none ${cfg.focusRing}`}
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
            บันทึกข้อมูล
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
              เลือกมาตรการแก้ไข
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-white rounded-full px-5 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.10)]">
              <p className="text-sm font-medium text-gray-500">ต้องการประหยัดพลังงานเพิ่ม?</p>
              <button
                type="button"
                onClick={handleMeasureClick}
                className="shrink-0 px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
              >
                เลือกมาตรการ
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
