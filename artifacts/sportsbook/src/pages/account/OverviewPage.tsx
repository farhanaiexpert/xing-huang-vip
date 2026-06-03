import { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useBetHistory } from '@/hooks/useBetHistory';
import { useReferral } from '@/hooks/useReferral';
import { cn } from '@/lib/utils';
import {
  Copy, Check, Wallet, Receipt, ArrowLeftRight,
  Users, Gift, Star, Trophy, Settings,
  Calendar, ShieldCheck, TrendingUp, Activity,
  ArrowDownLeft, ArrowUpRight, Lock, ChevronRight,
  BarChart2, Percent,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { userDisplayLabel, addressInitials, shortAddress } from '@/lib/utils';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtUSDT(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000)    return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

export function OverviewPage() {
  const { user } = useAuth();
  const { balance, bonusBalance } = useWallet();
  const { bets } = useBetHistory();
  const ref = useReferral();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const wonBets      = bets.filter(b => b.status === 'won' || b.status === 'settled').length;
  const openBets     = bets.filter(b => !b.status || b.status === 'open' || b.status === 'pending').length;
  const lockedInBets = bets.filter(b => !b.status || b.status === 'open' || b.status === 'pending').reduce((s, b) => s + b.stake, 0);
  const totalWagered = bets.reduce((s, b) => s + b.stake, 0);
  const winRate      = bets.length > 0 ? Math.round((wonBets / bets.length) * 100) : 0;
  const displayLabel = userDisplayLabel(user);
  const initials     = addressInitials(displayLabel);

  function handleCopyRef() {
    if (!user?.referralCode) return;
    navigator.clipboard.writeText(user.referralCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Referral code copied!' });
  }

  const STATS = [
    { label: 'Total Bets',  value: String(bets.length),        sub: `${openBets} open`,           icon: Receipt,     color: '#38BDF8' },
    { label: 'Win Rate',    value: `${winRate}%`,               sub: bets.length > 0 ? `${wonBets} won` : 'no bets yet', icon: Percent, color: '#00DFA9' },
    { label: 'Bets Won',    value: String(wonBets),             sub: `of ${bets.length} total`,    icon: TrendingUp,  color: '#FACC15' },
    { label: 'Wagered',     value: fmtUSDT(totalWagered),       sub: 'USDT total',                 icon: Activity,    color: '#A78BFA' },
  ];

  const ACTIONS = [
    { label: 'Deposit',  Icon: ArrowDownLeft, href: '/account/wallet',     color: '#00DFA9', bg: 'rgba(0,223,169,0.08)',  border: 'rgba(0,223,169,0.25)',  glow: 'rgba(0,223,169,0.20)' },
    { label: 'Withdraw', Icon: ArrowUpRight,  href: '/account/wallet',     color: '#38BDF8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)', glow: 'rgba(56,189,248,0.16)' },
    { label: 'My Bets',  Icon: Receipt,       href: '/account/bets',       color: '#FACC15', bg: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.25)', glow: 'rgba(250,204,21,0.16)' },
    { label: 'Promos',   Icon: Gift,          href: '/account/promotions', color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', glow: 'rgba(249,115,22,0.16)' },
  ] as const;

  const QUICK = [
    { label: 'Wallet',     icon: Wallet,         href: '/account/wallet',       color: '#00DFA9' },
    { label: 'My Bets',   icon: Receipt,        href: '/account/bets',         color: '#38BDF8' },
    { label: 'Transfers', icon: ArrowLeftRight, href: '/account/transactions', color: '#A78BFA' },
    { label: 'Referrals', icon: Users,          href: '/account/referrals',    color: '#FACC15' },
    { label: 'Promos',    icon: Gift,           href: '/account/promotions',   color: '#F97316' },
    { label: 'WinSpin',   icon: Star,           href: '/account/winspin',      color: '#EC4899' },
    { label: 'Pools',     icon: Trophy,         href: '/account/pools',        color: '#10B981' },
    { label: 'Settings',  icon: Settings,       href: '/account/settings',     color: '#94A3B8' },
  ];

  return (
    <div className="space-y-4">

      {/* ── PROFILE CARD ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]"
        style={{ background: 'linear-gradient(135deg, #0C1A28 0%, #091510 60%, #0B0F14 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, #00DFA9, #38BDF8 60%, transparent)' }} />
        <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.12) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-6 right-4 w-28 h-28 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)' }} />

        <div className="relative p-4">
          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00DFA9]/25 to-[#38BDF8]/15 border-2 border-[#00DFA9]/45 flex items-center justify-center"
                style={{ boxShadow: '0 0 20px rgba(0,223,169,0.18)' }}>
                <span className="text-[22px] font-black text-[#00DFA9]">{initials}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#0B0F14]"
                style={{ background: user?.kycStatus === 'verified' ? '#00DFA9' : '#475569' }}>
                <ShieldCheck className="h-2.5 w-2.5 text-[#0B0F14]" />
              </div>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-black text-[#F8FAFC] leading-tight truncate">{displayLabel}</p>
              {user?.walletAddress && (
                <p className="text-[10px] font-mono text-[#00DFA9]/50 mt-0.5 truncate">{shortAddress(user.walletAddress)}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border',
                  user?.kycStatus === 'verified'
                    ? 'bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/25'
                    : 'bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20'
                )}>
                  <ShieldCheck className="h-2 w-2" />
                  {user?.kycStatus === 'verified' ? 'Verified' : 'Unverified'}
                </span>
                {user?.createdAt && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#64748B]">
                    <Calendar className="h-2.5 w-2.5 shrink-0" />
                    {fmtDate(user.createdAt as string)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Referral code strip */}
          {user?.referralCode && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 border border-[#00DFA9]/20 bg-[#00DFA9]/5">
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#64748B] leading-none mb-1">Referral Code</p>
                <p className="text-[15px] font-black text-[#00DFA9] font-mono tracking-[0.18em] leading-none">{user.referralCode}</p>
              </div>
              <button
                onClick={handleCopyRef}
                className="shrink-0 w-8 h-8 rounded-lg bg-[#00DFA9]/12 border border-[#00DFA9]/25 flex items-center justify-center hover:bg-[#00DFA9]/20 transition-colors active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#00DFA9]" /> : <Copy className="h-3.5 w-3.5 text-[#00DFA9]/70" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── WALLET BALANCE HERO ───────────────────────────────────────────── */}
      <Link href="/account/wallet">
        <div className="relative overflow-hidden rounded-2xl border border-[#00DFA9]/22 cursor-pointer hover:border-[#00DFA9]/38 active:scale-[0.99] transition-all mb-[15px]"
          style={{ background: 'linear-gradient(135deg, #071A12 0%, #0A1A10 55%, #0B0F14 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-[1.5px]"
            style={{ background: 'linear-gradient(90deg, #00DFA9, rgba(0,223,169,0.2) 60%, transparent)' }} />
          <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.09) 0%, transparent 70%)' }} />

          <div className="relative p-4">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#00DFA9]/12 border border-[#00DFA9]/25 flex items-center justify-center">
                  <Wallet className="h-3 w-3 text-[#00DFA9]" />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Wallet Balance</p>
              </div>
              <span className="text-[10px] font-semibold text-[#38BDF8] flex items-center gap-0.5">
                Manage <ChevronRight className="h-3 w-3" />
              </span>
            </div>

            {/* Primary: available balance */}
            <div className="mb-4">
              <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide mb-1">Available</p>
              <div className="flex items-baseline gap-2">
                <p className="text-[32px] sm:text-[36px] font-black text-[#00DFA9] leading-none tabular-nums"
                  style={{ textShadow: '0 0 32px rgba(0,223,169,0.28)' }}>
                  {fmtUSDT(balance)}
                </p>
                <span className="text-[12px] font-bold text-[#00DFA9]/50 pb-0.5">USDT</span>
              </div>
            </div>

            {/* Secondary row: In Bets + Bonus */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-2.5 border" style={{ background: 'rgba(56,189,248,0.06)', borderColor: 'rgba(56,189,248,0.16)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lock className="h-2.5 w-2.5 text-[#38BDF8] shrink-0" />
                  <p className="text-[8px] font-bold uppercase tracking-wide text-[#64748B]">In Bets</p>
                </div>
                <p className="text-[15px] font-black text-[#38BDF8] tabular-nums leading-none">{fmtUSDT(lockedInBets)}</p>
                <p className="text-[8px] text-[#64748B] mt-0.5">{openBets} open bet{openBets !== 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-xl p-2.5 border" style={{ background: 'rgba(250,204,21,0.06)', borderColor: 'rgba(250,204,21,0.16)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Gift className="h-2.5 w-2.5 text-[#FACC15] shrink-0" />
                  <p className="text-[8px] font-bold uppercase tracking-wide text-[#64748B]">Bonus</p>
                </div>
                <p className="text-[15px] font-black text-[#FACC15] tabular-nums leading-none">{fmtUSDT(bonusBalance)}</p>
                <p className="text-[8px] text-[#64748B]/60 mt-0.5">Bet only</p>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* ── QUICK ACTIONS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {ACTIONS.map(({ label, Icon, href, color, bg, border, glow }) => (
          <Link key={label} href={href}>
            <div className="relative flex items-center sm:flex-col sm:items-center gap-3 sm:gap-2 px-4 sm:px-2 py-3.5 sm:py-4 rounded-xl border cursor-pointer active:scale-[0.96] transition-all overflow-hidden"
              style={{ background: bg, borderColor: border }}>
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, ${color}50, transparent)` }} />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}35`, boxShadow: `0 0 12px ${glow}` }}>
                <Icon className="h-4.5 w-4.5" style={{ color }} />
              </div>
              <span className="text-[13px] sm:text-[11px] font-bold text-[#F8FAFC] sm:text-center leading-tight">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── STATS GRID ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        {STATS.map(s => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.label === 'Wagered' ? '/account/transactions' : '/account/bets'}>
              <div className="relative rounded-xl p-3 border cursor-pointer active:scale-[0.97] transition-all overflow-hidden"
                style={{ background: `${s.color}09`, borderColor: `${s.color}20` }}>
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px]"
                  style={{ background: `linear-gradient(90deg, ${s.color}80, transparent)` }} />
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">{s.label}</p>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                    <Icon className="h-2.5 w-2.5" style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-[22px] font-black leading-none tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] text-[#475569] mt-1 leading-tight">{s.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── REFERRAL EARNINGS (conditional) ──────────────────────────────── */}
      {ref.isLoaded && ref.totalEarned > 0 && (
        <Link href="/account/referrals">
          <div className="flex items-center justify-between px-3.5 py-3 rounded-xl border border-[#FACC15]/20 bg-[#FACC15]/5 cursor-pointer hover:bg-[#FACC15]/8 transition-colors active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FACC15]/12 border border-[#FACC15]/25 flex items-center justify-center shrink-0">
                <Users className="h-3.5 w-3.5 text-[#FACC15]" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#F8FAFC]">Referral Earnings</p>
                <p className="text-[10px] text-[#64748B]">{ref.referrals.length} referral{ref.referrals.length !== 1 ? 's' : ''} · {ref.totalEarned.toFixed(2)} USDT</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#FACC15]/60 shrink-0" />
          </div>
        </Link>
      )}

      {/* ── QUICK ACCESS GRID ────────────────────────────────────────────── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]/40 mb-2">Quick Access</p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map(q => {
            const Icon = q.icon;
            return (
              <Link key={q.href} href={q.href}>
                <div className="flex flex-col items-center gap-2 py-3 px-1 rounded-xl bg-[#0E1520] border border-white/[0.06] hover:border-white/[0.14] hover:bg-[#141E2A] transition-all cursor-pointer active:scale-95">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${q.color}14`, border: `1px solid ${q.color}22` }}>
                    <Icon className="h-4 w-4" style={{ color: q.color }} />
                  </div>
                  <span className="text-[9px] font-semibold text-[#94A3B8]/80 text-center leading-tight">{q.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
