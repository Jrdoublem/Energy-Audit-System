import { useEffect, useMemo, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel } from '../components/ui';
import {
  addManualFactory, computeFactoryStats, FACTORY_NAME_PREFIX, getFactoryMeta,
  loadManualFactories, readFactories, removeManualFactory, setFactoryMeta,
} from '../context/factoryStore.js';
import { getSession, fetchAllUsers } from '../context/authStore.js';
import { fetchAllEquipment } from '../context/equipmentStore.js';
import { fetchAllMeasures } from '../context/measuresStore.js';
import {
  ActivityIcon, ArrowRightIcon, FactoryIcon, LightningIcon,
  MapPinIcon, PencilIcon, PlusIcon, TrashIcon, TrendDownIcon,
} from '../components/icons';
import { fileToResizedDataUrl } from '../utils/image.js';
import { uploadImage, deleteImage } from '../context/storageStore.js';
import { THAI_PROVINCES } from '../utils/thaiProvinces.js';
import { Combobox } from '../components/Dropdown.jsx';
import { useLang } from '../context/languageStore.js';

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
  const { t } = useLang();
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
            title={t.factories.editFactoryTooltip}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-[#8CA3C0] flex items-center justify-center transition-colors"
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
          {removable && (
            <button
              type="button"
              onClick={() => onDelete(row.name)}
              title={t.factories.deleteFactoryTooltip}
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
          {row.meta.description || t.factories.noDescriptionYet}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-100 dark:border-white/8 px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-[#7E93AF] mb-1">
            <ActivityIcon className="w-3.5 h-3.5 text-[#4988C4]" />
            {t.factories.equipments}
          </div>
          <p className="text-xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{row.stats.equipCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 dark:border-white/8 px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-[#7E93AF] mb-1">
            <LightningIcon className="w-3.5 h-3.5 text-amber-400" />
            {t.factories.energyKwh}
          </div>
          <p className="text-xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{fmt(row.stats.energyKWhYear)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-white/8 px-3.5 py-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-[#8CA3C0]">
          <TrendDownIcon className="w-4 h-4 text-emerald-500" />
          {t.factories.potentialSavings}
        </div>
        <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
          ฿{fmt(row.stats.potentialSavings)} {t.factories.perYear}
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate(`/factories/${encodeURIComponent(row.name)}`)}
        className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/8 text-sm font-semibold text-[#0F2854] dark:text-[#E7EEF7] hover:text-[#4988C4] dark:hover:text-[#4988C4] transition-colors"
      >
        {t.factories.viewDetails}
        <ArrowRightIcon className="w-4 h-4" />
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
  const [users, setUsers] = useState([]);
  useEffect(() => { fetchAllUsers().then(setUsers).catch(() => setUsers([])); }, []);
  const [manualFactories, setManualFactories] = useState(() => loadManualFactories());
  // manualFactories isn't passed into readFactories (it re-reads localStorage
  // internally) — it's listed purely to force a recompute after add/remove.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const factories = useMemo(() => readFactories(undefined, equipment), [equipment, manualFactories]);
  const [, forceUpdate] = useReducer((c) => c + 1, 0);

  const [modalMode, setModalMode] = useState(null); // null | 'add' | 'edit'
  const [editingName, setEditingName] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', province: '', image: '' });
  const [formError, setFormError] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  // Not memoized: getFactoryMeta/computeFactoryStats read storage fresh on
  // every call, and forceUpdate() re-renders after the modal writes meta.
  const rows = factories.map((f) => ({
    name: f,
    meta: getFactoryMeta(f),
    stats: computeFactoryStats(f, equipment, measures),
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

  const handleSaveFactory = () => {
    if (modalMode === 'add') {
      const suffix = form.name.trim();
      if (!suffix) { setFormError(t.factories.errFactoryName); return; }
      const fullName = `${FACTORY_NAME_PREFIX} ${suffix}`;
      if (factories.includes(fullName)) { setFormError(t.factories.errFactoryExists); return; }
      addManualFactory(fullName);
      setFactoryMeta(fullName, { description: form.description.trim(), province: form.province.trim(), image: form.image });
      setManualFactories(loadManualFactories());
    } else if (modalMode === 'edit' && editingName) {
      setFactoryMeta(editingName, { description: form.description.trim(), province: form.province.trim(), image: form.image });
    }
    forceUpdate();
    setModalMode(null);
  };

  const handleRemoveFactory = (name) => {
    const meta = getFactoryMeta(name);
    removeManualFactory(name);
    setManualFactories(loadManualFactories());
    if (meta.image) deleteImage(meta.image);
  };

  if (!isAdmin) {
    return (
      <AppLayout title={t.factories.pageTitle} hideFactorySelect factoryRowBelowTitle>
        <Panel className="p-8 text-center text-sm text-gray-400 dark:text-[#7E93AF]">
          {t.factories.adminOnly}
        </Panel>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t.factories.pageTitle} hideFactorySelect factoryRowBelowTitle>
      <div className="flex flex-col gap-5 max-w-3xl lg:max-w-none">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
          <StatCard label={t.factories.totalFactories} value={factories.length} />
          <StatCard label={t.factories.totalEquipment} value={equipment.length} />
          <StatCard label={t.factories.assignedEngineers} value={assignedEngineerCount} />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.factories.factoryListCount} ({factories.length})</p>
          <button
            type="button"
            onClick={openAddFactory}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4988C4] hover:text-[#0F2854] dark:hover:text-[#E7EEF7] transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            {t.factories.addFactory}
          </button>
        </div>

        {rows.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-gray-400 dark:text-[#7E93AF]">
            {t.factories.noFactoriesYet}
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
              {modalMode === 'add' ? t.factories.addFactory : t.factories.editFactoryTitle}
            </p>

            {modalMode === 'add' && (
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.factories.factoryName}</label>
                <div className="flex items-stretch rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus-within:ring-2 focus-within:ring-[#4988C4] overflow-hidden">
                  <span className="flex items-center pl-4 pr-1 text-base font-semibold text-[#0F2854]/50 dark:text-[#7E93AF] select-none shrink-0">
                    {FACTORY_NAME_PREFIX}
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setFormError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFactory(); }}
                    placeholder={t.factories.egFactorySuffix}
                    autoFocus
                    className="flex-1 min-w-0 pr-4 py-2.5 bg-transparent text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.factories.factoryImageOptional}</label>
              <div className="flex items-center gap-3">
                {form.image ? (
                  <img src={form.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
                    <FactoryIcon className="w-6 h-6" />
                  </div>
                )}
                <label className={`flex-1 flex items-center justify-center py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-xs font-semibold text-gray-500 dark:text-[#8CA3C0] transition-colors ${
                  imageUploading ? 'opacity-60 pointer-events-none' : 'hover:border-[#4988C4] hover:text-[#4988C4] cursor-pointer'
                }`}>
                  {imageUploading ? '...' : (form.image ? t.factories.changeImage : t.factories.uploadImage)}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={imageUploading} />
                </label>
              </div>
              {imageError && <p className="text-xs text-red-500 mt-1.5">{imageError}</p>}
            </div>

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.factories.province}</label>
              <Combobox
                value={form.province}
                onChange={(v) => setForm((p) => ({ ...p, province: v }))}
                options={THAI_PROVINCES}
                placeholder={t.factories.egProvince}
                inputClassName="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.factories.description}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t.factories.egDescription}
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
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveFactory}
                disabled={imageUploading}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {modalMode === 'add' ? <PlusIcon className="w-4 h-4" /> : null}
                {modalMode === 'add' ? t.common.add : t.common.save}
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
