import { useEffect, useState } from 'react';
import { Panel } from '../../components/ui';
import {
  ArrowLeftIcon,
  CalculatorIcon,
  ClipboardIcon,
  DropletIcon,
  LightningIcon,
  RefreshIcon,
  SnowflakeIcon,
  FlameIcon,
  ActivityIcon,
  CheckIcon,
  InfoIcon,
} from '../../components/icons';
import CalcResult from './CalcResult';
import { CALCULATORS, defaultFormFor } from './calculators.js';
import { Select } from '../../components/Dropdown.jsx';
import { useLang } from '../../context/languageStore.js';

const INITIAL_CALC_FORM = {
  chillerType: 'WATER COOL',
  pInput: '646',
  load: '', // ภาระการทำงานเฉลี่ย (รอกรอกเอง 0-100%)
  refrigerant: '',
  ultraflowSonic: '2400',
  pctCoolingLoad: '', // คำนวณอัตโนมัติ
  chillTempIn: '54.5',
  chillTempOut: '46.5', // ขาจ่ายมาตรฐาน 46 - 47°F
  saturatedEvapTemp: '44.0',
  condTempIn: '84.1',
  condTempOut: '94.1',
  saturatedCondTemp: '99.0',
  dryBulbTemp: '84.1',
  dryBulbRH: '90.6',
};

const INITIAL_FIELD_UNITS = {
  chillTempIn: 'F',
  chillTempOut: 'F',
  saturatedEvapTemp: 'F',
  condTempIn: 'F',
  condTempOut: 'F',
  saturatedCondTemp: 'F',
  dryBulbTemp: 'F',
};

const toC = (f) => (((parseFloat(f) - 32) * 5) / 9).toFixed(2);
const toF = (c) => ((parseFloat(c) * 9) / 5 + 32).toFixed(2);

function TempToggle({ fieldKey, fieldUnits, onToggle }) {
  const unit = fieldUnits[fieldKey];
  return (
    <div className="flex bg-gray-100 dark:bg-white/10 rounded-lg p-0.5 gap-0.5">
      {['F', 'C'].map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => unit !== u && onToggle(fieldKey)}
          className={`px-2 py-0.5 rounded-md text-xs lg:text-sm font-bold transition-colors ${
            unit === u
              ? 'bg-[#0F2854] text-white'
              : 'text-[#0F2854]/60 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
          }`}
        >
          °{u}
        </button>
      ))}
    </div>
  );
}

function getInitialChillerForm(item = {}) {
  // 1. Chiller Input Power (กำลังไฟฟ้าขาเข้า kW)
  let pInput = '';
  if (item.chillerPower != null && String(item.chillerPower).trim() !== '') {
    pInput = String(item.chillerPower).trim();
  } else if (item.electricalPower != null && String(item.electricalPower).trim() !== '') {
    pInput = String(item.electricalPower).trim();
  } else if (item.power != null && String(item.power).trim() !== '') {
    pInput = String(item.power).trim();
  } else if (item.pInput != null && String(item.pInput).trim() !== '') {
    pInput = String(item.pInput).trim();
  } else {
    // If power not directly specified, calculate from TR * kW/TR
    const tr = parseFloat(item.coolingCapacity ?? item.capacityTR);
    const eff = parseFloat(item.chillerEfficiency ?? item.specificPower);
    if (!Number.isNaN(tr) && !Number.isNaN(eff) && tr > 0 && eff > 0) {
      pInput = String((tr * eff).toFixed(1));
    }
  }

  // 2. Load factor (ภาระการทำงาน %)
  let load = '';
  if (item.loadFactor != null && String(item.loadFactor).trim() !== '') {
    const rawLoad = parseFloat(item.loadFactor);
    if (!Number.isNaN(rawLoad) && rawLoad > 0) {
      load = rawLoad <= 1 ? String(Math.round(rawLoad * 100)) : String(rawLoad);
    }
  }

  // 3. Flow rate (อัตราการไหล GPM)
  let ultraflowSonic = '';
  if (item.ultraflowSonic != null && String(item.ultraflowSonic).trim() !== '') {
    ultraflowSonic = String(item.ultraflowSonic).trim();
  } else if (item.flowRate != null && String(item.flowRate).trim() !== '') {
    ultraflowSonic = String(item.flowRate).trim();
  } else if (item.flow != null && String(item.flow).trim() !== '') {
    ultraflowSonic = String(item.flow).trim();
  } else {
    const tr = parseFloat(item.coolingCapacity ?? item.capacityTR);
    if (!Number.isNaN(tr) && tr > 0) {
      // Standard chilled water flow: approx 2.4 GPM per TR
      ultraflowSonic = String(Math.round(tr * 2.4));
    }
  }

  // 4. Chiller Type & Refrigerant
  const chillerType = item.chillerType || (item.spec?.toUpperCase().includes('AIR') ? 'AIR COOL' : 'WATER COOL');
  const refrigerant = item.refrigerant || '';

  return {
    ...INITIAL_CALC_FORM,
    chillerType,
    pInput: pInput || INITIAL_CALC_FORM.pInput,
    load: load || INITIAL_CALC_FORM.load,
    ultraflowSonic: ultraflowSonic || INITIAL_CALC_FORM.ultraflowSonic,
    refrigerant,
  };
}

export default function CalcModal({ item, onClose }) {
  const { t } = useLang();
  const isChiller = item.category === 'chiller';
  const [calcForm, setCalcForm] = useState(() =>
    isChiller ? getInitialChillerForm(item) : defaultFormFor(item.category, item)
  );
  const [calcResult, setCalcResult] = useState(null);
  const [fieldUnits, setFieldUnits] = useState(INITIAL_FIELD_UNITS);
  const [flowUnit, setFlowUnit] = useState('GPM');

  // Calculate is usually pressed after scrolling deep into a long form —
  // jump back to the top so the result (which replaces the form entirely)
  // is visible immediately instead of landing mid-scroll.
  useEffect(() => {
    if (calcResult) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [calcResult]);

  const toggleFieldUnit = (key) => {
    const currentUnit = fieldUnits[key];
    const toUnit = currentUnit === 'F' ? 'C' : 'F';
    setCalcForm((p) => {
      const val = p[key];
      if (val === '') return p;
      return { ...p, [key]: toUnit === 'C' ? toC(val) : toF(val) };
    });
    setFieldUnits((p) => ({ ...p, [key]: toUnit }));
  };

  const handleCalc = () => {
    if (isChiller) {
      const P_in_raw = parseFloat(calcForm.pInput);
      if (!P_in_raw) return;
      const P_in = P_in_raw * 1.02;

      const toFahrenheit = (v, unit) => (unit === 'C' ? (v * 9) / 5 + 32 : v);
      const readF = (key) => {
        const v = parseFloat(calcForm[key]);
        return Number.isNaN(v) ? null : toFahrenheit(v, fieldUnits[key]);
      };
      const flowVal = parseFloat(calcForm.ultraflowSonic);
      const flowGPM = Number.isNaN(flowVal)
        ? null
        : flowUnit === 'm³/h'
        ? flowVal * 4.4029
        : flowVal;

      const T_CHWR_F = readF('chillTempIn');
      const T_CHWS_F = readF('chillTempOut');

      const specTR = parseFloat(item.coolingCapacity ?? item.capacityTR) || 0;
      const specKW = parseFloat(item.chillerPower ?? item.electricalPower ?? item.power) || 0;

      let TR = null,
        Q_cool_kW = null,
        kWperTR = null,
        COP = null,
        EER = null;
      if (flowGPM && T_CHWR_F != null && T_CHWS_F != null && T_CHWR_F > T_CHWS_F) {
        TR = (flowGPM * (T_CHWR_F - T_CHWS_F)) / 24;
      } else if (calcForm.pctCoolingLoad && specTR > 0) {
        const pct = parseFloat(calcForm.pctCoolingLoad);
        if (!Number.isNaN(pct) && pct > 0) {
          TR = specTR * (pct / 100);
        }
      }

      if (TR != null && TR > 0) {
        Q_cool_kW = TR * 3.517;
        kWperTR = P_in / TR;
        COP = Q_cool_kW / P_in;
        EER = COP * 3.412;
      }

      const Q_rej_kW = Q_cool_kW != null ? Q_cool_kW + P_in : null;

      const T_evap_F = readF('saturatedEvapTemp');
      const evapApproach_F = T_CHWS_F != null && T_evap_F != null ? T_CHWS_F - T_evap_F : null;

      const T_condOut_F = readF('condTempOut');
      let T_cond_F = null;
      if (calcForm.chillerType === 'AIR COOL') {
        const T_db_F = readF('dryBulbTemp');
        if (T_db_F != null) T_cond_F = T_db_F + 15;
      } else {
        T_cond_F = readF('saturatedCondTemp');
      }
      const condApproach_F = T_cond_F != null && T_condOut_F != null ? T_cond_F - T_condOut_F : null;

      let etaCarnot = null;
      if (COP != null && T_evap_F != null && T_cond_F != null) {
        const T_evap_K = ((T_evap_F - 32) * 5) / 9 + 273.15;
        const T_cond_K = ((T_cond_F - 32) * 5) / 9 + 273.15;
        if (T_cond_K > T_evap_K) {
          const COP_carnot = T_evap_K / (T_cond_K - T_evap_K);
          etaCarnot = (COP / COP_carnot) * 100;
        }
      }

      const grade =
        kWperTR == null ? null : kWperTR < 0.8 ? 'good' : kWperTR <= 1.0 ? 'ok' : 'poor';
      const fmt = (v, d = 2) => (v == null ? '-' : v.toFixed(d));

      let pctCoolingLoad = null;
      if (TR != null && specTR > 0) {
        pctCoolingLoad = (TR / specTR) * 100;
      } else if (calcForm.pctCoolingLoad) {
        pctCoolingLoad = parseFloat(calcForm.pctCoolingLoad) || null;
      }

      let pctElectricalLoad = null;
      if (P_in != null && specKW > 0) {
        pctElectricalLoad = (P_in / specKW) * 100;
      }

      setCalcResult({
        category: 'chiller',
        metrics: [
          { key: 'pctCoolingLoad', label: '% Cooling Load', value: pctCoolingLoad != null ? `${pctCoolingLoad.toFixed(1)}%` : '-', unit: specTR > 0 ? `(${fmt(TR)} / ${specTR} TR)` : 'ภาระทำความเย็น' },
          { key: 'efficiency', label: 'Efficiency (kW/TR)', value: fmt(kWperTR, 3), unit: 'kW/TR' },
          { key: 'coolingLoad', label: 'Cooling Load (TR)', value: fmt(TR), unit: 'TR' },
          { key: 'powerCF', label: 'Power (CF)', value: P_in.toFixed(2), unit: 'kW' },
          { key: 'cop', label: 'COP', value: fmt(COP, 3), unit: 'kW/kW' },
          { key: 'eer', label: 'EER', value: fmt(EER), unit: 'BTU/W' },
          ...(flowVal != null && !Number.isNaN(flowVal)
            ? [{ key: 'ultraflowSonic', label: 'Ultraflow Sonic', value: String(flowVal), unit: flowUnit || 'GPM' }]
            : []),
          { key: 'qRej', label: 'Heat Rejection', value: fmt(Q_rej_kW), unit: 'kW' },
          { key: 'etaCarnot', label: 'η Carnot', value: fmt(etaCarnot, 1), unit: '%' },
        ],
        ultraflowSonic: flowVal != null && !Number.isNaN(flowVal) ? flowVal : null,
        flowUnit: flowUnit || 'GPM',
        coolingLoad: TR,
        pctCoolingLoad,
        pctElectricalLoad,
        efficiency: kWperTR != null ? kWperTR.toFixed(3) : null,
        grade,
        powerCF: P_in.toFixed(2),
        powerBaseline: P_in,
        evapApproach: evapApproach_F,
        condApproach: condApproach_F,
        chillTempOut: T_CHWS_F,
        saturatedEvapTemp: T_evap_F,
        condTempOut: T_condOut_F,
        saturatedCondTemp: T_cond_F,
        inputs: { ...calcForm, flowUnit },
      });
      return;
    }
    const calc = CALCULATORS[item.category];
    if (!calc) return;
    const out = calc.compute(calcForm, item);
    setCalcResult({
      category: item.category,
      metrics: out.metrics,
      grade: out.grade,
      powerCF: out.powerBaseline,
      powerBaseline: out.powerBaseline,
    });
  };

  const toggleAllTempUnit = () => {
    const allF = Object.values(fieldUnits).every((u) => u === 'F');
    const toUnit = allF ? 'C' : 'F';
    setCalcForm((p) => {
      const updated = { ...p };
      Object.keys(INITIAL_FIELD_UNITS).forEach((key) => {
        if (p[key] !== '') updated[key] = toUnit === 'C' ? toC(p[key]) : toF(p[key]);
      });
      return updated;
    });
    setFieldUnits(Object.fromEntries(Object.keys(INITIAL_FIELD_UNITS).map((k) => [k, toUnit])));
  };

  const toggleFlowUnit = () => {
    const toUnit = flowUnit === 'GPM' ? 'm³/h' : 'GPM';
    setCalcForm((p) => {
      const val = parseFloat(p.ultraflowSonic);
      if (!val) return p;
      const converted =
        toUnit === 'm³/h' ? (val * 0.2271).toFixed(2) : (val * 4.4029).toFixed(2);
      return { ...p, ultraflowSonic: converted };
    });
    setFlowUnit(toUnit);
  };

  const handleResetDefaults = () => {
    if (isChiller) {
      setCalcForm(getInitialChillerForm(item));
      setFieldUnits(INITIAL_FIELD_UNITS);
      setFlowUnit('GPM');
    } else {
      setCalcForm(defaultFormFor(item.category, item));
    }
    setCalcResult(null);
  };

  const handleBackToForm = () => {
    setCalcResult(null);
  };

  const tempInput = (key) => (
    <input
      type="number"
      value={calcForm[key] || ''}
      onChange={(e) => setCalcForm((p) => ({ ...p, [key]: e.target.value }))}
      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
    />
  );

  // When we have a result, render CalcResult directly in the same full-page layout
  if (calcResult) {
    return <CalcResult item={item} result={calcResult} onBack={handleBackToForm} />;
  }

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto w-full py-6 space-y-6 font-sans">

      {/* Header */}
      <div className="flex items-start sm:items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex sm:hidden items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm shrink-0"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl lg:text-3xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
            คำนวณประสิทธิภาพอุปกรณ์ ({item.id})
          </h2>
          <p className="text-sm lg:text-base text-gray-400 dark:text-[#7E93AF] mt-0.5">
            กรอกพารามิเตอร์ด้านล่างเพื่อคำนวณค่า COP, kW/TR, EER และประสิทธิภาพระบบ
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-bold text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm shrink-0"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          ยกเลิก / ย้อนกลับ
        </button>
      </div>

      {/* SECTION 1: ข้อมูลอุปกรณ์ */}
      <Panel className="p-6 space-y-4 rounded-3xl">
        <div className="flex items-center gap-2 text-xs lg:text-sm font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
          <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
          ข้อมูลอุปกรณ์ (EQUIPMENT INFORMATION)
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10">
          {[
            ['Equipment Tag', item.id],
            ['โรงงาน (Factory)', item.factory],
            ['ยี่ห้อ / รุ่น', item.brandModel || '-'],
            ['แผนก / สถานที่', item.building || '-'],
            ...(item.coolingCapacity ? [['Cooling Capacity', `${item.coolingCapacity} RT`]] : []),
            ...(item.chillerPower ? [['Electrical Power', `${item.chillerPower} kW`]] : []),
            ...(item.chillerEfficiency ? [['Efficiency', `${item.chillerEfficiency} kW/RT`]] : []),
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs lg:text-sm text-gray-400 dark:text-[#7E93AF] font-medium">{label}</p>
              <p className="text-sm lg:text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7] mt-0.5">{val}</p>
            </div>
          ))}
        </div>

        {isChiller && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10">
            <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0]">
              ประเภทชิลเลอร์ (Chiller Type)
            </label>
            <div className="flex bg-gray-100 dark:bg-white/10 rounded-lg p-0.5 gap-0.5 self-start sm:self-auto">
              {['WATER COOL', 'AIR COOL'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCalcForm((p) => ({ ...p, chillerType: type }))}
                  className={`px-3 py-1.5 rounded-md text-xs lg:text-sm font-bold transition-colors ${
                    calcForm.chillerType === type
                      ? 'bg-[#0F2854] text-white shadow-sm'
                      : 'text-[#0F2854]/60 dark:text-[#7E93AF]'
                  }`}
                >
                  {type === 'AIR COOL' ? 'Air Cool' : 'Water Cool'}
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* SECTION 2: พารามิเตอร์ระบบไฟฟ้า & อัตราการไหล */}
      {isChiller && (() => {
        const specTR = parseFloat(item?.coolingCapacity ?? item?.capacityTR) || 0;
        const specKW = parseFloat(item?.chillerPower ?? item?.electricalPower ?? item?.power) || 0;

        const toFahrenheit = (v, unit) => (unit === 'C' ? (v * 9) / 5 + 32 : v);
        const readF = (key) => {
          const v = parseFloat(calcForm[key]);
          return Number.isNaN(v) ? null : toFahrenheit(v, fieldUnits[key]);
        };

        const tInF = readF('chillTempIn');
        const tOutF = readF('chillTempOut');
        const deltaT_F = tInF != null && tOutF != null && tInF > tOutF ? tInF - tOutF : 8.0;

        const flowVal = parseFloat(calcForm.ultraflowSonic);
        const flowGPM = Number.isNaN(flowVal)
          ? null
          : flowUnit === 'm³/h'
          ? flowVal * 4.4029
          : flowVal;

        const liveTR = flowGPM && deltaT_F > 0 ? (flowGPM * deltaT_F) / 24 : null;
        const livePctCoolingLoad = liveTR != null && specTR > 0 ? (liveTR / specTR) * 100 : parseFloat(calcForm.pctCoolingLoad) || null;

        const pInRaw = parseFloat(calcForm.pInput) || 0;
        const livePowerKW = pInRaw > 0 ? pInRaw * 1.02 : 0;
        const livePctElec = specKW > 0 && livePowerKW > 0 ? (livePowerKW / specKW) * 100 : null;
        const liveKwPerTr = liveTR != null && liveTR > 0 && livePowerKW > 0 ? livePowerKW / liveTR : null;

        const handlePctCoolingChange = (newPct) => {
          setCalcForm((p) => {
            const updated = { ...p, pctCoolingLoad: newPct };
            const pctNum = parseFloat(newPct);
            if (!Number.isNaN(pctNum) && specTR > 0 && pctNum > 0) {
              const targetTR = specTR * (pctNum / 100);
              const targetGPM = (24 * targetTR) / deltaT_F;
              const formattedFlow = flowUnit === 'm³/h' ? (targetGPM / 4.4029).toFixed(1) : Math.round(targetGPM).toString();
              updated.ultraflowSonic = formattedFlow;
            }
            return updated;
          });
        };

        const handleFlowInputChange = (newFlow) => {
          setCalcForm((p) => {
            const updated = { ...p, ultraflowSonic: newFlow };
            const flowNum = parseFloat(newFlow);
            if (!Number.isNaN(flowNum) && flowNum > 0 && specTR > 0) {
              const gpm = flowUnit === 'm³/h' ? flowNum * 4.4029 : flowNum;
              const calcTR = (gpm * deltaT_F) / 24;
              updated.pctCoolingLoad = ((calcTR / specTR) * 100).toFixed(1);
            }
            return updated;
          });
        };

        return (
          <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-[#4988C4]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs lg:text-sm font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <LightningIcon className="w-4 h-4 text-amber-500" />
                พารามิเตอร์ระบบไฟฟ้า & อัตราการไหล (POWER & FLOW RATE)
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                ค่าตรวจวัดจริง (Actual Measured Values)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. กำลังไฟฟ้าขาเข้า */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0]">
                    กำลังไฟฟ้าขาเข้า (kW)
                  </label>
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    ค่าตรวจวัด
                  </span>
                </div>
                <input
                  type="number"
                  value={calcForm.pInput || ''}
                  onChange={(e) => setCalcForm((p) => ({ ...p, pInput: e.target.value }))}
                  placeholder="เช่น 350"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                />
                {specKW > 0 && (
                  <p className="text-[10px] text-gray-400 font-mono mt-1">
                    พิกัดมอเตอร์: {specKW} kW {livePctElec != null ? `(โหลด ${livePctElec.toFixed(0)}%)` : ''}
                  </p>
                )}
              </div>

              {/* 2. ภาระการทำงานเฉลี่ย */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0]">
                    ภาระการทำงานเฉลี่ย (%)
                  </label>
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                    รอกรอกเอง
                  </span>
                </div>
                <input
                  type="number"
                  value={calcForm.load ?? ''}
                  onChange={(e) => setCalcForm((p) => ({ ...p, load: e.target.value }))}
                  placeholder="0-100 (รอกรอกเอง)"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                />
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  สัดส่วนการเดินเครื่อง (0-100%)
                </p>
              </div>

              {/* 3. % ภาระทำความเย็น (% Cooling Load / Spec) - คำนวณอัตโนมัติ */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0]">
                    % Cooling Load / Spec
                  </label>
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                    คำนวณอัตโนมัติ
                  </span>
                </div>
                <div className="w-full px-4 py-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-between">
                  <span className="text-sm lg:text-base font-mono font-black text-emerald-800 dark:text-emerald-300">
                    {livePctCoolingLoad != null ? `${livePctCoolingLoad.toFixed(1)}%` : '-'}
                  </span>
                  {liveTR != null && specTR > 0 && (
                    <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      ({liveTR.toFixed(1)} / {specTR} TR)
                    </span>
                  )}
                </div>
                {specTR > 0 ? (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-1 font-semibold">
                    คำนวณจาก Flow & ΔT ({deltaT_F.toFixed(1)}°F) ÷ 24
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 font-mono mt-1">
                    สัดส่วนภาระความเย็นคำนวณอัตโนมัติ
                  </p>
                )}
              </div>

              {/* 4. อัตราการไหล Ultraflow Sonic */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0]">
                      อัตราการไหล ({flowUnit})
                    </label>
                  </div>
                  <div className="flex bg-gray-100 dark:bg-white/10 rounded-lg p-0.5 gap-0.5 self-start sm:self-auto">
                    {['GPM', 'm³/h'].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => flowUnit !== unit && toggleFlowUnit()}
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition-colors ${
                          flowUnit === unit
                            ? 'bg-[#0F2854] text-white shadow-sm'
                            : 'text-[#0F2854]/60 dark:text-[#7E93AF]'
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  value={calcForm.ultraflowSonic || ''}
                  onChange={(e) => handleFlowInputChange(e.target.value)}
                  placeholder="เช่น 1200"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                />
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  Q = ṁ·Cp·ΔT ({deltaT_F.toFixed(1)}°F)
                </p>
              </div>
            </div>

            {/* Refrigerant Selector */}
            <div className="pt-1">
              <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                สารทำความเย็น (Refrigerant)
              </label>
              <Select
                value={calcForm.refrigerant || ''}
                onChange={(v) => setCalcForm((p) => ({ ...p, refrigerant: v }))}
                placeholder="-- เลือกสารทำความเย็น --"
                options={['R-11', 'R-12', 'R-22', 'R-123', 'R-134a', 'R-407C', 'R-410A', 'R-717']}
                triggerClassName="flex items-center w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base text-[#0F2854] dark:text-[#E7EEF7]"
              />
            </div>

            {/* LIVE REAL-TIME CHILLER STATUS PREVIEW BAR */}
            <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <SnowflakeIcon className="w-3.5 h-3.5 shrink-0" /> Cooling Load: <strong className="text-blue-600 dark:text-blue-400">{liveTR ? liveTR.toFixed(1) : '-'} TR</strong>
                  {specTR > 0 && livePctCoolingLoad != null ? ` (${livePctCoolingLoad.toFixed(1)}% ของสเปก)` : ''}
                </span>
                <span className="text-gray-400">|</span>
                <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <LightningIcon className="w-3.5 h-3.5 shrink-0" /> ไฟฟ้า: <strong className="text-amber-600 dark:text-amber-400">{livePowerKW > 0 ? livePowerKW.toFixed(1) : '-'} kW</strong>
                  {specKW > 0 && livePctElec != null ? ` (${livePctElec.toFixed(1)}% โหลด)` : ''}
                </span>
              </div>
              {liveKwPerTr != null && (
                <span className="font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-[#0B1B33] text-[#0F2854] dark:text-[#E7EEF7] border border-blue-200 dark:border-blue-500/30 flex items-center gap-1.5">
                  <ActivityIcon className="w-3.5 h-3.5 shrink-0" /> สมรรถนะเบื้องต้น: <strong className={liveKwPerTr <= 0.75 ? 'text-emerald-600' : 'text-blue-600'}>{liveKwPerTr.toFixed(3)} kW/TR</strong>
                </span>
              )}
            </div>
          </Panel>
        );
      })()}

      {/* SECTION 3: อุณหภูมิน้ำ / อากาศในระบบ */}
      {isChiller && (
        <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-emerald-500">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-xs lg:text-sm font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
              <DropletIcon className="w-4 h-4 text-emerald-500 shrink-0" />
              อุณหภูมิในระบบ (TEMPERATURE READINGS)
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ค่าตรวจวัดจริง
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs lg:text-sm text-gray-400 dark:text-[#7E93AF] font-bold">สลับหน่วย:</span>
                <div className="flex bg-[#0F2854]/10 dark:bg-white/10 rounded-xl p-0.5 gap-0.5">
                  {['F', 'C'].map((u) => {
                    const allSame = Object.values(fieldUnits).every((v) => v === u);
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => !allSame && toggleAllTempUnit()}
                        className={`px-3 py-1 rounded-lg text-xs lg:text-sm font-bold transition-colors ${
                          allSame
                            ? 'bg-[#0F2854] text-white shadow-sm'
                            : 'text-[#0F2854]/60 dark:text-[#7E93AF]'
                        }`}
                      >
                        °{u}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Chilled Water */}
          <div className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="flex items-center gap-1.5 text-xs lg:text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">
                <SnowflakeIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-sky-500 shrink-0" />
                ฝั่งน้ำเย็น (Chilled Water)
              </p>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 inline-flex items-center gap-1">
                <SnowflakeIcon className="w-3 h-3 shrink-0" /> ขาจ่ายมาตรฐาน: 46 - 47°F (7.8 - 8.3°C)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Temp In / Return */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] leading-snug">
                    Temp In / Return
                    <span className="block font-normal text-gray-400 dark:text-[#7E93AF]">(น้ำเย็นกลับ) (°{fieldUnits.chillTempIn})</span>
                  </label>
                  <TempToggle fieldKey="chillTempIn" fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                </div>
                {tempInput('chillTempIn')}
                <p className="text-[10px] text-gray-400 mt-1 font-mono">ทั่วไป 54 - 56°F</p>
              </div>

              {/* Temp Out / Supply (น้ำเย็นจ่าย) - Standard 46-47 F */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] leading-snug">
                    Temp Out / Supply
                    <span className="block font-bold text-blue-600 dark:text-blue-400">(น้ำเย็นจ่าย 46-47°F)</span>
                  </label>
                  <TempToggle fieldKey="chillTempOut" fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                </div>
                {tempInput('chillTempOut')}
                {(() => {
                  const val = parseFloat(calcForm.chillTempOut);
                  if (Number.isNaN(val)) return null;
                  const valF = fieldUnits.chillTempOut === 'C' ? (val * 9) / 5 + 32 : val;
                  const isOptimal = valF >= 45.5 && valF <= 47.5;
                  return (
                    <p className={`text-[10px] mt-1 font-mono font-bold flex items-center gap-1 ${isOptimal ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {isOptimal ? <CheckIcon className="w-3 h-3 shrink-0" /> : <InfoIcon className="w-3 h-3 shrink-0" />}
                      {isOptimal ? 'อุณหภูมิขาจ่ายมาตรฐาน (46-47°F)' : `อุณหภูมิน้ำจ่าย (${valF.toFixed(1)}°F)`}
                    </p>
                  );
                })()}
              </div>

              {/* Saturated Evap Temp */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] leading-snug">
                    Saturated Evap Temp
                    <span className="block font-normal text-gray-400 dark:text-[#7E93AF]">(สารทำความเย็นระเหย) (°{fieldUnits.saturatedEvapTemp})</span>
                  </label>
                  <TempToggle fieldKey="saturatedEvapTemp" fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                </div>
                {tempInput('saturatedEvapTemp')}
                <p className="text-[10px] text-gray-400 mt-1 font-mono">ทั่วไป 42 - 45°F</p>
              </div>
            </div>
          </div>

          {/* Condenser Water / Dry Bulb */}
          <div className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 space-y-3">
            <p className="flex items-center gap-1.5 text-xs lg:text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">
              <FlameIcon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-500 shrink-0" />
              ฝั่งระบายความร้อน ({calcForm.chillerType === 'AIR COOL' ? 'Dry Bulb' : 'Condenser'})
            </p>
            {calcForm.chillerType === 'AIR COOL' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0]">
                      Dry Bulb Temp (°{fieldUnits.dryBulbTemp})
                    </label>
                    <TempToggle fieldKey="dryBulbTemp" fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                  </div>
                  {tempInput('dryBulbTemp')}
                </div>
                <div>
                  <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                    %RH (ความชื้นสัมพัทธ์)
                  </label>
                  <input
                    type="number"
                    value={calcForm.dryBulbRH || ''}
                    onChange={(e) => setCalcForm((p) => ({ ...p, dryBulbRH: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  ['Temp In / from CT', 'น้ำเข้าระบายความร้อน', 'condTempIn'],
                  ['Temp Out / to CT', 'น้ำออกไป CT', 'condTempOut'],
                  ['Saturated Cond Temp', 'อุณหภูมิควบแน่น', 'saturatedCondTemp'],
                ].map(([label, thai, key]) => (
                  <div key={key}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] leading-snug">
                        {label}
                        <span className="block font-normal text-gray-400 dark:text-[#7E93AF]">({thai}) (°{fieldUnits[key]})</span>
                      </label>
                      <TempToggle fieldKey={key} fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                    </div>
                    {tempInput(key)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Non-chiller Calculators */}
      {!isChiller && (
        <Panel className="p-6 space-y-4 rounded-3xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs lg:text-sm font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
              <CalculatorIcon className="w-4 h-4 text-[#4988C4]" />
              กรอกพารามิเตอร์การคำนวณ (INPUT DATA)
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              ค่าตรวจวัดจริง (Actual Measured Values)
            </span>
          </div>
          {CALCULATORS[item.category] ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CALCULATORS[item.category].fields.map((f) => (
                <div key={f.key}>
                  <label className="text-xs lg:text-sm font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                    {t.calculator.fieldLabels[f.label] || f.label}
                    {f.unit && <span className="text-xs lg:text-sm text-gray-400 font-normal"> ({f.unit})</span>}
                  </label>
                  <input
                    type="number"
                    value={calcForm[f.key] ?? ''}
                    onChange={(e) => setCalcForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm lg:text-base font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm lg:text-base text-gray-400 text-center py-4">ไม่พบสูตรคำนวณสำหรับหมวดหมู่นี้</p>
          )}
        </Panel>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={handleResetDefaults}
          className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-[#C3D2E5] font-bold text-sm lg:text-base transition-colors flex items-center justify-center gap-2"
        >
          <RefreshIcon className="w-4 h-4" />
          รีเซ็ตข้อมูล
        </button>
        <button
          type="button"
          onClick={handleCalc}
          className="flex-1 py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm lg:text-base shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <CalculatorIcon className="w-5 h-5" />
          คำนวณประสิทธิภาพ
        </button>
      </div>
    </div>
  );
}
