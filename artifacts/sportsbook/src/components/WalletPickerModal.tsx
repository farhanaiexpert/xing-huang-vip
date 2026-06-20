import { useId, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, Eye, EyeOff, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../lib/apiClient';
import { useAuth, AuthUser } from '../contexts/AuthContext';

interface WalletPickerModalProps {
  open: boolean;
  onClose: () => void;
}

type ModalScreen = 'auth' | 'forgot' | 'forgot-success';

// ── Forgot Password Panel ─────────────────────────────────────────────────────
function ForgotPasswordPanel({ onBack }: { onBack: () => void }) {
  const [email, setEmail]         = useState('');
  const [pw, setPw]               = useState('');
  const [pw2, setPw2]             = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pw !== pw2) { setError('Passwords do not match'); return; }
    if (pw.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim(), newPassword: pw });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-5 px-2 py-8 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, #00DFA9 0%, #009E78 100%)' }}
        >
          <CheckCircle2 className="w-8 h-8 text-[#0B0F14]" />
        </div>
        <div>
          <h3 className="text-[18px] font-black text-[#F8FAFC] mb-1">Password updated.</h3>
          <p className="text-[13px] text-[#64748B]">You can now sign in with your new password.</p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-3 rounded-xl font-bold text-[14px] text-[#0B0F14] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-bold text-[#F8FAFC] mb-1">Reset your password</h3>
        <p className="text-[12px] text-[#64748B]">Enter your email and choose a new password.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#00DFA9]/50 focus:bg-white/[0.06] transition-all"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="New password (min 8 characters)"
            value={pw}
            onChange={e => setPw(e.target.value)}
            required
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-10 py-3 text-[14px] text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#00DFA9]/50 focus:bg-white/[0.06] transition-all"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8] transition-colors"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={pw2}
            onChange={e => setPw2(e.target.value)}
            required
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-[14px] text-[#F8FAFC] placeholder-[#475569] outline-none focus:border-[#00DFA9]/50 focus:bg-white/[0.06] transition-all"
          />
        </div>
        {error && (
          <p className="text-[12px] text-red-400 font-medium px-1">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] text-[#0B0F14] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset Password'}
        </button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-[12px] text-[#64748B] hover:text-[#94A3B8] transition-colors py-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Sign In
      </button>
    </div>
  );
}

// ── Email Auth Panel ──────────────────────────────────────────────────────────
function EmailAuthPanel({ onSuccess, onForgotPassword }: { onSuccess: () => void; onForgotPassword: () => void }) {
  const { loginWithWallet } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [loginEmail, setLoginEmail]     = useState('');
  const [loginPw, setLoginPw]           = useState('');
  const [loginShowPw, setLoginShowPw]   = useState(false);
  const [loginError, setLoginError]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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
    if (regPw !== regPw2) { setRegError('Passwords do not match'); return; }
    if (regPw.length < 8) { setRegError('Password must be at least 8 characters'); return; }
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
      <div className="flex rounded-xl overflow-hidden border border-white/[0.07] bg-[#0A0E14] p-1 gap-1">
        {(['login', 'register'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setLoginError(''); setRegError(''); }}
            className={[
              'flex-1 py-2 rounded-lg text-[12px] font-bold transition-all',
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
          {/* Forgot password link */}
          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-center text-[12px] text-[#64748B] hover:text-[#94A3B8] transition-colors py-0.5"
          >
            Forgot password?
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
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [screen, setScreen] = useState<ModalScreen>('auth');

  useEffect(() => {
    if (open) setScreen('auth');
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
      'button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
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

  const title =
    screen === 'forgot' || screen === 'forgot-success' ? 'Reset Password' : 'Account Login';

  if (!open) return null;

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

        <div className="relative flex items-center justify-center px-6 pt-6 pb-4">
          {screen === 'forgot' && (
            <button
              onClick={() => setScreen('auth')}
              aria-label="Back"
              className="absolute left-4 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8]/60 transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h2 id={titleId} className="text-[15px] font-semibold tracking-wide text-[#94A3B8]">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#94A3B8]/60 transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-2 pb-6 sidebar-scroll">
          {screen === 'forgot' ? (
            <ForgotPasswordPanel onBack={() => setScreen('auth')} />
          ) : (
            <EmailAuthPanel
              onSuccess={onClose}
              onForgotPassword={() => setScreen('forgot')}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
