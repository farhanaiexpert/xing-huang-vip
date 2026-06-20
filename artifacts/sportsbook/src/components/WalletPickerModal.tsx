import { useId, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../lib/apiClient';
import { useAuth, AuthUser } from '../contexts/AuthContext';

type WalletTag = 'full' | 'dapp';

interface WalletOption {
  name: string;
  icon: string;
  tag: WalletTag;
}

const WALLETS: WalletOption[] = [
  { name: 'TronLink',    icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TronLink.png',                                  tag: 'full' },
  { name: 'OKX',         icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/OKX.svg',                                       tag: 'full' },
  { name: 'Bitget',      icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/BitGet.svg',                                    tag: 'full' },
  { name: 'imToken',     icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/imToken.svg',                                   tag: 'dapp' },
  { name: 'TokenPocket', icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TokenPocket.svg',                               tag: 'dapp' },
  { name: 'Trust',       icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/TrustWallet.svg',                               tag: 'dapp' },
  { name: 'Portal',      icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/Portal.svg',                                    tag: 'dapp' },
  { name: 'FoxWallet',   icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/FoxWallet.svg',                                 tag: 'dapp' },
  { name: 'BitPie',      icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/e8570352728f9524148d395e9b9f39ed_icon.png',     tag: 'dapp' },
  { name: 'MetaMask',    icon: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/MetaMask.svg',                                  tag: 'dapp' },
];

const COLLAPSED_COUNT = 4;

interface WalletPickerModalProps {
  open: boolean;
  onClose: () => void;
}

function WalletIcon({ name, icon }: { name: string; icon: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/[0.06] text-sm font-black text-[#00DFA9]">
        {name.charAt(0)}
      </div>
    );
  }
  return (
    <img
      src={icon}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-contain"
    />
  );
}

function WalletRow({ wallet }: { wallet: WalletOption }) {
  return (
    <a
      href="#"
      onClick={e => e.preventDefault()}
      className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5 transition-all duration-200 hover:border-[#00DFA9]/40 hover:bg-white/[0.05] active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
        <WalletIcon name={wallet.name} icon={wallet.icon} />
      </span>
      <span className="text-[15px] font-bold tracking-tight text-[#F8FAFC] group-hover:text-white">
        {wallet.name}
      </span>
      {wallet.tag === 'full' ? (
        <span className="ml-auto rounded-md border border-[#00DFA9]/30 bg-[#00DFA9]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00DFA9]">
          Full Support
        </span>
      ) : (
        <span className="ml-auto text-[11px] font-semibold text-[#94A3B8]/55">
          DApp Browser
        </span>
      )}
    </a>
  );
}

// ── Email Auth Panel ──────────────────────────────────────────────────────────
function EmailAuthPanel({ onSuccess }: { onSuccess: () => void }) {
  const { loginWithWallet } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login state
  const [loginEmail, setLoginEmail]     = useState('');
  const [loginPw, setLoginPw]           = useState('');
  const [loginShowPw, setLoginShowPw]   = useState(false);
  const [loginError, setLoginError]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regEmail, setRegEmail]       = useState('');
  const [regPw, setRegPw]             = useState('');
  const [regPw2, setRegPw2]           = useState('');
  const [regShowPw, setRegShowPw]     = useState(false);
  const [regError, setRegError]       = useState('');
  const [regLoading, setRegLoading]   = useState(false);
  const [regSuccess, setRegSuccess]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/login', { email: loginEmail.trim(), password: loginPw }
      );
      loginWithWallet(data.accessToken, data.refreshToken, data.user);
      onSuccess();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError('');
    if (regPw !== regPw2) {
      setRegError('Passwords do not match');
      return;
    }
    if (regPw.length < 8) {
      setRegError('Password must be at least 8 characters');
      return;
    }
    setRegLoading(true);
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/register', { email: regEmail.trim(), password: regPw }
      );
      loginWithWallet(data.accessToken, data.refreshToken, data.user);
      setRegSuccess(true);
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  }

  // Registration success view
  if (regSuccess) {
    return (
      <div className="flex flex-col items-center gap-5 px-2 py-8 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, #00DFA9 0%, #009E78 100%)' }}
        >
          <CheckCircle2 className="w-8 h-8 text-[#0B0F14]" />
        </div>
        <div>
          <h3 className="text-[18px] font-black text-[#F8FAFC] mb-1">Registration successful.</h3>
          <p className="text-[13px] text-[#64748B]">Your account has been created and you're now signed in.</p>
        </div>
        <button
          onClick={onSuccess}
          className="w-full py-3 rounded-xl font-bold text-[14px] text-[#0B0F14] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
        >
          Start Playing →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border border-white/[0.07] bg-[#0A0E14] p-1 gap-1">
        {(['login', 'register'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setLoginError(''); setRegError(''); }}
            className={[
              'flex-1 py-2 rounded-lg text-[12px] font-bold transition-all capitalize',
              mode === m
                ? 'bg-[#00DFA9] text-[#0B0F14] shadow-[0_0_12px_rgba(0,223,169,0.25)]'
                : 'text-[#64748B] hover:text-[#94A3B8]',
            ].join(' ')}
          >
            {m === 'login' ? 'Sign In' : 'Register'}
          </button>
        ))}
      </div>

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
            <input
              type="email"
              placeholder="Email address"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#00DFA9]/50 focus:bg-white/[0.06] transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
            <input
              type={loginShowPw ? 'text' : 'password'}
              placeholder="Password"
              value={loginPw}
              onChange={e => setLoginPw(e.target.value)}
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-[14px] text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#00DFA9]/50 focus:bg-white/[0.06] transition-all"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setLoginShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8] transition-colors"
            >
              {loginShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {loginError && (
            <p className="text-[12px] text-red-400 font-medium px-1">{loginError}</p>
          )}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] text-[#0B0F14] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
          >
            {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
            <input
              type="email"
              placeholder="Email address"
              value={regEmail}
              onChange={e => setRegEmail(e.target.value)}
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#00DFA9]/50 focus:bg-white/[0.06] transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
            <input
              type={regShowPw ? 'text' : 'password'}
              placeholder="Password (min 8 characters)"
              value={regPw}
              onChange={e => setRegPw(e.target.value)}
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-[14px] text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#00DFA9]/50 focus:bg-white/[0.06] transition-all"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setRegShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8] transition-colors"
            >
              {regShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
            <input
              type={regShowPw ? 'text' : 'password'}
              placeholder="Confirm password"
              value={regPw2}
              onChange={e => setRegPw2(e.target.value)}
              required
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#00DFA9]/50 focus:bg-white/[0.06] transition-all"
            />
          </div>
          {regError && (
            <p className="text-[12px] text-red-400 font-medium px-1">{regError}</p>
          )}
          <button
            type="submit"
            disabled={regLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] text-[#0B0F14] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
          >
            {regLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
          </button>
          <p className="text-[10px] text-[#475569] text-center leading-relaxed">
            By registering you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function WalletPickerModal({ open, onClose }: WalletPickerModalProps) {
  const [tab, setTab] = useState<'email' | 'wallet'>('email');
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) { setExpanded(false); setTab('email'); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  const visible = expanded ? WALLETS : WALLETS.slice(0, COLLAPSED_COUNT);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-[#05080C]/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative flex max-h-[92vh] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-white/[0.08] outline-none"
        style={{
          background: 'linear-gradient(180deg, #0E141B 0%, #0B0F14 100%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 90px rgba(0,0,0,0.75), 0 0 60px rgba(0,223,169,0.06)',
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00DFA9]/40 to-transparent" />

        {/* Header */}
        <div className="relative flex items-center justify-center px-6 pt-6 pb-4">
          <h2 id={titleId} className="text-[15px] font-semibold tracking-wide text-[#94A3B8]">
            {tab === 'email' ? 'Account Login' : 'Connect your wallet'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8]/60 transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pb-3">
          <div className="flex rounded-xl overflow-hidden border border-white/[0.07] bg-[#0A0E14] p-1 gap-1">
            <button
              onClick={() => setTab('email')}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all',
                tab === 'email'
                  ? 'bg-[#00DFA9] text-[#0B0F14] shadow-[0_0_12px_rgba(0,223,169,0.25)]'
                  : 'text-[#64748B] hover:text-[#94A3B8]',
              ].join(' ')}
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
            <button
              onClick={() => setTab('wallet')}
              className={[
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all',
                tab === 'wallet'
                  ? 'bg-[#00DFA9] text-[#0B0F14] shadow-[0_0_12px_rgba(0,223,169,0.25)]'
                  : 'text-[#64748B] hover:text-[#94A3B8]',
              ].join(' ')}
            >
              <span className="text-[13px]">₿</span> Crypto Wallet
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2.5 overflow-y-auto px-5 py-2 pb-5 sidebar-scroll">
          {tab === 'email' ? (
            <EmailAuthPanel onSuccess={onClose} />
          ) : (
            <>
              {visible.map(w => (
                <WalletRow key={w.name} wallet={w} />
              ))}
              <button
                onClick={() => setExpanded(v => !v)}
                className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] py-3 text-[13px] font-semibold text-[#94A3B8] transition-all duration-200 hover:border-[#00DFA9]/30 hover:text-[#F8FAFC]"
              >
                {expanded ? 'Show less' : `Show more (${WALLETS.length - COLLAPSED_COUNT})`}
              </button>
              <div className="pt-1 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-[#94A3B8]/30">
                TRON Network
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
