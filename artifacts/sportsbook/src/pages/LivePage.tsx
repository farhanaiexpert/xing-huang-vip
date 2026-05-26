import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';
import { Radio, RefreshCw, AlertCircle, ChevronRight, Clock } from 'lucide-react';
import { Header } from '@/components/Header';
import { BetSlip } from '@/components/BetSlip';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { useAuth } from '@/contexts/AuthContext';
import { formatOdds } from '@/lib/oddsFormat';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { playOddsAdd, playOddsRemove } from '@/lib/oddsSound';

const POLL_INTERVAL = 30_000;

interface LiveOutcome {
  name: string;
  price: number;
}

interface LiveMarket {
  key: string;
  last_update: string;
  outcomes: LiveOutcome[];
}

interface LiveBookmaker {
  key: string;
  title: string;
  markets: LiveMarket[];
}

interface LiveEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: LiveBookmaker[];
  score?: { home: string; away: string };
}

interface ScoreEntry {
  id: string;
  scores: Array<{ name: string; score: string }> | null;
  last_update: string | null;
}

function getH2HMarket(event: LiveEvent): LiveMarket | null {
  for (const bm of event.bookmakers) {
    const mkt = bm.markets.find(m => m.key === 'h2h');
    if (mkt) return mkt;
  }
  return null;
}

function formatElapsed(commenceTime: string): string {
  const diff = Math.floor((Date.now() - new Date(commenceTime).getTime()) / 60000);
  if (diff < 1) return 'Just started';
  if (diff < 90) return `${diff}'`;
  return '90+';
}

function ScoreBadge({ score }: { score?: { home: string; away: string } }) {
  if (!score) return null;
  return (
    <span className="inline-flex items-center gap-1 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums">
      {score.home} – {score.away}
    </span>
  );
}

interface LiveOddsButtonProps {
  event: LiveEvent;
  outcome: LiveOutcome;
  marketKey: string;
  score?: { home: string; away: string };
}

function LiveOddsButton({ event, outcome, marketKey, score }: LiveOddsButtonProps) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { format } = useOddsFormat();

  const selectionId = `live_${event.id}_${marketKey}_${outcome.name}`;
  const isSelected = hasSelection(selectionId);

  const label =
    outcome.name === event.home_team ? '1'
    : outcome.name === event.away_team ? '2'
    : 'X';

  function handleClick() {
    if (!isAuthenticated) {
      window.dispatchEvent(new Event('openLoginModal'));
      return;
    }
    if (isSelected) {
      removeSelection(selectionId);
      playOddsRemove();
    } else {
      const scoreLabel = score ? `${score.home}-${score.away}` : undefined;
      addSelection({
        id: selectionId,
        marketId: `live_${event.id}_${marketKey}`,
        matchId: event.id,
        matchName: `${event.home_team} v ${event.away_team}`,
        leagueName: event.sport_title ?? event.sport_key,
        marketName: 'Match Result',
        selectionType: label,
        selectionName: outcome.name,
        odds: outcome.price,
        sportId: event.sport_key,
        isLive: true,
        scoreAtPlacement: scoreLabel,
      });
      playOddsAdd();
      toast({
        title: 'Added to bet slip',
        description: `${outcome.name} @ ${formatOdds(outcome.price, format)}`,
      });
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-center transition-all duration-150 min-w-[72px]',
        isSelected
          ? 'bg-[#00DFA9]/15 border-[#00DFA9]/50 text-[#00DFA9]'
          : 'bg-[#121821] border-[#253241] text-[#94A3B8] hover:border-[#00DFA9]/30 hover:text-[#F8FAFC]'
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">{label}</span>
      <span className="text-[13px] font-bold tabular-nums">{formatOdds(outcome.price, format)}</span>
    </button>
  );
}

function LiveMatchCard({ event }: { event: LiveEvent }) {
  const h2h = getH2HMarket(event);
  const elapsed = formatElapsed(event.commence_time);

  return (
    <div className="rounded-2xl bg-[#0E1520] border border-white/[0.07] overflow-hidden hover:border-[#EF4444]/20 transition-colors">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#EF4444]/5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#EF4444] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
            LIVE
          </span>
          <span className="text-[10px] text-[#64748B]">·</span>
          <span className="text-[10px] text-[#64748B]">{elapsed}</span>
        </div>
        <div className="flex items-center gap-2">
          {event.score && <ScoreBadge score={event.score} />}
          <span className="text-[10px] text-[#475569]">{event.sport_title ?? event.sport_key}</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-3">
          <p className="text-[13px] font-semibold text-[#F8FAFC] truncate">{event.home_team}</p>
          <p className="text-[11px] text-[#64748B] my-0.5">vs</p>
          <p className="text-[13px] font-semibold text-[#F8FAFC] truncate">{event.away_team}</p>
        </div>

        {h2h ? (
          <div className="flex items-center gap-2 flex-wrap">
            {h2h.outcomes.map(outcome => (
              <LiveOddsButton
                key={outcome.name}
                event={event}
                outcome={outcome}
                marketKey="h2h"
                score={event.score}
              />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[#475569] italic">Odds unavailable</p>
        )}
      </div>
    </div>
  );
}

export function LivePage() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slipScrolled, setSlipScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drive BetSlip compact mode on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setSlipScrolled(el.scrollTop > 90);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const fetchLive = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [evRes, scRes] = await Promise.all([
        fetch('/api/live/events'),
        fetch('/api/live/scores'),
      ]);

      if (!evRes.ok) {
        setError('Failed to load live events');
        return;
      }

      const evData = await evRes.json() as { events: LiveEvent[]; count: number };
      const scData = scRes.ok ? await scRes.json() as { scores: ScoreEntry[] } : { scores: [] };

      const scoreMap = new Map<string, { home: string; away: string }>();
      for (const sc of scData.scores) {
        if (sc.scores && sc.scores.length >= 2) {
          scoreMap.set(sc.id, { home: sc.scores[0].score, away: sc.scores[1].score });
        }
      }

      const merged = evData.events.map(ev => ({
        ...ev,
        score: scoreMap.get(ev.id),
      }));

      setEvents(merged);
      setLastUpdated(new Date());
    } catch {
      setError('Network error loading live events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    timerRef.current = setInterval(() => fetchLive(true), POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchLive]);

  const groupedBySport = events.reduce<Record<string, LiveEvent[]>>((acc, ev) => {
    const key = ev.sport_title ?? ev.sport_key;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Scrollable main area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* Sticky sub-header */}
          <div className="sticky top-0 z-20 bg-[#0B0F14]/95 backdrop-blur-xl border-b border-[#253241]/60 px-4 md:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <h1 className="text-[15px] font-bold text-[#F8FAFC]">Live Betting</h1>
                </div>
                {events.length > 0 && (
                  <span className="text-[11px] font-bold bg-[#EF4444] text-white px-2 py-0.5 rounded-full tabular-nums">
                    {events.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] text-[#475569]">
                    <Clock className="h-3 w-3" />
                    {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
                <button
                  onClick={() => fetchLive()}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#64748B] border border-white/[0.08] bg-[#0E1520] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-all"
                >
                  <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 md:px-6 py-6 pb-24">
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#EF4444]/8 border border-[#EF4444]/20 mb-6">
                <AlertCircle className="h-4 w-4 text-[#EF4444] shrink-0" />
                <p className="text-[13px] text-[#EF4444]">{error}</p>
              </div>
            )}

            {loading && events.length === 0 && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-[#0E1520] border border-white/[0.07] h-[120px] animate-pulse" />
                ))}
              </div>
            )}

            {!loading && events.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-16 h-16 rounded-full bg-[#0E1520] border border-white/[0.07] flex items-center justify-center">
                  <Radio className="h-7 w-7 text-[#475569]" />
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-[#94A3B8]">No live events right now</p>
                  <p className="text-[12px] text-[#475569] mt-1">Check back soon — this page refreshes every 30 seconds</p>
                </div>
                <Link href="/" className="flex items-center gap-1.5 text-[13px] font-semibold text-[#00DFA9] hover:underline mt-2">
                  Browse upcoming matches <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {!loading && events.length > 0 && (
              <div className="space-y-8">
                {Object.entries(groupedBySport).map(([sport, sportEvents]) => (
                  <div key={sport}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                      <h2 className="text-[12px] font-bold uppercase tracking-widest text-[#64748B]">{sport}</h2>
                      <span className="text-[10px] text-[#475569] bg-white/[0.05] px-2 py-0.5 rounded-full">{sportEvents.length}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {sportEvents.map(event => (
                        <LiveMatchCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-center text-[10px] text-[#475569] mt-8">
                  Odds and scores update every 30 seconds
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Spacer for fixed BetSlip */}
        <div className="w-[260px] shrink-0 hidden xl:block" />
        <BetSlip isScrolled={slipScrolled} />
      </div>
    </div>
  );
}
