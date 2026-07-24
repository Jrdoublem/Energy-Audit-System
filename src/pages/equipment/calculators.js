// Per-category efficiency calculators for equipment other than Chiller
// (Chiller keeps its own bespoke unit-toggle UI + math directly in
// CalcModal.jsx — it already worked and didn't need to move).
//
// Each entry exports:
//   fields:   declarative input list, rendered generically by CalcModal
//             (same {key,label,unit,type,options,default} shape already
//             used by MeasureSelect.jsx's MEASURE_FIELDS).
//   compute(form): returns { metrics, grade, powerBaseline } — the shape
//             CalcResult/History render generically, and MeasureSelect's
//             savings math reads via result.powerCF (CalcModal aliases
//             powerBaseline -> powerCF for backward compatibility).
//
// Grade thresholds are industry-typical efficiency benchmarks (no
// client-specific benchmark data was available) — good/ok/poor.
function grade3(value, goodMin, okMin) {
  return value >= goodMin ? 'good' : value >= okMin ? 'ok' : 'poor';
}

const G = 9.81;        // m/s^2
const RHO_WATER = 1000; // kg/m^3
const R_AIR = 8314 / 28.97; // J/(kg.K)

export const CALCULATORS = {
  compressor: {
    fields: [
      { key: 'p1',       label: 'ความดันดูด (P₁)',        unit: 'kPa abs', type: 'number', default: '101.325' },
      { key: 'p2',       label: 'ความดันจ่าย (P₂)',       unit: 'kPa abs', type: 'number', default: '700' },
      { key: 't1',       label: 'อุณหภูมิดูด (T₁)',       unit: '°C',      type: 'number', default: '30' },
      { key: 'gamma',    label: 'γ (Cp/Cv)',              unit: '',        type: 'number', default: '1.4' },
      { key: 'etaIs',    label: 'ประสิทธิภาพ Isentropic', unit: '%',       type: 'number', default: '80' },
      { key: 'flow',     label: 'อัตราการไหล',            unit: 'm³/min',  type: 'number', default: '10' },
      { key: 'pMotor',   label: 'กำลังมอเตอร์',           unit: 'kW',      type: 'number', default: '55' },
      { key: 'etaMotor', label: 'ประสิทธิภาพมอเตอร์',    unit: '%',       type: 'number', default: '95' },
      { key: 'etaMech',  label: 'ประสิทธิภาพเชิงกล',     unit: '%',       type: 'number', default: '98' },
    ],
    compute(form) {
      const P1 = (parseFloat(form.p1) || 101.325) * 1000;
      const P2 = (parseFloat(form.p2) || 700) * 1000;
      const T1 = (parseFloat(form.t1) || 30) + 273.15;
      const gamma = parseFloat(form.gamma) || 1.4;
      const Q = parseFloat(form.flow) || 0;       // m3/min
      const pMotor = parseFloat(form.pMotor) || 0;
      const etaMotor = (parseFloat(form.etaMotor) || 95) / 100;
      const etaMech = (parseFloat(form.etaMech) || 98) / 100;

      const rho1 = P1 / (R_AIR * T1);
      const mdot = rho1 * (Q / 60);
      const pr = P2 / P1;
      const exp = (gamma - 1) / gamma;
      const T2ideal = T1 * Math.pow(pr, exp);
      const cpAir = gamma * R_AIR / (gamma - 1);
      const wIdeal = cpAir * (T2ideal - T1);
      const pIdeal = (mdot * wIdeal) / 1000; // kW
      const pShaft = pMotor * etaMotor * etaMech;
      const overallEff = pShaft > 0 ? Math.min(100, Math.max(0, (pIdeal / pShaft) * 100)) : 0;
      const specificPower = Q > 0 ? pShaft / Q : 0;

      return {
        metrics: [
          { key: 'eff', label: 'Overall Efficiency', value: overallEff.toFixed(1), unit: '%' },
          { key: 'pideal', label: 'P_ideal', value: pIdeal.toFixed(2), unit: 'kW' },
          { key: 'pshaft', label: 'P_shaft', value: pShaft.toFixed(2), unit: 'kW' },
          { key: 'sp', label: 'Specific Power', value: specificPower.toFixed(2), unit: 'kW/(m³/min)' },
        ],
        grade: grade3(overallEff, 80, 65),
        powerBaseline: pShaft,
      };
    },
  },

  pump: {
    fields: [
      { key: 'head',   label: 'Head (H)',              unit: 'm',    type: 'number', default: '30' },
      { key: 'flow',   label: 'อัตราการไหล (Q)',       unit: 'm³/h', type: 'number', default: '50' },
      { key: 'pshaft', label: 'กำลังมอเตอร์/เพลา',      unit: 'kW',   type: 'number', default: '15' },
    ],
    compute(form) {
      const H = parseFloat(form.head) || 0;
      const Qm3h = parseFloat(form.flow) || 0;
      const pShaft = parseFloat(form.pshaft) || 0;
      const Qm3s = Qm3h / 3600;
      const hydraulicKW = (RHO_WATER * G * Qm3s * H) / 1000;
      const eff = pShaft > 0 ? Math.min(100, (hydraulicKW / pShaft) * 100) : 0;
      const specificEnergy = Qm3h > 0 ? pShaft / Qm3h : 0; // kWh/m3

      return {
        metrics: [
          { key: 'hyd', label: 'Hydraulic Power', value: hydraulicKW.toFixed(2), unit: 'kW' },
          { key: 'eff', label: 'Pump Efficiency', value: eff.toFixed(1), unit: '%' },
          { key: 'se', label: 'Specific Energy', value: specificEnergy.toFixed(3), unit: 'kWh/m³' },
        ],
        grade: grade3(eff, 70, 50),
        powerBaseline: pShaft,
      };
    },
  },

  boiler: {
    fields: [
      { key: 'steamFlow',      label: 'อัตราการผลิตไอน้ำ',                 unit: 'kg/h',        type: 'number', default: '2000' },
      { key: 'enthalpyGain',   label: 'ผลต่างเอนทัลปี (ไอน้ำ − น้ำป้อน)', unit: 'kJ/kg',       type: 'number', default: '2600' },
      { key: 'fuelFlow',       label: 'อัตราการใช้เชื้อเพลิง',             unit: 'kg/h หรือ L/h', type: 'number', default: '150' },
      { key: 'calorificValue', label: 'ค่าความร้อนเชื้อเพลิง',             unit: 'kJ/kg หรือ kJ/L', type: 'number', default: '42000' },
    ],
    compute(form) {
      const steamFlow = parseFloat(form.steamFlow) || 0;      // kg/h
      const dh = parseFloat(form.enthalpyGain) || 0;          // kJ/kg
      const fuelFlow = parseFloat(form.fuelFlow) || 0;        // kg or L /h
      const cv = parseFloat(form.calorificValue) || 0;        // kJ/kg or kJ/L

      const heatOutputKW = (steamFlow * dh) / 3600;
      const fuelInputKW = (fuelFlow * cv) / 3600;
      const eff = fuelInputKW > 0 ? Math.min(100, (heatOutputKW / fuelInputKW) * 100) : 0;

      return {
        metrics: [
          { key: 'out', label: 'Thermal Output', value: heatOutputKW.toFixed(1), unit: 'kW' },
          { key: 'in', label: 'Fuel Input', value: fuelInputKW.toFixed(1), unit: 'kW' },
          { key: 'eff', label: 'Thermal Efficiency', value: eff.toFixed(1), unit: '%' },
        ],
        grade: grade3(eff, 85, 75),
        powerBaseline: fuelInputKW,
      };
    },
  },

  cooling: {
    fields: [
      { key: 'tIn',      label: 'อุณหภูมิน้ำเข้า',                  unit: '°C',  type: 'number', default: '37' },
      { key: 'tOut',     label: 'อุณหภูมิน้ำออก',                   unit: '°C',  type: 'number', default: '32' },
      { key: 'wetBulb',  label: 'อุณหภูมิกระเปาะเปียก (Wet Bulb)', unit: '°C',  type: 'number', default: '28' },
      { key: 'fanPower', label: 'กำลังพัดลม',                       unit: 'kW',  type: 'number', default: '15' },
      { key: 'flow',     label: 'อัตราการไหลน้ำ',                   unit: 'L/s', type: 'number', default: '100' },
    ],
    compute(form) {
      const tIn = parseFloat(form.tIn) || 0;
      const tOut = parseFloat(form.tOut) || 0;
      const wetBulb = parseFloat(form.wetBulb) || 0;
      const fanPower = parseFloat(form.fanPower) || 0;
      const flow = parseFloat(form.flow) || 0;

      const range = tIn - tOut;
      const approach = tOut - wetBulb;
      const effectiveness = (range + approach) > 0 ? (range / (range + approach)) * 100 : 0;
      const specificPower = flow > 0 ? fanPower / flow : 0;

      return {
        metrics: [
          { key: 'range', label: 'Range', value: range.toFixed(1), unit: '°C' },
          { key: 'approach', label: 'Approach', value: approach.toFixed(1), unit: '°C' },
          { key: 'eff', label: 'Effectiveness', value: effectiveness.toFixed(1), unit: '%' },
          { key: 'sp', label: 'Specific Power', value: specificPower.toFixed(3), unit: 'kW/(L/s)' },
        ],
        grade: grade3(effectiveness, 70, 50),
        powerBaseline: fanPower,
      };
    },
  },

  electrical: {
    fields: [
      { key: 'voltage',     label: 'แรงดันไฟฟ้า (V, line-line)',   unit: 'V',  type: 'number', default: '400' },
      { key: 'current',     label: 'กระแสไฟฟ้า (I)',                unit: 'A',  type: 'number', default: '50' },
      { key: 'pf',          label: 'Power Factor',                  unit: '',   type: 'number', default: '0.85' },
      { key: 'ratedOutput', label: 'กำลังงานที่ผลิตได้จริง (Output)', unit: 'kW', type: 'number', default: '25' },
    ],
    compute(form) {
      const V = parseFloat(form.voltage) || 0;
      const I = parseFloat(form.current) || 0;
      const pf = parseFloat(form.pf) || 0;
      const output = parseFloat(form.ratedOutput) || 0;

      const inputKW = (Math.sqrt(3) * V * I * pf) / 1000;
      const eff = inputKW > 0 ? Math.min(100, (output / inputKW) * 100) : 0;

      return {
        metrics: [
          { key: 'in', label: 'Input Power', value: inputKW.toFixed(2), unit: 'kW' },
          { key: 'out', label: 'Output Power', value: output.toFixed(2), unit: 'kW' },
          { key: 'eff', label: 'Efficiency', value: eff.toFixed(1), unit: '%' },
        ],
        grade: grade3(eff, 90, 85),
        powerBaseline: inputKW,
      };
    },
  },
};

export function defaultFormFor(category) {
  const fields = CALCULATORS[category]?.fields || [];
  return Object.fromEntries(fields.map((f) => [f.key, f.default ?? '']));
}
