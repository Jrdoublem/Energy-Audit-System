import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import { matchesFactory, useFactory } from '../../context/factoryStore.js';
import { GlassSearchInput, PageHeader } from '../../components/ui';
import { ChevronDownIcon } from '../../components/icons';

/* ── helpers ── */
const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function loadReports() {
  try { return JSON.parse(localStorage.getItem('reports') || '[]'); } catch { return []; }
}

function saveReports(list) {
  localStorage.setItem('reports', JSON.stringify(list));
}

/* ── shared UI ── */
function Field({ label, value, onChange, placeholder, span2 = false, textarea = false, auto = false }) {
  const inputCls = `w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#4988C4] focus:border-transparent${textarea ? ' resize-none' : ''} ${
    auto ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-[#111F35] border-gray-200 dark:border-white/10 text-gray-700 dark:text-[#E7EEF7]'
  }`;
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <div className="flex items-end gap-1.5 mb-1.5 min-h-[1.25rem]">
        <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] leading-tight">{label}</label>
        {auto && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 leading-none shrink-0">
            auto
          </span>
        )}
      </div>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} className={inputCls} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} className={inputCls} />
      )}
    </div>
  );
}

function SubSection({ title, children }) {
  return (
    <div className="bg-white dark:bg-[#111F35] rounded-2xl px-4 pt-3.5 pb-4 flex flex-col gap-3 shadow-sm">
      <p className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7] border-b border-gray-100 dark:border-white/8 pb-2">{title}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">{children}</div>
    </div>
  );
}

function StepHeader({ num, title }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-[#0F2854] flex items-center justify-center text-white text-sm font-extrabold shrink-0">{num}</div>
      <p className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{title}</p>
    </div>
  );
}

/* ── Report List (nav bar entry) ── */
function ReportList({ onOpen, onNew }) {
  const { selectedFactory, allowedFactories } = useFactory();
  const [reports, setReports] = useState(loadReports);
  const [search, setSearch]   = useState('');

  const filtered = reports.filter((r) => {
    if (!matchesFactory(r.item?.factory || r.form?.factory, selectedFactory, allowedFactories)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.form?.reportTitle?.toLowerCase().includes(q) ||
      r.form?.equipmentId?.toLowerCase().includes(q) ||
      r.form?.factory?.toLowerCase().includes(q)
    );
  });

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const next = reports.filter((r) => r.id !== id);
    saveReports(next);
    setReports(next);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <PageHeader title="รายงานการอนุรักษ์พลังงาน" subtitle="สร้างและจัดการรายงานผลก่อน-หลังของแต่ละมาตรการ">
        <GlassSearchInput value={search} onChange={setSearch} placeholder="ค้นหารายงาน..." className="w-full" />
      </PageHeader>

      <div className="flex-1 px-5 pt-2 pb-32 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 mt-24 text-[#0F2854]/25 dark:text-[#7E93AF]/40">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
            <p className="text-sm">ยังไม่มีรายงาน</p>
          </div>
        ) : (
          filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpen(r)}
              className="w-full text-left bg-white dark:bg-[#111F35] rounded-2xl px-4 py-4 shadow-sm flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                r.status === 'done' ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-amber-100 dark:bg-amber-500/15'
              }`}>
                <svg className={`w-5 h-5 ${r.status === 'done' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] truncate">
                  {r.form?.reportTitle || r.form?.equipmentId || 'ไม่มีชื่อรายงาน'}
                </p>
                <p className="text-xs text-gray-400 dark:text-[#7E93AF] mt-0.5 truncate">
                  {r.form?.equipmentId}{r.form?.equipmentId && ' · '}{formatDate(r.updatedAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  r.status === 'done'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
                    : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20'
                }`}>
                  {r.status === 'done' ? 'เสร็จแล้ว' : 'กำลังทำ'}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(r.id, e)}
                  className="text-red-300 dark:text-red-500/50 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4M3 7h18" />
                  </svg>
                </button>
              </div>
            </button>
          ))
        )}
      </div>

      {/* FAB — Add new report */}
      <button
        type="button"
        onClick={onNew}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white z-10"
        style={{ background: 'linear-gradient(135deg, #0F2854 0%, #4988C4 100%)' }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

/* ── Report Form ── */
function ReportForm({ initData, onBack }) {
  const item     = useMemo(() => initData?.item     || {}, [initData]);
  const result   = useMemo(() => initData?.result   || {}, [initData]);
  const measures = useMemo(() => initData?.measures || [], [initData]);

  const [reportId] = useState(() => initData?.id || `rpt-${Date.now()}`);

  const CATEGORY_LABEL = {
    chiller: 'ระบบทำความเย็น', compressor: 'ระบบอัดอากาศ',
    pump: 'ระบบสูบน้ำ', boiler: 'ระบบหม้อไอน้ำ',
    cooling: 'หอผึ่งน้ำ', electrical: 'ระบบไฟฟ้า',
  };

  const [form, setForm] = useState(() => {
    if (initData?.form) return initData.form;
    return {
      equipmentId:   item.id                              || '',
      measureName:   measures.map((m) => m.name).join(', '),
      reportTitle:   '',
      brandModel:    item.brandModel                       || '',
      factory:       item.factory                          || '',
      department:    item.building                         || '',
      measureOrigin: '',
      measureType:   CATEGORY_LABEL[item.category]         || '',
      objective:     '',
      responsible:   item.owner                            || '',
      consultant:    '',
      approver:      '',
    };
  });

  const autoFields = new Set(
    initData?.form ? [] :
    ['equipmentId','measureName','brandModel','factory','department','measureType','responsible']
      .filter((k) => {
        const initial = {
          equipmentId: item.id, measureName: measures.map((m) => m.name).join(', '),
          brandModel: item.brandModel, factory: item.factory,
          department: item.building, measureType: CATEGORY_LABEL[item.category],
          responsible: item.owner,
        };
        return !!initial[k];
      })
  );

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  /* auto-save draft on every change */
  useEffect(() => {
    const existing = loadReports();
    const idx      = existing.findIndex((r) => r.id === reportId);
    const record   = {
      id:        reportId,
      status:    'draft',
      updatedAt: new Date().toISOString(),
      item, result, measures, form,
    };
    if (idx !== -1) { existing[idx] = { ...existing[idx], ...record }; }
    else            { existing.unshift(record); }
    saveReports(existing);
  }, [form, item, result, measures, reportId]);

  const handleSave = () => {
    const existing = loadReports();
    const idx      = existing.findIndex((r) => r.id === reportId);
    const record   = { id: reportId, status: 'done', updatedAt: new Date().toISOString(), item, result, measures, form };
    if (idx !== -1) existing[idx] = record;
    else existing.unshift(record);
    saveReports(existing);
    onBack();
  };

  return (
    <div className="flex flex-col min-h-screen">

      {/* Back button */}
      <div className="shrink-0 px-5 pt-14 lg:pt-6 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white dark:bg-[#111F35] shadow-sm hover:bg-[#F4F7FC] dark:hover:bg-white/5 flex items-center justify-center text-[#0F2854] dark:text-[#E7EEF7] transition-colors"
        >
          <ChevronDownIcon className="w-5 h-5 rotate-90" />
        </button>
      </div>

      {/* Equipment card */}
      <div className="mx-5 rounded-2xl bg-[#0F2854] px-4 py-4 mb-5 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-lg font-extrabold text-white">{item.id || 'อุปกรณ์'}</p>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
            {result.grade === 'good' ? 'ดี' : result.grade === 'ok' ? 'ปานกลาง' : result.grade === 'poor' ? 'ต้องปรับปรุง' : 'สถานะ'}
          </span>
        </div>
        <p className="text-xs text-white/60">ยี่ห้อ / รุ่นและอาคาร</p>
        <p className="text-sm text-white/80 font-medium truncate">{item.brandModel || '-'}</p>
        <p className="text-xs text-white/60 mt-1">โรงงาน / บริษัท</p>
        <p className="text-sm text-white/80 font-medium truncate">{item.factory || '-'}</p>
      </div>

      {/* Form sections */}
      <div className="flex-1 px-5 pb-32 flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <StepHeader num="1" title="ข้อมูลเบื้องต้นอุปกรณ์" />

          <SubSection title="เลือกเครื่องจักรและมาตรการ">
            <Field label="อุปกรณ์*"  value={form.equipmentId} onChange={set('equipmentId')} auto={autoFields.has('equipmentId')} />
            <Field label="มาตรการ"   value={form.measureName} onChange={set('measureName')} auto={autoFields.has('measureName')} />
          </SubSection>

          <SubSection title="ข้อมูลทั่วไป">
            <Field label="ชื่อรายงาน / หัวข้อ" value={form.reportTitle} onChange={set('reportTitle')} span2 />
            <Field label="ชื่อ / รุ่น"           value={form.brandModel}  onChange={set('brandModel')}  auto={autoFields.has('brandModel')} />
            <Field label="ชื่อโรงงาน / บริษัท"  value={form.factory}     onChange={set('factory')}     auto={autoFields.has('factory')} />
            <Field label="แผนก / อาคาร"          value={form.department}  onChange={set('department')}  auto={autoFields.has('department')} />
          </SubSection>

          <SubSection title="ที่มาและวัตถุประสงค์">
            <Field label="ที่มาของมาตรการ"          value={form.measureOrigin} onChange={set('measureOrigin')} />
            <Field label="ประเภทมาตรการ"            value={form.measureType}   onChange={set('measureType')}   auto={autoFields.has('measureType')} />
            <Field label="วัตถุประสงค์ / เป้าหมาย" value={form.objective}     onChange={set('objective')}     span2 textarea />
          </SubSection>

          <SubSection title="ผู้เกี่ยวข้อง">
            <Field label="ผู้รับผิดชอบ" value={form.responsible} onChange={set('responsible')} span2 auto={autoFields.has('responsible')} />
            <Field label="ที่ปรึกษา"    value={form.consultant}  onChange={set('consultant')} />
            <Field label="ผู้อนุมัติ"   value={form.approver}    onChange={set('approver')} />
          </SubSection>
        </div>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 inset-x-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#BDE8F5] dark:from-[#0B1B33] via-[#BDE8F5]/80 dark:via-[#0B1B33]/80 to-transparent pointer-events-none">
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 pointer-events-auto"
          style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
        >
          บันทึก
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Main ── */
function Report() {
  const { state } = useLocation();
  const [editing, setEditing] = useState(state ? { ...state } : null);

  return (
    <AppLayout hideHeader fullBleed>
      {editing ? (
        <ReportForm initData={editing} onBack={() => setEditing(null)} />
      ) : (
        <ReportList
          onOpen={(r) => setEditing(r)}
          onNew={() => setEditing({})}
        />
      )}
    </AppLayout>
  );
}

export default Report;
