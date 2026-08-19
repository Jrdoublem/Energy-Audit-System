import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { Panel } from '../components/ui';
import {
  computeFactoryStats, getFactoryMeta, fetchAllFactoryRecords, saveFactoryRecord,
} from '../context/factoryStore.js';
import { fetchAllCategories, fetchAllEquipment, saveEquipmentItem } from '../context/equipmentStore.js';
import { fetchAllMeasures } from '../context/measuresStore.js';
import { fetchAllHistory } from '../context/historyStore.js';
import { fetchAllCatalogItems } from '../context/catalogStore.js';
import { fetchSettings, getEmissionFactorValue } from '../context/settingsStore.js';
import { getSession } from '../context/authStore.js';
import { ICON_MAP } from '../components/iconMap.js';
import {
  ActivityIcon, AlertTriangleIcon, ArrowLeftIcon, ArrowRightIcon,
  ChevronDownIcon, ClipboardIcon, CompressorIcon, CoolingTowerIcon,
  DropletIcon, EyeIcon, FactoryIcon, FlameIcon, LightningIcon,
  MapPinIcon, PencilIcon, PlusIcon, SnowflakeIcon, SparkleIcon,
  TrashIcon, TrendDownIcon, TrendUpIcon, UserIcon, LayoutGridIcon,
  CheckIcon, CloseIcon, GearIcon, RefreshIcon, BrushIcon, WrenchIcon,
} from '../components/icons';
import { fileToResizedDataUrl } from '../utils/image.js';
import { uploadImage } from '../context/storageStore.js';
import { THAI_PROVINCES } from '../utils/thaiProvinces.js';
import { Combobox, Select } from '../components/Dropdown.jsx';
import { useLang } from '../context/languageStore.js';
import { useTheme } from '../context/themeStore.js';
import AddEquipmentPage from './equipment/AddEquipmentPage.jsx';

function fmt(n, maxFrac = 0) {
  return (n || 0).toLocaleString('th-TH', { maximumFractionDigits: maxFrac });
}

const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_NAMES_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

const CATEGORY_COLORS = {
  chiller: '#38BDF8',
  compressor: '#A78BFA',
  pump: '#34D399',
  boiler: '#FB923C',
  cooling: '#2DD4BF',
  electrical: '#FBBF24',
};

const CATEGORY_BADGES = {
  chiller: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border-sky-200 dark:border-sky-500/20',
  compressor: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
  pump: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  boiler: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
  cooling: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
  electrical: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
};

/* ── Monthly Usage SVG Chart ── */
function MonthlyUsageChart({ data, lang }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hoverIdx, setHoverIdx] = useState(null);

  const values = data.map((d) => (d.value !== null && Number.isFinite(d.value) ? d.value : null));
  const validVals = values.filter((v) => v !== null);
  const maxVal = validVals.length > 0 ? Math.max(...validVals, 100) : 100;
  const niceMax = Math.ceil(maxVal * 1.15);

  const W = 700;
  const H = 200;
  const padL = 50;
  const padR = 25;
  const padT = 20;
  const padB = 25;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const points = data.map((d, i) => {
    const x = padL + (i / (data.length - 1)) * cW;
    const val = d.value;
    const y = val !== null ? padT + (1 - val / niceMax) * cH : null;
    return { x, y, val, name: d.name };
  });

  const filledPts = points.filter((p) => p.y !== null);

  let pathD = '';
  let areaD = '';
  if (filledPts.length > 1) {
    pathD = `M ${filledPts[0].x},${filledPts[0].y}`;
    for (let i = 1; i < filledPts.length; i++) {
      pathD += ` L ${filledPts[i].x},${filledPts[i].y}`;
    }
    areaD = `${pathD} L ${filledPts[filledPts.length - 1].x},${padT + cH} L ${filledPts[0].x},${padT + cH} Z`;
  }

  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,40,84,0.08)';
  const textColor = isDark ? '#7E93AF' : '#8CA3C0';

  return (
    <div className="w-full relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44 overflow-visible">
        <defs>
          <linearGradient id="facMonthlyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4988C4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4988C4" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((pct, i) => {
          const y = padT + (1 - pct) * cH;
          const labelVal = Math.round(niceMax * pct);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={gridColor} strokeDasharray="3,3" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" fill={textColor} fontFamily="monospace">
                {labelVal >= 1000 ? `${Math.round(labelVal / 1000)}k` : labelVal}
              </text>
            </g>
          );
        })}

        {/* Area and Line */}
        {areaD && <path d={areaD} fill="url(#facMonthlyGrad)" />}
        {pathD && (
          <path d={pathD} fill="none" stroke="#4988C4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Data points */}
        {points.map((p, i) => {
          if (p.y === null) return null;
          const isHovered = hoverIdx === i;
          return (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                fill={isHovered ? '#0F2854' : '#FFFFFF'}
                stroke="#4988C4"
                strokeWidth="2.5"
                className="transition-all duration-150"
              />
            </g>
          );
        })}

        {/* X Labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="10" fill={textColor} fontWeight="600">
            {p.name}
          </text>
        ))}
      </svg>

      {/* Floating Tooltip */}
      {hoverIdx !== null && points[hoverIdx]?.y !== null && (
        <div
          className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-[#0F2854] dark:bg-[#1C4D8D] text-white text-xs font-mono px-3 py-1.5 rounded-xl shadow-lg border border-white/10"
          style={{
            left: `${(points[hoverIdx].x / W) * 100}%`,
            top: `${(points[hoverIdx].y / H) * 100}%`,
          }}
        >
          <p className="text-[10px] text-sky-200">{points[hoverIdx].name}</p>
          <p className="font-bold">{fmt(points[hoverIdx].val)} kWh</p>
        </div>
      )}
    </div>
  );
}

function FactoryDetail() {
  const { t, lang } = useLang();
  const { name: encodedName } = useParams();
  const name = decodeURIComponent(encodedName || '');
  const navigate = useNavigate();
  const session = getSession();
  const isAdmin = session.role === 'admin';

  const [categories, setCategories] = useState([]);
  const [allEquipment, setAllEquipment] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [history, setHistory] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [settings, setSettings] = useState({});
  const [defaultOperatingHours, setDefaultOperatingHours] = useState('8000');
  const [factoryRecords, setFactoryRecords] = useState([]);
  const [selectedSubCat, setSelectedSubCat] = useState('');

  const refreshData = () => {
    fetchAllCategories().then(setCategories).catch(() => setCategories([]));
    fetchAllEquipment().then(setAllEquipment).catch(() => setAllEquipment([]));
    fetchAllMeasures().then(setMeasures).catch(() => setMeasures([]));
    fetchAllHistory().then(setHistory).catch(() => setHistory([]));
    fetchAllCatalogItems().then(setCatalogItems).catch(() => setCatalogItems([]));
    fetchAllFactoryRecords().then(setFactoryRecords).catch(() => setFactoryRecords([]));
    fetchSettings().then((s) => {
      setSettings(s || {});
      setDefaultOperatingHours(s?.defaultOperatingHours || '8000');
    }).catch(() => {});
  };

  useEffect(() => {
    refreshData();
  }, []);

  const equipment = useMemo(() => allEquipment.filter((e) => e.factory === name), [allEquipment, name]);
  const meta = useMemo(() => getFactoryMeta(name, factoryRecords), [name, factoryRecords]);
  const factoryRecord = useMemo(() => factoryRecords.find((f) => f.name === name) || {}, [factoryRecords, name]);

  const stats = useMemo(
    () => computeFactoryStats(name, allEquipment, measures, history, defaultOperatingHours),
    [name, allEquipment, measures, history, defaultOperatingHours]
  );

  // Settings emission factor and carbon tax
  const emissionFactor = useMemo(() => getEmissionFactorValue(settings, 'electricity', 0.5561), [settings]);
  const carbonTaxRate = useMemo(() => {
    const parsed = parseFloat(settings.defaultCarbonPrice);
    return Number.isFinite(parsed) ? parsed : 200;
  }, [settings]);
  const electricityRate = useMemo(() => {
    const parsed = parseFloat(settings.defaultElectricityRate);
    return Number.isFinite(parsed) ? parsed : 4.5;
  }, [settings]);

  // Current year monthly usage
  const currentYear = new Date().getFullYear();
  const storedMonthly = useMemo(() => factoryRecord.monthlyUsage?.[currentYear] || {}, [factoryRecord, currentYear]);

  // Save monthly usage to Firestore
  const handleMonthlyChange = async (monthIndex, value) => {
    const nextVal = value === '' ? undefined : parseFloat(value);
    const updatedMonthly = { ...(factoryRecord.monthlyUsage || {}) };
    updatedMonthly[currentYear] = { ...(updatedMonthly[currentYear] || {}) };
    if (nextVal === undefined || isNaN(nextVal)) {
      delete updatedMonthly[currentYear][monthIndex];
    } else {
      updatedMonthly[currentYear][monthIndex] = nextVal;
    }
    setFactoryRecords((prev) =>
      prev.map((f) => (f.name === name ? { ...f, monthlyUsage: updatedMonthly } : f))
    );
    await saveFactoryRecord(name, { monthlyUsage: updatedMonthly });
  };

  const monthNames = lang === 'th' ? MONTH_NAMES_TH : MONTH_NAMES_EN;
  const monthlyChartData = useMemo(() => {
    return monthNames.map((mName, i) => ({
      name: mName,
      value: storedMonthly[i] !== undefined && storedMonthly[i] !== '' ? parseFloat(storedMonthly[i]) : null,
    }));
  }, [monthNames, storedMonthly]);

  const filledMonths = Object.keys(storedMonthly).filter(
    (k) => storedMonthly[k] !== undefined && storedMonthly[k] !== '' && !isNaN(storedMonthly[k])
  );
  const totalKWhRecorded = filledMonths.reduce((sum, k) => sum + (parseFloat(storedMonthly[k]) || 0), 0);
  const annualizedKWh = filledMonths.length > 0 ? (totalKWhRecorded / filledMonths.length) * 12 : 0;
  const annualCo2 = (annualizedKWh * emissionFactor) / 1000;
  const annualTax = annualCo2 * carbonTaxRate;

  // Factory Dashboard Stats
  const factoryDashboardStats = useMemo(() => {
    const fEqs = equipment;
    const fEqIds = new Set(fEqs.map((e) => e.id));
    const fIns = history.filter((h) => fEqIds.has((h.item || h.equipment || {}).id));
    const totalIns = fIns.length;

    let lastDateStr = null;
    if (totalIns > 0) {
      const sorted = [...fIns].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      lastDateStr = sorted[0]?.savedAt;
    }
    const lastDateFormatted = lastDateStr
      ? new Date(lastDateStr).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : t.factories.noAuditYet;

    const fMeas = measures.filter((m) => m.factory === name);
    const ghgSaved = fMeas.reduce((sum, m) => sum + parseFloat(m.evalData?.ghgSaved || 0), 0);

    return {
      totalEquips: fEqs.length,
      totalIns,
      lastDate: lastDateFormatted,
      ghgSaved: parseFloat(ghgSaved.toFixed(1)),
    };
  }, [equipment, history, measures, name, lang, t]);

  // Carbon reduction breakdown by category
  const categorySavingsBreakdown = useMemo(() => {
    const fMeas = measures.filter((m) => m.factory === name);
    const byCat = {};
    categories.filter((c) => c.key !== 'all').forEach((c) => {
      byCat[c.key] = { name: c.label || c.key, iconKey: c.iconKey, ghg: 0 };
    });
    fMeas.forEach((m) => {
      const cat = m.category || 'chiller';
      const ghg = parseFloat(m.evalData?.ghgSaved || 0);
      if (byCat[cat]) {
        byCat[cat].ghg += ghg;
      }
    });
    const list = Object.entries(byCat)
      .map(([key, item]) => ({ key, ...item }))
      .filter((item) => item.ghg > 0)
      .sort((a, b) => b.ghg - a.ghg);
    return list;
  }, [measures, categories, name]);

  const totalCatSavings = useMemo(() => {
    return categorySavingsBreakdown.reduce((a, b) => a + b.ghg, 0) || 1;
  }, [categorySavingsBreakdown]);

  // Equipment Replacement & Service Advisor
  const replacementAdvisor = useMemo(() => {
    const opHours = parseFloat(defaultOperatingHours) || 8000;
    return equipment
      .map((eq) => {
        const installYr = parseInt(eq.installYear, 10);
        const age = Number.isFinite(installYr) && installYr > 1900 ? Math.max(0, currentYear - installYr) : 0;
        
        // Find latest power baseline in history or calculate from equipment
        const latestHist = history
          .filter((h) => (h.item || h.equipment || {}).id === eq.id)
          .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))[0];
        
        const powerKw = parseFloat(latestHist?.result?.powerBaseline ?? eq.chillerPower ?? 100) || 100;
        const kWhYear = powerKw * opHours;
        const score = kWhYear * (age + 1);
        const co2PerYear = (kWhYear * emissionFactor) / 1000;
        const taxPerYear = co2PerYear * carbonTaxRate;

        // Recommended replacement catalog model
        const suggested = catalogItems.find((c) => c.catId === eq.category) || null;
        const estCost = suggested?.costEst > 0 ? suggested.costEst : 1500000;

        // Estimated savings if upgraded
        const improvementPct = eq.category === 'chiller' ? 0.25 : 0.20;
        const kwhSaved = kWhYear * improvementPct;
        const bahtSaved = kwhSaved * electricityRate;
        const paybackYears = bahtSaved > 0 ? estCost / bahtSaved : null;

        return {
          ...eq,
          age,
          kWhYear,
          score,
          co2PerYear,
          taxPerYear,
          suggested,
          estCost,
          kwhSaved,
          bahtSaved,
          paybackYears,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [equipment, history, defaultOperatingHours, currentYear, emissionFactor, carbonTaxRate, catalogItems, electricityRate]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const realCats = categories.filter((c) => c.key !== 'all');
    return realCats.map((c) => {
      const count = equipment.filter((e) => e.category === c.key).length;
      return { ...c, count };
    });
  }, [categories, equipment]);

  // Filtered equipment list
  const filteredEquipment = useMemo(() => {
    if (!selectedSubCat) return equipment;
    return equipment.filter((e) => e.category === selectedSubCat);
  }, [equipment, selectedSubCat]);

  // Edit factory modal state
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ description: '', province: '', image: '' });
  const [imageError, setImageError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  const openEdit = () => {
    setForm({ description: meta.description || '', province: meta.province || '', image: meta.image || '' });
    setImageError('');
    setEditModal(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImageError('');
    setImageUploading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      const url = await uploadImage(dataUrl, 'factories');
      setForm((p) => ({ ...p, image: url }));
    } catch (err) {
      console.error('Factory image upload failed:', err);
      setImageError(t.factories.uploadFailed);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveFactoryMeta = async () => {
    await saveFactoryRecord(name, { description: form.description.trim(), province: form.province.trim(), image: form.image });
    refreshData();
    setEditModal(false);
  };

  // Add Equipment Modal state
  const [addEqModal, setAddEqModal] = useState(false);
  const [newEq, setNewEq] = useState({ id: '', category: 'chiller', building: '', brandModel: '', installYear: String(currentYear), owner: '' });
  const [newEqError, setNewEqError] = useState('');

  const openAddEquipment = () => {
    setNewEq({
      id: '',
      category: 'chiller',
      building: '',
      brand: '',
      model: '',
      brandModel: '',
      ratedCapacity: '',
      chillerPower: '',
      coolingCapacity: '',
      chillerEfficiency: '',
      operatingHours: '8000',
      loadFactor: '0.8',
      installYear: String(currentYear),
      owner: session.name || '',
      factory: name,
    });
    setNewEqError('');
    setAddEqModal(true);
  };

  const handleSaveNewEquipment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newEq.id.trim()) {
      setNewEqError(t.equipment.fieldId);
      return;
    }
    const exists = allEquipment.some((eq) => eq.id === newEq.id.trim());
    if (exists) {
      setNewEqError('รหัสอุปกรณ์นี้มีอยู่ในระบบแล้ว');
      return;
    }
    await saveEquipmentItem({
      ...newEq,
      id: newEq.id.trim(),
      brandModel: `${newEq.brand || ''} ${newEq.model || ''}`.trim() || newEq.brandModel || '',
      factory: newEq.factory || name,
    });
    refreshData();
    setAddEqModal(false);
  };

  return (
    <AppLayout hideHeader fullBleed>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-5 lg:px-10 pt-14 lg:pt-8 pb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#EEF3FB] dark:border-white/10 bg-white/80 dark:bg-[#111F35]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/factories')}
              className="w-10 h-10 rounded-2xl bg-white dark:bg-white/10 shadow-sm border border-[#E4EBF6] dark:border-white/10 hover:bg-[#F4F7FC] dark:hover:bg-white/15 flex items-center justify-center text-[#0F2854] dark:text-[#E7EEF7] transition-all shrink-0"
              title={t.factories.backToFactories}
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            {meta.image ? (
              <img src={meta.image} alt="" className="w-11 h-11 rounded-2xl object-cover shrink-0 shadow-sm border border-[#E4EBF6] dark:border-white/10" />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0 border border-[#E4EBF6] dark:border-white/10">
                <FactoryIcon className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] truncate">{name}</h1>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={openEdit}
                    title={t.factories.editFactoryTooltip}
                    className="w-7 h-7 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-[#4988C4] flex items-center justify-center transition-colors shrink-0"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-[#0F2854]/60 dark:text-[#7E93AF] flex items-center gap-1.5 mt-0.5 truncate">
                {meta.province && (
                  <span className="flex items-center gap-1 shrink-0 font-medium">
                    <MapPinIcon className="w-3 h-3 text-[#4988C4]" />
                    {meta.province}
                  </span>
                )}
                {meta.description && <span>&bull; {meta.description}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={openAddEquipment}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-bold shadow-md shadow-[#0F2854]/20 transition-all active:scale-95"
              >
                <PlusIcon className="w-4 h-4" />
                {t.factories.addNewEquipment}
              </button>
            )}
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 px-4 sm:px-6 lg:px-10 py-6 flex flex-col gap-6 w-full">
          {addEqModal ? (
            <AddEquipmentPage
              initialData={newEq}
              categoriesList={categories}
              factoriesList={factoryRecords.map((f) => f.name)}
              catalogItems={catalogItems}
              onCancel={() => setAddEqModal(false)}
              onSave={async (data) => {
                await saveEquipmentItem({
                  ...data,
                  factory: data.factory || name,
                });
                refreshData();
                setAddEqModal(false);
              }}
            />
          ) : (
            <>
          <Panel className="p-6 relative overflow-hidden group hover:border-[#4988C4]/40 transition-all flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4 min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#4988C4] rounded-full" />
                <h3 className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7] uppercase tracking-wider">
                  {t.factories.performanceDashboard} ({name})
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
                <div className="p-4 bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 rounded-2xl">
                  <span className="text-[10px] text-gray-400 dark:text-[#7E93AF] font-bold uppercase tracking-wider block">
                    {t.factories.activeEquipments}
                  </span>
                  <span className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono block mt-1">
                    {factoryDashboardStats.totalEquips}
                  </span>
                </div>

                <div className="p-4 bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 rounded-2xl">
                  <span className="text-[10px] text-gray-400 dark:text-[#7E93AF] font-bold uppercase tracking-wider block">
                    {t.factories.inspectionsPerformed}
                  </span>
                  <span className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono block mt-1">
                    {factoryDashboardStats.totalIns}
                  </span>
                </div>

                <div className="p-4 bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 rounded-2xl">
                  <span className="text-[10px] text-gray-400 dark:text-[#7E93AF] font-bold uppercase tracking-wider block">
                    {t.factories.lastAuditDate}
                  </span>
                  <span className="text-sm font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono block mt-2 truncate">
                    {factoryDashboardStats.lastDate}
                  </span>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">
                    {t.factories.carbonSavingsPotential}
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {factoryDashboardStats.ghgSaved}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-400/70">tCO₂e/yr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Progress Bars: Carbon share by category */}
            <div className="w-full lg:w-80 bg-[#F4F7FC]/70 dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 rounded-2xl p-5 flex flex-col justify-between shrink-0">
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4988C4] animate-ping" />
                  {t.factories.carbonShareByType}
                </h4>

                {categorySavingsBreakdown.length > 0 ? (
                  <div className="space-y-3.5">
                    {categorySavingsBreakdown.map((item) => {
                      const pct = Math.round((item.ghg / totalCatSavings) * 100);
                      const Icon = ICON_MAP[item.iconKey] || GearIcon;
                      const catColor = CATEGORY_COLORS[item.key] || '#4988C4';
                      return (
                        <div key={item.key} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7]">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5" style={{ color: catColor }} />
                              <span>{item.name}</span>
                            </div>
                            <span className="font-mono text-gray-500 dark:text-[#8CA3C0] text-[11px]">
                              {item.ghg.toFixed(1)} tCO₂e ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: catColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-28 text-center text-xs text-gray-400 dark:text-[#7E93AF] italic">
                    {t.factories.noSavingsRecorded}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* ===== 2. Monthly Energy & Carbon Tracker ===== */}
          <Panel className="p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                <ActivityIcon className="w-5 h-5 text-[#4988C4]" />
                {t.factories.monthlyUsageTitle} ({currentYear})
              </h3>
              <span className="text-xs text-gray-400 dark:text-[#7E93AF] font-medium bg-[#EEF3FB] dark:bg-white/5 px-3 py-1 rounded-full">
                {t.factories.monthlyUsageHint}
              </span>
            </div>

            {/* 12-month inputs */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
              {monthNames.map((mName, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-[#7E93AF] uppercase text-center">{mName}</label>
                  <input
                    type="number"
                    placeholder="kWh"
                    value={storedMonthly[i] ?? ''}
                    onChange={(e) => handleMonthlyChange(i, e.target.value)}
                    className="w-full p-2 text-center bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 rounded-xl text-xs font-mono font-bold text-[#0F2854] dark:text-[#E7EEF7] outline-none focus:ring-2 focus:ring-[#4988C4] focus:border-transparent transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Graph area */}
            <div className="mt-2 pt-2">
              <MonthlyUsageChart data={monthlyChartData} lang={lang} />
            </div>

            {/* 4 Summary Projection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[#EEF3FB] dark:border-white/8">
              <div className="p-3.5 bg-[#F4F7FC] dark:bg-white/5 rounded-2xl border border-[#E4EBF6] dark:border-white/8">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#7E93AF]">{t.factories.totalRecorded}</div>
                <div className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono mt-1">
                  {fmt(totalKWhRecorded)} <span className="text-xs font-sans text-gray-400">kWh</span>
                </div>
                <div className="text-[10px] text-gray-400 dark:text-[#7E93AF] mt-0.5">{filledMonths.length} {lang === 'th' ? 'เดือน' : 'months'}</div>
              </div>

              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-500/10 rounded-2xl border border-amber-200/60 dark:border-amber-500/20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{t.factories.annualizedEst}</div>
                <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
                  {fmt(annualizedKWh)} <span className="text-xs font-sans text-amber-600/70 dark:text-amber-400/70">kWh/yr</span>
                </div>
                <div className="text-[10px] text-amber-600/60 dark:text-amber-400/60 mt-0.5">{t.factories.annualizedHint}</div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t.factories.estCo2Year}</div>
                <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                  {annualCo2.toFixed(1)} <span className="text-xs font-sans text-emerald-600/70 dark:text-emerald-400/70">tCO₂e</span>
                </div>
                <div className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 mt-0.5">@ {emissionFactor} kgCO₂e/kWh</div>
              </div>

              <div className="p-3.5 bg-rose-50/70 dark:bg-rose-500/10 rounded-2xl border border-rose-200/60 dark:border-rose-500/20">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">{t.factories.carbonTaxEst}</div>
                <div className="text-lg font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1">
                  ฿{fmt(annualTax)}
                </div>
                <div className="text-[10px] text-rose-600/60 dark:text-rose-400/60 mt-0.5">@ ฿{carbonTaxRate}/tCO₂e</div>
              </div>
            </div>

            {filledMonths.length === 0 && (
              <div className="text-center text-xs text-gray-400 dark:text-[#7E93AF] py-2 border-t border-[#EEF3FB] dark:border-white/8">
                {t.factories.monthlyInputPrompt}
              </div>
            )}
          </Panel>

          {/* ===== 3. Equipment Replacement & Service Advisor ===== */}
          <Panel className="p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
                {t.factories.advisorTitle}
              </h3>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-1 rounded-full">
                {t.factories.advisorRanked}
              </span>
            </div>

            {replacementAdvisor.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {replacementAdvisor.slice(0, 6).map((eq, idx) => {
                  let action = t.factories.actionMonitor;
                  let actionColor = 'text-purple-600 dark:text-purple-400';
                  let actionBg = 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20';
                  let actionDesc = t.factories.actionMonitorDesc;
                  let ActionIcon = ActivityIcon;
                  let isReplace = false;

                  if (eq.age >= 10 || (eq.age >= 6 && eq.score > 400000)) {
                    action = t.factories.actionReplace;
                    actionColor = 'text-rose-600 dark:text-rose-400';
                    actionBg = 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20';
                    actionDesc = t.factories.actionReplaceDesc;
                    ActionIcon = RefreshIcon;
                    isReplace = true;
                  } else if (['chiller', 'cooling'].includes(eq.category) && eq.age >= 3) {
                    action = t.factories.actionClean;
                    actionColor = 'text-sky-600 dark:text-sky-400';
                    actionBg = 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20';
                    actionDesc = t.factories.actionCleanDesc;
                    ActionIcon = BrushIcon;
                  } else if (eq.age >= 5) {
                    action = t.factories.actionOverhaul;
                    actionColor = 'text-amber-600 dark:text-amber-400';
                    actionBg = 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
                    actionDesc = t.factories.actionOverhaulDesc;
                    ActionIcon = WrenchIcon;
                  }

                  const cat = categories.find((c) => c.key === eq.category);
                  const Icon = ICON_MAP[cat?.iconKey] || GearIcon;

                  return (
                    <div
                      key={eq.id}
                      className="rounded-2xl border border-[#E4EBF6] dark:border-white/10 bg-white dark:bg-[#111F35] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#0F2854] text-white flex items-center justify-center text-xs font-bold font-mono">
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="font-extrabold text-sm text-[#0F2854] dark:text-[#E7EEF7] font-mono">{eq.id}</p>
                              <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">
                                {cat?.label || eq.category} &bull; {eq.brandModel || '-'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-[#8CA3C0]">
                            {eq.age} {t.factories.yearsOld}
                          </span>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#EEF3FB] dark:border-white/8 text-center">
                          <div>
                            <div className="text-[9px] font-bold uppercase text-gray-400">kWh/yr</div>
                            <div className="text-xs font-extrabold text-amber-500 font-mono">{fmt(eq.kWhYear / 1000, 0)}k</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold uppercase text-gray-400">CO₂/yr</div>
                            <div className="text-xs font-extrabold text-emerald-500 font-mono">{eq.co2PerYear.toFixed(1)}t</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold uppercase text-gray-400">Tax/yr</div>
                            <div className="text-xs font-extrabold text-rose-500 font-mono">฿{fmt(eq.taxPerYear)}</div>
                          </div>
                        </div>

                        {/* Action Badge */}
                        <div className={`p-2.5 rounded-xl border ${actionBg}`}>
                          <p className={`text-xs font-bold flex items-center gap-1.5 ${actionColor}`}>
                            <ActionIcon className="w-3.5 h-3.5 shrink-0" /> {action}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-[#8CA3C0] mt-0.5 leading-relaxed">{actionDesc}</p>
                        </div>

                        {/* Suggested Model info */}
                        {isReplace && eq.suggested && (
                          <div className="p-3 rounded-xl bg-gradient-to-br from-[#EAF4FC] dark:from-white/5 to-white dark:to-transparent border border-[#4988C4]/25 space-y-1.5">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#4988C4] uppercase tracking-wider">
                              <SparkleIcon className="w-3.5 h-3.5" />
                              {t.factories.suggestedReplacement}
                            </div>
                            <p className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7]">
                              {eq.suggested.brand} {eq.suggested.model}
                            </p>
                            {eq.suggested.spec && (
                              <p className="text-[10px] text-gray-500 dark:text-[#8CA3C0]">{eq.suggested.spec}</p>
                            )}
                            <div className="flex justify-between items-center pt-1 text-[10px] border-t border-[#4988C4]/15">
                              <span className="text-gray-500 dark:text-[#8CA3C0]">{t.factories.estSavingsYear}:</span>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                ฿{fmt(eq.bahtSaved)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-gray-500 dark:text-[#8CA3C0]">{t.factories.estPayback}:</span>
                              <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                                {eq.paybackYears ? `${eq.paybackYears.toFixed(1)} ${lang === 'th' ? 'ปี' : 'yr'}` : '-'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-xs text-gray-400 dark:text-[#7E93AF] py-8 border border-dashed border-[#E4EBF6] dark:border-white/10 rounded-2xl">
                {t.factories.addEquipmentToSeeAdvisor}
              </div>
            )}
          </Panel>

          {/* ===== 4. Category Breakdown Filter Pills ===== */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4988C4]" />
              {t.factories.categorySummary}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* ALL filter card */}
              <button
                type="button"
                onClick={() => setSelectedSubCat('')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                  selectedSubCat === ''
                    ? 'border-[#4988C4] bg-[#EAF4FC] dark:bg-[#4988C4]/20 shadow-sm ring-2 ring-[#4988C4]/30'
                    : 'border-[#E4EBF6] dark:border-white/10 bg-white dark:bg-[#111F35] hover:border-[#4988C4]/40'
                }`}
              >
                <div className="flex justify-between items-start text-[#4988C4]">
                  <LayoutGridIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-[#8CA3C0] truncate">
                    {t.factories.allTypes}
                  </p>
                  <p className="text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono mt-0.5">
                    {equipment.length} <span className="text-[10px] font-sans font-normal text-gray-400">{t.factories.units}</span>
                  </p>
                </div>
              </button>

              {/* Each category filter card */}
              {categoryCounts.map((c) => {
                const Icon = ICON_MAP[c.iconKey] || GearIcon;
                const isSelected = selectedSubCat === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelectedSubCat(c.key)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                      c.count === 0 ? 'opacity-50 hover:opacity-100' : ''
                    } ${
                      isSelected
                        ? 'border-[#4988C4] bg-[#EAF4FC] dark:bg-[#4988C4]/20 shadow-sm ring-2 ring-[#4988C4]/30'
                        : 'border-[#E4EBF6] dark:border-white/10 bg-white dark:bg-[#111F35] hover:border-[#4988C4]/40'
                    }`}
                  >
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

          {/* ===== 5. Equipment List Table ===== */}
          <Panel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
                {t.factories.equipmentInFactory} ({filteredEquipment.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/equipment', { state: { openAdd: true, factory: name } })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  เพิ่มอุปกรณ์
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/equipment')}
                  className="text-xs font-bold text-[#4988C4] hover:underline"
                >
                  {t.factories.viewDetails} &rarr;
                </button>
              </div>
            </div>

            {filteredEquipment.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#EAF4FC] dark:bg-white/5 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#4988C4]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9M9 3l6 6M9 3v6h6" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.factories.noEquipmentInFactory}</p>
                  <p className="text-xs text-gray-400 dark:text-[#7E93AF] mt-1">กดปุ่มด้านล่างเพื่อลงทะเบียนอุปกรณ์เครื่องแรกในโรงงานนี้</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/equipment', { state: { openAdd: true, factory: name } })}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white text-sm font-bold shadow-md transition-all active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  เพิ่มอุปกรณ์ใน {name}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-xs text-gray-400 dark:text-[#7E93AF] border-b border-[#EEF3FB] dark:border-white/8 uppercase">
                      <th className="py-3 px-3 font-bold">{t.factories.tagOrId}</th>
                      <th className="py-3 px-3 font-bold">Category</th>
                      <th className="py-3 px-3 font-bold">{t.factories.buildingOrDept}</th>
                      <th className="py-3 px-3 font-bold">Brand / Model</th>
                      <th className="py-3 px-3 font-bold">Install Year</th>
                      <th className="py-3 px-3 font-bold">Owner</th>
                      <th className="py-3 px-3 font-bold text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F7FC] dark:divide-white/8">
                    {filteredEquipment.map((item) => {
                      const cat = categories.find((c) => c.key === item.category);
                      const Icon = ICON_MAP[cat?.iconKey] || ClipboardIcon;
                      const badgeCls = CATEGORY_BADGES[item.category] || 'bg-gray-100 text-gray-600 border-gray-200';
                      return (
                        <tr key={item.id} className="hover:bg-[#F4F7FC] dark:hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-3 font-bold font-mono text-[#0F2854] dark:text-[#E7EEF7]">
                            {item.id}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeCls}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {cat?.label || item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-gray-600 dark:text-[#C3D2E5]">
                            {item.building || '-'}
                          </td>
                          <td className="py-3.5 px-3 text-gray-700 dark:text-[#C3D2E5] font-medium">
                            {item.brandModel || '-'}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-gray-500 dark:text-[#8CA3C0]">
                            {item.installYear || '-'}
                          </td>
                          <td className="py-3.5 px-3">
                            {item.owner ? (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-[#8CA3C0] bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                                <UserIcon className="w-3 h-3" />
                                {item.owner}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => navigate('/equipment')}
                              className="w-8 h-8 rounded-xl bg-[#EEF3FB] dark:bg-white/10 hover:bg-[#4988C4] hover:text-white text-[#4988C4] inline-flex items-center justify-center transition-colors shadow-sm"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
            </>
          )}

        </div>
      </div>

      {/* ===== Edit Factory Info Modal ===== */}
      {editModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 font-sans" onClick={() => setEditModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.factories.editFactoryTitle}</p>
            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.factories.factoryImageOptional}</label>
              <div className="flex items-center gap-3">
                {form.image ? (
                  <img src={form.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
                    <FactoryIcon className="w-6 h-6" />
                  </div>
                )}
                <label className={`flex-1 flex items-center justify-center py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/15 text-xs font-semibold text-gray-500 dark:text-[#8CA3C0] transition-colors ${
                  imageUploading ? 'opacity-60 pointer-events-none' : 'hover:border-[#4988C4] hover:text-[#4988C4] cursor-pointer'
                }`}>
                  {imageUploading ? '...' : (form.image ? t.factories.changeImage : t.factories.uploadImage)}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={imageUploading} />
                </label>
              </div>
              {imageError && <p className="text-xs text-red-500 mt-1.5">{imageError}</p>}
            </div>
            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.factories.province}</label>
              <Combobox
                value={form.province}
                onChange={(v) => setForm((p) => ({ ...p, province: v }))}
                options={THAI_PROVINCES}
                placeholder={t.factories.egProvince}
                autoFocus
                inputClassName="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.factories.description}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t.factories.egDescription}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-[#8CA3C0] font-semibold text-sm transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveFactoryMeta}
                disabled={imageUploading}
                className="flex-1 py-3 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:pointer-events-none"
              >
                {t.common.save}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}

export default FactoryDetail;
