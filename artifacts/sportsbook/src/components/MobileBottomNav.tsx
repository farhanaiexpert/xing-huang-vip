import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Grid3X3, Receipt, Gift, MoreHorizontal } from 'lucide-react';
import { useBetSlip } from '../hooks/useBetSlip';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from './ui/drawer';
import { BetSlip } from './BetSlip';
import { SPORTS } from '../data/mockData';
import { cn } from '../lib/utils';

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { selections } = useBetSlip();
  const [betSlipOpen, setBetSlipOpen] = useState(false);
  const [sportsOpen, setSportsOpen] = useState(false);

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
  const isMore   = ['/help', '/bet-history', '/terms', '/privacy', '/responsible-gambling', '/aml'].includes(location);

  return (
    <>
      {/* ── Bottom nav bar ────────────────────────────────────────── */}
      <nav
        className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1117]/95 backdrop-blur-xl border-t border-[#253241]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch h-14">

          {/* Home */}
          <Link
            href="/"
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
          <Link
            href="/promotions"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isPromos ? 'text-[#00DFA9]' : 'text-[#94A3B8]/55 hover:text-[#94A3B8]'
            )}
          >
            <Gift className="h-5 w-5" />
            <span>Promos</span>
          </Link>

          {/* More */}
          <Link
            href="/help"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-150',
              isMore ? 'text-[#00DFA9]' : 'text-[#94A3B8]/55 hover:text-[#94A3B8]'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>More</span>
          </Link>

        </div>
      </nav>

      {/* ── Bet Slip drawer ──────────────────────────────────────────── */}
      <Drawer open={betSlipOpen} onOpenChange={setBetSlipOpen}>
        <DrawerContent className="xl:hidden bg-[#0D1117] border-t border-[#253241] h-[82vh] p-0 overflow-hidden">
          <div className="sr-only">
            <DrawerTitle>Bet Slip</DrawerTitle>
            <DrawerDescription>View and manage your current bet selections</DrawerDescription>
          </div>
          <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#253241]" />
          </div>
          <BetSlip className="w-full xl:flex h-full border-l-0" forceExpanded />
        </DrawerContent>
      </Drawer>

      {/* ── Sports browser sheet ─────────────────────────────────────── */}
      <Drawer open={sportsOpen} onOpenChange={setSportsOpen}>
        <DrawerContent className="xl:hidden bg-[#0D1117] border-t border-[#253241] h-[88vh] p-0 flex flex-col overflow-hidden">
          <div className="sr-only">
            <DrawerTitle>Browse Sports</DrawerTitle>
            <DrawerDescription>Select a sport to filter matches</DrawerDescription>
          </div>

          {/* Handle */}
          <div className="flex items-center justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#253241]" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 shrink-0 border-b border-[#253241]/60">
            <h2 className="text-[15px] font-bold text-[#F8FAFC]">Browse Sports</h2>
            <p className="text-[12px] text-[#94A3B8]/60 mt-0.5">Tap a sport to filter matches</p>
          </div>

          {/* Sport grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2.5 p-4 pb-8">
              {/* All Sports */}
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
    </>
  );
}
