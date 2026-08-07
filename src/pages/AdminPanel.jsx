import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel, SectionHeader } from '../components/ui';
import {
  getSession, fetchAllUsers, createUserAccount, updateUserAccount, deleteUserAccount,
} from '../context/authStore.js';
import { readFactories, fetchAllFactoryRecords } from '../context/factoryStore.js';
import { fetchAllEquipment } from '../context/equipmentStore.js';
import { DEFAULT_SETTINGS, fetchSettings, saveSettingsItem } from '../context/settingsStore.js';
import { useLang } from '../context/languageStore.js';
import {
  ShieldIcon, UsersIcon, DollarSignIcon, PencilIcon, TrashIcon, PlusIcon,
} from '../components/icons';

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name || '?').slice(0, 2).toUpperCase();
}

function Field({ label, unit, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 pr-16 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4] focus:border-transparent"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-[#7E93AF]">{unit}</span>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
        active ? 'bg-[#0F2854] text-white shadow-sm' : 'bg-white dark:bg-[#111F35] text-[#0F2854]/60 dark:text-[#7E93AF] border border-gray-200 dark:border-white/10 hover:border-[#4988C4]/40'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {children}
    </button>
  );
}

function AdminPanel() {
  const { t } = useLang();
  const session = getSession();
  const isAdmin = session.role === 'admin';

  const [tab, setTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({});
  const [userFormError, setUserFormError] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
  const [deleteUserError, setDeleteUserError] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [factoryRecords, setFactoryRecords] = useState([]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    fetchAllUsers().then(setUsers).catch(() => setUsers([]));
    fetchAllEquipment().then(setEquipment).catch(() => setEquipment([]));
    fetchAllFactoryRecords().then(setFactoryRecords).catch(() => setFactoryRecords([]));
    fetchSettings().then(setSettings).catch(() => {});
  }, []);

  const allFactories = useMemo(() => readFactories(undefined, equipment, factoryRecords), [equipment, factoryRecords]);

  const openAddUser = () => {
    setUserForm({ role: 'engineer', factories: [] });
    setEditingUserId(null);
    setUserFormError('');
    setUserModal(true);
  };

  const openEditUser = (u) => {
    setUserForm({ ...u, password: '' });
    setEditingUserId(u.id);
    setUserFormError('');
    setUserModal(true);
  };

  const closeUserModal = () => setUserModal(false);

  const toggleUserFactory = (f) => {
    setUserForm((p) => {
      const set = new Set(p.factories || []);
      if (set.has(f)) set.delete(f); else set.add(f);
      return { ...p, factories: [...set] };
    });
  };

  const handleSaveUser = async () => {
    if (!userForm.name?.trim() || !userForm.email?.trim()) {
      setUserFormError(t.settings.errNameEmail);
      return;
    }
    if (!editingUserId && !userForm.password) {
      setUserFormError(t.settings.errPassword);
      return;
    }
    const emailTaken = users.some((u) => u.email === userForm.email && u.id !== editingUserId);
    if (emailTaken) {
      setUserFormError(t.settings.errEmailTaken);
      return;
    }
    const factories = userForm.role === 'engineer' ? (userForm.factories || []) : [];
    const position = (userForm.position || '').trim();
    const profile = {
      name: userForm.name, email: userForm.email, role: userForm.role, factories, position,
    };
    setSavingUser(true);
    setUserFormError('');
    try {
      if (editingUserId) {
        await updateUserAccount({
          uid: editingUserId,
          email: userForm.email,
          password: userForm.password || undefined,
          name: userForm.name,
          role: userForm.role,
          factories,
          position,
        });
        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? { ...u, ...profile } : u)));
      } else {
        const uid = await createUserAccount({ ...profile, password: userForm.password });
        setUsers((prev) => [...prev, { id: uid, ...profile }]);
      }
      setUserModal(false);
    } catch (e) {
      setUserFormError(e.code === 'functions/already-exists' ? t.settings.errEmailTaken : t.settings.userSaveFailed);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    const id = confirmDeleteUserId;
    try {
      await deleteUserAccount(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setConfirmDeleteUserId(null);
    } catch {
      setDeleteUserError(t.settings.userDeleteFailed);
    }
  };

  const handleSaveSettings = async () => {
    await saveSettingsItem(settings);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const updateFactor = (id, key, value) => {
    setSettings((p) => ({
      ...p,
      emissionFactors: (p.emissionFactors || []).map((f) => (f.id === id ? { ...f, [key]: value } : f)),
    }));
  };

  const addFactor = () => {
    setSettings((p) => ({
      ...p,
      emissionFactors: [...(p.emissionFactors || []), {
        id: `factor_${Date.now()}`, key: null, name: '', unit: '', value: '', source: '',
      }],
    }));
  };

  const removeFactor = (id) => {
    setSettings((p) => ({ ...p, emissionFactors: (p.emissionFactors || []).filter((f) => f.id !== id) }));
  };

  if (!isAdmin) {
    return (
      <AppLayout title={t.adminPanel.pageTitle} hideFactorySelect factoryRowBelowTitle>
        <Panel className="p-8 text-center text-sm text-gray-400 dark:text-[#7E93AF]">
          {t.factories.adminOnly}
        </Panel>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      hideRoleBadge
      hideFactorySelect
      title={
        <span className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-red-400 shrink-0" />
          <ShieldIcon className="w-5 h-5 lg:w-6 lg:h-6 text-red-500 shrink-0" />
          {t.adminPanel.pageTitle}
        </span>
      }
      actions={
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-100 dark:border-red-500/20 whitespace-nowrap">
          <ShieldIcon className="w-3 h-3" />
          {t.adminPanel.adminOnlyBadge}
        </span>
      }
    >
      <div className="flex items-center justify-between -mt-2 mb-4 gap-2">
        <p className="text-sm text-gray-400 dark:text-[#7E93AF]">{t.adminPanel.subtitle}</p>
        <span className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 border border-red-100 dark:border-red-500/20 whitespace-nowrap shrink-0">
          <ShieldIcon className="w-3 h-3" />
          {t.adminPanel.adminOnlyBadge}
        </span>
      </div>

      <div className="flex gap-2 mb-5">
        <TabButton active={tab === 'users'} onClick={() => setTab('users')} icon={UsersIcon}>
          {t.adminPanel.tabUsers}
        </TabButton>
        <TabButton active={tab === 'defaults'} onClick={() => setTab('defaults')} icon={DollarSignIcon}>
          {t.adminPanel.tabDefaults}
        </TabButton>
      </div>

      {tab === 'users' && (
        <Panel className="p-5">
          <SectionHeader
            title={`${t.adminPanel.allUsersCount} (${users.length} ${t.adminPanel.peopleSuffix})`}
            right={
              <button
                type="button"
                onClick={openAddUser}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
              >
                <PlusIcon className="w-3.5 h-3.5" />
                {t.settings.addUser}
              </button>
            }
          />

          {/* Desktop: table */}
          <table className="hidden lg:table w-full text-sm mt-2">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-[#7E93AF] border-b border-[#EEF3FB] dark:border-white/8">
                <th className="py-2.5 px-3 font-medium">{t.adminPanel.colUser}</th>
                <th className="py-2.5 px-3 font-medium">{t.adminPanel.colEmailPosition}</th>
                <th className="py-2.5 px-3 font-medium">{t.adminPanel.colRole}</th>
                <th className="py-2.5 px-3 font-medium">{t.adminPanel.colFactoriesAccess}</th>
                <th className="py-2.5 px-3 font-medium text-right">{t.adminPanel.colManage}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F4FB] dark:divide-white/8">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#F4F7FC] dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-lg bg-[#1C4D8D] flex items-center justify-center text-white text-xs font-bold shrink-0 font-mono">
                        {initialsOf(u.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[#0F2854] dark:text-[#E7EEF7] truncate">{u.name}</p>
                        {u.id === session.id && (
                          <p className="text-[11px] text-[#4988C4]">{t.adminPanel.yourAccountLabel}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-gray-600 dark:text-[#C3D2E5] truncate">{u.email}</p>
                    <p className="text-xs text-gray-400 dark:text-[#7E93AF] truncate">{u.position || '-'}</p>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Engineer'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-500 dark:text-[#8CA3C0]">
                    {u.role === 'admin'
                      ? t.adminPanel.allFactoriesLabel
                      : ((u.factories || []).length ? u.factories.join(', ') : t.settings.notAssignedFactory)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" onClick={() => openEditUser(u)} title={t.common.edit}
                        className="w-8 h-8 rounded-full bg-[#EEF3FB] dark:bg-white/5 hover:bg-[#0F2854] hover:text-white text-[#4988C4] flex items-center justify-center transition-colors">
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== session.id && (
                        <button type="button" onClick={() => { setDeleteUserError(''); setConfirmDeleteUserId(u.id); }} title={t.common.delete}
                          className="w-8 h-8 rounded-full bg-[#EEF3FB] dark:bg-white/5 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: card list */}
          <div className="lg:hidden flex flex-col gap-2 mt-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 bg-[#F4F7FC] dark:bg-white/5 rounded-xl px-3.5 py-3">
                <span className="w-9 h-9 rounded-lg bg-[#1C4D8D] flex items-center justify-center text-white text-xs font-bold shrink-0 font-mono">
                  {initialsOf(u.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] truncate">{u.name}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${u.role === 'admin' ? 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Engineer'}
                    </span>
                    {u.id === session.id && (
                      <span className="text-[10px] text-[#4988C4] shrink-0">{t.adminPanel.yourAccountLabel}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-[#7E93AF] truncate">{u.email}</p>
                  {u.position && <p className="text-xs text-gray-400 dark:text-[#7E93AF] truncate">{u.position}</p>}
                  <p className="text-[11px] text-gray-500 dark:text-[#8CA3C0] mt-0.5 truncate">
                    {u.role === 'admin' ? t.adminPanel.allFactoriesLabel : ((u.factories || []).join(', ') || t.settings.notAssignedFactory)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => openEditUser(u)} title={t.common.edit}
                    className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-[#0F2854] hover:text-white text-[#4988C4] flex items-center justify-center transition-colors">
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  {u.id !== session.id && (
                    <button type="button" onClick={() => { setDeleteUserError(''); setConfirmDeleteUserId(u.id); }} title={t.common.delete}
                      className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === 'defaults' && (
        <div className="flex flex-col gap-5">
          <Panel className="p-5">
            <SectionHeader title={t.adminPanel.calcSectionTitle} />
            <p className="text-xs text-gray-400 dark:text-[#7E93AF] -mt-2 mb-4">{t.adminPanel.calcSectionDesc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Field
                label={t.settings.avgElecRate}
                unit={t.measures.bahtPerKwh}
                value={settings.defaultElectricityRate}
                onChange={(v) => setSettings((p) => ({ ...p, defaultElectricityRate: v }))}
              />
              <Field
                label={t.measures.operatingHoursPerYear}
                unit={t.settings.hoursUnit}
                value={settings.defaultOperatingHours}
                onChange={(v) => setSettings((p) => ({ ...p, defaultOperatingHours: v }))}
              />
              <Field
                label={t.adminPanel.carbonPriceLabel}
                unit={t.adminPanel.carbonPriceUnit}
                value={settings.defaultCarbonPrice}
                onChange={(v) => setSettings((p) => ({ ...p, defaultCarbonPrice: v }))}
              />
            </div>

            <SectionHeader
              title={t.adminPanel.emissionFactorsTitle}
              right={
                <button type="button" onClick={addFactor} className="text-xs font-semibold text-[#4988C4] hover:text-[#0F2854] dark:text-[#E7EEF7] transition-colors">
                  {t.adminPanel.addFactor}
                </button>
              }
            />
            <div className="flex flex-col gap-3">
              {(settings.emissionFactors || []).map((f) => (
                <div key={f.id} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-2.5 items-end bg-[#F4F7FC] dark:bg-white/5 rounded-xl p-3">
                  <div>
                    <label className="text-[11px] text-gray-400 dark:text-[#7E93AF] mb-1 block">{t.adminPanel.factorName}</label>
                    <input value={f.name} onChange={(e) => updateFactor(f.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 dark:text-[#7E93AF] mb-1 block">{t.adminPanel.factorUnit}</label>
                    <input value={f.unit} onChange={(e) => updateFactor(f.id, 'unit', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 dark:text-[#7E93AF] mb-1 block">{t.adminPanel.factorValueLabel}</label>
                    <input type="number" value={f.value} onChange={(e) => updateFactor(f.id, 'value', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] font-mono focus:outline-none focus:ring-2 focus:ring-[#4988C4]" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 dark:text-[#7E93AF] mb-1 block">{t.adminPanel.factorSource}</label>
                    <input value={f.source} onChange={(e) => updateFactor(f.id, 'source', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]" />
                  </div>
                  <button type="button" onClick={() => removeFactor(f.id)} title={t.common.delete}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-white/10 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors shrink-0 justify-self-start sm:justify-self-auto">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2.5 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-semibold transition-colors"
              >
                {t.settings.saveDefaults}
              </button>
              {savedFlash && (
                <span className="text-xs font-semibold text-emerald-600">{t.settings.savedFlash}</span>
              )}
            </div>
          </Panel>

          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl px-4 py-3.5">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.14A1.5 1.5 0 003.5 20.5h17a1.5 1.5 0 001.39-2.5L13.71 3.86a1.5 1.5 0 00-2.42 0z" />
            </svg>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{t.adminPanel.saveSettingsWarning}</p>
          </div>
        </div>
      )}

      {/* เพิ่ม/แก้ไขผู้ใช้งาน */}
      {userModal && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:px-4" onClick={closeUserModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-[#111F35] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md flex flex-col"
            style={{ maxHeight: '90dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 sm:px-7 pt-6 pb-4 shrink-0">
              <p className="text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">{editingUserId ? t.settings.editUser : t.settings.addUser}</p>
              <button type="button" onClick={closeUserModal} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#7E93AF] transition-colors font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-2 flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.settings.fullName}</label>
                <input
                  value={userForm.name || ''}
                  onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t.settings.egFullName}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.adminPanel.position}</label>
                <input
                  value={userForm.position || ''}
                  onChange={(e) => setUserForm((p) => ({ ...p, position: e.target.value }))}
                  placeholder={t.adminPanel.egPosition}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.settings.email}</label>
                <input
                  type="email"
                  value={userForm.email || ''}
                  onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="name@enginspect.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.settings.password}</label>
                <input
                  type="text"
                  value={userForm.password || ''}
                  onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder={editingUserId ? t.settings.leaveBlankPassword : ''}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.settings.role}</label>
                <div className="flex gap-2">
                  {['admin', 'engineer'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setUserForm((p) => ({ ...p, role: r }))}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${
                        userForm.role === r ? 'border-[#0F2854] bg-[#0F2854] text-white' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] hover:border-[#0F2854]/40'
                      }`}
                    >
                      {r === 'admin' ? 'Admin' : 'Engineer'}
                    </button>
                  ))}
                </div>
              </div>
              {userForm.role === 'engineer' && (
                <div>
                  <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.settings.responsibleFactoriesMulti}</label>
                  {allFactories.length ? (
                    <div className="flex flex-wrap gap-2">
                      {allFactories.map((f) => {
                        const checked = (userForm.factories || []).includes(f);
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => toggleUserFactory(f)}
                            className={`px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-colors ${
                              checked ? 'border-[#0F2854] bg-[#0F2854] text-white' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] hover:border-[#0F2854]/40'
                            }`}
                          >
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-[#7E93AF]">{t.settings.noFactoriesYet}</p>
                  )}
                </div>
              )}
              {userFormError && <p className="text-xs text-red-500">{userFormError}</p>}
            </div>

            <div className="px-6 sm:px-7 py-4 border-t border-gray-100 dark:border-white/8 shrink-0">
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={savingUser}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-base font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {savingUser ? '...' : (editingUserId ? t.equipment.saveEdits : t.settings.addUser)}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm delete user */}
      {confirmDeleteUserId !== null && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 font-sans">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDeleteUserId(null)} />
          <div className="relative bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                <TrashIcon className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.settings.deleteUserConfirm}</p>
              <p className="text-sm text-gray-400 dark:text-[#7E93AF]">{t.settings.deleteUserWarning}</p>
              {deleteUserError && <p className="text-xs text-red-500">{deleteUserError}</p>}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteUserId(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-[#8CA3C0] font-semibold text-sm transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
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

export default AdminPanel;
