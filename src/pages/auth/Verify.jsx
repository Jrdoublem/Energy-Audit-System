import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import companyLogo from '../../assets/Logo.png';
import { useLang } from './translations.js';
import { LangToggle } from './LangToggle.jsx';

const RESEND_SECONDS = 60;

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function Verify() {
  const navigate = useNavigate();
  const location = useLocation();
  const clock = useClock();
  const { lang, setLang, t } = useLang();
  const nextPage = location.state?.next || '/login';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleChange = (index, value) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError('');
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6).split('');
    if (digits.length === 0) return;
    e.preventDefault();
    const next = [...code];
    digits.forEach((d, i) => { next[i] = d; });
    setCode(next);
    setError('');
    inputsRef.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleVerify = () => {
    if (code.some((d) => !d)) {
      setError('กรุณากรอกรหัสให้ครบ 6 หลัก');
      return;
    }
    navigate(nextPage);
  };

  const handleResend = () => {
    if (secondsLeft > 0) return;
    setSecondsLeft(RESEND_SECONDS);
    setCode(['', '', '', '', '', '']);
    setError('');
    inputsRef.current[0]?.focus();
  };

  return (
    <div className="min-h-screen w-full bg-animated-gradient flex flex-col items-center sm:justify-center font-sans relative overflow-x-hidden">

      {/* Tech grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-full h-[150%] top-[-25%] bg-tech-grid animate-grid-pan opacity-80" />
      </div>

      {/* Floating nodes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden select-none">
        <span className="login-node absolute top-[18%] left-[10%] w-1.5 h-1.5 rounded-full bg-[#38BDF8]/50" />
        <span className="login-node absolute top-[35%] right-[12%] w-2 h-2 rounded-full bg-[#4988C4]/40" />
        <span className="login-node absolute bottom-[25%] left-[18%] w-1 h-1 rounded-full bg-[#38BDF8]/60" />
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <line x1="10%" y1="18%" x2="30%" y2="50%" stroke="#38BDF8" strokeWidth="0.5" />
          <line x1="88%" y1="35%" x2="70%" y2="55%" stroke="#4988C4" strokeWidth="0.5" />
          <line x1="18%" y1="75%" x2="40%" y2="55%" stroke="#38BDF8" strokeWidth="0.5" />
        </svg>
      </div>

      {/* System status bar */}
      <div className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-5 py-2"
        style={{ fontFamily: "'Courier New', monospace" }}>
        <div className="flex items-center gap-1.5 pointer-events-none">
          <span className="status-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          <span className="text-[10px] text-emerald-400/80 tracking-widest uppercase">SYSTEM ONLINE</span>
        </div>
        <div className="flex items-center gap-3"><LangToggle lang={lang} setLang={setLang} /><span className="text-[10px] text-white/30 tracking-widest pointer-events-none">{clock}</span></div>
      </div>

      {/* Logo + title */}
      <div className="w-full max-w-md flex flex-col justify-center items-center relative pt-10 pb-6 sm:pt-0 sm:pb-7 z-10 shrink-0">
        <img
          src={companyLogo}
          alt="ENGINSPECT Logo"
          className="w-24 sm:w-32 h-auto object-contain mb-5 drop-shadow-lg"
          style={{ filter: 'drop-shadow(0 0 12px rgba(56,189,248,0.35))' }}
        />
        <h1
          className="text-3xl sm:text-4xl font-black text-white tracking-[0.22em] text-center"
          style={{ fontFamily: "'Courier New', 'Lucida Console', monospace", textShadow: '0 0 20px rgba(56,189,248,0.4)' }}
        >
          ENGINSPECT<span className="login-cursor" />
        </h1>
        <p className="text-sm sm:text-base text-[#38BDF8]/80 font-medium tracking-[0.18em] mt-2 uppercase">
          Energy Audit System
        </p>
        <p className="text-xs text-white/30 tracking-widest mt-1 uppercase">
          SID-EN Co., Ltd.
        </p>
      </div>

      {/* Card */}
      <div className="login-glass w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2rem] px-8 pt-9 pb-10 sm:py-10 z-10 flex-1 sm:flex-none flex flex-col relative overflow-hidden">

        {/* Corner crosshair markers */}
        <span className="absolute top-3.5 left-3.5 w-4 h-4 border-t-[1.5px] border-l-[1.5px] border-[#38BDF8]/50 pointer-events-none" />
        <span className="absolute top-3.5 right-3.5 w-4 h-4 border-t-[1.5px] border-r-[1.5px] border-[#38BDF8]/50 pointer-events-none" />
        <span className="absolute bottom-3.5 left-3.5 w-4 h-4 border-b-[1.5px] border-l-[1.5px] border-[#38BDF8]/50 pointer-events-none" />
        <span className="absolute bottom-3.5 right-3.5 w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-[#38BDF8]/50 pointer-events-none" />

        {/* Email icon */}
        <div className="flex justify-center mb-4">
          <svg className="w-10 h-10 text-[#38BDF8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.4))' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>

        <h2 className="text-3xl font-extrabold text-[#0F2854] mb-2 tracking-wide text-center"
          style={{ fontFamily: "'Courier New', monospace" }}>
          {t.checkEmail}
        </h2>
        <p className="text-sm text-[#64748B] text-center mb-7 leading-relaxed">
          {t.checkEmailDesc}
        </p>

        {/* OTP inputs */}
        <div className="flex gap-2 sm:gap-3 mb-2">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              autoFocus={i === 0}
              className={`flex-1 aspect-square min-w-0 text-center rounded-xl font-bold text-xl transition-all outline-none ${
                error
                  ? 'border-2 border-red-400 bg-red-50'
                  : digit
                  ? 'border-2 border-[#38BDF8] bg-white text-[#0F2854]'
                  : 'border-2 border-[#CBD5E1] bg-white text-[#0F2854]'
              }`}
              style={digit ? { boxShadow: '0 0 0 3px rgba(56,189,248,0.15)' } : {}}
            />
          ))}
        </div>

        <p className={`text-center text-xs text-red-500 mb-5 transition-opacity ${error ? 'opacity-100' : 'opacity-0'}`}>
          {error || ' '}
        </p>

        {/* Verify button */}
        <button
          type="button"
          onClick={handleVerify}
          className="w-full py-4 rounded-xl font-bold text-lg text-white tracking-widest uppercase transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 mb-5"
          style={{
            background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 55%, #38BDF8 100%)',
            boxShadow: '0 4px 20px rgba(15,40,84,0.35)',
            fontFamily: "'Courier New', monospace",
          }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 28px rgba(56,189,248,0.35)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,40,84,0.35)'}
        >
          {t.verify}
        </button>

        <p className="text-center text-sm text-[#64748B]">
          {t.notReceived}{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={secondsLeft > 0}
            className={`font-bold transition-colors ${
              secondsLeft > 0
                ? 'text-[#94A3B8] cursor-not-allowed'
                : 'text-[#0F2854] hover:text-[#1C4D8D]'
            }`}
          >
            {t.resend}{secondsLeft > 0 ? ` (${secondsLeft}s)` : ''}
          </button>
        </p>

        <div className="text-center text-sm text-[#64748B] mt-4">
          {t.wrongEmail}{' '}
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-[#0F2854] hover:text-[#1C4D8D] font-bold transition-colors"
          >
            {t.backEdit}
          </button>
        </div>

        <p className="text-center text-[9px] text-[#94A3B8] tracking-[0.25em] uppercase mt-6"
          style={{ fontFamily: "'Courier New', monospace" }}>
          v2.1.0 · ENGINSPECT PLATFORM
        </p>
      </div>
    </div>
  );
}

export default Verify;
