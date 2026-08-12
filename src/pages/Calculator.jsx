import { useState } from 'react';
import AppLayout from '../layouts/AppLayout';
import { Panel, SectionHeader } from '../components/ui';
import { useLang } from '../context/languageStore.js';
import { CalculatorIcon } from '../components/icons';
import EngineerCalculatorFab from '../components/EngineerCalculatorFab.jsx';

// Every tool on this page shares one shape: a set of numeric inputs, a single
// "คำนวณ" button, and a compute fn returning either null (fill in the fields)
// or an array of result rows ({ labelKey, value, decimals }) — units live
// baked into each labelKey's translated text, and `formula` (plain math
// notation, identical in every language) is shown next to the card title.
const MATH_FORMULAS = [
  {
    id: 'pipeArea',
    titleKey: 'pipeAreaTitle',
    formula: 'A = Q / V',
    inputs: [
      { key: 'q', labelKey: 'pipeSizeFlowRate' },
      { key: 'v', labelKey: 'pipeSizeVelocity' },
    ],
    compute: (v) => {
      const Q = parseFloat(v.q);
      const V = parseFloat(v.v);
      if (!(Q > 0) || !(V > 0)) return null;
      return [{ labelKey: 'pipeSizeArea', value: Q / V, decimals: 4 }];
    },
  },
  {
    id: 'pipeDiameter',
    titleKey: 'pipeDiameterTitle',
    formula: 'D = √(4Q / πV)',
    inputs: [
      { key: 'q', labelKey: 'pipeSizeFlowRate' },
      { key: 'v', labelKey: 'pipeSizeVelocity' },
    ],
    compute: (v) => {
      const Q = parseFloat(v.q);
      const V = parseFloat(v.v);
      if (!(Q > 0) || !(V > 0)) return null;
      return [{ labelKey: 'pipeSizeDiameter', value: Math.sqrt((4 * Q) / (Math.PI * V)), decimals: 4 }];
    },
  },
  {
    id: 'circle',
    titleKey: 'circleTitle',
    formula: 'r = d/2, C = πd, A = πr²',
    inputs: [{ key: 'd', labelKey: 'circleDiameter' }],
    compute: (v) => {
      const d = parseFloat(v.d);
      if (!(d > 0)) return null;
      const r = d / 2;
      return [
        { labelKey: 'circleRadius', value: r },
        { labelKey: 'circleCircumference', value: Math.PI * d },
        { labelKey: 'circleArea', value: Math.PI * r * r },
      ];
    },
  },
  {
    id: 'rect',
    titleKey: 'rectTitle',
    formula: 'A = w×l, P = 2(w+l)',
    inputs: [{ key: 'w', labelKey: 'rectWidth' }, { key: 'l', labelKey: 'rectLength' }],
    compute: (v) => {
      const w = parseFloat(v.w);
      const l = parseFloat(v.l);
      if (!(w > 0) || !(l > 0)) return null;
      return [
        { labelKey: 'rectArea', value: w * l },
        { labelKey: 'rectPerimeter', value: 2 * (w + l) },
      ];
    },
  },
  {
    id: 'triangle',
    titleKey: 'triTitle',
    formula: 'A = ½×b×h',
    inputs: [{ key: 'b', labelKey: 'triBase' }, { key: 'h', labelKey: 'triHeight' }],
    compute: (v) => {
      const b = parseFloat(v.b);
      const h = parseFloat(v.h);
      if (!(b > 0) || !(h > 0)) return null;
      return [{ labelKey: 'triArea', value: 0.5 * b * h }];
    },
  },
  {
    id: 'cylinder',
    titleKey: 'cylTitle',
    formula: 'V = πr²h, S = 2πrh',
    inputs: [{ key: 'r', labelKey: 'cylRadius' }, { key: 'h', labelKey: 'cylHeight' }],
    compute: (v) => {
      const r = parseFloat(v.r);
      const h = parseFloat(v.h);
      if (!(r > 0) || !(h > 0)) return null;
      return [
        { labelKey: 'cylVolume', value: Math.PI * r * r * h },
        { labelKey: 'cylSurface', value: 2 * Math.PI * r * h },
      ];
    },
  },
  {
    id: 'box',
    titleKey: 'boxTitle',
    formula: 'V = w×l×h',
    inputs: [{ key: 'w', labelKey: 'boxWidth' }, { key: 'l', labelKey: 'boxLength' }, { key: 'h', labelKey: 'boxHeight' }],
    compute: (v) => {
      const w = parseFloat(v.w);
      const l = parseFloat(v.l);
      const h = parseFloat(v.h);
      if (!(w > 0) || !(l > 0) || !(h > 0)) return null;
      return [{ labelKey: 'boxVolume', value: w * l * h }];
    },
  },
  {
    id: 'sphere',
    titleKey: 'sphereTitle',
    formula: 'V = 4/3×πr³, S = 4πr²',
    inputs: [{ key: 'r', labelKey: 'sphereRadius' }],
    compute: (v) => {
      const r = parseFloat(v.r);
      if (!(r > 0)) return null;
      return [
        { labelKey: 'sphereVolume', value: (4 / 3) * Math.PI * r ** 3 },
        { labelKey: 'sphereSurface', value: 4 * Math.PI * r * r },
      ];
    },
  },
  {
    id: 'pyth',
    titleKey: 'pythTitle',
    formula: 'c = √(a²+b²)',
    inputs: [{ key: 'a', labelKey: 'pythA' }, { key: 'b', labelKey: 'pythB' }],
    compute: (v) => {
      const a = parseFloat(v.a);
      const b = parseFloat(v.b);
      if (!(a > 0) || !(b > 0)) return null;
      return [{ labelKey: 'pythC', value: Math.sqrt(a * a + b * b) }];
    },
  },
  {
    id: 'pct',
    titleKey: 'pctTitle',
    formula: '% = (New − Old) / Old × 100',
    inputs: [{ key: 'o', labelKey: 'pctOld' }, { key: 'n', labelKey: 'pctNew' }],
    compute: (v) => {
      const o = parseFloat(v.o);
      const n = parseFloat(v.n);
      if (!Number.isFinite(o) || !Number.isFinite(n) || o === 0) return null;
      return [{ labelKey: 'pctResult', value: ((n - o) / o) * 100 }];
    },
  },
];

const FORMULA_GRID_COLS = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };

function FormulaCard({ title, formula, calcLabel, inputs, values, onFieldChange, onCalculate, result, emptyHint }) {
  const inputCols = inputs.length >= 4 ? 'sm:grid-cols-3' : (FORMULA_GRID_COLS[inputs.length] || 'sm:grid-cols-2');
  return (
    <Panel className="p-5 space-y-4">
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
      <div className={`grid grid-cols-1 ${inputCols} gap-3`}>
        {inputs.map((inp) => (
          <div key={inp.key}>
            <label className="text-xs font-medium text-gray-500 dark:text-[#7E93AF] mb-1 block">{inp.label}</label>
            <input
              type="number"
              value={values[inp.key] || ''}
              onChange={(e) => onFieldChange(inp.key, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-gray-700 dark:text-[#C3D2E5] focus:outline-none focus:ring-2 focus:ring-[#4988C4]"
            />
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

  const [mathValues, setMathValues] = useState({});
  const [mathResults, setMathResults] = useState({});
  const setMathField = (formulaId, fieldKey, val) => {
    setMathValues((v) => ({ ...v, [`${formulaId}.${fieldKey}`]: val }));
  };
  const calcFormula = (formula) => {
    const values = {};
    formula.inputs.forEach((inp) => { values[inp.key] = mathValues[`${formula.id}.${inp.key}`] || ''; });
    setMathResults((r) => ({ ...r, [formula.id]: formula.compute(values) }));
  };

  const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d }) : '-');

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

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {MATH_FORMULAS.map((formula) => {
              const values = {};
              formula.inputs.forEach((inp) => { values[inp.key] = mathValues[`${formula.id}.${inp.key}`] || ''; });
              const rawResult = mathResults[formula.id];
              const resolvedResult = Array.isArray(rawResult)
                ? rawResult.map((r) => ({ label: t.calcTools[r.labelKey], value: fmt(r.value, r.decimals ?? 2) }))
                : rawResult;
              return (
                <FormulaCard
                  key={formula.id}
                  title={t.calcTools[formula.titleKey]}
                  formula={formula.formula}
                  calcLabel={t.catalog.calculate}
                  inputs={formula.inputs.map((inp) => ({ key: inp.key, label: t.calcTools[inp.labelKey] }))}
                  values={values}
                  onFieldChange={(key, val) => setMathField(formula.id, key, val)}
                  onCalculate={() => calcFormula(formula)}
                  result={resolvedResult}
                  emptyHint={t.calcTools.fillFormula}
                />
              );
            })}
          </div>
        </div>
      </AppLayout>
      <EngineerCalculatorFab />
    </>
  );
}

export default Calculator;
