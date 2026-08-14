import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import companyLogo from '../../assets/Logo.png';
import { useLang } from '../../context/languageStore.js';
import { LangToggle } from './LangToggle.jsx';
import { login } from '../../context/authStore.js';

function useClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

const SHOW_DEMO_ACCESS = true;

const DEMO_ACCOUNTS = [
  { name: 'Admin User', email: 'admin@enginspect.com', password: 'admin1234', role: 'Admin', avatarBg: 'bg-[#0F2854]', badge: 'bg-red-50 text-red-500 border border-red-100' },
  { name: 'วิศวกร ทดสอบ', email: 'engineer@enginspect.com', password: 'engineer1234', role: 'Engineer', avatarBg: 'bg-[#4988C4]', badge: 'bg-sky-50 text-sky-600 border border-sky-100' },
  { name: 'วิศวกร มานะ', email: 'mana@enginspect.com', password: 'engineer1234', role: 'Engineer', avatarBg: 'bg-[#4988C4]', badge: 'bg-sky-50 text-sky-600 border border-sky-100' },
];

function initialsOf(name) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function Login() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { lang, setLang, t } = useLang();
  const clock = useClock();

  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async () => {
    setLoggingIn(true);
    const user = await login(email, password);
    setLoggingIn(false);
    if (!user) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      return;
    }
    navigate('/home');
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="min-h-dvh w-full bg-animated-gradient flex flex-col items-center sm:justify-center font-sans relative overflow-x-hidden">

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
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <LangToggle lang={lang} setLang={setLang} />
          <span className="text-[10px] text-white/30 tracking-widest pointer-events-none">{clock}</span>
        </div>
      </div>

      {/* Logo + title — mobile keeps the original larger sizing; sm:+ (desktop) uses the smaller scale */}
      <div className="w-full max-w-[26rem] sm:max-w-[23rem] flex flex-col justify-center items-center relative pt-10 pb-6 sm:pt-0 sm:pb-4 z-10 shrink-0">
        <img
          src={companyLogo}
          alt="ENGINSPECT Logo"
          className="w-28 sm:w-24 h-auto object-contain mb-4 sm:mb-3 drop-shadow-lg"
          style={{ filter: 'drop-shadow(0 0 12px rgba(56,189,248,0.35))' }}
        />
        <h1
          className="text-3xl sm:text-2xl font-black text-white tracking-[0.22em] sm:tracking-[0.2em] text-center"
          style={{ fontFamily: "'Courier New', 'Lucida Console', monospace", textShadow: '0 0 20px rgba(56,189,248,0.4)' }}
        >
          ENGINSPECT<span className="login-cursor" />
        </h1>
        <p className="text-xs sm:text-[11px] text-[#38BDF8]/80 font-medium tracking-[0.18em] mt-2 sm:mt-1.5 uppercase">
          Energy Audit System
        </p>
        <p className="text-[11px] sm:text-[10px] text-white/30 tracking-widest mt-1 uppercase">
          SID-EN Co., Ltd.
        </p>
      </div>

      {/* Card */}
      <div className="login-glass w-full max-w-[26rem] sm:max-w-[23rem] rounded-t-[2.5rem] sm:rounded-[2rem] px-7 sm:px-6 pt-10 pb-9 sm:py-7 z-10 flex-1 sm:flex-none flex flex-col relative overflow-hidden">

        {/* Corner crosshair markers */}
        <span className="absolute top-3.5 left-3.5 w-4 h-4 border-t-[1.5px] border-l-[1.5px] border-[#38BDF8]/50 pointer-events-none" />
        <span className="absolute top-3.5 right-3.5 w-4 h-4 border-t-[1.5px] border-r-[1.5px] border-[#38BDF8]/50 pointer-events-none" />
        <span className="absolute bottom-3.5 left-3.5 w-4 h-4 border-b-[1.5px] border-l-[1.5px] border-[#38BDF8]/50 pointer-events-none" />
        <span className="absolute bottom-3.5 right-3.5 w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-[#38BDF8]/50 pointer-events-none" />

        {/* Quick demo access — vertical list, scrolls naturally with the mouse wheel / touch once it overflows */}
        {SHOW_DEMO_ACCESS && (
          <div className="bg-[#F4F7FC] rounded-2xl p-3.5 sm:p-3 mb-3.5 sm:mb-3">
            <p className="text-[11px] font-bold text-[#0F2854] tracking-wide mb-2.5 sm:mb-2">
              Quick Demo Access (Click to autofill):
            </p>
            <div className="flex flex-col gap-1.5 max-h-28 sm:max-h-32 overflow-y-auto pr-1">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="w-full flex items-center gap-1.5 sm:gap-2 bg-white rounded-xl px-2.5 sm:px-2 py-2 text-left border border-[#EEF3FB] hover:border-[#4988C4]/40 hover:shadow-sm transition-all shrink-0"
                >
                  <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${account.avatarBg} text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center shrink-0`}>
                    {initialsOf(account.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#0F2854] truncate leading-tight">{account.name}</p>
                    <p className="text-[11px] text-[#64748B] truncate leading-tight mt-0.5">{account.email}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full shrink-0 ${account.badge}`}>
                    {account.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form className="flex flex-col gap-6 sm:gap-5">

          {/* Email + password kept close together as one group so the password
              field sits right under email instead of drifting down with the
              same big gap the rest of the form spreads across. */}
          <div className="flex flex-col gap-5 sm:gap-4">

          {/* Email */}
          <div>
            <label className="block text-sm sm:text-xs font-bold text-[#0F2854] mb-2 sm:mb-1.5 tracking-wider uppercase">
              {t.emailLabel}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4988C4] pointer-events-none">
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="your@email.com"
                className="login-input w-full pl-11 pr-4 py-3.5 sm:py-3 rounded-xl text-base sm:text-sm font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm sm:text-xs font-bold text-[#0F2854] mb-2 sm:mb-1.5 tracking-wider uppercase">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4988C4] pointer-events-none">
                <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="login-input w-full pl-11 pr-12 py-3.5 sm:py-3 rounded-xl text-base sm:text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F2854] transition-colors"
              >
                {showPw ? (
                  <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-5 0-9.27-3.11-11-7.5a10.06 10.06 0 012.55-3.91M6.53 6.53A9.94 9.94 0 0112 4c5 0 9.27 3.11 11 7.5a10.06 10.06 0 01-4.13 5.36M1 1l22 22" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm sm:text-xs font-medium text-red-500 -mt-3">{error}</p>
          )}

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-[#CBD5E1] accent-[#0F2854] cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-[#64748B] cursor-pointer select-none">
                {t.remember}
              </label>
            </div>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm font-semibold text-[#4988C4] hover:text-[#0F2854] transition-colors tracking-wide"
            >
              {t.forgot}
            </button>
          </div>

          {/* Login button */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={loggingIn}
            className="w-full py-3.5 sm:py-3 rounded-xl font-bold text-base sm:text-sm text-white tracking-widest uppercase transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 mt-4 sm:mt-3 disabled:opacity-60 disabled:pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 55%, #38BDF8 100%)',
              boxShadow: '0 4px 20px rgba(15,40,84,0.35)',
              fontFamily: "'Courier New', monospace",
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 28px rgba(56,189,248,0.35)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,40,84,0.35)'}
          >
            {loggingIn ? '...' : t.loginBtn}
          </button>
          </div>
        </form>

        <p className="text-center text-[9px] text-[#94A3B8] tracking-[0.25em] uppercase mt-10 sm:mt-8"
          style={{ fontFamily: "'Courier New', monospace" }}>
          v2.1.0 · ENGINSPECT PLATFORM
        </p>
      </div>
    </div>
  );
}

export default Login;
