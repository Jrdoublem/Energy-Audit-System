import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../../components/ui';
import { Combobox, Select } from '../../components/Dropdown.jsx';
import { DEFAULT_SETTINGS, fetchSettings, getEmissionFactorValue } from '../../context/settingsStore.js';
import { useLang } from '../../context/languageStore.js';
import { saveMeasureItem, deleteMeasureItem } from '../../context/measuresStore.js';
import { fetchAllCatalogItems } from '../../context/catalogStore.js';
import { fileToResizedDataUrl } from '../../utils/image.js';
import { uploadImage, deleteImage } from '../../context/storageStore.js';
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckIcon,
  ClipboardIcon,
  CloseIcon,
  LightningIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
} from '../../components/icons';
import { MEASURES, ALL_MEASURES } from './measuresData.js';
import ChillerLoadCurve from '../../components/ChillerLoadCurve';

function nextMeasureId() {
  return Date.now();
}

const MAX_MEASURE_IMAGES = 6;

const CUSTOM_SUGGESTIONS = [
  'ติดตั้งฉนวนกันความร้อนท่อและวาล์ว',
  'ปรับรอบการทำงานเครื่องจักร (VFD เพิ่มเติม)',
  'เปลี่ยนเป็นหลอดไฟ LED ประหยัดพลังงาน',
  'ติดตั้งระบบ Solar Rooftop ผลิตไฟฟ้า',
  'ติดตั้งระบบ IoT ตรวจวัดและควบคุมอัตโนมัติ',
  'ปรับตั้งค่า Setpoint อุณหภูมิและความดัน',
];

const MEASURE_FIELDS = {
  'เปลี่ยนเครื่องทำน้ำเย็นประสิทธิภาพสูง': [
    { key: 'ultraflowSonic',   label: 'อัตราการไหล Ultraflow Sonic (GPM)',   type: 'number', autoFrom: 'ultraflowSonic', isMeasured: true },
    { key: 'coolingLoad',      label: 'ภาระความเย็น (Cooling Load) TR',      type: 'number', autoFrom: 'coolingLoad', isMeasured: true },
    { key: 'kwPerTrCurrent',   label: 'ประสิทธิภาพเดิม (kW/TR)',              type: 'number', autoFrom: 'efficiency', isMeasured: true  },
    { key: 'powerCurrent',     label: 'กำลังไฟฟ้าเดิม (kW)',                   type: 'number', autoFrom: 'powerCF', isMeasured: true     },
    { key: 'newModel',         label: 'รุ่นเครื่องใหม่',                       type: 'select', span: 2,
      options: ['York YVWA Series','Carrier 30XW Series','Trane CenTraVac','Daikin EWAD Series','McQuay WDC Series','Mitsubishi CAHV Series'] },
    { key: 'kwPerTrNew',       label: 'ประสิทธิภาพเครื่องใหม่ (kW/TR)',        type: 'number', default: '0.55'         },
    { key: 'startDate',        label: 'วันที่เริ่มต้นดำเนินการ',                type: 'date'   },
    { key: 'endDate',          label: 'วันที่สิ้นสุดดำเนินการ',                 type: 'date'   },
    { key: 'days',             label: 'จำนวนวัน (วัน)',                        type: 'number' },
    { key: 'months',           label: 'ระยะเวลา (เดือน)',                      type: 'number' },
    { key: 'cost',             label: 'เงินลงทุนมาตรการ (THB)',                 type: 'number' },
    { key: 'costWithVat',      label: 'ค่าใช้จ่ายรวม VAT 7% (THB)',            type: 'number' },
    { key: 'equipmentAge',     label: 'อายุเครื่อง (ปี)',                      type: 'number' },
  ],
  'ล้าง Condenser': [
    { key: 'condApproach',     label: 'Approach Condenser ก่อนล้าง (°F) [Saturated Cond − Temp Out]', type: 'number', autoFrom: 'condApproach', isMeasured: true },
    { key: 'satCondTemp',      label: 'Saturated Cond Temp (°F) [อุณหภูมิควบแน่น]',                   type: 'number', autoFrom: 'saturatedCondTemp', isMeasured: true },
    { key: 'condTempOut',      label: 'Temp Out น้ำระบายความร้อน (°F)',                               type: 'number', autoFrom: 'condTempOut', isMeasured: true },
    { key: 'evapApproach',     label: 'Approach Evaporator (°F) [Temp Out − Saturated Evap]',         type: 'number', autoFrom: 'evapApproach', isMeasured: true },
    { key: 'startDate',        label: 'วันที่เริ่มต้นดำเนินการ',                                        type: 'date'   },
    { key: 'endDate',          label: 'วันที่สิ้นสุดดำเนินการ',                                         type: 'date'   },
    { key: 'days',             label: 'จำนวนวัน (วัน)',                                                type: 'number' },
    { key: 'months',           label: 'ระยะเวลา (เดือน)',                                              type: 'number' },
    { key: 'operator',         label: 'ผู้ดำเนินการ',                                                   type: 'text'   },
    { key: 'cost',             label: 'เงินลงทุนมาตรการ (THB)',                                         type: 'number' },
    { key: 'costWithVat',      label: 'ค่าใช้จ่ายรวม VAT 7% (THB)',                                    type: 'number' },
  ],
  'ล้าง Evaporator': [
    { key: 'evapApproach',     label: 'Approach Evaporator ก่อนล้าง (°F) [Temp Out − Saturated Evap]', type: 'number', autoFrom: 'evapApproach', isMeasured: true },
    { key: 'chillTempOut',     label: 'Temp Out น้ำเย็นจ่าย (°F)',                                     type: 'number', autoFrom: 'chillTempOut', isMeasured: true },
    { key: 'satEvapTemp',      label: 'Saturated Evap Temp (°F) [น้ำยาระเหย]',                        type: 'number', autoFrom: 'saturatedEvapTemp', isMeasured: true },
    { key: 'condApproach',     label: 'Approach Condenser (°F) [Saturated Cond − Temp Out]',          type: 'number', autoFrom: 'condApproach', isMeasured: true },
    { key: 'startDate',        label: 'วันที่เริ่มต้นดำเนินการ',                                        type: 'date'   },
    { key: 'endDate',          label: 'วันที่สิ้นสุดดำเนินการ',                                         type: 'date'   },
    { key: 'days',             label: 'จำนวนวัน (วัน)',                                                type: 'number' },
    { key: 'months',           label: 'ระยะเวลา (เดือน)',                                              type: 'number' },
    { key: 'operator',         label: 'ผู้ดำเนินการ',                                                   type: 'text'   },
    { key: 'cost',             label: 'เงินลงทุนมาตรการ (THB)',                                         type: 'number' },
    { key: 'costWithVat',      label: 'ค่าใช้จ่ายรวม VAT 7% (THB)',                                    type: 'number' },
  ],
  'เติมน้ำยาทำความเย็น': [
    { key: 'startDate',        label: 'วันที่เริ่มต้นดำเนินการ',                type: 'date'   },
    { key: 'endDate',          label: 'วันที่สิ้นสุดดำเนินการ',                 type: 'date'   },
    { key: 'days',             label: 'จำนวนวัน (วัน)',                        type: 'number' },
    { key: 'months',           label: 'ระยะเวลา (เดือน)',                      type: 'number' },
    { key: 'operator',         label: 'ผู้ดำเนินการ',                           type: 'text'   },
    { key: 'refrigerant',      label: 'ชนิดน้ำยา',                             type: 'text'   },
    { key: 'amount',           label: 'ปริมาณที่เติม (กก.)',                   type: 'number' },
    { key: 'pressBefore',      label: 'ความดันก่อน (Bar)',                      type: 'number' },
    { key: 'pressAfter',       label: 'ความดันหลัง (Bar)',                      type: 'number' },
    { key: 'cost',             label: 'เงินลงทุนมาตรการ (THB)',                 type: 'number' },
    { key: 'costWithVat',      label: 'ค่าใช้จ่ายรวม VAT 7% (THB)',            type: 'number' },
  ],
  'ติดตั้ง VFD': [
    { key: 'startDate',        label: 'วันที่เริ่มต้นดำเนินการ',                type: 'date'   },
    { key: 'endDate',          label: 'วันที่สิ้นสุดดำเนินการ',                 type: 'date'   },
    { key: 'days',             label: 'จำนวนวัน (วัน)',                        type: 'number' },
    { key: 'months',           label: 'ระยะเวลา (เดือน)',                      type: 'number' },
    { key: 'operator',         label: 'ผู้รับผิดชอบ',                            type: 'text'   },
    { key: 'brand',            label: 'ยี่ห้อ / รุ่น',                           type: 'text'   },
    { key: 'power',            label: 'ขนาด (kW)',                               type: 'number', autoFrom: 'powerCF', isMeasured: true },
    { key: 'freqBefore',       label: 'Hz ก่อน',                                 type: 'number' },
    { key: 'freqAfter',        label: 'Hz หลัง',                                  type: 'number' },
    { key: 'cost',             label: 'เงินลงทุนมาตรการ (THB)',                 type: 'number' },
    { key: 'costWithVat',      label: 'ค่าใช้จ่ายรวม VAT 7% (THB)',            type: 'number' },
  ],
  'เปลี่ยน Compressor ประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังปัจจุบัน kW',       type: 'number', autoFrom: 'powerCF', isMeasured: true },
    { key: 'pressure',      label: 'ความดันใช้งาน (Bar)',      type: 'number' },
    { key: 'specificPower', label: 'Specific Power ใหม่',      type: 'number' },
    { key: 'startDate',     label: 'วันที่เริ่มต้นดำเนินการ',   type: 'date'   },
    { key: 'endDate',       label: 'วันที่สิ้นสุดดำเนินการ',    type: 'date'   },
    { key: 'days',          label: 'จำนวนวัน (วัน)',           type: 'number' },
    { key: 'months',        label: 'ระยะเวลา (เดือน)',         type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',     type: 'select', span: 2,
      options: ['Atlas Copco GA Series','Ingersoll Rand R Series','Kaeser SK Series','Boge S Series','Hitachi DSP Series'] },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',  type: 'text' },
    { key: 'cost',          label: 'เงินลงทุนมาตรการ (THB)',    type: 'number' },
    { key: 'costWithVat',   label: 'ค่าใช้จ่ายรวม VAT 7% (THB)', type: 'number' },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',           type: 'number' },
  ],
  'เปลี่ยนปั๊มประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังปัจจุบัน kW',        type: 'number', autoFrom: 'powerCF', isMeasured: true },
    { key: 'flowRate',      label: 'อัตราการไหล m³/h',         type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['Grundfos TP Series','Wilo IL/IL-E Series','Xylem e-SH Series','Armstrong 4300 Series','Ebara 3LME Series'] },
    { key: 'head',          label: 'Head (m)',                  type: 'number' },
    { key: 'effCurrent',    label: 'ประสิทธิภาพปัจจุบัน (%)', type: 'number' },
    { key: 'startDate',     label: 'วันที่เริ่มต้นดำเนินการ',   type: 'date'   },
    { key: 'endDate',       label: 'วันที่สิ้นสุดดำเนินการ',    type: 'date'   },
    { key: 'days',          label: 'จำนวนวัน (วัน)',           type: 'number' },
    { key: 'months',        label: 'ระยะเวลา (เดือน)',         type: 'number' },
    { key: 'cost',          label: 'เงินลงทุนมาตรการ (THB)',    type: 'number' },
    { key: 'costWithVat',   label: 'ค่าใช้จ่ายรวม VAT 7% (THB)', type: 'number' },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
  ],
  'เปลี่ยนพัดลมประสิทธิภาพสูง': [
    { key: 'powerCurrent',   label: 'กำลังปัจจุบัน kW',        type: 'number', autoFrom: 'powerCF', isMeasured: true },
    { key: 'flowRate',       label: 'อัตราการไหล m³/s',         type: 'number' },
    { key: 'newModel',       label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['ebm-papst A2E Series','Ziehl-Abegg FC Series','Nicotra Gebhardt AO Series','Twin City Fan Series'] },
    { key: 'staticPressure', label: 'Static Pressure (Pa)',      type: 'number' },
    { key: 'startDate',      label: 'วันที่เริ่มต้นดำเนินการ',    type: 'date'   },
    { key: 'endDate',        label: 'วันที่สิ้นสุดดำเนินการ',     type: 'date'   },
    { key: 'days',           label: 'จำนวนวัน (วัน)',            type: 'number' },
    { key: 'months',         label: 'ระยะเวลา (เดือน)',          type: 'number' },
    { key: 'cost',           label: 'เงินลงทุนมาตรการ (THB)',     type: 'number' },
    { key: 'costWithVat',    label: 'ค่าใช้จ่ายรวม VAT 7% (THB)', type: 'number' },
    { key: 'newBrand',       label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
    { key: 'equipmentAge',   label: 'อายุเครื่อง ปี',            type: 'number' },
  ],
  'เปลี่ยนหม้อไอน้ำประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังปัจจุบัน kW',         type: 'number', autoFrom: 'powerCF', isMeasured: true },
    { key: 'steamCap',      label: 'ความสามารถผลิตไอน้ำ kg/h', type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['Miura LX Series','Cleaver-Brooks FLX Series','Bryan RV Series','Thermax IBR Series'] },
    { key: 'effCurrent',    label: 'ประสิทธิภาพปัจจุบัน (%)', type: 'number' },
    { key: 'startDate',     label: 'วันที่เริ่มต้นดำเนินการ',   type: 'date'   },
    { key: 'endDate',       label: 'วันที่สิ้นสุดดำเนินการ',    type: 'date'   },
    { key: 'days',          label: 'จำนวนวัน (วัน)',           type: 'number' },
    { key: 'months',        label: 'ระยะเวลา (เดือน)',         type: 'number' },
    { key: 'cost',          label: 'เงินลงทุนมาตรการ (THB)',    type: 'number' },
    { key: 'costWithVat',   label: 'ค่าใช้จ่ายรวม VAT 7% (THB)', type: 'number' },
    { key: 'fuelType',      label: 'ชนิดเชื้อเพลิง',            type: 'text'   },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
  ],
  'เปลี่ยนหอผึ่งน้ำประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังพัดลมปัจจุบัน kW',   type: 'number', autoFrom: 'powerCF', isMeasured: true },
    { key: 'flowRate',      label: 'อัตราการไหลน้ำ m³/h',      type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['BAC V/VTL Series','Evapco AT Series','SPX Cooling Series','Brentwood AccuPac Series'] },
    { key: 'tempIn',        label: 'อุณหภูมิน้ำเข้า (°C)',      type: 'number' },
    { key: 'tempOut',       label: 'อุณหภูมิน้ำออก (°C)',       type: 'number' },
    { key: 'startDate',     label: 'วันที่เริ่มต้นดำเนินการ',   type: 'date'   },
    { key: 'endDate',       label: 'วันที่สิ้นสุดดำเนินการ',    type: 'date'   },
    { key: 'days',          label: 'จำนวนวัน (วัน)',           type: 'number' },
    { key: 'months',        label: 'ระยะเวลา (เดือน)',         type: 'number' },
    { key: 'cost',          label: 'เงินลงทุนมาตรการ (THB)',    type: 'number' },
    { key: 'costWithVat',   label: 'ค่าใช้จ่ายรวม VAT 7% (THB)', type: 'number' },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
  ],
  'เปลี่ยนหม้อแปลงประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'ขนาด kVA ปัจจุบัน',        type: 'number', autoFrom: 'powerCF', isMeasured: true },
    { key: 'loadFactor',    label: 'ภาระการทำงานเฉลี่ย (%)',            type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['ABB RESIBLOC Series','Schneider Trihal Series','Siemens GEAFOL Series','Hitachi HiT-T Series'] },
    { key: 'lossCurrent',   label: 'Losses ปัจจุบัน (W)',       type: 'number' },
    { key: 'startDate',     label: 'วันที่เริ่มต้นดำเนินการ',   type: 'date'   },
    { key: 'endDate',       label: 'วันที่สิ้นสุดดำเนินการ',    type: 'date'   },
    { key: 'days',          label: 'จำนวนวัน (วัน)',           type: 'number' },
    { key: 'months',        label: 'ระยะเวลา (เดือน)',         type: 'number' },
    { key: 'cost',          label: 'เงินลงทุนมาตรการ (THB)',    type: 'number' },
    { key: 'costWithVat',   label: 'ค่าใช้จ่ายรวม VAT 7% (THB)', type: 'number' },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
  ],
  'เปลี่ยนมอเตอร์ประสิทธิภาพสูง': [
    { key: 'powerCurrent',  label: 'กำลังปัจจุบัน kW',          type: 'number', autoFrom: 'powerCF', isMeasured: true },
    { key: 'effCurrent',    label: 'ประสิทธิภาพปัจจุบัน (%)',  type: 'number' },
    { key: 'newModel',      label: 'รุ่นเครื่องใหม่',            type: 'select', span: 2,
      options: ['WEG W22 IE3/IE4','ABB M2BAX IE3','Siemens SIMOTICS IE4','Baldor ECP Series','Nidec Motor IE4'] },
    { key: 'effNew',        label: 'ประสิทธิภาพเครื่องใหม่ (%)', type: 'number' },
    { key: 'startDate',     label: 'วันที่เริ่มต้นดำเนินการ',   type: 'date'   },
    { key: 'endDate',       label: 'วันที่สิ้นสุดดำเนินการ',    type: 'date'   },
    { key: 'days',          label: 'จำนวนวัน (วัน)',           type: 'number' },
    { key: 'months',        label: 'ระยะเวลา (เดือน)',         type: 'number' },
    { key: 'cost',          label: 'เงินลงทุนมาตรการ (THB)',    type: 'number' },
    { key: 'costWithVat',   label: 'ค่าใช้จ่ายรวม VAT 7% (THB)', type: 'number' },
    { key: 'newBrand',      label: 'ยี่ห้อเครื่องใหม่',          type: 'text'   },
    { key: 'equipmentAge',  label: 'อายุเครื่อง ปี',            type: 'number' },
  ],
};

const DEFAULT_FIELDS = [
  { key: 'startDate',   label: 'วันที่เริ่มต้นดำเนินการ',  type: 'date'   },
  { key: 'endDate',     label: 'วันที่สิ้นสุดดำเนินการ',   type: 'date'   },
  { key: 'days',        label: 'จำนวนวัน (วัน)',          type: 'number' },
  { key: 'months',      label: 'ระยะเวลา (เดือน)',        type: 'number' },
  { key: 'operator',    label: 'ผู้รับผิดชอบ',            type: 'text'   },
  { key: 'before',      label: 'ค่าก่อนดำเนินการ',       type: 'number' },
  { key: 'after',       label: 'ค่าหลังดำเนินการ',        type: 'number' },
  { key: 'cost',        label: 'เงินลงทุนมาตรการ (THB)',  type: 'number' },
  { key: 'costWithVat', label: 'ค่าใช้จ่ายรวม VAT 7% (THB)', type: 'number' },
];

const FALLBACK_GRID_GHG_FACTOR_KG_PER_KWH = 0.5561;
const FALLBACK_FUEL_GHG_FACTOR_KG_PER_KWH = 0.2664;

/* ── General Measure Evaluation Section (สูตรคำนวณมาตรฐานวิศวกรรมพลังงาน) ── */
function EvalSection({
  basePower,
  category,
  result,
  evalData = {},
  onChange,
  onSave,
  onSaveAndNext,
  appDefaults,
  activeMeasureName,
  isSaving = false,
}) {
  const { t } = useLang();

  const isChiller = category === 'chiller' || result?.coolingLoad != null || activeMeasureName?.includes('เครื่องทำน้ำเย็น');

  // Core values
  const currentKW = parseFloat(evalData.currentKW ?? basePower ?? 0) || 0;
  const proposedKW = parseFloat(evalData.proposedKW ?? 0) || 0;
  const hours = parseFloat(evalData.operatingHours ?? appDefaults?.defaultOperatingHours ?? 8000) || 0;
  const rate = parseFloat(evalData.electricityRate ?? appDefaults?.defaultElectricityRate ?? 4.5) || 0;
  const invest = parseFloat(evalData.investmentCost ?? 0) || 0;
  const customName = evalData.customName ?? '';
  const selectedCat = evalData.category || 'Minor';

  // Condenser cleaning formula includes % load
  const isCondenserMeasure = activeMeasureName?.includes('Condenser');
  const loadFactorNum = parseFloat(evalData.loadFactor ?? result?.inputs?.load ?? result?.load ?? item?.loadFactor ?? '100') || 100;
  const loadMultiplier = isCondenserMeasure ? (loadFactorNum / 100) : 1;

  // Math
  const rawSaved = Math.max(0, currentKW - proposedKW);
  const kwSaved = rawSaved * loadMultiplier;
  const kWhYear = kwSaved * hours;
  const bahtYear = kWhYear * rate;
  const payback = bahtYear > 0 && invest > 0 ? invest / bahtYear : null;
  const pctReduction = currentKW > 0 ? (kwSaved / currentKW) * 100 : 0;

  // GHG
  const defaultFactor = category === 'boiler'
    ? FALLBACK_FUEL_GHG_FACTOR_KG_PER_KWH
    : FALLBACK_GRID_GHG_FACTOR_KG_PER_KWH;
  const ghgFactor = getEmissionFactorValue(appDefaults, category === 'boiler' ? 'fuel' : 'grid', defaultFactor);
  const ghgSaved = (kWhYear * ghgFactor) / 1000;

  // Helpers
  const handleCurrentKWChange = (val) => {
    onChange('currentKW', val);
    const c = parseFloat(val) || 0;
    const tr = parseFloat(evalData.coolingLoadTR ?? result?.coolingLoad) || 0;
    if (c > 0 && tr > 0) {
      onChange('kwPerTrCurrent', (c / tr).toFixed(3));
    }
    const pct = parseFloat(evalData.percentReduction) || 15;
    if (c > 0 && pct > 0 && !evalData.proposedKW) {
      const p = c * (1 - pct / 100);
      onChange('proposedKW', p.toFixed(2));
    }
  };

  const handleProposedKWChange = (val) => {
    onChange('proposedKW', val);
    const p = parseFloat(val) || 0;
    const tr = parseFloat(evalData.coolingLoadTR ?? result?.coolingLoad) || 0;
    if (p > 0 && tr > 0) {
      onChange('kwPerTrProposed', (p / tr).toFixed(3));
    }
    if (currentKW > 0 && p >= 0 && p < currentKW) {
      const pct = ((currentKW - p) / currentKW) * 100;
      onChange('percentReduction', pct.toFixed(1));
    }
  };

  // Chiller TR & kW/TR Two-Way Calculations
  const handleCoolingLoadChange = (val) => {
    onChange('coolingLoadTR', val);
    const tr = parseFloat(val) || 0;
    const effCur = parseFloat(evalData.kwPerTrCurrent ?? result?.efficiency) || 0;
    const effProp = parseFloat(evalData.kwPerTrProposed) || 0;
    if (tr > 0 && effCur > 0) {
      onChange('currentKW', (tr * effCur).toFixed(2));
    }
    if (tr > 0 && effProp > 0) {
      onChange('proposedKW', (tr * effProp).toFixed(2));
    }
  };

  const handleKwPerTrCurrentChange = (val) => {
    onChange('kwPerTrCurrent', val);
    const effCur = parseFloat(val) || 0;
    const tr = parseFloat(evalData.coolingLoadTR ?? result?.coolingLoad) || 0;
    if (effCur > 0 && tr > 0) {
      onChange('currentKW', (tr * effCur).toFixed(2));
    }
  };

  const handleKwPerTrProposedChange = (val) => {
    onChange('kwPerTrProposed', val);
    const effProp = parseFloat(val) || 0;
    const tr = parseFloat(evalData.coolingLoadTR ?? result?.coolingLoad) || 0;
    if (effProp > 0 && tr > 0) {
      onChange('proposedKW', (tr * effProp).toFixed(2));
    }
  };

  const isNotWorthIt = proposedKW > 0 && proposedKW >= currentKW;

  const derivedRecord = {
    currentKW,
    proposedKW,
    powerSaved: kwSaved,
    energySaved: kWhYear,
    costSaved: bahtYear,
    investmentCost: invest,
    operatingHours: hours,
    electricityRate: rate,
    payback,
    percentReduction: pctReduction,
    ghgSaved,
    emissionFactor: ghgFactor,
    isNotWorthIt,
    category: selectedCat,
    customName,
    coolingLoadTR: evalData.coolingLoadTR ?? result?.coolingLoad,
    kwPerTrCurrent: evalData.kwPerTrCurrent ?? result?.efficiency,
    kwPerTrProposed: evalData.kwPerTrProposed,
    status: evalData.status || 'ศักยภาพ',
    isImplemented: (evalData.status || 'ศักยภาพ') === 'ดำเนินการจริง',
  };

  const handleSaveClick = () => {
    onSave(derivedRecord);
  };

  const handleSaveAndNextClick = () => {
    if (onSaveAndNext) {
      onSaveAndNext(derivedRecord);
    } else {
      onSave(derivedRecord);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
          <LightningIcon className="w-4 h-4 text-amber-500" />
          {t.measures.evalSectionTitle}
        </div>
        <span className="text-[11px] font-bold text-[#4988C4] bg-[#EAF4FC] dark:bg-white/10 px-2.5 py-1 rounded-full">
          สูตรวิศวกรรมพลังงานมาตรฐาน
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-[#F4F7FC]/70 dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 space-y-4">
        {/* Measure Status + Category + Custom Name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              สถานะมาตรการ (Status)
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-[#111F35] rounded-2xl border border-[#E4EBF6] dark:border-white/10">
              <button
                type="button"
                onClick={() => onChange('status', 'ศักยภาพ')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  (evalData.status || 'ศักยภาพ') === 'ศักยภาพ'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-[#8CA3C0] hover:text-[#0F2854]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse" />
                ศักยภาพ
              </button>
              <button
                type="button"
                onClick={() => onChange('status', 'ดำเนินการจริง')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  evalData.status === 'ดำเนินการจริง'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-[#8CA3C0] hover:text-emerald-600'
                }`}
              >
                <CheckIcon className="w-3.5 h-3.5" />
                ดำเนินการจริง
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              ระดับมาตรการ (Measure Level)
            </label>
            <Select
              value={selectedCat}
              onChange={(val) => onChange('category', val)}
              options={[
                { value: 'Housekeeping', label: 'Housekeeping (No Cost)' },
                { value: 'Minor', label: 'Minor (Low Cost - ปรับแต่ง)' },
                { value: 'Major', label: 'Major (High Cost - เปลี่ยนเครื่อง)' },
              ]}
              triggerClassName="flex items-center w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#111F35] border border-[#E4EBF6] dark:border-white/10 text-xs sm:text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              ชื่อมาตรการ (Custom Name)
            </label>
            <input
              type="text"
              placeholder={activeMeasureName || 'ปรับปรุงประสิทธิภาพเครื่องจักร'}
              value={customName}
              onChange={(e) => onChange('customName', e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-[#111F35] border border-[#E4EBF6] dark:border-white/10 text-xs sm:text-sm text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>
        </div>

        {/* Chiller TR & kW/TR Two-Way Calculation Box */}
        {isChiller && (() => {
          const specTR = parseFloat(item?.coolingCapacity ?? item?.capacityTR) || 0;
          const specKW = parseFloat(item?.chillerPower ?? item?.electricalPower ?? item?.power) || 0;
          const specKwPerTr = specTR > 0 && specKW > 0 ? specKW / specTR : parseFloat(item?.chillerEfficiency ?? item?.specificPower) || 0.55;

          const trVal = parseFloat(evalData.coolingLoadTR ?? result?.coolingLoad) || 0;
          const pctCoolingLoad = specTR > 0 && trVal > 0 ? (trVal / specTR) * 100 : null;
          const pctElectricalLoad = specKW > 0 && currentKW > 0 ? (currentKW / specKW) * 100 : null;

          return (
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <LightningIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  สูตรคำนวณประสิทธิภาพ Chiller (kW & TR):
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-500/30">
                  กำลังไฟฟ้า (kW) = TR × (kW/TR)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-[#C3D2E5]">
                      ภาระความเย็น (TR)
                    </label>
                    {pctCoolingLoad != null && (
                      <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                        pctCoolingLoad < 40
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                          : pctCoolingLoad <= 85
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                      }`}>
                        {pctCoolingLoad.toFixed(1)}% Load
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="any"
                    value={evalData.coolingLoadTR ?? (result?.coolingLoad ? Number(result.coolingLoad).toFixed(1) : '')}
                    placeholder="100"
                    onChange={(e) => handleCoolingLoadChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111F35] border border-blue-200 dark:border-blue-500/30 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {specTR > 0 && (
                    <p className="text-[10px] text-gray-400 dark:text-[#7E93AF] mt-1 font-mono">
                      พิกัดเครื่อง: {specTR} TR {pctCoolingLoad != null ? `(โหลด ${pctCoolingLoad.toFixed(0)}%)` : ''}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-[#C3D2E5]">
                      ประสิทธิภาพเดิม (kW/TR)
                    </label>
                    {specKwPerTr > 0 && (
                      <span className="text-[10px] text-gray-400 font-mono">
                        พิกัด {specKwPerTr.toFixed(3)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="0.001"
                    value={evalData.kwPerTrCurrent ?? (result?.efficiency ? Number(result.efficiency).toFixed(3) : '')}
                    placeholder="0.85"
                    onChange={(e) => handleKwPerTrCurrentChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111F35] border border-blue-200 dark:border-blue-500/30 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-[#7E93AF] mt-1 font-mono">
                    กำลังไฟเดิม: {currentKW.toFixed(1)} kW
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-[#C3D2E5]">
                      ประสิทธิภาพใหม่ (kW/TR)
                    </label>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      เป้าหมาย
                    </span>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="0.001"
                    value={evalData.kwPerTrProposed ?? '0.55'}
                    placeholder="0.55"
                    onChange={(e) => handleKwPerTrProposedChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#111F35] border border-blue-200 dark:border-blue-500/30 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono font-bold">
                    กำลังไฟใหม่: {proposedKW.toFixed(1)} kW
                  </p>
                </div>
              </div>

              {/* Chiller Status Breakdown Bar */}
              <div className="text-xs text-blue-950 dark:text-blue-200 bg-white/90 dark:bg-white/5 p-3 rounded-xl border border-blue-100 dark:border-white/5 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2">
                    <span>💡 ผลลัพธ์:</span>
                    <strong>{currentKW.toFixed(1)} kW</strong> &rarr; <strong>{proposedKW.toFixed(1)} kW</strong>
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    ประหยัดได้: {kwSaved.toFixed(2)} kW ({pctReduction.toFixed(1)}%)
                  </span>
                </div>
                {(pctCoolingLoad != null || pctElectricalLoad != null) && (
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] pt-1 border-t border-blue-100 dark:border-white/5 text-gray-500 dark:text-[#8CA3C0] font-mono">
                    {pctCoolingLoad != null && (
                      <span>❄️ Cooling Load: <strong className="text-blue-600 dark:text-blue-400">{pctCoolingLoad.toFixed(1)}%</strong> ({trVal.toFixed(1)}/{specTR} TR)</span>
                    )}
                    {pctElectricalLoad != null && (
                      <span>⚡ Elec Load: <strong className="text-amber-600 dark:text-amber-400">{pctElectricalLoad.toFixed(1)}%</strong> ({currentKW.toFixed(1)}/{specKW} kW)</span>
                    )}
                    <span>{pctCoolingLoad < 40 ? '🔴 ภาระต่ำกินไฟสูง' : pctCoolingLoad <= 85 ? '🟢 ช่วงประหยัดสูงสุด (Optimal)' : '🔵 ภาระเต็มพิกัด'}</span>
                  </div>
                )}
              </div>

              {/* Interactive Chiller Part-Load Performance Curve */}
              <div className="pt-2">
                <ChillerLoadCurve
                  compact
                  title="กราฟสมรรถนะเปรียบเทียบ ก่อน - หลัง ปรับปรุง (CHILLER LOAD CURVE)"
                  subtitle="แสดงตำแหน่งจุดทำงานเดิมเทียบกับเป้าหมายประสิทธิภาพใหม่บนเส้นโค้งสมรรถนะ"
                  specTR={specTR}
                  specKW={specKW}
                  specKwPerTr={specKwPerTr}
                  coolingLoadTR={trVal}
                  currentKW={currentKW}
                  kwPerTrCurrent={evalData.kwPerTrCurrent ?? result?.efficiency}
                  kwPerTrProposed={evalData.kwPerTrProposed ?? '0.55'}
                  showProposed={true}
                />
              </div>
            </div>
          );
        })()}

        {/* 4 Core Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">
                กำลังไฟฟ้าเดิม (kW)
              </label>
              {isChiller && (() => {
                const specKW = parseFloat(item?.chillerPower ?? item?.electricalPower ?? item?.power) || 0;
                const pctElec = specKW > 0 && currentKW > 0 ? (currentKW / specKW) * 100 : null;
                return pctElec != null ? (
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 rounded">
                    {pctElec.toFixed(0)}% โหลด
                  </span>
                ) : null;
              })()}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              value={evalData.currentKW ?? (basePower || '')}
              placeholder="KW"
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
              placeholder="KW"
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
              placeholder="HR"
              onChange={(e) => onChange('operatingHours', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0] mb-1.5 block">
              อัตราค่าไฟฟ้า (บาท/kWh)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="0.01"
              value={evalData.electricityRate ?? (appDefaults?.defaultElectricityRate || 4.5)}
              placeholder="kWh"
              onChange={(e) => onChange('electricityRate', e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-mono text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
          </div>
        </div>

        {/* Investment Cost */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">
              เงินลงทุนมาตรการ (THB)
            </label>
            {invest > 0 && (
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                รวม VAT 7%: {(invest * 1.07).toLocaleString('th-TH', { maximumFractionDigits: 0 })} THB
              </span>
            )}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={evalData.investmentCost ?? '0'}
            placeholder="THB"
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
            {/* 3 Summary Cards with Big Icon on Right and Numbers on Left */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: พลังงานไฟฟ้าที่ประหยัดได้ (kWh/ปี) */}
              <div className="rounded-2xl bg-gradient-to-br from-[#0F2854] to-[#1C4D8D] p-4 text-white shadow-md flex items-center justify-between gap-3">
                <div className="text-left min-w-0">
                  <p className="text-xs text-white/70 font-semibold truncate">พลังงานที่ประหยัดได้</p>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-tight mt-0.5 truncate">
                    {kWhYear.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] text-amber-300 font-mono font-medium truncate">
                    kWh/ปี (ลดได้ {kwSaved.toFixed(2)} kW)
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-amber-300 shrink-0">
                  <LightningIcon className="w-7 h-7" />
                </div>
              </div>

              {/* Card 2: สัดส่วนการประหยัดพลังงาน (% Saving) */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-md flex items-center justify-between gap-3">
                <div className="text-left min-w-0">
                  <p className="text-xs text-white/70 font-semibold truncate">ร้อยละการประหยัด</p>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-tight mt-0.5 truncate">
                    {pctReduction.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-emerald-100 font-mono font-medium truncate">
                    จาก {currentKW.toFixed(1)} &rarr; {proposedKW.toFixed(1)} kW
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-emerald-200 shrink-0">
                  <SparkleIcon className="w-7 h-7" />
                </div>
              </div>

              {/* Card 3: ผลประโยชน์ทางการเงิน & คืนทุน (บาท/ปี) */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 p-4 text-white shadow-md flex items-center justify-between gap-3">
                <div className="text-left min-w-0">
                  <p className="text-xs text-white/70 font-semibold truncate">ผลประโยชน์ทางการเงิน</p>
                  <p className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-tight mt-0.5 truncate">
                    ฿{bahtYear.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] text-blue-200 font-mono font-medium truncate">
                    บาท/ปี {payback ? `· คืนทุน ${payback.toFixed(2)} ปี` : ''}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-blue-200 shrink-0">
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07C9.39 16.57 8 15.4 8 14c0-.55.45-1 1-1s1 .45 1 1c0 .55.45 1 1 1h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-1.66 0-3-1.34-3-3 0-1.4 1.39-2.57 3-2.93V6h2v1.07c1.61.36 3 1.53 3 2.93 0 .55-.45 1-1 1s-1-.45-1-1c0-.55-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1h2c1.66 0 3 1.34 3 3 0 1.4-1.39 2.57-3 2.93z"/>
                  </svg>
                </div>
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

      {/* Save Button(s) */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {onSaveAndNext && (
          <button
            type="button"
            onClick={handleSaveAndNextClick}
            disabled={isSaving}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <SparkleIcon className="w-4 h-4 text-amber-300" />
            {isSaving ? 'กำลังบันทึก...' : 'บันทึก & ประเมินมาตรการถัดไป →'}
          </button>
        )}
        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isSaving}
          className={`${onSaveAndNext ? 'flex-1' : 'w-full'} py-3.5 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-sm transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-60`}
        >
          <CheckIcon className="w-5 h-5" />
          {isSaving ? 'กำลังบันทึกข้อมูล...' : t.equipment.saveData}
        </button>
      </div>
    </div>
  );
}

/* ── MeasureSelect — Multi-Select, Custom Measures & Post-Improvement Photos ── */
function MeasureSelect({ item, result, onClose, initialSavedMeasures, initialMeasure }) {
  const { t } = useLang();
  const navigate = useNavigate();

  const autoFill = (measureName) => {
    const fields = MEASURE_FIELDS[measureName] || DEFAULT_FIELDS;
    const auto = {};
    const linkedPower = result?.powerCF ?? result?.powerBaseline ?? result?.inputs?.pInput ?? item?.chillerPower ?? item?.electricalPower ?? item?.power ?? '';

    fields.forEach((f) => {
      if (f.autoFrom && result?.[f.autoFrom] != null) {
        auto[f.key] = String(typeof result[f.autoFrom] === 'number' ? Number(result[f.autoFrom]).toFixed(2) : result[f.autoFrom]);
      } else if ((f.key === 'powerCurrent' || f.key === 'power') && linkedPower) {
        auto[f.key] = String(Number(linkedPower).toFixed(2));
      } else if (f.key === 'condApproach' && result?.condApproach != null) {
        auto[f.key] = String(Number(result.condApproach).toFixed(1));
      } else if (f.key === 'evapApproach' && result?.evapApproach != null) {
        auto[f.key] = String(Number(result.evapApproach).toFixed(1));
      } else if (f.key === 'chillTempOut' && (result?.chillTempOut != null || result?.inputs?.chillTempOut != null)) {
        auto[f.key] = String(Number(result?.chillTempOut ?? result?.inputs?.chillTempOut).toFixed(1));
      } else if (f.key === 'satEvapTemp' && (result?.saturatedEvapTemp != null || result?.inputs?.saturatedEvapTemp != null)) {
        auto[f.key] = String(Number(result?.saturatedEvapTemp ?? result?.inputs?.saturatedEvapTemp).toFixed(1));
      } else if (f.key === 'condTempOut' && (result?.condTempOut != null || result?.inputs?.condTempOut != null)) {
        auto[f.key] = String(Number(result?.condTempOut ?? result?.inputs?.condTempOut).toFixed(1));
      } else if (f.key === 'satCondTemp' && (result?.saturatedCondTemp != null || result?.inputs?.saturatedCondTemp != null)) {
        auto[f.key] = String(Number(result?.saturatedCondTemp ?? result?.inputs?.saturatedCondTemp).toFixed(1));
      } else if (FIELD_DEFAULTS[f.key] != null && auto[f.key] == null) {
        auto[f.key] = FIELD_DEFAULTS[f.key];
      }
    });

    if (!auto.startDate) {
      const today = new Date().toISOString().split('T')[0];
      auto.startDate = today;
      auto.endDate = today;
      auto.days = '1';
      auto.months = '0.03';
    }

    return auto;
  };

  const buildInitialEvalData = (measureName) => {
    const linkedPower = result?.powerCF ?? result?.powerBaseline ?? result?.inputs?.pInput ?? item?.chillerPower ?? item?.electricalPower ?? item?.power ?? '';
    const currentKW = linkedPower ? String(Number(linkedPower).toFixed(2)) : '10';
    const cNum = parseFloat(currentKW) || 10;

    let pct = 15;
    if (measureName?.includes('ล้าง Condenser') || measureName?.includes('ล้าง Evaporator')) {
      pct = 5;
    } else if (measureName?.includes('เปลี่ยนเครื่องทำน้ำเย็น') || measureName?.includes('ประสิทธิภาพสูง')) {
      pct = 25;
    } else if (measureName?.includes('VFD')) {
      pct = 20;
    }

    const proposedKW = (cNum * (1 - pct / 100)).toFixed(2);

    return {
      status: 'ศักยภาพ',
      category: pct <= 10 ? 'Minor' : pct > 20 ? 'Major' : 'Minor',
      customName: measureName || '',
      currentKW,
      proposedKW,
      percentReduction: String(pct),
      operatingHours: DEFAULT_SETTINGS.defaultOperatingHours || 8000,
      electricityRate: DEFAULT_SETTINGS.defaultElectricityRate || 4.5,
      investmentCost: '0',
      note: '',
      coolingLoadTR: result?.coolingLoad != null ? Number(result.coolingLoad).toFixed(1) : undefined,
      kwPerTrCurrent: result?.efficiency != null ? Number(result.efficiency).toFixed(3) : undefined,
      kwPerTrProposed: result?.efficiency != null ? (Number(result.efficiency) * (1 - pct / 100)).toFixed(3) : '0.55',
    };
  };

  // State
  const [selectedMeasures, setSelectedMeasures] = useState(() => (initialMeasure ? [initialMeasure] : []));
  const [step, setStep] = useState(initialMeasure ? 'form' : 'select');
  const [activeMeasure, setActiveMeasure] = useState(initialMeasure || '');
  const [formData, setFormData] = useState(() => (initialMeasure ? autoFill(initialMeasure) : {}));
  const [savedMeasures, setSavedMeasures] = useState(initialSavedMeasures || []);
  const [appDefaults, setAppDefaults] = useState(DEFAULT_SETTINGS);
  const [evalData, setEvalData] = useState(() => (initialMeasure ? buildInitialEvalData(initialMeasure) : {}));
  const activeMeasureId = useRef(null);

  // Custom Measure State
  const [customList, setCustomList] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [customSuccessNotice, setCustomSuccessNotice] = useState('');

  // Post-Improvement Photos State
  const [afterImages, setAfterImages] = useState([]);
  const [afterImageUploading, setAfterImageUploading] = useState(false);
  const [afterImageError, setAfterImageError] = useState('');
  const [savingRecord, setSavingRecord] = useState(false);

  // Navigation & Catalog State
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');

  useEffect(() => {
    fetchSettings().then(setAppDefaults).catch(() => {});
    fetchAllCatalogItems().then(setCatalogItems).catch(() => setCatalogItems([]));
  }, []);

  const matchingCatalog = useMemo(() => {
    if (!item?.category) return catalogItems;
    return catalogItems.filter((c) => c.catId === item.category);
  }, [catalogItems, item?.category]);

  const isReplacementMeasure = activeMeasure.startsWith('เปลี่ยน') || activeMeasure.includes('เปลี่ยน');

  const applyCatalogModel = (catId) => {
    setSelectedCatalogId(catId);
    if (!catId) return;
    const cat = catalogItems.find((c) => c.id === catId);
    if (!cat) return;

    const fullModelName = `${cat.brand} ${cat.model}`.trim();
    const specificPowerVal = cat.specificPower ? String(cat.specificPower) : '';
    const costVal = cat.costEst ? String(cat.costEst) : '';

    setFormData((p) => ({
      ...p,
      newModel: fullModelName,
      newBrand: cat.brand || '',
      kwPerTrNew: specificPowerVal || p.kwPerTrNew || '0.55',
      cost: costVal || p.cost,
    }));

    const isChiller = item?.category === 'chiller' || activeMeasure.includes('เครื่องทำน้ำเย็น');
    const tr = parseFloat(evalData.coolingLoadTR ?? result?.coolingLoad ?? item?.coolingCapacity) || 0;
    const effNew = parseFloat(specificPowerVal) || (isChiller ? 0.55 : 0);

    const updateEval = (prev) => {
      const next = { ...prev };
      if (costVal) next.investmentCost = costVal;
      if (isChiller && effNew > 0) {
        next.kwPerTrProposed = String(effNew);
        if (tr > 0) {
          next.proposedKW = (tr * effNew).toFixed(2);
        }
      } else if (effNew > 0 && item?.category === 'air_compressor') {
        next.proposedKW = String(effNew);
      }
      return next;
    };

    if (editEvalData) {
      setEditEvalData(updateEval);
    } else {
      setEvalData(updateEval);
    }
  };

  const grade = t.common.grade[result?.grade] || '-';
  const categoryMeasures = MEASURES[item?.category] || ALL_MEASURES;
  const allAvailableMeasures = [...new Set([...categoryMeasures, ...customList])];

  const [editEvalData, setEditEvalData] = useState(null);

  // Toggle selection for a measure (supports multi-selection)
  const toggleMeasureSelect = (m) => {
    setSelectedMeasures((prev) => {
      if (prev.includes(m)) {
        return prev.filter((item) => item !== m);
      }
      return [...prev, m];
    });
  };

  // Select all / Clear selection
  const handleSelectAll = () => {
    setSelectedMeasures([...allAvailableMeasures]);
  };

  const handleClearSelection = () => {
    setSelectedMeasures([]);
  };

  // Add custom measure from user input or quick suggestion
  const handleAddCustomMeasure = (presetName) => {
    const raw = typeof presetName === 'string' ? presetName : customInput;
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (!customList.includes(trimmed) && !categoryMeasures.includes(trimmed)) {
      setCustomList((prev) => [...prev, trimmed]);
    }
    if (!selectedMeasures.includes(trimmed)) {
      setSelectedMeasures((prev) => [...prev, trimmed]);
    }
    setCustomInput('');
    setCustomSuccessNotice(`เพิ่มมาตรการ "${trimmed}" และเลือกให้เรียบร้อยแล้ว`);
    setTimeout(() => setCustomSuccessNotice(''), 3500);
  };

  // Begin form entry for a specific measure
  const openMeasureForm = (measureName) => {
    setActiveMeasure(measureName);
    setSelectedCatalogId('');
    setFormData(autoFill(measureName));
    setEditEvalData(null);
    setAfterImages([]);
    setAfterImageError('');
    setEvalData(buildInitialEvalData(measureName));
    setStep('form');
  };

  // Handle multi-measure evaluate button click
  const handleStartEvaluate = () => {
    if (selectedMeasures.length === 0) return;
    const firstUnsaved = selectedMeasures.find((m) => !savedMeasures.some((s) => s.name.includes(m))) || selectedMeasures[0];
    openMeasureForm(firstUnsaved);
  };

  const handleBack = () => setStep('select');

  const handleChangeMeasure = (m) => {
    setActiveMeasure(m);
    setSelectedCatalogId('');
    setFormData(autoFill(m));
    setEditEvalData(null);
    setEvalData(buildInitialEvalData(m));
  };

  const handleFormChange = (key, value) => {
    setFormData((p) => {
      const updated = { ...p, [key]: value };

      const start = key === 'startDate' ? value : updated.startDate;
      const end = key === 'endDate' ? value : updated.endDate;
      if (start && end) {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diffMs = d2.getTime() - d1.getTime();
        if (!Number.isNaN(diffMs)) {
          const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
          updated.days = String(diffDays);
          updated.months = (diffDays / 30).toFixed(1);
        }
      }

      if (key === 'days') {
        const dNum = parseInt(value, 10);
        if (!Number.isNaN(dNum) && dNum > 0) {
          updated.months = (dNum / 30).toFixed(1);
          if (updated.startDate) {
            const d1 = new Date(updated.startDate);
            d1.setDate(d1.getDate() + dNum - 1);
            updated.endDate = d1.toISOString().split('T')[0];
          }
        }
      }

      if (key === 'months') {
        const mNum = parseFloat(value);
        if (!Number.isNaN(mNum) && mNum > 0) {
          const dNum = Math.max(1, Math.round(mNum * 30));
          updated.days = String(dNum);
          if (updated.startDate) {
            const d1 = new Date(updated.startDate);
            d1.setDate(d1.getDate() + dNum - 1);
            updated.endDate = d1.toISOString().split('T')[0];
          }
        }
      }

      if (key === 'cost') {
        const costVal = parseFloat(value);
        if (!Number.isNaN(costVal) && costVal >= 0) {
          updated.costWithVat = String(Math.round(costVal * 1.07));
          setEvalData((ev) => ({ ...ev, investmentCost: value }));
          if (editEvalData) setEditEvalData((ev) => ({ ...ev, investmentCost: value }));
        }
      } else if (key === 'costWithVat') {
        const vatVal = parseFloat(value);
        if (!Number.isNaN(vatVal) && vatVal >= 0) {
          const baseCost = String(Math.round(vatVal / 1.07));
          updated.cost = baseCost;
          setEvalData((ev) => ({ ...ev, investmentCost: baseCost }));
          if (editEvalData) setEditEvalData((ev) => ({ ...ev, investmentCost: baseCost }));
        }
      }

      return updated;
    });
  };

  // Post-improvement image upload
  const handleAfterImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const remaining = MAX_MEASURE_IMAGES - afterImages.length;
    if (!files.length || remaining <= 0) return;
    setAfterImageError('');
    setAfterImageUploading(true);
    try {
      const urls = [];
      for (const file of files.slice(0, remaining)) {
        const dataUrl = await fileToResizedDataUrl(file);
        urls.push(await uploadImage(dataUrl, 'measures'));
      }
      setAfterImages((p) => [...p, ...urls]);
    } catch (err) {
      console.error('Measure image upload failed:', err);
      setAfterImageError(t.measures.uploadFailed || 'อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setAfterImageUploading(false);
    }
  };

  const handleRemoveAfterImage = (url) => {
    setAfterImages((p) => p.filter((u) => u !== url));
    deleteImage(url);
  };

  // Save Measure Handler
  const handleSave = async ({ formData: fd, evalData: ed, autoNext = false }) => {
    setSavingRecord(true);
    try {
      const editingId = activeMeasureId.current;
      const newId = editingId || nextMeasureId();
      const finalName = ed.customName?.trim() ? ed.customName : activeMeasure;
      const taggedName = `[${ed.category || 'Minor'}] ${finalName}`;
      const measureStatus = ed.status || 'ศักยภาพ';

      await saveMeasureItem({
        id: newId,
        savedAt: new Date().toISOString(),
        equipmentId: item?.id,
        category: item?.category,
        factory: item?.factory,
        grade: result?.grade,
        measure: taggedName,
        status: measureStatus,
        isImplemented: measureStatus === 'ดำเนินการจริง',
        formData: fd,
        evalData: ed,
        afterImages: afterImages,
      });

      let updatedSaved = [];
      setSavedMeasures((prev) => {
        const idx = prev.findIndex((s) => s.id === editingId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { id: newId, name: taggedName, formData: fd, evalData: ed, afterImages: afterImages };
          updatedSaved = next;
          return next;
        }
        updatedSaved = [...prev, { id: newId, name: taggedName, formData: fd, evalData: ed, afterImages: afterImages }];
        return updatedSaved;
      });

      activeMeasureId.current = null;

      if (autoNext) {
        // Find next measure from selected list that is not saved yet
        const nextUnsaved = selectedMeasures.find(
          (m) => m !== activeMeasure && !updatedSaved.some((s) => s.name.includes(m))
        );
        if (nextUnsaved) {
          openMeasureForm(nextUnsaved);
          return;
        }
      }

      setStep('select');
    } finally {
      setSavingRecord(false);
    }
  };

  const handleEditSaved = (saved) => {
    activeMeasureId.current = saved.id;
    const rawName = saved.name.replace(/^\[.*?\]\s*/, '');
    setActiveMeasure(rawName);
    setFormData({ ...autoFill(rawName), ...saved.formData });
    setEditEvalData(saved.evalData || null);
    setAfterImages(saved.afterImages || saved.images || []);
    setAfterImageError('');
    setEvalData(saved.evalData || buildInitialEvalData(rawName));
    setStep('form');
  };

  const handleDeleteSaved = (id) => {
    const target = savedMeasures.find((s) => s.id === id);
    if (target?.afterImages?.length) {
      target.afterImages.forEach((u) => deleteImage(u));
    }
    setSavedMeasures((prev) => prev.filter((s) => s.id !== id));
    deleteMeasureItem(id);
  };

  const fields = MEASURE_FIELDS[activeMeasure] || DEFAULT_FIELDS;
  const basePower = formData.powerCurrent || formData.power || result?.powerCF || item?.chillerPower || item?.electricalPower || '';

  // Check if there is another un-saved selected measure for "Save & Next"
  const hasNextUnsavedMeasure = selectedMeasures.some(
    (m) => m !== activeMeasure && !savedMeasures.some((s) => s.name.includes(m))
  );

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
          {/* MEASURE SELECT PANEL (Multi-Select & Custom Measure) */}
          <Panel className="p-6 rounded-3xl space-y-5">
            {/* Toolbar: Select All / Clear Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1 border-b border-[#E4EBF6] dark:border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
                {t.measures.selectDesiredMeasure || 'เลือกมาตรการที่ต้องการ (SELECT MEASURES)'}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-[#EAF4FC] dark:bg-white/10 text-[#4988C4] dark:text-[#38BDF8]">
                  เลือกแล้ว {selectedMeasures.length} / {allAvailableMeasures.length} รายการ
                </span>
                <button
                  type="button"
                  onClick={selectedMeasures.length === allAvailableMeasures.length ? handleClearSelection : handleSelectAll}
                  className="text-xs font-bold text-gray-500 dark:text-[#8CA3C0] hover:text-[#4988C4] dark:hover:text-[#38BDF8] underline transition-colors"
                >
                  {selectedMeasures.length === allAvailableMeasures.length ? 'ล้างที่เลือก' : 'เลือกทั้งหมด'}
                </button>
              </div>
            </div>

            {/* Measures grid selection (Multi-Select with checkboxes) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allAvailableMeasures.map((m) => {
                const isSaved = savedMeasures.some((s) => s.name.includes(m));
                const isSelected = selectedMeasures.includes(m);
                return (
                  <div
                    key={m}
                    onClick={() => toggleMeasureSelect(m)}
                    className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border text-left text-sm font-bold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#0F2854] text-white border-[#0F2854] shadow-md shadow-[#0F2854]/20 ring-2 ring-[#4988C4]/50'
                        : 'bg-[#F4F7FC] dark:bg-white/5 border-[#E4EBF6] dark:border-white/10 text-[#0F2854] dark:text-[#E7EEF7] hover:border-[#4988C4] hover:bg-white dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox indicator */}
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-white text-[#0F2854] border-white shadow-sm'
                          : 'border-gray-300 dark:border-white/20 bg-white dark:bg-white/5'
                      }`}>
                        {isSelected && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="truncate">{t.measures.names[m] || m}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSaved && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-emerald-400 text-[#0F2854]'
                            : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          บันทึกแล้ว
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!selectedMeasures.includes(m)) {
                            setSelectedMeasures((p) => [...p, m]);
                          }
                          openMeasureForm(m);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-colors ${
                          isSelected
                            ? 'bg-white/20 hover:bg-white/30 text-white'
                            : 'bg-[#EAF4FC] dark:bg-white/10 hover:bg-[#D0E4F7] text-[#4988C4]'
                        }`}
                        title="กรอกข้อมูลและประเมินมาตรการนี้"
                      >
                        ประเมิน &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dedicated Custom Measure Input Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#EAF4FC] to-white dark:from-white/5 dark:to-white/[0.02] border-2 border-dashed border-[#4988C4]/40 dark:border-white/20 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#0F2854] dark:text-[#E7EEF7] uppercase tracking-wide">
                  <SparkleIcon className="w-4 h-4 text-amber-500" />
                  {t.measures.customMeasureTitle || 'เพิ่มมาตรการที่กำหนดเอง (Custom Measure)'}
                </div>
                <span className="text-[10px] font-bold text-gray-400">
                  {customList.length} มาตรการกำหนดเอง
                </span>
              </div>

              <p className="text-xs text-gray-500 dark:text-[#8CA3C0]">
                {t.measures.customMeasureDesc || 'พิมพ์ชื่อมาตรการที่ต้องการนอกเหนือจากรายการด้านบน แล้วกดเพิ่มเพื่อประเมินและแนบรูปภาพ'}
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomMeasure(); }}
                  placeholder={t.measures.customMeasurePlaceholder || 'เช่น ติดตั้งฉนวนกันความร้อนเพิ่มเติม, ปรับปรุงระบบควบคุมอัตโนมัติ...'}
                  className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-[#111F35] border border-[#E4EBF6] dark:border-white/10 text-sm font-medium text-[#0F2854] dark:text-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomMeasure()}
                  disabled={!customInput.trim()}
                  className="px-5 py-3 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>{t.measures.addCustomMeasureBtn || 'เพิ่มและเลือกมาตรการนี้'}</span>
                </button>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-gray-400 dark:text-[#7E93AF]">💡 ตัวอย่างมาตรการแนะนำด่วน:</p>
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOM_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleAddCustomMeasure(sug)}
                      className="text-xs px-2.5 py-1 rounded-xl bg-white dark:bg-white/10 hover:bg-[#4988C4] hover:text-white border border-[#E4EBF6] dark:border-white/10 text-gray-600 dark:text-[#C3D2E5] transition-colors flex items-center gap-1"
                    >
                      <PlusIcon className="w-3 h-3 text-[#4988C4]" />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              </div>

              {customSuccessNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckIcon className="w-4 h-4" />
                  <span>{customSuccessNotice}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartEvaluate}
                disabled={selectedMeasures.length === 0}
                className="w-full py-4 rounded-2xl bg-[#0F2854] hover:bg-[#1C4D8D] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm transition-all active:scale-95 shadow-md shadow-[#0F2854]/20 flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                {t.measures.proceedWithSelected || 'ดำเนินการประเมินมาตรการที่เลือก'} ({selectedMeasures.length} {t.measures.itemsCount || 'รายการ'}) &rarr;
              </button>
            </div>
          </Panel>

          {/* SAVED MEASURES LIST */}
          {savedMeasures.length > 0 && (
            <Panel className="p-6 rounded-3xl space-y-4 border-t-4 border-t-emerald-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                  <CheckIcon className="w-4 h-4 text-emerald-500" />
                  {t.measures.savedMeasures} ({savedMeasures.length} รายการ)
                </div>
              </div>

              <div className="space-y-3">
                {savedMeasures.map((s) => {
                  const hasPhotos = s.afterImages?.length > 0;
                  return (
                    <div key={s.id} className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate">{s.name}</p>
                          {s.evalData?.energySaved && (
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                              ประหยัดได้ {Number(s.evalData.energySaved).toLocaleString()} kWh/ปี (฿{Number(s.evalData.costSaved).toLocaleString()}/ปี)
                              {s.evalData?.payback ? ` · คืนทุน ${s.evalData.payback} ปี` : ''}
                            </p>
                          )}
                          {/* Image preview / thumbnail tag */}
                          {hasPhotos && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                                <CameraIcon className="w-3 h-3" />
                                รูปภาพหลังปรับปรุง ({s.afterImages.length} รูป)
                              </span>
                              <div className="flex gap-1">
                                {s.afterImages.slice(0, 3).map((url, idx) => (
                                  <img key={idx} src={url} alt="" className="w-6 h-6 rounded-md object-cover border border-purple-200" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSaved(s)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-blue-500/15 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center gap-1.5 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3.414a2 2 0 01.586-1.414z" />
                          </svg>
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSaved(s.id)}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-200 dark:border-rose-500/30 transition-colors"
                          title="ลบมาตรการนี้"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
          {/* MULTI-MEASURE SWITCHER QUEUE TABS (If multiple measures were selected) */}
          {selectedMeasures.length > 1 && (
            <Panel className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-500 dark:text-[#8CA3C0]">
                  คิวมาตรการที่เลือก ({selectedMeasures.length} มาตรการ):
                </span>
                <span className="text-[11px] text-[#4988C4] font-bold">
                  กำลังประเมิน: {activeMeasure}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedMeasures.map((m) => {
                  const isActive = m === activeMeasure;
                  const isSaved = savedMeasures.some((s) => s.name.includes(m));
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => openMeasureForm(m)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#0F2854] text-white shadow-sm ring-2 ring-[#4988C4]/60'
                          : isSaved
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-white dark:bg-white/10 text-gray-600 dark:text-[#C3D2E5] hover:bg-gray-50'
                      }`}
                    >
                      {isSaved ? (
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-400' : 'bg-gray-300 dark:bg-white/20'}`} />
                      )}
                      <span className="truncate max-w-[12rem]">{t.measures.names[m] || m}</span>
                      {isSaved && <span className="text-[10px] opacity-75 font-normal">(บันทึกแล้ว)</span>}
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* MEASURE FORM PANEL */}
          <Panel className="p-6 rounded-3xl space-y-5 border-t-4 border-t-[#4988C4]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
                เลือกมาตรการ (CHANGE MEASURE)
              </div>
              {selectedMeasures.length > 1 && (
                <span className="text-xs font-bold text-[#4988C4]">
                  (1 ใน {selectedMeasures.length} มาตรการที่เลือก)
                </span>
              )}
            </div>

            <Select
              value={activeMeasure}
              onChange={handleChangeMeasure}
              options={allAvailableMeasures.map((m) => ({ value: m, label: t.measures.names[m] || m }))}
              triggerClassName="w-full px-4 py-3 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]"
            />

            {/* CATALOG SELECTOR FOR REPLACEMENT MEASURES */}
            {isReplacementMeasure && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/70 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200/80 dark:border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-extrabold text-[#0F2854] dark:text-[#E7EEF7] flex items-center gap-1.5">
                    <SparkleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    เลือกรุ่นเครื่องจักรประสิทธิภาพสูงจาก Catalog ({matchingCatalog.length} รุ่น):
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/catalog')}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    จัดการ Catalog ↗
                  </button>
                </div>

                {matchingCatalog.length > 0 ? (
                  <Select
                    value={selectedCatalogId}
                    onChange={applyCatalogModel}
                    options={[
                      { value: '', label: '-- คลิกเพื่อเลือกรุ่นจาก Catalog (ดึงสเปกและราคาอัตโนมัติ) --' },
                      ...matchingCatalog.map((c) => ({
                        value: c.id,
                        label: `${c.brand} ${c.model}${c.spec ? ` (${c.spec})` : ''}${c.specificPower ? ` · ${c.specificPower}${item?.category === 'chiller' ? ' kW/TR' : ''}` : ''}${c.costEst ? ` · ${Number(c.costEst).toLocaleString()} บาท` : ''}`,
                      })),
                    ]}
                    triggerClassName="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#111F35] border border-blue-200 dark:border-blue-500/30 text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7] shadow-sm"
                  />
                ) : (
                  <div className="p-3 rounded-xl bg-white/80 dark:bg-white/5 border border-dashed border-blue-200 dark:border-blue-500/30 flex items-center justify-between text-xs text-gray-500 dark:text-[#8CA3C0]">
                    <span>ยังไม่มีรุ่นเครื่องจักรใน Catalog หมวดนี้</span>
                    <button
                      type="button"
                      onClick={() => navigate('/catalog')}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors"
                    >
                      + เพิ่มรุ่นใน Catalog
                    </button>
                  </div>
                )}

                {selectedCatalogId && (() => {
                  const picked = matchingCatalog.find((c) => c.id === selectedCatalogId);
                  if (!picked) return null;
                  return (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/90 dark:bg-white/5 border border-blue-100 dark:border-white/5 text-xs text-[#0F2854] dark:text-[#E7EEF7]">
                      {picked.image ? (
                        <img src={picked.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {picked.brand?.[0] || 'C'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-sm truncate">{picked.brand} {picked.model}</p>
                        <p className="text-gray-500 dark:text-[#8CA3C0] truncate">{picked.spec || picked.desc || 'เครื่องจักรประสิทธิภาพสูง'}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] font-mono flex-wrap">
                          {picked.specificPower ? <span className="text-blue-600 dark:text-blue-400 font-bold">สเปก: {picked.specificPower} {item?.category === 'chiller' ? 'kW/TR' : ''}</span> : null}
                          {picked.costEst > 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">ราคาประมาณการ: {Number(picked.costEst).toLocaleString()} บาท</span> : null}
                          {picked.pdfUrl && (
                            <a
                              href={picked.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-600 dark:text-red-400 hover:underline font-bold inline-flex items-center gap-1"
                            >
                              📄 ดูไฟล์ PDF สเปกเครื่อง ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider pt-2 border-t border-[#E4EBF6] dark:border-white/8">
              <ClipboardIcon className="w-4 h-4 text-[#4988C4]" />
              {t.measures.measureForm}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((f) => {
                const isAuto = !!f.autoFrom;
                const dynamicOptions = f.type === 'select'
                  ? [...new Set([...matchingCatalog.map((c) => `${c.brand} ${c.model}`.trim()), ...(f.options || [])])]
                  : f.options;

                return (
                  <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <label className="text-xs font-bold text-gray-600 dark:text-[#8CA3C0]">
                        {t.measures.fieldLabels?.[f.label] || f.label}
                      </label>
                      {(isAuto || f.isMeasured) && (
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 flex items-center gap-1 leading-none shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          ค่าตรวจวัดจริง
                        </span>
                      )}
                    </div>
                    {f.type === 'select' ? (
                      <Combobox
                        value={formData[f.key] ?? ''}
                        onChange={(v) => {
                          handleFormChange(f.key, v);
                          if (f.key === 'newModel') {
                            const matchedCat = matchingCatalog.find(
                              (c) => `${c.brand} ${c.model}`.trim().toLowerCase() === v.trim().toLowerCase() || c.model.trim().toLowerCase() === v.trim().toLowerCase()
                            );
                            if (matchedCat) {
                              applyCatalogModel(matchedCat.id);
                            }
                          }
                        }}
                        options={dynamicOptions || []}
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
                        placeholder={
                          f.key === 'cost'
                            ? 'THB'
                            : f.key === 'costWithVat'
                            ? 'THB (รวม VAT)'
                            : f.key === 'days'
                            ? 'วัน'
                            : f.key === 'power' || f.key === 'powerCurrent'
                            ? 'KW'
                            : f.placeholder || ''
                        }
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

          {/* POST-IMPROVEMENT PHOTOS PANEL */}
          <Panel className="p-6 rounded-3xl space-y-4 border-t-4 border-t-purple-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">
                <CameraIcon className="w-4 h-4 text-purple-500" />
                {t.measures.postImprovementPhotos}
              </div>
              <span className="text-[11px] font-bold text-gray-400">
                {afterImages.length}/{MAX_MEASURE_IMAGES} {t.measures.photoCount}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-[#7E93AF] -mt-1">
              {t.measures.postImprovementPhotosDesc}
            </p>

            {/* Before vs After comparison strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Before Photos (Readonly from Equipment) */}
              <div className="p-4 rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/8 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-[#C3D2E5]">
                    {t.measures.beforePhotosRef}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400">
                    {item?.images?.length || (item?.image ? 1 : 0)} รูป
                  </span>
                </div>
                {(item?.images?.length > 0 || item?.image) ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(item.images || [item.image]).map((url, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-white dark:bg-white/10 border border-[#E4EBF6] dark:border-white/10">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic py-4 text-center">{t.measures.noBeforePhotos}</p>
                )}
              </div>

              {/* After Photos (Uploadable for this Measure) */}
              <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                    ภาพหลังปรับปรุง (After Photos)
                  </span>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                    {afterImages.length}/{MAX_MEASURE_IMAGES} รูป
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {afterImages.map((url) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-white dark:bg-white/10 border border-purple-200 dark:border-purple-500/30 shadow-sm group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveAfterImage(url)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {afterImages.length < MAX_MEASURE_IMAGES && (
                    <label className={`aspect-square rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-500/40 flex flex-col items-center justify-center gap-1 text-purple-600 dark:text-purple-400 transition-colors ${
                      afterImageUploading ? 'opacity-60 pointer-events-none' : 'hover:bg-purple-100/60 dark:hover:bg-purple-500/20 cursor-pointer'
                    }`}>
                      <CameraIcon className="w-5 h-5" />
                      <span className="text-[10px] font-bold text-center px-1">
                        {afterImageUploading ? t.measures.uploadingPhotos : t.measures.addPhoto}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAfterImageChange}
                        className="hidden"
                        disabled={afterImageUploading}
                      />
                    </label>
                  )}
                </div>
                {afterImageError && <p className="text-xs text-rose-500 mt-1">{afterImageError}</p>}
              </div>
            </div>
          </Panel>

          {/* EVALUATION PANEL */}
          <Panel className="p-6 rounded-2xl space-y-5 border-t-4 border-t-amber-400">
            <EvalSection
              basePower={basePower}
              category={item?.category}
              result={result}
              evalData={editEvalData || evalData}
              activeMeasureName={activeMeasure}
              isSaving={savingRecord}
              onChange={(key, value) => {
                if (editEvalData) {
                  setEditEvalData((p) => ({ ...p, [key]: value }));
                } else {
                  setEvalData((p) => ({ ...p, [key]: value }));
                }
              }}
              onSave={(derived) => handleSave({ formData, evalData: { ...(editEvalData || evalData), ...derived }, autoNext: false })}
              onSaveAndNext={hasNextUnsavedMeasure ? (derived) => handleSave({ formData, evalData: { ...(editEvalData || evalData), ...derived }, autoNext: true }) : null}
              appDefaults={appDefaults}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

export default MeasureSelect;
