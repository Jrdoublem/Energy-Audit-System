import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import { Panel } from '../../components/ui';
import { matchesFactory, useFactory } from '../../context/factoryStore.js';
import { useLang } from '../../context/languageStore.js';
import { getSession } from '../../context/authStore.js';
import {
  fetchAllEquipment, saveEquipmentItem, deleteEquipmentItem, fetchAllCategories, saveCategoryItem, deleteCategoryItem,
} from '../../context/equipmentStore.js';
import { fetchAllCatalogItems } from '../../context/catalogStore.js';
import { fetchAllMeasures } from '../../context/measuresStore.js';
import { deleteImage } from '../../context/storageStore.js';
import { Combobox, Select } from '../../components/Dropdown.jsx';
import CalcModal from './CalcModal';
import AddEquipmentPage from './AddEquipmentPage';
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
  SearchIcon,
  LayoutGridIcon,
  CloseIcon,
  FactoryIcon,
  CheckIcon,
  FanIcon,
  WindIcon,
  ThermometerIcon,
  GaugeIcon,
  WrenchIcon,
  BatteryIcon,
  WavesIcon,
  FilterIcon,
  PlugZapIcon,
  ContainerIcon,
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
  { key: 'FanIcon', label: 'Fan', icon: FanIcon },
  { key: 'WindIcon', label: 'Wind', icon: WindIcon },
  { key: 'ThermometerIcon', label: 'Thermometer', icon: ThermometerIcon },
  { key: 'GaugeIcon', label: 'Gauge', icon: GaugeIcon },
  { key: 'WrenchIcon', label: 'Wrench', icon: WrenchIcon },
  { key: 'BatteryIcon', label: 'Battery', icon: BatteryIcon },
  { key: 'WavesIcon', label: 'Waves', icon: WavesIcon },
  { key: 'FilterIcon', label: 'Filter', icon: FilterIcon },
  { key: 'PlugZapIcon', label: 'Plug', icon: PlugZapIcon },
  { key: 'ContainerIcon', label: 'Container', icon: ContainerIcon },
];

const BRAND_OPTIONS = {
  chiller: ['Carrier 30XA', 'Carrier 30HXC', 'Trane CVHF', 'Trane RTHD', 'Daikin EWAD', 'Daikin EWAP', 'York YVAA', 'York YCIV', 'Mitsubishi CAHV', 'McQuay MWC', 'LG ARUN'],
  compressor: ['Atlas Copco GA', 'Atlas Copco ZR', 'Ingersoll Rand R Series', 'Kaeser BSD', 'Kaeser CSD', 'Gardner Denver VS', 'Hitachi OSP', 'Kobelco KNW'],
  pump: ['Grundfos CM', 'Grundfos CR', 'Wilo MVI', 'Wilo Helix', 'Armstrong 4300', 'Lowara e-SV', 'KSB Etanorm', 'Ebara EVMS'],
  boiler: ['Cleaver-Brooks CB', 'Miura LX', 'Miura EX', 'Johnston Boiler', 'Fulton FB', 'Burnham ES2'],
  cooling: ['Baltimore Aircoil FXV', 'Evapco AT', 'Marley NC', 'SPX Cooling MX', 'ENEXIO 2H'],
  electrical: ['ABB ACS', 'ABB ACH', 'Siemens SINAMICS', 'Schneider ATV', 'Eaton PowerXL', 'GE AF-650', 'Legrand'],
};

const CATEGORY_BADGES = {
  chiller: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border-sky-200 dark:border-sky-500/20',
  compressor: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
  pump: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  boiler: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
  cooling: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
  electrical: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
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

function Equipment() {
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const formFields = getFormFields(t);
  const { selectedFactory, allowedFactories, refreshFactories, factories: factoryNames } = useFactory();
  const session = getSession();
  const isAdmin = session.role === 'admin';
  const [categories, setCategories] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [selectedEquipmentMeasures, setSelectedEquipmentMeasures] = useState(null); // { item, measures }
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'add-category' | 'calc'
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [calcItem, setCalcItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteCategoryKey, setConfirmDeleteCategoryKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('newest');
  const [saving, setSaving] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [savedToast, setSavedToast] = useState(false);
  const catScrollRef = useRef(null);

  useEffect(() => {
    fetchAllCategories().then(setCategories).catch(() => setCategories([]));
    fetchAllEquipment().then(setEquipment).catch(() => setEquipment([]));
    fetchAllCatalogItems().then(setCatalogItems).catch(() => setCatalogItems([]));
    fetchAllMeasures().then(setMeasures).catch(() => setMeasures([]));
  }, []);

  // Auto-open add form when navigated from a factory page with state.openAdd
  const autoOpenDone = useRef(false);
  useEffect(() => {
    if (autoOpenDone.current) return;
    const state = location.state;
    if (!state?.openAdd) return;
    autoOpenDone.current = true;
    const initCat = 'chiller';
    const preFactory = state.factory || '';
    const base = {
      category: initCat,
      id: '',
      factory: preFactory,
      installYear: String(CURRENT_YEAR),
    };
    setForm({ ...base, ...CHILLER_DEFAULTS });
    setFormErrors({});
    setModal('add');
    // Clear the state so navigating back doesn't re-open
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state]);

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

  // Equipment matching current factory filter
  const factoryScopedEquipment = useMemo(() => {
    return equipment.filter((item) => matchesFactory(item.factory, selectedFactory, allowedFactories));
  }, [equipment, selectedFactory, allowedFactories]);

  const filtered = useMemo(() => {
    return factoryScopedEquipment
      .filter((item) => {
        if (category !== 'all' && item.category !== category) return false;
        if (search) {
          const q = search.toLowerCase();
          const matchId = (item.id || '').toLowerCase().includes(q);
          const matchModel = (item.brandModel || '').toLowerCase().includes(q);
          const matchBuilding = (item.building || '').toLowerCase().includes(q);
          const matchOwner = (item.owner || '').toLowerCase().includes(q);
          const matchFactory = (item.factory || '').toLowerCase().includes(q);
          if (!matchId && !matchModel && !matchBuilding && !matchOwner && !matchFactory) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sortOrder === 'az') return (a.id || '').localeCompare(b.id || '', 'th');
        if (sortOrder === 'za') return (b.id || '').localeCompare(a.id || '', 'th');
        if (sortOrder === 'num') {
          const na = parseInt((a.id || '').match(/(\d+)$/)?.[1] || 0);
          const nb = parseInt((b.id || '').match(/(\d+)$/)?.[1] || 0);
          return na - nb;
        }
        if (sortOrder === 'numd') {
          const na = parseInt((a.id || '').match(/(\d+)$/)?.[1] || 0);
          const nb = parseInt((b.id || '').match(/(\d+)$/)?.[1] || 0);
          return nb - na;
        }
        return 0;
      });
  }, [factoryScopedEquipment, category, search, sortOrder]);

  const CATEGORY_PREFIX = { chiller: 'CH', compressor: 'AC', pump: 'PU', boiler: 'BO', cooling: 'CT', electrical: 'EL' };
  const CHILLER_DEFAULTS = { coolingCapacity: '1000', chillerPower: '650', chillerEfficiency: '0.65', electricityCost: '4.65' };

  const getNextId = (catKey) => {
    const prefix = CATEGORY_PREFIX[catKey] || catKey.toUpperCase().slice(0, 2);
    const used = new Set(
      equipment
        .filter((e) => e.category === catKey)
        .map((e) => { const m = (e.id || '').match(/(\d+)$/); return m ? parseInt(m[1]) : 0; })
    );
    let n = 1;
    while (used.has(n)) n++;
    return `${prefix}-${String(n).padStart(2, '0')}`;
  };

  const openAddModal = () => {
    const initCat = category !== 'all' ? category : 'chiller';
    const base = {
      category: initCat,
      id: getNextId(initCat),
      factory: selectedFactory || factoryNames[0] || '',
      installYear: String(CURRENT_YEAR),
    };
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

  const handleSave = async (formData = form) => {
    const errors = {};
    if (!formData.id) errors.id = true;
    if (!formData.factory) errors.factory = true;
    if (!formData.category) errors.category = true;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      throw new Error(t.equipment.fieldRequired);
    }
    setSaving(true);
    try {
      // Stamp createdAt once, on first save, and carry it forward unchanged
      // on every later edit — this is what "เรียงตามล่าสุด" (sort by newest
      // added) sorts on, since Firestore itself has no reliable insert order.
      const existingItem = editingId ? equipment.find((e) => e.id === editingId) : null;
      const record = { ...formData, createdAt: existingItem?.createdAt || formData.createdAt || new Date().toISOString() };

      await saveEquipmentItem(record);
      if (editingId && record.id !== editingId) {
        await deleteEquipmentItem(editingId);
      }
      setEquipment((prev) => {
        if (!editingId) return [{ ...record }, ...prev];
        if (record.id !== editingId) return [{ ...record }, ...prev.filter((e) => e.id !== editingId)];
        return prev.map((e) => (e.id === editingId ? { ...record } : e));
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
    const removed = equipment.find((e) => e.id === id);
    await deleteEquipmentItem(id);
    (removed?.images || []).forEach((url) => deleteImage(url));
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

  const deleteCategory = async () => {
    const key = confirmDeleteCategoryKey;
    setConfirmDeleteCategoryKey(null);
    await deleteCategoryItem(key);
    setCategories((prev) => prev.filter((c) => c.key !== key));
    if (category === key) setCategory('all');
  };

  // Category counts in current factory scope
  const categoryCounts = useMemo(() => {
    const realCats = categories.filter((c) => c.key !== 'all');
    return realCats.map((c) => {
      const count = factoryScopedEquipment.filter((e) => e.category === c.key).length;
      return { ...c, count };
    });
  }, [categories, factoryScopedEquipment]);

  const uniqueFactoriesCount = useMemo(() => {
    return new Set(equipment.map((e) => e.factory).filter(Boolean)).size;
  }, [equipment]);

  const avgAge = useMemo(() => {
    const ages = factoryScopedEquipment.map((e) => equipmentAgeYears(e.installYear)).filter((a) => a !== null);
    if (ages.length === 0) return 0;
    return (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1);
  }, [factoryScopedEquipment]);

  // Rendered twice (once alongside search on mobile, once alongside catalog/add
  // on desktop) so the sort control can sit next to a different neighbor per
  // breakpoint — keep the options list in one place either way.
  const sortOptions = [
    { value: 'newest', label: t.equipment.sortNewest },
    { value: 'az', label: 'A-Z' },
    { value: 'za', label: 'Z-A' },
    { value: 'num', label: t.equipment.sortNumAsc },
    { value: 'numd', label: t.equipment.sortNumDesc },
  ];

  return (
    <AppLayout
      title={
        <span className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
          {t.equipment.pageTitle}
        </span>
      }
      factoryRowBelowTitle
    >
      {savedToast && (
        <div
          className="fixed top-5 left-1/2 z-50 flex items-center gap-2.5 bg-[#0F2854] dark:bg-[#111F35] text-white pl-3 pr-5 py-3 rounded-full shadow-xl border border-white/10"
          style={{ animation: 'toastIn 0.3s ease-out' }}
        >
          <span className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center shrink-0">
            <CheckIcon className="w-4 h-4 text-[#0F2854]" />
          </span>
          <span className="text-sm font-bold whitespace-nowrap">บันทึกอุปกรณ์สำเร็จ</span>
        </div>
      )}

      <div className="flex flex-col gap-6 w-full">
        {modal === 'calc' && calcItem ? (
          <CalcModal item={calcItem} onClose={closeModal} />
        ) : modal === 'add' ? (
          <AddEquipmentPage
            initialData={form}
            isEditing={!!editingId}
            categoriesList={categories}
            factoriesList={factoryNames}
            catalogItems={catalogItems}
            getNextId={getNextId}
            onCancel={closeModal}
            onSave={async (data) => {
              const isNewEquipment = !editingId;
              setForm(data);
              await handleSave(data);
              // Registering a brand-new item: skip back to the list and go
              // straight to its calculator instead of making the user find
              // and click it again. Editing an existing item still just
              // returns to the list, since that's the flow being resumed.
              if (isNewEquipment) {
                openCalcModal(data);
                window.scrollTo(0, 0);
                setSavedToast(true);
                setTimeout(() => setSavedToast(false), 2500);
              }
            }}
          />
        ) : (
          <>
        {/* Top 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          <StatCard
            label={selectedFactory ? `${t.equipment.allEquipment} (${selectedFactory})` : t.factories.totalEquipment}
            value={factoryScopedEquipment.length}
            unit={t.factories.units}
            icon={ClipboardIcon}
            accentColor="#4988C4"
          />
          <StatCard
            label="หมวดหมู่อุปกรณ์"
            value={categories.filter((c) => c.key !== 'all').length}
            unit="หมวด"
            icon={ActivityIcon}
            accentColor="#38BDF8"
          />
          <StatCard
            label="โรงงานที่เชื่อมต่อ"
            value={uniqueFactoriesCount}
            unit="แห่ง"
            icon={FactoryIcon}
            accentColor="#FACC15"
          />
          <StatCard
            label="อายุใช้งานเฉลี่ย"
            value={avgAge}
            unit="ปี"
            icon={ClockIcon}
            accentColor="#4ADE80"
          />
        </div>

        {/* Category Breakdown Filter Pills */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4988C4]" />
              {t.factories.categorySummary}
            </h3>
            {isAdmin && (
              <button
                type="button"
                onClick={() => { setForm({}); setModal('add-category'); }}
                className="text-xs font-semibold text-[#4988C4] hover:underline flex items-center gap-1"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                {t.equipment.addCategoryTitle}
              </button>
            )}
          </div>

          <div className="flex overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 gap-3 sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0">
            {/* ALL filter card — deliberately styled distinct from the category
                cards below (solid navy vs. their plain white) so it reads as
                the one "reset/overview" option rather than a peer category */}
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`shrink-0 w-32 sm:w-auto p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                category === 'all'
                  ? 'border-transparent bg-gradient-to-br from-[#0F2854] to-[#1C4D8D] text-white shadow-md ring-2 ring-[#0F2854]/40'
                  : 'border-[#E4EBF6] dark:border-white/10 bg-white dark:bg-[#111F35] hover:border-[#4988C4]/40'
              }`}
            >
              <div className={`flex justify-between items-start ${category === 'all' ? 'text-white' : 'text-[#4988C4]'}`}>
                <LayoutGridIcon className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${category === 'all' ? 'text-white/80' : 'text-gray-500 dark:text-[#8CA3C0]'}`}>
                  {t.equipment.allEquipment}
                </p>
                <p className={`text-lg font-extrabold font-mono mt-0.5 ${category === 'all' ? 'text-white' : 'text-[#0F2854] dark:text-[#E7EEF7]'}`}>
                  {factoryScopedEquipment.length} <span className={`text-[10px] font-sans font-normal ${category === 'all' ? 'text-white/70' : 'text-gray-400'}`}>{t.factories.units}</span>
                </p>
              </div>
            </button>

            {/* Category Cards */}
            {categoryCounts.map((c) => {
              const Icon = ICON_MAP[c.iconKey] || GearIcon;
              const isSelected = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={`relative shrink-0 w-32 sm:w-auto p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                    c.count === 0 ? 'opacity-50 hover:opacity-100' : ''
                  } ${
                    isSelected
                      ? 'border-[#4988C4] bg-[#EAF4FC] dark:bg-[#4988C4]/20 shadow-sm ring-2 ring-[#4988C4]/30'
                      : 'border-[#E4EBF6] dark:border-white/10 bg-white dark:bg-[#111F35] hover:border-[#4988C4]/40'
                  }`}
                >
                  {isAdmin && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteCategoryKey(c.key); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setConfirmDeleteCategoryKey(c.key); } }}
                      title={t.common.delete}
                      className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white dark:bg-[#1A2B47] border border-[#E4EBF6] dark:border-white/10 text-gray-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 flex items-center justify-center transition-colors"
                    >
                      <TrashIcon className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <div className="flex justify-between items-start">
                    <Icon className="w-5 h-5 text-[#4988C4]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#8CA3C0] truncate" title={c.label}>
                      {c.label}
                    </p>
                    <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono mt-0.5">
                      {c.count} <span className="text-[10px] font-sans font-normal text-gray-400">{t.factories.units}</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar Header (Search, Sort, Catalog, Add) */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 -mt-3">
          {/* Row 1: search — pairs with sort on mobile, stretches alone on desktop */}
          <div className="flex items-center gap-3 sm:flex-1 sm:min-w-[240px]">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.equipment.searchPlaceholder}
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white dark:bg-[#111F35] border border-[#E4EBF6] dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Sort — shown here (next to search) on mobile only */}
            <div className="flex sm:hidden items-center shrink-0">
              <Select
                value={sortOrder}
                onChange={setSortOrder}
                options={sortOptions}
                triggerClassName="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#111F35] border border-[#E4EBF6] dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                panelClassName="min-w-[11rem]"
              />
            </div>
          </div>

          {/* Row 2: catalog + add — paired together on mobile; sort rejoins here on desktop */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400 dark:text-[#7E93AF] font-medium">เรียงตาม:</span>
              <Select
                value={sortOrder}
                onChange={setSortOrder}
                options={sortOptions}
                triggerClassName="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#111F35] border border-[#E4EBF6] dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                panelClassName="min-w-[11rem]"
              />
            </div>

            <button
              type="button"
              onClick={() => navigate('/catalog')}
              className="flex sm:hidden flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 text-sm font-bold transition-colors"
            >
              <BoxIcon className="w-4 h-4" />
              แคตตาล็อก
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={openAddModal}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-bold shadow-md shadow-[#0F2854]/20 transition-all active:scale-95"
              >
                <PlusIcon className="w-4 h-4" />
                {t.equipment.addEquipment}
              </button>
            )}
          </div>
        </div>

        {/* Equipment Cards Grid */}
        {filtered.length === 0 ? (
          <Panel className="p-12 text-center text-sm text-gray-400 dark:text-[#7E93AF] rounded-3xl">
            <GearIcon className="w-10 h-10 mx-auto mb-2 text-[#0F2854]/20 dark:text-[#7E93AF]/30" />
            <p>{t.equipment.noEquipmentFound}</p>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const cat = categories.find((c) => c.key === item.category);
              const ItemIcon = ICON_MAP[cat?.iconKey] || ClipboardIcon;
              const badgeCls = CATEGORY_BADGES[item.category] || 'bg-gray-100 text-gray-600 border-gray-200';
              const age = equipmentAgeYears(item.installYear);
              const itemMeasures = measures.filter(
                (m) => m.equipmentId === item.id || m.formData?.equipmentId === item.id
              );

              return (
                <Panel
                  key={item.id}
                  className="p-5 flex flex-col justify-between gap-4 group hover:shadow-lg hover:border-[#4988C4]/40 transition-all rounded-3xl"
                >
                  <div className="space-y-3">
                    {/* Top Row: Tag + Category Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-1.5 text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono group-hover:text-[#4988C4] transition-colors">
                          <ItemIcon className="w-5 h-5 text-[#4988C4] shrink-0" />
                          {item.id}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-[#8CA3C0] font-medium mt-0.5">
                          {item.brandModel || '-'}
                        </p>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${badgeCls}`}>
                        {cat?.label || item.category}
                      </span>
                    </div>

                    {/* Metadata details */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#EEF3FB] dark:border-white/8">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-[#8CA3C0] truncate">
                        <MapPinIcon className="w-3.5 h-3.5 text-[#4988C4] shrink-0" />
                        <span className="truncate">{item.factory || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-[#8CA3C0] truncate">
                        <BoxIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{item.building || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-[#8CA3C0] truncate">
                        <UserIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{item.owner || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-[#8CA3C0] truncate">
                        <ClockIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{age === null ? '-' : age === 0 ? t.equipment.ageThisYear : `${age} ${t.equipment.ageYearsSuffix}`}</span>
                      </div>
                    </div>

                    {/* Measures Counter Badge (Click to view) */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-[#8CA3C0]">มาตรการอนุรักษ์พลังงาน:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedEquipmentMeasures({ item, measures: itemMeasures })}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                          itemMeasures.length > 0
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 hover:scale-105 shadow-sm'
                            : 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500 border border-transparent hover:border-gray-200'
                        }`}
                      >
                        <SparkleIcon className="w-3.5 h-3.5 text-amber-500" />
                        {itemMeasures.length > 0 ? `${itemMeasures.length} มาตรการ` : '0 มาตรการ (ดู)'}
                      </button>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EEF3FB] dark:border-white/8">
                    {isAdmin ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title={t.common.edit}
                          className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-[#8CA3C0] flex items-center justify-center transition-colors"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          title={t.common.delete}
                          className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white text-rose-400 flex items-center justify-center transition-colors"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : <div />}

                    <button
                      type="button"
                      onClick={() => openCalcModal(item)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold transition-all duration-200 hover:shadow-md hover:opacity-95 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
                    >
                      <CalculatorIcon className="w-3.5 h-3.5 shrink-0" />
                      {t.equipment.calculate}
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

      {/* Modal: เพิ่มหมวดหมู่อุปกรณ์ */}
      {modal === 'add-category' && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:px-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-[#111F35] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm lg:max-w-2xl flex flex-col"
            style={{ maxHeight: '90dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-7 pt-6 pb-4 shrink-0 border-b border-gray-100 dark:border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0F2854] flex items-center justify-center shrink-0">
                  <PlusIcon className="w-4 h-4 text-white" />
                </div>
                <p className="text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.equipment.addCategoryTitle}</p>
              </div>
              <button type="button" onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#8CA3C0] transition-colors">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-7 py-4 flex flex-col gap-4">
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
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {ICON_OPTIONS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setForm((p) => ({ ...p, iconKey: key, iconComponent: Icon }))}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-colors shrink-0 ${
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-base font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none shadow-md shadow-[#0F2854]/20"
              >
                {saving ? '...' : t.equipment.saveCategory}
              </button>
            </div>
          </div>
        </div>
      , document.body)}




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

      {/* Equipment Measures View Modal */}
      {selectedEquipmentMeasures !== null && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans"
          onClick={() => setSelectedEquipmentMeasures(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-[#E4EBF6] dark:border-white/10 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#EEF3FB] dark:border-white/8 shrink-0 bg-[#F4F7FC]/50 dark:bg-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0F2854] to-[#1C4D8D] text-white flex items-center justify-center shrink-0 shadow-md">
                  <SparkleIcon className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono truncate">
                      {selectedEquipmentMeasures.item.id}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#EAF4FC] dark:bg-white/10 text-[#4988C4]">
                      {selectedEquipmentMeasures.item.factory || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#8CA3C0] truncate mt-0.5">
                    {selectedEquipmentMeasures.item.brandModel || 'ทะเบียนอุปกรณ์'} · มี {selectedEquipmentMeasures.measures.length} มาตรการ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEquipmentMeasures(null)}
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-300 flex items-center justify-center transition-colors shrink-0"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Measures List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedEquipmentMeasures.measures.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-3xl bg-[#EEF3FB] dark:bg-white/5 text-[#4988C4] mx-auto flex items-center justify-center">
                    <SparkleIcon className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">
                    ยังไม่มีมาตรการสำหรับ {selectedEquipmentMeasures.item.id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-[#8CA3C0] max-w-sm mx-auto">
                    ท่านสามารถกดปุ่ม "คำนวณ & ประเมินมาตรการ" ด้านล่างเพื่อทำการวัดและบันทึกมาตรการอนุรักษ์พลังงาน
                  </p>
                </div>
              ) : (
                selectedEquipmentMeasures.measures.map((m, idx) => {
                  const isImplemented = m.status === 'ดำเนินการจริง' || m.isImplemented === true;
                  const ed = m.evalData || {};
                  const energySaved = ed.energySaved || m.energySaved || 0;
                  const costSaved = ed.costSaved || m.costSaved || 0;
                  const payback = ed.payback || m.payback || null;
                  const invest = ed.investmentCost || m.investmentCost || 0;
                  const measureName = m.measure || m.name || `มาตรการที่ ${idx + 1}`;

                  return (
                    <div
                      key={m.id || idx}
                      className="p-4 rounded-2xl bg-[#F4F7FC]/70 dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 hover:border-[#4988C4]/40 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
                            {measureName}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] mt-0.5">
                            บันทึกเมื่อ: {m.savedAt ? new Date(m.savedAt).toLocaleDateString('th-TH') : '-'}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isImplemented ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                              <CheckIcon className="w-3.5 h-3.5" />
                              ดำเนินการจริง
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              ศักยภาพ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Metric Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#EEF3FB] dark:border-white/8 text-xs font-mono">
                        <div className="p-2 rounded-xl bg-white dark:bg-[#111F35] border border-[#EEF3FB] dark:border-white/8">
                          <p className="text-[10px] text-gray-400 font-sans">พลังงานที่ประหยัด</p>
                          <p className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] mt-0.5">
                            {Number(energySaved).toLocaleString('th-TH', { maximumFractionDigits: 0 })} <span className="text-[10px] font-sans font-normal text-gray-400">kWh/ปี</span>
                          </p>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-[#111F35] border border-[#EEF3FB] dark:border-white/8">
                          <p className="text-[10px] text-gray-400 font-sans">เงินที่ประหยัด</p>
                          <p className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            ฿{Number(costSaved).toLocaleString('th-TH', { maximumFractionDigits: 0 })} <span className="text-[10px] font-sans font-normal text-gray-400">/ปี</span>
                          </p>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-[#111F35] border border-[#EEF3FB] dark:border-white/8">
                          <p className="text-[10px] text-gray-400 font-sans">เงินลงทุน</p>
                          <p className="font-extrabold text-gray-700 dark:text-gray-300 mt-0.5">
                            ฿{Number(invest).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                          </p>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-[#111F35] border border-[#EEF3FB] dark:border-white/8">
                          <p className="text-[10px] text-gray-400 font-sans">ระยะคืนทุน</p>
                          <p className="font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                            {payback ? `${Number(payback).toFixed(2)} ปี` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#EEF3FB] dark:border-white/8 shrink-0 bg-[#F4F7FC]/50 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setSelectedEquipmentMeasures(null)}
                className="px-5 py-2.5 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-[#E7EEF7] text-xs sm:text-sm font-bold transition-all"
              >
                ปิด
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetItem = selectedEquipmentMeasures.item;
                  setSelectedEquipmentMeasures(null);
                  openCalcModal(targetItem);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#0F2854] to-[#1C4D8D] hover:from-[#1C4D8D] hover:to-[#4988C4] text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
              >
                <CalculatorIcon className="w-4 h-4" />
                คำนวณ & ประเมินมาตรการใหม่
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
