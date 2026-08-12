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
import { BoxIcon, CalculatorIcon, ChevronDownIcon, ClipboardIcon, PencilIcon, PlusIcon, TrashIcon, ArrowLeftIcon, CheckIcon, SparkleIcon, GearIcon } from '../components/icons';
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
      <div className="flex flex-col gap-5 w-full">
        {modalMode ? (
          <div className="max-w-4xl mx-auto w-full py-6 space-y-6 font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
                  {modalMode === 'edit' ? 'แก้ไขอุปกรณ์ในแคตตาล็อก' : 'เพิ่มอุปกรณ์ใหม่ในแคตตาล็อก'}
                </h2>
                <p className="text-sm text-gray-400 dark:text-[#7E93AF] mt-0.5">
                  กรอกรายละเอียดข้อมูลสเปก รูปภาพ และราคาประมาณการอุปกรณ์ด้านล่าง
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

            <Panel className="p-6 space-y-5 rounded-3xl">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <BoxIcon className="w-4 h-4 text-[#4988C4]" />
                หมวดหมู่และข้อมูลรุ่นอุปกรณ์ (CATEGORY & MODEL)
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-2 block">หมวดหมู่อุปกรณ์</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {realCategories.map(({ key, label, iconKey }) => {
                      const Icon = ICON_MAP[iconKey] || BoxIcon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, catId: key }))}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 transition-colors text-xs font-bold shrink-0 ${
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                      ยี่ห้อ (Brand) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น Trane, Daikin"
                      value={form.brand}
                      onChange={(e) => { setForm((p) => ({ ...p, brand: e.target.value })); setFormError(''); }}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-semibold text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                      รุ่น (Model) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น CVHE, RTAF"
                      value={form.model}
                      onChange={(e) => { setForm((p) => ({ ...p, model: e.target.value })); setFormError(''); }}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-semibold text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </Panel>

            <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-[#4988C4]">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <GearIcon className="w-4 h-4 text-[#4988C4]" />
                คุณสมบัติทางเทคนิค & ราคาประมาณการ (SPECIFICATIONS & COST)
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                      สเปกอุปกรณ์ (Specifications)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 500 TR, High Efficiency"
                      value={form.spec}
                      onChange={(e) => setForm((p) => ({ ...p, spec: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>

                  {form.catId === 'chiller' ? (
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                        ค่ากำลังไฟฟ้าจำเพาะ (Specific Power kW/TR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="เช่น 0.58"
                        value={form.specificPower}
                        onChange={(e) => setForm((p) => ({ ...p, specificPower: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                        ราคาประมาณการ (Cost Estimate ฿)
                      </label>
                      <input
                        type="number"
                        placeholder="เช่น 2500000"
                        value={form.costEst}
                        onChange={(e) => setForm((p) => ({ ...p, costEst: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {form.catId === 'chiller' && (
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                      ราคาประมาณการ (Cost Estimate ฿)
                    </label>
                    <input
                      type="number"
                      placeholder="เช่น 2500000"
                      value={form.costEst}
                      onChange={(e) => setForm((p) => ({ ...p, costEst: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                    คำอธิบายเพิ่มเติม (Description)
                  </label>
                  <textarea
                    value={form.desc}
                    onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
                    placeholder="ระบุรายละเอียดเพิ่มเติม..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none resize-none"
                  />
                </div>
              </div>
            </Panel>

            <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <SparkleIcon className="w-4 h-4 text-emerald-500" />
                รูปภาพประจำรุ่นอุปกรณ์ (CATALOG IMAGE)
              </div>

              <div className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 flex flex-col sm:flex-row items-center gap-4">
                {form.image ? (
                  <img src={form.image} alt="" className="w-24 h-24 rounded-2xl object-contain bg-white dark:bg-white/10 p-2 shadow-sm shrink-0" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
                    <BoxIcon className="w-10 h-10" />
                  </div>
                )}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <p className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7]">อัปโหลดรูปภาพรุ่นอุปกรณ์ในแคตตาล็อก</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">รองรับไฟล์ JPG, PNG ภาพพื้นหลังขาวจะแสดงผลสวยงามที่สุด</p>
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
                onClick={handleSaveItem}
                disabled={imageUploading}
                className="flex-1 py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckIcon className="w-5 h-5" />
                {modalMode === 'add' ? 'บันทึกอุปกรณ์ใหม่' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {calculatorItem && (
        <SavingsCalculator item={calculatorItem} onClose={() => setCalculatorItem(null)} />
      )}
    </AppLayout>
  );
}

export default Catalog;
