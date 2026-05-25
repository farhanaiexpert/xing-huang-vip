import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  User, Lock, BarChart2, ShieldCheck, Calendar,
  Eye, EyeOff, CheckCircle2, Loader2, Copy, Check,
} from 'lucide-react';
import type { OddsFormat } from '@/lib/oddsFormat';

const ODDS_OPTIONS: { value: OddsFormat; label: string; desc: string }[] = [
  { value: 'decimal',    label: 'Decimal',    desc: '2.50'     },
  { value: 'fractional', label: 'Fractional', desc: '3/2'      },
  { value: 'american',   label: 'American',   desc: '+150'     },
];

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { format, setFormat } = useOddsFormat();
  const { toast } = useToast();

  // Username form
  const [username, setUsername] = useState(user?.username ?? '');
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');

  // Password form
  const [curPwd, setCurPwd]     = useState('');
  const [newPwd, setNewPwd]     = useState('');
  const [cfmPwd, setCfmPwd]     = useState('');
  const [showCur, setShowCur]   = useState(false);
  const [showNew, setShowNew]   = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // Referral copy
  const [copiedRef, setCopiedRef] = useState(false);

  async function handleSaveUsername() {
    const clean = username.trim();
    if (clean.length < 3) { setUserError('Username must be at least 3 characters'); return; }
    if (clean === user?.username) { setUserError('No change'); return; }
    setSavingUser(true);
    setUserError('');
    try {
      const updated = await api.patch<{ username: string }>('/auth/update-profile', { username: clean });
      updateUser({ username: updated.username });
      toast({ title: 'Username updated', description: `New username: ${updated.username}` });
    } catch (e: unknown) {
      setUserError(e instanceof Error ? e.message : 'Failed to update username');
    } finally {
      setSavingUser(false);
    }
  }

  async function handleChangePassword() {
    if (!curPwd) { setPwdError('Enter your current password'); return; }
    if (newPwd.length < 8) { setPwdError('New password must be at least 8 characters'); return; }
    if (newPwd !== cfmPwd) { setPwdError('Passwords do not match'); return; }
    setSavingPwd(true);
    setPwdError('');
    try {
      await api.post('/auth/change-password', { currentPassword: curPwd, newPassword: newPwd });
      setCurPwd(''); setNewPwd(''); setCfmPwd('');
      toast({ title: 'Password changed', description: 'Your password has been updated.' });
    } catch (e: unknown) {
      setPwdError(e instanceof Error ? e.message : 'Failed to change password');
    } finally {
      setSavingPwd(false);
    }
  }

  function handleCopyRef() {
    if (!user?.referralCode) return;
    navigator.clipboard.writeText(user.referralCode).catch(() => {});
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    toast({ title: 'Referral code copied!' });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-[16px] font-bold text-[#F8FAFC]">Account Settings</h2>

      {/* ── Profile info (read-only) ── */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-[#0A0F16]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#00DFA9]" />
          <p className="text-[12px] font-bold text-[#F8FAFC]">Account Info</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-1.5">Email</p>
            <p className="text-[13px] text-[#F8FAFC]">{user?.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-1.5">Member Since</p>
            <div className="flex items-center gap-1.5 text-[13px] text-[#F8FAFC]">
              <Calendar className="h-3 w-3 text-[#64748B]" />
              {fmtDate(user?.createdAt)}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-1.5">KYC Status</p>
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border',
              user?.kycStatus === 'verified'
                ? 'bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/25'
                : 'bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20'
            )}>
              <ShieldCheck className="h-2.5 w-2.5" />
              {user?.kycStatus === 'verified' ? 'Verified' : 'Unverified'}
            </div>
          </div>
          {user?.referralCode && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] mb-1.5">Referral Code</p>
              <button
                onClick={handleCopyRef}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#00DFA9]/25 bg-[#00DFA9]/6 hover:bg-[#00DFA9]/12 transition-all cursor-pointer"
              >
                <span className="text-[13px] font-black text-[#00DFA9] font-mono tracking-widest">{user.referralCode}</span>
                {copiedRef ? <Check className="h-3 w-3 text-[#00DFA9]" /> : <Copy className="h-3 w-3 text-[#00DFA9]/60" />}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Change username ── */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-[#0A0F16]">
          <User className="h-3.5 w-3.5 text-[#38BDF8]" />
          <p className="text-[12px] font-bold text-[#F8FAFC]">Change Username</p>
        </div>
        <div className="p-5 space-y-3.5">
          <div>
            <label className="text-[11px] font-semibold text-[#64748B] mb-1.5 block">Username</label>
            <input
              value={username}
              onChange={e => { setUsername(e.target.value); setUserError(''); }}
              maxLength={30}
              className={cn(
                'w-full px-4 py-3 rounded-xl bg-[#0A0F16] border text-[13px] text-[#F8FAFC] outline-none transition-all',
                userError ? 'border-[#EF4444]/50 focus:border-[#EF4444]' : 'border-white/[0.08] focus:border-[#38BDF8]/50'
              )}
              placeholder="Enter new username"
            />
            {userError && <p className="text-[11px] text-[#EF4444] mt-1.5">{userError}</p>}
          </div>
          <button
            onClick={handleSaveUsername}
            disabled={savingUser || username.trim() === user?.username}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-[#0B0F14] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)' }}
          >
            {savingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Username
          </button>
        </div>
      </section>

      {/* ── Change password ── */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-[#0A0F16]">
          <Lock className="h-3.5 w-3.5 text-[#A78BFA]" />
          <p className="text-[12px] font-bold text-[#F8FAFC]">Change Password</p>
        </div>
        <div className="p-5 space-y-3.5">
          {[
            { label: 'Current Password', value: curPwd, set: setCurPwd, show: showCur, toggle: () => setShowCur(v => !v) },
            { label: 'New Password',     value: newPwd, set: setNewPwd, show: showNew, toggle: () => setShowNew(v => !v) },
            { label: 'Confirm Password', value: cfmPwd, set: setCfmPwd, show: showNew, toggle: () => {} },
          ].map(f => (
            <div key={f.label}>
              <label className="text-[11px] font-semibold text-[#64748B] mb-1.5 block">{f.label}</label>
              <div className="relative">
                <input
                  type={f.show ? 'text' : 'password'}
                  value={f.value}
                  onChange={e => { f.set(e.target.value); setPwdError(''); }}
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-[#0A0F16] border border-white/[0.08] focus:border-[#A78BFA]/50 text-[13px] text-[#F8FAFC] outline-none transition-all"
                  placeholder="••••••••"
                />
                {f.label !== 'Confirm Password' && (
                  <button
                    type="button"
                    onClick={f.toggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F8FAFC] transition-colors"
                  >
                    {f.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          {pwdError && <p className="text-[11px] text-[#EF4444]">{pwdError}</p>}
          <button
            onClick={handleChangePassword}
            disabled={savingPwd || !curPwd || !newPwd || !cfmPwd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-[#0B0F14] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)' }}
          >
            {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Change Password
          </button>
        </div>
      </section>

      {/* ── Odds format ── */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-[#0A0F16]">
          <BarChart2 className="h-3.5 w-3.5 text-[#FACC15]" />
          <p className="text-[12px] font-bold text-[#F8FAFC]">Odds Format</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-2">
            {ODDS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border transition-all duration-150 cursor-pointer',
                  format === opt.value
                    ? 'bg-[#FACC15]/10 border-[#FACC15]/35 text-[#FACC15]'
                    : 'bg-[#0A0F16] border-white/[0.06] text-[#94A3B8]/50 hover:text-[#F8FAFC] hover:border-white/[0.14]'
                )}
              >
                <span className="text-[15px] font-black font-mono">{opt.desc}</span>
                <span className="text-[10px] font-semibold">{opt.label}</span>
                {format === opt.value && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#FACC15]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
