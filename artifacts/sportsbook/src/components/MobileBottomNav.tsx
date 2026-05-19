import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Home, Grid3X3, Receipt, Gift, MoreHorizontal,
  History, HelpCircle, Star, FileText, ShieldCheck,
  HeartHandshake, Landmark, ChevronRight, Wallet, X,
} from 'lucide-react';
import { useBetSlip } from '../hooks/useBetSlip';
import { useWallet } from '../hooks/useWallet';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from './ui/drawer';
import { BetSlip } from './BetSlip';
import { SPORTS } from '../data/mockData';
import { cn } from '../lib/utils';

const MORE_SECTIONS = [
  {
    heading: 'My Account',
    items: [
      { icon: History,      label: 'Bet History',          href: '/bet-history' },
      { icon: Star,         label: 'WinSpin',              href: '/winspin'     },
    ],
  },
  {
    heading: 'Support',
    items: [
      { icon: HelpCircle,   label: 'Help & Rules',         href: '/help'                   },
      { icon: HeartHandshake, label: 'Responsible Gambling', href: '/responsible-gambling'  },
    ],
  },
  {
    heading: 'Legal',
    items: [
      { icon: FileText,     label: 'Terms & Conditions',   href: '/terms'   },
      { icon: ShieldCheck,  label: 'Privacy Policy',       href: '/privacy' },
      { icon: Landmark,     label: 'AML Policy',           href: '/aml'     },
    ],
  },
];

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { selections } = useBetSlip();
  const { isConnected, shortAddress } = useWallet();
  const [betSlipOpen, setBetSlipOpen] = useState(false);
  const [sportsOpen,  setSportsOpen]  = useState(false);
  const [moreOpen,    setMoreOpen]    = useState(false);

  // Auto-open bet slip when a new selection is added (mobile UX)
  const prevCountRef = useRef(selections.length);
  useEffect(() => {
    if (selections.length > prevCountRef.current) {
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
  const isMore   = MORE_SECTIONS.flatMap(s => s.items).some(i => location === i.href);

  return (
    <>
      {/* ── Bottom nav bar ──────────────────────────────────────────── */}
      <nav
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1117]/97 backdrop-blur-xl border-t border-[#253241]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch h-14">

          {/* Home */}
          <Link href="/"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isHome ? 'text-[#00DFA9]' : 'text-[#94A3B8]/55 hover:text-[#94A3B8]'
            )}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>

          {/* Sports */}
          <button
            onClick={() => setSportsOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              sportsOpen ? 'text-[#00DFA9]' : 'text-[#94A3B8]/55 hover:text-[#94A3B8]'
            )}
          >
            <Grid3X3 className="h-5 w-5" />
            <span>Sports</span>
          </button>

          {/* Bet Slip — centre accent tab */}
          <button
            onClick={() => setBetSlipOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
          >
            <div className={cn(
              'relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200',
              selections.length > 0
                ? 'bg-[#00DFA9] text-[#0B0F14] shadow-[0_0_20px_rgba(0,223,169,0.4)]'
                : 'bg-[#1E2A38] text-[#94A3B8]/60'
            )}>
              <Receipt className="h-[18px] w-[18px]" />
              {selections.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[#EF4444] border-2 border-[#0D1117] text-white text-[9px] font-bold flex items-center justify-center px-0.5 tabular-nums">
                  {selections.length}
                </span>
              )}
            </div>
          </button>

          {/* Promotions */}
          <Link href="/promotions"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isPromos ? 'text-[#00DFA9]' : 'text-[#94A3B8]/55 hover:text-[#94A3B8]'
            )}
          >
            <Gift className="h-5 w-5" />
            <span>Promos</span>
          </Link>

          {/* More */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isMore || moreOpen ? 'text-[#00DFA9]' : 'text-[#94A3B8]/55 hover:text-[#94A3B8]'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </button>

        </div>
      </nav>

      {/* ── Bet Slip drawer ─────────────────────────────────────────────── */}
      <Drawer open={betSlipOpen} onOpenChange={setBetSlipOpen}>
        <DrawerContent className="xl:hidden bg-[#0D1117] border-t border-[#253241] h-[82vh] p-0 overflow-hidden flex flex-col">
          <div className="sr-only">
            <DrawerTitle>Bet Slip</DrawerTitle>
            <DrawerDescription>View and manage your current bet selections</DrawerDescription>
          </div>
          {/* Drag handle */}
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
              <button
                onClick={() => handleSelectSport('all')}
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/30 transition-all active:scale-95"
              >
                <span className="text-2xl">🏆</span>
                <span className="text-[11px] font-semibold text-[#00DFA9] text-center leading-tight">All Sports</span>
              </button>
              {SPORTS.map(sport => (
                <button
                  key={sport.id}
                  onClick={() => handleSelectSport(sport.id)}
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl bg-[#121821] border border-[#253241] hover:border-[#00DFA9]/30 hover:bg-[#18212B] active:scale-95 transition-all duration-150"
                >
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
        <DrawerContent className="xl:hidden bg-[#0D1117] border-t border-[#253241] p-0 flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh' }}>
          <div className="sr-only">
            <DrawerTitle>More</DrawerTitle>
            <DrawerDescription>Additional pages and account options</DrawerDescription>
          </div>

          {/* Handle + header */}
          <div className="flex items-center justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#253241]" />
          </div>
          <div className="flex items-center justify-between px-4 pb-3 shrink-0 border-b border-[#253241]/60">
            <div>
              <h2 className="text-[15px] font-bold text-[#F8FAFC]">More</h2>
              {isConnected && shortAddress && (
                <p className="text-[11px] text-[#00DFA9] mt-0.5 font-mono">{shortAddress}</p>
              )}
            </div>
            <button onClick={() => setMoreOpen(false)}
              className="w-8 h-8 rounded-lg bg-[#1E2A38] flex items-center justify-center text-[#94A3B8]/60 hover:text-[#F8FAFC] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Wallet row (if not connected) */}
          {!isConnected && (
            <div className="px-4 pt-3 pb-1 shrink-0">
              <button
                onClick={() => {
                  setMoreOpen(false);
                  window.dispatchEvent(new CustomEvent('mobile-open-wallet'));
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/25 text-left transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-xl bg-[#00DFA9]/15 flex items-center justify-center shrink-0">
                  <Wallet className="h-4 w-4 text-[#00DFA9]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#00DFA9]">Connect Wallet</p>
                  <p className="text-[11px] text-[#94A3B8]/60">Login to place bets</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#00DFA9]/50 ml-auto" />
              </button>
            </div>
          )}

          {/* Nav sections */}
          <div className="flex-1 overflow-y-auto px-4 py-2 pb-6">
            {MORE_SECTIONS.map((section, si) => (
              <div key={section.heading} className={cn(si > 0 && 'mt-4')}>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]/35 mb-1.5 px-1">
                  {section.heading}
                </p>
                <div className="rounded-xl overflow-hidden border border-[#253241]/60">
                  {section.items.map((item, ii) => {
                    const Icon = item.icon;
                    const active = location === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3.5 transition-colors duration-150',
                          ii > 0 && 'border-t border-[#253241]/50',
                          active
                            ? 'bg-[#00DFA9]/8 text-[#00DFA9]'
                            : 'bg-[#121821] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#18212B]'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          active ? 'bg-[#00DFA9]/15' : 'bg-[#1E2A38]'
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[13px] font-medium flex-1">{item.label}</span>
                        <ChevronRight className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          active ? 'text-[#00DFA9]/60' : 'text-[#94A3B8]/25'
                        )} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
