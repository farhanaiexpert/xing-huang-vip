import { useRef, useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useBetHistory } from '@/hooks/useBetHistory';
import { Header } from '@/components/Header';
import { cn, userDisplayLabel, shortAddress, addressInitials } from '@/lib/utils';
import {
  LayoutDashboard, Wallet, Receipt, ArrowLeftRight,
  Users, Gift, Star, Trophy, Settings, LogOut, Shield, BarChart2,
} from 'lucide-react';
import { OverviewPage }              from './OverviewPage';
import { WalletPage }               from './WalletPage';
import { BetsPage }                 from './BetsPage';
import { TransactionsPage }         from './TransactionsPage';
import { ReferralsPage }            from './ReferralsPage';
import { PromotionsPage }           from './PromotionsPage';
import { WinSpinHistoryPage }       from './WinSpinHistoryPage';
import { PoolsPage }                from './PoolsPage';
import { SettingsPage }             from './SettingsPage';
import { ResponsibleGamblingPage }  from './ResponsibleGamblingPage';
import { VIPPage }                  from './VIPPage';
import { MyStatsPage }              from './MyStatsPage';
import { Crown } from 'lucide-react';

const NAV = [
  { id: 'overview',     label: 'Overview',           icon: LayoutDashboard },
  { id: 'wallet',       label: 'Wallet',              icon: Wallet },
  { id: 'bets',         label: 'My Bets',             icon: Receipt },
  { id: 'stats',        label: 'My Stats',            icon: BarChart2 },
  { id: 'transactions', label: 'Transactions',        icon: ArrowLeftRight },
  { id: 'referrals',    label: 'Referrals',           icon: Users },
  { id: 'promotions',   label: 'Promotions',          icon: Gift },
  { id: 'vip',          label: 'VIP & Loyalty',       icon: Crown },
  { id: 'winspin',      label: 'WinSpin',             icon: Star },
  { id: 'pools',        label: 'Pools',               icon: Trophy },
  { id: 'settings',     label: 'Settings',            icon: Settings },
  { id: 'responsible',  label: 'Responsible Gaming',  icon: Shield },
] as const;

type SectionId = (typeof NAV)[number]['id'];

const PAGES: Record<SectionId, React.ComponentType> = {
  overview:     OverviewPage,
  wallet:       WalletPage,
  bets:         BetsPage,
  stats:        MyStatsPage,
  transactions: TransactionsPage,
  referrals:    ReferralsPage,
  promotions:   PromotionsPage,
  vip:          VIPPage,
  winspin:      WinSpinHistoryPage,
  pools:        PoolsPage,
  settings:     SettingsPage,
  responsible:  ResponsibleGamblingPage,
};

function isSection(s: string): s is SectionId {
  return s in PAGES;
}

export function AccountLayout() {
  const { user, logout } = useAuth();
  const { openBetsCount } = useBetHistory();
  const params = useParams<{ section?: string }>();

  const raw = params.section ?? 'overview';
  const section: SectionId = isSection(raw) ? raw : 'overview';
  const PageComponent = PAGES[section];

  const displayLabel = user ? userDisplayLabel(user) : 'Guest';
  const initials     = user ? addressInitials(displayLabel) : 'G';

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade]   = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  // Auto-scroll active chip into view whenever section changes
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    // Small delay to let scroll settle before recalculating fades
    const t = setTimeout(() => {
      setShowLeftFade(container.scrollLeft > 8);
      setShowRightFade(container.scrollLeft < container.scrollWidth - container.clientWidth - 8);
    }, 350);
    return () => clearTimeout(t);
  }, [section]);

  // Initial fade state on mount
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    setShowRightFade(container.scrollWidth > container.clientWidth + 8);
  }, []);

  function handleChipScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    setShowLeftFade(el.scrollLeft > 8);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-20 xl:pb-0">
      <Header />

      {/* ── Mobile sticky section tab bar (12 account sections) ── */}
      <div className="xl:hidden sticky top-0 z-30 bg-[#0B0F14]/95 backdrop-blur-sm border-b border-white/[0.06] px-3 py-2 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00DFA9]/20 to-[#38BDF8]/10 border border-[#00DFA9]/30 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-black text-[#00DFA9]">{initials}</span>
          </div>
          <p className="text-[12px] font-bold text-[#F8FAFC] truncate">{displayLabel}</p>
        </div>
        {/* Chip scroll row with left/right fade affordance */}
        <div className="relative">
          {/* Left fade */}
          {showLeftFade && (
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 w-7 z-10"
              style={{ background: 'linear-gradient(to right, #0B0F14, transparent)' }}
            />
          )}
          {/* Right fade */}
          {showRightFade && (
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-7 z-10"
              style={{ background: 'linear-gradient(to left, #0B0F14, transparent)' }}
            />
          )}
          <div
            ref={scrollRef}
            className="flex gap-1.5 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
            onScroll={handleChipScroll}
          >
            {NAV.map(item => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <Link key={item.id} href={`/account/${item.id}`}>
                  <div
                    data-active={isActive ? 'true' : undefined}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all duration-150 cursor-pointer',
                      isActive
                        ? 'bg-[#00DFA9]/12 text-[#00DFA9] border-[#00DFA9]/30'
                        : 'bg-[#0E1520] text-[#94A3B8]/55 border-white/[0.06]',
                    )}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-3 xl:px-6">
        <div className="flex gap-5 py-5">

          {/* ── Desktop sidebar ─────────────────────────────────────── */}
          <aside className="hidden xl:flex flex-col w-56 shrink-0 gap-3">
            {/* Avatar card */}
            <div className="rounded-2xl bg-[#0E1520] border border-white/[0.07] p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00DFA9]/20 to-[#38BDF8]/10 border border-[#00DFA9]/30 flex items-center justify-center shrink-0">
                  <span className="text-[15px] font-black text-[#00DFA9]">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#F8FAFC] truncate">{displayLabel}</p>
                  {user?.walletAddress && (
                    <p className="text-[10px] text-[#00DFA9]/60 font-mono truncate">
                      {shortAddress(user.walletAddress)}
                    </p>
                  )}
                </div>
              </div>
              {user?.referralCode && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00DFA9]/6 border border-[#00DFA9]/15">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase tracking-widest">REF</span>
                  <span className="text-[11px] font-black text-[#00DFA9] font-mono tracking-wider">{user.referralCode}</span>
                </div>
              )}
            </div>

            {/* Nav */}
            <nav className="rounded-2xl bg-[#0E1520] border border-white/[0.07] overflow-hidden">
              {NAV.map((item, i) => {
                const Icon = item.icon;
                const active = section === item.id;
                const showBadge = item.id === 'bets' && openBetsCount > 0;
                return (
                  <Link key={item.id} href={`/account/${item.id}`}>
                    <div className={cn(
                      'flex items-center gap-2.5 px-4 py-2.5 transition-all duration-150 cursor-pointer group',
                      i > 0 && 'border-t border-white/[0.04]',
                      active
                        ? 'bg-[#00DFA9]/10 text-[#00DFA9]'
                        : 'text-[#94A3B8]/60 hover:bg-white/[0.04] hover:text-[#F8FAFC]',
                    )}>
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-[12.5px] font-medium flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="min-w-[18px] h-4.5 rounded-full bg-[#38BDF8] text-white text-[9px] font-bold flex items-center justify-center px-1.5 tabular-nums shadow-[0_0_6px_rgba(56,189,248,0.4)]">
                          {openBetsCount > 9 ? '9+' : openBetsCount}
                        </span>
                      )}
                      {active && !showBadge && <div className="w-1 h-3.5 rounded-full bg-[#00DFA9] shrink-0" />}
                    </div>
                  </Link>
                );
              })}
              <div className="border-t border-white/[0.04]">
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#94A3B8]/40 hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-all duration-150 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[12.5px] font-medium">Sign Out</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* ── Main content ───────────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            <PageComponent />
          </main>
        </div>
      </div>
    </div>
  );
}
