import { useState } from 'react';
import { Panel } from '../../components/ui';
import { useLang } from '../../context/languageStore.js';
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

export default function AddEquipmentPage({
  initialData = {},
  onSave,
  onCancel,
  categoriesList = [],
  factoriesList = [],
  catalogItems = [],
  isEditing = false,
}) {
  const { t } = useLang();
  const [form, setForm] = useState({
    id: initialData.id || '',
    factory: initialData.factory || (factoriesList[0] || ''),
    category: initialData.category || 'compressor',
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

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const ageYears = form.installYear
    ? Math.max(0, CURRENT_YEAR - parseInt(form.installYear, 10))
    : 0;

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const entry = {
      id: 'cm_' + Date.now(),
      createdAt: new Date().toISOString(),
      user: 'แอดมิน',
      text: newCommentText.trim(),
    };
    setCommentsList([entry, ...commentsList]);
    setNewCommentText('');
  };

  const handleCatalogSelect = (catId) => {
    const item = catalogItems.find((c) => c.id === catId);
    if (!item) return;
    setForm((prev) => ({
      ...prev,
      brand: item.brand || '',
      model: item.model || '',
      brandModel: `${item.brand || ''} ${item.model || ''}`.trim(),
      ratedCapacity: item.spec || item.ratedCapacity || '',
      chillerPower: item.specificPower ? String(item.specificPower * 500) : (item.chillerPower || ''),
      coolingCapacity: item.coolingCapacity || '500',
      chillerEfficiency: item.specificPower ? String(item.specificPower) : (item.chillerEfficiency || ''),
    }));
  };

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
        finalComments = [
          {
            id: 'cm_' + Date.now(),
            createdAt: new Date().toISOString(),
            user: 'แอดมิน',
            text: newCommentText.trim(),
          },
          ...finalComments,
        ];
      } else if (isEditing && commentsList.length === (initialData.comments || []).length) {
        finalComments = [
          {
            id: 'cm_' + Date.now(),
            createdAt: new Date().toISOString(),
            user: 'แอดมิน',
            text: 'ปรับปรุงรายละเอียดข้อมูลอุปกรณ์',
          },
          ...finalComments,
        ];
      } else if (!isEditing && commentsList.length === 0) {
        finalComments = [
          {
            id: 'cm_' + Date.now(),
            createdAt: new Date().toISOString(),
            user: 'แอดมิน',
            text: 'ลงทะเบียนเพิ่มอุปกรณ์ใหม่เข้าสู่ระบบ',
          },
        ];
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
            {isEditing ? 'แก้ไขรายละเอียดอุปกรณ์' : 'เพิ่มอุปกรณ์ใหม่'}
          </h2>
          <p className="text-sm text-gray-400 dark:text-[#7E93AF] mt-0.5">
            กรอกรายละเอียดข้อมูลอุปกรณ์ด้านล่างให้ครบถ้วน
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          ยกเลิก
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
          {error}
        </div>
      )}

      {/* SECTION 1: IDENTIFICATION */}
      <Panel className="p-6 space-y-5 rounded-3xl">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
          <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
          ข้อมูลทะเบียนอุปกรณ์ (IDENTIFICATION)
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              รหัสอุปกรณ์ (Equipment Tag) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น CH-01, CP-01"
              value={form.id}
              onChange={(e) => { setForm({ ...form, id: e.target.value }); setError(''); }}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">โรงงาน (Factory)</label>
              <select
                value={form.factory}
                onChange={(e) => setForm({ ...form, factory: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              >
                {factoriesList.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">หมวดหมู่อุปกรณ์ (Category)</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              >
                {categoriesList.filter((c) => c.key !== 'all').map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">แผนก / อาคารสถานที่ (Department / Location)</label>
              <input
                type="text"
                placeholder="เช่น ห้องคอมเพรสเซอร์, อาคาร A"
                value={form.building}
                onChange={(e) => setForm({ ...form, building: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ปีที่ติดตั้ง (สำหรับคำนวณอายุ)</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  placeholder="2026"
                  value={form.installYear}
                  onChange={(e) => setForm({ ...form, installYear: e.target.value })}
                  className="w-full px-4 py-3 pr-24 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                />
                {form.installYear && (
                  <span className="absolute right-3 text-xs font-bold text-[#4988C4] bg-[#EAF4FC] dark:bg-[#4988C4]/20 px-2.5 py-1 rounded-full pointer-events-none">
                    {ageYears === 0 ? 'ติดตั้งปีนี้' : `อายุ ${ageYears} ปี`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* SECTION 2: SPECIFICATIONS */}
      <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-emerald-500">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
          <GearIcon className="w-4 h-4 text-emerald-500" />
          คุณสมบัติทางเทคนิค (SPECIFICATIONS)
        </div>

        {/* Quick Fill from Catalog */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/60 to-sky-50/60 dark:from-emerald-500/10 dark:to-sky-500/10 border border-emerald-200/60 dark:border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <SparkleIcon className="w-4 h-4 text-amber-500" />
            ✨ เติมข้อมูลด่วนจากแคตตาล็อก (Catalog Quick Fill)
          </div>
          <select
            value=""
            onChange={(e) => handleCatalogSelect(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#111F35] border border-emerald-200 dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">-- เลือกจากแคตตาล็อก (เติมข้อมูลให้อัตโนมัติ) --</option>
            {catalogItems.filter((c) => c.catId === form.category).map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand} {c.model} ({c.spec || `${c.specificPower || '-'} kW/TR`})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">
            * ยี่ห้อ, รุ่น, กำลังไฟฟ้า (kW), ขนาด และพิกัดจะถูกดึงให้อัตโนมัติ สามารถแก้ไขเพิ่มเติมได้
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ยี่ห้อ (Brand)</label>
              <input
                type="text"
                placeholder="เช่น Trane, Daikin"
                value={form.brand}
                onChange={(e) => {
                  const brand = e.target.value;
                  setForm({ ...form, brand, brandModel: `${brand} ${form.model}`.trim() });
                }}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">รุ่น (Model)</label>
              <input
                type="text"
                placeholder="เช่น CVHE, RTAF"
                value={form.model}
                onChange={(e) => {
                  const model = e.target.value;
                  setForm({ ...form, model, brandModel: `${form.brand} ${model}`.trim() });
                }}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ขนาดพิกัด (Rated Capacity)</label>
              <input
                type="text"
                placeholder="เช่น 500 TR, 100 HP"
                value={form.ratedCapacity}
                onChange={(e) => setForm({ ...form, ratedCapacity: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">กำลังไฟฟ้า (kW)</label>
              <div className="relative flex items-center">
                <LightningIcon className="absolute left-3.5 w-4 h-4 text-amber-500" />
                <input
                  type="number"
                  placeholder="เช่น 320"
                  value={form.chillerPower}
                  onChange={(e) => setForm({ ...form, chillerPower: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ขนาดความเย็น (TR)</label>
              <input
                type="number"
                placeholder="เช่น 500"
                value={form.coolingCapacity}
                onChange={(e) => setForm({ ...form, coolingCapacity: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ประสิทธิภาพ (kW/TR)</label>
              <div className="relative flex items-center">
                <ActivityIcon className="absolute left-3.5 w-4 h-4 text-[#4988C4]" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="คำนวณอัตโนมัติ หรือ กรอกเอง"
                  value={form.chillerEfficiency}
                  onChange={(e) => setForm({ ...form, chillerEfficiency: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">ชั่วโมงทำงานต่อปี (hrs/yr)</label>
              <input
                type="number"
                placeholder="เช่น 8000"
                value={form.operatingHours}
                onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">สัดส่วนภาระการทำงานเฉลี่ย (Average Load Factor 0-1)</label>
              <input
                type="number"
                step="0.05"
                placeholder="เช่น 0.8"
                value={form.loadFactor}
                onChange={(e) => setForm({ ...form, loadFactor: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Panel>

      {/* SECTION 3: COMMENTS & CHANGE HISTORY */}
      <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-purple-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
            <PencilIcon className="w-4 h-4 text-purple-500" />
            ประวัติการแก้ไข & บันทึกข้อความ (COMMENTS & CHANGE HISTORY)
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
            {commentsList.length} รายการ
          </span>
        </div>

        {/* Add comment box */}
        <div className="space-y-3 p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10">
          <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] block">
            เพิ่มบันทึกการซ่อมบำรุง / หมายเหตุการแก้ไข
          </label>
          <div className="flex gap-2">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="พิมพ์ข้อความบันทึก เช่น เปลี่ยนน้ำมันเครื่อง, แก้ไขกำลังไฟฟ้า, ตรวจเช็คประจำปี..."
              rows={2}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-purple-400 focus:outline-none resize-none"
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!newCommentText.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors self-end shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              เพิ่มบันทึก
            </button>
          </div>
        </div>

        {/* Timeline of comments */}
        {commentsList.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-[#7E93AF] text-center py-4">
            ยังไม่มีประวัติการบันทึกข้อความสำหรับอุปกรณ์นี้
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {commentsList.map((c, idx) => (
              <div
                key={c.id || idx}
                className="p-3.5 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7]">
                      {c.user || 'แอดมิน'}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-[#7E93AF]">
                    {formatThaiDate(c.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-[#C3D2E5] pl-4 font-medium leading-relaxed">
                  {c.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Actions */}
      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-[#C3D2E5] font-bold text-sm transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <CheckIcon className="w-5 h-5" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลอุปกรณ์'}
        </button>
      </div>
    </div>
  );
}
