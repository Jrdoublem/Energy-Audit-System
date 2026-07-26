import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel } from '../components/ui';
import { computeFactoryStats, getFactoryMeta, setFactoryMeta } from '../context/factoryStore.js';
import { fetchAllCategories, fetchAllEquipment } from '../context/equipmentStore.js';
import { ICON_MAP } from '../components/iconMap.js';
import {
  ActivityIcon, ChevronDownIcon, ClipboardIcon, FactoryIcon, LightningIcon,
  MapPinIcon, PencilIcon, TrendDownIcon, UserIcon,
} from '../components/icons';
import { fileToResizedDataUrl } from '../utils/image.js';
import { THAI_PROVINCES } from '../utils/thaiProvinces.js';
import { Combobox } from '../components/Dropdown.jsx';
import { useLang } from '../context/languageStore.js';

function fmt(n) {
  return Math.round(n || 0).toLocaleString('th-TH');
}

function FactoryDetail() {
  const { t } = useLang();
  const { name: encodedName } = useParams();
  const name = decodeURIComponent(encodedName || '');
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [allEquipment, setAllEquipment] = useState([]);
  useEffect(() => {
    fetchAllCategories().then(setCategories).catch(() => setCategories([]));
    fetchAllEquipment().then(setAllEquipment).catch(() => setAllEquipment([]));
  }, []);
  const equipment = useMemo(() => allEquipment.filter((e) => e.factory === name), [allEquipment, name]);
  const [meta, setMeta] = useState(() => getFactoryMeta(name));
  const stats = useMemo(() => computeFactoryStats(name, allEquipment), [name, allEquipment]);

  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ description: '', province: '', image: '' });
  const [imageError, setImageError] = useState('');

  const openEdit = () => {
    setForm({ description: meta.description || '', province: meta.province || '', image: meta.image || '' });
    setImageError('');
    setEditModal(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImageError('');
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setForm((p) => ({ ...p, image: dataUrl }));
    } catch {
      setImageError(t.factories.uploadFailed);
    }
  };

  const handleSave = () => {
    setFactoryMeta(name, { description: form.description.trim(), province: form.province.trim(), image: form.image });
    setMeta(getFactoryMeta(name));
    setEditModal(false);
  };

  return (
    <AppLayout hideHeader fullBleed>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-5 lg:px-10 pt-14 lg:pt-8 pb-5 flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate('/factories')}
            className="w-9 h-9 rounded-full bg-white dark:bg-[#111F35] shadow-sm hover:bg-[#F4F7FC] dark:hover:bg-white/5 flex items-center justify-center text-[#0F2854] dark:text-[#E7EEF7] transition-colors shrink-0"
          >
            <ChevronDownIcon className="w-5 h-5 rotate-90" />
          </button>
          {meta.image ? (
            <img src={meta.image} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
              <FactoryIcon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl lg:text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] truncate">{name}</h1>
              <button
                type="button"
                onClick={openEdit}
                title={t.factories.editFactoryTooltip}
                className="w-7 h-7 rounded-full bg-white dark:bg-[#111F35] shadow-sm hover:bg-[#F4F7FC] dark:hover:bg-white/5 text-[#4988C4] flex items-center justify-center transition-colors shrink-0"
              >
                <PencilIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            {meta.province && (
              <p className="flex items-center gap-1 text-xs text-[#0F2854]/60 dark:text-[#7E93AF] mt-1.5">
                <MapPinIcon className="w-3.5 h-3.5" />
                {meta.province}
              </p>
            )}
            <p className="text-sm text-[#0F2854]/60 dark:text-[#7E93AF] mt-1">
              {meta.description || t.factories.noDescriptionYet}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-5 lg:px-10 pb-10 flex flex-col gap-4 max-w-4xl">
          <div className="grid grid-cols-3 gap-3">
            <Panel className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-[#7E93AF] mb-1">
                <ActivityIcon className="w-3.5 h-3.5 text-[#4988C4]" />
                {t.factories.equipments}
              </div>
              <p className="text-xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{stats.equipCount}</p>
            </Panel>
            <Panel className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-[#7E93AF] mb-1">
                <LightningIcon className="w-3.5 h-3.5 text-amber-400" />
                {t.factories.energyKwh}
              </div>
              <p className="text-xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{fmt(stats.energyKWhYear)}</p>
            </Panel>
            <Panel className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-[#7E93AF] mb-1">
                <TrendDownIcon className="w-3.5 h-3.5 text-emerald-500" />
                {t.factories.savingsPerYear}
              </div>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">฿{fmt(stats.potentialSavings)}</p>
            </Panel>
          </div>

          <Panel className="p-5">
            <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-3">{t.factories.equipmentInFactory} ({equipment.length})</p>
            {equipment.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-[#7E93AF] text-center py-8">{t.factories.noEquipmentInFactory}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {equipment.map((item) => {
                  const cat = categories.find((c) => c.key === item.category);
                  const Icon = ICON_MAP[cat?.iconKey] || ClipboardIcon;
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-[#F4F7FC] dark:bg-white/5 rounded-xl px-4 py-3">
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center shrink-0 text-[#4988C4]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] truncate">{item.id}</p>
                        <p className="text-xs text-gray-400 dark:text-[#7E93AF] truncate">
                          {cat?.label || item.category} · {item.brandModel || '-'}{item.building ? ` · ${item.building}` : ''}
                        </p>
                      </div>
                      {item.owner && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-full px-2 py-0.5 text-gray-600 dark:text-[#8CA3C0] shrink-0">
                          <UserIcon className="w-2.5 h-2.5" />
                          {item.owner}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {editModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 font-sans" onClick={() => setEditModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.factories.editFactoryTitle}</p>
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
                <label className="flex-1 flex items-center justify-center py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-xs font-semibold text-gray-500 dark:text-[#8CA3C0] hover:border-[#4988C4] hover:text-[#4988C4] transition-colors cursor-pointer">
                  {form.image ? t.factories.changeImage : t.factories.uploadImage}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
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
                autoFocus
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
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-[#8CA3C0] font-semibold text-sm transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-3 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-semibold text-sm transition-colors"
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}

export default FactoryDetail;
