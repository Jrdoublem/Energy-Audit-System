import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../../components/ui';
import { Combobox, Select } from '../../components/Dropdown.jsx';
import { DEFAULT_SETTINGS, fetchSettings, getEmissionFactorValue } from '../../context/settingsStore.js';
import { useLang } from '../../context/languageStore.js';
import { saveMeasureItem, deleteMeasureItem } from '../../context/measuresStore.js';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardIcon,
  LightningIcon,
  TrashIcon,
} from '../../components/icons';

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

// Must match the fallback used in SavingsCalculator.jsx/FactoryDetail.jsx and
// the canonical admin default in settingsStore.js (TGO 2024 grid factor) —
// keep all four in sync if this value is ever recalibrated.
const FALLBACK_GRID_GHG_FACTOR_KG_PER_KWH = 0.5561;
const FALLBACK_FUEL_GHG_FACTOR_KG_PER_KWH = 0.2664;

/* ── General Measure Evaluation Section (สูตรคำนวณมาตรฐานวิศวกรรมพลังงาน) ── */
function EvalSection({ basePower, category, evalData, onChange, onSave, appDefaults, activeMeasureName }) {
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

  const measureCategory = evalData.category || 'Minor';
  const customName = evalData.customName ?? '';
  
  // Power inputs
  const currentKW = parseFloat(evalData.currentKW ?? (basePower || 10));
  const proposedKW = evalData.proposedKW !== undefined && evalData.proposedKW !== ''
    ? parseFloat(evalData.proposedKW)
    : (evalData.percentReduction ? currentKW * (1 - parseFloat(evalData.percentReduction) / 100) : currentKW * 0.85);

  const hours = parseFloat(evalData.operatingHours || appDefaults?.defaultOperatingHours || 8000);
  const rate = parseFloat(evalData.electricityRate || appDefaults?.defaultElectricityRate || 4.5);
  const invest = parseFloat(evalData.investmentCost || 0);

  // Standard calculations
  const kwSaved = currentKW - proposedKW;
  const isNotWorthIt = kwSaved <= 0;
  const kWhYear = kwSaved > 0 ? kwSaved * hours : 0;
  const bahtYear = kWhYear * rate;

  const ghgFactor = category === 'boiler'
    ? getEmissionFactorValue(appDefaults, 'fuel', FALLBACK_FUEL_GHG_FACTOR_KG_PER_KWH)
    : getEmissionFactorValue(appDefaults, 'electricity', FALLBACK_GRID_GHG_FACTOR_KG_PER_KWH);
  const ghgSaved = (kWhYear * ghgFactor) / 1000;
  const payback = invest > 0 && bahtYear > 0 ? (invest / bahtYear) : null;
  const pctReduction = currentKW > 0 ? ((kwSaved / currentKW) * 100) : 0;

  const handleCurrentKWChange = (val) => {
    onChange('currentKW', val);
  };

  const handleProposedKWChange = (val) => {
    onChange('proposedKW', val);
    const num = parseFloat(val);
    if (!Number.isNaN(num) && currentKW > 0) {
      const pct = ((currentKW - num) / currentKW) * 100;
      onChange('percentReduction', pct.toFixed(1));
    }
  };

  const handleSaveClick = () => {
    if (isNotWorthIt) {
      if (!window.confirm('ข้อมูลแสดงให้เห็นว่า "ไม่คุ้มค่า" (ผลประหยัดติดลบหรือเท่ากับ 0) คุณแน่ใจหรือไม่ว่าต้องการบันทึกมาตรการนี้?')) {
        return;
      }
    }
    onSave({
      energySaved: kWhYear,
      costSaved: bahtYear,
      ghgSaved,
      payback: payback ? payback.toFixed(2) : null,
      percentReduction: pctReduction.toFixed(1),
      currentKW,
      proposedKW,
      kwSaved,
      category: measureCategory,
      customName,
    });
  };

  return (
    <div ref={ref} className="flex flex-col gap-5 pt-5 border-t border-[#E4EBF6] dark:border-white/8 mt-1 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
          <LightningIcon className="w-4 h-4 text-amber-400" />
          การประเมินผลประหยัดพลังงาน & ความคุ้มค่า (ENERGY SAVINGS EVALUATION)
        </div>
      </div>

      {/* PARAMETER INPUTS */}
      <div className="space-y-4">
        {/* Category & Custom Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              ประเภทมาตรการ (Category Level)
            </label>
            <Select
              value={measureCategory}
              onChange={(v) => onChange('category', v)}
              options={[
                { value: 'Housekeeping', label: 'Housekeeping (No/Low Cost - ไม่ต้องลงทุน/ลงทุนต่ำ)' },
                { value: 'Minor', label: 'Minor (Medium Cost - ลงทุนปานกลาง)' },
                { value: 'Major', label: 'Major (High Cost - ลงทุนสูง/เปลี่ยนเครื่องจักร)' },
              ]}
              triggerClassName="flex items-center w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              ชื่อมาตรการ (ระบุเองได้ หรือใช้ค่าเริ่มต้น)
            </label>
            <input
              type="text"
              placeholder={activeMeasureName || 'ปรับปรุงประสิทธิภาพเครื่องจักร'}
              value={customName}
              onChange={(e) => onChange('customName', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>
        </div>

        {/* 4 Core Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              กำลังไฟฟ้าเดิม (kW)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              value={evalData.currentKW ?? (basePower || '')}
              placeholder="10"
              onChange={(e) => handleCurrentKWChange(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              กำลังไฟฟ้าใหม่ (kW)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              value={evalData.proposedKW ?? (proposedKW ? proposedKW.toFixed(2) : '')}
              placeholder="8.5"
              onChange={(e) => handleProposedKWChange(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              ชั่วโมงทำงาน (ชม./ปี)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={evalData.operatingHours ?? (appDefaults?.defaultOperatingHours || 8000)}
              placeholder="8000"
              onChange={(e) => onChange('operatingHours', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              อัตราค่าไฟฟ้า (บาท/หน่วย)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="0.1"
              value={evalData.electricityRate ?? (appDefaults?.defaultElectricityRate || 4.5)}
              placeholder="4.5"
              onChange={(e) => onChange('electricityRate', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>
        </div>

        {/* Investment Cost */}
        <div>
          <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
            เงินลงทุนมาตรการ (บาท)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={evalData.investmentCost ?? '0'}
            placeholder="50000"
            onChange={(e) => onChange('investmentCost', e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono font-bold text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
          />
        </div>
      </div>

      {/* REAL-TIME CALCULATION RESULTS */}
      <div className="pt-2">
        {isNotWorthIt ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400">ไม่คุ้มค่า (Not Cost-Effective)</p>
              <p className="text-xs text-rose-500/90 dark:text-rose-400/80 mt-0.5">
                กำลังไฟฟ้าหลังปรับปรุง ({proposedKW} kW) มีค่าสูงกว่าหรือเท่ากับกำลังไฟฟ้าเดิม ({currentKW} kW) ทำให้ไม่มีผลประหยัดพลังงาน
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 2 Main Hero Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#0F2854] px-5 py-4 flex flex-col items-center gap-1 text-center shadow-md">
                <LightningIcon className="w-6 h-6 text-amber-400 mb-0.5" />
                <p className="text-xs text-white/70 font-semibold">{t.measures.energySaved}</p>
                <p className="text-3xl font-extrabold text-white leading-none font-mono tracking-tight">
                  {kWhYear.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] text-white/60">kWh/ปี (ประหยัดได้ {pctReduction.toFixed(1)}%)</p>
              </div>

              <div className="rounded-2xl bg-emerald-600 px-5 py-4 flex flex-col items-center gap-1 text-center shadow-md">
                <svg className="w-6 h-6 text-white mb-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07C9.39 16.57 8 15.4 8 14c0-.55.45-1 1-1s1 .45 1 1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-1.66 0-3-1.34-3-3 0-1.4 1.39-2.57 3-2.93V6h2v1.07c1.61.36 3 1.53 3 2.93 0 .55-.45 1-1 1s-1-.45-1-1c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1h2c1.66 0 3 1.34 3 3 0 1.4-1.39 2.57-3 2.93z"/>
                </svg>
                <p className="text-xs text-white/70 font-semibold">{t.measures.costSaved}</p>
                <p className="text-3xl font-extrabold text-white leading-none font-mono tracking-tight">
                  {bahtYear.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] text-white/60">บาท/ปี</p>
              </div>
            </div>

            {/* GHG & Payback */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">{t.measures.ghgReduced}</p>
                  <p className="text-[10px] text-gray-400">Emission Factor: {ghgFactor}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-emerald-500 font-mono">
                    {ghgSaved.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">tCO₂e/ปี</p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">{t.measures.avgPaybackPeriod}</p>
                  <p className="text-[10px] text-gray-400">จากเงินลงทุน {invest.toLocaleString()} บาท</p>
                </div>
                <div className="text-right">
                  {payback ? (
                    <>
                      <p className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7] font-mono">
                        {payback.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-[#7E93AF]">ปี</p>
                    </>
                  ) : (
                    <p className="text-xl font-extrabold text-gray-300 dark:text-white/20">-</p>
                  )}
                </div>
              </div>
            </div>

            {/* Formula Reference */}
            <p className="text-[11px] text-gray-400 dark:text-[#7E93AF] px-1">
              สูตร: (({currentKW} − {proposedKW}) kW = {kwSaved.toFixed(2)} kW) × {hours.toLocaleString('th-TH')} ชม./ปี × {rate} บาท/หน่วย
            </p>
          </div>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">{t.measures.note}</label>
        <textarea
          value={evalData.note ?? ''}
          onChange={(e) => onChange('note', e.target.value)}
          placeholder={t.measures.notePlaceholder}
          rows={2}
          className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-gray-600 dark:text-[#8CA3C0] focus:outline-none focus:ring-2 focus:ring-[#4988C4] resize-none"
        />
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSaveClick}
        className="w-full py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
      >
        <CheckIcon className="w-5 h-5" />
        {t.equipment.saveData}
      </button>
    </div>
  );
}

/* ── MeasureSelect — full-page inline design ── */
function MeasureSelect({ item, result, onClose, inline = false, initialSavedMeasures }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [selected, setSelected]           = useState('');
  const [step, setStep]                   = useState('select');
  const [activeMeasure, setActiveMeasure] = useState('');
  const [formData, setFormData]           = useState({});
  const [savedMeasures, setSavedMeasures] = useState(initialSavedMeasures || []);
  const [appDefaults, setAppDefaults]     = useState(DEFAULT_SETTINGS);
  const [showEval, setShowEval]           = useState(false);
  const [evalData, setEvalData]           = useState({});
  const activeMeasureId = useRef(null);

  useEffect(() => { fetchSettings().then(setAppDefaults).catch(() => {}); }, []);

  const grade    = t.common.grade[result?.grade] || '-';
  const measures = MEASURES[item?.category] || ALL_MEASURES;

  const FIELD_DEFAULTS = { specificPowerNew: '5.5' };

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

  const [editEvalData, setEditEvalData] = useState(null);

  const handleAdd = () => {
    if (!selected) return;
    setActiveMeasure(selected);
    setFormData(autoFill(selected));
    setEditEvalData(null);
    setEvalData({
      category: 'Minor',
      customName: '',
      currentKW: result?.powerCF || item?.chillerPower || item?.electricalPower || 10,
      proposedKW: '',
      percentReduction: '15',
      operatingHours: appDefaults.defaultOperatingHours || 8000,
      electricityRate: appDefaults.defaultElectricityRate || 4.5,
      investmentCost: '0',
      note: '',
    });
    setShowEval(true);
    setStep('form');
  };

  const handleBack = () => setStep('select');

  const handleChangeMeasure = (m) => {
    setActiveMeasure(m);
    setFormData(autoFill(m));
  };

  const handleFormChange = (key, value) => setFormData((p) => ({ ...p, [key]: value }));

  const handleSave = async ({ formData: fd, evalData: ed }) => {
    const editingId = activeMeasureId.current;
    const newId = editingId || nextMeasureId();
    const finalName = ed.customName?.trim() ? ed.customName : activeMeasure;
    const taggedName = `[${ed.category || 'Minor'}] ${finalName}`;

    await saveMeasureItem({
      id: newId,
      savedAt: new Date().toISOString(),
      equipmentId: item?.id,
      category:    item?.category,
      factory:     item?.factory,
      grade:       result?.grade,
      measure:     taggedName,
      formData:    fd,
      evalData:    ed,
    });

    setSavedMeasures((prev) => {
      const idx = prev.findIndex((s) => s.id === editingId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx]  = { id: newId, name: taggedName, formData: fd, evalData: ed };
        return next;
      }
      return [...prev, { id: newId, name: taggedName, formData: fd, evalData: ed }];
    });
    activeMeasureId.current = null;
    setStep('select');
  };

  const handleEditSaved = (saved) => {
    activeMeasureId.current = saved.id;
    // Extract base measure name
    const rawName = saved.name.replace(/^\[.*?\]\s*/, '');
    setActiveMeasure(rawName);
    setFormData({ ...autoFill(rawName), ...saved.formData });
    setEditEvalData(saved.evalData || null);
    setEvalData(saved.evalData || {
      category: 'Minor',
      customName: rawName,
      currentKW: result?.powerCF || item?.chillerPower || 10,
      proposedKW: '',
      percentReduction: '15',
      operatingHours: appDefaults.defaultOperatingHours || 8000,
      electricityRate: appDefaults.defaultElectricityRate || 4.5,
      investmentCost: '0',
      note: '',
    });
    setShowEval(true);
    setStep('form');
  };

  const handleDeleteSaved = (id) => {
    setSavedMeasures((prev) => prev.filter((s) => s.id !== id));
    deleteMeasureItem(id);
  };

  const fields = MEASURE_FIELDS[activeMeasure] || DEFAULT_FIELDS;
  const basePower = formData.powerCurrent || formData.power || result?.powerCF || item?.chillerPower || item?.electricalPower || '';

  return (
    <div className="max-w-4xl mx-auto w-full py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">
            {step === 'form' ? (t.measures.names[activeMeasure] || activeMeasure) : t.measures.selectMeasureTitle}
          </h2>
          <p className="text-sm text-gray-400 dark:text-[#7E93AF] mt-0.5">
            อุปกรณ์ <span className="font-bold font-mono text-[#0F2854] dark:text-[#E7EEF7]">{item?.id}</span>
            {' · '}ประสิทธิภาพปัจจุบัน: <span className="font-bold">{grade}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {step === 'form' && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              ย้อนกลับ
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-gray-500 dark:text-[#C3D2E5] hover:bg-gray-50 dark:hover:bg-white/15 transition-colors shadow-sm"
            >
              ปิด
            </button>
          )}
        </div>
      </div>

      {step === 'select' ? (
        <>
          {/* MEASURE SELECT PANEL */}
          <Panel className="p-6 rounded-3xl space-y-5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
              <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
              {t.measures.selectDesiredMeasure}
            </div>

            {/* Measure grid selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {measures.map((m) => {
                const isSaved = savedMeasures.some((s) => s.name.includes(m));
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelected(m)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left text-sm font-bold transition-all ${
                      selected === m
                        ? 'bg-[#0F2854] text-white border-[#0F2854] shadow-md shadow-[#0F2854]/20'
                        : 'bg-[#F4F7FC] dark:bg-white/5 border-[#E4EBF6] dark:border-white/10 text-[#0F2854] dark:text-[#E7EEF7] hover:border-[#4988C4] hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isSaved ? 'bg-emerald-400' : selected === m ? 'bg-white/60' : 'bg-gray-300 dark:bg-white/20'
                    }`} />
                    <span className="flex-1 min-w-0 truncate">{t.measures.names[m] || m}</span>
                    {isSaved && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                        บันทึกแล้ว
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!selected}
              className="w-full py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t.common.add || 'เพิ่มมาตรการ'}: {selected ? (t.measures.names[selected] || selected) : '—'}
            </button>
          </Panel>

          {/* SAVED MEASURES LIST */}
          {savedMeasures.length > 0 && (
            <Panel className="p-6 rounded-3xl space-y-4 border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <CheckIcon className="w-4 h-4 text-emerald-500" />
                {t.measures.savedMeasures} ({savedMeasures.length} รายการ)
              </div>

              <div className="space-y-2">
                {savedMeasures.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 truncate">{s.name}</p>
                      {s.evalData?.energySaved && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          ประหยัดได้ {Number(s.evalData.energySaved).toLocaleString()} kWh/ปี (฿{Number(s.evalData.costSaved).toLocaleString()}/ปี)
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEditSaved(s)}
                      className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center justify-center text-blue-400 hover:text-blue-600 transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3.414a2 2 0 01.586-1.414z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSaved(s.id)}
                      className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors shrink-0"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  navigate('/reports', { state: { item, result, measures: savedMeasures } });
                }}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
                {t.measures.generateReport}
              </button>
            </Panel>
          )}
        </>
      ) : (
        <>
          {/* MEASURE FORM PANEL */}
          <Panel className="p-6 rounded-3xl space-y-5 border-t-4 border-t-[#4988C4]">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider mb-1">
              <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
              เลือกมาตรการ (CHANGE MEASURE)
            </div>

            <Select
              value={activeMeasure}
              onChange={handleChangeMeasure}
              options={measures.map((m) => ({ value: m, label: t.measures.names[m] || m }))}
              triggerClassName="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]"
            />

            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider pt-2 border-t border-[#E4EBF6] dark:border-white/8">
              <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
              {t.measures.measureForm}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => {
                const isAuto = !!f.autoFrom;
                return (
                  <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">
                        {t.measures.fieldLabels?.[f.label] || f.label}
                      </label>
                      {isAuto && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 leading-none shrink-0">
                          {t.measures.auto}
                        </span>
                      )}
                    </div>
                    {f.type === 'select' ? (
                      <Combobox
                        value={formData[f.key] ?? ''}
                        onChange={(v) => handleFormChange(f.key, v)}
                        options={f.options || []}
                        placeholder={t.measures.pickOrTypeModel}
                        inputClassName="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                      />
                    ) : (
                      <input
                        type={f.type}
                        inputMode={f.type === 'number' ? 'numeric' : undefined}
                        min={f.type === 'number' ? '0' : undefined}
                        value={formData[f.key] ?? ''}
                        readOnly={isAuto}
                        onChange={(e) => !isAuto && handleFormChange(f.key, e.target.value)}
                        className={`w-full px-4 py-3 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#4988C4] ${
                          isAuto
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 cursor-default'
                            : 'bg-[#F4F7FC] dark:bg-white/5 border-[#E4EBF6] dark:border-white/10 text-[#0F2854] dark:text-[#E7EEF7]'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* EVALUATION PANEL */}
          <Panel className="p-6 rounded-3xl space-y-5 border-t-4 border-t-amber-400">
            <EvalSection
              basePower={basePower}
              category={item?.category}
              evalData={editEvalData || evalData}
              activeMeasureName={activeMeasure}
              onChange={(key, value) => {
                if (editEvalData) {
                  setEditEvalData((p) => ({ ...p, [key]: value }));
                } else {
                  setEvalData((p) => ({ ...p, [key]: value }));
                }
              }}
              onSave={(derived) => handleSave({ formData, evalData: { ...(editEvalData || evalData), ...derived } })}
              appDefaults={appDefaults}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

export default MeasureSelect;
