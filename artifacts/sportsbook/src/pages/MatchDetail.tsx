import { useState, useCallback, useRef, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ScrollArea } from '../components/ui/scroll-area';
import { BetSlip } from '../components/BetSlip';
import { Header } from '../components/Header';
import { MatchHeader } from '../components/match/MatchHeader';
import { MarketGroup } from '../components/match/MarketGroup';
import { MarketNav } from '../components/match/MarketNav';
import { ALL_MATCHES } from '../data/matches';
import { LEAGUES_CATALOG } from '../data/catalog';
import { generateDetailMarkets } from '../data/marketDetails';
import { useBetSlip } from '../hooks/useBetSlip';
import { Receipt } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerDescription } from '../components/ui/drawer';
import { cn } from '../lib/utils';

export function MatchDetail() {
  const [, params] = useRoute<{ id: string }>('/match/:id');
  const [, setLocation] = useLocation();
  const matchId = params?.id;

  const match  = ALL_MATCHES.find(m => m.id === matchId);
  const league = match ? LEAGUES_CATALOG.find(l => l.id === match.leagueId) : undefined;

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const { selections } = useBetSlip();
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Generate markets once match is resolved
  const groups = match ? generateDetailMarkets(match) : [];

  // Set initial active nav
  useEffect(() => {
    if (groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups.length]);

  // Scroll to a market group when nav tab is clicked
  const handleNavSelect = useCallback((id: string) => {
    setActiveGroupId(id);
    const el = groupRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Mobile FAB state
  const prevCount  = useRef(selections.length);
  const [fabPulse, setFabPulse] = useState(false);
  useEffect(() => {
    const added = selections.length > prevCount.current;
    prevCount.current = selections.length;
    if (!added) return;
    setFabPulse(true);
    const t = setTimeout(() => setFabPulse(false), 600);
    return () => clearTimeout(t);
  }, [selections.length]);

  if (!match || !league) {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-[#F8FAFC] mb-2">Match not found</p>
            <button
              onClick={() => setLocation('/')}
              className="text-sm text-[#38BDF8] hover:underline"
            >
              ← Back to all sports
            </button>
          </div>
        </div>
      </div>
    );
  }

  const matchName = match.awayTeamName
    ? `${match.homeTeamName} vs ${match.awayTeamName}`
    : match.homeTeamName;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* ── Main column ───────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ScrollArea className="flex-1 h-[calc(100vh-3.5rem)]">

            {/* Match header */}
            <MatchHeader match={match} league={league} />

            {/* Sticky market navigation */}
            <MarketNav
              groups={groups}
              activeId={activeGroupId}
              onSelect={handleNavSelect}
            />

            {/* Market groups */}
            <div className="px-4 py-4 space-y-3 pb-10">
              {/* Live banner if match is live */}
              {match.isLive && (
                <div className="flex items-center gap-3 bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl px-4 py-3">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#EF4444]">Match is Live</p>
                    <p className="text-xs text-[#94A3B8]">Odds may be suspended during key moments · {match.liveMinute}' played</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#EF4444] shrink-0">
                    {match.score ? `${match.score.home} – ${match.score.away}` : 'In Progress'}
                  </span>
                </div>
              )}

              {groups.map(group => (
                <div
                  key={group.id}
                  ref={el => { groupRefs.current[group.id] = el; }}
                  style={{ scrollMarginTop: '40px' }}
                >
                  <MarketGroup
                    group={group}
                    matchId={match.id}
                    matchName={matchName}
                    leagueName={league.name}
                  />
                </div>
              ))}

              {/* Footer note */}
              <div className="text-center py-4">
                <p className="text-[10px] text-[#94A3B8]/30">
                  All odds subject to change · Please gamble responsibly · 18+
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* ── Right: Bet Slip ────────────────────────────────────────── */}
        <BetSlip />
      </div>

      {/* ── Mobile Bet Slip FAB ────────────────────────────────────────── */}
      <div className="xl:hidden fixed bottom-6 right-6 z-50">
        <Drawer>
          <DrawerTrigger asChild>
            <button
              aria-label="Open Bet Slip"
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
                <span className={cn(
                  'absolute -top-2 -right-2 bg-[#EF4444] text-[#F8FAFC]',
                  'border-2 border-[#0B0F14] text-[10px] font-bold',
                  'h-6 w-6 rounded-full flex items-center justify-center',
                  'shadow-[0_0_12px_rgba(239,68,68,0.6)]',
                  'transition-transform duration-200',
                  fabPulse ? 'scale-125' : 'scale-100'
                )}>
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
            <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#253241]" />
            </div>
            <BetSlip className="w-full xl:flex h-full border-l-0" />
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

export default MatchDetail;
