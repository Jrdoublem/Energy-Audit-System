import { useMemo, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel } from '../components/ui';
import {
  addManualFactory, computeFactoryStats, FACTORY_NAME_PREFIX, getFactoryMeta,
  loadManualFactories, readFactories, removeManualFactory, setFactoryMeta,
} from '../context/factoryStore.js';
import { getSession, loadUsers } from '../context/authStore.js';
import {
  ActivityIcon, ArrowRightIcon, FactoryIcon, LightningIcon,
  MapPinIcon, PencilIcon, PlusIcon, TrashIcon, TrendDownIcon,
} from '../components/icons';
import { fileToResizedDataUrl } from '../utils/image.js';
import { THAI_PROVINCES } from '../utils/thaiProvinces.js';
import { Combobox } from '../components/Dropdown.jsx';

function loadEquipment() {
  try { return JSON.parse(localStorage.getItem('equipment') || '[]'); } catch { return []; }
}

function StatCard({ label, value }) {
  return (
    <Panel className="p-4">
      <p className="text-xs text-gray-400 dark:text-[#7E93AF] mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{value}</p>
    </Panel>
  );
}

function fmt(n) {
  return Math.round(n || 0).toLocaleString('th-TH');
}

function FactoryCard({ row, removable, onEdit, onDelete }) {
  const navigate = useNavigate();
  return (
    <Panel className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        {row.meta.image ? (
          <img src={row.meta.image} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
            <FactoryIcon className="w-5 h-5" />
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {row.meta.province && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-[#7E93AF] mr-1">
              <MapPinIcon className="w-3.5 h-3.5" />
              {row.meta.province}
            </span>
          )}
          <button
            type="button"
            onClick={() => onEdit(row.name)}
            title="แก้ไขข้อมูลโรงงาน"
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-[#8CA3C0] flex items-center justify-center transition-colors"
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
          {removable && (
            <button
              type="button"
              onClick={() => onDelete(row.name)}
              title="ลบโรงงาน"
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] truncate">{row.name}</p>
        <p className="text-sm text-gray-400 dark:text-[#7E93AF] mt-1 line-clamp-2">
          {row.meta.description || 'ยังไม่มีคำอธิบายโรงงาน'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 dark:border-white/8 px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-[#7E93AF] mb-1">
            <ActivityIcon className="w-3.5 h-3.5 text-[#4988C4]" />
            Equipments
          </div>
          <p className="text-xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{row.stats.equipCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-white/8 px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-[#7E93AF] mb-1">
            <LightningIcon className="w-3.5 h-3.5 text-amber-400" />
            Energy (kWh)
          </div>
          <p className="text-xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{fmt(row.stats.energyKWhYear)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-white/8 px-3.5 py-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-[#8CA3C0]">
          <TrendDownIcon className="w-4 h-4 text-emerald-500" />
          Potential Savings
        </div>
        <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
          ฿{fmt(row.stats.potentialSavings)} / yr
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate(`/factories/${encodeURIComponent(row.name)}`)}
        className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/8 text-sm font-semibold text-[#0F2854] dark:text-[#E7EEF7] hover:text-[#4988C4] dark:hover:text-[#4988C4] transition-colors"
      >
        View Details
        <ArrowRightIcon className="w-4 h-4" />
      </button>
    </Panel>
  );
}

function Factories() {
  const session = getSession();
  const isAdmin = session.role === 'admin';

  const equipment = useMemo(() => loadEquipment(), []);
  const users = useMemo(() => loadUsers(), []);
  const [factories, setFactories] = useState(() => readFactories());
  const [manualFactories, setManualFactories] = useState(() => loadManualFactories());
  const [, forceUpdate] = useReducer((c) => c + 1, 0);

  const [modalMode, setModalMode] = useState(null); // null | 'add' | 'edit'
  const [editingName, setEditingName] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', province: '', image: '' });
  const [formError, setFormError] = useState('');
  const [imageError, setImageError] = useState('');

  // Not memoized: getFactoryMeta/computeFactoryStats read storage fresh on
  // every call, and forceUpdate() re-renders after the modal writes meta.
  const rows = factories.map((f) => ({
    name: f,
    meta: getFactoryMeta(f),
    stats: computeFactoryStats(f),
  }));

  const assignedEngineerCount = users.filter((u) => u.role === 'engineer' && (u.factories || []).length > 0).length;

  const openAddFactory = () => {
    setModalMode('add');
    setEditingName(null);
    setForm({ name: '', description: '', province: '', image: '' });
    setFormError('');
    setImageError('');
  };

  const openEditFactory = (name) => {
    const meta = getFactoryMeta(name);
    setModalMode('edit');
    setEditingName(name);
    setForm({ name: '', description: meta.description || '', province: meta.province || '', image: meta.image || '' });
    setFormError('');
    setImageError('');
  };

  const closeModal = () => setModalMode(null);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImageError('');
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setForm((p) => ({ ...p, image: dataUrl }));
    } catch {
      setImageError('อัปโหลดรูปไม่สำเร็จ');
    }
  };

  const handleSaveFactory = () => {
    if (modalMode === 'add') {
      const suffix = form.name.trim();
      if (!suffix) { setFormError('กรุณากรอกชื่อโรงงาน'); return; }
      const fullName = `${FACTORY_NAME_PREFIX}${suffix}`;
      if (factories.includes(fullName)) { setFormError('มีชื่อโรงงานนี้อยู่แล้ว'); return; }
      addManualFactory(fullName);
      setFactoryMeta(fullName, { description: form.description.trim(), province: form.province.trim(), image: form.image });
      setFactories(readFactories());
      setManualFactories(loadManualFactories());
    } else if (modalMode === 'edit' && editingName) {
      setFactoryMeta(editingName, { description: form.description.trim(), province: form.province.trim(), image: form.image });
    }
    forceUpdate();
    setModalMode(null);
  };

  const handleRemoveFactory = (name) => {
    removeManualFactory(name);
    setFactories(readFactories());
    setManualFactories(loadManualFactories());
  };

  if (!isAdmin) {
    return (
      <AppLayout title="รายชื่อโรงงาน">
        <Panel className="p-8 text-center text-sm text-gray-400 dark:text-[#7E93AF]">
          หน้านี้สำหรับผู้ดูแลระบบเท่านั้น
        </Panel>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="รายชื่อโรงงาน">
      <div className="flex flex-col gap-5 max-w-3xl lg:max-w-none">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
          <StatCard label="โรงงานทั้งหมด" value={factories.length} />
          <StatCard label="อุปกรณ์ทั้งหมด" value={equipment.length} />
          <StatCard label="วิศวกรที่มอบหมายแล้ว" value={assignedEngineerCount} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">รายชื่อโรงงาน ({factories.length})</p>
          <button
            type="button"
            onClick={openAddFactory}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4988C4] hover:text-[#0F2854] dark:hover:text-[#E7EEF7] transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            เพิ่มโรงงาน
          </button>
        </div>

        {rows.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-gray-400 dark:text-[#7E93AF]">
            ยังไม่มีโรงงานในระบบ — เพิ่มโรงงานด้านบน หรือเพิ่มอุปกรณ์พร้อมชื่อโรงงานที่หน้าอุปกรณ์
          </Panel>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => (
              <FactoryCard
                key={r.name}
                row={r}
                removable={r.stats.equipCount === 0 && manualFactories.includes(r.name)}
                onEdit={openEditFactory}
                onDelete={handleRemoveFactory}
              />
            ))}
          </div>
        )}
      </div>

      {modalMode && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 font-sans" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">
              {modalMode === 'add' ? 'เพิ่มโรงงาน' : 'แก้ไขข้อมูลโรงงาน'}
            </p>

            {modalMode === 'add' && (
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">ชื่อโรงงาน</label>
                <div className="flex items-stretch rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus-within:ring-2 focus-within:ring-[#4988C4] overflow-hidden">
                  <span className="flex items-center pl-4 pr-1 text-base font-semibold text-[#0F2854]/50 dark:text-[#7E93AF] select-none shrink-0">
                    {FACTORY_NAME_PREFIX}
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setFormError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFactory(); }}
                    placeholder="ซิดเอ็น"
                    autoFocus
                    className="flex-1 min-w-0 pr-4 py-2.5 bg-transparent text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">รูปโรงงาน (ไม่บังคับ)</label>
              <div className="flex items-center gap-3">
                {form.image ? (
                  <img src={form.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
                    <FactoryIcon className="w-6 h-6" />
                  </div>
                )}
                <label className="flex-1 flex items-center justify-center py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-xs font-semibold text-gray-500 dark:text-[#8CA3C0] hover:border-[#4988C4] hover:text-[#4988C4] transition-colors cursor-pointer">
                  {form.image ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              {imageError && <p className="text-xs text-red-500 mt-1.5">{imageError}</p>}
            </div>

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">จังหวัด</label>
              <Combobox
                value={form.province}
                onChange={(v) => setForm((p) => ({ ...p, province: v }))}
                options={THAI_PROVINCES}
                placeholder="เช่น อยุธยา"
                inputClassName="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">คำอธิบาย</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="เช่น โรงงานผลิตชิ้นส่วนอิเล็กทรอนิกส์"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4] resize-none"
              />
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-[#8CA3C0] font-semibold text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveFactory}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-semibold text-sm transition-colors"
              >
                {modalMode === 'add' ? <PlusIcon className="w-4 h-4" /> : null}
                {modalMode === 'add' ? 'เพิ่ม' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}

export default Factories;
