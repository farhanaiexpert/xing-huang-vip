import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Wallet, Receipt, ArrowLeftRight,
  Users, Gift, Star, Trophy, Settings, LogOut,
} from 'lucide-react';
import { OverviewPage }       from './OverviewPage';
import { WalletPage }          from './WalletPage';
import { BetsPage }            from './BetsPage';
import { TransactionsPage }    from './TransactionsPage';
import { ReferralsPage }       from './ReferralsPage';
import { PromotionsPage }      from './PromotionsPage';
import { WinSpinHistoryPage }  from './WinSpinHistoryPage';
import { PoolsPage }           from './PoolsPage';
import { SettingsPage }        from './SettingsPage';

const NAV = [
  { id: 'overview',     label: 'Overview',      icon: LayoutDashboard },
  { id: 'wallet',       label: 'Wallet',         icon: Wallet },
  { id: 'bets',         label: 'My Bets',        icon: Receipt },
  { id: 'transactions', label: 'Transactions',   icon: ArrowLeftRight },
  { id: 'referrals',    label: 'Referrals',      icon: Users },
  { id: 'promotions',   label: 'Promotions',     icon: Gift },
  { id: 'winspin',      label: 'WinSpin',        icon: Star },
  { id: 'pools',        label: 'Pools',          icon: Trophy },
  { id: 'settings',     label: 'Settings',       icon: Settings },
] as const;

type SectionId = (typeof NAV)[number]['id'];

const PAGES: Record<SectionId, React.ComponentType> = {
  overview:     OverviewPage,
  wallet:       WalletPage,
  bets:         BetsPage,
  transactions: TransactionsPage,
  referrals:    ReferralsPage,
  promotions:   PromotionsPage,
  winspin:      WinSpinHistoryPage,
  pools:        PoolsPage,
  settings:     SettingsPage,
};

function isSection(s: string): s is SectionId {
  return s in PAGES;
}

export function AccountLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const params = useParams<{ section?: string }>();
  const [, setLocation] = useLocation();

  const raw = params.section ?? 'overview';
  const section: SectionId = isSection(raw) ? raw : 'overview';
  const PageComponent = PAGES[section];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/');
      setTimeout(() => window.dispatchEvent(new CustomEvent('openLoginModal')), 150);
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F14]">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-[#00DFA9]/30 border-t-[#00DFA9] rounded-full animate-spin" />
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-20 xl:pb-0">
      <Header />

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
                  <p className="text-[13px] font-bold text-[#F8FAFC] truncate">{user.username}</p>
                  <p className="text-[10px] text-[#94A3B8]/50 truncate">{user.email}</p>
                </div>
              </div>
              {user.referralCode && (
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
                      {active && <div className="w-1 h-3.5 rounded-full bg-[#00DFA9] shrink-0" />}
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
            {/* Mobile: user strip + scrollable tab bar */}
            <div className="xl:hidden mb-4 space-y-3">
              <div className="flex items-center gap-2.5 px-1">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00DFA9]/20 to-[#38BDF8]/10 border border-[#00DFA9]/30 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-black text-[#00DFA9]">{initials}</span>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#F8FAFC]">{user.username}</p>
                  <p className="text-[10px] text-[#94A3B8]/45">{user.email}</p>
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                {NAV.map(item => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <Link key={item.id} href={`/account/${item.id}`}>
                      <div className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap border transition-all duration-150 cursor-pointer',
                        active
                          ? 'bg-[#00DFA9]/12 text-[#00DFA9] border-[#00DFA9]/30'
                          : 'bg-[#0E1520] text-[#94A3B8]/55 border-white/[0.06] hover:text-[#F8FAFC]',
                      )}>
                        <Icon className="h-3 w-3 shrink-0" />
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <PageComponent />
          </main>
        </div>
      </div>
    </div>
  );
}
