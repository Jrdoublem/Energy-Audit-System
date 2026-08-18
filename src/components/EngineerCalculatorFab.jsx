import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '../context/languageStore.js';
import { BackspaceIcon, CalculatorIcon, CloseIcon } from './icons';

const INITIAL_STATE = { display: '0', prevValue: null, operator: null, waitingForOperand: false };

function computeOp(op, a, b) {
  const numA = Number(a) || 0;
  const numB = Number(b) || 0;
  switch (op) {
    case '÷': return numB === 0 ? NaN : numA / numB;
    case '×': return numA * numB;
    case '−': return numA - numB;
    case '+': return numA + numB;
    default: return numB;
  }
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return 'Error';
  const rounded = parseFloat(Number(n).toFixed(10));
  return String(rounded);
}

function CalcButton({ label, onClick, className = '', style, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`h-14 sm:h-16 rounded-2xl text-xl sm:text-2xl font-bold flex items-center justify-center transition-transform active:scale-95 select-none touch-manipulation ${className}`}
    >
      {children ?? label}
    </button>
  );
}

// Floating quick-access calculator, mounted once in AppLayout so it's
// available on every authenticated page — the goal is an engineer never
// needs to alt-tab to an outside calculator while filling in a form.
function EngineerCalculatorFab() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(INITIAL_STATE);

  const inputDigit = (d) => {
    setState((s) => {
      if (s.waitingForOperand) return { ...s, display: d, waitingForOperand: false };
      if (s.display === '0') return { ...s, display: d };
      if (s.display.replace(/[-.]/g, '').length >= 14) return s;
      return { ...s, display: s.display + d };
    });
  };
  const inputDecimal = () => {
    setState((s) => {
      if (s.waitingForOperand) return { ...s, display: '0.', waitingForOperand: false };
      if (s.display.includes('.')) return s;
      return { ...s, display: `${s.display}.` };
    });
  };
  const clearAll = () => setState(INITIAL_STATE);
  const backspace = () => {
    setState((s) => {
      if (s.waitingForOperand) return s;
      return { ...s, display: s.display.length > 1 ? s.display.slice(0, -1) : '0' };
    });
  };
  const percent = () => setState((s) => ({ ...s, display: formatNumber(parseFloat(s.display) / 100) }));
  const sqrt = () => setState((s) => ({ ...s, display: formatNumber(Math.sqrt(parseFloat(s.display))) }));

  const performOperation = (nextOp) => {
    setState((s) => {
      const inputValue = parseFloat(s.display);
      if (s.prevValue == null) {
        return { display: s.display, prevValue: inputValue, operator: nextOp, waitingForOperand: true };
      }
      if (s.operator && !s.waitingForOperand) {
        const result = computeOp(s.operator, s.prevValue, inputValue);
        return { display: formatNumber(result), prevValue: result, operator: nextOp, waitingForOperand: true };
      }
      return { ...s, operator: nextOp, waitingForOperand: true };
    });
  };
  const handleEquals = () => {
    setState((s) => {
      if (s.operator == null || s.prevValue == null) return s;
      const inputValue = parseFloat(s.display);
      const result = computeOp(s.operator, s.prevValue, inputValue);
      return { display: formatNumber(result), prevValue: null, operator: null, waitingForOperand: true };
    });
  };

  const numClass = 'bg-gray-50 dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-100 dark:hover:bg-white/10';
  const opClass = 'bg-[#EAF4FC] dark:bg-white/10 text-[#4988C4] hover:bg-[#DCEBFA] dark:hover:bg-white/15';
  const fnClass = 'bg-gray-100 dark:bg-white/5 text-[#0F2854] dark:text-[#E7EEF7] hover:bg-gray-200 dark:hover:bg-white/10';
  const gradientStyle = { background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 60%, #4988C4 100%)' };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t.fabCalc.title}
        className="fixed right-4 sm:right-6 bottom-32 lg:bottom-6 z-30 w-14 h-14 rounded-full text-white shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
        style={gradientStyle}
      >
        <CalculatorIcon className="w-6 h-6" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 font-sans">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-[#111F35] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 sm:px-7 pt-5 sm:pt-6 pb-2 sm:pb-3">
              <p className="text-base sm:text-lg font-extrabold text-[#0F2854] dark:text-[#E7EEF7]">{t.fabCalc.title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 dark:text-[#7E93AF] transition-colors"
              >
                <CloseIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="px-6 sm:px-7">
              <div className="rounded-2xl bg-[#F4F7FC] dark:bg-white/5 border border-[#E4EBF6] dark:border-white/10 px-5 sm:px-6 py-5 sm:py-7 mb-4 sm:mb-5 text-right overflow-hidden">
                <p className="text-sm sm:text-base h-5 sm:h-6 text-gray-400 dark:text-[#7E93AF] truncate">
                  {state.operator ? `${formatNumber(state.prevValue)} ${state.operator}` : ' '}
                </p>
                <p className="text-4xl sm:text-5xl font-mono font-extrabold text-[#0F2854] dark:text-[#E7EEF7] truncate">{state.display}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 px-6 sm:px-7 pb-6 sm:pb-7">
              <CalcButton label="C" onClick={clearAll} className="bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20" />
              <CalcButton onClick={backspace} className={fnClass}><BackspaceIcon className="w-5 h-5" /></CalcButton>
              <CalcButton label="%" onClick={percent} className={fnClass} />
              <CalcButton label="÷" onClick={() => performOperation('÷')} className={opClass} />

              <CalcButton label="7" onClick={() => inputDigit('7')} className={numClass} />
              <CalcButton label="8" onClick={() => inputDigit('8')} className={numClass} />
              <CalcButton label="9" onClick={() => inputDigit('9')} className={numClass} />
              <CalcButton label="×" onClick={() => performOperation('×')} className={opClass} />

              <CalcButton label="4" onClick={() => inputDigit('4')} className={numClass} />
              <CalcButton label="5" onClick={() => inputDigit('5')} className={numClass} />
              <CalcButton label="6" onClick={() => inputDigit('6')} className={numClass} />
              <CalcButton label="−" onClick={() => performOperation('−')} className={opClass} />

              <CalcButton label="1" onClick={() => inputDigit('1')} className={numClass} />
              <CalcButton label="2" onClick={() => inputDigit('2')} className={numClass} />
              <CalcButton label="3" onClick={() => inputDigit('3')} className={numClass} />
              <CalcButton label="+" onClick={() => performOperation('+')} className={opClass} />

              <CalcButton label="√" onClick={sqrt} className={fnClass} />
              <CalcButton label="0" onClick={() => inputDigit('0')} className={numClass} />
              <CalcButton label="." onClick={inputDecimal} className={numClass} />
              <CalcButton label="=" onClick={handleEquals} className="text-white hover:opacity-90" style={gradientStyle} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default EngineerCalculatorFab;
