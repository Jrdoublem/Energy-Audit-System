import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel, SectionHeader } from '../components/ui';
import { getSession } from '../context/authStore.js';
import { fetchAllEquipment, fetchAllCategories } from '../context/equipmentStore.js';
import { useLang } from '../context/languageStore.js';
import {
  ArrowRightIcon, ClipboardIcon, FactoryIcon, GearIcon, ShieldIcon,
} from '../components/icons';
import { ICON_MAP } from '../components/iconMap.js';

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name || '?').slice(0, 2).toUpperCase();
}

function Settings() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const session = getSession();
  const roleLabel = session.role === 'admin' ? t.nav.roleAdmin : t.settings.roleEngineer;
  const isAdmin = session.role === 'admin';

  const [equipment, setEquipment] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchAllEquipment().then(setEquipment).catch(() => setEquipment([]));
    fetchAllCategories().then((cats) => setCategories(cats.filter((c) => c.key !== 'all'))).catch(() => setCategories([]));
  }, []);

  const equipCounts = useMemo(
    () => equipment.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {}),
    [equipment]
  );

  return (
    <AppLayout
      title={
        <span className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
          {t.nav.settings}
        </span>
      }
      hideFactorySelect
      factoryRowBelowTitle
      hideRoleBadgeMobile
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-2xl lg:max-w-none lg:items-start">

        {/* โปรไฟล์ผู้ใช้งาน */}
        <Panel className="p-5">
          <SectionHeader title={t.settings.userProfile} />
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
          >
            {session.photoURL ? (
              <img src={session.photoURL} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
            ) : (
              <span className="w-12 h-12 rounded-xl bg-[#1C4D8D] border border-[#38BDF8]/20 flex items-center justify-center text-white text-base font-bold shrink-0 font-mono">
                {initialsOf(session.name)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{session.name}</p>
              <p className="text-xs text-[#4988C4] font-medium tracking-wide uppercase mt-0.5">{roleLabel}</p>
              {!isAdmin && (
                <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] mt-1">
                  {t.settings.responsibleFactories}: {(session.factories || []).length ? session.factories.join(', ') : t.settings.notAssignedYet}
                </p>
              )}
            </div>
            <ArrowRightIcon className="w-4 h-4 text-gray-300 dark:text-white/20 shrink-0" />
          </button>
        </Panel>

        {/* เกี่ยวกับระบบ */}
        <Panel className="p-5">
          <SectionHeader title={t.settings.aboutSystem} />
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

        {/* การตั้งค่าทั่วไป */}
        <Panel className="p-5 lg:col-span-2">
          <SectionHeader title={t.settings.preferences} />
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#0F2854] dark:text-[#E7EEF7]">{t.settings.language}</p>
            <div className="flex items-center h-8 rounded-full border border-gray-200 dark:border-white/10 overflow-hidden shrink-0 bg-gray-50 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setLang('th')}
                className={`h-full px-4 text-xs font-bold tracking-wide transition-colors ${
                  lang === 'th' ? 'bg-[#0F2854] text-white' : 'text-gray-400 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
                }`}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`h-full px-4 text-xs font-bold tracking-wide transition-colors ${
                  lang === 'en' ? 'bg-[#0F2854] text-white' : 'text-gray-400 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </Panel>

        {/* จัดการโรงงาน / Admin Panel — เฉพาะ Admin; ทางเข้าหลักบนมือถือ (ไม่มีในแถบล่างแล้ว) */}
        {isAdmin && (
          <Panel className="p-5">
            <SectionHeader title={t.settings.manageFactories} />
            <button
              type="button"
              onClick={() => navigate('/factories')}
              className="w-full flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-lg bg-[#0F2854] flex items-center justify-center shrink-0">
                <FactoryIcon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.settings.manageFactories}</p>
                <p className="text-xs text-gray-400 dark:text-[#7E93AF]">{t.settings.manageFactoriesDesc}</p>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-300 dark:text-white/20 shrink-0" />
            </button>
          </Panel>
        )}

        {isAdmin && (
          <Panel className="p-5">
            <SectionHeader title={t.adminPanel.pageTitle} />
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
                <ShieldIcon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.adminPanel.pageTitle}</p>
                <p className="text-xs text-gray-400 dark:text-[#7E93AF]">{t.adminPanel.subtitle}</p>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-300 dark:text-white/20 shrink-0" />
            </button>
          </Panel>
        )}

        {/* หมวดหมู่อุปกรณ์ */}
        <Panel className="p-5 lg:col-span-2">
          <SectionHeader
            title={t.equipment.equipmentCategory}
            right={
              <button
                type="button"
                onClick={() => navigate('/equipment')}
                className="text-xs font-semibold text-[#4988C4] hover:text-[#0F2854] dark:text-[#E7EEF7] transition-colors"
              >
                {t.settings.manageAtEquipmentPage}
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
                    <p className="text-[10px] text-gray-400 dark:text-[#7E93AF]">{equipCounts[c.key] || 0} {t.settings.equipmentCountSuffix}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </AppLayout>
  );
}

export default Settings;
