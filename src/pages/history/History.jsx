import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../../layouts/AppLayout';
import { matchesFactory, useFactory } from '../../context/factoryStore.js';
import { fetchAllMeasures } from '../../context/measuresStore.js';
import { useLang } from '../../context/languageStore.js';
import { GlassSearchInput, GlassSelect, PageHeader } from '../../components/ui';
import CalcResult from '../equipment/CalcResult';
import MeasureSelect from './MeasureSelect';
import {
  SnowflakeIcon, DropletIcon, FlameIcon, LightningIcon,
  CoolingTowerIcon, CompressorIcon, TrashIcon,
} from '../../components/icons';

const CATEGORY_ICON = {
  chiller: SnowflakeIcon, compressor: CompressorIcon, pump: DropletIcon,
  boiler: FlameIcon, cooling: CoolingTowerIcon, electrical: LightningIcon,
};
const CATEGORY_COLOR = {
  chiller: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600', compressor: 'bg-purple-100 dark:bg-purple-500/10 text-purple-600',
  pump: 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600', boiler: 'bg-orange-100 dark:bg-orange-500/10 text-orange-600',
  cooling: 'bg-teal-100 dark:bg-teal-500/10 text-teal-600', electrical: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600',
};
const GRADE_COLOR  = { good: 'bg-green-100 dark:bg-green-500/10 text-green-600', ok: 'bg-orange-100 dark:bg-orange-500/10 text-orange-500', poor: 'bg-red-100 dark:bg-red-500/10 text-red-500' };

function formatThaiDateTime(iso, months, timeSuffix) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return {
    date: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()+543}`,
    time: `${h}:${m}${timeSuffix}`,
    monthIdx: d.getMonth(),
    year: d.getFullYear(),
  };
}

function groupByMonth(records, months) {
  const groups = {};
  records.forEach((r) => {
    const d = new Date(r.savedAt);
    const key = `${months[d.getMonth()]} ${d.getFullYear()+543}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups;
}

function History() {
  const { t } = useLang();
  const { selectedFactory, allowedFactories } = useFactory();
  const [viewing, setViewing]           = useState(null);
  const [viewingMeasure, setViewingMeasure] = useState(null);
  const [confirmId, setConfirmId]     = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear]   = useState('');
  const [search, setSearch]           = useState('');

  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem('history') || '[]'); }
    catch { return []; }
  });

  const [allMeasures, setAllMeasures] = useState([]);
  useEffect(() => { fetchAllMeasures().then(setAllMeasures).catch(() => setAllMeasures([])); }, []);

  const getMeasuresForEquipment = (equipmentId) =>
    allMeasures
      .filter((m) => m.equipmentId === equipmentId)
      .map((m) => ({ id: m.id, name: m.measure, formData: m.formData, evalData: m.evalData }));

  const hasMeasures = (equipmentId) =>
    allMeasures.some((m) => m.equipmentId === equipmentId);

  const confirmDelete = (id) => setConfirmId(id);

  const deleteRecord = () => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== confirmId);
      localStorage.setItem('history', JSON.stringify(next));
      return next;
    });
    setConfirmId(null);
  };

  const availableYears = useMemo(() =>
    [...new Set(records.map((r) => new Date(r.savedAt).getFullYear()))].sort((a,b) => b-a),
  [records]);

  const filtered = useMemo(() => records.filter((r) => {
    const d  = new Date(r.savedAt);
    const eq = r.item || r.equipment || {};
    if (!matchesFactory(eq.factory, selectedFactory, allowedFactories)) return false;
    if (filterMonth !== '' && d.getMonth() !== parseInt(filterMonth)) return false;
    if (filterYear  !== '' && d.getFullYear() !== parseInt(filterYear))  return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !eq.id?.toLowerCase().includes(q) &&
        !eq.brandModel?.toLowerCase().includes(q) &&
        !eq.factory?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [records, selectedFactory, allowedFactories, filterMonth, filterYear, search]);

  const groups    = useMemo(() => groupByMonth(filtered, t.history.months), [filtered, t]);
  const monthKeys = Object.keys(groups);

  return (
    <AppLayout hideHeader fullBleed>
      <div className="flex flex-col min-h-screen">

        <PageHeader title={t.history.pageTitle} subtitle={t.history.subtitle}>
          <GlassSelect value={filterMonth} onChange={setFilterMonth}>
            <option value="" className="text-gray-800">{t.history.allMonths}</option>
            {t.history.months.map((m, i) => (
              <option key={i} value={i} className="text-gray-800">{m}</option>
            ))}
          </GlassSelect>
          <GlassSelect value={filterYear} onChange={setFilterYear}>
            <option value="" className="text-gray-800">{t.history.allYears}</option>
            {availableYears.map((y) => (
              <option key={y} value={y} className="text-gray-800">{y + 543}</option>
            ))}
          </GlassSelect>
          {(filterMonth !== '' || filterYear !== '') && (
            <button
              type="button"
              onClick={() => { setFilterMonth(''); setFilterYear(''); }}
              className="text-xs text-[#0F2854]/60 dark:text-[#7E93AF] hover:text-[#0F2854] dark:text-[#E7EEF7] underline underline-offset-2 transition-colors"
            >
              {t.common.reset}
            </button>
          )}
          <GlassSearchInput value={search} onChange={setSearch} placeholder={t.history.searchPlaceholder} className="w-full" />
        </PageHeader>

        {/* ── Content ── */}
        <div className="flex-1 px-5 pt-2 pb-28 lg:pb-10">
          {monthKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 mt-24 text-[#0F2854]/25 dark:text-[#4A5F7D]">
              <svg className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              <p className="text-sm">{t.history.emptyState}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-7">
              {monthKeys.map((month) => (
                <div key={month}>
                  <p className="text-sm font-bold text-[#0F2854]/80 dark:text-[#C3D2E5] mb-3 tracking-wide">{month}</p>
                  <div className="flex flex-col gap-2">
                    {groups[month].map((record) => {
                      const eq        = record.item || record.equipment || {};
                      const Icon      = CATEGORY_ICON[eq.category] || SnowflakeIcon;
                      const iconCls   = CATEGORY_COLOR[eq.category] || 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#8CA3C0]';
                      const gradeCls  = GRADE_COLOR[record.result.grade] || '';
                      const gradeLabel = t.common.grade[record.result.grade] || '';
                      const metrics = record.result.metrics || [
                        { key: 'coolingLoad', label: 'Cooling Load', value: record.result.coolingLoad != null ? Number(record.result.coolingLoad).toFixed(1) : '-', unit: 'TR' },
                        { key: 'powerCF', label: 'Power (CF)', value: record.result.powerCF ?? '-', unit: 'kW' },
                        { key: 'efficiency', label: 'Efficiency', value: record.result.efficiency ?? '-', unit: 'kW/TR' },
                      ];
                      const { date, time } = formatThaiDateTime(record.savedAt, t.history.months, t.history.timeSuffix);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 bg-white dark:bg-[#111F35] rounded-2xl px-4 py-5 lg:py-3.5 shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (hasMeasures(eq.id)) {
                                setViewingMeasure({ item: eq, result: record.result, initialSavedMeasures: getMeasuresForEquipment(eq.id) });
                              } else {
                                setViewing({ item: eq, result: record.result });
                              }
                            }}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconCls}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 lg:w-52 shrink-0">
                              <p className="text-sm lg:text-base font-bold text-[#0F2854] dark:text-[#E7EEF7] truncate">{eq.id}</p>
                              <p className="text-xs lg:text-sm text-gray-500 dark:text-[#8CA3C0] mt-0.5 truncate">{date} | {time}</p>
                              {eq.factory && <p className="text-xs lg:text-sm text-gray-400 dark:text-[#7E93AF] truncate">{eq.factory}</p>}
                              {hasMeasures(eq.id) && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 px-2 py-0.5 rounded-full">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  {t.history.measureSelected}
                                </span>
                              )}
                            </div>
                            {/* Desktop-only metrics */}
                            <div className="hidden lg:flex flex-1 items-center justify-end gap-4 px-4">
                              {metrics.map(({ key, label, value, unit }) => (
                                <div key={key || label} className="flex flex-col items-center bg-gray-50 dark:bg-white/5 rounded-xl px-4 py-2 min-w-[90px]">
                                  <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] leading-tight">{label}</p>
                                  <p className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{value}</p>
                                  <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">{unit}</p>
                                </div>
                              ))}
                            </div>
                          </button>
                          <div className="flex flex-col items-end gap-1.5 shrink-0 w-20 lg:w-24">
                            {gradeLabel && (
                              <span className={`text-[11px] lg:text-sm font-semibold py-1 lg:py-1.5 rounded-full w-full text-center ${gradeCls}`}>
                                {gradeLabel}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => confirmDelete(record.id)}
                              className="w-full py-1 lg:py-1.5 rounded-full bg-red-100 dark:bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <TrashIcon className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0" />
                              <span className="text-[11px] lg:text-sm font-semibold">{t.common.delete}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm delete dialog */}
      {confirmId !== null && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 font-sans">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmId(null)} />
          <div className="relative bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                <TrashIcon className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.history.deleteRecordConfirm}</p>
              <p className="text-sm text-gray-400 dark:text-[#7E93AF]">{t.history.deleteRecordWarning}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-[#8CA3C0] font-semibold text-sm transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={deleteRecord}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {viewing && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col lg:items-center lg:justify-center font-sans">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm hidden lg:block"
            onClick={() => setViewing(null)}
          />
          <div className="relative z-10 w-full h-full lg:h-auto lg:max-h-[90vh] lg:max-w-xl lg:rounded-3xl lg:shadow-2xl overflow-hidden">
            <CalcResult
              item={viewing.item}
              result={viewing.result}
              onBack={() => setViewing(null)}
              readOnly
              onMeasure={() => { setViewingMeasure(viewing); setViewing(null); }}
            />
          </div>
        </div>,
        document.body
      )}

      {viewingMeasure && (
        <MeasureSelect
          item={viewingMeasure.item}
          result={viewingMeasure.result}
          initialSavedMeasures={viewingMeasure.initialSavedMeasures}
          onClose={() => setViewingMeasure(null)}
        />
      )}
    </AppLayout>
  );
}

export default History;
