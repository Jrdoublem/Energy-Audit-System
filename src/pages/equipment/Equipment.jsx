import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import { matchesFactory, useFactory } from '../../context/factoryStore.js';
import { useLang } from '../../context/languageStore.js';
import { getSession } from '../../context/authStore.js';
import {
  fetchAllEquipment, saveEquipmentItem, deleteEquipmentItem, fetchAllCategories, saveCategoryItem,
} from '../../context/equipmentStore.js';
import { fetchAllCatalogItems } from '../../context/catalogStore.js';
import { GlassSearchInput, GlassSelect, ShellActionButton } from '../../components/ui';
import { Combobox, Select } from '../../components/Dropdown.jsx';
import CalcModal from './CalcModal';
import {
  BoxIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CompressorIcon,
  CoolingTowerIcon,
  DropletIcon,
  FlameIcon,
  GearIcon,
  LightningIcon,
  CalculatorIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  SnowflakeIcon,
  UserIcon,
  ClockIcon,
  SparkleIcon,
  ActivityIcon,
} from '../../components/icons';
import { ICON_MAP } from '../../components/iconMap.js';

const ICON_OPTIONS = [
  { key: 'GearIcon', label: 'Gear', icon: GearIcon },
  { key: 'LightningIcon', label: 'Lightning', icon: LightningIcon },
  { key: 'FlameIcon', label: 'Flame', icon: FlameIcon },
  { key: 'DropletIcon', label: 'Droplet', icon: DropletIcon },
  { key: 'SnowflakeIcon', label: 'Snowflake', icon: SnowflakeIcon },
  { key: 'CompressorIcon', label: 'Compressor', icon: CompressorIcon },
  { key: 'CoolingTowerIcon', label: 'Cooling Tower', icon: CoolingTowerIcon },
  { key: 'ClipboardIcon', label: 'Clipboard', icon: ClipboardIcon },
];

const BRAND_OPTIONS = {
  chiller: ['Carrier 30XA', 'Carrier 30HXC', 'Trane CVHF', 'Trane RTHD', 'Daikin EWAD', 'Daikin EWAP', 'York YVAA', 'York YCIV', 'Mitsubishi CAHV', 'McQuay MWC', 'LG ARUN'],
  compressor: ['Atlas Copco GA', 'Atlas Copco ZR', 'Ingersoll Rand R Series', 'Kaeser BSD', 'Kaeser CSD', 'Gardner Denver VS', 'Hitachi OSP', 'Kobelco KNW'],
  pump: ['Grundfos CM', 'Grundfos CR', 'Wilo MVI', 'Wilo Helix', 'Armstrong 4300', 'Lowara e-SV', 'KSB Etanorm', 'Ebara EVMS'],
  boiler: ['Cleaver-Brooks CB', 'Miura LX', 'Miura EX', 'Johnston Boiler', 'Fulton FB', 'Burnham ES2'],
  cooling: ['Baltimore Aircoil FXV', 'Evapco AT', 'Marley NC', 'SPX Cooling MX', 'ENEXIO 2H'],
  electrical: ['ABB ACS', 'ABB ACH', 'Siemens SINAMICS', 'Schneider ATV', 'Eaton PowerXL', 'GE AF-650', 'Legrand'],
};

function getFormFields(t) {
  return [
    { key: 'id',          label: t.equipment.fieldId,          placeholder: t.equipment.egId, required: true },
    { key: 'factory',     label: t.equipment.fieldFactory,     placeholder: t.equipment.pickOrType, type: 'datalist', required: true },
    { key: 'building',    label: t.equipment.fieldBuilding,     placeholder: '' },
    { key: 'brandModel',  label: t.equipment.fieldBrandModel,  placeholder: t.equipment.pickOrType, type: 'datalist' },
    { key: 'installDate', label: t.equipment.fieldInstallDate, placeholder: '', type: 'month' },
    { key: 'installYear', label: t.equipment.fieldInstallYear, placeholder: t.equipment.selectYear, type: 'year' },
    { key: 'owner',       label: t.equipment.fieldOwner,        placeholder: '' },
  ];
}

const CURRENT_YEAR = new Date().getFullYear();
const INSTALL_YEAR_OPTIONS = Array.from({ length: 41 }, (_, i) => String(CURRENT_YEAR - i));

function equipmentAgeYears(installYear) {
  if (!installYear) return null;
  const age = CURRENT_YEAR - parseInt(installYear, 10);
  return Number.isFinite(age) && age >= 0 ? age : null;
}

function Equipment() {
  const { t } = useLang();
  const navigate = useNavigate();
  const formFields = getFormFields(t);
  const { selectedFactory, allowedFactories, refreshFactories, factories: factoryNames } = useFactory();
  const session = getSession();
  const isAdmin = session.role === 'admin';
  const [categories, setCategories] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'add-category'
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [calcItem, setCalcItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [sortOrder, setSortOrder] = useState('newest');
  const [saving, setSaving] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const catScrollRef = useRef(null);

  useEffect(() => {
    fetchAllCategories().then(setCategories).catch(() => setCategories([]));
    fetchAllEquipment().then(setEquipment).catch(() => setEquipment([]));
    fetchAllCatalogItems().then(setCatalogItems).catch(() => setCatalogItems([]));
  }, []);

  const catalogOptionsForCategory = catalogItems
    .filter((c) => c.catId === form.category)
    .map((c) => ({ value: c.id, label: `${c.brand || ''} ${c.model || ''}`.trim() || c.id }));

  const applyCatalogPreset = (catalogId) => {
    const item = catalogItems.find((c) => c.id === catalogId);
    if (!item) return;
    setForm((p) => ({
      ...p,
      brandModel: `${item.brand || ''} ${item.model || ''}`.trim(),
      ...(item.specificPower ? { chillerEfficiency: String(item.specificPower) } : {}),
    }));
  };

  const activeCategory = categories.find((c) => c.key === category);

  const filtered = equipment
    .filter((item) => {
      if (!matchesFactory(item.factory, selectedFactory, allowedFactories)) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (search && !item.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'az') return a.id.localeCompare(b.id, 'th');
      if (sortOrder === 'za') return b.id.localeCompare(a.id, 'th');
      if (sortOrder === 'num') {
        const na = parseInt(a.id.match(/(\d+)$/)?.[1] || 0);
        const nb = parseInt(b.id.match(/(\d+)$/)?.[1] || 0);
        return na - nb;
      }
      if (sortOrder === 'numd') {
        const na = parseInt(a.id.match(/(\d+)$/)?.[1] || 0);
        const nb = parseInt(b.id.match(/(\d+)$/)?.[1] || 0);
        return nb - na;
      }
      return 0;
    });

  const CATEGORY_PREFIX = { chiller: 'CH', compressor: 'AC', pump: 'PU', boiler: 'BO', cooling: 'CT', electrical: 'EL' };

  const CHILLER_DEFAULTS = { coolingCapacity: '1000', chillerPower: '650', chillerEfficiency: '0.65', electricityCost: '4.65' };

  const getNextId = (catKey) => {
    const prefix = CATEGORY_PREFIX[catKey] || catKey.toUpperCase().slice(0, 2);
    const used = new Set(
      equipment
        .filter((e) => e.category === catKey)
        .map((e) => { const m = e.id.match(/(\d+)$/); return m ? parseInt(m[1]) : 0; })
    );
    let n = 1;
    while (used.has(n)) n++;
    return `${prefix}-${String(n).padStart(2, '0')}`;
  };

  const openAddModal = () => {
    const initCat = category !== 'all' ? category : null;
    const base = initCat ? { category: initCat, id: getNextId(initCat) } : {};
    setForm(initCat === 'chiller' ? { ...base, ...CHILLER_DEFAULTS } : base);
    setFormErrors({});
    setModal('add');
  };

  const openEditModal = (item) => {
    setForm({ ...item });
    setEditingId(item.id);
    setFormErrors({});
    setModal('add');
  };

  const closeModal = () => {
    setForm({});
    setEditingId(null);
    setFormErrors({});
    setModal(null);
  };

  const handleSave = async () => {
    const errors = {};
    if (!form.id) errors.id = true;
    if (!form.factory) errors.factory = true;
    if (!form.category) errors.category = true;
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSaving(true);
    try {
      await saveEquipmentItem(form);
      // Editing can change the id itself — since the id IS the Firestore doc
      // key, that leaves the old doc behind as an orphan unless removed.
      if (editingId && form.id !== editingId) {
        await deleteEquipmentItem(editingId);
      }
      setEquipment((prev) => {
        if (!editingId) return [{ ...form }, ...prev];
        if (form.id !== editingId) return [{ ...form }, ...prev.filter((e) => e.id !== editingId)];
        return prev.map((e) => (e.id === editingId ? { ...form } : e));
      });
      await refreshFactories();
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const openCalcModal = (item) => {
    setCalcItem(item);
    setModal('calc');
  };

  const deleteEquipment = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    await deleteEquipmentItem(id);
    setEquipment((prev) => prev.filter((e) => e.id !== id));
    await refreshFactories();
  };

  const handleSaveCategory = async () => {
    if (!form.name) return;
    const rawKey = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newKey = rawKey || `cat-${categories.length}`;
    const newCategory = { key: newKey, label: form.name, iconKey: form.iconKey || 'GearIcon' };
    setSaving(true);
    try {
      await saveCategoryItem(newCategory);
      setCategories((prev) => [...prev, newCategory]);
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const mobileTabSwitcher = (
    <div className="lg:hidden w-full max-w-md px-6 pt-3">
      <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-white/5 p-1">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold whitespace-nowrap bg-white dark:bg-[#111F35] text-[#0F2854] dark:text-[#E7EEF7] shadow-sm"
        >
          <ClipboardIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t.equipment.pageTitle}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/catalog')}
          className="flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold whitespace-nowrap text-gray-500 dark:text-[#7E93AF]"
        >
          <BoxIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t.catalog.pageTitle}</span>
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout
      hideHeader
      fullBleed
      mobileHeaderRight
      mobileRailOffset={!railCollapsed}
      topSlot={mobileTabSwitcher}
      hideRoleBadge
      hideFactorySelect
      factoryRowBelowTitle
      showFactoryPill
      factoryPillAlign="right"
    >
      <div className="flex min-h-dvh lg:min-h-screen lg:gap-4">

        {/* Rail — pinned full-height on the left on mobile (edge flush with the
            top of the screen); reverts to a normal in-flow sidebar on desktop.
            On mobile it can be slid off-screen via railCollapsed + the handle below. */}
        <div className={`fixed left-0 top-0 bottom-0 z-30 lg:static lg:z-auto lg:translate-x-0 flex flex-col gap-2.5 overflow-y-auto bg-white dark:bg-[#111F35] shadow-[4px_0_12px_rgba(15,40,84,0.06)] border-r border-[#EEF3FB] dark:border-white/8 shrink-0 w-20 lg:w-auto p-2.5 lg:p-3 transition-transform duration-300 ${
          railCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}>
          {categories.map(({ key, label, iconKey }) => {
            const Icon = ICON_MAP[iconKey] || ClipboardIcon;
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                title={label}
                onClick={() => setCategory(key)}
                className={`relative w-full h-20 rounded-2xl flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
                  active ? 'bg-[#0F2854] text-white' : 'text-[#0F2854]/60 dark:text-[#7E93AF] hover:bg-[#F4F7FC] dark:hover:bg-white/5 hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
                }`}
              >
                <Icon className="w-7 h-7 shrink-0" />
                <span className="w-full min-w-0 text-[11px] font-semibold leading-tight text-center break-words [overflow-wrap:anywhere]">{label}</span>
              </button>
            );
          })}
          {isAdmin && (
            <>
              <div className="h-px bg-gray-100 dark:bg-white/5 my-1.5"></div>
              <button
                type="button"
                title={t.equipment.addCategoryTooltip}
                onClick={() => { setForm({}); setModal('add-category'); }}
                className="w-full h-20 rounded-2xl flex flex-col items-center justify-center gap-1 px-1 text-[#0F2854]/60 hover:bg-[#F4F7FC] hover:text-[#0F2854] dark:text-[#E7EEF7] transition-colors"
              >
                <PlusIcon className="w-7 h-7 shrink-0" />
                <span className="text-[11px] font-semibold leading-tight text-center">{t.common.add}</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile-only handle to slide the category rail off-screen / back — stays
            put (doesn't move with the rail) so it's always reachable to reopen. */}
        <button
          type="button"
          onClick={() => setRailCollapsed((v) => !v)}
          title={railCollapsed ? t.common.expand : t.common.collapse}
          className={`lg:hidden fixed top-1/2 -translate-y-1/2 z-30 w-6 h-11 rounded-r-xl bg-white dark:bg-[#111F35] border border-l-0 border-[#EEF3FB] dark:border-white/8 shadow-[4px_0_12px_rgba(15,40,84,0.06)] flex items-center justify-center text-[#0F2854]/50 dark:text-[#7E93AF] transition-[left] duration-300 ${
            railCollapsed ? 'left-0' : 'left-20'
          }`}
        >
          <ChevronDownIcon className={`w-4 h-4 shrink-0 transition-transform ${railCollapsed ? '-rotate-90' : 'rotate-90'}`} />
        </button>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-6 lg:pt-20 pb-28 lg:pb-6 pr-5 lg:pr-10 min-w-0 relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
            <p className="text-xl font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.equipment.pageTitle}</p>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-white dark:bg-[#111F35] border border-[#0F2854]/10 dark:border-white/10 shadow-sm text-[#0F2854] dark:text-[#E7EEF7]">
              {activeCategory?.label}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <GlassSearchInput
              value={search}
              onChange={setSearch}
              placeholder={t.equipment.searchPlaceholder}
            />
            {isAdmin && (
              <ShellActionButton onClick={openAddModal}>
                <PlusIcon className="w-4 h-4" />
                {t.equipment.addEquipment}
              </ShellActionButton>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[#0F2854]/60 dark:text-[#7E93AF]">
              {category === 'all' ? t.equipment.allEquipment : `${t.equipment.categoryList} ${activeCategory?.label}`} ({filtered.length})
            </p>
            <GlassSelect value={sortOrder} onChange={setSortOrder}>
              <option value="newest" className="text-gray-800">{t.equipment.sortNewest}</option>
              <option value="az" className="text-gray-800">A-Z</option>
              <option value="za" className="text-gray-800">Z-A</option>
              <option value="num" className="text-gray-800">{t.equipment.sortNumAsc}</option>
              <option value="numd" className="text-gray-800">{t.equipment.sortNumDesc}</option>
            </GlassSelect>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <GearIcon className="w-10 h-10 mb-2 text-[#0F2854]/20 dark:text-[#7E93AF]/30" />
              <p className="text-sm text-[#0F2854]/50 dark:text-[#7E93AF]">{t.equipment.noEquipmentFound}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((item) => {
                const ItemIcon = ICON_MAP[categories.find((c) => c.key === item.category)?.iconKey] || ClipboardIcon;
                return (
                  <div
                    key={item.id}
                    className="w-full flex items-center justify-between gap-3 bg-white dark:bg-[#111F35] rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">
                        <ItemIcon className="w-5 h-5 text-[#4988C4] shrink-0" />
                        {item.id}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-[#7E93AF] truncate mt-0.5">
                        {item.brandModel}/{item.building}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-[#7E93AF] min-w-0 mt-0.5">
                        <span className="hidden lg:flex items-center gap-1 shrink-0">
                          <MapPinIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.factory}</span>
                        </span>
                        <UserIcon className="w-3 h-3 shrink-0 lg:ml-1.5" />
                        <span className="truncate">{item.owner}</span>
                        {item.installYear && (
                          <>
                            <ClockIcon className="w-3 h-3 shrink-0 ml-1.5" />
                            <span className="truncate shrink-0">
                              {equipmentAgeYears(item.installYear) === 0
                                ? t.equipment.ageThisYear
                                : `${equipmentAgeYears(item.installYear)} ${t.equipment.ageYearsSuffix}`}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    {/* Mobile: edit+delete row / calc below — Desktop: all in a row */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0 lg:flex-row lg:items-center lg:gap-2">
                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title={t.common.edit}
                            className="w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-[#0F2854] hover:text-white text-[#4988C4] flex items-center justify-center transition-colors"
                          >
                            <PencilIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            title={t.common.delete}
                            className="w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors"
                          >
                            <TrashIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => openCalcModal(item)}
                        className="flex items-center gap-1.5 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl text-white text-xs lg:text-sm font-bold transition-all duration-200 hover:shadow-[0_4px_14px_rgba(15,40,84,0.35)] hover:-translate-y-0.5 active:translate-y-0"
                        style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
                      >
                        <CalculatorIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                        {t.equipment.calculate}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: เพิ่มทะเบียนอุปกรณ์ */}
      {modal === 'add' && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:px-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-[#111F35] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg lg:max-w-3xl flex flex-col"
            style={{ maxHeight: '90dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-7 pt-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0F2854] flex items-center justify-center shrink-0">
                  {editingId ? <PencilIcon className="w-4 h-4 text-white" /> : <PlusIcon className="w-4 h-4 text-white" />}
                </div>
                <p className="text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">{editingId ? t.equipment.editEquipment : t.equipment.addEquipment}</p>
              </div>
              <button type="button" onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#8CA3C0] transition-colors font-bold">✕</button>
            </div>

            {/* Scrollable body */}
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
                    {categories.filter((c) => c.key !== 'all').map(({ key, label, iconKey }) => {
                      const Icon = ICON_MAP[iconKey] || GearIcon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, category: key, brandModel: '', id: getNextId(key), ...(key === 'chiller' ? CHILLER_DEFAULTS : {}) }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-colors text-sm font-semibold shrink-0 ${
                            form.category === key
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

              {form.category === 'chiller' && (
                <div className="border-2 border-[#0F2854]/15 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-4">
                  {/* Section header */}
                  <div className="flex items-center gap-1.5">
                    <GearIcon className="w-4 h-4 text-[#4988C4] shrink-0" />
                    <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.equipment.machineSpecTitle}</p>
                  </div>

                  {/* Catalog quick-fill */}
                  {catalogOptionsForCategory.length > 0 && (
                    <div className="bg-gradient-to-br from-[#EAF4FC] dark:from-white/5 to-white dark:to-transparent border border-[#4988C4]/20 dark:border-white/10 rounded-xl p-3.5">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-2">
                        <SparkleIcon className="w-3.5 h-3.5 text-[#4988C4] shrink-0" />
                        {t.equipment.catalogQuickFillTitle}
                      </p>
                      <Select
                        value=""
                        onChange={applyCatalogPreset}
                        options={catalogOptionsForCategory}
                        placeholder={t.equipment.catalogQuickFillPlaceholder}
                        triggerClassName="flex items-center gap-1.5 w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5]"
                      />
                      <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] mt-2 leading-relaxed">{t.equipment.catalogQuickFillHint}</p>
                    </div>
                  )}

                  {/* Chiller Type */}
                  <div>
                    <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.equipment.chillerTypeLabel}</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'AIR COOL', label: t.equipment.chillerTypeAirCool },
                        { value: 'WATER COOL', label: t.equipment.chillerTypeWaterCool },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, chillerType: value }))}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                            form.chillerType === value
                              ? 'border-[#0F2854] bg-[#0F2854] text-white'
                              : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] hover:border-[#0F2854]/40'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cooling Capacity / Power / Efficiency */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.equipment.coolingCapacityLabel}</label>
                      <div className="relative">
                        <SnowflakeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4988C4] shrink-0 pointer-events-none" />
                        <input
                          type="number"
                          value={form.coolingCapacity || ''}
                          onChange={(e) => setForm((p) => ({ ...p, coolingCapacity: e.target.value }))}
                          placeholder={t.equipment.egCoolingCapacity}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base font-mono text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.equipment.powerLabel}</label>
                      <div className="relative">
                        <LightningIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4988C4] shrink-0 pointer-events-none" />
                        <input
                          type="number"
                          value={form.chillerPower || ''}
                          onChange={(e) => setForm((p) => ({ ...p, chillerPower: e.target.value }))}
                          placeholder={t.equipment.egPower}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base font-mono text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.equipment.efficiencyLabel}</label>
                      <div className="relative">
                        <ActivityIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4988C4] shrink-0 pointer-events-none" />
                        <input
                          type="number"
                          value={form.chillerEfficiency || ''}
                          onChange={(e) => setForm((p) => ({ ...p, chillerEfficiency: e.target.value }))}
                          placeholder={t.equipment.egEfficiency}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base font-mono text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Average Electricity Cost */}
                  <div>
                    <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.equipment.avgElecCost}</label>
                    <input
                      type="number"
                      value={form.electricityCost || ''}
                      onChange={(e) => setForm((p) => ({ ...p, electricityCost: e.target.value }))}
                      placeholder={t.equipment.egCost}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base font-mono text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                </div>
              )}

              {form.category === 'compressor' && (
                <div>
                  <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.equipment.compressorTypeLabel}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'Screw', label: t.equipment.compressorTypeScrew },
                      { value: 'Centrifugal', label: t.equipment.compressorTypeCentrifugal },
                      { value: 'VSD', label: t.equipment.compressorTypeVSD },
                      { value: 'Magnetic', label: t.equipment.compressorTypeMagnetic },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, compressorType: value }))}
                        className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                          form.compressorType === value
                            ? 'border-[#0F2854] bg-[#0F2854] text-white'
                            : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] hover:border-[#0F2854]/40'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formFields.map((f) => (
                <div key={f.key}>
                  <label className={`text-sm font-bold mb-1.5 flex items-center gap-1 ${formErrors[f.key] ? 'text-red-500' : 'text-[#0F2854] dark:text-[#E7EEF7]'}`}>
                    {f.label}
                    {f.required && <span className="text-red-500">*</span>}
                  </label>
                  {f.type === 'datalist' ? (
                    <div className="relative">
                      <Combobox
                        value={form[f.key] || ''}
                        onChange={(v) => { setForm((p) => ({ ...p, [f.key]: v })); setFormErrors((p) => ({ ...p, [f.key]: false })); }}
                        options={f.key === 'factory' ? factoryNames : (BRAND_OPTIONS[form.category] || Object.values(BRAND_OPTIONS).flat())}
                        placeholder={f.placeholder}
                        inputClassName={`w-full px-4 py-2.5 pr-9 rounded-xl bg-gray-50 dark:bg-white/5 border text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 ${formErrors[f.key] ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 dark:border-white/10 focus:ring-[#4988C4]'}`}
                      />
                      {form[f.key] && (
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, [f.key]: '' }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/15 flex items-center justify-center text-gray-500 dark:text-[#8CA3C0] text-xs leading-none transition-colors z-10"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ) : f.type === 'date' || f.type === 'month' ? (
                    <input
                      type={f.type}
                      value={form[f.key] || ''}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  ) : f.type === 'year' ? (
                    <>
                      <Select
                        value={form[f.key] || ''}
                        onChange={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                        options={INSTALL_YEAR_OPTIONS}
                        placeholder={f.placeholder}
                        triggerClassName="flex items-center gap-1.5 w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5]"
                      />
                      {form[f.key] && (
                        <p className="text-xs text-[#4988C4] mt-1.5">
                          {equipmentAgeYears(form[f.key]) === 0
                            ? t.equipment.ageThisYear
                            : `${t.equipment.ageLabel} ${equipmentAgeYears(form[f.key])} ${t.equipment.ageYearsSuffix}`}
                        </p>
                      )}
                    </>
                  ) : (
                    <input
                      value={form[f.key] || ''}
                      onChange={(e) => { setForm((p) => ({ ...p, [f.key]: e.target.value })); setFormErrors((p) => ({ ...p, [f.key]: false })); }}
                      placeholder={f.placeholder}
                      className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 ${formErrors[f.key] ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 dark:border-white/10 focus:ring-[#4988C4]'}`}
                    />
                  )}
                  {formErrors[f.key] && <p className="text-xs text-red-500 mt-1">{t.equipment.fieldRequired}{f.label}</p>}
                </div>
              ))}

            </div>

            {/* Sticky footer */}
            <div className="px-6 sm:px-7 py-4 border-t border-gray-100 dark:border-white/8 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-base font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {saving ? '...' : (editingId ? t.equipment.saveEdits : t.equipment.saveData)}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal: เพิ่มหมวดหมู่อุปกรณ์ */}
      {modal === 'add-category' && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:px-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-[#111F35] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm lg:max-w-lg flex flex-col"
            style={{ maxHeight: '90dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-7 pt-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0F2854] flex items-center justify-center shrink-0">
                  <PlusIcon className="w-4 h-4 text-white" />
                </div>
                <p className="text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.equipment.addCategoryTitle}</p>
              </div>
              <button type="button" onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#8CA3C0] transition-colors font-bold">✕</button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-2 flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.equipment.categoryNameLabel}</label>
                <input
                  value={form.name || ''}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t.equipment.categoryNamePlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-2 block">{t.equipment.chooseIcon}</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setForm((p) => ({ ...p, iconKey: key, iconComponent: Icon }))}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-colors ${
                        form.iconKey === key
                          ? 'border-[#0F2854] bg-[#0F2854] text-white'
                          : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] hover:border-[#0F2854]/40'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="px-6 sm:px-7 py-4 border-t border-gray-100 dark:border-white/8 shrink-0">
              <button
                type="button"
                onClick={handleSaveCategory}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-base font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {saving ? '...' : t.equipment.saveCategory}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {modal === 'calc' && calcItem && (
        <CalcModal item={calcItem} onClose={closeModal} />
      )}

      {/* Confirm delete dialog */}
      {confirmDeleteId !== null && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 font-sans">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                <TrashIcon className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.equipment.deleteEquipmentConfirm}</p>
              <p className="text-sm text-gray-400 dark:text-[#7E93AF]">{t.equipment.deleteEquipmentWarning}</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-[#8CA3C0] font-semibold text-sm transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={deleteEquipment}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </AppLayout>
  );
}

export default Equipment;
