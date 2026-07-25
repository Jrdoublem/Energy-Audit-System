import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel, SectionHeader } from '../components/ui';
import { loadCategories } from './equipment/categories.js';
import { loadSettings, saveSettings } from '../context/settingsStore.js';
import { getSession, loadUsers, saveUsers } from '../context/authStore.js';
import { readFactories } from '../context/factoryStore.js';
import {
  ClipboardIcon, DocumentIcon, GearIcon, PencilIcon, TrashIcon,
} from '../components/icons';
import { ICON_MAP } from '../components/iconMap.js';

const ROLE_LABELS = { admin: 'ผู้ดูแลระบบ', engineer: 'ผู้ใช้งานทั่วไป (วิศวกร)' };
const BACKUP_KEYS = ['equipment', 'history', 'measures', 'reports', 'categories', 'settings'];

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name || '?').slice(0, 2).toUpperCase();
}

function loadEquipmentCounts() {
  try {
    const eq = JSON.parse(localStorage.getItem('equipment') || '[]');
    return eq.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {});
  } catch { return {}; }
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
          className="w-full px-3 py-2.5 pr-14 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4] focus:border-transparent"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-[#7E93AF]">{unit}</span>
        )}
      </div>
    </div>
  );
}

function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const session = getSession();
  const roleLabel = ROLE_LABELS[session.role] || ROLE_LABELS.admin;
  const isAdmin = session.role === 'admin';

  const [settings, setSettings] = useState(loadSettings);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const [users, setUsers] = useState(loadUsers);
  const [userModal, setUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({});
  const [userFormError, setUserFormError] = useState('');
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
  const allFactories = useMemo(() => readFactories(), []);

  const categories = useMemo(() => loadCategories().filter((c) => c.key !== 'all'), []);
  const equipCounts = useMemo(() => loadEquipmentCounts(), []);

  const handleSaveSettings = () => {
    saveSettings(settings);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleExport = () => {
    const data = {};
    BACKUP_KEYS.forEach((k) => {
      const raw = localStorage.getItem(k);
      if (raw != null) { try { data[k] = JSON.parse(raw); } catch { /* skip invalid */ } }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enginspect-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        BACKUP_KEYS.forEach((k) => {
          if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
        });
        setImportMsg('นำเข้าข้อมูลสำเร็จ — รีเฟรชหน้าเพื่อดูข้อมูลล่าสุด');
        setSettings(loadSettings());
      } catch {
        setImportMsg('ไฟล์ไม่ถูกต้อง กรุณาตรวจสอบไฟล์สำรองข้อมูล');
      }
      setTimeout(() => setImportMsg(''), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = () => {
    BACKUP_KEYS.forEach((k) => localStorage.removeItem(k));
    setConfirmClear(false);
    setSettings(loadSettings());
    navigate('/home');
  };

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

  const handleSaveUser = () => {
    if (!userForm.name?.trim() || !userForm.email?.trim()) {
      setUserFormError('กรุณากรอกชื่อและอีเมล');
      return;
    }
    if (!editingUserId && !userForm.password) {
      setUserFormError('กรุณากำหนดรหัสผ่าน');
      return;
    }
    const emailTaken = users.some((u) => u.email === userForm.email && u.id !== editingUserId);
    if (emailTaken) {
      setUserFormError('อีเมลนี้ถูกใช้งานแล้ว');
      return;
    }
    const factories = userForm.role === 'engineer' ? (userForm.factories || []) : [];
    let next;
    if (editingUserId) {
      next = users.map((u) => (u.id === editingUserId
        ? { ...u, name: userForm.name, email: userForm.email, role: userForm.role, factories, password: userForm.password || u.password }
        : u));
    } else {
      next = [...users, { id: `u_${Date.now()}`, name: userForm.name, email: userForm.email, password: userForm.password, role: userForm.role, factories }];
    }
    saveUsers(next);
    setUsers(next);
    setUserModal(false);
  };

  const handleDeleteUser = () => {
    const next = users.filter((u) => u.id !== confirmDeleteUserId);
    saveUsers(next);
    setUsers(next);
    setConfirmDeleteUserId(null);
  };

  return (
    <AppLayout title="ตั้งค่า">
      <div className="flex flex-col gap-5 max-w-2xl">

        {/* โปรไฟล์ผู้ใช้งาน */}
        <Panel className="p-5">
          <SectionHeader title="โปรไฟล์ผู้ใช้งาน" />
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-xl bg-[#1C4D8D] border border-[#38BDF8]/20 flex items-center justify-center text-white text-base font-bold shrink-0 font-mono">
              {initialsOf(session.name)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{session.name}</p>
              <p className="text-xs text-[#4988C4] font-medium tracking-wide uppercase mt-0.5">{roleLabel}</p>
              {!isAdmin && (
                <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] mt-1">
                  โรงงานที่รับผิดชอบ: {(session.factories || []).length ? session.factories.join(', ') : 'ยังไม่ได้รับมอบหมาย'}
                </p>
              )}
            </div>
          </div>
        </Panel>

        {/* จัดการผู้ใช้งาน — เฉพาะ Admin */}
        {isAdmin && (
          <Panel className="p-5">
            <SectionHeader
              title="จัดการผู้ใช้งาน"
              right={
                <button
                  type="button"
                  onClick={openAddUser}
                  className="text-xs font-semibold text-[#4988C4] hover:text-[#0F2854] dark:text-[#E7EEF7] transition-colors"
                >
                  + เพิ่มผู้ใช้งาน
                </button>
              }
            />
            <div className="flex flex-col gap-2">
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
                    </div>
                    <p className="text-xs text-gray-400 dark:text-[#7E93AF] truncate">{u.email}</p>
                    {u.role === 'engineer' && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(u.factories || []).length ? u.factories.map((f) => (
                          <span key={f} className="text-[10px] bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-full px-2 py-0.5 text-gray-600 dark:text-[#8CA3C0]">{f}</span>
                        )) : <span className="text-[10px] text-amber-500">ยังไม่ได้ assign โรงงาน</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => openEditUser(u)} title="แก้ไข"
                      className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-[#0F2854] hover:text-white text-[#4988C4] flex items-center justify-center transition-colors">
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteUserId(u.id)} title="ลบ"
                      className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* ค่าเริ่มต้นการคำนวณ */}
        <Panel className="p-5">
          <SectionHeader title="ค่าเริ่มต้นการคำนวณ" tag="ใช้เติมอัตโนมัติในฟอร์มประเมินศักยภาพ" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field
              label="ค่าไฟฟ้าเฉลี่ย"
              unit="บาท/kWh"
              value={settings.defaultElectricityRate}
              onChange={(v) => setSettings((p) => ({ ...p, defaultElectricityRate: v }))}
            />
            <Field
              label="ชั่วโมงทำงาน/ปี"
              unit="ชม."
              value={settings.defaultOperatingHours}
              onChange={(v) => setSettings((p) => ({ ...p, defaultOperatingHours: v }))}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-2.5 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-semibold transition-colors"
            >
              บันทึกค่าเริ่มต้น
            </button>
            {savedFlash && (
              <span className="text-xs font-semibold text-emerald-600">✓ บันทึกแล้ว</span>
            )}
          </div>
        </Panel>

        {/* หมวดหมู่อุปกรณ์ */}
        <Panel className="p-5">
          <SectionHeader
            title="หมวดหมู่อุปกรณ์"
            right={
              <button
                type="button"
                onClick={() => navigate('/equipment')}
                className="text-xs font-semibold text-[#4988C4] hover:text-[#0F2854] dark:text-[#E7EEF7] transition-colors"
              >
                จัดการที่หน้าอุปกรณ์ →
              </button>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {categories.map((c) => {
              const Icon = ICON_MAP[c.iconKey] || ClipboardIcon;
              return (
                <div key={c.key} className="flex items-center gap-2.5 bg-[#F4F7FC] dark:bg-white/5 rounded-xl px-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center shrink-0 text-[#4988C4]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7] truncate">{c.label}</p>
                    <p className="text-[10px] text-gray-400 dark:text-[#7E93AF]">{equipCounts[c.key] || 0} อุปกรณ์</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* สำรองข้อมูล */}
        <Panel className="p-5">
          <SectionHeader title="ข้อมูลระบบ / สำรองข้อมูล" />
          <p className="text-xs text-gray-500 dark:text-[#7E93AF] mb-4 leading-relaxed">
            ข้อมูลทั้งหมดของระบบถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น (localStorage) — สำรองข้อมูลเป็นไฟล์เพื่อย้ายเครื่องหรือกู้คืนภายหลัง
          </p>
          <div className="flex flex-wrap gap-2.5 mb-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-semibold transition-colors"
            >
              <DocumentIcon className="w-4 h-4" />
              ส่งออกข้อมูล (Export)
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-[#4988C4] text-[#0F2854] dark:text-[#E7EEF7] text-sm font-semibold transition-colors"
            >
              นำเข้าข้อมูล (Import)
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-400 text-sm font-semibold transition-colors ml-auto"
            >
              <TrashIcon className="w-4 h-4" />
              ล้างข้อมูลทั้งหมด
            </button>
          </div>
          {importMsg && <p className="text-xs font-medium text-[#4988C4] mt-2">{importMsg}</p>}
        </Panel>

        {/* เกี่ยวกับระบบ */}
        <Panel className="p-5">
          <SectionHeader title="เกี่ยวกับระบบ" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0F2854] flex items-center justify-center shrink-0">
              <GearIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">ENGINSPECT</p>
              <p className="text-[10px] text-gray-400 dark:text-[#7E93AF] tracking-widest uppercase font-mono">v2.1.0 · Energy Audit System</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Confirm clear-all dialog */}
      {confirmClear && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 font-sans">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmClear(false)} />
          <div className="relative bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                <TrashIcon className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">ล้างข้อมูลทั้งหมด?</p>
              <p className="text-sm text-gray-400 dark:text-[#7E93AF]">อุปกรณ์ ประวัติ มาตรการ และรายงานทั้งหมดจะถูกลบ และไม่สามารถกู้คืนได้ (แนะนำให้ Export ก่อน)</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-[#8CA3C0] font-semibold text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                ล้างข้อมูล
              </button>
            </div>
          </div>
        </div>,
        document.body
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
              <p className="text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">{editingUserId ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งาน'}</p>
              <button type="button" onClick={closeUserModal} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#7E93AF] transition-colors font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-2 flex flex-col gap-4">
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">ชื่อ-นามสกุล</label>
                <input
                  value={userForm.name || ''}
                  onChange={(e) => setUserForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">อีเมล</label>
                <input
                  type="email"
                  value={userForm.email || ''}
                  onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="name@enginspect.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">รหัสผ่าน</label>
                <input
                  type="text"
                  value={userForm.password || ''}
                  onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder={editingUserId ? 'เว้นว่างไว้หากไม่เปลี่ยนรหัสผ่าน' : ''}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">บทบาท</label>
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
                  <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">โรงงานที่รับผิดชอบ (เลือกได้หลายโรงงาน)</label>
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
                    <p className="text-xs text-gray-400 dark:text-[#7E93AF]">ยังไม่มีชื่อโรงงานในระบบ — เพิ่มอุปกรณ์พร้อมชื่อโรงงานที่หน้าอุปกรณ์ก่อน</p>
                  )}
                </div>
              )}
              {userFormError && <p className="text-xs text-red-500">{userFormError}</p>}
            </div>

            <div className="px-6 sm:px-7 py-4 border-t border-gray-100 dark:border-white/8 shrink-0">
              <button
                type="button"
                onClick={handleSaveUser}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-base font-semibold transition-colors"
              >
                {editingUserId ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้งาน'}
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
              <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">ลบผู้ใช้งานนี้?</p>
              <p className="text-sm text-gray-400 dark:text-[#7E93AF]">ผู้ใช้งานจะไม่สามารถเข้าสู่ระบบได้อีก</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteUserId(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-[#8CA3C0] font-semibold text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
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

export default Settings;
