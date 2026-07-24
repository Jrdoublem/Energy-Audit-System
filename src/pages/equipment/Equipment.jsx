import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../../layouts/AppLayout';
import { useFactory } from '../../context/factoryStore.js';
import CalcModal from './CalcModal';
import {
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
  SearchIcon,
  SnowflakeIcon,
  UserIcon,
} from '../../components/icons';

const INITIAL_CATEGORIES = [
  { key: 'all', label: 'ALL', icon: ClipboardIcon },
  { key: 'chiller', label: 'Chiller', icon: SnowflakeIcon },
  { key: 'compressor', label: 'Compressor', icon: CompressorIcon },
  { key: 'pump', label: 'Pump', icon: DropletIcon },
  { key: 'boiler', label: 'Boiler', icon: FlameIcon },
  { key: 'cooling', label: 'Cooling Tower', icon: CoolingTowerIcon },
  { key: 'electrical', label: 'Electrical', icon: LightningIcon },
];

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

const INITIAL_EQUIPMENT = [
  { id: 'CH-03', category: 'chiller', brandModel: 'Carrier 30XA', building: 'อาคาร A', factory: 'โรงงาน A', owner: 'สมชาย ใจดี' },
  { id: 'CH-02', category: 'chiller', brandModel: 'Trane CVHF', building: 'อาคาร A', factory: 'โรงงาน A', owner: 'สมชาย ใจดี' },
  { id: 'CH-01', category: 'chiller', brandModel: 'Daikin EWAD', building: 'อาคาร B', factory: 'โรงงาน A', owner: 'สมหญิง รักดี' },
];

const FORM_FIELDS = [
  { key: 'id',          label: 'รหัสอุปกรณ์',       placeholder: 'เช่น CH-01', required: true },
  { key: 'factory',     label: 'ชื่อโรงงาน บริษัท', placeholder: '',            required: true },
  { key: 'building',    label: 'แผนก/อาคาร',         placeholder: '' },
  { key: 'brandModel',  label: 'ยี่ห้อ/รุ่น',        placeholder: 'พิมพ์หรือเลือก...', type: 'datalist' },
  { key: 'installDate', label: 'วันที่ผลิตจากโรงงาน', placeholder: '', type: 'month' },
  { key: 'owner',       label: 'ผู้รับผิดชอบ',        placeholder: '' },
];

function Equipment() {
  const { selectedFactory, refreshFactories } = useFactory();
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [equipment, setEquipment] = useState(() => {
    try {
      const saved = localStorage.getItem('equipment');
      return saved ? JSON.parse(saved) : INITIAL_EQUIPMENT;
    } catch {
      return INITIAL_EQUIPMENT;
    }
  });
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'add-category'
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [railOpen, setRailOpen] = useState(true);
  const [calcItem, setCalcItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [sortOrder, setSortOrder] = useState('newest');
  const catScrollRef = useRef(null);

  const activeCategory = categories.find((c) => c.key === category);

  const filtered = equipment
    .filter((item) => {
      if (selectedFactory && item.factory !== selectedFactory) return false;
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

  const handleSave = () => {
    const errors = {};
    if (!form.id) errors.id = true;
    if (!form.factory) errors.factory = true;
    if (!form.category) errors.category = true;
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    const saveEquipment = (updater) => {
      setEquipment((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem('equipment', JSON.stringify(next));
        return next;
      });
    };
    if (editingId) {
      saveEquipment((prev) => prev.map((e) => (e.id === editingId ? { ...form } : e)));
    } else {
      saveEquipment((prev) => [{ ...form }, ...prev]);
    }
    refreshFactories();
    closeModal();
  };

  const openCalcModal = (item) => {
    setCalcItem(item);
    setModal('calc');
  };

  const deleteEquipment = () => {
    setEquipment((prev) => {
      const next = prev.filter((e) => e.id !== confirmDeleteId);
      localStorage.setItem('equipment', JSON.stringify(next));
      return next;
    });
    refreshFactories();
    setConfirmDeleteId(null);
  };

  const handleSaveCategory = () => {
    if (!form.name) return;
    const rawKey = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newKey = rawKey || `cat-${categories.length}`;
    const icon = form.iconComponent || GearIcon;
    setCategories((prev) => [...prev, { key: newKey, label: form.name, icon }]);
    closeModal();
  };

  return (
    <AppLayout hideHeader flatBackground fullBleed>
      <div className={`flex min-h-dvh lg:min-h-screen lg:gap-4 ${railOpen ? 'gap-3' : 'gap-0'}`}>

        {/* Rail */}
        <div className={`flex flex-col gap-2.5 bg-[#FFFCF5] shadow-[4px_0_12px_rgba(15,40,84,0.12)] shrink-0 transition-[width,padding] duration-200 overflow-hidden lg:!w-auto lg:!p-3 ${railOpen ? 'p-3 w-[5.5rem]' : 'p-0 w-0'}`}>
          {/* Close button — mobile only */}
          <button
            type="button"
            onClick={() => setRailOpen(false)}
            className="lg:hidden w-full h-8 rounded-xl flex items-center justify-center text-[#0F2854]/40 hover:text-[#0F2854] hover:bg-[#F7F8F0] transition-colors shrink-0"
          >
            <ChevronDownIcon className="w-4 h-4 rotate-90" />
          </button>
          {categories.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => setCategory(key)}
              className={`w-16 lg:w-20 h-16 lg:h-20 rounded-2xl flex flex-col items-center justify-center gap-1 px-1 transition-colors ${
                category === key ? 'bg-[#0F2854] text-white' : 'text-[#0F2854] hover:bg-[#F7F8F0]'
              }`}
            >
              <Icon className="w-6 h-6 lg:w-7 lg:h-7 shrink-0" />
              <span className="text-[10px] lg:text-[11px] font-semibold leading-tight text-center">{label}</span>
            </button>
          ))}
          <div className="h-px bg-gray-100 my-1.5"></div>
          <button
            type="button"
            title="เพิ่มหมวดหมู่อุปกรณ์"
            onClick={() => { setForm({}); setModal('add-category'); }}
            className="w-16 lg:w-20 h-16 lg:h-20 rounded-2xl flex flex-col items-center justify-center gap-1 px-1 text-[#0F2854] hover:bg-[#F7F8F0] transition-colors"
          >
            <PlusIcon className="w-6 h-6 lg:w-7 lg:h-7 shrink-0" />
            <span className="text-[10px] lg:text-[11px] font-semibold leading-tight text-center">เพิ่ม</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-6 pt-14 lg:pt-20 pb-28 lg:pb-6 pr-5 lg:pr-10 min-w-0 relative">
          {/* Open rail button — mobile only, shown when rail is closed */}
          {!railOpen && (
            <button
              type="button"
              onClick={() => setRailOpen(true)}
              className="lg:hidden absolute left-0 top-4 z-10 w-6 h-10 bg-[#FFFCF5] rounded-r-xl shadow-[2px_0_8px_rgba(15,40,84,0.12)] flex items-center justify-center text-[#0F2854]/50 hover:text-[#0F2854] transition-colors"
            >
              <ChevronDownIcon className="w-4 h-4 -rotate-90" />
            </button>
          )}
          <div className="flex items-center gap-2 mb-4">
            <p className="text-xl font-bold text-[#0F2854]">ทะเบียนอุปกรณ์</p>
            <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-white text-[#1C4D8D]">
              {activeCategory.label}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1 min-w-0">
              <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา เช่น รหัสอุปกรณ์ ..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-full bg-white text-base focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-base font-semibold transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              เพิ่มทะเบียนอุปกรณ์
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-base text-[#0F2854]/70">
              {category === 'all' ? 'อุปกรณ์ทั้งหมด' : `รายการ ${activeCategory.label}`}({filtered.length})
            </p>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1 rounded-full bg-white text-xs font-medium text-[#0F2854] focus:outline-none focus:ring-2 focus:ring-[#4988C4] cursor-pointer"
              >
                <option value="newest">ล่าสุดก่อน</option>
                <option value="az">A-Z</option>
                <option value="za">Z-A</option>
                <option value="num">เลขน้อยไปมาก</option>
                <option value="numd">เลขมากไปน้อย</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4988C4]" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <GearIcon className="w-10 h-10 mb-2 text-[#1C4D8D]/30" />
              <p className="text-sm text-[#1C4D8D]/60">ไม่พบอุปกรณ์</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((item) => {
                const ItemIcon = categories.find((c) => c.key === item.category)?.icon || ClipboardIcon;
                return (
                  <div
                    key={item.id}
                    className="w-full flex items-center justify-between gap-3 bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-lg font-bold text-[#0F2854]">
                        <ItemIcon className="w-5 h-5 text-[#4988C4] shrink-0" />
                        {item.id}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {item.brandModel}/{item.building}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-400 min-w-0 mt-0.5">
                        <MapPinIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.factory}</span>
                        <UserIcon className="w-3 h-3 shrink-0 ml-1.5" />
                        <span className="truncate">{item.owner}</span>
                      </p>
                    </div>
                    {/* Mobile: edit+delete row / calc below — Desktop: all in a row */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0 lg:flex-row lg:items-center lg:gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="แก้ไข"
                          className="w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-gray-100 hover:bg-[#0F2854] hover:text-white text-[#4988C4] flex items-center justify-center transition-colors"
                        >
                          <PencilIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          title="ลบ"
                          className="w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-gray-100 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors"
                        >
                          <TrashIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCalcModal(item)}
                        className="flex items-center gap-1.5 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl text-white text-xs lg:text-sm font-bold transition-all duration-200 hover:shadow-[0_4px_14px_rgba(15,40,84,0.35)] hover:-translate-y-0.5 active:translate-y-0"
                        style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
                      >
                        <CalculatorIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                        คำนวณ
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
            className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg flex flex-col"
            style={{ maxHeight: '90dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-7 pt-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0F2854] flex items-center justify-center shrink-0">
                  {editingId ? <PencilIcon className="w-4 h-4 text-white" /> : <PlusIcon className="w-4 h-4 text-white" />}
                </div>
                <p className="text-lg font-bold text-[#0F2854]">{editingId ? 'แก้ไขทะเบียนอุปกรณ์' : 'เพิ่มทะเบียนอุปกรณ์'}</p>
              </div>
              <button type="button" onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors font-bold">✕</button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-2 flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold text-[#0F2854] mb-2 block">หมวดหมู่อุปกรณ์</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => catScrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
                    className="hidden sm:flex absolute left-0 top-0 bottom-1 z-10 items-center pr-3 bg-gradient-to-r from-white via-white/90 to-transparent"
                  >
                    <ChevronDownIcon className="w-4 h-4 text-[#0F2854] rotate-90" />
                  </button>
                  <div ref={catScrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:px-5">
                    {categories.filter((c) => c.key !== 'all').map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, category: key, brandModel: '', id: getNextId(key), ...(key === 'chiller' ? CHILLER_DEFAULTS : {}) }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-colors text-sm font-semibold shrink-0 ${
                          form.category === key
                            ? 'border-[#0F2854] bg-[#0F2854] text-white'
                            : 'border-gray-200 bg-gray-50 text-[#0F2854] hover:border-[#0F2854]/40'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => catScrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
                    className="hidden sm:flex absolute right-0 top-0 bottom-1 z-10 items-center pl-3 bg-gradient-to-l from-white via-white/90 to-transparent"
                  >
                    <ChevronDownIcon className="w-4 h-4 text-[#0F2854] -rotate-90" />
                  </button>
                </div>
              </div>

              {form.category === 'chiller' && (
                <div className="border-2 border-[#0F2854]/15 rounded-2xl p-4 flex flex-col gap-4">
                  {/* Chiller Type */}
                  <div>
                    <label className="text-sm font-bold text-[#0F2854] mb-1.5 block">Chiller Type</label>
                    <div className="flex gap-2">
                      {['AIR COOL', 'WATER COOL'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, chillerType: type }))}
                          className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                            form.chillerType === type
                              ? 'border-[#0F2854] bg-[#0F2854] text-white'
                              : 'border-gray-200 bg-gray-50 text-[#0F2854] hover:border-[#0F2854]/40'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cooling Capacity */}
                  <div>
                    <label className="text-sm font-bold text-[#0F2854] mb-1.5 block">Cooling Capacity (RT)</label>
                    <input
                      type="number"
                      value={form.coolingCapacity || ''}
                      onChange={(e) => setForm((p) => ({ ...p, coolingCapacity: e.target.value }))}
                      placeholder="เช่น 200"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>

                  {/* Power & Efficiency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-bold text-[#0F2854] mb-1.5 block">Power (kW)</label>
                      <input
                        type="number"
                        value={form.chillerPower || ''}
                        onChange={(e) => setForm((p) => ({ ...p, chillerPower: e.target.value }))}
                        placeholder="เช่น 646"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-[#0F2854] mb-1.5 block">Efficiency (kW/RT)</label>
                      <input
                        type="number"
                        value={form.chillerEfficiency || ''}
                        onChange={(e) => setForm((p) => ({ ...p, chillerEfficiency: e.target.value }))}
                        placeholder="เช่น 0.65"
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                      />
                    </div>
                  </div>

                  {/* Average Electricity Cost */}
                  <div>
                    <label className="text-sm font-bold text-[#0F2854] mb-1.5 block">Average Electricity Cost (บาท/kWh)</label>
                    <input
                      type="number"
                      value={form.electricityCost || ''}
                      onChange={(e) => setForm((p) => ({ ...p, electricityCost: e.target.value }))}
                      placeholder="เช่น 4.5"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                </div>
              )}

              {form.category === 'compressor' && (
                <div>
                  <label className="text-sm font-bold text-[#0F2854] mb-1.5 block">Compressor Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Screw', 'Centrifugal', 'VSD', 'Magnetic'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, compressorType: type }))}
                        className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                          form.compressorType === type
                            ? 'border-[#0F2854] bg-[#0F2854] text-white'
                            : 'border-gray-200 bg-gray-50 text-[#0F2854] hover:border-[#0F2854]/40'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {FORM_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className={`text-sm font-bold mb-1.5 flex items-center gap-1 ${formErrors[f.key] ? 'text-red-500' : 'text-[#0F2854]'}`}>
                    {f.label}
                    {f.required && <span className="text-red-500">*</span>}
                  </label>
                  {f.type === 'datalist' ? (
                    <div className="relative">
                      <input
                        list="brands-datalist"
                        value={form[f.key] || ''}
                        onChange={(e) => { setForm((p) => ({ ...p, [f.key]: e.target.value })); setFormErrors((p) => ({ ...p, [f.key]: false })); }}
                        placeholder={f.placeholder}
                        className={`w-full px-4 py-2.5 pr-9 rounded-xl bg-gray-50 border text-base text-gray-700 focus:outline-none focus:ring-2 ${formErrors[f.key] ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#4988C4]'}`}
                      />
                      {form[f.key] && (
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, [f.key]: '' }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 text-xs leading-none transition-colors"
                        >
                          ✕
                        </button>
                      )}
                      <datalist id="brands-datalist">
                        {(BRAND_OPTIONS[form.category] || Object.values(BRAND_OPTIONS).flat()).map((brand) => (
                          <option key={brand} value={brand} />
                        ))}
                      </datalist>
                    </div>
                  ) : f.type === 'date' || f.type === 'month' ? (
                    <input
                      type={f.type}
                      value={form[f.key] || ''}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  ) : (
                    <input
                      value={form[f.key] || ''}
                      onChange={(e) => { setForm((p) => ({ ...p, [f.key]: e.target.value })); setFormErrors((p) => ({ ...p, [f.key]: false })); }}
                      placeholder={f.placeholder}
                      className={`w-full px-4 py-2.5 rounded-xl bg-gray-50 border text-base text-gray-700 focus:outline-none focus:ring-2 ${formErrors[f.key] ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-[#4988C4]'}`}
                    />
                  )}
                  {formErrors[f.key] && <p className="text-xs text-red-500 mt-1">กรุณากรอก{f.label}</p>}
                </div>
              ))}

            </div>

            {/* Sticky footer */}
            <div className="px-6 sm:px-7 py-4 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-base font-semibold transition-colors"
              >
                {editingId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
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
            className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm flex flex-col"
            style={{ maxHeight: '90dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 sm:px-7 pt-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0F2854] flex items-center justify-center shrink-0">
                  <PlusIcon className="w-4 h-4 text-white" />
                </div>
                <p className="text-lg font-bold text-[#0F2854]">เพิ่มหมวดหมู่อุปกรณ์</p>
              </div>
              <button type="button" onClick={closeModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors font-bold">✕</button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-2 flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold text-[#0F2854] mb-1.5 block">ชื่อหมวดหมู่</label>
                <input
                  value={form.name || ''}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="เช่น Transformer"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#0F2854] mb-2 block">เลือกไอคอน</label>
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
                          : 'border-gray-200 bg-gray-50 text-[#0F2854] hover:border-[#0F2854]/40'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="px-6 sm:px-7 py-4 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={handleSaveCategory}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-base font-semibold transition-colors"
              >
                บันทึกหมวดหมู่
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
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                <TrashIcon className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-[#0F2854]">ลบอุปกรณ์นี้?</p>
              <p className="text-sm text-gray-400">รายการที่ลบแล้วจะไม่สามารถกู้คืนได้</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={deleteEquipment}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                ลบ
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
