import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { userDisplayLabel, addressInitials, shortAddress } from '@/lib/utils';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Compact number formatter — keeps large USD values from overflowing cells */
function fmtUSDT(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000)    return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
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
    {
      label: 'Total Bets',
      value: bets.length,
      sub: `${openBets} open`,
      icon: Receipt,
      color: '#38BDF8',
      bg: 'rgba(56,189,248,0.08)',
      border: 'rgba(56,189,248,0.15)',
      href: '/account/bets',
    },
    {
      label: 'Bets Won',
      value: wonBets,
      sub: bets.length > 0 ? `${winRate}% win rate` : '—',
      icon: TrendingUp,
      color: '#FACC15',
      bg: 'rgba(250,204,21,0.08)',
      border: 'rgba(250,204,21,0.15)',
      href: '/account/bets',
    },
    {
      label: 'Wagered',
      value: fmtUSDT(totalWagered),
      sub: 'USDT',
      icon: Activity,
      color: '#A78BFA',
      bg: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.15)',
      href: '/account/transactions',
    },
  ];

  const QUICK = [
    { label: 'Wallet',       icon: Wallet,          href: '/account/wallet',       color: '#00DFA9' },
    { label: 'My Bets',      icon: Receipt,         href: '/account/bets',         color: '#38BDF8' },
    { label: 'Transfers',    icon: ArrowLeftRight,  href: '/account/transactions', color: '#A78BFA' },
    { label: 'Referrals',    icon: Users,           href: '/account/referrals',    color: '#FACC15' },
    { label: 'Promotions',   icon: Gift,            href: '/account/promotions',   color: '#F97316' },
    { label: 'WinSpin',      icon: Star,            href: '/account/winspin',      color: '#EC4899' },
    { label: 'Pools',        icon: Trophy,          href: '/account/pools',        color: '#10B981' },
    { label: 'Settings',     icon: Settings,        href: '/account/settings',     color: '#94A3B8' },
  ];

  return (
    <div className="space-y-3 pb-28 sm:pb-6">

      {/* ── Profile card — compact horizontal layout ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]"
        style={{ background: 'linear-gradient(135deg, #0C1A28 0%, #091510 60%, #0B0F14 100%)' }}>
        {/* Decorative glows */}
        <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.12) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-6 right-4 w-32 h-32 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)' }} />

        <div className="relative p-4">
          {/* Row 1: avatar + name + badges */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00DFA9]/20 to-[#38BDF8]/10 border-2 border-[#00DFA9]/40 flex items-center justify-center shadow-[0_0_16px_rgba(0,223,169,0.2)]">
                <span className="text-[18px] font-black text-[#00DFA9]">{initials}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00DFA9] border-2 border-[#0B0F14] flex items-center justify-center">
                <ShieldCheck className="h-2 w-2 text-[#0B0F14]" />
              </div>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-black text-[#F8FAFC] leading-tight truncate">{displayLabel}</p>
              {user?.walletAddress && (
                <p className="text-[10px] font-mono text-[#00DFA9]/50 mt-0.5 truncate">{shortAddress(user.walletAddress)}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {user?.createdAt && (
                  <span className="flex items-center gap-1 text-[10px] text-[#64748B]">
                    <Calendar className="h-2.5 w-2.5 shrink-0" />
                    {fmtDate(user.createdAt as string)}
                  </span>
                )}
                <span className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border',
                  user?.kycStatus === 'verified'
                    ? 'bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/25'
                    : 'bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20'
                )}>
                  <ShieldCheck className="h-2 w-2" />
                  {user?.kycStatus === 'verified' ? 'Verified' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: referral code (compact inline) */}
          {user?.referralCode && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 border border-[#00DFA9]/20 bg-[#00DFA9]/5">
              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-widest text-[#64748B] leading-none mb-1">Referral Code</p>
                <p className="text-[15px] font-black text-[#00DFA9] font-mono tracking-[0.18em] leading-none">{user.referralCode}</p>
              </div>
              <button
                onClick={handleCopyRef}
                className="shrink-0 w-8 h-8 rounded-lg bg-[#00DFA9]/12 border border-[#00DFA9]/25 flex items-center justify-center hover:bg-[#00DFA9]/20 transition-colors active:scale-95"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[#00DFA9]" /> : <Copy className="h-3.5 w-3.5 text-[#00DFA9]/70" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Wallet Balance ── */}
      <Link href="/account/wallet">
        <div className="relative overflow-hidden rounded-2xl border border-[#00DFA9]/20 p-3.5 cursor-pointer hover:border-[#00DFA9]/35 active:scale-[0.99] transition-all"
          style={{ background: 'linear-gradient(135deg, #071A12 0%, #0A1A10 60%, #0B0F14 100%)' }}>
          <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.10) 0%, transparent 70%)' }} />
          <div className="relative">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#00DFA9]/12 border border-[#00DFA9]/25 flex items-center justify-center">
                  <Wallet className="h-3 w-3 text-[#00DFA9]" />
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Wallet Balance</p>
              </div>
              <span className="text-[10px] font-semibold text-[#38BDF8] flex items-center gap-0.5">
                View <ChevronRight className="h-3 w-3" />
              </span>
            </div>
            {/* 3-col balance grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: ArrowDownLeft, label: 'Available', value: fmtUSDT(balance),      sub: 'USDT',     color: '#00DFA9', bg: 'rgba(0,223,169,0.06)',   border: 'rgba(0,223,169,0.14)'   },
                { icon: Lock,          label: 'In Bets',   value: fmtUSDT(lockedInBets), sub: 'locked',   color: '#38BDF8', bg: 'rgba(56,189,248,0.06)',  border: 'rgba(56,189,248,0.14)'  },
                { icon: Gift,          label: 'Bonus',     value: fmtUSDT(bonusBalance), sub: 'bet only', color: '#FACC15', bg: 'rgba(250,204,21,0.06)',  border: 'rgba(250,204,21,0.14)'  },
              ].map(cell => {
                const CellIcon = cell.icon;
                return (
                  <div key={cell.label} className="rounded-xl p-2.5 border" style={{ background: cell.bg, borderColor: cell.border }}>
                    <div className="flex items-center gap-1 mb-1.5">
                      <CellIcon className="h-2.5 w-2.5 shrink-0" style={{ color: cell.color }} />
                      <p className="text-[8px] font-bold uppercase tracking-wide" style={{ color: '#64748B' }}>{cell.label}</p>
                    </div>
                    <p className="text-[13px] font-black leading-tight tabular-nums" style={{ color: cell.color }}>{cell.value}</p>
                    <p className="text-[8px] mt-0.5" style={{ color: cell.color === '#FACC15' ? 'rgba(250,204,21,0.5)' : '#64748B' }}>{cell.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Link>

      {/* ── Stat tiles — always 3 columns, compact ── */}
      <div className="grid grid-cols-3 gap-2">
        {STATS.map(s => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <div className="relative rounded-xl p-3 border cursor-pointer active:scale-[0.97] transition-all overflow-hidden"
                style={{ background: s.bg, borderColor: s.border }}>
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px]"
                  style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-2"
                  style={{ background: `${s.color}18`, border: `1px solid ${s.color}25` }}>
                  <Icon className="h-3 w-3" style={{ color: s.color }} />
                </div>
                <p className="text-[18px] font-black leading-none tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] text-[#64748B] mt-1 leading-tight">{s.label}</p>
                <p className="text-[9px] text-[#475569] mt-0.5 leading-tight">{s.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Quick Actions — 4 cols, compact ── */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { label: 'Deposit',  Icon: ArrowDownLeft, href: '/account/wallet',     color: '#00DFA9', bg: 'rgba(0,223,169,0.07)',   border: 'rgba(0,223,169,0.22)',  glow: 'rgba(0,223,169,0.18)' },
          { label: 'Withdraw', Icon: ArrowUpRight,  href: '/account/wallet',     color: '#38BDF8', bg: 'rgba(56,189,248,0.07)',  border: 'rgba(56,189,248,0.22)', glow: 'rgba(56,189,248,0.14)' },
          { label: 'My Bets',  Icon: Receipt,       href: '/account/bets',       color: '#FACC15', bg: 'rgba(250,204,21,0.07)',  border: 'rgba(250,204,21,0.22)', glow: 'rgba(250,204,21,0.14)' },
          { label: 'Promos',   Icon: Gift,          href: '/account/promotions', color: '#F97316', bg: 'rgba(249,115,22,0.07)',  border: 'rgba(249,115,22,0.22)', glow: 'rgba(249,115,22,0.14)' },
        ] as const).map(({ label, Icon, href, color, bg, border, glow }) => (
          <Link key={label} href={href}>
            <div className="relative flex flex-col items-center gap-2 py-3 px-1.5 rounded-xl border cursor-pointer active:scale-[0.96] transition-all overflow-hidden"
              style={{ background: bg, borderColor: border }}>
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}30`, boxShadow: `0 0 10px ${glow}` }}>
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <span className="text-[10px] font-bold text-[#F8FAFC] text-center leading-tight">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Referral earnings strip (conditional) ── */}
      {ref.isLoaded && ref.totalEarned > 0 && (
        <Link href="/account/referrals">
          <div className="flex items-center justify-between px-3.5 py-3 rounded-xl border border-[#FACC15]/20 bg-[#FACC15]/5 cursor-pointer hover:bg-[#FACC15]/8 transition-colors active:scale-[0.99]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FACC15]/12 border border-[#FACC15]/25 flex items-center justify-center shrink-0">
                <Users className="h-3.5 w-3.5 text-[#FACC15]" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#F8FAFC]">Referral Earnings</p>
                <p className="text-[10px] text-[#64748B]">{ref.referrals.length} referrals · {ref.totalEarned.toFixed(2)} USDT</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#FACC15]/60 shrink-0" />
          </div>
        </Link>
      )}

      {/* ── Quick access grid — 4×2 ── */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]/30 mb-2">Quick Access</p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK.map(q => {
            const Icon = q.icon;
            return (
              <Link key={q.href} href={q.href}>
                <div className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl bg-[#0E1520] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#141E2A] transition-all cursor-pointer active:scale-95">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${q.color}12`, border: `1px solid ${q.color}20` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: q.color }} />
                  </div>
                  <span className="text-[9px] font-medium text-[#94A3B8]/60 text-center leading-tight">{q.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
