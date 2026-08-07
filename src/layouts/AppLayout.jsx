import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import companyLogo from '../assets/Logo.png';
import { useFactory } from '../context/factoryStore.js';
import { getSession, logout as clearSession } from '../context/authStore.js';
import { fetchAllEquipment } from '../context/equipmentStore.js';
import { fetchAllCatalogItems } from '../context/catalogStore.js';
import { fetchAllReports } from '../context/reportsStore.js';
import { fetchAllHistory } from '../context/historyStore.js';
import { useTheme } from '../context/themeStore.js';
import { useLang } from '../context/languageStore.js';
import { Select } from '../components/Dropdown.jsx';
import {
  BoxIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  DocumentIcon,
  GearIcon,
  HomeIcon,
  LogoutIcon,
  MapPinIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
} from '../components/icons';

function getInitialCollapsed() {
  return localStorage.getItem('sidebarCollapsed') === 'true';
}

function RoleBadge({ role, stretch = false }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 bg-white dark:bg-[#111F35] rounded-full pl-3 pr-3.5 py-2 text-sm font-medium text-[#0F2854]/80 dark:text-[#C3D2E5] border border-[#0F2854]/10 dark:border-white/10 shadow-sm ${stretch ? 'flex-1 lg:flex-none lg:shrink-0' : 'shrink-0'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      {role}
    </div>
  );
}

function FactorySelect({ selectedFactory, setSelectedFactory, refreshFactories, factories, role, t, stretch = false }) {
  // An engineer assigned to 0-1 factories has nothing to switch between —
  // show it as a plain badge instead of a dropdown with a single option.
  if (role === 'engineer' && factories.length <= 1) {
    return (
      <div className={`flex items-center justify-center bg-white dark:bg-[#111F35] rounded-full pl-3.5 pr-4 py-2 text-sm font-medium text-[#0F2854]/90 dark:text-[#C3D2E5] border border-[#0F2854]/10 dark:border-white/10 shadow-sm truncate ${stretch ? 'flex-1 lg:flex-none lg:shrink-0 lg:max-w-[11rem]' : 'shrink-0 max-w-[11rem]'}`}>
        {factories[0] || t.nav.noFactoryAssigned}
      </div>
    );
  }
  const allLabel = role === 'engineer' ? t.nav.allFactoriesMine : t.nav.allFactories;
  return (
    <Select
      value={selectedFactory}
      onChange={setSelectedFactory}
      onOpen={refreshFactories}
      options={[{ value: '', label: allLabel }, ...factories.map((f) => ({ value: f, label: f }))]}
      className={stretch ? 'flex-1 lg:flex-none lg:shrink-0' : 'shrink-0'}
      triggerClassName={`flex items-center gap-1.5 bg-white dark:bg-[#111F35] rounded-full pl-3.5 pr-3 py-2 text-sm font-medium text-[#0F2854]/90 dark:text-[#C3D2E5] border border-[#0F2854]/10 dark:border-white/10 shadow-sm transition-colors ${stretch ? 'w-full justify-center lg:w-auto lg:max-w-[11rem]' : 'max-w-[11rem]'}`}
      panelClassName="min-w-[11rem]"
    />
  );
}

const navSections = [
  {
    key: 'main',
    items: [
      { to: '/home', labelKey: 'home', icon: HomeIcon },
      { to: '/reports', labelKey: 'reports', icon: DocumentIcon, countKey: 'reports' },
    ],
  },
  {
    key: 'database',
    items: [
      { to: '/equipment', labelKey: 'equipment', icon: ClipboardIcon, countKey: 'equipment' },
      // Reachable on mobile via a tab inside the Equipment page instead of
      // its own bottom-nav slot — the bar only fits so many icons there.
      { to: '/catalog', labelKey: 'catalog', icon: BoxIcon, countKey: 'catalog', mobileHidden: true },
      { to: '/history', labelKey: 'history', icon: ClockIcon, countKey: 'history' },
    ],
  },
  {
    key: 'admin',
    adminOnly: true,
    items: [
      // Reachable on mobile via a card on the Settings page instead of its own
      // bottom-nav slot — same reasoning as catalog, the bar only fits so many icons.
      { to: '/factories', labelKey: 'factories', icon: MapPinIcon, countKey: 'factories', mobileHidden: true },
    ],
  },
  {
    key: 'settingsSection',
    items: [
      { to: '/settings', labelKey: 'settings', icon: GearIcon },
    ],
  },
];

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (name || '?').slice(0, 2).toUpperCase();
}

function NavBadge({ count, active }) {
  if (!count) return null;
  return (
    <span className={`ml-auto shrink-0 text-[11px] font-bold rounded-full min-w-[1.375rem] h-5 px-1.5 flex items-center justify-center leading-none ${
      active ? 'bg-white text-[#0F2854]' : 'bg-white/10 text-white/50'
    }`}>
      {count}
    </span>
  );
}

function AppLayout({
  title, actions, children, hideHeader = false, fullBleed = false, hideFactorySelect = false,
  mobileHeaderRight = false, mobileHeaderCenter = false, topSlot = null, mobileRailOffset = false, factoryRowBelowTitle = false,
  hideRoleBadge = false, showFactoryPill = !hideFactorySelect, factoryPillAlign = 'center',
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const { factories, selectedFactory, setSelectedFactory, refreshFactories } = useFactory();
  const { t } = useLang();
  const session = getSession();
  const roleLabel = session.role === 'admin' ? t.nav.roleAdmin : t.nav.roleUser;
  const { theme, toggleTheme } = useTheme();

  // When the role badge/factory row sits below the title (mobile), it
  // scrolls out of view with the page content — this small pill fades in
  // near the top once that's happened, so which factory is selected stays
  // visible without bringing back the full row.
  const [showScrollFactoryPill, setShowScrollFactoryPill] = useState(false);
  useEffect(() => {
    if (!factoryRowBelowTitle || !showFactoryPill) return undefined;
    const onScroll = () => setShowScrollFactoryPill(window.scrollY > 90);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [factoryRowBelowTitle, showFactoryPill]);
  const currentFactoryLabel = selectedFactory
    || (session.role === 'engineer' ? t.nav.allFactoriesMine : t.nav.allFactories);
  const visibleNavSections = navSections.filter((s) => !s.adminOnly || session.role === 'admin');
  const visibleNavItems = visibleNavSections.flatMap((s) => s.items);
  const mobileNavItems = visibleNavItems.filter((item) => !item.mobileHidden);

  const [equipmentCount, setEquipmentCount] = useState(0);
  useEffect(() => {
    fetchAllEquipment().then((eq) => setEquipmentCount(eq.length)).catch(() => {});
  }, []);
  const [catalogCount, setCatalogCount] = useState(0);
  useEffect(() => {
    fetchAllCatalogItems().then((items) => setCatalogCount(items.length)).catch(() => {});
  }, []);
  const [reportsCount, setReportsCount] = useState(0);
  useEffect(() => {
    fetchAllReports().then((items) => setReportsCount(items.length)).catch(() => {});
  }, []);
  const [historyCount, setHistoryCount] = useState(0);
  useEffect(() => {
    fetchAllHistory().then((items) => setHistoryCount(items.length)).catch(() => {});
  }, []);
  const getCount = (countKey) => {
    if (countKey === 'factories') return factories.length;
    if (countKey === 'equipment') return equipmentCount;
    if (countKey === 'catalog') return catalogCount;
    if (countKey === 'reports') return reportsCount;
    if (countKey === 'history') return historyCount;
    return 0;
  };

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
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-[#0F2854] text-white px-4 py-7 z-30 transition-[width] duration-200 border-r border-white/5 ${
          collapsed ? 'lg:w-20' : 'lg:w-72'
        }`}
      >
        {/* Right edge gradient accent */}
        <span className="absolute right-0 top-16 bottom-16 w-px bg-gradient-to-b from-transparent via-[#38BDF8]/20 to-transparent pointer-events-none" />

        <button
          type="button"
          onClick={toggleCollapsed}
          className="absolute -right-3 top-10 w-6 h-6 rounded-full bg-[#0F2854] hover:bg-[#1C4D8D] border border-[#38BDF8]/30 flex items-center justify-center text-[#38BDF8] transition-colors"
        >
          <ChevronDownIcon className={`w-3 h-3 transition-transform ${collapsed ? '-rotate-90' : 'rotate-90'}`} />
        </button>

        {/* Logo */}
        <div className={`flex items-center gap-3 mb-5 ${collapsed ? 'justify-center px-0' : 'px-1'}`}>
          <div className="relative shrink-0">
            <img src={companyLogo} alt="Logo" className="w-12 h-12 object-contain drop-shadow" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-base font-extrabold tracking-[0.2em] leading-tight"
                style={{ fontFamily: "'Courier New', monospace" }}>
                ENGINSPECT
              </div>
              <div className="text-xs text-[#38BDF8]/50 leading-tight tracking-[0.05em] uppercase mt-0.5 whitespace-nowrap">
                Energy Audit System
              </div>
            </div>
          )}
        </div>

        {/* User account card */}
        <div className="relative mb-5">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            title={collapsed ? session.name : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] hover:from-white/10 hover:to-white/[0.04] border border-white/10 shadow-sm transition-colors text-left ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#4988C4] to-[#1C4D8D] flex items-center justify-center text-sm font-bold shrink-0 font-mono shadow-md ring-1 ring-white/10 overflow-hidden">
              {session.photoURL ? (
                <img src={session.photoURL} alt="" className="w-full h-full object-cover" />
              ) : initialsOf(session.name)}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0F2854]" />
            </span>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate tracking-wide leading-tight">{session.name}</p>
                  <span className="inline-block mt-1 text-[9px] font-bold text-[#38BDF8] tracking-widest font-mono uppercase bg-[#38BDF8]/10 px-1.5 py-0.5 rounded-full leading-none">
                    {roleLabel}
                  </span>
                </div>
                <ChevronDownIcon className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-48 bg-[#0F2854] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-40 text-sm">
                <div className="px-3 py-2 border-b border-white/8">
                  <p className="text-[9px] font-mono text-white/30 tracking-widest uppercase">{t.nav.userMenu}</p>
                </div>
                <button type="button" onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                  className="w-full text-left px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                  {t.nav.profile}
                </button>
                <div className="h-px bg-white/8" />
                <button type="button" onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-white/5 transition-colors">
                  {t.nav.logout}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="h-px bg-white/8 mb-5" />

        <nav className="flex flex-col gap-1.5">
          {visibleNavItems.map(({ to, labelKey, icon: Icon, countKey }) => {
            const label = t.nav[labelKey];
            return (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-base font-medium overflow-hidden ${
                    collapsed ? 'justify-center' : ''
                  } ${isActive
                    ? 'bg-white/8 text-white'
                    : 'text-[#BAE6FD]/75 hover:text-[#E0F4FF]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {!isActive && (
                      <span
                        className="absolute inset-0 -z-10 bg-white/8 [clip-path:inset(100%_0_0_0)] group-hover:[clip-path:inset(0_0_0_0)] transition-[clip-path] duration-500 ease-in-out"
                      />
                    )}
                    {isActive && !collapsed && (
                      <span className="absolute left-0 inset-y-2 w-[2px] rounded-full bg-[#38BDF8]" />
                    )}
                    {isActive && collapsed && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                    )}
                    <Icon className={`w-6 h-6 shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 ${isActive ? 'text-[#38BDF8]' : ''}`} />
                    {!collapsed && (
                      <span className={`tracking-wide ${isActive ? 'font-semibold' : ''}`}>{label}</span>
                    )}
                    {!collapsed && countKey && <NavBadge count={getCount(countKey)} active={isActive} />}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap bg-[#0F2854] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-40">
                        {label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => navigate('/equipment')}
          title={collapsed ? t.nav.newMeasurement : undefined}
          className={`mt-5 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#38BDF8]/30 hover:border-[#38BDF8]/60 hover:bg-[#38BDF8]/8 text-[#38BDF8] text-xs font-semibold transition-all ${
            collapsed ? '' : 'mx-1'
          }`}
        >
          <PlusIcon className="w-4 h-4 shrink-0" />
          {!collapsed && t.nav.newMeasurement}
        </button>

        <div className="flex-1" />

        <div className="h-px bg-white/8 mb-3" />

        <div className={`flex gap-2 ${collapsed ? 'flex-col items-center' : ''}`}>
          <button
            type="button"
            onClick={toggleTheme}
            title={collapsed ? (theme === 'dark' ? t.nav.lightMode : t.nav.darkMode) : undefined}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-semibold whitespace-nowrap ${
              collapsed ? 'justify-center' : 'flex-1'
            }`}
          >
            {theme === 'dark' ? <SunIcon className="w-4 h-4 shrink-0" /> : <MoonIcon className="w-4 h-4 shrink-0" />}
            {!collapsed && (theme === 'dark' ? t.nav.lightMode : t.nav.darkMode)}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? t.nav.logout : undefined}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-400/90 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm font-semibold whitespace-nowrap ${
              collapsed ? 'justify-center' : 'flex-1'
            }`}
          >
            <LogoutIcon className="w-4 h-4 shrink-0" />
            {!collapsed && t.nav.logout}
          </button>
        </div>
      </aside>

      <div
        className={`flex flex-col items-center lg:items-stretch relative z-10 transition-[margin,padding] duration-300 ${
          mobileRailOffset ? 'pl-20 lg:pl-0' : 'pl-0'
        } ${collapsed ? 'lg:ml-20' : 'lg:ml-72'}`}
      >
        {/* Persistent role badge + factory selector — mobile: every page; desktop: only pages without a header row (it merges into the title row otherwise) */}
        {!factoryRowBelowTitle && !(hideRoleBadge && hideFactorySelect) && (
          <div className={`${hideHeader ? 'flex lg:absolute lg:z-20 lg:top-6 lg:right-10 lg:w-auto lg:max-w-none' : 'flex lg:hidden'} ${mobileHeaderRight ? 'justify-end' : mobileHeaderCenter ? 'justify-center' : ''} w-full max-w-md items-center gap-2 px-6 pt-4`}>
            {!hideRoleBadge && <RoleBadge role={roleLabel} stretch={mobileHeaderRight} />}
            {!hideFactorySelect && (
              <FactorySelect
                selectedFactory={selectedFactory}
                setSelectedFactory={setSelectedFactory}
                refreshFactories={refreshFactories}
                factories={factories}
                t={t}
                role={session.role}
                stretch={mobileHeaderRight}
              />
            )}
          </div>
        )}

        {/* Optional slot rendered below the role badge/factory row — e.g. a page's own mobile tab switcher */}
        {topSlot}

        <div
          className={`w-full max-w-md lg:max-w-none items-center justify-between gap-4 px-6 lg:px-10 ${
            hideHeader ? 'hidden' : 'flex'
          } ${title ? 'pt-8 pb-4 lg:pt-8 lg:pb-4' : 'pt-5 pb-3 lg:pt-6 lg:pb-3'}`}
        >
          {title && <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] shrink-0">{title}</h1>}
          <div className="hidden lg:flex flex-1 items-center justify-end gap-3">
            {!hideRoleBadge && <RoleBadge role={roleLabel} />}
            {!hideFactorySelect && (
              <FactorySelect
                selectedFactory={selectedFactory}
                setSelectedFactory={setSelectedFactory}
                refreshFactories={refreshFactories}
                factories={factories}
                role={session.role}
                t={t}
              />
            )}
            {actions}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <div className="relative group lg:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 p-1 rounded-full bg-white dark:bg-[#111F35] hover:bg-[#F4F7FC] dark:hover:bg-white/5 shadow-sm transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4988C4] to-[#1C4D8D] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                  {session.photoURL ? (
                    <img src={session.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : initialsOf(session.name)}
                </span>
            </button>
            <span className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap bg-[#0F2854] text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-40">
              {session.name}
            </span>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#111F35] rounded-xl shadow-xl overflow-hidden z-40 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full text-left px-4 py-2.5 text-gray-700 dark:text-[#C3D2E5] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    {t.nav.profile}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); toggleTheme(); }}
                    className="w-full text-left px-4 py-2.5 text-gray-700 dark:text-[#C3D2E5] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    {theme === 'dark' ? t.nav.lightMode : t.nav.darkMode}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    {t.nav.logout}
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </div>

        {factoryRowBelowTitle && !(hideRoleBadge && hideFactorySelect) && (
          <div className="flex lg:hidden justify-center w-full max-w-md items-center gap-2 px-6 pb-2 -mt-[10px]">
            {!hideRoleBadge && <RoleBadge role={roleLabel} />}
            {!hideFactorySelect && (
              <FactorySelect
                selectedFactory={selectedFactory}
                setSelectedFactory={setSelectedFactory}
                refreshFactories={refreshFactories}
                factories={factories}
                t={t}
                role={session.role}
              />
            )}
          </div>
        )}

        {factoryRowBelowTitle && showFactoryPill && (
          <div className={`fixed top-3 lg:top-6 z-30 transition-all duration-200 ${
            factoryPillAlign === 'right'
              ? 'right-4 lg:right-10'
              : 'left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-10'
          } ${
            showScrollFactoryPill ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}>
            <div className="flex items-center gap-1.5 bg-white/95 dark:bg-[#111F35]/95 backdrop-blur-md rounded-full pl-2.5 pr-3.5 py-1.5 lg:pl-3.5 lg:pr-4 lg:py-2 text-xs lg:text-sm font-semibold text-[#0F2854] dark:text-[#E7EEF7] border border-[#0F2854]/10 dark:border-white/10 shadow-md">
              <MapPinIcon className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-[#4988C4] shrink-0" />
              <span className="max-w-[10rem] truncate">{currentFactoryLabel}</span>
            </div>
          </div>
        )}

        <div
          className={
            fullBleed
              ? 'w-full max-w-md lg:max-w-none lg:flex-1'
              : `w-full max-w-md lg:max-w-none lg:flex-1 px-5 lg:px-10 pb-24 lg:pb-12 ${
                  hideHeader ? 'pt-3 lg:pt-2' : factoryRowBelowTitle ? 'pt-[10px] lg:pt-2' : 'pt-6 lg:pt-2'
                }`
          }
        >
          {children}
        </div>
      </div>

      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-5 z-20">
        <nav className="relative bg-[#0F2854]/95 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between px-1.5 py-1.5"
          style={{ boxShadow: '0 8px 32px rgba(10,27,61,0.7), 0 0 0 1px rgba(56,189,248,0.08)' }}>
          <span className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-[#38BDF8]/40 to-transparent pointer-events-none" />
          {mobileNavItems.map(({ to, labelKey, icon: Icon }) => (
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
                  {t.nav[labelKey]}
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
