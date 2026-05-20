import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Home, Grid3X3, Receipt, Gift, MoreHorizontal,
  History, HelpCircle, Star, FileText, ShieldCheck,
  Landmark, ChevronRight, Wallet, X, Zap, Check,
  TrendingUp,
} from 'lucide-react';
import { useBetSlip } from '../hooks/useBetSlip';
import { useWallet } from '../hooks/useWallet';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from './ui/drawer';
import { BetSlip } from './BetSlip';
import { SPORTS } from '../data/mockData';
import { cn } from '../lib/utils';

const ODDS_FORMATS = [
  { value: 'decimal',     label: 'DEC',  desc: 'Decimal' },
  { value: 'fractional',  label: 'FRAC', desc: 'Fractional' },
  { value: 'american',    label: 'US',   desc: 'American' },
] as const;

const QUICK_ACTIONS = [
  { icon: History,    label: 'Bet History', sub: 'View your bets',     href: '/bet-history', color: '#38BDF8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.18)' },
  { icon: Star,       label: 'WinSpin',     sub: 'Spin & win',         href: '/winspin',     color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.18)' },
  { icon: HelpCircle, label: 'Help & Rules',sub: 'Learn how to bet',   href: '/help',        color: '#A78BFA', bg: 'rgba(167,139,250,0.08)',  border: 'rgba(167,139,250,0.18)' },
  { icon: TrendingUp, label: 'Promotions',  sub: 'Bonuses & offers',   href: '/promotions',  color: '#00DFA9', bg: 'rgba(0,223,169,0.08)',    border: 'rgba(0,223,169,0.18)' },
];

const LEGAL_LINKS = [
  { icon: FileText,   label: 'Terms & Conditions', href: '/terms'   },
  { icon: ShieldCheck,label: 'Privacy Policy',     href: '/privacy' },
  { icon: Landmark,   label: 'AML Policy',         href: '/aml'     },
];

const MORE_PAGES = [
  '/bet-history', '/winspin', '/help', '/terms', '/privacy', '/aml',
];

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { selections } = useBetSlip();
  const { isConnected, shortAddress, connect } = useWallet();
  const { format, setFormat } = useOddsFormat();
  const [betSlipOpen, setBetSlipOpen] = useState(false);
  const [sportsOpen,  setSportsOpen]  = useState(false);
  const [moreOpen,    setMoreOpen]    = useState(false);

  const prevCountRef = useRef(selections.length);
  useEffect(() => {
    if (selections.length > prevCountRef.current && window.innerWidth < 1280) {
      setBetSlipOpen(true);
    }
    prevCountRef.current = selections.length;
  }, [selections.length]);

  function handleSelectSport(sportId: string) {
    window.dispatchEvent(new CustomEvent('mobile-sport-select', { detail: sportId }));
    setSportsOpen(false);
    if (location !== '/') setLocation('/');
  }

  const isHome   = location === '/';
  const isPromos = location === '/promotions';
  const isBetSlipTab = betSlipOpen;
  const isSportsTab  = sportsOpen;
  const isMoreTab    = moreOpen || MORE_PAGES.includes(location);

  return (
    <>
      {/* ── Bottom nav bar ────────────────────────────────────────── */}
      <nav
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F14]/97 backdrop-blur-xl border-t border-[#253241]/80"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch h-14">

          <Link href="/"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isHome && !isBetSlipTab && !isSportsTab && !isMoreTab
                ? 'text-[#00DFA9]' : 'text-[#94A3B8]/50 hover:text-[#94A3B8]'
            )}>
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          <button
            onClick={() => setSportsOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isSportsTab ? 'text-[#00DFA9]' : 'text-[#94A3B8]/50 hover:text-[#94A3B8]'
            )}>
            <Grid3X3 className="h-5 w-5" />
            <span>Sports</span>
          </button>

          {/* Bet Slip — centre accent tab */}
          <button onClick={() => setBetSlipOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-0.5">
            <div className={cn(
              'relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200',
              selections.length > 0
                ? 'bg-[#00DFA9] text-[#0B0F14] shadow-[0_0_20px_rgba(0,223,169,0.4)]'
                : 'bg-[#1E2A38] text-[#94A3B8]/60'
            )}>
              <Receipt className="h-[18px] w-[18px]" />
              {selections.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[#EF4444] border-2 border-[#0B0F14] text-white text-[9px] font-bold flex items-center justify-center px-0.5 tabular-nums">
                  {selections.length}
                </span>
              )}
            </div>
          </button>

          <Link href="/promotions"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isPromos && !isMoreTab ? 'text-[#00DFA9]' : 'text-[#94A3B8]/50 hover:text-[#94A3B8]'
            )}>
            <Gift className="h-5 w-5" />
            <span>Promos</span>
          </Link>

          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isMoreTab ? 'text-[#00DFA9]' : 'text-[#94A3B8]/50 hover:text-[#94A3B8]'
            )}>
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>

        </div>
      </nav>

      {/* ── Bet Slip drawer ──────────────────────────────────────────────── */}
      <Drawer open={betSlipOpen} onOpenChange={setBetSlipOpen}>
        <DrawerContent className="xl:hidden bg-[#0D1117] border-t border-[#253241] h-[82vh] p-0 overflow-hidden flex flex-col">
          <div className="sr-only">
            <DrawerTitle>Bet Slip</DrawerTitle>
            <DrawerDescription>View and manage your current bet selections</DrawerDescription>
          </div>
          <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#253241]" />
          </div>
          <BetSlip forceExpanded />
        </DrawerContent>
      </Drawer>

      {/* ── Sports browser sheet ─────────────────────────────────────────── */}
      <Drawer open={sportsOpen} onOpenChange={setSportsOpen}>
        <DrawerContent className="xl:hidden bg-[#0D1117] border-t border-[#253241] h-[88vh] p-0 flex flex-col overflow-hidden">
          <div className="sr-only">
            <DrawerTitle>Browse Sports</DrawerTitle>
            <DrawerDescription>Select a sport to filter matches</DrawerDescription>
          </div>
          <div className="flex items-center justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#253241]" />
          </div>
          <div className="px-4 pb-3 shrink-0 border-b border-[#253241]/60">
            <h2 className="text-[15px] font-bold text-[#F8FAFC]">Browse Sports</h2>
            <p className="text-[12px] text-[#94A3B8]/60 mt-0.5">Tap a sport to filter matches</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2.5 p-4 pb-8">
              <button onClick={() => handleSelectSport('all')}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/30 transition-all active:scale-95">
                <span className="text-2xl">🏆</span>
                <span className="text-[11px] font-semibold text-[#00DFA9] text-center leading-tight">All Sports</span>
              </button>
              {SPORTS.map(sport => (
                <button key={sport.id} onClick={() => handleSelectSport(sport.id)}
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-[#121821] border border-[#253241] hover:border-[#00DFA9]/30 hover:bg-[#18212B] active:scale-95 transition-all duration-150">
                  <span className="text-2xl">{sport.icon}</span>
                  <span className="text-[11px] font-medium text-[#94A3B8] text-center leading-tight">{sport.name}</span>
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* ── More menu drawer ─────────────────────────────────────────────── */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent
          className="xl:hidden bg-[#0B0F14] border-t border-[#253241]/80 p-0 flex flex-col overflow-hidden"
          style={{ maxHeight: '88vh' }}
        >
          <div className="sr-only">
            <DrawerTitle>More</DrawerTitle>
            <DrawerDescription>Navigate to additional sections</DrawerDescription>
          </div>

          {/* ── Drag handle ── */}
          <div className="flex items-center justify-center pt-2.5 pb-1.5 shrink-0">
            <div className="w-9 h-[3px] rounded-full bg-[#253241]" />
          </div>

          {/* ── Header: brand + account ── */}
          <div className="relative px-4 pt-2 pb-4 shrink-0 overflow-hidden">
            {/* Subtle glow behind header */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#00DFA9]/4 to-transparent pointer-events-none" />

            <div className="relative flex items-center justify-between">
              {/* Logo */}
              <img
                src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/cupbetlogo-1.webp"
                alt="CupBett"
                className="h-7 object-contain"
              />

              {/* Close + wallet status */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.8)]" />
                    <span className="text-[11px] font-semibold text-[#00DFA9] font-mono tracking-tight">
                      {shortAddress}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => { setMoreOpen(false); connect(); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#00DFA9] text-[#0B0F14] text-[11px] font-bold shadow-[0_0_12px_rgba(0,223,169,0.3)] active:scale-95 transition-transform"
                  >
                    <Wallet className="h-3 w-3" />
                    Connect
                  </button>
                )}
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-7 h-7 rounded-lg bg-[#1E2A38]/80 flex items-center justify-center text-[#94A3B8]/50 hover:text-[#F8FAFC] active:scale-90 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Connected strip */}
            {isConnected && (
              <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#121821] border border-[#253241]/60">
                <div className="w-7 h-7 rounded-lg bg-[#00DFA9]/10 flex items-center justify-center shrink-0">
                  <Wallet className="h-3.5 w-3.5 text-[#00DFA9]" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-[#94A3B8]/40 font-semibold">Wallet</p>
                  <p className="text-[12px] font-bold text-[#F8FAFC] leading-none mt-0.5 font-mono">{shortAddress}</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-[#00DFA9]">
                  <Zap className="h-3 w-3" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Active</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">

            {/* ── Quick action cards 2×2 ── */}
            <div className="px-4 pb-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]/35 mb-2.5">Quick Access</p>
              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_ACTIONS.map(action => {
                  const Icon = action.icon;
                  const active = location === action.href;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'relative flex flex-col gap-2 p-3.5 rounded-2xl border overflow-hidden',
                        'active:scale-[0.96] transition-all duration-150 cursor-pointer'
                      )}
                      style={{
                        background: active
                          ? action.bg.replace('0.08', '0.14')
                          : action.bg,
                        borderColor: active
                          ? action.border.replace('0.18', '0.40')
                          : action.border,
                      }}
                    >
                      {/* Subtle corner glow */}
                      <div
                        className="absolute -top-4 -right-4 w-12 h-12 rounded-full opacity-30 blur-xl pointer-events-none"
                        style={{ background: action.color }}
                      />
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: action.bg.replace('0.08', '0.15'), color: action.color }}
                      >
                        <Icon className="h-4.5 w-4.5" style={{ height: '18px', width: '18px' }} />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-[#F8FAFC] leading-tight">{action.label}</p>
                        <p className="text-[10px] text-[#94A3B8]/50 mt-0.5 leading-tight">{action.sub}</p>
                      </div>
                      {active && (
                        <div className="absolute top-2.5 right-2.5">
                          <Check className="h-3 w-3" style={{ color: action.color }} />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* ── Odds Format switcher ── */}
            <div className="px-4 pb-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]/35 mb-2.5">Odds Format</p>
              <div className="flex rounded-xl bg-[#121821] border border-[#253241]/60 p-1 gap-1">
                {ODDS_FORMATS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    className={cn(
                      'flex-1 flex flex-col items-center py-2.5 rounded-lg transition-all duration-200 active:scale-95',
                      format === opt.value
                        ? 'bg-[#00DFA9] shadow-[0_2px_8px_rgba(0,223,169,0.3)]'
                        : 'hover:bg-[#1E2A38]'
                    )}
                  >
                    <span className={cn(
                      'text-[11px] font-bold tracking-wider',
                      format === opt.value ? 'text-[#0B0F14]' : 'text-[#94A3B8]/60'
                    )}>
                      {opt.label}
                    </span>
                    <span className={cn(
                      'text-[9px] mt-0.5',
                      format === opt.value ? 'text-[#0B0F14]/70' : 'text-[#94A3B8]/30'
                    )}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Legal links ── */}
            <div className="px-4 pb-8">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]/35 mb-2.5">Legal</p>
              <div className="rounded-2xl overflow-hidden border border-[#253241]/50 bg-[#0D1117]">
                {LEGAL_LINKS.map((item, i) => {
                  const Icon = item.icon;
                  const active = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3.5 transition-all duration-150 active:scale-[0.98]',
                        i > 0 && 'border-t border-[#253241]/40',
                        active
                          ? 'bg-[#00DFA9]/6 text-[#00DFA9]'
                          : 'text-[#94A3B8]/70 hover:bg-[#121821] hover:text-[#F8FAFC]'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        active ? 'bg-[#00DFA9]/12' : 'bg-[#1E2A38]/60'
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[13px] font-medium flex-1">{item.label}</span>
                      <ChevronRight className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
                        active ? 'text-[#00DFA9]/50' : 'text-[#94A3B8]/20'
                      )} />
                    </Link>
                  );
                })}
              </div>

              {/* Version badge */}
              <div className="mt-4 flex items-center justify-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-[#00DFA9]/40" />
                <span className="text-[9px] text-[#94A3B8]/25 tracking-wider font-medium uppercase">CupBett v1.0 · 18+ · Gamble Responsibly</span>
                <div className="w-1 h-1 rounded-full bg-[#00DFA9]/40" />
              </div>
            </div>

          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
