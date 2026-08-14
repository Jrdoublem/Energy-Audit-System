import { useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { Panel, SectionHeader } from '../components/ui';
import { Select } from '../components/Dropdown.jsx';
import { useLang } from '../context/languageStore.js';
import {
  CalculatorIcon, ShapesIcon, ThermometerIcon, PercentIcon, ArrowLeftIcon, LightningIcon, FlameIcon, WavesIcon,
} from '../components/icons';
import EngineerCalculatorFab from '../components/EngineerCalculatorFab.jsx';

// Common length units engineers reach for when sizing round stock/pipe,
// each expressed in millimetres so any pair can be converted via a ratio.
const UNIT_TO_MM = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };
const UNIT_LABEL_KEYS = { mm: 'unitMM', cm: 'unitCM', m: 'unitM', in: 'unitIN', ft: 'unitFT' };
const UNIT_OPTIONS = Object.keys(UNIT_TO_MM).map((value) => ({ value, labelKey: UNIT_LABEL_KEYS[value] }));
// Always shown as quick-reference conversions alongside a geometry result,
// skipping whichever one matches the unit the user actually entered in.
const QUICK_UNITS = ['mm', 'in'];
const SUPERSCRIPT = { 1: '', 2: '²', 3: '³' };

// Shared by every geometry formula below: builds result rows for a set of
// { labelKey, value, power } entries (power = 1 length / 2 area / 3 volume)
// in the unit the user entered, plus quick-reference conversions to the
// other common units (scaled by unit-ratio^power), skipping the input unit.
function unitResultRows(t, unit, entries) {
  const uLabel = t.calcTools[UNIT_LABEL_KEYS[unit]];
  const rows = entries.map(({ labelKey, value, power }) => ({
    label: `${t.calcTools[labelKey]} (${uLabel}${SUPERSCRIPT[power]})`,
    value,
  }));
  QUICK_UNITS.filter((target) => target !== unit).forEach((target) => {
    const factor = UNIT_TO_MM[unit] / UNIT_TO_MM[target];
    const tLabel = t.calcTools[UNIT_LABEL_KEYS[target]];
    entries.forEach(({ labelKey, value, power }) => {
      rows.push({
        label: `${t.calcTools[labelKey]} (${tLabel}${SUPERSCRIPT[power]})`,
        value: value * factor ** power,
        decimals: power === 1 ? 3 : 2,
      });
    });
  });
  return rows;
}

// Shared by every "fill in any one field" converter below (kW↔HP, TR↔kW↔
// BTU/hr, bar↔psi↔kPa, GPM↔m³/hr↔CFM): finds the first filled-in field,
// converts it to a common base unit via `toBase`, then derives every other
// unit from that base value.
function convertAnyOf(unitDefs, values) {
  let baseValue = null;
  for (const u of unitDefs) {
    const raw = values[u.key];
    const val = parseFloat(raw);
    if (raw !== '' && Number.isFinite(val)) { baseValue = val * u.toBase; break; }
  }
  if (baseValue === null) return null;
  return unitDefs.map((u) => ({ labelKey: u.labelKey, value: baseValue / u.toBase, decimals: u.decimals ?? 2 }));
}

// Every tool on this page shares one shape: a set of inputs (numeric or a
// a dropdown select), a single "คำนวณ" button, and a compute fn returning either
// null (fill in the fields) or an array of result rows ({ labelKey, value,
// decimals } or a direct { label, value, decimals } for dynamically-built
// labels) — units live baked into each labelKey's translated text unless
// noted, and `formula` (plain math notation, identical in every language)
// is shown next to the card title. Each formula also belongs to a
// `category`, used to group them behind the category-picker on this page.
const MATH_FORMULAS = [
  {
    id: 'circle',
    titleKey: 'circleTitle',
    formula: 'C = πD, A = πr², D = C/π',
    category: 'geometry',
    noteKey: 'circleNote',
    emptyHintKey: 'circleEmptyHint',
    inputs: [
      { key: 'unit', type: 'select', labelKey: 'unitLabel', span: 'full', options: UNIT_OPTIONS },
      { key: 'd', labelKey: 'circleDiameterInput' },
      { key: 'r', labelKey: 'circleRadiusInput' },
      { key: 'c', labelKey: 'circleCircumferenceInput' },
    ],
    compute: (v, t) => {
      const unit = UNIT_TO_MM[v.unit] ? v.unit : 'mm';
      const D = parseFloat(v.d);
      const R = parseFloat(v.r);
      const C = parseFloat(v.c);
      let diameter;
      if (D > 0) diameter = D;
      else if (R > 0) diameter = R * 2;
      else if (C > 0) diameter = C / Math.PI;
      else return null;

      const radius = diameter / 2;
      const circumference = Math.PI * diameter;
      const area = Math.PI * radius * radius;

      return unitResultRows(t, unit, [
        { labelKey: 'circleDiameter', value: diameter, power: 1 },
        { labelKey: 'circleRadius', value: radius, power: 1 },
        { labelKey: 'circleCircumference', value: circumference, power: 1 },
        { labelKey: 'circleArea', value: area, power: 2 },
      ]);
    },
  },
  {
    id: 'rect',
    titleKey: 'rectTitle',
    formula: 'A = w×l, P = 2(w+l)',
    category: 'geometry',
    inputs: [
      { key: 'unit', type: 'select', labelKey: 'unitLabel', span: 'full', options: UNIT_OPTIONS },
      { key: 'w', labelKey: 'rectWidth' },
      { key: 'l', labelKey: 'rectLength' },
    ],
    compute: (v, t) => {
      const unit = UNIT_TO_MM[v.unit] ? v.unit : 'mm';
      const w = parseFloat(v.w);
      const l = parseFloat(v.l);
      if (!(w > 0) || !(l > 0)) return null;
      return unitResultRows(t, unit, [
        { labelKey: 'rectArea', value: w * l, power: 2 },
        { labelKey: 'rectPerimeter', value: 2 * (w + l), power: 1 },
      ]);
    },
  },
  {
    id: 'triangle',
    titleKey: 'triTitle',
    formula: 'A = ½×b×h',
    category: 'geometry',
    inputs: [
      { key: 'unit', type: 'select', labelKey: 'unitLabel', span: 'full', options: UNIT_OPTIONS },
      { key: 'b', labelKey: 'triBase' },
      { key: 'h', labelKey: 'triHeight' },
    ],
    compute: (v, t) => {
      const unit = UNIT_TO_MM[v.unit] ? v.unit : 'mm';
      const b = parseFloat(v.b);
      const h = parseFloat(v.h);
      if (!(b > 0) || !(h > 0)) return null;
      return unitResultRows(t, unit, [{ labelKey: 'triArea', value: 0.5 * b * h, power: 2 }]);
    },
  },
  {
    id: 'cylinder',
    titleKey: 'cylTitle',
    formula: 'V = πr²h, S = 2πrh',
    category: 'geometry',
    inputs: [
      { key: 'unit', type: 'select', labelKey: 'unitLabel', span: 'full', options: UNIT_OPTIONS },
      { key: 'r', labelKey: 'cylRadius' },
      { key: 'h', labelKey: 'cylHeight' },
    ],
    compute: (v, t) => {
      const unit = UNIT_TO_MM[v.unit] ? v.unit : 'mm';
      const r = parseFloat(v.r);
      const h = parseFloat(v.h);
      if (!(r > 0) || !(h > 0)) return null;
      return unitResultRows(t, unit, [
        { labelKey: 'cylVolume', value: Math.PI * r * r * h, power: 3 },
        { labelKey: 'cylSurface', value: 2 * Math.PI * r * h, power: 2 },
      ]);
    },
  },
  {
    id: 'sphere',
    titleKey: 'sphereTitle',
    formula: 'V = 4/3×πr³, S = 4πr²',
    category: 'geometry',
    inputs: [
      { key: 'unit', type: 'select', labelKey: 'unitLabel', span: 'full', options: UNIT_OPTIONS },
      { key: 'r', labelKey: 'sphereRadius' },
    ],
    compute: (v, t) => {
      const unit = UNIT_TO_MM[v.unit] ? v.unit : 'mm';
      const r = parseFloat(v.r);
      if (!(r > 0)) return null;
      return unitResultRows(t, unit, [
        { labelKey: 'sphereVolume', value: (4 / 3) * Math.PI * r ** 3, power: 3 },
        { labelKey: 'sphereSurface', value: 4 * Math.PI * r * r, power: 2 },
      ]);
    },
  },
  {
    id: 'tempConvert',
    titleKey: 'tempTitle',
    formula: '°F = °C×9/5+32, °C = (°F−32)×5/9',
    category: 'temperature',
    noteKey: 'tempNote',
    emptyHintKey: 'tempEmptyHint',
    inputs: [
      { key: 'c', labelKey: 'tempCInput' },
      { key: 'f', labelKey: 'tempFInput' },
    ],
    compute: (v, t) => {
      const c = parseFloat(v.c);
      const f = parseFloat(v.f);
      if (Number.isFinite(c)) return [{ label: t.calcTools.tempResultF, value: (c * 9) / 5 + 32 }];
      if (Number.isFinite(f)) return [{ label: t.calcTools.tempResultC, value: ((f - 32) * 5) / 9 }];
      return null;
    },
  },
  {
    id: 'threePhasePower',
    titleKey: 'threePhaseTitle',
    formula: 'P = √3×V×I×PF / 1000',
    category: 'electrical',
    inputs: [
      { key: 'volt', labelKey: 'voltInput' },
      { key: 'amp', labelKey: 'ampInput' },
      { key: 'pf', labelKey: 'pfInput' },
    ],
    compute: (v) => {
      const volt = parseFloat(v.volt);
      const amp = parseFloat(v.amp);
      const pf = parseFloat(v.pf);
      if (!(volt > 0) || !(amp > 0) || !(pf > 0)) return null;
      return [{ labelKey: 'threePhaseResult', value: (Math.sqrt(3) * volt * amp * pf) / 1000, decimals: 3 }];
    },
  },
  {
    id: 'kwFromKva',
    titleKey: 'kvaTitle',
    formula: 'P = kVA×PF',
    category: 'electrical',
    inputs: [
      { key: 'kva', labelKey: 'kvaInput' },
      { key: 'pf', labelKey: 'pfInput' },
    ],
    compute: (v) => {
      const kva = parseFloat(v.kva);
      const pf = parseFloat(v.pf);
      if (!(kva > 0) || !(pf > 0)) return null;
      return [{ labelKey: 'kvaResult', value: kva * pf, decimals: 3 }];
    },
  },
  {
    id: 'kwHpConvert',
    titleKey: 'kwHpTitle',
    formula: '1 HP = 0.7457 kW',
    category: 'electrical',
    noteKey: 'kwHpNote',
    emptyHintKey: 'kwHpEmptyHint',
    inputs: [
      { key: 'kw', labelKey: 'kwInput' },
      { key: 'hp', labelKey: 'hpInput' },
    ],
    compute: (v) => convertAnyOf([
      { key: 'kw', labelKey: 'kwInput', toBase: 1, decimals: 3 },
      { key: 'hp', labelKey: 'hpInput', toBase: 0.7457, decimals: 3 },
    ], v),
  },
  {
    id: 'heatConvert',
    titleKey: 'heatConvertTitle',
    formula: '1 TR = 3.517 kW = 12,000 BTU/hr',
    category: 'heat',
    noteKey: 'heatConvertNote',
    emptyHintKey: 'heatConvertEmptyHint',
    inputs: [
      { key: 'tr', labelKey: 'heatTRInput' },
      { key: 'kw', labelKey: 'heatKWInput' },
      { key: 'btu', labelKey: 'heatBTUInput' },
    ],
    compute: (v) => convertAnyOf([
      { key: 'tr', labelKey: 'heatTRInput', toBase: 3.51685, decimals: 3 },
      { key: 'kw', labelKey: 'heatKWInput', toBase: 1, decimals: 3 },
      { key: 'btu', labelKey: 'heatBTUInput', toBase: 1 / 3412.14, decimals: 0 },
    ], v),
  },
  {
    id: 'pressureConvert',
    titleKey: 'presConvertTitle',
    formula: '1 bar = 14.5038 psi = 100 kPa',
    category: 'heat',
    noteKey: 'presConvertNote',
    emptyHintKey: 'presConvertEmptyHint',
    inputs: [
      { key: 'bar', labelKey: 'presBarInput' },
      { key: 'psi', labelKey: 'presPSIInput' },
      { key: 'kpa', labelKey: 'presKPAInput' },
    ],
    compute: (v) => convertAnyOf([
      { key: 'bar', labelKey: 'presBarInput', toBase: 100, decimals: 3 },
      { key: 'psi', labelKey: 'presPSIInput', toBase: 6.89476, decimals: 2 },
      { key: 'kpa', labelKey: 'presKPAInput', toBase: 1, decimals: 2 },
    ], v),
  },
  {
    id: 'flowConvert',
    titleKey: 'flowConvertTitle',
    formula: '1 GPM = 0.2271 m³/hr, 1 CFM = 1.699 m³/hr',
    category: 'flow',
    noteKey: 'flowConvertNote',
    emptyHintKey: 'flowConvertEmptyHint',
    inputs: [
      { key: 'gpm', labelKey: 'flowGPMInput' },
      { key: 'm3hr', labelKey: 'flowM3HRInput' },
      { key: 'cfm', labelKey: 'flowCFMInput' },
    ],
    compute: (v) => convertAnyOf([
      { key: 'gpm', labelKey: 'flowGPMInput', toBase: 0.2271247, decimals: 3 },
      { key: 'm3hr', labelKey: 'flowM3HRInput', toBase: 1, decimals: 3 },
      { key: 'cfm', labelKey: 'flowCFMInput', toBase: 1.699011, decimals: 3 },
    ], v),
  },
  {
    id: 'pct',
    titleKey: 'pctTitle',
    formula: '% = (New − Old) / Old × 100',
    category: 'other',
    inputs: [{ key: 'o', labelKey: 'pctOld' }, { key: 'n', labelKey: 'pctNew' }],
    compute: (v) => {
      const o = parseFloat(v.o);
      const n = parseFloat(v.n);
      if (!Number.isFinite(o) || !Number.isFinite(n) || o === 0) return null;
      return [{ labelKey: 'pctResult', value: ((n - o) / o) * 100 }];
    },
  },
];

const FORMULA_CATEGORIES = [
  { key: 'geometry', labelKey: 'catGeometry', icon: ShapesIcon },
  { key: 'temperature', labelKey: 'catTemperature', icon: ThermometerIcon },
  { key: 'electrical', labelKey: 'catElectrical', icon: LightningIcon },
  { key: 'heat', labelKey: 'catHeat', icon: FlameIcon },
  { key: 'flow', labelKey: 'catFlow', icon: WavesIcon },
  { key: 'other', labelKey: 'catOther', icon: PercentIcon },
];

const FORMULA_GRID_COLS = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };

function FormulaCard({ title, formula, note, calcLabel, inputs, values, onFieldChange, onCalculate, result, emptyHint }) {
  const inputCols = inputs.length >= 4 ? 'sm:grid-cols-3' : (FORMULA_GRID_COLS[inputs.length] || 'sm:grid-cols-2');
  return (
    <Panel className="p-5 space-y-4">
      <div>
        <SectionHeader
          title={
            <>
              {title}{' '}
              {formula && (
                <span className="font-normal text-gray-400 dark:text-[#7E93AF]">({formula})</span>
              )}
            </>
          }
        />
        {note && <p className="text-xs text-gray-400 dark:text-[#7E93AF] -mt-3">{note}</p>}
      </div>
      <div className={`grid grid-cols-1 ${inputCols} gap-3`}>
        {inputs.map((inp) => (
          <div key={inp.key} className={inp.span === 'full' ? 'sm:col-span-full' : ''}>
            <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1 block">{inp.label}</label>
            {inp.type === 'select' ? (
              <Select
                value={values[inp.key] || inp.options[0].value}
                onChange={(val) => onFieldChange(inp.key, val)}
                options={inp.options}
                triggerClassName="flex items-center gap-1.5 w-full sm:w-40 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            ) : (
              <input
                type="number"
                value={values[inp.key] || ''}
                onChange={(e) => onFieldChange(inp.key, e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
              />
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onCalculate}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
        style={{ background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' }}
      >
        <CalculatorIcon className="w-4 h-4" />
        {calcLabel}
      </button>
      {result === null && (
        <p className="text-xs text-amber-500 text-center">{emptyHint}</p>
      )}
      {Array.isArray(result) && (
        <div className={`grid grid-cols-1 ${FORMULA_GRID_COLS[result.length] || 'sm:grid-cols-2'} gap-2 pt-1`}>
          {result.map((r) => (
            <div key={r.label} className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/8 px-3 py-2.5 flex flex-col items-center gap-0.5 text-center">
              <p className="text-[10px] text-gray-500 dark:text-[#7E93AF]">{r.label}</p>
              <p className="text-base font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{r.value}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Calculator() {
  const { t } = useLang();

  const [activeCategory, setActiveCategory] = useState(null);
  const [mathValues, setMathValues] = useState({});
  const [mathResults, setMathResults] = useState({});
  const setMathField = (formulaId, fieldKey, val) => {
    setMathValues((v) => ({ ...v, [`${formulaId}.${fieldKey}`]: val }));
  };
  const calcFormula = (formula) => {
    const values = {};
    formula.inputs.forEach((inp) => {
      const stored = mathValues[`${formula.id}.${inp.key}`];
      values[inp.key] = stored || (inp.type === 'select' ? inp.options[0].value : '');
    });
    setMathResults((r) => ({ ...r, [formula.id]: formula.compute(values, t) }));
  };

  const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d }) : '-');

  const categoryFormulas = MATH_FORMULAS.filter((f) => f.category === activeCategory);

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
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 px-1">
            <p className="text-xs lg:text-sm font-bold text-gray-500 dark:text-[#8CA3C0] uppercase tracking-wider">{t.calcTools.mathSection}</p>
            <p className="text-xs text-gray-400 dark:text-[#7E93AF]">{t.calcTools.mathSectionDesc}</p>
          </div>

          {activeCategory === null ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {FORMULA_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const count = MATH_FORMULAS.filter((f) => f.category === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key)}
                    className="p-5 rounded-2xl border border-[#E4EBF6] dark:border-white/10 bg-white dark:bg-[#111F35] hover:border-[#4988C4]/40 hover:shadow-md transition-all text-left flex flex-col gap-3"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#EAF4FC] dark:bg-white/10 flex items-center justify-center text-[#4988C4] shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F2854] dark:text-[#E7EEF7]">{t.calcTools[cat.labelKey]}</p>
                      <p className="text-xs text-gray-400 dark:text-[#7E93AF] mt-0.5">{count} {t.calcTools.formulaCountSuffix}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="flex items-center gap-2 text-sm font-bold text-[#4988C4] hover:text-[#0F2854] dark:hover:text-[#E7EEF7] transition-colors w-fit"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                {t.calcTools.backToCategories}
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                {categoryFormulas.map((formula) => {
                  const values = {};
                  formula.inputs.forEach((inp) => {
                    const stored = mathValues[`${formula.id}.${inp.key}`];
                    values[inp.key] = stored || (inp.type === 'select' ? inp.options[0].value : '');
                  });
                  const rawResult = mathResults[formula.id];
                  const resolvedResult = Array.isArray(rawResult)
                    ? rawResult.map((r) => ({ label: r.label ?? t.calcTools[r.labelKey], value: fmt(r.value, r.decimals ?? 2) }))
                    : rawResult;
                  return (
                    <FormulaCard
                      key={formula.id}
                      title={t.calcTools[formula.titleKey]}
                      formula={formula.formula}
                      note={formula.noteKey ? t.calcTools[formula.noteKey] : null}
                      calcLabel={t.catalog.calculate}
                      inputs={formula.inputs.map((inp) => ({
                        key: inp.key,
                        label: t.calcTools[inp.labelKey],
                        type: inp.type,
                        span: inp.span,
                        options: inp.options?.map((opt) => ({ value: opt.value, label: t.calcTools[opt.labelKey] })),
                      }))}
                      values={values}
                      onFieldChange={(key, val) => setMathField(formula.id, key, val)}
                      onCalculate={() => calcFormula(formula)}
                      result={resolvedResult}
                      emptyHint={formula.emptyHintKey ? t.calcTools[formula.emptyHintKey] : t.calcTools.fillFormula}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AppLayout>
      <EngineerCalculatorFab />
    </>
  );
}

export default Calculator;
