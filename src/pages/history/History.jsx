import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import AppLayout, { RoleBadge, FactorySelect } from '../../layouts/AppLayout';
import { matchesFactory, useFactory } from '../../context/factoryStore.js';
import { fetchAllMeasures } from '../../context/measuresStore.js';
import { fetchAllHistory, deleteHistoryItem } from '../../context/historyStore.js';
import { fetchAllEquipment } from '../../context/equipmentStore.js';
import { getSession } from '../../context/authStore.js';
import { useLang } from '../../context/languageStore.js';
import { GlassSearchInput, GlassSelect, Panel } from '../../components/ui';
import CalcResult from '../equipment/CalcResult';
import MeasureSelect from './MeasureSelect';
import {
  SnowflakeIcon, DropletIcon, FlameIcon, LightningIcon,
  CoolingTowerIcon, CompressorIcon, TrashIcon,
  ClipboardIcon, EyeIcon, SearchIcon, MessageIcon,
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
  const { factories, selectedFactory, setSelectedFactory, refreshFactories, allowedFactories } = useFactory();
  const session = getSession();
  const roleLabel = session.role === 'admin' ? t.nav.roleAdmin : t.nav.roleUser;
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
      .map((m) => ({
        id: m.id,
        name: m.measure,
        formData: m.formData,
        evalData: m.evalData,
        afterImages: m.afterImages || m.images || [],
      }));

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
    <AppLayout
      hideHeader={!viewing && !viewingMeasure}
      fullBleed={!viewing && !viewingMeasure}
      mobileHeaderCenter
      hideRoleBadge={!viewing && !viewingMeasure}
      hideFactorySelect={!viewing && !viewingMeasure}
      factoryRowBelowTitle
      hideHeaderMobile={!!viewing || !!viewingMeasure}
    >
      {viewingMeasure ? (
        <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
          <MeasureSelect
            item={viewingMeasure.item}
            result={viewingMeasure.result}
            initialSavedMeasures={viewingMeasure.initialSavedMeasures}
            onClose={() => setViewingMeasure(null)}
          />
        </div>
      ) : viewing ? (
        <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
          <CalcResult
            item={viewing.item}
            result={viewing.result}
            onBack={() => setViewing(null)}
            readOnly
            onMeasure={() => {
              setViewingMeasure({
                item: viewing.item,
                result: viewing.result,
                initialSavedMeasures: getMeasuresForEquipment(viewing.item?.id),
              });
              setViewing(null);
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col min-h-screen">
          <PageHeader title={t.history.pageTitle} subtitle={t.history.subtitle} className="-mt-6 lg:-mt-[2px]">
            <div className="w-full flex justify-center lg:justify-start items-center gap-2">
              <RoleBadge role={roleLabel} stretch />
              <FactorySelect
                selectedFactory={selectedFactory}
                setSelectedFactory={setSelectedFactory}
                refreshFactories={refreshFactories}
                factories={factories}
                role={session.role}
                t={t}
                stretch
              />
            </div>
          </PageHeader>

          {/* ── Filter & Search Controls ── */}
          <div className="px-5 pt-4 pb-2 space-y-3">
            {/* Filter Tabs */}
            <div className="w-full flex items-stretch gap-1.5 bg-white dark:bg-[#111F35] p-1.5 rounded-2xl border border-[#E4EBF6] dark:border-white/10 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 lg:px-6 lg:py-3 rounded-xl text-xs lg:text-sm font-bold text-center transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#0F2854] text-white shadow-sm'
                    : 'text-gray-500 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
                }`}
              >
                <span className="hidden lg:inline whitespace-nowrap">ทั้งหมด ({combinedHistory.length})</span>
                <span className="lg:hidden whitespace-nowrap">ทั้งหมด</span>
                <span className="lg:hidden text-[10px] font-mono opacity-70">({combinedHistory.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inspections')}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 lg:px-6 lg:py-3 rounded-xl text-xs lg:text-sm font-bold text-center transition-all ${
                  activeTab === 'inspections'
                    ? 'bg-[#0F2854] text-white shadow-sm'
                    : 'text-gray-500 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
                }`}
              >
                <span className="hidden lg:flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <SearchIcon className="w-3.5 h-3.5 shrink-0" />
                  ประวัติตรวจวัด ({inspectionsCount})
                </span>
                <span className="flex lg:hidden items-center justify-center gap-1.5 whitespace-nowrap">
                  <SearchIcon className="w-3.5 h-3.5 shrink-0" />
                  ประวัติ
                </span>
                <span className="lg:hidden whitespace-nowrap">ตรวจวัด ({inspectionsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 lg:px-6 lg:py-3 rounded-xl text-xs lg:text-sm font-bold text-center transition-all ${
                  activeTab === 'comments'
                    ? 'bg-[#0F2854] text-white shadow-sm'
                    : 'text-gray-500 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
                }`}
              >
                <span className="hidden lg:flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <MessageIcon className="w-3.5 h-3.5 shrink-0" />
                  บันทึกข้อความการซ่อมบำรุง ({commentsCount})
                </span>
                <span className="flex lg:hidden items-center justify-center gap-1.5 whitespace-nowrap">
                  <MessageIcon className="w-3.5 h-3.5 shrink-0" />
                  บันทึกข้อความ
                </span>
                <span className="lg:hidden whitespace-nowrap">การซ่อมบำรุง ({commentsCount})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
            </div>

            <GlassSearchInput value={search} onChange={setSearch} placeholder={t.history.searchPlaceholder} className="w-full" />
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

                        const isChiller = item.category === 'chiller' || item.result?.coolingLoad != null;
                        const ultraFromMetrics = item.result?.metrics?.find(
                          (m) => m.key === 'ultraflowSonic' || m.label?.toLowerCase().includes('ultraflow')
                        )?.value;

                        const ultraVal =
                          item.result?.ultraflowSonic ??
                          item.result?.inputs?.ultraflowSonic ??
                          item.raw?.calcForm?.ultraflowSonic ??
                          item.raw?.inputs?.ultraflowSonic ??
                          ultraFromMetrics ??
                          item.result?.flowRate ??
                          item.result?.flow ??
                          (isChiller && item.result?.coolingLoad ? (Number(item.result.coolingLoad) * 24 / 10).toFixed(0) : null);

                        const ultraUnit =
                          item.result?.flowUnit ??
                          item.result?.inputs?.flowUnit ??
                          item.raw?.calcForm?.flowUnit ??
                          'GPM';

                        const rawMetrics = item.result?.metrics || [
                          { key: 'coolingLoad', label: 'Cooling Load', value: item.result?.coolingLoad != null ? Number(item.result.coolingLoad).toFixed(1) : '-', unit: 'TR' },
                          { key: 'powerCF', label: 'Power (CF)', value: item.result?.powerCF ?? '-', unit: 'kW' },
                          { key: 'efficiency', label: 'Efficiency', value: item.result?.efficiency ?? '-', unit: 'kW/TR' },
                        ];

                        const hasUltraInRaw = rawMetrics.some(
                          (m) => m.key === 'ultraflowSonic' || m.label?.toLowerCase().includes('ultraflow')
                        );

                        const metrics = hasUltraInRaw
                          ? rawMetrics
                          : ultraVal != null
                          ? [{ key: 'ultraflowSonic', label: 'Ultraflow Sonic', value: String(ultraVal), unit: ultraUnit }, ...rawMetrics]
                          : rawMetrics;

                        return (
                          <div
                            key={item.id}
                            className="bg-white dark:bg-[#111F35] rounded-3xl p-4 lg:p-5 shadow-sm border border-[#E4EBF6] dark:border-white/8 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  const resolvedItem = item.raw?.item || item.raw?.equipment || {
                                    id: item.equipmentId,
                                    category: item.category,
                                    factory: item.factory,
                                    brandModel: item.brandModel,
                                  };
                                  if (hasMeasures(item.equipmentId)) {
                                    setViewingMeasure({ item: resolvedItem, result: item.result, initialSavedMeasures: getMeasuresForEquipment(item.equipmentId) });
                                  } else {
                                    setViewing({ item: resolvedItem, result: item.result });
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
                                <span className="flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-300 shrink-0">
                                  <MessageIcon className="w-3.5 h-3.5 shrink-0" />
                                  บันทึกข้อความ:
                                </span>
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
                          className="bg-white dark:bg-[#111F35] rounded-3xl p-4 lg:p-5 shadow-sm border border-[#E4EBF6] dark:border-white/8 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconCls}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono">{item.equipmentId}</span>
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                    ข้อความ
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-[#8CA3C0] mt-0.5">
                                  {date} | {time} · {item.factory || '-'}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => confirmDelete(item.id)}
                              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 flex items-center justify-center transition-colors shrink-0"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#0F2854] dark:text-[#E7EEF7]">{item.author}</span>
                              {item.badge && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-white/10 text-gray-500 dark:text-[#8CA3C0] border border-[#E4EBF6] dark:border-white/10 font-bold">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-[#C3D2E5] leading-relaxed whitespace-pre-wrap">{item.text}</p>
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
    )}

      {/* Delete Confirmation Modal */}
      {confirmId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmId(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white dark:bg-[#111F35] p-6 shadow-2xl space-y-4 text-center border border-[#E4EBF6] dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <TrashIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">ยืนยันการลบข้อมูล</p>
              <p className="text-xs text-gray-500 dark:text-[#8CA3C0]">คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
            </div>
            <div className="flex gap-2">
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
                className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm transition-colors"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}

export default History;
