import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import { Panel } from '../../components/ui';
import { matchesFactory, useFactory } from '../../context/factoryStore.js';
import { useLang } from '../../context/languageStore.js';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardIcon,
  GearIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  SparkleIcon,
  TrashIcon,
  CloseIcon,
  ActivityIcon,
  EyeIcon,
  PencilIcon,
  FactoryIcon,
} from '../../components/icons';
import { fetchAllReports, saveReportItem, deleteReportItem } from '../../context/reportsStore.js';
import ReportPrintPreview from './ReportPrintPreview.jsx';

function formatThaiDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d.getDate()} ${thMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default function Report() {
  const { state } = useLocation();
  const { t } = useLang();
  const { selectedFactory, allowedFactories } = useFactory();

  const [reports, setReports] = useState([]);
  // Any editingReport lacking a saved `id` (a report opened straight from a
  // fresh measure evaluation, or a brand-new blank report) gets one assigned
  // once here — never derived lazily during render/useMemo, which would call
  // the impure Date.now() on every recompute.
  const [editingReport, setEditingReport] = useState(() => (
    state ? { ...state, id: state.id || `rpt-${Date.now()}` } : null
  ));
  const [search, setSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  // Tracks whether we're in the "just viewing" flow (eye icon) vs. inside
  // the edit form's own preview button — closing the preview should land
  // back on the report list for the former, but stay on the form for the
  // latter.
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    fetchAllReports()
      .then((list) => setReports([...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))))
      .catch(() => setReports([]));
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (!matchesFactory(r.item?.factory || r.form?.factory, selectedFactory, allowedFactories)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.form?.reportTitle?.toLowerCase().includes(q) ||
        r.form?.equipmentId?.toLowerCase().includes(q) ||
        r.form?.factory?.toLowerCase().includes(q)
      );
    });
  }, [reports, selectedFactory, allowedFactories, search]);

  const handleDeleteReport = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('คุณต้องการลบรายงานนี้ใช่หรือไม่?')) return;
    setReports((prev) => prev.filter((r) => r.id !== id));
    await deleteReportItem(id);
  };

  const handleOpenReport = (r) => {
    setViewOnly(false);
    setShowPreview(false);
    setEditingReport(r);
  };

  const handleViewReport = (r, e) => {
    if (e) e.stopPropagation();
    setViewOnly(true);
    setEditingReport(r);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    if (viewOnly) {
      setViewOnly(false);
      setEditingReport(null);
    }
    setShowPreview(false);
  };

  const handleNewReport = () => {
    setViewOnly(false);
    setShowPreview(false);
    setEditingReport({ id: `rpt-${Date.now()}` });
  };

  // Form State — memoized so these stay referentially stable across re-renders
  // that don't actually change `editingReport` (e.g. typing in the form).
  // Without this, the `|| {}` / `|| []` fallbacks below would create a new
  // object/array every render, and the load-effect further down (which
  // depends on them) would never stop re-firing.
  const item = useMemo(() => editingReport?.item || {}, [editingReport]);
  const result = useMemo(() => editingReport?.result || {}, [editingReport]);
  const measures = useMemo(() => editingReport?.measures || [], [editingReport]);
  const reportId = editingReport?.id;

  const CATEGORY_LABEL = {
    chiller: t.report?.categoryChiller || 'เครื่องทำน้ำเย็น (Chiller)',
    compressor: t.report?.categoryCompressor || 'เครื่องอัดอากาศ (Air Compressor)',
    pump: t.report?.categoryPump || 'ปั๊มน้ำ (Pump)',
    boiler: t.report?.categoryBoiler || 'หม้อไอน้ำ (Boiler)',
    cooling: t.report?.categoryCooling || 'หอระบายความร้อน (Cooling Tower)',
    electrical: t.report?.categoryElectrical || 'ระบบไฟฟ้า (Electrical)',
  };

  const buildBlankForm = (forItem, forMeasures) => ({
    equipmentId: forItem.id || '',
    measureName: forMeasures.map((m) => m.name).join(', '),
    reportTitle: '',
    brandModel: forItem.brandModel || '',
    factory: forItem.factory || '',
    department: forItem.building || '',
    measureOrigin: '',
    measureType: CATEGORY_LABEL[forItem.category] || '',
    objective: '',
    responsible: forItem.owner || '',
    consultant: '',
    approver: '',
    summary: '',
    additionalNotes: '',
  });

  const [form, setForm] = useState(() => (editingReport?.form ? editingReport.form : buildBlankForm(item, measures)));

  // Tracks the exact form object reference that was just loaded (vs. typed
  // by the user) so the autosave effect below can tell the two apart.
  const [loadedForm, setLoadedForm] = useState(form);

  // Reset `form` when `editingReport` changes (opening a different report,
  // or starting a new one) — adjusted during render rather than in an effect
  // so it takes effect in the same commit instead of an extra render pass.
  const [prevEditingReport, setPrevEditingReport] = useState(editingReport);
  if (editingReport !== prevEditingReport) {
    setPrevEditingReport(editingReport);
    const nextForm = editingReport?.form ? editingReport.form : buildBlankForm(item, measures);
    setLoadedForm(nextForm);
    setForm(nextForm);
  }

  const [saving, setSaving] = useState(false);

  const saveReportRecord = async (status) => {
    const record = {
      id: reportId,
      status,
      updatedAt: new Date().toISOString(),
      item,
      result,
      measures,
      form,
    };
    await saveReportItem(record);
    setReports((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === reportId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = record;
        return updated;
      }
      return [record, ...prev];
    });
    return record;
  };

  const handleSaveReport = async () => {
    setSaving(true);
    try {
      await saveReportRecord('done');
      setEditingReport(null);
    } catch (err) {
      console.error('Save report failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Debounced draft autosave — skips the render where `form` was just loaded
  // (programmatic reset, not a real edit) by comparing against loadedForm.
  useEffect(() => {
    if (!editingReport || form === loadedForm) return undefined;
    const timer = setTimeout(() => {
      saveReportRecord('draft').catch((err) => console.error('Autosave draft failed:', err));
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loadedForm, editingReport]);

  return (
    <AppLayout
      title={
        <span className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
          {t.report?.pageTitle || 'รายงานผลการตรวจวิเคราะห์พลังงาน'}
        </span>
      }
      factoryRowBelowTitle
      hideHeaderMobile={!!editingReport && !viewOnly}
    >
      <div className="flex flex-col gap-6 w-full">
        {editingReport && viewOnly ? (
          /* Print-preview-only flow (eye icon) — closing it returns to the list */
          <ReportPrintPreview
            item={item}
            result={result}
            measures={measures}
            form={form}
            onClose={handleClosePreview}
            onEdit={() => { setViewOnly(false); setShowPreview(false); }}
          />
        ) : editingReport ? (
          /* Full Page Report Edit Form */
          <div className="max-w-4xl mx-auto w-full py-6 space-y-6 font-sans">
            {showPreview && (
              <ReportPrintPreview
                item={item}
                result={result}
                measures={measures}
                form={form}
                onClose={handleClosePreview}
              />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="flex sm:hidden items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm shrink-0"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
                    {form.reportTitle || (
                      <>
                        <span className="block sm:inline">รายละเอียดรายงาน</span>{' '}
                        <span className="block sm:inline">ผลการตรวจวิเคราะห์</span>
                      </>
                    )}
                  </h2>
                  <p className="text-sm text-gray-400 dark:text-[#7E93AF] mt-0.5">
                    กรอกข้อมูลรายละเอียดการตรวจวิเคราะห์ มาตรการประหยัดพลังงาน และข้อเสนอแนะด้านล่าง
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-[#EAF4FC] dark:bg-white/10 text-sm font-bold text-[#4988C4] hover:bg-[#D8EBFA] transition-colors shadow-sm"
                >
                  <PrinterIcon className="w-4 h-4" />
                  แสดงตัวอย่างรายงาน (Print)
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  ย้อนกลับ
                </button>
              </div>
            </div>

            {/* SECTION 1: EQUIPMENT BANNER */}
            {item.id && (
              <Panel className="p-6 rounded-3xl bg-gradient-to-r from-[#0F2854] to-[#1C4D8D] text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-extrabold">{item.id}</span>
                    {result.grade && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm uppercase">
                        เกรด {result.grade}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/70 font-semibold">{item.factory || '-'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-white/15 text-xs">
                  <div>
                    <span className="text-white/60 block">ยี่ห้อ / รุ่น:</span>
                    <span className="font-bold text-white text-sm">{item.brandModel || '-'}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block">สถานที่ติดตั้ง:</span>
                    <span className="font-bold text-white text-sm">{item.building || '-'}</span>
                  </div>
                  <div>
                    <span className="text-white/60 block">มาตรการที่เสนอ:</span>
                    <span className="font-bold text-white text-sm truncate block">{form.measureName || '-'}</span>
                  </div>
                </div>
              </Panel>
            )}

            {/* SECTION 2: BASIC REPORT INFO */}
            <Panel className="p-6 space-y-5 rounded-3xl">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
                ข้อมูลเบื้องต้นรายงาน (GENERAL INFORMATION)
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                    หัวข้อรายงาน (Report Title) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น รายงานการตรวจวิเคราะห์มาตรการปรับปรุงประสิทธิภาพ Chiller CH-01"
                    value={form.reportTitle}
                    onChange={(e) => setForm((p) => ({ ...p, reportTitle: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">รหัสอุปกรณ์ (Equipment Tag)</label>
                    <input
                      type="text"
                      value={form.equipmentId}
                      onChange={(e) => setForm((p) => ({ ...p, equipmentId: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ชื่อมาตรการ (Measure Name)</label>
                    <input
                      type="text"
                      value={form.measureName}
                      onChange={(e) => setForm((p) => ({ ...p, measureName: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ยี่ห้อ / รุ่น (Brand Model)</label>
                    <input
                      type="text"
                      value={form.brandModel}
                      onChange={(e) => setForm((p) => ({ ...p, brandModel: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">โรงงาน / บริษัท (Factory)</label>
                    <input
                      type="text"
                      value={form.factory}
                      onChange={(e) => setForm((p) => ({ ...p, factory: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">แผนก / อาคาร (Building/Dept)</label>
                    <input
                      type="text"
                      value={form.department}
                      onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </Panel>

            {/* SECTION 3: ORIGIN & OBJECTIVE */}
            <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-[#4988C4]">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <GearIcon className="w-4 h-4 text-[#4988C4]" />
                ที่มา ประเภท และวัตถุประสงค์ (ORIGIN & OBJECTIVE)
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ที่มาของมาตรการ (Origin)</label>
                    <input
                      type="text"
                      placeholder="เช่น ผลจากการตรวจวัดประจำปี 2026"
                      value={form.measureOrigin}
                      onChange={(e) => setForm((p) => ({ ...p, measureOrigin: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ประเภทมาตรการ (Type)</label>
                    <input
                      type="text"
                      placeholder="เช่น การปรับปรุงประสิทธิภาพเครื่องทำน้ำเย็น"
                      value={form.measureType}
                      onChange={(e) => setForm((p) => ({ ...p, measureType: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">วัตถุประสงค์ของมาตรการ (Objective)</label>
                  <textarea
                    rows={3}
                    placeholder="ระบุวัตถุประสงค์หลัก เช่น เพื่อลดการใช้พลังงานไฟฟ้า และเพิ่มค่า COP..."
                    value={form.objective}
                    onChange={(e) => setForm((p) => ({ ...p, objective: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none resize-none"
                  />
                </div>
              </div>
            </Panel>

            {/* SECTION 4: SUMMARY & NOTES */}
            <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <SparkleIcon className="w-4 h-4 text-emerald-500" />
                สรุปผลการตรวจวิเคราะห์ & ข้อเสนอแนะ (SUMMARY & RECOMMENDATIONS)
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">สรุปผลการวิเคราะห์พลังงาน (Summary)</label>
                  <textarea
                    rows={4}
                    placeholder="กรอกสรุปผลการวิเคราะห์และประมาณการผลประหยัดพลังงาน..."
                    value={form.summary}
                    onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ข้อเสนอแนะเพิ่มเติม (Additional Notes)</label>
                  <textarea
                    rows={3}
                    placeholder="กรอกหมายเหตุ หรือข้อเสนอแนะในการปรับปรุงบำรุงรักษา..."
                    value={form.additionalNotes}
                    onChange={(e) => setForm((p) => ({ ...p, additionalNotes: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none resize-none"
                  />
                </div>
              </div>
            </Panel>

            {/* SECTION 5: STAKEHOLDERS */}
            <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-indigo-500">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <ActivityIcon className="w-4 h-4 text-indigo-500" />
                ผู้รับผิดชอบและผู้ลงนาม (STAKEHOLDERS)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ผู้รับผิดชอบหลัก (Responsible)</label>
                  <input
                    type="text"
                    value={form.responsible}
                    onChange={(e) => setForm((p) => ({ ...p, responsible: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ที่ปรึกษา / ผู้ตรวจวัด (Consultant)</label>
                  <input
                    type="text"
                    placeholder="เช่น ทีมผู้ตรวจวัดพลังงาน"
                    value={form.consultant}
                    onChange={(e) => setForm((p) => ({ ...p, consultant: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ผู้อนุมัติ (Approver)</label>
                  <input
                    type="text"
                    placeholder="เช่น ผู้จัดการโรงงาน"
                    value={form.approver}
                    onChange={(e) => setForm((p) => ({ ...p, approver: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                  />
                </div>
              </div>
            </Panel>

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setEditingReport(null)}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-[#C3D2E5] font-bold text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveReport}
                disabled={saving}
                className="flex-1 py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckIcon className="w-5 h-5" />
                {saving ? 'กำลังบันทึก...' : 'บันทึกรายงานผล'}
              </button>
            </div>
          </div>
        ) : (
          /* Report List View */
          <>
            {/* Toolbar Header */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อรายงาน / รหัสอุปกรณ์ / โรงงาน..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#111F35] border border-[#E4EBF6] dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <CloseIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleNewReport}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-bold shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                สร้างรายงานใหม่
              </button>
            </div>

            {/* Mobile-only floating "new report" button — replaces the text
                button above (sm:hidden), positioned above the bottom nav bar */}
            <button
              type="button"
              onClick={handleNewReport}
              title="สร้างรายงานใหม่"
              className="sm:hidden fixed right-4 bottom-24 z-30 w-14 h-14 rounded-full text-white shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
            >
              <PlusIcon className="w-6 h-6" />
            </button>

            {/* Reports List */}
            {filteredReports.length === 0 ? (
              <Panel className="p-12 text-center text-sm text-gray-400 dark:text-[#7E93AF] rounded-3xl">
                {search ? 'ไม่พบรายงานที่ตรงกับการค้นหา' : 'ยังไม่มีรายงานผลการตรวจวิเคราะห์พลังงานในระบบ กดปุ่ม "สร้างรายงานใหม่" ด้านบนเพื่อเริ่มสร้าง'}
              </Panel>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredReports.map((r) => (
                  <Panel
                    key={r.id}
                    className="p-4 sm:p-5 flex items-center gap-4 hover:shadow-lg hover:border-[#4988C4]/30 dark:hover:border-[#4988C4]/30 transition-all group cursor-pointer"
                    onClick={() => handleOpenReport(r)}
                  >
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
                      <ClipboardIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7] group-hover:text-[#4988C4] transition-colors truncate">
                          {r.form?.reportTitle || r.form?.equipmentId || 'รายงานตรวจวิเคราะห์พลังงาน'}
                        </h3>
                        <span className={`shrink-0 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          r.status === 'done'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                        }`}>
                          {r.status === 'done' ? 'เสร็จสมบูรณ์' : 'กำลังดำเนินการ'}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-400 dark:text-[#7E93AF]">
                        <span className="flex items-center gap-1 min-w-0">
                          <FactoryIcon className="w-3.5 h-3.5 text-[#4988C4] shrink-0" />
                          <span className="truncate">{r.form?.factory || '-'}</span>
                        </span>
                        <span className="shrink-0">อัปเดต: {formatThaiDate(r.updatedAt)}</span>
                        {r.form?.equipmentId && (
                          <span className="shrink-0 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4F7FC] dark:bg-white/5 text-gray-500 dark:text-[#8CA3C0]">
                            {r.form.equipmentId}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleViewReport(r, e)}
                        title="ดูรายงาน"
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-[#EAF4FC] dark:hover:bg-white/10 hover:text-[#4988C4] text-gray-400 flex items-center justify-center transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenReport(r); }}
                        title="แก้ไขรายงาน"
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-[#EAF4FC] dark:hover:bg-white/10 hover:text-[#4988C4] text-gray-500 dark:text-[#8CA3C0] text-xs font-bold transition-colors"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteReport(r.id, e)}
                        title="ลบรายงาน"
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 flex items-center justify-center transition-colors"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
