import { useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { Panel, SectionHeader } from '../components/ui';
import { useLang } from '../context/languageStore.js';
import { CalculatorIcon, SparkleIcon, LightningIcon, DropletIcon, ThermometerIcon } from '../components/icons';
import EngineerCalculatorFab from '../components/EngineerCalculatorFab.jsx';

const CATEGORIES = [
  { key: 'all', label: 'ทั้งหมด (All Formulas)', icon: '📐' },
  { key: 'temp', label: 'อุณหภูมิ (Temperature)', icon: '🌡️' },
  { key: 'length', label: 'ความยาว & ท่อ (Length & Pipe)', icon: '📏' },
  { key: 'area', label: 'พื้นที่ & รูปทรง (Area & Geometry)', icon: '📐' },
  { key: 'flow', label: 'อัตราการไหล (Flow Rate)', icon: '💧' },
  { key: 'chiller', label: 'ประสิทธิภาพ Chiller Plant (kW/TR)', icon: '⚡' },
  { key: 'math', label: 'ร้อยละ (% Change)', icon: '📊' },
];

function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function Calculator() {
  const { t } = useLang();
  const [activeCategory, setActiveCategory] = useState('all');

  // 1. Circle & Pipe Geometry State
  const [circleInputMode, setCircleInputMode] = useState('d'); // 'd', 'r', 'c'
  const [circleUnit, setCircleUnit] = useState('inch'); // 'inch', 'mm', 'cm', 'm'
  const [circleVal, setCircleVal] = useState('');
  const [circleResult, setCircleResult] = useState(null);

  const calcCircle = () => {
    const v = parseFloat(circleVal);
    if (!Number.isFinite(v) || v <= 0) {
      setCircleResult(null);
      return;
    }

    let dMm = 0;
    if (circleUnit === 'inch') dMm = circleInputMode === 'd' ? v * 25.4 : circleInputMode === 'r' ? v * 2 * 25.4 : (v / Math.PI) * 25.4;
    else if (circleUnit === 'mm') dMm = circleInputMode === 'd' ? v : circleInputMode === 'r' ? v * 2 : v / Math.PI;
    else if (circleUnit === 'cm') dMm = circleInputMode === 'd' ? v * 10 : circleInputMode === 'r' ? v * 20 : (v / Math.PI) * 10;
    else if (circleUnit === 'm') dMm = circleInputMode === 'd' ? v * 1000 : circleInputMode === 'r' ? v * 2000 : (v / Math.PI) * 1000;

    const dInch = dMm / 25.4;
    const rMm = dMm / 2;
    const rInch = dInch / 2;
    const circMm = Math.PI * dMm;
    const circInch = Math.PI * dInch;
    const areaMm2 = (Math.PI * dMm * dMm) / 4;
    const areaInch2 = (Math.PI * dInch * dInch) / 4;
    const areaM2 = areaMm2 / 1000000;

    setCircleResult({
      dInch,
      dMm,
      rInch,
      rMm,
      circInch,
      circMm,
      areaInch2,
      areaMm2,
      areaM2,
    });
  };

  // 2. Temperature Conversion State
  const [tempMode, setTempMode] = useState('FtoC'); // 'FtoC' or 'CtoF'
  const [tempVal, setTempVal] = useState('');
  const [tempResult, setTempResult] = useState(null);

  const calcTemp = () => {
    const v = parseFloat(tempVal);
    if (!Number.isFinite(v)) {
      setTempResult(null);
      return;
    }
    if (tempMode === 'FtoC') {
      const c = ((v - 32) * 5) / 9;
      const k = c + 273.15;
      setTempResult({ primary: `${fmt(c, 2)} °C`, secondary: `${fmt(k, 2)} K`, input: `${v} °F` });
    } else {
      const f = (v * 9) / 5 + 32;
      const k = v + 273.15;
      setTempResult({ primary: `${fmt(f, 2)} °F`, secondary: `${fmt(k, 2)} K`, input: `${v} °C` });
    }
  };

  // 3. Flow Rate Conversion & Cooling TR State
  const [flowMode, setFlowMode] = useState('GPM'); // 'GPM', 'm3h', 'CFM', 'Ls'
  const [flowVal, setFlowVal] = useState('2400');
  const [deltaT, setDeltaT] = useState('10'); // °F
  const [flowResult, setFlowResult] = useState(null);

  const calcFlow = () => {
    const v = parseFloat(flowVal);
    const dt = parseFloat(deltaT) || 10;
    if (!Number.isFinite(v) || v <= 0) {
      setFlowResult(null);
      return;
    }

    let gpm = 0;
    if (flowMode === 'GPM') gpm = v;
    else if (flowMode === 'm3h') gpm = v * 4.40287;
    else if (flowMode === 'CFM') gpm = v * 7.48052;
    else if (flowMode === 'Ls') gpm = v * 15.8503;

    const m3h = gpm / 4.40287;
    const cfm = gpm / 7.48052;
    const ls = gpm / 15.8503;
    const coolingTR = (gpm * dt) / 24;

    setFlowResult({
      gpm,
      m3h,
      cfm,
      ls,
      coolingTR,
      trRule: gpm / 2.4, // standard 2.4 GPM/TR
    });
  };

  // 4. Chiller Plant System Efficiency Calculator State
  const [chillerKW, setChillerKW] = useState('500');
  const [chwpKW, setChwpKW] = useState('45');
  const [cwpKW, setCwpKW] = useState('55');
  const [ctKW, setCtKW] = useState('30');
  const [plantTR, setPlantTR] = useState('1000');
  const [plantResult, setPlantResult] = useState(null);

  const calcPlant = () => {
    const cKW = parseFloat(chillerKW) || 0;
    const chwp = parseFloat(chwpKW) || 0;
    const cwp = parseFloat(cwpKW) || 0;
    const ct = parseFloat(ctKW) || 0;
    const tr = parseFloat(plantTR) || 0;

    if (tr <= 0) {
      setPlantResult(null);
      return;
    }

    const totalKW = cKW + chwp + cwp + ct;
    const chillerEff = cKW / tr;
    const plantEff = totalKW / tr;
    const pumpCtEff = (chwp + cwp + ct) / tr;

    let rating = '🟢 ดีมาก (Good Practice)';
    let ratingColor = 'text-emerald-600 dark:text-emerald-400';
    if (plantEff < 0.70) {
      rating = '🌟 ดีเยี่ยมระดับโลก (World Class < 0.70 kW/TR)';
      ratingColor = 'text-sky-600 dark:text-sky-400';
    } else if (plantEff <= 0.85) {
      rating = '🟢 ดีมาก (Good Practice 0.70 - 0.85 kW/TR)';
      ratingColor = 'text-emerald-600 dark:text-emerald-400';
    } else if (plantEff <= 1.00) {
      rating = '🟡 ปานกลาง (Average 0.85 - 1.00 kW/TR)';
      ratingColor = 'text-amber-600 dark:text-amber-400';
    } else {
      rating = '🔴 สิ้นเปลืองพลังงาน ควรปรับปรุง (> 1.00 kW/TR)';
      ratingColor = 'text-rose-600 dark:text-rose-400';
    }

    setPlantResult({
      totalKW,
      chillerEff,
      plantEff,
      pumpCtEff,
      rating,
      ratingColor,
    });
  };

  // 5. Pipe Flow & Diameter State
  const [pipeQ, setPipeQ] = useState('');
  const [pipeV, setPipeV] = useState('');
  const [pipeResult, setPipeResult] = useState(null);

  const calcPipe = () => {
    const q = parseFloat(pipeQ);
    const v = parseFloat(pipeV);
    if (!(q > 0) || !(v > 0)) {
      setPipeResult(null);
      return;
    }
    const a = q / v;
    const d = Math.sqrt((4 * q) / (Math.PI * v));
    setPipeResult({ area: a, dia: d });
  };

  // 6. Generic Shapes State
  const [rectW, setRectW] = useState('');
  const [rectL, setRectL] = useState('');
  const [rectResult, setRectResult] = useState(null);
  const calcRect = () => {
    const w = parseFloat(rectW);
    const l = parseFloat(rectL);
    if (!(w > 0) || !(l > 0)) { setRectResult(null); return; }
    setRectResult({ area: w * l, perimeter: 2 * (w + l) });
  };

  const [triB, setTriB] = useState('');
  const [triH, setTriH] = useState('');
  const [triResult, setTriResult] = useState(null);
  const calcTri = () => {
    const b = parseFloat(triB);
    const h = parseFloat(triH);
    if (!(b > 0) || !(h > 0)) { setTriResult(null); return; }
    setTriResult({ area: 0.5 * b * h });
  };

  const [cylR, setCylR] = useState('');
  const [cylH, setCylH] = useState('');
  const [cylResult, setCylResult] = useState(null);
  const calcCyl = () => {
    const r = parseFloat(cylR);
    const h = parseFloat(cylH);
    if (!(r > 0) || !(h > 0)) { setCylResult(null); return; }
    setCylResult({ vol: Math.PI * r * r * h, surf: 2 * Math.PI * r * h });
  };

  const [pctOld, setPctOld] = useState('');
  const [pctNew, setPctNew] = useState('');
  const [pctResult, setPctResult] = useState(null);
  const calcPct = () => {
    const o = parseFloat(pctOld);
    const n = parseFloat(pctNew);
    if (!Number.isFinite(o) || !Number.isFinite(n) || o === 0) { setPctResult(null); return; }
    setPctResult({ pct: ((n - o) / o) * 100 });
  };

  const show = (cat) => activeCategory === 'all' || activeCategory === cat;

  return (
    <>
      <AppLayout
        title={
          <span className="flex items-center gap-2.5">
            <span className="w-1.5 h-6 lg:w-2 lg:h-8 rounded-full bg-[#4988C4] shrink-0" />
            {t.nav.calculator}
          </span>
        }
        hideFactorySelect
        factoryRowBelowTitle
        hideRoleBadgeMobile
      >
        <div className="flex flex-col gap-6">
          {/* Header & Subtitle */}
          <div className="flex flex-col gap-1 px-1">
            <p className="text-xs lg:text-sm font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
              {t.calcTools.mathSection || 'เครื่องคิดเลขและสูตรคำนวณวิศวกรรมพลังงาน'}
            </p>
            <p className="text-xs text-gray-400 dark:text-[#7E93AF]">
              รวมสูตรวิศวกรรม แปลงหน่วยอุณหภูมิ, วงกลม/ท่อ (นิ้ว & มม.), อัตราการไหล (GPM & m³/h), ประสิทธิภาพ Chiller Plant และรูปทรงเรขาคณิต
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                    active
                      ? 'bg-[#0F2854] text-white shadow-md'
                      : 'bg-white dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-gray-600 dark:text-[#C3D2E5] hover:bg-gray-50 dark:hover:bg-white/10'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* FORMULA CARDS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. CIRCLE & PIPE GEOMETRY */}
            {show('area') && (
              <Panel className="p-5 space-y-4 rounded-3xl border-t-4 border-t-[#4988C4]">
                <SectionHeader
                  title={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                        <span>⭕</span> พื้นที่ & เส้นรอบวงกลม / ท่อ (Circle & Pipe Geometry)
                      </span>
                      <span className="text-xs font-mono text-gray-400">D = C / π, A = πr²</span>
                    </div>
                  }
                />
                <p className="text-xs text-gray-400">
                  คำนวณเส้นผ่านศูนย์กลาง (D), รัศมี (R), เส้นรอบวง (C) และพื้นที่หน้าตัด (A) พร้อมแปลงหน่วยนิ้วและมิลลิเมตรอัตโนมัติ
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1 block">รูปแบบค่าที่กรอก</label>
                    <select
                      value={circleInputMode}
                      onChange={(e) => setCircleInputMode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    >
                      <option value="d">เส้นผ่านศูนย์กลาง (Diameter D)</option>
                      <option value="r">รัศมี (Radius R)</option>
                      <option value="c">เส้นรอบวง (Circumference C)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1 block">หน่วย (Unit)</label>
                    <select
                      value={circleUnit}
                      onChange={(e) => setCircleUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    >
                      <option value="inch">นิ้ว (Inches / in)</option>
                      <option value="mm">มิลลิเมตร (mm)</option>
                      <option value="cm">เซนติเมตร (cm)</option>
                      <option value="m">เมตร (m)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    {circleInputMode === 'd' ? 'ระบุเส้นผ่านศูนย์กลาง (D)' : circleInputMode === 'r' ? 'ระบุรัศมี (R)' : 'ระบุเส้นรอบวง (C)'} ({circleUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={circleVal}
                    onChange={(e) => setCircleVal(e.target.value)}
                    placeholder="เช่น 8 นิ้ว หรือ 200 mm"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                  />
                </div>

                <button
                  type="button"
                  onClick={calcCircle}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-[#0F2854] to-[#4988C4]"
                >
                  <CalculatorIcon className="w-4 h-4" />
                  คำนวณขนาดและพื้นที่หน้าตัด
                </button>

                {circleResult && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                    <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 text-center">
                      <p className="text-[10px] text-gray-500">เส้นผ่านศูนย์กลาง (D)</p>
                      <p className="text-sm font-bold font-mono text-[#0F2854] dark:text-[#E7EEF7]">{fmt(circleResult.dInch, 2)} in</p>
                      <p className="text-[10px] text-gray-400 font-mono">({fmt(circleResult.dMm, 1)} mm)</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 text-center">
                      <p className="text-[10px] text-gray-500">รัศมี (R)</p>
                      <p className="text-sm font-bold font-mono text-[#0F2854] dark:text-[#E7EEF7]">{fmt(circleResult.rInch, 2)} in</p>
                      <p className="text-[10px] text-gray-400 font-mono">({fmt(circleResult.rMm, 1)} mm)</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 text-center">
                      <p className="text-[10px] text-gray-500">เส้นรอบวง (C = πD)</p>
                      <p className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">{fmt(circleResult.circInch, 2)} in</p>
                      <p className="text-[10px] text-gray-400 font-mono">({fmt(circleResult.circMm, 1)} mm)</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-500/10 text-center">
                      <p className="text-[10px] text-gray-500">พื้นที่หน้าตัด (A = πr²)</p>
                      <p className="text-sm font-bold font-mono text-purple-700 dark:text-purple-300">{fmt(circleResult.areaInch2, 2)} in²</p>
                      <p className="text-[10px] text-gray-400 font-mono">({fmt(circleResult.areaM2, 4)} m²)</p>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* 2. TEMPERATURE CONVERTER */}
            {show('temp') && (
              <Panel className="p-5 space-y-4 rounded-3xl border-t-4 border-t-amber-500">
                <SectionHeader
                  title={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                        <span>🌡️</span> แปลงหน่วยอุณหภูมิ (°F & °C & K)
                      </span>
                      <span className="text-xs font-mono text-gray-400">°C = (°F−32)×5/9</span>
                    </div>
                  }
                />
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => { setTempMode('FtoC'); setTempResult(null); }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      tempMode === 'FtoC' ? 'bg-[#0F2854] text-white shadow-sm' : 'text-gray-600 dark:text-[#8CA3C0]'
                    }`}
                  >
                    ฟาเรนไฮต์ (°F) &rarr; เซลเซียส (°C)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTempMode('CtoF'); setTempResult(null); }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      tempMode === 'CtoF' ? 'bg-[#0F2854] text-white shadow-sm' : 'text-gray-600 dark:text-[#8CA3C0]'
                    }`}
                  >
                    เซลเซียส (°C) &rarr; ฟาเรนไฮต์ (°F)
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    ระบุอุณหภูมิ ({tempMode === 'FtoC' ? '°F' : '°C'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={tempVal}
                    onChange={(e) => setTempVal(e.target.value)}
                    placeholder={tempMode === 'FtoC' ? 'เช่น 46.5 °F (น้ำเย็นจ่ายมาตรฐาน)' : 'เช่น 8.0 °C'}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                  />
                </div>

                <button
                  type="button"
                  onClick={calcTemp}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-amber-600 to-orange-500"
                >
                  <ThermometerIcon className="w-4 h-4" />
                  แปลงค่าอุณหภูมิ
                </button>

                {tempResult && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-white/10">
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-center">
                      <p className="text-[10px] text-gray-500">ผลลัพธ์แปลงหน่วยหลัก</p>
                      <p className="text-xl font-extrabold font-mono text-amber-700 dark:text-amber-300">{tempResult.primary}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">จาก {tempResult.input}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 text-center">
                      <p className="text-[10px] text-gray-500">อุณหภูมิเคลวิน (Kelvin)</p>
                      <p className="text-xl font-extrabold font-mono text-[#0F2854] dark:text-[#E7EEF7]">{tempResult.secondary}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Absolute Temperature</p>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* 3. FLOW RATE CONVERTER & COOLING TR */}
            {show('flow') && (
              <Panel className="p-5 space-y-4 rounded-3xl border-t-4 border-t-sky-500">
                <SectionHeader
                  title={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                        <span>💧</span> แปลงหน่วยอัตราการไหล (GPM &gt; m³/h &gt; CFM)
                      </span>
                      <span className="text-xs font-mono text-sky-600 font-bold">2,400 GPM &asymp; 1,000 TR</span>
                    </div>
                  }
                />
                <p className="text-xs text-gray-400">
                  แปลงระหว่าง GPM, m³/h, CFM, L/s พร้อมคำนวณภาระความเย็น TR จากอัตราการไหลและผลต่างอุณหภูมิ (ΔT)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1 block">หน่วยอัตราการไหล</label>
                    <select
                      value={flowMode}
                      onChange={(e) => setFlowMode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    >
                      <option value="GPM">GPM (แกลลอนต่อนาที)</option>
                      <option value="m3h">m³/h (ลูกบาศก์เมตรต่อชั่วโมง)</option>
                      <option value="CFM">CFM (ลูกบาศก์ฟุตต่อนาที)</option>
                      <option value="Ls">L/s (ลิตรต่อวินาที)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1 block">ΔT น้ำเย็น (°F)</label>
                    <input
                      type="number"
                      step="any"
                      value={deltaT}
                      onChange={(e) => setDeltaT(e.target.value)}
                      placeholder="10 °F"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono font-bold text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">ระบุค่าอัตราการไหล ({flowMode})</label>
                  <input
                    type="number"
                    step="any"
                    value={flowVal}
                    onChange={(e) => setFlowVal(e.target.value)}
                    placeholder="เช่น 2400 GPM"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                  />
                </div>

                <button
                  type="button"
                  onClick={calcFlow}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-sky-600 to-blue-600"
                >
                  <DropletIcon className="w-4 h-4" />
                  แปลงอัตราการไหลและคำนวณ TR
                </button>

                {flowResult && (
                  <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-white/10">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10">
                        <p className="text-[10px] text-gray-500">GPM</p>
                        <p className="text-base font-extrabold font-mono text-sky-700 dark:text-sky-300">{fmt(flowResult.gpm, 1)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10">
                        <p className="text-[10px] text-gray-500">m³/h</p>
                        <p className="text-base font-extrabold font-mono text-sky-700 dark:text-sky-300">{fmt(flowResult.m3h, 1)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10">
                        <p className="text-[10px] text-gray-500">CFM</p>
                        <p className="text-base font-extrabold font-mono text-sky-700 dark:text-sky-300">{fmt(flowResult.cfm, 1)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-500/10">
                        <p className="text-[10px] text-gray-500">L/s</p>
                        <p className="text-base font-extrabold font-mono text-sky-700 dark:text-sky-300">{fmt(flowResult.ls, 1)}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-white/5 dark:to-white/10 border border-blue-200 dark:border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7]">ภาระความเย็นที่ได้ (TR = GPM × ΔT / 24)</p>
                        <p className="text-[10px] text-gray-500 font-mono">เทียบมาตรฐาน 2.4 GPM/TR = {fmt(flowResult.trRule, 0)} TR</p>
                      </div>
                      <p className="text-xl font-extrabold font-mono text-blue-700 dark:text-blue-300">{fmt(flowResult.coolingTR, 1)} TR</p>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* 4. CHILLER PLANT SYSTEM EFFICIENCY */}
            {show('chiller') && (
              <Panel className="p-5 space-y-4 rounded-3xl border-t-4 border-t-emerald-500">
                <SectionHeader
                  title={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                        <span>⚡</span> ประสิทธิภาพรวม Chiller Plant (System kW/TR)
                      </span>
                      <span className="text-xs font-mono text-emerald-600 font-bold">kW รวมทั้งระบบ ÷ TR</span>
                    </div>
                  }
                />
                <p className="text-xs text-gray-400">
                  สูตร Chiller Plant System รวมพลังงานทั้งระบบ: ชิลเลอร์ + ปั๊มน้ำเย็น (CHWP) + ปั๊มน้ำหล่อเย็น (CWP) + หอผึ่งน้ำ (CT)
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 dark:text-[#8CA3C0] mb-1 block">Chiller (kW)</label>
                    <input
                      type="number"
                      value={chillerKW}
                      onChange={(e) => setChillerKW(e.target.value)}
                      placeholder="500"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono font-bold text-[#0F2854] dark:text-[#E7EEF7]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 dark:text-[#8CA3C0] mb-1 block">CHWP ปั๊มน้ำเย็น (kW)</label>
                    <input
                      type="number"
                      value={chwpKW}
                      onChange={(e) => setChwpKW(e.target.value)}
                      placeholder="45"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono font-bold text-[#0F2854] dark:text-[#E7EEF7]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 dark:text-[#8CA3C0] mb-1 block">CWP ปั๊มระบาย (kW)</label>
                    <input
                      type="number"
                      value={cwpKW}
                      onChange={(e) => setCwpKW(e.target.value)}
                      placeholder="55"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono font-bold text-[#0F2854] dark:text-[#E7EEF7]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 dark:text-[#8CA3C0] mb-1 block">CT พัดลมคูลลิ่ง (kW)</label>
                    <input
                      type="number"
                      value={ctKW}
                      onChange={(e) => setCtKW(e.target.value)}
                      placeholder="30"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono font-bold text-[#0F2854] dark:text-[#E7EEF7]"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 block">ภาระความเย็น (TR)</label>
                    <input
                      type="number"
                      value={plantTR}
                      onChange={(e) => setPlantTR(e.target.value)}
                      placeholder="1000"
                      className="w-full px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-xs font-mono font-extrabold text-emerald-900 dark:text-emerald-200"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={calcPlant}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-emerald-600 to-teal-600"
                >
                  <LightningIcon className="w-4 h-4" />
                  คำนวณประสิทธิภาพ Chiller Plant ทั้งระบบ
                </button>

                {plantResult && (
                  <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
                        <p className="text-[10px] text-gray-500">กำลังไฟรวม (Total kW)</p>
                        <p className="text-xl font-extrabold font-mono text-[#0F2854] dark:text-[#E7EEF7]">{fmt(plantResult.totalKW, 1)} kW</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10">
                        <p className="text-[10px] text-gray-500">Chiller เดี่ยว (kW/TR)</p>
                        <p className="text-xl font-extrabold font-mono text-blue-700 dark:text-blue-300">{fmt(plantResult.chillerEff, 3)}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30">
                        <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">Plant System (kW/TR)</p>
                        <p className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">{fmt(plantResult.plantEff, 3)}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#0F2854] text-white flex items-center justify-between">
                      <span className="text-xs font-bold">ระดับประสิทธิภาพ (Plant Rating):</span>
                      <span className="text-xs font-extrabold text-amber-300">{plantResult.rating}</span>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* 5. PIPE FLOW & VELOCITY */}
            {show('length') && (
              <Panel className="p-5 space-y-4 rounded-3xl border-t-4 border-t-indigo-500">
                <SectionHeader
                  title={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                        <span>📏</span> คำนวณขนาดท่อ (Pipe Sizing & Velocity)
                      </span>
                      <span className="text-xs font-mono text-gray-400">A = Q / V, D = √(4Q/πV)</span>
                    </div>
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">อัตราการไหล Q (m³/s)</label>
                    <input
                      type="number"
                      step="any"
                      value={pipeQ}
                      onChange={(e) => setPipeQ(e.target.value)}
                      placeholder="เช่น 0.05"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">ความเร็วการไหล V (m/s)</label>
                    <input
                      type="number"
                      step="any"
                      value={pipeV}
                      onChange={(e) => setPipeV(e.target.value)}
                      placeholder="เช่น 1.5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={calcPipe}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-indigo-600 to-blue-600"
                >
                  <CalculatorIcon className="w-4 h-4" />
                  คำนวณพื้นที่และขนาดท่อ
                </button>
                {pipeResult && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-white/10">
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-center">
                      <p className="text-[10px] text-gray-500">พื้นที่หน้าตัดท่อ (m²)</p>
                      <p className="text-lg font-extrabold font-mono text-indigo-700 dark:text-indigo-300">{fmt(pipeResult.area, 4)} m²</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-center">
                      <p className="text-[10px] text-gray-500">เส้นผ่านศูนย์กลางท่อ (m / mm)</p>
                      <p className="text-lg font-extrabold font-mono text-indigo-700 dark:text-indigo-300">{fmt(pipeResult.dia, 4)} m</p>
                      <p className="text-[10px] text-gray-400 font-mono">({fmt(pipeResult.dia * 1000, 1)} mm / {fmt((pipeResult.dia * 1000) / 25.4, 1)} in)</p>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* 6. RECTANGLE AREA */}
            {show('area') && (
              <Panel className="p-5 space-y-4 rounded-3xl border-t-4 border-t-purple-500">
                <SectionHeader
                  title={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                        <span>🟧</span> สี่เหลี่ยมผืนผ้า (Rectangle Area & Perimeter)
                      </span>
                      <span className="text-xs font-mono text-gray-400">A = w×l, P = 2(w+l)</span>
                    </div>
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">ความกว้าง w</label>
                    <input
                      type="number"
                      step="any"
                      value={rectW}
                      onChange={(e) => setRectW(e.target.value)}
                      placeholder="เช่น 10"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">ความยาว l</label>
                    <input
                      type="number"
                      step="any"
                      value={rectL}
                      onChange={(e) => setRectL(e.target.value)}
                      placeholder="เช่น 20"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={calcRect}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  <CalculatorIcon className="w-4 h-4" />
                  คำนวณพื้นที่และความยาวรอบรูป
                </button>
                {rectResult && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-white/10">
                    <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-center">
                      <p className="text-[10px] text-gray-500">พื้นที่ (Area)</p>
                      <p className="text-lg font-extrabold font-mono text-purple-700 dark:text-purple-300">{fmt(rectResult.area, 2)}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-center">
                      <p className="text-[10px] text-gray-500">ความยาวรอบรูป (Perimeter)</p>
                      <p className="text-lg font-extrabold font-mono text-purple-700 dark:text-purple-300">{fmt(rectResult.perimeter, 2)}</p>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* 7. CYLINDER VOLUME */}
            {show('area') && (
              <Panel className="p-5 space-y-4 rounded-3xl border-t-4 border-t-teal-500">
                <SectionHeader
                  title={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                        <span>🛢️</span> ทรงกระบอก (Cylinder Volume & Surface)
                      </span>
                      <span className="text-xs font-mono text-gray-400">V = πr²h, S = 2πrh</span>
                    </div>
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">รัศมี r</label>
                    <input
                      type="number"
                      step="any"
                      value={cylR}
                      onChange={(e) => setCylR(e.target.value)}
                      placeholder="เช่น 5"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">ความสูง h</label>
                    <input
                      type="number"
                      step="any"
                      value={cylH}
                      onChange={(e) => setCylH(e.target.value)}
                      placeholder="เช่น 12"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={calcCyl}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-teal-600 to-emerald-600"
                >
                  <CalculatorIcon className="w-4 h-4" />
                  คำนวณปริมาตรและพื้นที่ผิว
                </button>
                {cylResult && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-white/10">
                    <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-center">
                      <p className="text-[10px] text-gray-500">ปริมาตร (Volume)</p>
                      <p className="text-lg font-extrabold font-mono text-teal-700 dark:text-teal-300">{fmt(cylResult.vol, 2)}</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-center">
                      <p className="text-[10px] text-gray-500">พื้นที่ผิวด้านข้าง (Surface)</p>
                      <p className="text-lg font-extrabold font-mono text-teal-700 dark:text-teal-300">{fmt(cylResult.surf, 2)}</p>
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* 8. PERCENTAGE CHANGE */}
            {show('math') && (
              <Panel className="p-5 space-y-4 rounded-3xl border-t-4 border-t-rose-500">
                <SectionHeader
                  title={
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-2">
                        <span>📊</span> ร้อยละการเปลี่ยนแปลง (% Change)
                      </span>
                      <span className="text-xs font-mono text-gray-400">% = (New − Old) / Old × 100</span>
                    </div>
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">ค่าเดิม (Old Value)</label>
                    <input
                      type="number"
                      step="any"
                      value={pctOld}
                      onChange={(e) => setPctOld(e.target.value)}
                      placeholder="เช่น 100"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">ค่าใหม่ (New Value)</label>
                    <input
                      type="number"
                      step="any"
                      value={pctNew}
                      onChange={(e) => setPctNew(e.target.value)}
                      placeholder="เช่น 85"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={calcPct}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-rose-600 to-pink-600"
                >
                  <CalculatorIcon className="w-4 h-4" />
                  คำนวณร้อยละการเปลี่ยนแปลง
                </button>
                {pctResult && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-center border-t border-gray-100 dark:border-white/10">
                    <p className="text-[10px] text-gray-500">ผลต่างร้อยละ (% Change)</p>
                    <p className={`text-2xl font-black font-mono ${pctResult.pct < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {pctResult.pct > 0 ? `+${fmt(pctResult.pct, 2)}%` : `${fmt(pctResult.pct, 2)}%`}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {pctResult.pct < 0 ? 'ลดลง (ประหยัดพลังงาน)' : pctResult.pct > 0 ? 'เพิ่มขึ้น' : 'ไม่เปลี่ยนแปลง'}
                    </p>
                  </div>
                )}
              </Panel>
            )}
          </div>
        </div>
      </AppLayout>
      <EngineerCalculatorFab />
    </>
  );
}
