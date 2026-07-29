import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchAllEquipment } from '../../context/equipmentStore.js';
import { saveMeasureItem } from '../../context/measuresStore.js';
import { loadSettings } from '../../context/settingsStore.js';
import { useLang } from '../../context/languageStore.js';
import { Select } from '../../components/Dropdown.jsx';

// Thailand grid mix emission factor (kg CO2e per kWh) — used to convert
// energy savings into an estimated GHG reduction figure.
const GHG_FACTOR_KG_PER_KWH = 0.5561;

function nextMeasureId() {
  return Date.now();
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function BoltIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 2L3 14h7l-1 8 11-13h-7l1-7z" />
    </svg>
  );
}
function LeafIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14zm0 0c0-5 3-8 8-10" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Chiller-only for now: it's the one category with the numeric fields
// (coolingCapacity + chillerEfficiency) needed to compute real savings.
function SavingsCalculator({ item, onClose }) {
  const { t } = useLang();
  const [equipment, setEquipment] = useState([]);
  useEffect(() => { fetchAllEquipment().then(setEquipment).catch(() => setEquipment([])); }, []);

  const matching = useMemo(
    () => equipment.filter((e) => e.category === item.catId),
    [equipment, item.catId]
  );

  const [selectedId, setSelectedId] = useState('');
  const selected = matching.find((e) => e.id === selectedId) || null;

  const appDefaults = loadSettings();
  const [hours, setHours] = useState(appDefaults.defaultOperatingHours || '');
  const [rate, setRate] = useState(appDefaults.defaultElectricityRate || '');
  const [investment, setInvestment] = useState(item.costEst ? String(item.costEst) : '');
  const [saved, setSaved] = useState(false);

  const handleSelectMachine = (id) => {
    setSelectedId(id);
    const eq = matching.find((e) => e.id === id);
    if (eq?.electricityCost) setRate(String(eq.electricityCost));
  };

  const coolingCapacity = parseFloat(selected?.coolingCapacity || 0);
  const oldEfficiency = parseFloat(selected?.chillerEfficiency || 0);
  const newEfficiency = parseFloat(item.specificPower || 0);
  const h = parseFloat(hours || 0);
  const r = parseFloat(rate || 0);
  const inv = parseFloat(investment || 0);

  const energySaved = coolingCapacity * Math.max(oldEfficiency - newEfficiency, 0) * h;
  const costSaved = energySaved * r;
  const ghgSaved = (energySaved * GHG_FACTOR_KG_PER_KWH) / 1000;
  const payback = costSaved > 0 && inv > 0 ? (inv / costSaved).toFixed(2) : null;
  const hasResult = !!selected && coolingCapacity > 0 && newEfficiency > 0 && h > 0 && r > 0;

  const handleSave = async () => {
    if (!selected || !hasResult) return;
    await saveMeasureItem({
      id: nextMeasureId(),
      savedAt: new Date().toISOString(),
      equipmentId: selected.id,
      category: item.catId,
      factory: selected.factory,
      measure: 'เปลี่ยนเครื่องทำน้ำเย็นประสิทธิภาพสูง',
      formData: {
        newModel: `${item.brand} ${item.model}`,
        specificPowerNew: item.specificPower,
        powerCurrent: selected.chillerPower,
      },
      evalData: {
        operatingHours: hours,
        electricityRate: rate,
        investmentCost: investment,
        energySaved,
        costSaved,
        ghgSaved,
        payback,
      },
    });
    setSaved(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 font-sans">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] leading-snug">
            {t.catalog.simulatorTitle}: {item.brand} {item.model}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#7E93AF] transition-colors shrink-0"
          >
            <XIcon />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 pb-6">
          <div>
            <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.catalog.currentMachine}</label>
            <Select
              value={selectedId}
              onChange={handleSelectMachine}
              options={matching.map((e) => ({ value: e.id, label: `${e.id} · ${e.brandModel || ''}`.trim() }))}
              placeholder={t.catalog.selectMachinePlaceholder}
              triggerClassName="flex items-center w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] font-semibold pl-3.5 pr-3 py-3 rounded-2xl"
            />
            {matching.length === 0 && (
              <p className="text-xs text-amber-500 mt-1.5">{t.catalog.noMatchingEquipment}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1 block">{t.measures.operatingHoursPerYear}</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder={t.measures.egHours}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1 block">{t.measures.elecRateUnit}</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={t.measures.egRate}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1 block">{t.measures.investmentCost}</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={investment}
              onChange={(e) => setInvestment(e.target.value)}
              placeholder={t.measures.egInvestment}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>

          {hasResult && (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-white/8">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#0F2854] px-4 py-4 flex flex-col items-center gap-1">
                  <BoltIcon className="w-6 h-6 text-amber-400 mb-1" />
                  <p className="text-[11px] text-white/70 text-center leading-tight">{t.measures.energySaved}</p>
                  <p className="text-xl font-extrabold text-white leading-tight">
                    {energySaved.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] text-white/60">{t.measures.kwhPerYear}</p>
                </div>
                <div className="rounded-2xl bg-[#16A34A] px-4 py-4 flex flex-col items-center gap-1">
                  <svg className="w-6 h-6 text-white mb-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07C9.39 16.57 8 15.4 8 14c0-.55.45-1 1-1s1 .45 1 1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-1.66 0-3-1.34-3-3 0-1.4 1.39-2.57 3-2.93V6h2v1.07c1.61.36 3 1.53 3 2.93 0 .55-.45 1-1 1s-1-.45-1-1c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1h2c1.66 0 3 1.34 3 3 0 1.4-1.39 2.57-3 2.93z" />
                  </svg>
                  <p className="text-[11px] text-white/70 text-center leading-tight">{t.measures.costSaved}</p>
                  <p className="text-xl font-extrabold text-white leading-tight">
                    {costSaved.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] text-white/60">{t.measures.bahtPerYear}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-4 py-3 flex flex-col items-center gap-1">
                  <LeafIcon className="w-5 h-5 text-emerald-500 mb-1" />
                  <p className="text-[11px] text-gray-500 dark:text-[#7E93AF] text-center leading-tight">{t.catalog.ghgReduced}</p>
                  <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
                    {ghgSaved.toLocaleString('th-TH', { maximumFractionDigits: 1 })}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">{t.catalog.tco2ePerYear}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-4 py-3 flex flex-col items-center gap-1">
                  <p className="text-[11px] text-gray-500 dark:text-[#7E93AF] text-center leading-tight">{t.measures.avgPaybackPeriod}</p>
                  <p className="text-lg font-extrabold text-amber-500">{payback ?? '-'}</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">{t.measures.years}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasResult}
            className="w-full py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-sm transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <BoltIcon className="w-4 h-4 text-amber-400" />
            {saved ? t.catalog.savedToMeasures : t.catalog.saveToMeasures}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SavingsCalculator;
