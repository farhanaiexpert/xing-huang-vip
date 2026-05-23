import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { User, Lock, Mail, AlertCircle, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

interface LoginModalProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?:   () => void;
}

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const { login, register } = useAuth();
  const [tab,          setTab]          = useState<'signin' | 'register'>('signin');
  const [username,     setUsername]     = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  function reset() {
    setUsername(''); setEmail(''); setPassword(''); setError(''); setShowPassword(false);
  }

  function switchTab(t: 'signin' | 'register') { setTab(t); setError(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signin') {
        await login(username, password);
      } else {
        await register(username, password, email || undefined);
      }
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[400px] bg-[#0D1117] border border-[#253241] text-[#F8FAFC] shadow-[0_24px_80px_rgba(0,0,0,0.8)] p-0 gap-0 overflow-hidden">

        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#253241]">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/cupbetlogo-1.webp"
              alt="CupBett"
              className="h-7 w-auto object-contain"
            />
          </div>
          <DialogTitle className="text-lg font-bold text-[#F8FAFC]">
            {tab === 'signin' ? 'Sign In to CupBett' : 'Create Account'}
          </DialogTitle>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            {tab === 'signin' ? 'Welcome back. Enter your credentials.' : 'Start betting in seconds.'}
          </p>
        </DialogHeader>

        <div className="flex bg-[#0B0F14] border-b border-[#253241] p-1 gap-0.5 mx-6 mt-4 rounded-xl">
          {(['signin', 'register'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                tab === t
                  ? 'bg-[#18212B] text-[#F8FAFC] shadow-sm'
                  : 'text-[#94A3B8]/60 hover:text-[#94A3B8]'
              )}
            >
              {t === 'signin'
                ? <><LogIn className="h-3.5 w-3.5" />Sign In</>
                : <><UserPlus className="h-3.5 w-3.5" />Register</>
              }
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3.5">

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/40 pointer-events-none" />
              <Input
                type="text"
                placeholder="Enter username…"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
                className="pl-9 bg-[#0B0F14] border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-1 focus-visible:ring-[#00DFA9]/40 focus-visible:border-[#00DFA9]/50"
              />
            </div>
          </div>

          {tab === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                Email <span className="normal-case font-normal text-[#94A3B8]/40">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/40 pointer-events-none" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  className="pl-9 bg-[#0B0F14] border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-1 focus-visible:ring-[#00DFA9]/40 focus-visible:border-[#00DFA9]/50"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/40 pointer-events-none" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password…"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                className="pl-9 pr-10 bg-[#0B0F14] border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-1 focus-visible:ring-[#00DFA9]/40 focus-visible:border-[#00DFA9]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]/40 hover:text-[#94A3B8] transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {tab === 'register' && (
              <p className="text-[10px] text-[#94A3B8]/40">Minimum 8 characters</p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-[#EF4444] bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl font-bold text-sm bg-[#00DFA9] text-[#0B0F14] hover:brightness-110 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading
              ? (tab === 'signin' ? 'Signing in…' : 'Creating account…')
              : (tab === 'signin' ? 'Sign In' : 'Create Account')
            }
          </button>

          <p className="text-[10px] text-[#94A3B8]/40 text-center leading-relaxed">
            18+ · Gamble responsibly
          </p>
        </form>

      </DialogContent>
    </Dialog>
  );
}
