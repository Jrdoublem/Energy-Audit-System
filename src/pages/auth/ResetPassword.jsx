import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import companyLogo from '../../assets/Logo.png';
import { useLang } from '../../context/languageStore.js';
import { LangToggle } from './LangToggle.jsx';

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function ResetPassword() {
  const navigate = useNavigate();
  const clock = useClock();
  const { lang, setLang, t } = useLang();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = () => {
    setShowToast(true);
    setTimeout(() => navigate('/login'), 1500);
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

        {/* Key icon */}
        <div className="flex justify-center mb-4">
          <svg className="w-10 h-10 text-[#38BDF8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.4))' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        <h2 className="text-3xl font-extrabold text-[#0F2854] mb-2 tracking-wide text-center"
          style={{ fontFamily: "'Courier New', monospace" }}>
          {t.resetTitle}
        </h2>
        <p className="text-sm text-[#64748B] text-center mb-7 leading-relaxed">
          {t.resetDesc}
        </p>

        <form className="flex flex-col gap-5">

          {/* New Password */}
          <div>
            <label className="block text-sm font-bold text-[#0F2854] mb-2 tracking-wider uppercase">
              {t.newPasswordLabel}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4988C4] pointer-events-none">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                className="login-input w-full pl-11 pr-12 py-3.5 rounded-xl text-base font-medium"
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F2854] transition-colors">
                {showPw ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-5 0-9.27-3.11-11-7.5a10.06 10.06 0 012.55-3.91M6.53 6.53A9.94 9.94 0 0112 4c5 0 9.27 3.11 11 7.5a10.06 10.06 0 01-4.13 5.36M1 1l22 22" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-bold text-[#0F2854] mb-2 tracking-wider uppercase">
              {t.confirmPasswordLabel}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4988C4] pointer-events-none">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                className="login-input w-full pl-11 pr-12 py-3.5 rounded-xl text-base font-medium"
              />
              <button type="button" onClick={() => setShowConfirm(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F2854] transition-colors">
                {showConfirm ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-5 0-9.27-3.11-11-7.5a10.06 10.06 0 012.55-3.91M6.53 6.53A9.94 9.94 0 0112 4c5 0 9.27 3.11 11 7.5a10.06 10.06 0 01-4.13 5.36M1 1l22 22" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-4 rounded-xl font-bold text-lg text-white tracking-widest uppercase transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 mt-1"
            style={{
              background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 55%, #38BDF8 100%)',
              boxShadow: '0 4px 20px rgba(15,40,84,0.35)',
              fontFamily: "'Courier New', monospace",
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 28px rgba(56,189,248,0.35)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,40,84,0.35)'}
          >
            {t.confirm}
          </button>
        </form>

        <div className="text-center text-sm text-[#64748B] mt-6">
          <button
            onClick={() => navigate('/login')}
            className="text-[#0F2854] hover:text-[#1C4D8D] font-bold transition-colors flex items-center gap-1 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            {t.backToLogin}
          </button>
        </div>

        <p className="text-center text-[9px] text-[#94A3B8] tracking-[0.25em] uppercase mt-6"
          style={{ fontFamily: "'Courier New', monospace" }}>
          v2.1.0 · ENGINSPECT PLATFORM
        </p>
      </div>

      {showToast && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="bg-[#F7F8F0] rounded-3xl shadow-2xl w-full max-w-xs px-6 sm:px-10 py-8 sm:py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg className="w-9 h-9 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-base sm:text-lg font-bold text-[#0F2854] leading-snug">บันทึกข้อมูลเรียบร้อย</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResetPassword;
