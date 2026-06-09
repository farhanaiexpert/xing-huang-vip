import { useRef, useState, useEffect } from 'react';
import { Link, useParams, Redirect } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { useBetHistory } from '@/hooks/useBetHistory';
import { Header } from '@/components/Header';
import { cn, userDisplayLabel, shortAddress, addressInitials } from '@/lib/utils';
import {
  LayoutDashboard, Wallet, Receipt, ArrowLeftRight,
  Users, Gift, Star, Trophy, Settings, LogOut, Shield, BarChart2,
  LayoutGrid, X, ChevronDown,
} from 'lucide-react';
import { OverviewPage }              from './OverviewPage';
import { WalletPage }               from './WalletPage';
import { BetsPage }                 from './BetsPage';
import { TransactionsPage }         from './TransactionsPage';
// import { ReferralsPage }            from './ReferralsPage'; // hidden
import { PromotionsPage }           from './PromotionsPage';
import { WinSpinHistoryPage }       from './WinSpinHistoryPage';
import { PoolsPage }                from './PoolsPage';
import { SettingsPage }             from './SettingsPage';
import { ResponsibleGamblingPage }  from './ResponsibleGamblingPage';
import { VIPPage }                  from './VIPPage';
import { MyStatsPage }              from './MyStatsPage';
import { Crown } from 'lucide-react';

const NAV = [
  { id: 'overview',     label: 'Overview',     shortLabel: 'Overview',   icon: LayoutDashboard },
  { id: 'wallet',       label: 'Wallet',        shortLabel: 'Wallet',     icon: Wallet },
  { id: 'bets',         label: 'My Bets',       shortLabel: 'My Bets',    icon: Receipt },
  { id: 'stats',        label: 'My Stats',      shortLabel: 'Stats',      icon: BarChart2 },
  { id: 'transactions', label: 'Transactions',  shortLabel: 'Transfers',  icon: ArrowLeftRight },
  // { id: 'referrals',   label: 'Referrals',     shortLabel: 'Referrals',  icon: Users }, // hidden
  { id: 'promotions',  label: 'Promotions',    shortLabel: 'Promos',     icon: Gift },
  { id: 'vip',         label: 'VIP & Loyalty', shortLabel: 'VIP',        icon: Crown },
  { id: 'winspin',     label: 'WinSpin',       shortLabel: 'WinSpin',    icon: Star },
  { id: 'pools',       label: 'Pools',         shortLabel: 'Pools',      icon: Trophy },
  { id: 'settings',    label: 'Settings',      shortLabel: 'Settings',   icon: Settings },
  { id: 'responsible', label: 'Responsible',   shortLabel: 'Safe Play',  icon: Shield },
] as const;

type SectionId = (typeof NAV)[number]['id'];

const PAGES: Record<SectionId, React.ComponentType> = {
  overview:     OverviewPage,
  wallet:       WalletPage,
  bets:         BetsPage,
  stats:        MyStatsPage,
  transactions: TransactionsPage,
  // referrals:    ReferralsPage, // hidden
  promotions:   PromotionsPage,
  vip:          VIPPage,
  winspin:      WinSpinHistoryPage,
  pools:        PoolsPage,
  settings:     SettingsPage,
  responsible:  ResponsibleGamblingPage,
};

// Accent colours per section for the icon tile active states
const SECTION_COLOR: Record<SectionId, string> = {
  overview:     '#00DFA9',
  wallet:       '#00DFA9',
  bets:         '#38BDF8',
  stats:        '#38BDF8',
  transactions: '#A78BFA',
  // referrals:    '#FACC15', // hidden
  promotions:   '#F97316',
  vip:          '#FACC15',
  winspin:      '#EC4899',
  pools:        '#10B981',
  settings:     '#94A3B8',
  responsible:  '#64748B',
};

function isSection(s: string): s is SectionId {
  return s in PAGES;
}

export function AccountLayout() {
  const { user, logout, isLoading } = useAuth();
  const { isConnected } = useWallet();
  const { toast } = useToast();
  const { openBetsCount } = useBetHistory();
  const params = useParams<{ section?: string }>();

  const raw = params.section ?? 'overview';
  const section: SectionId = isSection(raw) ? raw : 'overview';
  const PageComponent = PAGES[section];

  // Wallet page is gated behind an active wallet connection.
  // Wait for auth restore (isLoading) so a connected user isn't bounced on refresh/deep-link.
  const walletBlocked = !isLoading && section === 'wallet' && !isConnected;
  useEffect(() => {
    if (walletBlocked) {
      toast({ title: 'Please connect your wallet first to access the wallet page.' });
    }
  }, [walletBlocked, toast]);

  const displayLabel = user ? userDisplayLabel(user) : 'Guest';
  const initials     = user ? addressInitials(displayLabel) : 'G';

  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu when section changes (e.g. navigating via deep link)
  const prevSection = useRef(section);
  useEffect(() => {
    if (prevSection.current !== section) {
      setMenuOpen(false);
      prevSection.current = section;
    }
  }, [section]);

  const activeNav   = NAV.find(n => n.id === section)!;
  const activeColor = SECTION_COLOR[section];

  if (walletBlocked) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-20 xl:pb-0">
      <Header />

      {/* ══════════════════════════════════════════════════
          Mobile account nav — collapsible icon-grid menu
          Hidden on xl+ (desktop uses sidebar instead)
          ══════════════════════════════════════════════════ */}
      <div className="xl:hidden sticky top-0 z-30" style={{ background: 'rgba(11,15,20,0.97)', backdropFilter: 'blur(12px)' }}>

        {/* ── Collapsed strip (always visible) ── */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.06]"
          style={{ borderBottomColor: menuOpen ? 'transparent' : undefined }}
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00DFA9]/20 to-[#38BDF8]/10 border border-[#00DFA9]/30 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-black text-[#00DFA9]">{initials}</span>
          </div>

          {/* Active section info */}
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#64748B]/60 leading-none mb-0.5">Account</p>
            <div className="flex items-center gap-1.5">
              <activeNav.icon className="h-3 w-3 shrink-0" style={{ color: activeColor }} />
              <p className="text-[13px] font-bold text-[#F8FAFC] leading-none truncate">{activeNav.label}</p>
            </div>
          </div>

          {/* Menu toggle */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-150 shrink-0"
            style={{
              background: menuOpen ? 'rgba(0,223,169,0.10)' : 'rgba(14,21,32,1)',
              borderColor: menuOpen ? 'rgba(0,223,169,0.30)' : 'rgba(255,255,255,0.07)',
            }}
          >
            {menuOpen
              ? <X className="h-3.5 w-3.5 text-[#00DFA9]" />
              : <LayoutGrid className="h-3.5 w-3.5 text-[#94A3B8]/60" />
            }
            <span className="text-[10px] font-semibold" style={{ color: menuOpen ? '#00DFA9' : 'rgba(148,163,184,0.55)' }}>
              {menuOpen ? 'Close' : 'Menu'}
            </span>
            {!menuOpen && <ChevronDown className="h-3 w-3 text-[#64748B]/40" />}
          </button>
        </div>

        {/* ── Expanded icon-grid ── */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: menuOpen ? '400px' : '0px',
            opacity: menuOpen ? 1 : 0,
          }}
        >
          <div className="px-2.5 pt-2 pb-3 border-b border-white/[0.06]">
            {/* 4-column icon grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {NAV.map(item => {
                const Icon  = item.icon;
                const active = section === item.id;
                const color  = SECTION_COLOR[item.id];
                const showBadge = item.id === 'bets' && openBetsCount > 0;
                return (
                  <Link key={item.id} href={`/account/${item.id}`}>
                    <div
                      onClick={() => setMenuOpen(false)}
                      className="relative flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border cursor-pointer transition-all duration-150 active:scale-95"
                      style={{
                        background: active ? `${color}12` : 'rgba(14,21,32,0.85)',
                        borderColor: active ? `${color}35` : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      {/* Top accent line when active */}
                      {active && (
                        <div
                          className="absolute top-0 left-2 right-2 h-[1.5px] rounded-full"
                          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
                        />
                      )}
                      {/* Icon */}
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center relative"
                        style={{
                          background: active ? `${color}20` : `${color}0D`,
                          border: `1px solid ${active ? `${color}35` : `${color}18`}`,
                          boxShadow: active ? `0 0 12px ${color}30` : 'none',
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: active ? color : `${color}99` }} />
                        {showBadge && (
                          <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full bg-[#38BDF8] text-white text-[8px] font-bold flex items-center justify-center px-1 tabular-nums">
                            {openBetsCount > 9 ? '9+' : openBetsCount}
                          </span>
                        )}
                      </div>
                      {/* Label */}
                      <span
                        className="text-[9px] font-semibold text-center leading-tight"
                        style={{ color: active ? color : 'rgba(148,163,184,0.55)' }}
                      >
                        {item.shortLabel}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Sign out row */}
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/[0.05] bg-[#0E1520]/80 text-[#64748B]/50 hover:text-[#EF4444] hover:border-[#EF4444]/20 hover:bg-[#EF4444]/5 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="h-3 w-3" />
              <span className="text-[10px] font-semibold">Sign Out</span>
            </button>
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
              {/* referral code badge hidden */}
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
