import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel, SectionHeader } from '../components/ui';
import { fetchAllCategories } from '../context/equipmentStore.js';
import { fetchAllCatalogItems, saveCatalogItem, deleteCatalogItem } from '../context/catalogStore.js';
import { ICON_MAP } from '../components/iconMap.js';
import { fileToResizedDataUrl } from '../utils/image.js';
import { uploadImage, deleteImage } from '../context/storageStore.js';
import { useLang } from '../context/languageStore.js';
import { BoxIcon, CalculatorIcon, ChevronDownIcon, ClipboardIcon, PencilIcon, PlusIcon, TrashIcon } from '../components/icons';
import SavingsCalculator from './catalog/SavingsCalculator.jsx';

function fmt(n) {
  return Math.round(n || 0).toLocaleString('th-TH');
}

function CatalogCard({ item, onEdit, onDelete, onCalculate }) {
  const { t } = useLang();
  return (
    <Panel className="group p-5 flex flex-col gap-3 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[#4988C4]">{item.brand}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(item)}
            title={t.catalog.editItemTooltip}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-[#8CA3C0] flex items-center justify-center transition-colors"
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            title={t.catalog.deleteItemTooltip}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] -mt-1 truncate">{item.model}</p>

      <div className="w-full h-56 md:h-64 rounded-xl bg-white dark:bg-white/5 flex items-center justify-center overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <BoxIcon className="w-10 h-10 text-[#4988C4]/25" />
        )}
      </div>

      <p className="text-sm text-gray-400 dark:text-[#7E93AF] line-clamp-2">
        {item.desc || t.catalog.noDescriptionYet}
      </p>

      <div className="flex flex-col gap-2">
        {item.spec && (
          <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-white/8 px-3.5 py-3">
            <span className="text-sm text-gray-500 dark:text-[#8CA3C0]">{t.catalog.specifications}</span>
            <span className="text-sm font-semibold text-[#0F2854] dark:text-[#E7EEF7] truncate max-w-[55%] text-right">{item.spec}</span>
          </div>
        )}
        {item.costEst > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-white/8 px-3.5 py-3">
            <span className="text-sm text-gray-500 dark:text-[#8CA3C0]">{t.catalog.costEstimate}</span>
            <span className="text-sm font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">฿{fmt(item.costEst)}</span>
          </div>
        )}
        {item.catId === 'chiller' && item.specificPower > 0 && (
          <button
            type="button"
            onClick={() => onCalculate(item)}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
          >
            <CalculatorIcon className="w-4 h-4" />
            {t.catalog.calculate}
          </button>
        )}
      </div>
    </Panel>
  );
}

function Catalog() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  useEffect(() => { fetchAllCategories().then(setCategories).catch(() => setCategories([])); }, []);
  const realCategories = useMemo(() => categories.filter((c) => c.key !== 'all'), [categories]);
  const [activeCategory, setActiveCategory] = useState(() => realCategories[0]?.key || 'chiller');
  const [items, setItems] = useState([]);
  useEffect(() => { fetchAllCatalogItems().then(setItems).catch(() => setItems([])); }, []);

  const [modalMode, setModalMode] = useState(null); // null | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ catId: '', brand: '', model: '', spec: '', specificPower: '', costEst: '', desc: '', image: '' });
  const [formError, setFormError] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [calculatorItem, setCalculatorItem] = useState(null);
  const catScrollRef = useRef(null);

  const activeItems = items.filter((i) => i.catId === activeCategory);
  const activeCategoryLabel = realCategories.find((c) => c.key === activeCategory)?.label || activeCategory;

  const openAddItem = () => {
    setModalMode('add');
    setEditingId(null);
    setForm({ catId: activeCategory, brand: '', model: '', spec: '', specificPower: '', costEst: '', desc: '', image: '' });
    setFormError('');
    setImageError('');
  };

  const openEditItem = (item) => {
    setModalMode('edit');
    setEditingId(item.id);
    setForm({
      catId: item.catId || activeCategory,
      brand: item.brand || '',
      model: item.model || '',
      spec: item.spec || '',
      specificPower: item.specificPower || '',
      costEst: item.costEst || '',
      desc: item.desc || '',
      image: item.image || '',
    });
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
      const url = await uploadImage(dataUrl, 'catalog');
      setForm((p) => ({ ...p, image: url }));
    } catch (err) {
      console.error('Catalog image upload failed:', err);
      setImageError(t.catalog.uploadFailed);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveItem = async () => {
    const brand = form.brand.trim();
    const model = form.model.trim();
    if (!brand) { setFormError(t.catalog.errBrand); return; }
    if (!model) { setFormError(t.catalog.errModel); return; }
    const record = {
      catId: form.catId || activeCategory,
      brand,
      model,
      spec: form.spec.trim(),
      specificPower: parseFloat(form.specificPower) || 0,
      costEst: parseFloat(form.costEst) || 0,
      desc: form.desc.trim(),
      image: form.image,
    };
    if (modalMode === 'edit' && editingId) {
      const item = { id: editingId, ...record };
      await saveCatalogItem(item);
      setItems((prev) => prev.map((i) => (i.id === editingId ? item : i)));
    } else {
      const item = { id: `cat_${Date.now()}`, ...record };
      await saveCatalogItem(item);
      setItems((prev) => [item, ...prev]);
    }
    setModalMode(null);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm(t.catalog.deleteItemConfirm)) return;
    const removed = items.find((i) => i.id === id);
    await deleteCatalogItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (removed?.image) deleteImage(removed.image);
  };

  return (
    <AppLayout
      title={
        <span className="flex items-center gap-2.5 flex-wrap">
          <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
          {t.catalog.pageTitle}
          <span className="text-[11px] lg:text-xs font-bold px-2.5 py-1 rounded-full bg-[#EAF4FC] dark:bg-white/10 text-[#4988C4] tracking-wide whitespace-nowrap">
            {items.length} {t.catalog.itemsCountSuffix}
          </span>
        </span>
      }
      hideFactorySelect
      factoryRowBelowTitle
      hideRoleBadge
    >
      <div className="flex flex-col gap-5 max-w-3xl lg:max-w-none">
        <div className="lg:hidden flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-white/5 p-1">
          <button
            type="button"
            onClick={() => navigate('/equipment')}
            className="flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold whitespace-nowrap text-gray-500 dark:text-[#7E93AF]"
          >
            <ClipboardIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.equipment.pageTitle}</span>
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold whitespace-nowrap bg-white dark:bg-[#111F35] text-[#0F2854] dark:text-[#E7EEF7] shadow-sm"
          >
            <BoxIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.catalog.pageTitle}</span>
          </button>
        </div>

        <p className="text-sm text-gray-400 dark:text-[#7E93AF] -mt-2">{t.catalog.subtitle}</p>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {realCategories.map(({ key, label, iconKey }) => {
            const Icon = ICON_MAP[iconKey] || BoxIcon;
            const active = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 transition-colors text-sm font-semibold shrink-0 ${
                  active
                    ? 'border-[#0F2854] bg-[#0F2854] text-white'
                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] hover:border-[#0F2854]/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>

        <SectionHeader
          title={`${t.catalog.recommended} (${activeCategoryLabel})`}
          right={
            <button
              type="button"
              onClick={openAddItem}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
            >
              <PlusIcon className="w-3.5 h-3.5" />
              {t.catalog.addItem}
            </button>
          }
        />

        {activeItems.length === 0 ? (
          <Panel className="p-8 text-center text-sm text-gray-400 dark:text-[#7E93AF]">
            {t.catalog.noItemsYet}
          </Panel>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeItems.map((item) => (
              <CatalogCard key={item.id} item={item} onEdit={openEditItem} onDelete={handleDeleteItem} onCalculate={setCalculatorItem} />
            ))}
          </div>
        )}
      </div>

      {modalMode && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:px-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-[#111F35] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md flex flex-col"
            style={{ maxHeight: '90dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 sm:px-7 pt-6 pb-4 shrink-0">
              <p className="text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">
                {modalMode === 'add' ? t.catalog.addItem : t.catalog.editItemTitle}
              </p>
              <button type="button" onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#7E93AF] transition-colors font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-2 flex flex-col gap-4">

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-2 block">{t.equipment.equipmentCategory}</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => catScrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
                  className="hidden sm:flex absolute left-0 top-0 bottom-1 z-10 items-center pr-3 bg-gradient-to-r from-white dark:from-[#111F35] via-white/90 dark:via-[#111F35]/90 to-transparent"
                >
                  <ChevronDownIcon className="w-4 h-4 text-[#0F2854] dark:text-[#E7EEF7] rotate-90" />
                </button>
                <div ref={catScrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:px-5">
                  {realCategories.map(({ key, label, iconKey }) => {
                    const Icon = ICON_MAP[iconKey] || BoxIcon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, catId: key }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-colors text-sm font-semibold shrink-0 ${
                          form.catId === key
                            ? 'border-[#0F2854] bg-[#0F2854] text-white'
                            : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] hover:border-[#0F2854]/40'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => catScrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
                  className="hidden sm:flex absolute right-0 top-0 bottom-1 z-10 items-center pl-3 bg-gradient-to-l from-white dark:from-[#111F35] via-white/90 dark:via-[#111F35]/90 to-transparent"
                >
                  <ChevronDownIcon className="w-4 h-4 text-[#0F2854] dark:text-[#E7EEF7] -rotate-90" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.catalog.brand}</label>
              <input
                value={form.brand}
                onChange={(e) => { setForm((p) => ({ ...p, brand: e.target.value })); setFormError(''); }}
                placeholder={t.catalog.egBrand}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.catalog.model}</label>
              <input
                value={form.model}
                onChange={(e) => { setForm((p) => ({ ...p, model: e.target.value })); setFormError(''); }}
                placeholder={t.catalog.egModel}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.catalog.specOptional}</label>
              <input
                value={form.spec}
                onChange={(e) => setForm((p) => ({ ...p, spec: e.target.value }))}
                placeholder={t.catalog.egSpec}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>

            {form.catId === 'chiller' && (
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.catalog.specificPowerNew}</label>
                <input
                  type="number"
                  value={form.specificPower}
                  onChange={(e) => setForm((p) => ({ ...p, specificPower: e.target.value }))}
                  placeholder={t.catalog.egSpecificPower}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.catalog.costEstimateOptional}</label>
              <input
                type="number"
                value={form.costEst}
                onChange={(e) => setForm((p) => ({ ...p, costEst: e.target.value }))}
                placeholder={t.catalog.egCost}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.catalog.imageOptional}</label>
              <div className="flex items-center gap-3">
                {form.image ? (
                  <img src={form.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
                    <BoxIcon className="w-6 h-6" />
                  </div>
                )}
                <label className={`flex-1 flex items-center justify-center py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-xs font-semibold text-gray-500 dark:text-[#8CA3C0] transition-colors ${
                  imageUploading ? 'opacity-60 pointer-events-none' : 'hover:border-[#4988C4] hover:text-[#4988C4] cursor-pointer'
                }`}>
                  {imageUploading ? '...' : (form.image ? t.catalog.changeImage : t.catalog.uploadImage)}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={imageUploading} />
                </label>
              </div>
              {imageError && <p className="text-xs text-red-500 mt-1.5">{imageError}</p>}
            </div>

            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.catalog.descriptionOptional}</label>
              <textarea
                value={form.desc}
                onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
                placeholder={t.catalog.egDescription}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4] resize-none"
              />
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            </div>

            <div className="px-6 sm:px-7 py-4 border-t border-gray-100 dark:border-white/8 shrink-0">
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={imageUploading}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-base font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {modalMode === 'add' ? <PlusIcon className="w-4 h-4" /> : null}
                {modalMode === 'add' ? t.common.add : t.common.save}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {calculatorItem && (
        <SavingsCalculator item={calculatorItem} onClose={() => setCalculatorItem(null)} />
      )}
    </AppLayout>
  );
}

export default Catalog;
