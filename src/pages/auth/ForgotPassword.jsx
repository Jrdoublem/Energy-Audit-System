import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import companyLogo from '../../assets/Logo.png';
import { useLang } from '../../context/languageStore.js';
import { LangToggle } from './LangToggle.jsx';
import { ArrowRightIcon } from '../../components/icons';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    if (!EMAIL_RE.test(email)) {
      setError(t.forgotErrEmail);
      return;
    }
    setSending(true);
    navigate('/verify', { state: { next: '/reset-password', email } });
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

      {/* Language toggle */}
      <div className="fixed top-4 right-5 z-20">
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <div className="w-full max-w-md flex-1 sm:flex-none flex flex-col justify-center z-10 px-4 py-10">
        <div className="flex justify-center mb-6">
          <img
            src={companyLogo}
            alt="ENGINSPECT Logo"
            className="w-28 h-auto object-contain drop-shadow-lg"
            style={{ filter: 'drop-shadow(0 0 12px rgba(56,189,248,0.35))' }}
          />
        </div>

        <div className="login-glass rounded-3xl px-9 py-10 relative overflow-hidden">

          {/* Corner crosshair markers */}
          <span className="absolute top-3.5 left-3.5 w-4 h-4 border-t-[1.5px] border-l-[1.5px] border-[#38BDF8]/50 pointer-events-none" />
          <span className="absolute top-3.5 right-3.5 w-4 h-4 border-t-[1.5px] border-r-[1.5px] border-[#38BDF8]/50 pointer-events-none" />
          <span className="absolute bottom-3.5 left-3.5 w-4 h-4 border-b-[1.5px] border-l-[1.5px] border-[#38BDF8]/50 pointer-events-none" />
          <span className="absolute bottom-3.5 right-3.5 w-4 h-4 border-b-[1.5px] border-r-[1.5px] border-[#38BDF8]/50 pointer-events-none" />

          <h1 className="text-3xl font-extrabold text-[#0F2854] text-center mb-2">
            {t.forgotTitle}
          </h1>
          <p className="text-base text-[#64748B] text-center mb-8 leading-relaxed">
            {t.forgotDesc}
          </p>

          <label className="block text-sm font-bold text-[#0F2854] tracking-wider uppercase mb-2">
            {t.emailLabel}
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4988C4] pointer-events-none">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="name@company.com"
              className="login-input w-full pl-11 pr-4 py-3.5 rounded-xl text-base font-medium"
            />
          </div>
          {error && <p className="text-sm font-medium text-red-500 mt-2">{error}</p>}

          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="w-full mt-6 py-4 rounded-xl font-bold text-lg text-white tracking-wide flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, #0F2854 0%, #1C4D8D 55%, #38BDF8 100%)',
              boxShadow: '0 4px 20px rgba(15,40,84,0.35)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 28px rgba(56,189,248,0.35)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,40,84,0.35)'}
          >
            {sending ? '...' : (
              <>
                {t.send}
                <ArrowRightIcon className="w-5 h-5" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full flex items-center justify-center gap-2 text-base font-semibold text-[#64748B] hover:text-[#0F2854] transition-colors mt-7"
          >
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
            {t.backLogin}
          </button>
        </div>

        <p className="text-center text-[9px] text-white/30 tracking-[0.25em] uppercase mt-6"
          style={{ fontFamily: "'Courier New', monospace" }}>
          v2.1.0 · ENGINSPECT PLATFORM
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
