import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel } from '../components/ui';
import {
  computeFactoryStats, FACTORY_NAME_PREFIX, getFactoryMeta,
  fetchAllFactoryRecords, saveFactoryRecord, deleteFactoryRecord, readFactories,
} from '../context/factoryStore.js';
import { getSession, fetchAllUsers } from '../context/authStore.js';
import { fetchAllEquipment } from '../context/equipmentStore.js';
import { fetchAllMeasures } from '../context/measuresStore.js';
import { fetchAllHistory } from '../context/historyStore.js';
import { fetchSettings } from '../context/settingsStore.js';
import {
  ActivityIcon, ArrowRightIcon, FactoryIcon, LightningIcon,
  MapPinIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, TrendDownIcon,
  CloseIcon, ArrowLeftIcon, CheckIcon, SparkleIcon,
} from '../components/icons';
import { fileToResizedDataUrl } from '../utils/image.js';
import { uploadImage, deleteImage } from '../context/storageStore.js';
import { THAI_PROVINCES } from '../utils/thaiProvinces.js';
import { Combobox } from '../components/Dropdown.jsx';
import { useLang } from '../context/languageStore.js';

function StatCard({ label, value, unit, icon: Icon, accentColor }) {
  return (
    <Panel className="p-4 relative overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all">
      {accentColor && <span className="absolute top-0 left-0 right-0 h-1" style={{ background: accentColor }} />}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-gray-500 dark:text-[#7E93AF]">{label}</p>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-[#EEF3FB] dark:bg-white/5 flex items-center justify-center text-[#4988C4] shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono tracking-tight">
        {value}
        {unit && <span className="text-xs font-semibold text-gray-400 dark:text-[#7E93AF] ml-1">{unit}</span>}
      </p>
    </Panel>
  );
}

function fmt(n) {
  return Math.round(n || 0).toLocaleString('th-TH');
}

function FactoryCard({ row, removable, onEdit, onDelete }) {
  const { t } = useLang();
  const navigate = useNavigate();
  return (
    <Panel className="p-5 flex flex-col justify-between gap-4 group hover:shadow-lg hover:border-[#4988C4]/40 transition-all rounded-3xl">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          {row.meta.image ? (
            <img src={row.meta.image} alt="" className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-sm border border-[#E4EBF6] dark:border-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0 border border-[#E4EBF6] dark:border-white/10">
              <FactoryIcon className="w-6 h-6" />
            </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {row.meta.province && (
              <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-[#7E93AF] bg-[#EEF3FB] dark:bg-white/5 px-2.5 py-1 rounded-full mr-1">
                <MapPinIcon className="w-3 h-3 text-[#4988C4]" />
                {row.meta.province}
              </span>
            )}
            <button
              type="button"
              onClick={() => onEdit(row.name)}
              title={t.factories.editFactoryTooltip}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-[#8CA3C0] flex items-center justify-center transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            {removable && (
              <button
                type="button"
                onClick={() => onDelete(row.name)}
                title={t.factories.deleteFactoryTooltip}
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white text-rose-400 flex items-center justify-center transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] group-hover:text-[#4988C4] transition-colors truncate">
            {row.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-[#7E93AF] mt-1 line-clamp-2 min-h-[32px]">
            {row.meta.description || t.factories.noDescriptionYet}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          <div className="rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 px-3.5 py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#7E93AF] mb-0.5">
              <ActivityIcon className="w-3 h-3 text-[#4988C4]" />
              {t.factories.equipments}
            </div>
            <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono">{row.stats.equipCount}</p>
          </div>

          <div className="rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 px-3.5 py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#7E93AF] mb-0.5">
              <LightningIcon className="w-3 h-3 text-amber-500" />
              {t.factories.energyKwh}
            </div>
            <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono">{fmt(row.stats.energyKWhYear)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3.5 py-2.5 mt-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <TrendDownIcon className="w-3.5 h-3.5 text-emerald-500" />
            {t.factories.potentialSavings}
          </div>
          <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            ฿{fmt(row.stats.potentialSavings)} {t.factories.perYear}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate(`/factories/${encodeURIComponent(row.name)}`)}
        className="w-full flex items-center justify-between pt-3 border-t border-[#EEF3FB] dark:border-white/8 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] group-hover:text-[#4988C4] transition-colors"
      >
        <span>{t.factories.viewDetails}</span>
        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </Panel>
  );
}

function Factories() {
  const { t } = useLang();
  const session = getSession();
  const isAdmin = session.role === 'admin';

  const [equipment, setEquipment] = useState([]);
  useEffect(() => { fetchAllEquipment().then(setEquipment).catch(() => setEquipment([])); }, []);
  const [measures, setMeasures] = useState([]);
  useEffect(() => { fetchAllMeasures().then(setMeasures).catch(() => setMeasures([])); }, []);
  const [history, setHistory] = useState([]);
  useEffect(() => { fetchAllHistory().then(setHistory).catch(() => setHistory([])); }, []);
  const [defaultOperatingHours, setDefaultOperatingHours] = useState('8000');
  useEffect(() => { fetchSettings().then((s) => setDefaultOperatingHours(s.defaultOperatingHours)).catch(() => {}); }, []);
  const [users, setUsers] = useState([]);
  useEffect(() => { fetchAllUsers().then(setUsers).catch(() => setUsers([])); }, []);

  const [factoryRecords, setFactoryRecords] = useState([]);
  const refreshFactoryRecords = () => fetchAllFactoryRecords().then(setFactoryRecords).catch(() => setFactoryRecords([]));
  useEffect(() => { refreshFactoryRecords(); }, []);

  const factories = useMemo(() => readFactories(undefined, equipment, factoryRecords), [equipment, factoryRecords]);

  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState(null); // null | 'add' | 'edit'
  const [editingName, setEditingName] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', province: '', image: '' });
  const [formError, setFormError] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  const rows = useMemo(() => {
    return factories.map((f) => ({
      name: f,
      meta: getFactoryMeta(f, factoryRecords),
      stats: computeFactoryStats(f, equipment, measures, history, defaultOperatingHours),
    }));
  }, [factories, factoryRecords, equipment, measures, history, defaultOperatingHours]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q) || (r.meta.province || '').toLowerCase().includes(q) || (r.meta.description || '').toLowerCase().includes(q));
  }, [rows, search]);

  const totalEnergyAll = useMemo(() => rows.reduce((sum, r) => sum + (r.stats.energyKWhYear || 0), 0), [rows]);
  const totalSavingsAll = useMemo(() => rows.reduce((sum, r) => sum + (r.stats.potentialSavings || 0), 0), [rows]);

  const openAddFactory = () => {
    setModalMode('add');
    setEditingName(null);
    setForm({ name: '', description: '', province: '', image: '' });
    setFormError('');
    setImageError('');
  };

  const openEditFactory = (name) => {
    const meta = getFactoryMeta(name, factoryRecords);
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
    setImageUploading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      const url = await uploadImage(dataUrl, 'factories');
      setForm((p) => ({ ...p, image: url }));
    } catch (err) {
      console.error('Factory image upload failed:', err);
      setImageError(t.factories.uploadFailed);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveFactory = async () => {
    if (modalMode === 'add') {
      const suffix = form.name.trim();
      if (!suffix) { setFormError(t.factories.errFactoryName); return; }
      const fullName = `${FACTORY_NAME_PREFIX} ${suffix}`;
      if (factories.includes(fullName)) { setFormError(t.factories.errFactoryExists); return; }
      await saveFactoryRecord(fullName, { description: form.description.trim(), province: form.province.trim(), image: form.image, manual: true });
    } else if (modalMode === 'edit' && editingName) {
      await saveFactoryRecord(editingName, { description: form.description.trim(), province: form.province.trim(), image: form.image });
    }
    await refreshFactoryRecords();
    setModalMode(null);
  };

  const handleRemoveFactory = async (name) => {
    const meta = getFactoryMeta(name, factoryRecords);
    await deleteFactoryRecord(name);
    await refreshFactoryRecords();
    if (meta.image) deleteImage(meta.image);
  };

  if (!isAdmin) {
    return (
      <AppLayout
        title={
          <span className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
            {t.factories.pageTitle}
          </span>
        }
        hideFactorySelect
        factoryRowBelowTitle
      >
        <Panel className="p-8 text-center text-sm text-gray-400 dark:text-[#7E93AF]">
          {t.factories.adminOnly}
        </Panel>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={
        <span className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
          {t.factories.pageTitle}
        </span>
      }
      hideFactorySelect
      factoryRowBelowTitle
    >
      <div className="flex flex-col gap-6 w-full">
        {modalMode ? (
          <div className="max-w-4xl mx-auto w-full py-6 space-y-6 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
                  {modalMode === 'edit' ? 'แก้ไขข้อมูลโรงงาน' : 'เพิ่มโรงงานใหม่'}
                </h2>
                <p className="text-sm text-gray-400 dark:text-[#7E93AF] mt-0.5">
                  กรอกรายละเอียดข้อมูลและรูปภาพโรงงานด้านล่างให้ครบถ้วน
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                ยกเลิก
              </button>
            </div>

            {formError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                {formError}
              </div>
            )}

            {/* SECTION 1: ข้อมูลทั่วไปโรงงาน */}
            <Panel className="p-6 space-y-5 rounded-3xl">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <FactoryIcon className="w-4 h-4 text-[#4988C4]" />
                ข้อมูลทั่วไปโรงงาน (GENERAL INFORMATION)
              </div>

              <div className="space-y-4">
                {modalMode === 'add' && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                      ชื่อโรงงาน <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-stretch rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 focus-within:ring-2 focus-within:ring-[#4988C4] overflow-hidden">
                      <span className="flex items-center pl-4 pr-1 text-sm font-bold text-[#0F2854]/60 dark:text-[#7E93AF] select-none shrink-0">
                        {FACTORY_NAME_PREFIX}
                      </span>
                      <input
                        value={form.name}
                        onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setFormError(''); }}
                        placeholder={t.factories.egFactorySuffix}
                        className="flex-1 min-w-0 pr-4 py-3 bg-transparent text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                    จังหวัด <span className="text-rose-500">*</span>
                  </label>
                  <Combobox
                    value={form.province}
                    onChange={(v) => setForm((p) => ({ ...p, province: v }))}
                    options={THAI_PROVINCES}
                    placeholder={t.factories.egProvince}
                    inputClassName="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-semibold text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                    คำอธิบายเพิ่มเติม / ที่อยู่โรงงาน
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="ระบุคำอธิบาย หรือ ที่อยู่อาคารสถานที่..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4] resize-none"
                  />
                </div>
              </div>
            </Panel>

            {/* SECTION 2: รูปภาพประกอบ */}
            <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-sky-500">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <SparkleIcon className="w-4 h-4 text-sky-500" />
                รูปภาพโรงงาน (FACTORY IMAGE)
              </div>

              <div className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 flex flex-col sm:flex-row items-center gap-4">
                {form.image ? (
                  <img src={form.image} alt="" className="w-24 h-24 rounded-2xl object-cover shadow-sm shrink-0" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
                    <FactoryIcon className="w-10 h-10" />
                  </div>
                )}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7]">อัปโหลดรูปภาพประจำโรงงาน</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">รองรับไฟล์ JPG, PNG ความละเอียดแนะนำ 1200x800 px</p>
                  <label className={`inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-xs font-bold text-[#4988C4] transition-colors ${
                    imageUploading ? 'opacity-60 pointer-events-none' : 'hover:bg-[#EAF4FC] cursor-pointer'
                  }`}>
                    {imageUploading ? 'กำลังอัปโหลด...' : (form.image ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพ')}
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={imageUploading} />
                  </label>
                  {imageError && <p className="text-xs text-rose-500">{imageError}</p>}
                </div>
              </div>
            </Panel>

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-[#C3D2E5] font-bold text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveFactory}
                disabled={imageUploading}
                className="flex-1 py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckIcon className="w-5 h-5" />
                {modalMode === 'add' ? 'บันทึกโรงงานใหม่' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
              <StatCard label={t.factories.totalFactories} value={factories.length} icon={FactoryIcon} accentColor="#4988C4" />
              <StatCard label={t.factories.totalEquipment} value={equipment.length} icon={ActivityIcon} accentColor="#38BDF8" />
              <StatCard label={t.factories.energyKwh} value={fmt(totalEnergyAll / 1000)} unit="MWh/yr" icon={LightningIcon} accentColor="#FACC15" />
              <StatCard label={t.factories.potentialSavings} value={`฿${fmt(totalSavingsAll)}`} unit="/yr" icon={TrendDownIcon} accentColor="#4ADE80" />
            </div>

            {/* Toolbar Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <div className="relative w-full">
                  <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อโรงงาน / จังหวัด..."
                    className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white dark:bg-[#111F35] border border-[#E4EBF6] dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={openAddFactory}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-bold shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                {t.factories.addFactory}
              </button>
            </div>

            {/* Factory Cards Grid */}
            {filteredRows.length === 0 ? (
              <Panel className="p-12 text-center text-sm text-gray-400 dark:text-[#7E93AF] rounded-3xl">
                {search ? 'ไม่พบโรงงานที่ตรงกับการค้นหา' : t.factories.noFactoriesYet}
              </Panel>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRows.map((r) => (
                  <FactoryCard
                    key={r.name}
                    row={r}
                    removable={r.stats.equipCount === 0 && factoryRecords.some((fr) => fr.name === r.name && fr.manual)}
                    onEdit={openEditFactory}
                    onDelete={handleRemoveFactory}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default Factories;
