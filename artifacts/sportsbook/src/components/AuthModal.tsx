import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Mail, Lock, User, Gift, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export function AuthModal({ open, onClose, defaultTab = 'login' }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab]           = useState<'login' | 'register'>(defaultTab);
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [refCode, setRefCode]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  if (!open) return null;

  function resetForm() {
    setEmail(''); setUsername(''); setPassword(''); setRefCode('');
    setError(''); setShowPass(false);
  }

  function switchTab(t: 'login' | 'register') {
    setTab(t); resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(email, username, password, refCode || undefined);
      }
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0B0F14]/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#253241] shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
        style={{ background: 'linear-gradient(160deg, #0D1520 0%, #0B1219 100%)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A3B8]/40 hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Logo area */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-[#253241]/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ background: 'linear-gradient(135deg,#00DFA9,#00A882)', boxShadow: '0 0 24px rgba(0,223,169,0.3)' }}>
            <span className="text-[#0B0F14] font-black text-xl">C</span>
          </div>
          <h2 className="text-lg font-black text-[#F8FAFC] tracking-tight">
            {tab === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-xs text-[#94A3B8]/50 mt-1">
            {tab === 'login' ? 'Sign in to your CupBett account' : 'Join CupBett and start betting'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 p-4 pb-0">
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
                tab === t
                  ? 'bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/20'
                  : 'text-[#94A3B8]/50 hover:text-[#94A3B8]'
              )}
            >
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 pt-5 flex flex-col gap-3.5">
          {/* Email */}
          <Field icon={<Mail className="h-4 w-4" />} label="Email">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/30 outline-none"
            />
          </Field>

          {/* Username — register only */}
          {tab === 'register' && (
            <Field icon={<User className="h-4 w-4" />} label="Username">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="coolbettor"
                required
                minLength={3}
                className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/30 outline-none"
              />
            </Field>
          )}

          {/* Password */}
          <Field icon={<Lock className="h-4 w-4" />} label="Password">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={tab === 'register' ? 'Min. 8 characters' : '••••••••'}
              required
              minLength={tab === 'register' ? 8 : 1}
              className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/30 outline-none"
            />
            <button type="button" onClick={() => setShowPass(v => !v)} className="text-[#94A3B8]/40 hover:text-[#94A3B8] transition-colors">
              {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </Field>

          {/* Referral code — register only */}
          {tab === 'register' && (
            <Field icon={<Gift className="h-4 w-4" />} label="Referral code (optional)">
              <input
                type="text"
                value={refCode}
                onChange={e => setRefCode(e.target.value.toUpperCase())}
                placeholder="e.g. IHFFXMRP"
                className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/30 outline-none"
              />
            </Field>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full h-11 rounded-xl text-[#0B0F14] text-sm font-black tracking-tight transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#00DFA9 0%,#00C49A 60%,#00A882 100%)', boxShadow: '0 0 24px rgba(0,223,169,0.25)' }}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {tab === 'login' ? 'Signing in…' : 'Creating account…'}</>
            ) : (
              tab === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>

          {/* Switch tab hint */}
          <p className="text-center text-xs text-[#94A3B8]/40">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
              className="text-[#00DFA9] hover:underline font-semibold"
            >
              {tab === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#94A3B8]/50 uppercase tracking-widest ml-1 mb-1.5 block">{label}</span>
      <div className="flex items-center gap-2.5 px-3.5 h-11 rounded-xl border border-[#253241] bg-white/[0.03] focus-within:border-[#00DFA9]/40 focus-within:bg-[#00DFA9]/[0.03] transition-all duration-150">
        <span className="text-[#94A3B8]/40 shrink-0">{icon}</span>
        {children}
      </div>
    </label>
  );
}
