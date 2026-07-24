import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../../layouts/AppLayout';
import { useFactory } from '../../context/factoryStore.js';
import CalcResult from '../equipment/CalcResult';
import MeasureSelect from './MeasureSelect';
import {
  SnowflakeIcon, DropletIcon, FlameIcon, LightningIcon,
  CoolingTowerIcon, CompressorIcon, TrashIcon, ChevronDownIcon,
} from '../../components/icons';

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const CATEGORY_ICON = {
  chiller: SnowflakeIcon, compressor: CompressorIcon, pump: DropletIcon,
  boiler: FlameIcon, cooling: CoolingTowerIcon, electrical: LightningIcon,
};
const CATEGORY_COLOR = {
  chiller: 'bg-blue-100 text-blue-600', compressor: 'bg-purple-100 text-purple-600',
  pump: 'bg-cyan-100 text-cyan-600', boiler: 'bg-orange-100 text-orange-600',
  cooling: 'bg-teal-100 text-teal-600', electrical: 'bg-yellow-100 text-yellow-600',
};
const GRADE_COLOR  = { good: 'bg-green-100 text-green-600', ok: 'bg-orange-100 text-orange-500', poor: 'bg-red-100 text-red-500' };
const GRADE_LABEL  = { good: 'เกณฑ์ดี', ok: 'ปานกลาง', poor: 'ต้องปรับปรุง' };

function formatThaiDateTime(iso) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return {
    date: `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()+543}`,
    time: `${h}:${m} น.`,
    monthIdx: d.getMonth(),
    year: d.getFullYear(),
  };
}

function groupByMonth(records) {
  const groups = {};
  records.forEach((r) => {
    const d = new Date(r.savedAt);
    const key = `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()+543}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });
  return groups;
}

function FilterSelect({ value, onChange, placeholder, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white/20 hover:bg-white/30 text-white text-xs font-semibold pl-3 pr-7 py-2 rounded-full focus:outline-none transition-colors cursor-pointer"
      >
        <option value="" className="text-gray-800">{placeholder}</option>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/80" />
    </div>
  );
}

function History() {
  const { selectedFactory } = useFactory();
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

  const allMeasures = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('measures') || '[]'); }
    catch { return []; }
  }, []);

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
    if (selectedFactory && eq.factory !== selectedFactory) return false;
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
  }), [records, selectedFactory, filterMonth, filterYear, search]);

  const groups    = useMemo(() => groupByMonth(filtered), [filtered]);
  const monthKeys = Object.keys(groups);

  return (
    <AppLayout hideHeader fullBleed>
      <div className="flex flex-col min-h-screen bg-[#DDF1F3]">

        {/* ── Blue header card ── */}
        <div
          className="shrink-0 px-5 pt-14 lg:pt-8 pb-7 rounded-b-3xl lg:rounded-b-none lg:rounded-br-[3rem] bg-[#0F2854]"
        >
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white text-center mb-4">
            ประวัติการตรวจอุปกรณ์
          </h1>

          {/* Filter pills — centered */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <FilterSelect value={filterMonth} onChange={setFilterMonth} placeholder="ทุกเดือน">
              {THAI_MONTHS.map((m, i) => (
                <option key={i} value={i} className="text-gray-800">{m}</option>
              ))}
            </FilterSelect>
            <FilterSelect value={filterYear} onChange={setFilterYear} placeholder="ทุกปี">
              {availableYears.map((y) => (
                <option key={y} value={y} className="text-gray-800">{y+543}</option>
              ))}
            </FilterSelect>
            {(filterMonth !== '' || filterYear !== '') && (
              <button
                type="button"
                onClick={() => { setFilterMonth(''); setFilterYear(''); }}
                className="text-xs text-white/70 hover:text-white underline underline-offset-2 transition-colors"
              >
                รีเซ็ต
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาอุปกรณ์..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/15 placeholder-white/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 px-5 pt-6 pb-28 lg:pb-10">
          {monthKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 mt-24 text-gray-300">
              <svg className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              <p className="text-sm">ยังไม่มีประวัติการตรวจวัด</p>
            </div>
          ) : (
            <div className="flex flex-col gap-7">
              {monthKeys.map((month) => (
                <div key={month}>
                  <p className="text-sm font-bold text-[#0F2854] mb-3">{month}</p>
                  <div className="flex flex-col gap-2">
                    {groups[month].map((record) => {
                      const eq        = record.item || record.equipment || {};
                      const Icon      = CATEGORY_ICON[eq.category] || SnowflakeIcon;
                      const iconCls   = CATEGORY_COLOR[eq.category] || 'bg-gray-100 text-gray-500';
                      const gradeCls  = GRADE_COLOR[record.result.grade] || '';
                      const gradeLabel = GRADE_LABEL[record.result.grade] || '';
                      const { date, time } = formatThaiDateTime(record.savedAt);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 bg-white rounded-2xl px-4 py-5 lg:py-3.5 shadow-sm"
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
                              <p className="text-sm lg:text-base font-bold text-[#0F2854] truncate">{eq.id}</p>
                              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 truncate">{date} | {time}</p>
                              {eq.factory && <p className="text-xs lg:text-sm text-gray-400 truncate">{eq.factory}</p>}
                              {hasMeasures(eq.id) && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  เลือกมาตรการแล้ว
                                </span>
                              )}
                            </div>
                            {/* Desktop-only metrics */}
                            <div className="hidden lg:flex flex-1 items-center justify-end gap-4 px-4">
                              {[
                                ['Cooling Load', record.result.coolingLoad != null ? Number(record.result.coolingLoad).toFixed(1) : '-', 'TR'],
                                ['Power (CF)',   record.result.powerCF ?? '-', 'kW'],
                                ['Efficiency',   record.result.efficiency ?? '-', 'kW/TR'],
                              ].map(([label, val, unit]) => (
                                <div key={label} className="flex flex-col items-center bg-gray-50 rounded-xl px-4 py-2 min-w-[90px]">
                                  <p className="text-[11px] text-gray-400 leading-tight">{label}</p>
                                  <p className="text-base font-extrabold text-[#0F2854]">{val}</p>
                                  <p className="text-[11px] text-gray-400">{unit}</p>
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
                              className="w-full py-1 lg:py-1.5 rounded-full bg-red-100 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <TrashIcon className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0" />
                              <span className="text-[11px] lg:text-sm font-semibold">ลบ</span>
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
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                <TrashIcon className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-[#0F2854]">ลบรายการนี้?</p>
              <p className="text-sm text-gray-400">รายการที่ลบแล้วจะไม่สามารถกู้คืนได้</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={deleteRecord}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                ลบ
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
