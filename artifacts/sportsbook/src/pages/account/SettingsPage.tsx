import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/apiClient';
import {
  BarChart2, ShieldCheck, Calendar,
  CheckCircle2, Copy, Check, Wallet, Pencil, Loader2, LogOut,
} from 'lucide-react';
import type { OddsFormat } from '@/lib/oddsFormat';

const ODDS_OPTIONS: { value: OddsFormat; label: string; desc: string }[] = [
  { value: 'decimal',    label: 'Decimal',    desc: '2.50' },
  { value: 'fractional', label: 'Fractional', desc: '3/2'  },
  { value: 'american',   label: 'American',   desc: '+150' },
];

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { disconnect } = useWallet();
  const [, navigate] = useLocation();
  const { format, setFormat } = useOddsFormat();
  const { toast } = useToast();
  const [disconnecting, setDisconnecting] = useState(false);

  const [copiedRef,  setCopiedRef]  = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState('');
  const [nameSaving,  setNameSaving]  = useState(false);
  const [nameError,   setNameError]   = useState('');

  function handleDisconnect() {
    setDisconnecting(true);
    try {
      disconnect();
      toast({ title: 'Wallet disconnected' });
      navigate('/');
    } finally {
      setDisconnecting(false);
    }
  }

  function handleCopyRef() {
    if (!user?.referralCode) return;
    navigator.clipboard.writeText(user.referralCode).catch(() => {});
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
    toast({ title: 'Referral code copied!' });
  }

  function handleCopyAddr() {
    const addr = user?.walletAddress;
    if (!addr) return;
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
    toast({ title: 'Address copied!' });
  }

  function startEditName() {
    setNameInput(user?.displayName ?? '');
    setNameError('');
    setEditingName(true);
  }

  async function saveDisplayName() {
    const trimmed = nameInput.trim();
    if (!trimmed) { setNameError('Display name cannot be empty'); return; }
    if (trimmed.length > 20) { setNameError('Max 20 characters'); return; }
    if (!/^[\w\s]+$/.test(trimmed)) { setNameError('Letters, numbers and spaces only'); return; }
    setNameSaving(true);
    setNameError('');
    try {
      const res = await api.patch<{ displayName: string }>('/auth/update-profile', { displayName: trimmed });
      updateUser({ displayName: res.displayName ?? trimmed });
      setEditingName(false);
      toast({ title: 'Display name updated!' });
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setNameSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-[16px] font-bold text-[#F8FAFC]">Account Settings</h2>

      {/* ── Connected Wallet ── */}
      <section className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-[#0A0F16]">
          <Wallet className="h-3.5 w-3.5 text-[#00DFA9]" />
          <p className="text-[12px] font-bold text-[#F8FAFC]">Connected Wallet</p>
        </div>
        <div className="p-5 space-y-4">
          {user?.walletAddress ? (
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: 'rgba(0,223,169,0.05)', border: '1px solid rgba(0,223,169,0.18)' }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#00DFA9] shadow-[0_0_8px_rgba(0,223,169,0.8)] shrink-0" />
              <p className="flex-1 text-[12px] font-mono text-[#00DFA9] break-all leading-relaxed">
                {user.walletAddress}
              </p>
              <button
                onClick={handleCopyAddr}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                style={copiedAddr
                  ? { background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.35)' }
                  : { background: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {copiedAddr ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedAddr ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-[#94A3B8]/50">No wallet connected</p>
          )}

          {/* Display name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Display Name</p>
              {!editingName && (
                <button
                  onClick={startEditName}
                  className="flex items-center gap-1 text-[11px] text-[#94A3B8]/60 hover:text-[#00DFA9] transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
            {editingName ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => { setNameInput(e.target.value); setNameError(''); }}
                  maxLength={20}
                  placeholder="e.g. CryptoKing"
                  className="w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2.5 text-[13px] text-[#F8FAFC] placeholder:text-[#64748B]/50 outline-none focus:border-[#00DFA9]/40 focus:bg-white/[0.06] transition-all"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') void saveDisplayName(); if (e.key === 'Escape') setEditingName(false); }}
                />
                {nameError && <p className="text-[11px] text-red-400">{nameError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => void saveDisplayName()}
                    disabled={nameSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50"
                    style={{ background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.30)' }}
                  >
                    {nameSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="px-4 py-2 rounded-xl text-[12px] font-semibold text-[#94A3B8] border border-white/[0.08] hover:border-white/[0.18] hover:text-[#F8FAFC] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-[#F8FAFC]">
                {user?.displayName || <span className="text-[#64748B]/50">Not set</span>}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      </section>

      {/* ── Disconnect Wallet ── */}
      {user?.walletAddress && (
        <section className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/[0.06] bg-[#0A0F16]">
            <LogOut className="h-3.5 w-3.5 text-red-400" />
            <p className="text-[12px] font-bold text-[#F8FAFC]">Session</p>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] text-[#F8FAFC] font-semibold">Disconnect Wallet</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">Sign out and clear your session. Your balance and bets are preserved.</p>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                Disconnect
              </button>
            </div>
          </div>
        </section>
      )}

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
