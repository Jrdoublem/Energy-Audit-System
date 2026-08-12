import { useState } from 'react';
import { Panel } from '../../components/ui';
import {
  ArrowLeftIcon,
  CalculatorIcon,
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
  pInput: '646',
  load: '70',
  refrigerant: '',
  ultraflowSonic: '2400',
  chillTempIn: '54',
  chillTempOut: '45.6',
  saturatedEvapTemp: '47.3',
  condTempIn: '84.1',
  condTempOut: '90.6',
  saturatedCondTemp: '95.4',
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
          className={`px-2 py-0.5 rounded-md text-xs font-bold transition-colors ${
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

export default function CalcModal({ item, onClose }) {
  const { t } = useLang();
  const isChiller = item.category === 'chiller';
  const [calcForm, setCalcForm] = useState(() =>
    isChiller ? INITIAL_CALC_FORM : defaultFormFor(item.category)
  );
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

      let TR = null,
        Q_cool_kW = null,
        kWperTR = null,
        COP = null,
        EER = null;
      if (flowGPM && T_CHWR_F != null && T_CHWS_F != null && T_CHWR_F > T_CHWS_F) {
        TR = (flowGPM * (T_CHWR_F - T_CHWS_F)) / 24;
        Q_cool_kW = TR * 3.517;
        kWperTR = P_in / TR;
        COP = Q_cool_kW / P_in;
        EER = COP * 3.412;
      }

      const Q_rej_kW = Q_cool_kW != null ? Q_cool_kW + P_in : null;

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

      const grade =
        kWperTR == null ? null : kWperTR < 0.8 ? 'good' : kWperTR <= 1.0 ? 'ok' : 'poor';
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
        coolingLoad: TR,
        efficiency: kWperTR != null ? kWperTR.toFixed(2) : null,
        grade,
        powerCF: P_in.toFixed(2),
        powerBaseline: P_in,
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
      className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
    />
  );

  return (
    <div className="max-w-4xl mx-auto w-full py-6 space-y-6 font-sans">
      {/* Result screen overlay */}
      {calcResult && (
        <div className="fixed inset-0 z-50 bg-[#F4F7FC] dark:bg-[#0B1B33] overflow-y-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto">
            <CalcResult item={item} result={calcResult} onBack={resetCalc} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
            คำนวณประสิทธิภาพอุปกรณ์ ({item.id})
          </h2>
          <p className="text-sm text-gray-400 dark:text-[#7E93AF] mt-0.5">
            กรอกพารามิเตอร์ด้านล่างเพื่อคำนวณค่า COP, kW/TR, EER และประสิทธิภาพระบบ
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          ยกเลิก / ย้อนกลับ
        </button>
      </div>

      {/* SECTION 1: ข้อมูลอุปกรณ์ */}
      <Panel className="p-6 space-y-4 rounded-3xl">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
          <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
          ข้อมูลอุปกรณ์ (EQUIPMENT INFORMATION)
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10">
          {[
            ['Equipment Tag', item.id],
            ['โรงงาน (Factory)', item.factory],
            ['ยี่ห้อ / รุ่น', item.brandModel || '-'],
            ['แผนก / สถานที่', item.building || '-'],
            ...(item.chillerType ? [['Chiller Type', item.chillerType]] : []),
            ...(item.coolingCapacity ? [['Cooling Capacity', `${item.coolingCapacity} RT`]] : []),
            ...(item.chillerPower ? [['Electrical Power', `${item.chillerPower} kW`]] : []),
            ...(item.chillerEfficiency ? [['Efficiency', `${item.chillerEfficiency} kW/RT`]] : []),
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs text-gray-400 dark:text-[#7E93AF] font-medium">{label}</p>
              <p className="text-sm font-extrabold text-[#0F2854] dark:text-[#E7EEF7] mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* SECTION 2: พารามิเตอร์ระบบไฟฟ้า & อัตราการไหล */}
      {isChiller && (
        <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-[#4988C4]">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
            <LightningIcon className="w-4 h-4 text-amber-500" />
            พารามิเตอร์ระบบไฟฟ้า & อัตราการไหล (POWER & FLOW RATE)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                กำลังไฟฟ้าขาเข้า (Electric Power kW)
              </label>
              <input
                type="number"
                value={calcForm.pInput || ''}
                onChange={(e) => setCalcForm((p) => ({ ...p, pInput: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                ภาระการทำงาน (Load Factor %)
              </label>
              <input
                type="number"
                value={calcForm.load || ''}
                onChange={(e) => setCalcForm((p) => ({ ...p, load: e.target.value }))}
                className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                สารทำความเย็น (Refrigerant)
              </label>
              <Select
                value={calcForm.refrigerant || ''}
                onChange={(v) => setCalcForm((p) => ({ ...p, refrigerant: v }))}
                placeholder="-- เลือกสารทำความเย็น --"
                options={['R-11', 'R-12', 'R-22', 'R-123', 'R-134a', 'R-407C', 'R-410A', 'R-717']}
                triggerClassName="w-full px-4 py-2.5 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">
                อัตราการไหล Ultraflow Sonic ({flowUnit})
              </label>
              <div className="flex bg-gray-100 dark:bg-white/10 rounded-lg p-0.5 gap-0.5">
                {['GPM', 'm³/h'].map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => flowUnit !== unit && toggleFlowUnit()}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                      flowUnit === unit
                        ? 'bg-[#0F2854] text-white'
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
              onChange={(e) => setCalcForm((p) => ({ ...p, ultraflowSonic: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
            />
          </div>
        </Panel>
      )}

      {/* SECTION 3: อุณหภูมิน้ำ / อากาศในระบบ */}
      {isChiller && (
        <Panel className="p-6 space-y-5 rounded-3xl border-t-4 border-t-emerald-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
              <DropletIcon className="w-4 h-4 text-emerald-500" />
              อุณหภูมิในระบบ (TEMPERATURE READINGS)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-[#7E93AF] font-bold">สลับหน่วยทั้งหมด:</span>
              <div className="flex bg-[#0F2854]/10 dark:bg-white/10 rounded-xl p-0.5 gap-0.5">
                {['F', 'C'].map((u) => {
                  const allSame = Object.values(fieldUnits).every((v) => v === u);
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => !allSame && toggleAllTempUnit()}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
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

          {/* Chilled Water */}
          <div className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 space-y-3">
            <p className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7]">❄️ ฝั่งน้ำเย็น (Chilled Water)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                ['Temp In / Return (น้ำเย็นกลับ)', 'chillTempIn'],
                ['Temp Out / Supply (น้ำเย็นจ่าย)', 'chillTempOut'],
                ['Saturated Evap Temp (อุณหภูมิสารทำความเย็นระเหย)', 'saturatedEvapTemp'],
              ].map(([label, key]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">
                      {label} (°{fieldUnits[key]})
                    </label>
                    <TempToggle fieldKey={key} fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                  </div>
                  {tempInput(key)}
                </div>
              ))}
            </div>
          </div>

          {/* Condenser Water / Dry Bulb */}
          <div className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 space-y-3">
            <p className="text-xs font-bold text-[#0F2854] dark:text-[#E7EEF7]">🔥 ฝั่งระบายความร้อน (Condenser / Dry Bulb)</p>
            {item.chillerType === 'AIR COOL' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">
                      Dry Bulb Temp (°{fieldUnits.dryBulbTemp})
                    </label>
                    <TempToggle fieldKey="dryBulbTemp" fieldUnits={fieldUnits} onToggle={toggleFieldUnit} />
                  </div>
                  {tempInput('dryBulbTemp')}
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                    %RH (ความชื้นสัมพัทธ์)
                  </label>
                  <input
                    type="number"
                    value={calcForm.dryBulbRH || ''}
                    onChange={(e) => setCalcForm((p) => ({ ...p, dryBulbRH: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  ['Temp In / from CT (น้ำเข้าระบายความร้อน)', 'condTempIn'],
                  ['Temp Out / to CT (น้ำออกไป CT)', 'condTempOut'],
                  ['Saturated Cond Temp (อุณหภูมิควบแน่น)', 'saturatedCondTemp'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">
                        {label} (°{fieldUnits[key]})
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
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
            <CalculatorIcon className="w-4 h-4 text-[#4988C4]" />
            กรอกพารามิเตอร์การคำนวณ (INPUT DATA)
          </div>
          {CALCULATORS[item.category] ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CALCULATORS[item.category].fields.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
                    {t.calculator.fieldLabels[f.label] || f.label}
                    {f.unit && <span className="text-xs text-gray-400 font-normal"> ({f.unit})</span>}
                  </label>
                  <input
                    type="number"
                    value={calcForm[f.key] ?? ''}
                    onChange={(e) => setCalcForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:ring-2 focus:ring-[#4988C4] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">ไม่พบสูตรคำนวณสำหรับหมวดหมู่นี้</p>
          )}
        </Panel>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={resetCalc}
          className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-600 dark:text-[#C3D2E5] font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          <RefreshIcon className="w-4 h-4" />
          รีเซ็ตข้อมูล
        </button>
        <button
          type="button"
          onClick={handleCalc}
          className="flex-1 py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm shadow-md shadow-[#0F2854]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <CalculatorIcon className="w-5 h-5" />
          คำนวณประสิทธิภาพ
        </button>
      </div>
    </div>
  );
}
