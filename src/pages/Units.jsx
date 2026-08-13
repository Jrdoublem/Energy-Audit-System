import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel } from '../components/ui';
import { Select } from '../components/Dropdown.jsx';
import { getSession } from '../context/authStore.js';
import { fetchAllUnits, saveUnitItem, deleteUnitItem } from '../context/unitsStore.js';
import { useLang } from '../context/languageStore.js';
import {
  CloseIcon, CheckIcon, GaugeIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon,
} from '../components/icons';

const CATEGORY_KEYS = ['electrical', 'temperature', 'flow', 'pressure', 'mass', 'length', 'energy', 'other'];

const inputClass = 'w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none';

function UnitFormModal({ t, mode, form, setForm, formError, onSave, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:px-4 font-sans">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <p className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
            {mode === 'edit' ? t.units.editUnit : t.units.addUnit}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#7E93AF] transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 pb-6">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
              {formError}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">{t.units.unitName}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t.units.egUnitName}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">{t.units.unitSymbol}</label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm((p) => ({ ...p, symbol: e.target.value }))}
              placeholder={t.units.egUnitSymbol}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">{t.units.unitCategory}</label>
            <Select
              value={form.category}
              onChange={(v) => setForm((p) => ({ ...p, category: v }))}
              options={CATEGORY_KEYS.map((k) => ({ value: k, label: t.units[`category${k[0].toUpperCase()}${k.slice(1)}`] }))}
              triggerClassName="flex items-center w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7]"
            />
          </div>

          <button
            type="button"
            onClick={onSave}
            className="w-full py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm transition-colors shadow-md flex items-center justify-center gap-2 mt-1"
          >
            <CheckIcon className="w-4 h-4" />
            {t.common.save}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Units() {
  const { t } = useLang();
  const session = getSession();
  const isAdmin = session.role === 'admin';

  const [units, setUnits] = useState([]);
  const refreshUnits = () => fetchAllUnits().then(setUnits).catch(() => setUnits([]));
  useEffect(() => { refreshUnits(); }, []);

  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState(null); // null | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', symbol: '', category: 'electrical' });
  const [formError, setFormError] = useState('');

  const openAddUnit = () => {
    setModalMode('add');
    setEditingId(null);
    setForm({ name: '', symbol: '', category: 'electrical' });
    setFormError('');
  };

  const openEditUnit = (unit) => {
    setModalMode('edit');
    setEditingId(unit.id);
    setForm({ name: unit.name || '', symbol: unit.symbol || '', category: unit.category || 'electrical' });
    setFormError('');
  };

  const closeModal = () => setModalMode(null);

  const handleSaveUnit = async () => {
    const name = form.name.trim();
    const symbol = form.symbol.trim();
    if (!name) { setFormError(t.units.errName); return; }
    if (!symbol) { setFormError(t.units.errSymbol); return; }
    const record = {
      id: modalMode === 'edit' && editingId ? editingId : `unit_${Date.now()}`,
      name,
      symbol,
      category: form.category,
    };
    try {
      await saveUnitItem(record);
      await refreshUnits();
      setModalMode(null);
    } catch (err) {
      console.error('Save unit failed:', err);
      setFormError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm(t.units.deleteConfirm)) return;
    setUnits((prev) => prev.filter((u) => u.id !== id));
    await deleteUnitItem(id);
  };

  const filteredUnits = useMemo(() => {
    if (!search.trim()) return units;
    const q = search.toLowerCase();
    return units.filter((u) => (u.name || '').toLowerCase().includes(q) || (u.symbol || '').toLowerCase().includes(q));
  }, [units, search]);

  const groupedUnits = useMemo(() => {
    const groups = {};
    filteredUnits.forEach((u) => {
      const key = CATEGORY_KEYS.includes(u.category) ? u.category : 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    });
    return CATEGORY_KEYS.map((key) => ({ key, items: groups[key] || [] })).filter((g) => g.items.length > 0);
  }, [filteredUnits]);

  if (!isAdmin) {
    return (
      <AppLayout
        title={
          <span className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
            {t.units.pageTitle}
          </span>
        }
        hideFactorySelect
        hideRoleBadge
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
          {t.units.pageTitle}
          <span className="text-[11px] lg:text-xs font-bold px-2.5 py-1 rounded-full bg-[#EAF4FC] dark:bg-white/10 text-[#4988C4] tracking-wide whitespace-nowrap">
            {units.length} {t.units.itemCount}
          </span>
        </span>
      }
      hideFactorySelect
      hideRoleBadge
      factoryRowBelowTitle
    >
      <div className="flex flex-col gap-6 w-full">
        {modalMode && (
          <UnitFormModal
            t={t}
            mode={modalMode}
            form={form}
            setForm={setForm}
            formError={formError}
            onSave={handleSaveUnit}
            onClose={closeModal}
          />
        )}

        <p className="text-sm text-gray-400 dark:text-[#7E93AF] -mt-3">{t.units.subtitle}</p>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.units.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#111F35] border border-[#E4EBF6] dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={openAddUnit}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-bold shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            {t.units.addUnit}
          </button>
        </div>

        {/* Grouped list */}
        {groupedUnits.length === 0 ? (
          <Panel className="p-12 text-center text-sm text-gray-400 dark:text-[#7E93AF] rounded-3xl">
            {search ? t.units.noSearchResults : t.units.noUnitsYet}
          </Panel>
        ) : (
          <div className="flex flex-col gap-5">
            {groupedUnits.map((group) => (
              <Panel key={group.key} className="p-5 space-y-3 rounded-3xl">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                  <GaugeIcon className="w-4 h-4 text-[#4988C4]" />
                  {t.units[`category${group.key[0].toUpperCase()}${group.key.slice(1)}`]}
                </div>
                <div className="flex flex-col gap-2">
                  {group.items.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10"
                    >
                      <span className="shrink-0 w-14 text-center font-mono text-sm font-extrabold text-[#4988C4] bg-[#EAF4FC] dark:bg-white/10 rounded-xl py-1.5">
                        {u.symbol}
                      </span>
                      <span className="flex-1 min-w-0 text-sm font-semibold text-[#0F2854] dark:text-[#E7EEF7] truncate">
                        {u.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditUnit(u)}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-[#8CA3C0] flex items-center justify-center transition-colors"
                        >
                          <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(u.id)}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-white/5 hover:bg-rose-500 hover:text-white text-rose-400 flex items-center justify-center transition-colors"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default Units;
