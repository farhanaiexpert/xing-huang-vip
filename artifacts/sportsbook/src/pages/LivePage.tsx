import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Users, Flame, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { Header } from '@/components/Header';
import { BetSlip } from '@/components/BetSlip';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { useAuth } from '@/contexts/AuthContext';
import { formatOdds } from '@/lib/oddsFormat';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { playOddsAdd, playOddsRemove } from '@/lib/oddsSound';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Outcome {
  key: string;
  label: string;
  name: string;
  baseOdds: number;
  color: string;
  glow: string;
}

interface LiveMatch {
  id: string;
  sport: 'soccer' | 'basketball' | 'tennis';
  icon: string;
  league: string;
  stage: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | string;
  awayScore: number | string;
  liveLabel: string;
  volume: string;
  bettors: number;
  isHot: boolean;
  accent: string;
  outcomes: Outcome[];
}

// ─── 3 Exciting hardcoded live matches ──────────────────────────────────────

const BASE_MATCHES: LiveMatch[] = [
  {
    id: 'live-ucl-rm-mc-2025',
    sport: 'soccer',
    icon: '⚽',
    league: 'UEFA Champions League',
    stage: 'Semi-Final · 2nd Leg',
    homeTeam: 'Real Madrid',
    awayTeam: 'Manchester City',
    homeScore: 1,
    awayScore: 0,
    liveLabel: "67'",
    volume: '2.41M',
    bettors: 12847,
    isHot: true,
    accent: '#EF4444',
    outcomes: [
      { key: 'home', label: '1', name: 'Real Madrid',       baseOdds: 2.10, color: '#00DFA9', glow: 'rgba(0,223,169,0.25)' },
      { key: 'draw', label: 'X', name: 'Draw',              baseOdds: 3.40, color: '#FACC15', glow: 'rgba(250,204,21,0.25)' },
      { key: 'away', label: '2', name: 'Manchester City',   baseOdds: 2.90, color: '#38BDF8', glow: 'rgba(56,189,248,0.25)' },
    ],
  },
  {
    id: 'live-nba-lal-bos-2025',
    sport: 'basketball',
    icon: '🏀',
    league: 'NBA Finals',
    stage: 'Game 5 · Q3 8:24',
    homeTeam: 'LA Lakers',
    awayTeam: 'Boston Celtics',
    homeScore: 78,
    awayScore: 71,
    liveLabel: 'Q3',
    volume: '1.83M',
    bettors: 9342,
    isHot: true,
    accent: '#A855F7',
    outcomes: [
      { key: 'home', label: 'LAL', name: 'LA Lakers',        baseOdds: 1.85, color: '#A855F7', glow: 'rgba(168,85,247,0.25)' },
      { key: 'away', label: 'BOS', name: 'Boston Celtics',   baseOdds: 1.95, color: '#00DFA9', glow: 'rgba(0,223,169,0.25)' },
    ],
  },
  {
    id: 'live-wimbledon-djok-alca-2025',
    sport: 'tennis',
    icon: '🎾',
    league: 'Wimbledon',
    stage: 'Final · 3rd Set  7–5, 5–7, 5–4★',
    homeTeam: 'N. Djokovic',
    awayTeam: 'C. Alcaraz',
    homeScore: '5–4',
    awayScore: '★',
    liveLabel: '3S',
    volume: '987K',
    bettors: 6219,
    isHot: false,
    accent: '#00DFA9',
    outcomes: [
      { key: 'home', label: 'DJO', name: 'Djokovic',   baseOdds: 2.20, color: '#38BDF8', glow: 'rgba(56,189,248,0.25)' },
      { key: 'away', label: 'ALC', name: 'Alcaraz',    baseOdds: 1.72, color: '#FACC15', glow: 'rgba(250,204,21,0.25)' },
    ],
  },
];

// ─── Probability helpers ──────────────────────────────────────────────────────

function calcProbs(outcomes: Outcome[], simOdds: Record<string, number>): Record<string, number> {
  const implied = outcomes.reduce<Record<string, number>>((acc, o) => {
    acc[o.key] = 1 / (simOdds[o.key] ?? o.baseOdds);
    return acc;
  }, {});
  const total = Object.values(implied).reduce((s, v) => s + v, 0);
  const result: Record<string, number> = {};
  for (const k in implied) result[k] = Math.round((implied[k] / total) * 100);
  return result;
}

// ─── Odds drift simulation ────────────────────────────────────────────────────

type SimState = Record<string, Record<string, number>>; // matchId -> outcomeKey -> odds

function buildInitialSim(): SimState {
  const state: SimState = {};
  for (const m of BASE_MATCHES) {
    state[m.id] = {};
    for (const o of m.outcomes) state[m.id][o.key] = o.baseOdds;
  }
  return state;
}

function nudgeOdds(prev: SimState): SimState {
  const next: SimState = {};
  for (const m of BASE_MATCHES) {
    next[m.id] = { ...prev[m.id] };
    for (const o of m.outcomes) {
      const curr = next[m.id][o.key];
      const delta = (Math.random() - 0.5) * 0.08;
      next[m.id][o.key] = Math.max(1.05, Math.round((curr + delta) * 100) / 100);
    }
  }
  return next;
}

// ─── OutcomeRow (Polymarket-style clickable row) ──────────────────────────────

function OutcomeRow({
  match,
  outcome,
  prob,
  currentOdds,
  prevOdds,
}: {
  match: LiveMatch;
  outcome: Outcome;
  prob: number;
  currentOdds: number;
  prevOdds: number;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { format } = useOddsFormat();

  const selectionId = `live_${match.id}_h2h_${outcome.key}`;
  const isSelected = hasSelection(selectionId);
  const direction: 'up' | 'down' | 'stable' =
    currentOdds > prevOdds ? 'up' : currentOdds < prevOdds ? 'down' : 'stable';

  // Flash effect when odds change
  const [flashing, setFlashing] = useState(false);
  const prevOddsRef = useRef(prevOdds);
  useEffect(() => {
    if (prevOddsRef.current !== currentOdds) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 700);
      prevOddsRef.current = currentOdds;
      return () => clearTimeout(t);
    }
    return undefined;
  }, [currentOdds]);

  function handleClick() {
    if (!isAuthenticated) {
      window.dispatchEvent(new Event('openLoginModal'));
      return;
    }
    if (isSelected) {
      removeSelection(selectionId);
      playOddsRemove();
    } else {
      addSelection({
        id: selectionId,
        marketId: `live_${match.id}_h2h`,
        matchId: match.id,
        matchName: `${match.homeTeam} vs ${match.awayTeam}`,
        leagueName: match.league,
        marketName: 'Match Result',
        selectionType: outcome.label,
        selectionName: outcome.name,
        odds: currentOdds,
        sportId: match.sport,
        isLive: true,
      });
      playOddsAdd();
      toast({
        title: `${outcome.name} added`,
        description: `${match.homeTeam} vs ${match.awayTeam} @ ${formatOdds(currentOdds, format)}`,
        duration: 2500,
      });
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full group flex items-center gap-3 px-4 py-3 transition-all duration-200 rounded-xl',
        isSelected
          ? 'bg-[#00DFA9]/10 border border-[#00DFA9]/40'
          : 'hover:bg-white/[0.03] border border-transparent',
        flashing && !isSelected && 'animate-pulse',
      )}
    >
      {/* Outcome label pill */}
      <div
        className="w-10 h-8 rounded-lg flex items-center justify-center text-[10px] font-black tracking-wider shrink-0"
        style={{
          background: isSelected ? '#00DFA9' : `${outcome.color}18`,
          color: isSelected ? '#0B0F14' : outcome.color,
          border: `1px solid ${isSelected ? '#00DFA9' : outcome.color}30`,
        }}
      >
        {outcome.label}
      </div>

      {/* Name + prob bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn(
            'text-[13px] font-semibold leading-none',
            isSelected ? 'text-[#00DFA9]' : 'text-[#E2E8F0]'
          )}>
            {outcome.name}
          </span>
          <span
            className="text-[22px] font-black leading-none tabular-nums"
            style={{ color: isSelected ? '#00DFA9' : outcome.color }}
          >
            {prob}%
          </span>
        </div>
        {/* Probability bar */}
        <div className="h-2 rounded-full bg-[#1E2A38] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${prob}%`,
              background: isSelected
                ? '#00DFA9'
                : `linear-gradient(90deg, ${outcome.color}CC, ${outcome.color}80)`,
              boxShadow: isSelected ? `0 0 8px ${outcome.glow}` : undefined,
            }}
          />
        </div>
      </div>

      {/* Odds + movement */}
      <div className="shrink-0 text-right w-16">
        <div className={cn(
          'text-[14px] font-black tabular-nums transition-colors duration-300',
          isSelected ? 'text-[#00DFA9]' : 'text-[#F8FAFC]',
          flashing && direction === 'up' && 'text-[#22C55E]',
          flashing && direction === 'down' && 'text-[#EF4444]',
        )}>
          {formatOdds(currentOdds, format)}
        </div>
        <div className={cn(
          'flex items-center justify-end gap-0.5 text-[9px] font-bold mt-0.5',
          direction === 'up' ? 'text-[#22C55E]' : direction === 'down' ? 'text-[#EF4444]' : 'text-[#475569]'
        )}>
          {direction === 'up' ? <TrendingUp className="h-2.5 w-2.5" /> :
           direction === 'down' ? <TrendingDown className="h-2.5 w-2.5" /> :
           <Minus className="h-2.5 w-2.5" />}
          {direction === 'stable' ? 'stable' : direction === 'up' ? 'rising' : 'falling'}
        </div>
      </div>
    </button>
  );
}

// ─── LiveMatchCard ────────────────────────────────────────────────────────────

function LiveMatchCard({
  match,
  simOdds,
  prevSimOdds,
}: {
  match: LiveMatch;
  simOdds: Record<string, number>;
  prevSimOdds: Record<string, number>;
}) {
  const probs = calcProbs(match.outcomes, simOdds);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(160deg, #0D1520 0%, #0A1018 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 16px 48px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Top accent stripe */}
      <div className="h-[2px]" style={{
        background: `linear-gradient(90deg, ${match.accent}CC, ${match.accent}40, transparent)`,
      }} />

      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          {/* Live pulse */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-black text-[#EF4444] tracking-widest">LIVE</span>
            <span className="text-[10px] font-bold text-[#EF4444]/70">{match.liveLabel}</span>
          </div>
          <span className="text-[11px] font-medium text-[#64748B]">{match.icon} {match.league}</span>
        </div>
        <div className="flex items-center gap-2">
          {match.isHot && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FACC15]/10 border border-[#FACC15]/20">
              <Flame className="h-2.5 w-2.5 text-[#FACC15]" />
              <span className="text-[9px] font-black text-[#FACC15] tracking-wider">HOT</span>
            </div>
          )}
          <span className="text-[10px] text-[#475569]">{match.stage}</span>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="px-4 py-5">
        {match.sport === 'tennis' ? (
          /* Tennis: side-by-side with serve indicator */
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-left">
              <p className="text-[15px] font-black text-[#F8FAFC] leading-tight">{match.homeTeam}</p>
            </div>
            <div className="text-center px-4">
              <p className="text-[11px] text-[#475569] font-medium">{match.stage.split('·')[1]?.trim()}</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-[15px] font-black text-[#F8FAFC] leading-tight">
                {match.awayTeam} <span className="text-[#FACC15] text-[12px]">●</span>
              </p>
            </div>
          </div>
        ) : (
          /* Soccer / Basketball: scoreboard layout */
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[15px] font-black text-[#F8FAFC] leading-tight truncate">{match.homeTeam}</p>
              <p className="text-[10px] text-[#475569] mt-0.5 font-medium">
                {match.sport === 'soccer' ? 'Home' : 'Home'}
              </p>
            </div>
            {/* Score */}
            <div className="shrink-0 text-center px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 tabular-nums">
                <span
                  className="text-[28px] font-black leading-none"
                  style={{ color: match.homeScore > match.awayScore ? '#00DFA9' : '#F8FAFC' }}
                >
                  {match.homeScore}
                </span>
                <span className="text-[16px] text-[#475569] font-bold">–</span>
                <span
                  className="text-[28px] font-black leading-none"
                  style={{ color: (match.awayScore as number) > (match.homeScore as number) ? '#00DFA9' : '#F8FAFC' }}
                >
                  {match.awayScore}
                </span>
              </div>
              {match.sport === 'basketball' && (
                <p className="text-[9px] text-[#475569] font-semibold mt-0.5 tracking-wider">
                  {match.stage.split('·')[1]?.trim()}
                </p>
              )}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[15px] font-black text-[#F8FAFC] leading-tight truncate">{match.awayTeam}</p>
              <p className="text-[10px] text-[#475569] mt-0.5 font-medium">Away</p>
            </div>
          </div>
        )}
      </div>

      {/* Market header */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/[0.05]" />
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#475569]">Match Result · Win probability</span>
          <div className="h-px flex-1 bg-white/[0.05]" />
        </div>
      </div>

      {/* Outcome rows */}
      <div className="px-2 pb-3 space-y-0.5">
        {match.outcomes.map(outcome => (
          <OutcomeRow
            key={outcome.key}
            match={match}
            outcome={outcome}
            prob={probs[outcome.key] ?? 0}
            currentOdds={simOdds[outcome.key] ?? outcome.baseOdds}
            prevOdds={prevSimOdds[outcome.key] ?? outcome.baseOdds}
          />
        ))}
      </div>

      {/* Footer: volume + bettors */}
      <div
        className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04] mt-auto"
        style={{ background: 'rgba(0,0,0,0.2)' }}
      >
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-[#FACC15]" />
          <span className="text-[11px] font-bold text-[#FACC15]">{match.volume} USDT</span>
          <span className="text-[10px] text-[#475569]">volume</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3 w-3 text-[#64748B]" />
          <span className="text-[11px] font-semibold text-[#94A3B8]">
            {match.bettors.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#475569]">bettors</span>
        </div>
      </div>
    </div>
  );
}

// ─── LivePage ─────────────────────────────────────────────────────────────────

export function LivePage() {
  const [simOdds, setSimOdds] = useState<SimState>(buildInitialSim);
  const [prevSimOdds, setPrevSimOdds] = useState<SimState>(buildInitialSim);
  const [tick, setTick] = useState(0);
  const slipScrollRef = useRef<HTMLDivElement>(null);
  const [slipScrolled, setSlipScrolled] = useState(false);

  // Scroll handler for BetSlip compact mode
  useEffect(() => {
    const el = slipScrollRef.current;
    if (!el) return;
    const handler = () => setSlipScrolled(el.scrollTop > 90);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  // Odds drift every 9–14 seconds
  const driftRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduleNextDrift = useCallback(() => {
    const delay = 9000 + Math.random() * 5000;
    driftRef.current = setTimeout(() => {
      setPrevSimOdds(s => ({ ...s }));
      setSimOdds(prev => nudgeOdds(prev));
      setTick(t => t + 1);
      scheduleNextDrift();
    }, delay);
  }, []);

  useEffect(() => {
    scheduleNextDrift();
    return () => { if (driftRef.current) clearTimeout(driftRef.current); };
  }, [scheduleNextDrift]);

  // Total stats
  const totalBettors = BASE_MATCHES.reduce((s, m) => s + m.bettors, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main scrollable area */}
        <div ref={slipScrollRef} className="flex-1 overflow-y-auto">

          {/* ── Hero sub-header ─────────────────────────────────────────── */}
          <div
            className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/[0.06]"
            style={{ background: 'linear-gradient(180deg, #0A1018 0%, #0B0F14cc 100%)' }}
          >
            <div className="px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  <h1 className="text-[16px] font-black text-[#F8FAFC] tracking-tight">Live Betting</h1>
                </div>
                <span className="text-[11px] font-bold bg-[#EF4444] text-white px-2 py-0.5 rounded-full tabular-nums shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                  {BASE_MATCHES.length}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[#64748B]">
                <div className="hidden sm:flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  <span className="font-semibold text-[#94A3B8]">{totalBettors.toLocaleString()}</span>
                  <span>active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Radio className="h-3 w-3 text-[#EF4444]" />
                  <span className="text-[#94A3B8] font-medium">Odds update live</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Page content ────────────────────────────────────────────── */}
          <div className="px-4 md:px-6 py-6 pb-28 max-w-5xl mx-auto">

            {/* Page description — Polymarket vibe */}
            <div className="mb-6 flex items-start gap-3">
              <div className="flex-1">
                <h2 className="text-[13px] font-bold text-[#94A3B8]">
                  Predict the outcome · Win USDT
                </h2>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  Tap any outcome to add it to your Bet Slip. Odds drift in real time — act fast.
                </p>
              </div>
              {/* Live update pill */}
              <div
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#EF4444',
                }}
                key={tick}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
                Live
              </div>
            </div>

            {/* ── Match cards grid ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-4">
              {BASE_MATCHES.map(match => (
                <LiveMatchCard
                  key={match.id}
                  match={match}
                  simOdds={simOdds[match.id] ?? {}}
                  prevSimOdds={prevSimOdds[match.id] ?? {}}
                />
              ))}
            </div>

            {/* ── Bottom info strip ─────────────────────────────────────── */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[10px] text-[#475569]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span>Odds rising</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span>Odds falling</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#475569]" />
                <span>Stable</span>
              </div>
              <span>·</span>
              <span>All amounts in USDT · 18+ · Gamble Responsibly</span>
            </div>
          </div>
        </div>

        {/* Desktop BetSlip spacer */}
        <div className="w-[260px] shrink-0 hidden xl:block" />
        <BetSlip isScrolled={slipScrolled} />
      </div>

      <style>{`
        @keyframes oddsFlashUp   { 0%{color:#22C55E;} 100%{color:inherit} }
        @keyframes oddsFlashDown { 0%{color:#EF4444;} 100%{color:inherit} }
      `}</style>
    </div>
  );
}
