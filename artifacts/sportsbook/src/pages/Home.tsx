import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SportsSidebar } from '@/components/SportsSidebar';
import { MainContent } from '@/components/MainContent';
import { BetSlip } from '@/components/BetSlip';
import { useBetSlipSidebar } from '@/contexts/BetSlipSidebarContext';
import { cn } from '@/lib/utils';

export function Home() {
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  // Listen for mobile sport selection from MobileBottomNav
  useEffect(() => {
    const handler = (e: Event) => setSelectedSportId((e as CustomEvent<string>).detail);
    window.addEventListener('mobile-sport-select', handler);
    return () => window.removeEventListener('mobile-sport-select', handler);
  }, []);

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

  const { collapsed } = useBetSlipSidebar();

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
        <div className={cn('shrink-0 hidden xl:block transition-[width] duration-300', collapsed ? 'w-14' : 'w-[260px]')} />

        <BetSlip isScrolled={slipScrolled} />
      </div>

    </div>
  );
}

export default Home;
