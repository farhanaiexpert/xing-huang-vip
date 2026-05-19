import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { SportsSidebar } from '@/components/SportsSidebar';
import { MainContent } from '@/components/MainContent';
import { BetSlip } from '@/components/BetSlip';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useBetSlip } from '@/hooks/useBetSlip';
import { Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Home() {
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const { selections } = useBetSlip();

  // Detect new selections for FAB pulse animation
  const prevCount = useRef(selections.length);
  const [fabPulse, setFabPulse] = useState(false);
  useEffect(() => {
    const added = selections.length > prevCount.current;
    prevCount.current = selections.length;
    if (!added) return;
    setFabPulse(true);
    const t = setTimeout(() => setFabPulse(false), 600);
    return () => clearTimeout(t);
  }, [selections.length]);

  // Track main-content scroll to drive BetSlip compact mode
  const [slipScrolled, setSlipScrolled] = useState(false);
  useEffect(() => {
    // The scroll container is rendered by MainContent — poll briefly to find it
    let el: HTMLElement | null = null;
    const attach = () => {
      el = document.getElementById('main-content-scroll');
      if (!el) return false;
      const handler = () => setSlipScrolled(el!.scrollTop > 90);
      el.addEventListener('scroll', handler, { passive: true });
      return () => el!.removeEventListener('scroll', handler);
    };
    // Try immediately, then retry once after paint
    const cleanup = attach();
    if (cleanup) return cleanup;
    const raf = requestAnimationFrame(() => {
      const c = attach();
      if (c) return; // cleanup stored elsewhere — fine, component will unmount
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        <SportsSidebar
          selectedSportId={selectedSportId || ''}
          onSelectSport={setSelectedSportId}
        />

        <MainContent
          selectedSportId={selectedSportId}
          onSelectSport={setSelectedSportId}
        />

        {/* Spacer to reserve room for the fixed BetSlip panel */}
        <div className="w-[260px] shrink-0 hidden xl:block" />

        <BetSlip isScrolled={slipScrolled} />
      </div>

      {/* ── Mobile Bet Slip FAB ──────────────────────────────────────── */}
      <div className="xl:hidden fixed bottom-6 right-6 z-50">
        <Drawer>
          <DrawerTrigger asChild>
            <button
              aria-label="Open Bet Slip"
              data-testid="button-mobile-bet-slip"
              className={cn(
                'relative h-14 w-14 rounded-full flex items-center justify-center',
                'bg-[#00DFA9] text-[#0B0F14]',
                'shadow-[0_0_24px_rgba(0,223,169,0.45),0_4px_20px_rgba(0,0,0,0.5)]',
                'transition-all duration-300',
                'hover:shadow-[0_0_36px_rgba(0,223,169,0.65)] hover:scale-[1.08]',
                'active:scale-[0.94]',
                fabPulse && 'scale-[1.18] shadow-[0_0_40px_rgba(0,223,169,0.8)]'
              )}
            >
              <Receipt className="h-6 w-6" />

              {selections.length > 0 && (
                <span
                  className={cn(
                    'absolute -top-2 -right-2',
                    'bg-[#EF4444] text-[#F8FAFC]',
                    'border-2 border-[#0B0F14]',
                    'text-[10px] font-bold',
                    'h-6 w-6 rounded-full',
                    'flex items-center justify-center',
                    'shadow-[0_0_12px_rgba(239,68,68,0.6)]',
                    'transition-transform duration-200',
                    fabPulse ? 'scale-125' : 'scale-100'
                  )}
                >
                  {selections.length}
                </span>
              )}
            </button>
          </DrawerTrigger>

          <DrawerContent className="bg-[#0D1117] border-t border-[#253241] h-[82vh] p-0 overflow-hidden">
            <div className="sr-only">
              <DrawerTitle>Bet Slip</DrawerTitle>
              <DrawerDescription>View and manage your current bet selections</DrawerDescription>
            </div>
            {/* Drag handle area */}
            <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#253241]" />
            </div>
            <BetSlip className="w-full xl:flex h-full border-l-0" forceExpanded />
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

export default Home;
