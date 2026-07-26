import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalculatorIcon,
  ChevronDownIcon,
  ClipboardIcon,
  DropletIcon,
  LightningIcon,
  RefreshIcon,
} from '../../components/icons';
import CalcResult from './CalcResult';
import { CALCULATORS, defaultFormFor } from './calculators.js';
import { Select } from '../../components/Dropdown.jsx';
import { useLang } from '../../context/languageStore.js';

const INITIAL_CALC_FORM = {
  pInput: '646', load: '70', refrigerant: '',
  ultraflowSonic: '2400',
  chillTempIn: '54', chillTempOut: '45.6', saturatedEvapTemp: '47.3',
  condTempIn: '84.1', condTempOut: '90.6', saturatedCondTemp: '95.4',
  dryBulbTemp: '84.1', dryBulbRH: '90.6',
};

const INITIAL_FIELD_UNITS = {
  chillTempIn: 'F', chillTempOut: 'F', saturatedEvapTemp: 'F',
  condTempIn: 'F', condTempOut: 'F', saturatedCondTemp: 'F',
  dryBulbTemp: 'F',
};

const toC = (f) => ((parseFloat(f) - 32) * 5 / 9).toFixed(2);
const toF = (c) => (parseFloat(c) * 9 / 5 + 32).toFixed(2);

function TempToggle({ fieldKey, fieldUnits, onToggle }) {
  const unit = fieldUnits[fieldKey];
  return (
    <div className="flex bg-gray-100 dark:bg-white/10 rounded-lg p-0.5 gap-0.5">
      {['F', 'C'].map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => unit !== u && onToggle(fieldKey)}
          className={`px-2 py-0.5 rounded-md text-xs font-bold transition-colors ${
            unit === u ? 'bg-[#0F2854] text-white' : 'text-[#0F2854]/60 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
          }`}
        >
          °{u}
        </button>
      ))}
    </div>
  );
}

function CalcModal({ item, onClose }) {
  const { t } = useLang();
  const isChiller = item.category === 'chiller';
  const [calcForm, setCalcForm] = useState(() => (isChiller ? INITIAL_CALC_FORM : defaultFormFor(item.category)));
  const [calcResult, setCalcResult] = useState(null);
  const [fieldUnits, setFieldUnits] = useState(INITIAL_FIELD_UNITS);
  const [flowUnit, setFlowUnit] = useState('GPM');

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
      const P_in = P_in_raw * 1.02; // instrument reading correction factor

      const toFahrenheit = (v, unit) => (unit === 'C' ? (v * 9) / 5 + 32 : v);
      const readF = (key) => {
        const v = parseFloat(calcForm[key]);
        return Number.isNaN(v) ? null : toFahrenheit(v, fieldUnits[key]);
      };
      const flowVal = parseFloat(calcForm.ultraflowSonic);
      const flowGPM = Number.isNaN(flowVal) ? null : (flowUnit === 'm³/h' ? flowVal * 4.4029 : flowVal);

      const T_CHWR_F = readF('chillTempIn'); // return water, warmer
      const T_CHWS_F = readF('chillTempOut'); // supply water, cooler

      let TR = null, Q_cool_kW = null, kWperTR = null, COP = null, EER = null;
      if (flowGPM && T_CHWR_F != null && T_CHWS_F != null && T_CHWR_F > T_CHWS_F) {
        TR = (flowGPM * (T_CHWR_F - T_CHWS_F)) / 24;
        Q_cool_kW = TR * 3.517;
        kWperTR = P_in / TR;
        COP = Q_cool_kW / P_in;
        EER = COP * 3.412;
      }

      // Simple energy balance — valid for both water- and air-cooled condensers
      const Q_rej_kW = Q_cool_kW != null ? Q_cool_kW + P_in : null;

      // Theoretical (Carnot) efficiency from saturated evap/cond temps;
      // air-cooled condensers approximate saturated cond temp as dry bulb + 15°F approach
      const T_evap_F = readF('saturatedEvapTemp');
      let T_cond_F = null;
      if (item.chillerType === 'AIR COOL') {
        const T_db_F = readF('dryBulbTemp');
        if (T_db_F != null) T_cond_F = T_db_F + 15;
      } else {
        T_cond_F = readF('saturatedCondTemp');
      }

      let etaCarnot = null;
      if (COP != null && T_evap_F != null && T_cond_F != null) {
        const T_evap_K = ((T_evap_F - 32) * 5) / 9 + 273.15;
        const T_cond_K = ((T_cond_F - 32) * 5) / 9 + 273.15;
        if (T_cond_K > T_evap_K) {
          const COP_carnot = T_evap_K / (T_cond_K - T_evap_K);
          etaCarnot = (COP / COP_carnot) * 100;
        }
      }

      const grade = kWperTR == null ? null : kWperTR < 0.8 ? 'good' : kWperTR <= 1.0 ? 'ok' : 'poor';
      const fmt = (v, d = 2) => (v == null ? '-' : v.toFixed(d));

      setCalcResult({
        category: 'chiller',
        metrics: [
          { key: 'cop', label: 'COP', value: fmt(COP, 3), unit: 'kW/kW' },
          { key: 'efficiency', label: 'Efficiency', value: fmt(kWperTR, 3), unit: 'kW/TR' },
          { key: 'eer', label: 'EER', value: fmt(EER), unit: 'BTU/W' },
          { key: 'coolingLoad', label: 'Cooling Load', value: fmt(TR), unit: 'TR' },
          { key: 'qCool', label: 'Q Cool', value: fmt(Q_cool_kW), unit: 'kW' },
          { key: 'qRej', label: 'Heat Rejection', value: fmt(Q_rej_kW), unit: 'kW' },
          { key: 'etaCarnot', label: 'η Carnot', value: fmt(etaCarnot, 1), unit: '%' },
        ],
        // legacy top-level fields kept for MeasureSelect.jsx autofill (autoFrom: 'powerCF' / 'coolingLoad')
        coolingLoad: TR, efficiency: kWperTR != null ? kWperTR.toFixed(2) : null,
        grade, powerCF: P_in.toFixed(2), powerBaseline: P_in,
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
      const converted = toUnit === 'm³/h' ? (val * 0.2271).toFixed(2) : (val * 4.4029).toFixed(2);
      return { ...p, ultraflowSonic: converted };
    });
    setFlowUnit(toUnit);
  };

  const resetCalc = () => {
    if (isChiller) {
      setCalcForm(INITIAL_CALC_FORM);
      setFieldUnits(INITIAL_FIELD_UNITS);
      setFlowUnit('GPM');
    } else {
      setCalcForm(defaultFormFor(item.category));
    }
    setCalcResult(null);
  };

  const tempInput = (key) => (
    <input
      type="number"
      value={calcForm[key] || ''}
      onChange={(e) => setCalcForm((p) => ({ ...p, [key]: e.target.value }))}
      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
    />
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col lg:items-center lg:justify-center font-sans">
      {/* Backdrop (desktop only) */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm hidden lg:block" onClick={onClose} />

      {/* Full-screen bg (mobile only) */}
      <div className="absolute inset-0 bg-shell-gradient lg:hidden" />

      {/* Panel */}
      <div className="relative z-10 flex flex-col w-full h-full lg:h-auto lg:max-h-[90vh] lg:max-w-xl lg:rounded-3xl lg:shadow-2xl overflow-hidden bg-shell-gradient">
        {/* Result screen overlay */}
        {calcResult && (
          <div className="absolute inset-0 z-20 overflow-hidden lg:rounded-3xl">
            <CalcResult item={item} result={calcResult} onBack={resetCalc} />
          </div>
        )}

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-12 lg:pt-6 pb-4 shrink-0">
        <button type="button" onClick={onClose} className="flex items-center gap-1.5 text-[#0F2854]/60 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7] transition-colors">
          <ChevronDownIcon className="w-5 h-5 rotate-90 shrink-0" />
          <span className="text-sm font-medium">{t.calculator.back}</span>
        </button>
        <h1 className="flex-1 text-center text-xl font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.calculator.calcEfficiency}</h1>
        <button type="button" onClick={onClose} className="hidden lg:flex w-8 h-8 rounded-full bg-white dark:bg-[#111F35] shadow-sm hover:bg-[#F4F7FC] dark:hover:bg-white/5 items-center justify-center text-[#0F2854] dark:text-[#E7EEF7] font-bold transition-colors">✕</button>
      </div>

      {/* Scrollable body */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 lg:px-6 pb-6 space-y-4">

        {/* Equipment info */}
        <div className="bg-white dark:bg-[#111F35] rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#0F2854] flex items-center justify-center shrink-0">
              <ClipboardIcon className="w-4 h-4 text-white" />
            </div>
            <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.calculator.equipmentInfo}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              [t.calculator.calcId, item.id],
              [t.calculator.calcFactory, item.factory],
              [t.calculator.calcBrandModel, item.brandModel],
              [t.calculator.calcBuilding, item.building],
              ...(item.chillerType ? [['Chiller Type', item.chillerType]] : []),
              ...(item.coolingCapacity ? [['Cooling Capacity', `${item.coolingCapacity} RT`]] : []),
              ...(item.chillerPower ? [['Power', `${item.chillerPower} kW`]] : []),
              ...(item.chillerEfficiency ? [['Efficiency', `${item.chillerEfficiency} kW/RT`]] : []),
              ...(item.electricityCost ? [['Electricity Cost', `${item.electricityCost} ${t.calculator.elecCostUnit}`]] : []),
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 dark:text-[#7E93AF] mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-[#0F2854] dark:text-[#E7EEF7]">{val || '-'}</p>
              </div>
            ))}
          </div>
        </div>

        {isChiller && <>
        {/* Electric Power */}
        <div className="bg-white dark:bg-[#111F35] rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#0F2854] flex items-center justify-center shrink-0">
              <LightningIcon className="w-4 h-4 text-white" />
            </div>
            <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">Electric Power</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[['Power (kW)', 'pInput'], [t.calculator.load, 'load']].map(([label, key]) => (
              <div key={key}>
                <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{label}</label>
                <input
                  type="number"
                  value={calcForm[key] || ''}
                  onChange={(e) => setCalcForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">{t.calculator.refrigerant}</label>
              <Select
                value={calcForm.refrigerant || ''}
                onChange={(v) => setCalcForm((p) => ({ ...p, refrigerant: v }))}
                placeholder={t.calculator.selectPlaceholder}
                options={['R-11', 'R-12', 'R-22', 'R-123', 'R-134a', 'R-407C', 'R-410A', 'R-717']}
                triggerClassName="flex items-center w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5]"
              />
            </div>
          </div>
        </div>

        {/* Water Flow */}
        <div className="bg-white dark:bg-[#111F35] rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#0F2854] flex items-center justify-center shrink-0">
              <DropletIcon className="w-4 h-4 text-white" />
            </div>
            <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">Water Flow</p>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[13px] font-bold text-[#0F2854] dark:text-[#E7EEF7]">Ultraflow Sonic ({flowUnit})</label>
            <div className="flex bg-gray-100 dark:bg-white/10 rounded-lg p-0.5 gap-0.5">
              {['GPM', 'm³/h'].map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => flowUnit !== unit && toggleFlowUnit()}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                    flowUnit === unit ? 'bg-[#0F2854] text-white' : 'text-[#0F2854]/60 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
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
            onChange={(e) => setCalcForm((p) => ({ ...p, ultraflowSonic: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
          />
        </div>

        {/* Global temperature unit toggle */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-[#0F2854]/70 dark:text-[#7E93AF]">{t.calculator.changeAllTempUnits}</p>
          <div className="flex bg-[#0F2854]/8 dark:bg-white/5 rounded-xl p-1 gap-1">
            {['F', 'C'].map((u) => {
              const allSame = Object.values(fieldUnits).every((v) => v === u);
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => !allSame && toggleAllTempUnit()}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    allSame ? 'bg-white dark:bg-white/15 text-[#0F2854] dark:text-[#E7EEF7] shadow-sm' : 'text-[#0F2854]/50 dark:text-[#7E93AF] hover:text-[#0F2854] dark:hover:text-[#E7EEF7]'
                  }`}
                >
                  °{u}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chilled Water */}
        <div className="bg-white dark:bg-[#111F35] rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#4988C4] flex items-center justify-center shrink-0">
              <DropletIcon className="w-4 h-4 text-white" />
            </div>
            <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">Chilled Water</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Temp In / Return', 'chillTempIn', ''],
              ['Temp Out / Supply', 'chillTempOut', ''],
              ['Saturated Evap Temp', 'saturatedEvapTemp', 'col-span-2'],
            ].map(([label, key, span]) => (
              <div key={key} className={span}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-bold text-[#0F2854] dark:text-[#E7EEF7] whitespace-pre-line">{label} (°{fieldUnits[key]})</label>
                  <TempToggle fieldKey={key} fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                </div>
                {tempInput(key)}
              </div>
            ))}
          </div>
        </div>

        {/* Condenser Water / Dry Bulb */}
        {item.chillerType === 'AIR COOL' ? (
          <div className="bg-white dark:bg-[#111F35] rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#1C4D8D] flex items-center justify-center shrink-0">
                <DropletIcon className="w-4 h-4 text-white" />
              </div>
              <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">Dry Bulb</p>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-bold text-[#0F2854] dark:text-[#E7EEF7]">Temp (°{fieldUnits.dryBulbTemp})</label>
                  <TempToggle fieldKey="dryBulbTemp" fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                </div>
                {tempInput('dryBulbTemp')}
              </div>
              <div>
                <label className="text-[13px] font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">%RH</label>
                <input
                  type="number"
                  value={calcForm.dryBulbRH || ''}
                  onChange={(e) => setCalcForm((p) => ({ ...p, dryBulbRH: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111F35] rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#1C4D8D] flex items-center justify-center shrink-0">
                <DropletIcon className="w-4 h-4 text-white" />
              </div>
              <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">Condenser Water</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Temp In / from CT', 'condTempIn', ''],
                ['Temp Out /\nto CT', 'condTempOut', ''],
                ['Saturated Cond Temp', 'saturatedCondTemp', 'col-span-2'],
              ].map(([label, key, span]) => (
                <div key={key} className={span}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[13px] font-bold text-[#0F2854] dark:text-[#E7EEF7] whitespace-pre-line">{label} (°{fieldUnits[key]})</label>
                    <TempToggle fieldKey={key} fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                  </div>
                  {tempInput(key)}
                </div>
              ))}
            </div>
          </div>
        )}
        </>}

        {!isChiller && (
          <div className="bg-white dark:bg-[#111F35] rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0F2854] flex items-center justify-center shrink-0">
                <CalculatorIcon className="w-4 h-4 text-white" />
              </div>
              <p className="text-base font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.calculator.inputData}</p>
            </div>
            {CALCULATORS[item.category] ? (
              <div className="grid grid-cols-2 gap-4">
                {CALCULATORS[item.category].fields.map((f) => (
                  <div key={f.key}>
                    <label className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] mb-1.5 block">
                      {t.calculator.fieldLabels[f.label] || f.label}
                      {f.unit && <span className="text-xs font-normal text-gray-400 dark:text-[#7E93AF]"> ({f.unit})</span>}
                    </label>
                    <input
                      type="number"
                      value={calcForm[f.key] ?? ''}
                      onChange={(e) => setCalcForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-base text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-[#7E93AF] text-center py-4">{t.calculator.calcNotSupported}</p>
            )}
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="relative z-10 px-4 lg:px-6 pb-8 lg:pb-6 pt-3 space-y-3 shrink-0">
        <button
          type="button"
          onClick={handleCalc}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-all duration-300 hover:shadow-[0_8px_25px_rgba(9,18,66,0.5)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5"
          style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
        >
          <CalculatorIcon className="w-5 h-5 shrink-0" />
          {t.equipment.calculate}
        </button>
        <button
          type="button"
          onClick={resetCalc}
          className="w-full py-3.5 rounded-2xl bg-white dark:bg-[#111F35] border border-[#0F2854]/10 dark:border-white/10 shadow-sm hover:bg-[#F4F7FC] dark:hover:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshIcon className="w-4 h-4" />
          {t.calculator.reset}
        </button>
      </div>
      </div>
    </div>
  , document.body);
}

export default CalcModal;
