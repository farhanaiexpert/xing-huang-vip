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
  ArrowDownLeft, ArrowUpRight, Lock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { userDisplayLabel, addressInitials } from '@/lib/utils';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
  const winRate   = bets.length > 0 ? Math.round((wonBets / bets.length) * 100) : 0;
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
      label: 'Total Wagered',
      value: `${totalWagered.toFixed(2)}`,
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
    { label: 'Transactions', icon: ArrowLeftRight,  href: '/account/transactions', color: '#A78BFA' },
    { label: 'Referrals',    icon: Users,           href: '/account/referrals',    color: '#FACC15' },
    { label: 'Promotions',   icon: Gift,            href: '/account/promotions',   color: '#F97316' },
    { label: 'WinSpin',      icon: Star,            href: '/account/winspin',      color: '#EC4899' },
    { label: 'Pools',        icon: Trophy,          href: '/account/pools',        color: '#10B981' },
    { label: 'Settings',     icon: Settings,        href: '/account/settings',     color: '#94A3B8' },
  ];

  return (
    <div className="space-y-5">

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]"
        style={{ background: 'linear-gradient(135deg, #0C1A28 0%, #091510 60%, #0B0F14 100%)' }}>
        <div className="pointer-events-none absolute -top-16 -left-16 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.10) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-8 right-8 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)' }} />

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00DFA9]/20 to-[#38BDF8]/10 border-2 border-[#00DFA9]/40 flex items-center justify-center shadow-[0_0_24px_rgba(0,223,169,0.2)]">
                <span className="text-[24px] font-black text-[#00DFA9]">{initials}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00DFA9] border-2 border-[#0B0F14] flex items-center justify-center">
                <ShieldCheck className="h-2.5 w-2.5 text-[#0B0F14]" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-black text-[#F8FAFC] leading-tight">{displayLabel}</h1>
              {user?.walletAddress && (
                <p className="text-[11px] font-mono text-[#00DFA9]/50 mt-0.5 truncate">
                  {user.walletAddress}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-3">
                {/* Member since */}
                {user?.createdAt && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                    <Calendar className="h-3 w-3" />
                    Member since {fmtDate(user.createdAt as string)}
                  </div>
                )}
                {/* KYC */}
                <div className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                  user?.kycStatus === 'verified'
                    ? 'bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/25'
                    : 'bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20'
                )}>
                  <ShieldCheck className="h-2.5 w-2.5" />
                  {user?.kycStatus === 'verified' ? 'Verified' : 'Unverified'}
                </div>
              </div>
            </div>

            {/* Referral code */}
            {user?.referralCode && (
              <div className="shrink-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#64748B] mb-1.5">Your Referral Code</p>
                <button
                  onClick={handleCopyRef}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#00DFA9]/25 bg-[#00DFA9]/6 hover:bg-[#00DFA9]/12 transition-all cursor-pointer group"
                >
                  <span className="text-[18px] font-black text-[#00DFA9] font-mono tracking-[0.2em]">{user.referralCode}</span>
                  <div className="w-6 h-6 rounded-lg bg-[#00DFA9]/12 flex items-center justify-center group-hover:bg-[#00DFA9]/20 transition-colors">
                    {copied ? <Check className="h-3 w-3 text-[#00DFA9]" /> : <Copy className="h-3 w-3 text-[#00DFA9]/70" />}
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Balance Breakdown Card ── */}
      <Link href="/account/wallet">
        <div className="relative overflow-hidden rounded-2xl border border-[#00DFA9]/20 p-5 cursor-pointer hover:border-[#00DFA9]/35 transition-colors"
          style={{ background: 'linear-gradient(135deg, #071A12 0%, #0A1A10 60%, #0B0F14 100%)' }}>
          <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.10) 0%, transparent 70%)' }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00DFA9]/12 border border-[#00DFA9]/25 flex items-center justify-center">
                  <Wallet className="h-3.5 w-3.5 text-[#00DFA9]" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Wallet Balance</p>
              </div>
              <span className="text-[10px] font-semibold text-[#38BDF8]">View Wallet →</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl p-3 border" style={{ background: 'rgba(0,223,169,0.06)', borderColor: 'rgba(0,223,169,0.14)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ArrowDownLeft className="h-3 w-3 text-[#00DFA9]" />
                  <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Available</p>
                </div>
                <p className="text-[18px] font-black text-[#00DFA9] leading-tight">${balance.toFixed(2)}</p>
                <p className="text-[9px] text-[#64748B] mt-0.5">USDT</p>
              </div>
              <div className="rounded-xl p-3 border" style={{ background: 'rgba(56,189,248,0.06)', borderColor: 'rgba(56,189,248,0.14)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lock className="h-3 w-3 text-[#38BDF8]" />
                  <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Active Bets</p>
                </div>
                <p className="text-[18px] font-black text-[#38BDF8] leading-tight">${lockedInBets.toFixed(2)}</p>
                <p className="text-[9px] text-[#64748B] mt-0.5">locked</p>
              </div>
              <div className="rounded-xl p-3 border" style={{ background: 'rgba(167,139,250,0.06)', borderColor: 'rgba(167,139,250,0.14)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Gift className="h-3 w-3 text-[#A78BFA]" />
                  <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Bonus</p>
                </div>
                <p className="text-[18px] font-black text-[#A78BFA] leading-tight">${bonusBalance.toFixed(2)}</p>
                <p className="text-[9px] text-[#64748B] mt-0.5">non-withdraw.</p>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STATS.map(s => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <div className="relative rounded-2xl p-4 border cursor-pointer transition-all duration-150 hover:scale-[1.02] overflow-hidden"
                style={{ background: s.bg, borderColor: s.border }}>
                <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1.5px]"
                  style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div className="flex items-center justify-between mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${s.color}18`, border: `1px solid ${s.color}25` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-[22px] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] text-[#64748B] mt-1">{s.label}</p>
                <p className="text-[10px] text-[#475569] mt-0.5">{s.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Quick Actions Bar ── */}
      <div className="grid grid-cols-4 gap-2.5">
        {([
          { label: 'Deposit',     Icon: ArrowDownLeft, href: '/account/wallet',      color: '#00DFA9', bg: 'rgba(0,223,169,0.07)',   border: 'rgba(0,223,169,0.20)',  glow: 'rgba(0,223,169,0.18)' },
          { label: 'Withdraw',    Icon: ArrowUpRight,  href: '/account/wallet',      color: '#38BDF8', bg: 'rgba(56,189,248,0.07)',  border: 'rgba(56,189,248,0.20)', glow: 'rgba(56,189,248,0.14)' },
          { label: 'Bet History', Icon: Receipt,       href: '/account/bets',        color: '#FACC15', bg: 'rgba(250,204,21,0.07)', border: 'rgba(250,204,21,0.20)', glow: 'rgba(250,204,21,0.14)' },
          { label: 'Promotions',  Icon: Gift,          href: '/account/promotions',  color: '#F97316', bg: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.20)', glow: 'rgba(249,115,22,0.14)' },
        ] as const).map(({ label, Icon, href, color, bg, border, glow }) => (
          <Link key={label} href={href}>
            <div className="relative flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl border cursor-pointer transition-all duration-150 hover:scale-[1.03] active:scale-[0.97] overflow-hidden"
              style={{ background: bg, borderColor: border }}>
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}30`, boxShadow: `0 0 14px ${glow}` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <span className="text-[11px] font-bold text-[#F8FAFC] text-center leading-tight">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Referral earnings strip ── */}
      {ref.isLoaded && ref.totalEarned > 0 && (
        <Link href="/account/referrals">
          <div className="flex items-center justify-between p-4 rounded-2xl border border-[#FACC15]/20 bg-[#FACC15]/5 cursor-pointer hover:bg-[#FACC15]/8 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FACC15]/12 border border-[#FACC15]/25 flex items-center justify-center">
                <Users className="h-4 w-4 text-[#FACC15]" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#F8FAFC]">Referral Earnings</p>
                <p className="text-[11px] text-[#64748B]">{ref.referrals.length} referrals · {ref.totalEarned.toFixed(2)} USDT earned</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#FACC15]">View →</span>
          </div>
        </Link>
      )}

      {/* ── Quick nav grid ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]/35 mb-3">Quick Access</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {QUICK.map(q => {
            const Icon = q.icon;
            return (
              <Link key={q.href} href={q.href}>
                <div className="flex flex-col items-center gap-2 py-3 px-1 rounded-2xl bg-[#0E1520] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#141E2A] transition-all cursor-pointer active:scale-95">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${q.color}12`, border: `1px solid ${q.color}20` }}>
                    <Icon className="h-4 w-4" style={{ color: q.color }} />
                  </div>
                  <span className="text-[10px] font-medium text-[#94A3B8]/60 text-center leading-tight">{q.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
