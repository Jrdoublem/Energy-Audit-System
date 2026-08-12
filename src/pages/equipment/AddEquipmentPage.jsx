import { useState, useEffect, useMemo } from 'react';
import { Panel } from '../../components/ui';
import { Select } from '../../components/Dropdown.jsx';
import { useLang } from '../../context/languageStore.js';
import { fetchAllHistory } from '../../context/historyStore.js';
import { getSession } from '../../context/authStore.js';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardIcon,
  GearIcon,
  LightningIcon,
  SparkleIcon,
  ActivityIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  MessageIcon,
} from '../../components/icons';

const CURRENT_YEAR = new Date().getFullYear();

function formatThaiDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const day = d.getDate();
  const month = thMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
}

const GRADE_LABELS = {
  good: { text: 'เกรดดีมาก (Good)', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' },
  ok: { text: 'เกรดพอใช้ (OK)', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' },
  poor: { text: 'เกรดต้องปรับปรุง (Poor)', bg: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border-rose-200 dark:border-rose-500/30' },
};

export default function AddEquipmentPage({
  initialData = {},
  onSave,
  onCancel,
  categoriesList = [],
  factoriesList = [],
  catalogItems = [],
  isEditing = false,
  getNextId,
}) {
  const { t } = useLang();
  const currentUserName = getSession().name || 'แอดมิน';
  const [form, setForm] = useState({
    id: initialData.id || '',
    factory: initialData.factory || (factoriesList[0] || ''),
    category: initialData.category || 'chiller',
    building: initialData.building || '',
    installYear: initialData.installYear || String(CURRENT_YEAR),
    brand: initialData.brand || (initialData.brandModel ? initialData.brandModel.split(' ')[0] : ''),
    model: initialData.model || (initialData.brandModel ? initialData.brandModel.split(' ').slice(1).join(' ') : ''),
    brandModel: initialData.brandModel || '',
    ratedCapacity: initialData.ratedCapacity || initialData.spec || '',
    chillerPower: initialData.chillerPower || initialData.electricalPower || '',
    coolingCapacity: initialData.coolingCapacity || initialData.capacityTR || '',
    chillerEfficiency: initialData.chillerEfficiency || initialData.specificPower || '',
    operatingHours: initialData.operatingHours || '8000',
    loadFactor: initialData.loadFactor || '0.8',
    owner: initialData.owner || '',
  });

  const [commentsList, setCommentsList] = useState(() => initialData.comments || []);
  const [newCommentText, setNewCommentText] = useState('');
  const [inspectionHistory, setInspectionHistory] = useState([]);
  const [timelineTab, setTimelineTab] = useState('all'); // 'all' | 'inspections' | 'comments'

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch inspection history from Firestore for this equipment
  useEffect(() => {
    if (initialData.id) {
      fetchAllHistory()
        .then((list) => {
          const matched = list.filter(
            (h) => (h.item?.id || h.equipment?.id || '') === initialData.id
          );
          setInspectionHistory(matched.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)));
        })
        .catch(() => setInspectionHistory([]));
    }
  }, [initialData.id]);

  const ageYears = form.installYear
    ? Math.max(0, CURRENT_YEAR - parseInt(form.installYear, 10))
    : 0;

  const makeComment = (text) => ({
    id: 'cm_' + Date.now(),
    createdAt: new Date().toISOString(),
    user: currentUserName,
    text,
  });

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    setCommentsList([makeComment(newCommentText.trim()), ...commentsList]);
    setNewCommentText('');
  };

  const [catalogPick, setCatalogPick] = useState('');

  const handleCatalogSelect = (catId) => {
    setCatalogPick(catId);
    const item = catalogItems.find((c) => c.id === catId);
    if (!item) return;
    setForm((prev) => ({
      ...prev,
      brand: item.brand || '',
      model: item.model || '',
      brandModel: `${item.brand || ''} ${item.model || ''}`.trim(),
      ratedCapacity: item.spec || item.ratedCapacity || '',
      chillerPower: item.specificPower
        ? String(item.specificPower * parseFloat(item.coolingCapacity || 500))
        : (item.chillerPower || ''),
      coolingCapacity: item.coolingCapacity || '500',
      chillerEfficiency: item.specificPower ? String(item.specificPower) : (item.chillerEfficiency || ''),
    }));
  };

  // Combine comments and inspection history into unified chronological timeline
  const combinedTimeline = useMemo(() => {
    const items = [];

    // Add comments
    commentsList.forEach((c) => {
      items.push({
        type: 'comment',
        id: c.id,
        timestamp: c.createdAt,
        user: c.user || 'แอดมิน',
        text: c.text,
      });
    });

    // Add inspection history
    inspectionHistory.forEach((h) => {
      items.push({
        type: 'inspection',
        id: h.id,
        timestamp: h.savedAt,
        user: h.item?.owner || 'ผู้ตรวจวัดพลังงาน',
        note: h.note,
        result: h.result,
      });
    });

    // Sort descending (newest first)
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (timelineTab === 'inspections') {
      return items.filter((it) => it.type === 'inspection');
    }
    if (timelineTab === 'comments') {
      return items.filter((it) => it.type === 'comment');
    }
    return items;
  }, [commentsList, inspectionHistory, timelineTab]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.id.trim()) {
      setError(t.equipment?.fieldId || 'กรุณาระบุรหัสอุปกรณ์ (Equipment Tag)');
      return;
    }
    setError('');
    setSaving(true);
    try {
      let finalComments = [...commentsList];
      if (newCommentText.trim()) {
        finalComments = [makeComment(newCommentText.trim()), ...finalComments];
      } else if (isEditing && commentsList.length === (initialData.comments || []).length) {
        finalComments = [makeComment('ปรับปรุงรายละเอียดข้อมูลอุปกรณ์'), ...finalComments];
      } else if (!isEditing && commentsList.length === 0) {
        finalComments = [makeComment('ลงทะเบียนเพิ่มอุปกรณ์ใหม่เข้าสู่ระบบ')];
      }

      const fullData = {
        ...form,
        id: form.id.trim(),
        brandModel: `${form.brand || ''} ${form.model || ''}`.trim() || form.brandModel || '',
        comments: finalComments,
      };
      await onSave(fullData);
    } catch (err) {
      console.error('Save equipment failed:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
            {isEditing ? 'แก้ไขรายละเอียดอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}
          </h2>
          <p className="text-sm lg:text-base text-gray-400 dark:text-[#7E93AF] mt-0.5">
            กรอกรายละเอียดข้อมูลอุปกรณ์ด้านล่างให้ครบถ้วน ข้อมูลทั้งหมดจะถูกบันทึกลงฐานข้อมูล Firestore
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-bold text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm shrink-0"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          ยกเลิก
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs lg:text-sm font-bold">
          {error}
        </div>
      )}

      {/* SECTION 1: IDENTIFICATION */}
      <Panel className="p-6 space-y-5 rounded-3xl">
        <div className="flex items-center gap-2 text-xs lg:text-sm font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
          <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
          ข้อมูลทะเบียนอุปกรณ์ (IDENTIFICATION)
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              รหัสอุปกรณ์ (Equipment Tag) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น CH-01, CP-01"
              value={form.id}
              onChange={(e) => { setForm({ ...form, id: e.target.value }); setError(''); }}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                โรงงาน / บริษัท (Factory) <span className="text-rose-500">*</span>
              </label>
              <Select
                value={form.factory}
                onChange={(v) => setForm({ ...form, factory: v })}
                options={factoriesList}
                triggerClassName="flex items-center w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                หมวดหมู่อุปกรณ์ (Category) <span className="text-rose-500">*</span>
              </label>
              <Select
                value={form.category}
                onChange={(nextCategory) => {
                  // Adding new equipment: keep the equipment tag in sync with
                  // its category (e.g. CH-01 -> AC-01) so it doesn't silently
                  // keep a stale prefix from the previously selected category.
                  const nextId = !isEditing && getNextId ? getNextId(nextCategory) : form.id;
                  setForm({ ...form, category: nextCategory, id: nextId });
                }}
                options={categoriesList.map((c) => ({ value: c.key, label: c.label || c.key }))}
                triggerClassName="flex items-center w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">แผนก / อาคารที่ติดตั้ง</label>
              <input
                type="text"
                placeholder="เช่น อาคารผลิต 1, ห้อง Chiller"
                value={form.building}
                onChange={(e) => setForm({ ...form, building: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ปีที่ติดตั้ง (พ.ศ. / ค.ศ.)</label>
              <input
                type="number"
                placeholder={String(CURRENT_YEAR)}
                value={form.installYear}
                onChange={(e) => setForm({ ...form, installYear: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
              {ageYears > 0 && (
                <span className="text-[11px] lg:text-xs text-gray-400 dark:text-[#7E93AF] mt-1 block">
                  อายุการใช้งาน: {ageYears} ปี
                </span>
              )}
            </div>

            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ผู้รับผิดชอบ / ผู้ดูแล</label>
              <input
                type="text"
                placeholder="เช่น นายช่างสมศักดิ์"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Panel>

      {/* SECTION 2: SPECIFICATIONS & CATALOG PRESET */}
      <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-[#4988C4]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-xs lg:text-sm font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
            <GearIcon className="w-4 h-4 text-[#4988C4] shrink-0" />
            คุณสมบัติทางเทคนิค (SPECIFICATIONS)
          </div>
          {catalogItems.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SparkleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <Select
                value={catalogPick}
                onChange={handleCatalogSelect}
                placeholder="-- เลือกจากแคตตาล็อกเพื่อเติมอัตโนมัติ --"
                options={catalogItems.map((c) => ({ value: c.id, label: `${c.brand} ${c.model} (${c.id})` }))}
                className="w-full sm:w-auto"
                triggerClassName="flex items-center gap-1.5 w-full sm:w-auto text-xs lg:text-sm font-bold px-3 py-1.5 rounded-xl bg-[#EAF4FC] dark:bg-white/10 text-[#4988C4] dark:text-[#E7EEF7] border border-[#D0E4F7] dark:border-white/10 focus:outline-none"
                panelClassName="min-w-[16rem]"
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ยี่ห้อ (Brand)</label>
              <input
                type="text"
                placeholder="เช่น Daikin, Carrier, York, Grundfos"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">รุ่น (Model)</label>
              <input
                type="text"
                placeholder="เช่น EWAD-TZ, 30XW, YVWA"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">กำลังไฟฟ้าพิกัด (kW)</label>
              <div className="relative flex items-center">
                <LightningIcon className="absolute left-3.5 w-4 h-4 text-amber-500" />
                <input
                  type="number"
                  placeholder="เช่น 350"
                  value={form.chillerPower}
                  onChange={(e) => setForm({ ...form, chillerPower: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ขนาดความเย็น (TR)</label>
              <input
                type="number"
                placeholder="เช่น 500"
                value={form.coolingCapacity}
                onChange={(e) => setForm({ ...form, coolingCapacity: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ประสิทธิภาพ (kW/TR)</label>
              <div className="relative flex items-center">
                <ActivityIcon className="absolute left-3.5 w-4 h-4 text-[#4988C4]" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="คำนวณอัตโนมัติ หรือ กรอกเอง"
                  value={form.chillerEfficiency}
                  onChange={(e) => setForm({ ...form, chillerEfficiency: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ชั่วโมงทำงานต่อปี (hrs/yr)</label>
              <input
                type="number"
                placeholder="เช่น 8000"
                value={form.operatingHours}
                onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">สัดส่วนภาระการทำงานเฉลี่ย (Average Load Factor 0-1)</label>
              <input
                type="number"
                step="0.05"
                placeholder="เช่น 0.8"
                value={form.loadFactor}
                onChange={(e) => setForm({ ...form, loadFactor: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Panel>

      {/* SECTION 3: INSPECTION LOGS & CHANGE HISTORY */}
      <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-purple-500">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs lg:text-sm font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
            <PencilIcon className="w-4 h-4 text-purple-500" />
            ประวัติการตรวจวัด & บันทึกข้อความ (INSPECTIONS & CHANGE HISTORY)
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 p-0.5 rounded-xl text-xs lg:text-sm font-bold">
            <button
              type="button"
              onClick={() => setTimelineTab('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                timelineTab === 'all'
                  ? 'bg-white dark:bg-[#0F2854] text-[#0F2854] dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-[#7E93AF]'
              }`}
            >
              ทั้งหมด ({commentsList.length + inspectionHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setTimelineTab('inspections')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                timelineTab === 'inspections'
                  ? 'bg-white dark:bg-[#0F2854] text-[#0F2854] dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-[#7E93AF]'
              }`}
            >
              <SearchIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
              ประวัติการตรวจวัด ({inspectionHistory.length})
            </button>
            <button
              type="button"
              onClick={() => setTimelineTab('comments')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                timelineTab === 'comments'
                  ? 'bg-white dark:bg-[#0F2854] text-[#0F2854] dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-[#7E93AF]'
              }`}
            >
              <MessageIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
              บันทึกข้อความ ({commentsList.length})
            </button>
          </div>
        </div>

        {/* Add comment box */}
        <div className="space-y-3 p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10">
          <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] block">
            เพิ่มบันทึกการซ่อมบำรุง / หมายเหตุการแก้ไข
          </label>
          <div className="flex gap-2">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="พิมพ์ข้อความบันทึก เช่น เปลี่ยนน้ำมันเครื่อง, แก้ไขกำลังไฟฟ้า, ตรวจเช็คประจำปี..."
              rows={2}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-purple-400 focus:outline-none resize-none"
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!newCommentText.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs lg:text-sm transition-colors self-end shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              เพิ่มบันทึก
            </button>
          </div>
        </div>

        {/* Timeline of events (Inspections + Comments) */}
        {combinedTimeline.length === 0 ? (
          <p className="text-xs lg:text-sm text-gray-400 dark:text-[#7E93AF] text-center py-6">
            ยังไม่มีประวัติการตรวจวัดหรือบันทึกข้อความสำหรับอุปกรณ์นี้
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {combinedTimeline.map((item, idx) => {
              if (item.type === 'inspection') {
                const gradeInfo = GRADE_LABELS[item.result?.grade] || {
                  text: 'ผลการตรวจวัด',
                  bg: 'bg-gray-100 text-gray-700 border-gray-200',
                };
                const metrics = item.result?.metrics || [];

                return (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-500/5 border border-emerald-200/80 dark:border-emerald-500/20 space-y-2.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="flex items-center gap-1.5 text-xs lg:text-sm font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
                          <SearchIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                          บันทึกผลการตรวจวัดสมรรถนะพลังงาน (INSPECTION LOG)
                        </span>
                        <span className={`text-[10px] lg:text-xs font-extrabold px-2 py-0.5 rounded-full border ${gradeInfo.bg}`}>
                          {gradeInfo.text}
                        </span>
                      </div>
                      <span className="text-[11px] lg:text-xs font-mono text-gray-400 dark:text-[#7E93AF]">
                        {formatThaiDate(item.timestamp)}
                      </span>
                    </div>

                    {/* Metrics snapshot */}
                    {metrics.length > 0 && (
                      <div className="flex flex-wrap gap-2 pl-4">
                        {metrics.map((m, mIdx) => (
                          <span
                            key={mIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-xs lg:text-sm font-mono text-gray-700 dark:text-[#C3D2E5]"
                          >
                            <span className="text-[10px] lg:text-xs text-gray-400 font-sans">{m.label}:</span>
                            <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{m.value}</span>
                            {m.unit && <span className="text-[10px] lg:text-xs text-gray-400">{m.unit}</span>}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.note && (
                      <p className="text-xs lg:text-sm text-gray-600 dark:text-[#C3D2E5] pl-4 font-medium italic">
                        หมายเหตุ: {item.note}
                      </p>
                    )}
                  </div>
                );
              }

              // Comment / Edit Log
              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      <span className="text-xs lg:text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">
                        {item.user || 'แอดมิน'}
                      </span>
                      <span className="text-[10px] lg:text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        บันทึกข้อความ
                      </span>
                    </div>
                    <span className="text-[11px] lg:text-xs text-gray-400 dark:text-[#7E93AF]">
                      {formatThaiDate(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-[#C3D2E5] pl-4 font-medium leading-relaxed">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Actions */}
      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-[#C3D2E5] font-bold text-sm lg:text-base transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm lg:text-base shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <CheckIcon className="w-5 h-5" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลอุปกรณ์'}
        </button>
      </div>
    </div>
  );
}
