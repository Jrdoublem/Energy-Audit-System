import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Combobox, Select } from '../../components/Dropdown.jsx';
import { DEFAULT_SETTINGS, fetchSettings } from '../../context/settingsStore.js';
import { useLang } from '../../context/languageStore.js';
import { saveMeasureItem, deleteMeasureItem } from '../../context/measuresStore.js';

function nextMeasureId() {
  return Date.now();
}

const MEASURES = {
  chiller: [
    'ล้าง Condenser',
    'ล้าง Evaporator',
    'เติมน้ำยาทำความเย็น',
    'ปรับ Setpoint น้ำเย็น',
    'ปรับแต่ง Refrigerant Charge',
    'ทำความสะอาดหอผึ่งน้ำ',
    'ติดตั้ง VFD สำหรับปั๊มน้ำเย็น',
    'เปลี่ยนเครื่องทำน้ำเย็นประสิทธิภาพสูง',
  ],
  compressor: [
    'ตรวจสอบระบบรั่วซึม',
    'เปลี่ยนไส้กรองอากาศ',
    'ปรับความดันใช้งาน',
    'ติดตั้ง VFD',
    'เปลี่ยน Compressor ประสิทธิภาพสูง',
  ],
  pump: [
    'ติดตั้ง VFD',
    'ปรับขนาดปั๊มให้เหมาะสม',
    'เปลี่ยนปั๊มประสิทธิภาพสูง',
    'ตรวจสอบและซ่อมแซมระบบท่อ',
  ],
  boiler: [
    'ตรวจสอบฉนวนกันความร้อน',
    'ปรับอัตราส่วนอากาศต่อเชื้อเพลิง',
    'ติดตั้งระบบ Heat Recovery',
    'ทำความสะอาด Boiler Tube',
    'เปลี่ยนหม้อไอน้ำประสิทธิภาพสูง',
  ],
  cooling: [
    'ทำความสะอาดหอผึ่งน้ำ',
    'ปรับปรุงระบบกระจายน้ำ',
    'เปลี่ยนพัดลมประสิทธิภาพสูง',
    'ติดตั้ง VFD สำหรับพัดลม',
    'เปลี่ยนหอผึ่งน้ำประสิทธิภาพสูง',
  ],
  electrical: [
    'ติดตั้ง Power Factor Correction',
    'เปลี่ยนหลอดไฟ LED',
    'ติดตั้ง Energy Management System',
    'ปรับปรุงระบบไฟฟ้าแสงสว่าง',
    'เปลี่ยนหม้อแปลงประสิทธิภาพสูง',
    'เปลี่ยนมอเตอร์ประสิทธิภาพสูง',
  ],
};

const ALL_MEASURES = [...new Set(Object.values(MEASURES).flat())];

// autoFrom maps to result property name
const MEASURE_FIELDS = {
  'เปลี่ยนเครื่องทำน้ำเย็นประสิทธิภาพสูง': [
    { key: 'powerCurrent',     label: 'กำลัง P_shaft ปัจจุบัน kW',             type: 'number', autoFrom: 'powerCF'    },
    { key: 'flowRate',         label: 'อัตราการไหล Q m³/min',                   type: 'number', autoFrom: 'coolingLoad' },
    { key: 'newModel',         label: 'รุ่นเครื่องใหม่',                          type: 'select', span: 2,
      options: ['York YVWA Series','Carrier 30XW Series','Trane CenTraVac','Daikin EWAD Series','McQuay WDC Series','Mitsubishi CAHV Series'] },
    { key: 'specificPowerNew', label: 'Specific Power เครื่องใหม่ kW/(m³/min)', type: 'number' },
    { key: 'equipmentAge',     label: 'อายุเครื่อง ปี',                          type: 'number' },
  ],
  'ล้าง Condenser': [
    { key: 'date',       label: 'วันที่ดำเนินการ',       type: 'date'   },
    { key: 'operator',   label: 'ผู้ดำเนินการ',           type: 'text'   },
    { key: 'tempBefore', label: 'อุณหภูมิน้ำก่อน (°C)',  type: 'number' },
    { key: 'tempAfter',  label: 'อุณหภูมิน้ำหลัง (°C)', type: 'number' },
    { key: 'cost',       label: 'ค่าใช้จ่าย (บาท)',       type: 'number' },
    { key: 'duration',   label: 'ระยะเวลา (ชม.)',          type: 'number' },
  ],
  'ล้าง Evaporator': [
    { key: 'date',      label: 'วันที่ดำเนินการ',     type: 'date'   },
    { key: 'operator',  label: 'ผู้ดำเนินการ',         type: 'text'   },
    { key: 'dtBefore',  label: 'ΔT ก่อน (°C)',         type: 'number' },
    { key: 'dtAfter',   label: 'ΔT หลัง (°C)',          type: 'number' },
    { key: 'cost',      label: 'ค่าใช้จ่าย (บาท)',     type: 'number' },
    { key: 'duration',  label: 'ระยะเวลา (ชม.)',        type: 'number' },
  ],
  'เติมน้ำยาทำความเย็น': [
    { key: 'date',        label: 'วันที่ดำเนินการ',       type: 'date'   },
    { key: 'operator',    label: 'ผู้ดำเนินการ',           type: 'text'   },
    { key: 'refrigerant', label: 'ชนิดน้ำยา',             type: 'text'   },
    { key: 'amount',      label: 'ปริมาณที่เติม (กก.)',   type: 'number' },
    { key: 'pressBefore', label: 'ความดันก่อน (Bar)',      type: 'number' },
    { key: 'pressAfter',  label: 'ความดันหลัง (Bar)',      type: 'number' },
  ],
  'ติดตั้ง VFD': [
    { key: 'date',       label: 'วันที่ติดตั้ง',           type: 'date'   },
    { key: 'operator',   label: 'ผู้รับผิดชอบ',            type: 'text'   },
    { key: 'brand',      label: 'ยี่ห้อ / รุ่น',           type: 'text'   },
    { key: 'power',      label: 'ขนาด (kW)',               type: 'number', autoFrom: 'powerCF' },
    { key: 'freqBefore', label: 'Hz ก่อน',                 type: 'number' },
    { key: 'freqAfter',  label: 'Hz หลัง',                  type: 'number' },
  ],
  'เปลี่ยน Compressor ประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังปัจจุบัน kW',       type: 'number', autoFrom: 'powerCF' },
    { key: 'pressure',      label: 'ความดันใช้งาน (Bar)',      type: 'number' },
    { key: 'specificPower', label: 'Specific Power ใหม่',      type: 'number' },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',           type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',     type: 'select', span: 2,
      options: ['Atlas Copco GA Series','Ingersoll Rand R Series','Kaeser SK Series','Boge S Series','Hitachi DSP Series'] },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',  type: 'text' },
    { key: 'pressure',      label: 'ความดันใช้งาน (Bar)', type: 'number' },
    { key: 'specificPower', label: 'Specific Power ใหม่', type: 'number' },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',      type: 'number' },
  ],
  'เปลี่ยนปั๊มประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังปัจจุบัน kW',        type: 'number', autoFrom: 'powerCF' },
    { key: 'flowRate',      label: 'อัตราการไหล m³/h',         type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['Grundfos TP Series','Wilo IL/IL-E Series','Xylem e-SH Series','Armstrong 4300 Series','Ebara 3LME Series'] },
    { key: 'head',          label: 'Head (m)',                  type: 'number' },
    { key: 'effCurrent',    label: 'ประสิทธิภาพปัจจุบัน (%)', type: 'number' },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
  ],
  'เปลี่ยนพัดลมประสิทธิภาพสูง': [
    { key: 'powerCurrent',   label: 'กำลังปัจจุบัน kW',        type: 'number', autoFrom: 'powerCF' },
    { key: 'flowRate',       label: 'อัตราการไหล m³/s',         type: 'number' },
    { key: 'newModel',       label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['ebm-papst A2E Series','Ziehl-Abegg FC Series','Nicotra Gebhardt AO Series','Twin City Fan Series'] },
    { key: 'staticPressure', label: 'Static Pressure (Pa)',      type: 'number' },
    { key: 'equipmentAge',   label: 'อายุเครื่อง ปี',            type: 'number' },
    { key: 'newBrand',       label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
  ],
  'เปลี่ยนหม้อไอน้ำประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังปัจจุบัน kW',         type: 'number', autoFrom: 'powerCF' },
    { key: 'steamCap',      label: 'ความสามารถผลิตไอน้ำ kg/h', type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['Miura LX Series','Cleaver-Brooks FLX Series','Bryan RV Series','Thermax IBR Series'] },
    { key: 'effCurrent',    label: 'ประสิทธิภาพปัจจุบัน (%)', type: 'number' },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
    { key: 'fuelType',      label: 'ชนิดเชื้อเพลิง',            type: 'text'   },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
  ],
  'เปลี่ยนหอผึ่งน้ำประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังพัดลมปัจจุบัน kW',   type: 'number', autoFrom: 'powerCF' },
    { key: 'flowRate',      label: 'อัตราการไหลน้ำ m³/h',      type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['BAC V/VTL Series','Evapco AT Series','SPX Cooling Series','Brentwood AccuPac Series'] },
    { key: 'tempIn',        label: 'อุณหภูมิน้ำเข้า (°C)',      type: 'number' },
    { key: 'tempOut',       label: 'อุณหภูมิน้ำออก (°C)',       type: 'number' },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
  ],
  'เปลี่ยนหม้อแปลงประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'ขนาด kVA ปัจจุบัน',        type: 'number', autoFrom: 'powerCF' },
    { key: 'loadFactor',    label: 'Load Factor (%)',            type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['ABB RESIBLOC Series','Schneider Trihal Series','Siemens GEAFOL Series','Hitachi HiT-T Series'] },
    { key: 'lossCurrent',   label: 'Losses ปัจจุบัน (W)',       type: 'number' },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
  ],
  'เปลี่ยนมอเตอร์ประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังปัจจุบัน kW',          type: 'number', autoFrom: 'powerCF' },
    { key: 'effCurrent',    label: 'ประสิทธิภาพปัจจุบัน (%)',  type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['WEG W22 IE3/IE4','ABB M2BAX IE3','Siemens SIMOTICS IE4','Baldor ECP Series','Nidec Motor IE4'] },
    { key: 'effNew',        label: 'ประสิทธิภาพเครื่องใหม่ (%)', type: 'number' },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
  ],
};

const DEFAULT_FIELDS = [
  { key: 'date',      label: 'วันที่ดำเนินการ',    type: 'date'   },
  { key: 'operator',  label: 'ผู้รับผิดชอบ',        type: 'text'   },
  { key: 'before',    label: 'ค่าก่อนดำเนินการ',   type: 'number' },
  { key: 'after',     label: 'ค่าหลังดำเนินการ',    type: 'number' },
  { key: 'cost',      label: 'ค่าใช้จ่าย (บาท)',    type: 'number' },
  { key: 'duration',  label: 'ระยะเวลา (วัน)',       type: 'number' },
];

/* ── icons ── */
function LightbulbIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 21h4M12 3a6 6 0 016 6c0 2.5-1.2 4.5-3 5.7V17H9v-2.3C7.2 13.5 6 11.5 6 9a6 6 0 016-6z" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function BoltIcon({ className }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="currentColor" viewBox="0 0 24 24">
      <path d="M13 2L3 14h7l-1 8 11-13h-7l1-7z" />
    </svg>
  );
}

// Emission factors used to convert energy saved into an estimated GHG
// reduction. Boiler measures represent fuel/thermal kWh (combustion —
// approximated with a fuel-oil factor); everything else represents
// electrical kWh (Thailand grid mix factor, same one SavingsCalculator uses).
const GRID_GHG_FACTOR_KG_PER_KWH = 0.5561;
const FUEL_GHG_FACTOR_KG_PER_KWH = 0.2664;

/* ── Evaluation section ── */
function EvalSection({ basePower, category, evalData, onChange, onSave }) {
  const { t } = useLang();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }));
  }, []);

  const pct     = parseFloat(evalData.percentReduction || 0);
  const hours   = parseFloat(evalData.operatingHours   || 0);
  const rate    = parseFloat(evalData.electricityRate   || 0);
  const invest  = parseFloat(evalData.investmentCost    || 0);
  const base    = parseFloat(basePower || 0);

  const energySaved = base * (pct / 100) * hours;
  const costSaved   = energySaved * rate;
  const ghgFactor   = category === 'boiler' ? FUEL_GHG_FACTOR_KG_PER_KWH : GRID_GHG_FACTOR_KG_PER_KWH;
  const ghgSaved    = (energySaved * ghgFactor) / 1000; // tonnes CO2e
  const payback     = invest > 0 && costSaved > 0 ? (invest / costSaved).toFixed(1) : null;
  const hasResult   = base > 0 && pct > 0 && hours > 0 && rate > 0;

  const evalFields = [
    { key: 'percentReduction', label: t.measures.pctReduction,       type: 'number', placeholder: t.measures.egPct },
    { key: 'operatingHours',   label: t.measures.operatingHoursPerYear, type: 'number', placeholder: t.measures.egHours },
    { key: 'electricityRate',  label: t.measures.elecRateUnit,       type: 'number', placeholder: t.measures.egRate },
    { key: 'investmentCost',   label: t.measures.investmentCost,     type: 'number', placeholder: t.measures.egInvestment },
  ];

  return (
    <div ref={ref} className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-white/8">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <BoltIcon className="w-5 h-5 text-amber-400" />
        <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.measures.evalPotential}</p>
      </div>

      {/* Eval inputs */}
      <div className="grid grid-cols-2 gap-3">
        {evalFields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-gray-500 dark:text-[#7E93AF] leading-tight">{f.label}</label>
            <input
              type={f.type}
              inputMode="numeric"
              min="0"
              value={evalData[f.key] ?? ''}
              placeholder={f.placeholder}
              onChange={(e) => onChange(f.key, e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4] focus:border-transparent"
            />
          </div>
        ))}
      </div>

      {/* Result card */}
      {hasResult && (
        <div className="flex flex-col gap-2">
          {/* Two main metric cards */}
          <div className="grid grid-cols-2 gap-2">
            {/* Energy saved */}
            <div className="rounded-2xl bg-[#0F2854] px-4 py-4 flex flex-col items-center gap-1">
              <BoltIcon className="w-6 h-6 text-amber-400 mb-1" />
              <p className="text-[11px] text-white/70 text-center leading-tight">{t.measures.energySaved}</p>
              <p className="text-xl font-extrabold text-white leading-tight">
                {energySaved.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[11px] text-white/60">{t.measures.kwhPerYear}</p>
            </div>
            {/* Cost saved */}
            <div className="rounded-2xl bg-[#16A34A] px-4 py-4 flex flex-col items-center gap-1">
              <svg className="w-6 h-6 text-white mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07C9.39 16.57 8 15.4 8 14c0-.55.45-1 1-1s1 .45 1 1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-1.66 0-3-1.34-3-3 0-1.4 1.39-2.57 3-2.93V6h2v1.07c1.61.36 3 1.53 3 2.93 0 .55-.45 1-1 1s-1-.45-1-1c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1h2c1.66 0 3 1.34 3 3 0 1.4-1.39 2.57-3 2.93z"/>
              </svg>
              <p className="text-[11px] text-white/70 text-center leading-tight">{t.measures.costSaved}</p>
              <p className="text-xl font-extrabold text-white leading-tight">
                {costSaved.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[11px] text-white/60">{t.measures.bahtPerYear}</p>
            </div>
          </div>

          {/* GHG row */}
          <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-[#C3D2E5]">{t.measures.ghgReduced}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-emerald-500">
                {ghgSaved.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">{t.measures.tco2ePerYear}</p>
            </div>
          </div>

          {/* Payback row */}
          <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-[#C3D2E5]">{t.measures.avgPaybackPeriod}</p>
              <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">{t.measures.paybackFromInvestment}</p>
            </div>
            <div className="text-right">
              {payback ? (
                <>
                  <p className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{payback}</p>
                  <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">{t.measures.years}</p>
                </>
              ) : (
                <p className="text-2xl font-extrabold text-gray-300 dark:text-white/20">-</p>
              )}
            </div>
          </div>

          {/* Formula reference */}
          <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] px-1">
            {t.measures.formulaRef}: {base.toFixed(2)} kW × {pct}% × {hours.toLocaleString('th-TH')} {t.measures.hoursPerYearShort} × {rate} {t.measures.bahtPerKwh}
          </p>
        </div>
      )}

      {/* หมายเหตุ */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-gray-500 dark:text-[#7E93AF]">{t.measures.note}</label>
        <textarea
          value={evalData.note ?? ''}
          onChange={(e) => onChange('note', e.target.value)}
          placeholder={t.measures.notePlaceholder}
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4] focus:border-transparent resize-none"
        />
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={() => onSave({ energySaved, costSaved, ghgSaved, payback })}
        className="w-full py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm transition-colors shadow-md"
      >
        {t.equipment.saveData}
      </button>
    </div>
  );
}

/* ── Form panel — slides in from right on mount ── */
function FormPanel({ activeMeasure, onChangeMeasure, measures, item, result, formData, onChange, onSave, initialEvalData, appDefaults }) {
  const { t } = useLang();
  const ref = useRef(null);
  const [showEval, setShowEval]   = useState(!!initialEvalData?.percentReduction);
  const [evalData, setEvalData]   = useState({
    percentReduction: '',
    operatingHours:   appDefaults.defaultOperatingHours,
    electricityRate:  appDefaults.defaultElectricityRate,
    investmentCost:   '0',
    note:             '',
    ...initialEvalData,
  });

  const fields = MEASURE_FIELDS[activeMeasure] || DEFAULT_FIELDS;

  // basePower for evaluation: use form's powerCurrent field, else result.powerCF
  const basePower = formData.powerCurrent || formData.power || result?.powerCF || '';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'transform 0.28s cubic-bezier(0.32,0,0.18,1)';
      el.style.transform  = 'translateX(0)';
    }));
  }, []);

  const handleEvalChange = (key, value) => setEvalData((p) => ({ ...p, [key]: value }));

  const handleSave = (derived) => {
    onSave({ formData, evalData: { ...evalData, ...derived } });
  };

  return (
    <div ref={ref} className="flex flex-col bg-[#DDF1F3] dark:bg-[#0B1B33] max-h-[72dvh] overflow-y-auto">
      {/* Measure selector */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <p className="text-xs font-bold text-[#0F2854]/50 dark:text-[#7E93AF] uppercase tracking-wider mb-2">{t.measures.selectMeasureTitle}</p>
        <Select
          value={activeMeasure}
          onChange={onChangeMeasure}
          options={measures.map((m) => ({ value: m, label: t.measures.names[m] || m }))}
          triggerClassName="flex items-center w-full bg-white dark:bg-[#111F35] border border-gray-200 dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] font-semibold pl-3.5 pr-3 py-2.5 rounded-2xl"
        />
      </div>

      {/* Form fields + evaluation */}
      <div className="bg-white dark:bg-[#111F35] rounded-t-3xl px-5 pt-5 pb-6 flex flex-col gap-4">
        <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.measures.measureForm}</p>

        <div className="grid grid-cols-2 gap-x-3 gap-y-0">
          {fields.map((f) => {
            const isAuto = !!f.autoFrom;
            return (
              <div key={f.key} className={`flex flex-col gap-1 ${f.span === 2 ? 'col-span-2' : ''}`}>
                <div className="flex items-end gap-1.5 min-h-[2.2rem]">
                  <label className="text-[11px] font-medium text-gray-500 dark:text-[#7E93AF] leading-tight">{t.measures.fieldLabels[f.label] || f.label}</label>
                  {isAuto && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 leading-none shrink-0 mt-0.5">
                      {t.measures.auto}
                    </span>
                  )}
                </div>
                {f.type === 'select' ? (
                  <Combobox
                    value={formData[f.key] ?? ''}
                    onChange={(v) => onChange(f.key, v)}
                    options={f.options || []}
                    placeholder={t.measures.pickOrTypeModel}
                    inputClassName="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4] focus:border-transparent"
                  />
                ) : (
                  <input
                    type={f.type}
                    inputMode={f.type === 'number' ? 'numeric' : undefined}
                    min={f.type === 'number' ? '0' : undefined}
                    value={formData[f.key] ?? ''}
                    readOnly={isAuto}
                    onChange={(e) => !isAuto && onChange(f.key, e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4] focus:border-transparent ${
                      isAuto
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 cursor-default'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ประเมินศักยภาพ button */}
        {!showEval && (
          <button
            type="button"
            onClick={() => setShowEval(true)}
            className="w-full py-3.5 rounded-2xl border-2 border-[#0F2854] dark:border-white/25 text-[#0F2854] dark:text-[#E7EEF7] font-bold text-sm hover:bg-[#0F2854] hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <BoltIcon className="w-4 h-4 text-amber-400" />
            {t.measures.evalPotential}
          </button>
        )}

        {/* Evaluation section — slides in */}
        {showEval && (
          <EvalSection
            basePower={basePower}
            category={item?.category}
            evalData={evalData}
            onChange={handleEvalChange}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
}

/* ── Main component ── */
function MeasureSelect({ item, result, onClose, inline = false, initialSavedMeasures }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [selected, setSelected]           = useState('');
  const [step, setStep]                   = useState('select');
  const [activeMeasure, setActiveMeasure] = useState('');
  const [formData, setFormData]           = useState({});
  const [savedMeasures, setSavedMeasures] = useState(initialSavedMeasures || []);
  const [appDefaults, setAppDefaults]     = useState(DEFAULT_SETTINGS);
  const activeMeasureId = useRef(null);

  useEffect(() => { fetchSettings().then(setAppDefaults).catch(() => {}); }, []);

  const grade    = t.common.grade[result?.grade] || '-';
  const measures = MEASURES[item?.category] || ALL_MEASURES;

  const FIELD_DEFAULTS = {
    specificPowerNew: '5.5',
  };

  const autoFill = (measureName) => {
    const fields = MEASURE_FIELDS[measureName] || DEFAULT_FIELDS;
    const auto   = {};
    fields.forEach((f) => {
      if (f.autoFrom && result?.[f.autoFrom] != null) {
        auto[f.key] = String(Number(result[f.autoFrom]).toFixed(2));
      } else if (FIELD_DEFAULTS[f.key] != null && auto[f.key] == null) {
        auto[f.key] = FIELD_DEFAULTS[f.key];
      }
    });
    return auto;
  };

  const handleAdd = () => {
    if (!selected) return;
    setActiveMeasure(selected);
    setFormData(autoFill(selected));
    setEditEvalData(null);
    setStep('form');
  };

  const handleBack = () => setStep('select');

  const handleChangeMeasure = (m) => {
    setActiveMeasure(m);
    setFormData(autoFill(m));
  };

  const handleFormChange = (key, value) => setFormData((p) => ({ ...p, [key]: value }));

  const handleSave = async ({ formData: fd, evalData }) => {
    const editingId = activeMeasureId.current;
    const newId = editingId || nextMeasureId();
    await saveMeasureItem({
      id:          newId,
      savedAt:     new Date().toISOString(),
      equipmentId: item?.id,
      category:    item?.category,
      factory:     item?.factory,
      grade:       result?.grade,
      measure:     activeMeasure,
      formData:    fd,
      evalData,
    });

    setSavedMeasures((prev) => {
      const idx = prev.findIndex((s) => s.id === editingId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx]  = { id: newId, name: activeMeasure, formData: fd, evalData };
        return next;
      }
      return [...prev, { id: newId, name: activeMeasure, formData: fd, evalData }];
    });
    activeMeasureId.current = null;
    setStep('select');
  };

  const [editEvalData, setEditEvalData] = useState(null);

  const handleEditSaved = (saved) => {
    activeMeasureId.current = saved.id;
    setActiveMeasure(saved.name);
    setFormData({ ...autoFill(saved.name), ...saved.formData });
    setEditEvalData(saved.evalData || null);
    setStep('form');
  };

  const handleDeleteSaved = (id) => {
    setSavedMeasures((prev) => prev.filter((s) => s.id !== id));
    deleteMeasureItem(id);
  };

  const card = (
    <div className={inline
      ? 'w-full h-full flex flex-col bg-white dark:bg-[#111F35] overflow-hidden'
      : 'relative w-full bg-white dark:bg-[#111F35] rounded-3xl shadow-2xl overflow-hidden'
    }>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/8 shrink-0">
        {step === 'form' ? (
          <button
            type="button"
            onClick={handleBack}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#7E93AF] transition-colors shrink-0"
          >
            <BackIcon />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#0F2854] flex items-center justify-center text-white shrink-0">
            <LightbulbIcon />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-[#0F2854] dark:text-[#E7EEF7] text-base leading-tight">
            {step === 'form' ? (t.measures.names[activeMeasure] || activeMeasure) : t.measures.selectMeasureTitle}
          </p>
          <p className="text-xs text-gray-400 dark:text-[#7E93AF] mt-0.5 truncate">
            {item?.id} ({t.measures.currentEfficiency}: {grade})
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#7E93AF] transition-colors shrink-0"
        >
          <XIcon />
        </button>
      </div>

      {/* ── Body ── */}
      {step === 'select' ? (
        <div className="px-5 pt-5 pb-6 flex flex-col gap-4">
          <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.measures.selectDesiredMeasure}</p>

          <div className="flex gap-2">
            <Select
              value={selected}
              onChange={setSelected}
              options={measures.map((m) => ({ value: m, label: t.measures.names[m] || m }))}
              placeholder={t.measures.selectDesiredMeasure}
              className="flex-1"
              triggerClassName="flex items-center w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-600 dark:text-[#8CA3C0] pl-3.5 pr-3 py-2.5 rounded-2xl"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selected}
              className="shrink-0 px-4 py-2.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] disabled:opacity-40 text-white text-sm font-bold transition-colors"
            >
              + {t.common.add}
            </button>
          </div>

          {/* Saved measures list */}
          {savedMeasures.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-[#7E93AF] uppercase tracking-wide">{t.measures.savedMeasures}</p>

              {savedMeasures.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl px-3.5 py-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex-1">{t.measures.names[s.name] || s.name}</p>
                  <button
                    type="button"
                    onClick={() => handleEditSaved(s)}
                    className="w-7 h-7 rounded-full bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center justify-center text-blue-400 dark:text-blue-400/70 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3.414a2 2 0 01.586-1.414z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSaved(s.id)}
                    className="w-7 h-7 rounded-full bg-white dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center text-red-300 dark:text-red-500/50 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4M3 7h18" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Report button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/reports', { state: { item, result, measures: savedMeasures } });
                }}
                className="w-full mt-1 py-3.5 rounded-2xl text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
                {t.measures.generateReport}
              </button>
            </div>
          )}
        </div>
      ) : (
        <FormPanel
          key={activeMeasure}
          activeMeasure={activeMeasure}
          onChangeMeasure={handleChangeMeasure}
          measures={measures}
          item={item}
          result={result}
          formData={formData}
          onChange={handleFormChange}
          onSave={handleSave}
          initialEvalData={editEvalData}
          appDefaults={appDefaults}
        />
      )}
    </div>
  );

  if (inline) return card;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center font-sans">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-sm overflow-hidden rounded-3xl max-h-[90vh] overflow-y-auto">
        {card}
      </div>
    </div>,
    document.body
  );
}

export default MeasureSelect;
