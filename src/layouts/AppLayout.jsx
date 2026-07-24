import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import companyLogo from '../assets/Logo.png';
import { useFactory } from '../context/factoryStore.js';
import { getSession, logout as clearSession } from '../context/authStore.js';
import { useLang } from '../pages/auth/translations.js';
import { LangToggle } from '../pages/auth/LangToggle.jsx';
import {
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  DocumentIcon,
  GearIcon,
  HomeIcon,
  MapPinIcon,
  PlusIcon,
} from '../components/icons';

function getInitialCollapsed() {
  return localStorage.getItem('sidebarCollapsed') === 'true';
}

const ROLE_LABELS = { admin: 'ผู้ดูแลระบบ', user: 'ผู้ใช้งานทั่วไป' };

function RoleBadge({ role }) {
  return (
    <div className="flex items-center gap-1.5 bg-white rounded-full pl-3 pr-3.5 py-2 text-sm font-medium text-[#0F2854]/80 border border-[#0F2854]/10 shadow-sm shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      {role}
    </div>
  );
}

function FactorySelect({ selectedFactory, setSelectedFactory, refreshFactories, factories, role }) {
  // An engineer assigned to 0-1 factories has nothing to switch between —
  // show it as a plain badge instead of a dropdown with a single option.
  if (role === 'engineer' && factories.length <= 1) {
    return (
      <div className="flex items-center bg-white rounded-full pl-3.5 pr-4 py-2 text-sm font-medium text-[#0F2854]/90 border border-[#0F2854]/10 shadow-sm shrink-0 max-w-[11rem] truncate">
        {factories[0] || 'ไม่มีโรงงานที่ได้รับมอบหมาย'}
      </div>
    );
  }
  const allLabel = role === 'engineer' ? 'โรงงานทั้งหมดของฉัน' : 'ทุกโรงงาน';
  return (
    <div className="relative shrink-0">
      <select
        value={selectedFactory}
        onChange={(e) => setSelectedFactory(e.target.value)}
        onFocus={refreshFactories}
        className="appearance-none bg-white rounded-full pl-3.5 pr-8 py-2 text-sm font-medium text-[#0F2854]/90 border border-[#0F2854]/10 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4988C4]/30 max-w-[11rem] truncate"
      >
        <option value="" className="text-gray-700">{allLabel}</option>
        {factories.map((f) => (
          <option key={f} value={f} className="text-gray-700">{f}</option>
        ))}
      </select>
      <ChevronDownIcon className="w-3 h-3 text-[#4988C4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

const navItems = [
  { to: '/home', label: 'หน้าหลัก', icon: HomeIcon },
  { to: '/equipment', label: 'อุปกรณ์', icon: ClipboardIcon },
  { to: '/history', label: 'ประวัติ',  icon: ClockIcon },
  { to: '/reports', label: 'รายงาน', icon: DocumentIcon },
  { to: '/factories', label: 'โรงงาน', icon: MapPinIcon, adminOnly: true },
  { to: '/settings', label: 'ตั้งค่า', icon: GearIcon },
];

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name || '?').slice(0, 2).toUpperCase();
}

function AppLayout({ title, actions, children, hideHeader = false, fullBleed = false }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const { factories, selectedFactory, setSelectedFactory, refreshFactories } = useFactory();
  const { lang, setLang } = useLang();
  const session = getSession();
  const roleLabel = ROLE_LABELS[session.role] || ROLE_LABELS.admin;
  const visibleNavItems = navItems.filter((n) => !n.adminOnly || session.role === 'admin');

  const handleLogout = () => {
    clearSession();
    setMenuOpen(false);
    navigate('/login');
  };

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem('sidebarCollapsed', String(!v));
      return !v;
    });
  };

  return (
    <div className="w-full font-sans relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 bg-shell-gradient"></div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-[#0A1B3D] text-white px-4 py-7 z-30 transition-[width] duration-200 border-r border-white/5 ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        {/* Right edge gradient accent */}
        <span className="absolute right-0 top-16 bottom-16 w-px bg-gradient-to-b from-transparent via-[#38BDF8]/20 to-transparent pointer-events-none" />

        <button
          type="button"
          onClick={toggleCollapsed}
          className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-[#0A1B3D] hover:bg-[#1C4D8D] border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] transition-colors"
        >
          <ChevronDownIcon className={`w-3 h-3 transition-transform ${collapsed ? '-rotate-90' : 'rotate-90'}`} />
        </button>

        {/* Logo */}
        <div className={`flex items-center gap-3 mb-6 ${collapsed ? 'justify-center px-0' : 'px-1'}`}>
          <div className="relative shrink-0">
            <img src={companyLogo} alt="Logo" className="w-9 h-9 object-contain drop-shadow" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-extrabold tracking-[0.2em] leading-tight"
                style={{ fontFamily: "'Courier New', monospace" }}>
                ENGINSPECT
              </div>
              <div className="text-[10px] text-[#38BDF8]/50 leading-tight tracking-[0.05em] uppercase mt-0.5 whitespace-nowrap">
                Energy Audit System
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-white/8 mb-5" />

        <nav className="flex flex-col gap-1.5">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-base font-medium transition-all ${
                  collapsed ? 'justify-center' : ''
                } ${isActive
                  ? 'bg-white/8 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <span className="absolute left-0 inset-y-2 w-[2px] rounded-full bg-[#38BDF8]" />
                  )}
                  {isActive && collapsed && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                  )}
                  <Icon className={`w-6 h-6 shrink-0 transition-colors ${isActive ? 'text-[#38BDF8]' : ''}`} />
                  {!collapsed && (
                    <span className={`tracking-wide ${isActive ? 'font-semibold' : ''}`}>{label}</span>
                  )}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap bg-[#0A1B3D] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-40">
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => navigate('/equipment')}
          title={collapsed ? 'เพิ่มการตรวจวัดใหม่' : undefined}
          className={`mt-5 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#38BDF8]/30 hover:border-[#38BDF8]/60 hover:bg-[#38BDF8]/8 text-[#38BDF8] text-xs font-semibold transition-all ${
            collapsed ? '' : 'mx-1'
          }`}
        >
          <PlusIcon className="w-4 h-4 shrink-0" />
          {!collapsed && 'เพิ่มการตรวจวัดใหม่'}
        </button>

        <div className="flex-1" />


        <div className="h-px bg-white/8 mb-4" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="w-8 h-8 rounded-lg bg-[#1C4D8D] border border-[#38BDF8]/20 flex items-center justify-center text-sm font-bold shrink-0 font-mono">
              {initialsOf(session.name)}
            </span>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate tracking-wide">{session.name}</p>
                  <p className="text-[9px] text-[#38BDF8]/50 truncate tracking-widest font-mono uppercase">{roleLabel}</p>
                </div>
                <ChevronDownIcon className="w-3.5 h-3.5 text-white/20 shrink-0" />
              </>
            )}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 bottom-full mb-2 w-48 bg-[#0A1B3D] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-40 text-sm">
                <div className="px-3 py-2 border-b border-white/8">
                  <p className="text-[9px] font-mono text-white/30 tracking-widest uppercase">User Menu</p>
                </div>
                <button type="button" onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  className="w-full text-left px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  โปรไฟล์
                </button>
                <button type="button" onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  className="w-full text-left px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  ตั้งค่า
                </button>
                <div className="h-px bg-white/8" />
                <button type="button" onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-white/5 transition-colors">
                  ออกจากระบบ
                </button>
              </div>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="mt-4">
            <LangToggle lang={lang} setLang={setLang} />
          </div>
        )}
      </aside>

      <div
        className={`flex flex-col items-center lg:items-stretch relative z-10 transition-[margin] duration-200 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Persistent role badge + factory selector — mobile: every page; desktop: only pages without a header row (it merges into the title row otherwise) */}
        <div className={`${hideHeader ? 'flex' : 'flex lg:hidden'} w-full max-w-md lg:max-w-none items-center gap-2 px-6 lg:px-10 pt-4 lg:pt-6`}>
          <RoleBadge role={roleLabel} />
          <FactorySelect
            selectedFactory={selectedFactory}
            setSelectedFactory={setSelectedFactory}
            refreshFactories={refreshFactories}
            factories={factories}
            role={session.role}
          />
        </div>

        <div
          className={`w-full max-w-md lg:max-w-none items-center justify-between gap-4 px-6 lg:px-10 ${
            hideHeader ? 'hidden' : 'flex'
          } ${title ? 'pt-8 pb-4 lg:pt-8 lg:pb-4' : 'pt-5 pb-3 lg:pt-6 lg:pb-3'}`}
        >
          {title && <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0F2854] shrink-0">{title}</h1>}
          <div className="hidden lg:flex flex-1 items-center justify-end gap-3">
            <RoleBadge role={roleLabel} />
            <FactorySelect
              selectedFactory={selectedFactory}
              setSelectedFactory={setSelectedFactory}
              refreshFactories={refreshFactories}
              factories={factories}
              role={session.role}
            />
            {actions}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <div className="relative group lg:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 p-1 rounded-full bg-white hover:bg-[#F4F7FC] shadow-sm transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4988C4] to-[#1C4D8D] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {initialsOf(session.name)}
                </span>
            </button>
            <span className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap bg-[#0F2854] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-40">
              {session.name}
            </span>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl overflow-hidden z-40 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    โปรไฟล์
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    ตั้งค่า
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-gray-50 transition-colors"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </div>

        <div
          className={
            fullBleed
              ? 'w-full max-w-md lg:max-w-none lg:flex-1'
              : `w-full max-w-md lg:max-w-none lg:flex-1 px-5 lg:px-10 pb-24 lg:pb-12 ${
                  hideHeader ? 'pt-3 lg:pt-2' : 'pt-6 lg:pt-2'
                }`
          }
        >
          {children}
        </div>
      </div>

      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-5 z-20">
        <nav className="relative bg-[#0A1B3D]/95 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between px-1.5 py-1.5"
          style={{ boxShadow: '0 8px 32px rgba(10,27,61,0.7), 0 0 0 1px rgba(56,189,248,0.08)' }}>
          <span className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-[#38BDF8]/40 to-transparent pointer-events-none" />
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-[10px] font-medium tracking-wider transition-colors ${
                  isActive ? 'text-[#38BDF8]' : 'text-white/35 hover:text-white/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#38BDF8]" />
                  )}
                  <Icon className="w-5 h-5 mt-1" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default AppLayout;
