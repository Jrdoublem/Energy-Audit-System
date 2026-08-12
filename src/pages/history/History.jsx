import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../../layouts/AppLayout';
import { matchesFactory, useFactory } from '../../context/factoryStore.js';
import { fetchAllMeasures } from '../../context/measuresStore.js';
import { fetchAllHistory, deleteHistoryItem } from '../../context/historyStore.js';
import { fetchAllEquipment } from '../../context/equipmentStore.js';
import { useLang } from '../../context/languageStore.js';
import { GlassSearchInput, GlassSelect, PageHeader, Panel } from '../../components/ui';
import CalcResult from '../equipment/CalcResult';
import MeasureSelect from './MeasureSelect';
import {
  SnowflakeIcon, DropletIcon, FlameIcon, LightningIcon,
  CoolingTowerIcon, CompressorIcon, TrashIcon,
  ClipboardIcon, EyeIcon, SearchIcon,
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
const GRADE_COLOR = {
  good: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',
  ok: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30',
  poor: 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30',
};

function formatThaiDateTime(iso, months, timeSuffix = '') {
  if (!iso) return { date: '-', time: '', monthIdx: 0, year: 0 };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: '', monthIdx: 0, year: 0 };
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return {
    date: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`,
    time: `${h}:${m}${timeSuffix}`,
    monthIdx: d.getMonth(),
    year: d.getFullYear(),
  };
}

function groupByMonth(items, months) {
  const groups = {};
  items.forEach((r) => {
    const d = new Date(r.timestamp);
    if (Number.isNaN(d.getTime())) return;
    const key = `${months[d.getMonth()]} ${d.getFullYear() + 543}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups;
}

function History() {
  const { t } = useLang();
  const { selectedFactory, allowedFactories } = useFactory();
  const [viewing, setViewing] = useState(null);
  const [viewingMeasure, setViewingMeasure] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'inspections' | 'comments'

  const [records, setRecords] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [allMeasures, setAllMeasures] = useState([]);

  useEffect(() => {
    fetchAllHistory()
      .then((list) => setRecords([...list].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))))
      .catch(() => setRecords([]));

    fetchAllEquipment()
      .then(setEquipmentList)
      .catch(() => setEquipmentList([]));

    fetchAllMeasures()
      .then(setAllMeasures)
      .catch(() => setAllMeasures([]));
  }, []);

  const getMeasuresForEquipment = (equipmentId) =>
    allMeasures
      .filter((m) => m.equipmentId === equipmentId)
      .map((m) => ({ id: m.id, name: m.measure, formData: m.formData, evalData: m.evalData }));

  const hasMeasures = (equipmentId) =>
    allMeasures.some((m) => m.equipmentId === equipmentId);

  const confirmDelete = (id) => setConfirmId(id);

  const deleteRecord = async () => {
    const id = confirmId;
    setConfirmId(null);
    await deleteHistoryItem(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Combine Inspection Records + Equipment Comments into unified history list
  const combinedHistory = useMemo(() => {
    const list = [];

    // 1. Add Inspection Records
    records.forEach((r) => {
      const eq = r.item || r.equipment || {};
      list.push({
        type: 'inspection',
        id: r.id,
        timestamp: r.savedAt,
        equipmentId: eq.id || 'General',
        factory: eq.factory || '',
        category: eq.category || 'chiller',
        brandModel: eq.brandModel || '',
        note: r.note || '',
        result: r.result || {},
        raw: r,
      });
    });

    // 2. Add Equipment Comments & Maintenance Notes
    equipmentList.forEach((eq) => {
      if (Array.isArray(eq.comments)) {
        eq.comments.forEach((c) => {
          list.push({
            type: 'comment',
            id: c.id || `cm_${eq.id}_${c.createdAt}`,
            timestamp: c.createdAt,
            equipmentId: eq.id,
            factory: eq.factory || '',
            category: eq.category || 'chiller',
            brandModel: eq.brandModel || '',
            author: c.user || 'แอดมิน',
            text: c.text || '',
            equipment: eq,
          });
        });
      }
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [records, equipmentList]);

  const availableYears = useMemo(() =>
    [...new Set(combinedHistory.map((r) => new Date(r.timestamp).getFullYear()))].filter((y) => !Number.isNaN(y)).sort((a, b) => b - a),
  [combinedHistory]);

  const filtered = useMemo(() => combinedHistory.filter((item) => {
    const d = new Date(item.timestamp);
    if (!matchesFactory(item.factory, selectedFactory, allowedFactories)) return false;
    if (activeTab === 'inspections' && item.type !== 'inspection') return false;
    if (activeTab === 'comments' && item.type !== 'comment') return false;
    if (filterMonth !== '' && d.getMonth() !== parseInt(filterMonth)) return false;
    if (filterYear !== '' && d.getFullYear() !== parseInt(filterYear)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = (item.equipmentId || '').toLowerCase().includes(q);
      const matchFactory = (item.factory || '').toLowerCase().includes(q);
      const matchBrand = (item.brandModel || '').toLowerCase().includes(q);
      const matchNote = (item.note || '').toLowerCase().includes(q);
      const matchText = (item.text || '').toLowerCase().includes(q);
      if (!matchId && !matchFactory && !matchBrand && !matchNote && !matchText) return false;
    }
    return true;
  }), [combinedHistory, selectedFactory, allowedFactories, activeTab, filterMonth, filterYear, search]);

  const groups = useMemo(() => groupByMonth(filtered, t.history.months), [filtered, t]);
  const monthKeys = Object.keys(groups);

  const inspectionsCount = useMemo(() => combinedHistory.filter((it) => it.type === 'inspection').length, [combinedHistory]);
  const commentsCount = useMemo(() => combinedHistory.filter((it) => it.type === 'comment').length, [combinedHistory]);

  return (
    <AppLayout hideHeader fullBleed mobileHeaderCenter>
      <div className="flex flex-col min-h-screen">
        <PageHeader title={t.history.pageTitle} subtitle={t.history.subtitle} className="-mt-6 lg:-mt-[2px]">
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

        {/* ── Filter Tabs ── */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#111F35] p-1.5 rounded-2xl border border-[#E4EBF6] dark:border-white/10 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-[#0F2854] text-white shadow-sm'
                  : 'text-gray-500 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
              }`}
            >
              ทั้งหมด ({combinedHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inspections')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'inspections'
                  ? 'bg-[#0F2854] text-white shadow-sm'
                  : 'text-gray-500 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
              }`}
            >
              🔍 ประวัติการตรวจวัด ({inspectionsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'comments'
                  ? 'bg-[#0F2854] text-white shadow-sm'
                  : 'text-gray-500 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
              }`}
            >
              💬 บันทึกข้อความ & การซ่อมบำรุง ({commentsCount})
            </button>
          </div>
        </div>

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
                  <div className="flex flex-col gap-3">
                    {groups[month].map((item) => {
                      const Icon = CATEGORY_ICON[item.category] || SnowflakeIcon;
                      const iconCls = CATEGORY_COLOR[item.category] || 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-[#8CA3C0]';
                      const { date, time } = formatThaiDateTime(item.timestamp, t.history.months, t.history.timeSuffix);

                      // Inspection Item Card
                      if (item.type === 'inspection') {
                        const gradeCls = GRADE_COLOR[item.result?.grade] || '';
                        const gradeLabel = t.common.grade[item.result?.grade] || '';
                        const metrics = item.result?.metrics || [
                          { key: 'coolingLoad', label: 'Cooling Load', value: item.result?.coolingLoad != null ? Number(item.result.coolingLoad).toFixed(1) : '-', unit: 'TR' },
                          { key: 'powerCF', label: 'Power (CF)', value: item.result?.powerCF ?? '-', unit: 'kW' },
                          { key: 'efficiency', label: 'Efficiency', value: item.result?.efficiency ?? '-', unit: 'kW/TR' },
                        ];

                        return (
                          <div
                            key={item.id}
                            className="bg-white dark:bg-[#111F35] rounded-3xl p-4 lg:p-5 shadow-sm border border-[#E4EBF6] dark:border-white/8 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  if (hasMeasures(item.equipmentId)) {
                                    setViewingMeasure({ item: item.raw.item, result: item.result, initialSavedMeasures: getMeasuresForEquipment(item.equipmentId) });
                                  } else {
                                    setViewing({ item: item.raw.item, result: item.result });
                                  }
                                }}
                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                              >
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconCls}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono">{item.equipmentId}</span>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                      ตรวจวัดสมรรถนะ
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-[#8CA3C0] mt-0.5">
                                    {date} | {time} · {item.factory || '-'}
                                  </p>
                                </div>
                              </button>

                              <div className="flex items-center gap-2 shrink-0">
                                {gradeLabel && (
                                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${gradeCls}`}>
                                    {gradeLabel}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => confirmDelete(item.id)}
                                  className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 flex items-center justify-center transition-colors"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Metrics Snapshot */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {metrics.map(({ key, label, value, unit }) => (
                                <div key={key || label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 text-xs font-mono">
                                  <span className="text-[10px] text-gray-400 font-sans">{label}:</span>
                                  <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{value}</span>
                                  {unit && <span className="text-[10px] text-gray-400">{unit}</span>}
                                </div>
                              ))}
                            </div>

                            {/* Inspection Note Box */}
                            {item.note && (
                              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 flex items-start gap-2">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 shrink-0">💬 บันทึกข้อความ:</span>
                                <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">{item.note}</p>
                              </div>
                            )}

                            {hasMeasures(item.equipmentId) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 px-2.5 py-1 rounded-full">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                {t.history.measureSelected}
                              </span>
                            )}
                          </div>
                        );
                      }

                      // Comment / Maintenance Note Card
                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-[#111F35] rounded-3xl p-4 lg:p-5 shadow-sm border border-purple-100 dark:border-purple-500/20 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                <ClipboardIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono">{item.equipmentId}</span>
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                                    บันทึกข้อความ / ซ่อมบำรุง
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-[#8CA3C0] mt-0.5">
                                  ผู้บันทึก: <span className="font-bold text-[#0F2854] dark:text-[#E7EEF7]">{item.author}</span> · {date} | {time} · {item.factory || '-'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-purple-50/40 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 text-xs text-gray-700 dark:text-[#C3D2E5] leading-relaxed font-medium">
                            {item.text}
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
          <div className="relative z-10 w-full h-full lg:h-auto lg:max-h-[90vh] lg:max-w-xl lg:rounded-3xl lg:shadow-2xl overflow-y-auto overflow-x-hidden">
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
