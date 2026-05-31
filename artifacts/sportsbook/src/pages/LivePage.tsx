import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Radio, Users, Flame, TrendingUp, TrendingDown, Minus, Zap, Wifi, Clock, RefreshCw } from 'lucide-react';
import { Header } from '@/components/Header';
import { BetSlip } from '@/components/BetSlip';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { useAuth } from '@/contexts/AuthContext';
import { formatOdds } from '@/lib/oddsFormat';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { playOddsAdd, playOddsRemove } from '@/lib/oddsSound';
import { useLiveOdds } from '@/hooks/useLiveOdds';

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
  sport: string;
  /** Full Odds API sport key, e.g. "basketball_nba" — used for correct bet settlement */
  sportKey: string;
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
  /** Real API O/U 2.5 over odds (soccer only, when available) */
  ouOver25?: number;
  /** Real API O/U 2.5 under odds (soccer only, when available) */
  ouUnder25?: number;
  /** Real API BTTS Yes odds (soccer only, when available) */
  bttsYes?: number;
  /** Real API BTTS No odds (soccer only, when available) */
  bttsNo?: number;
  /** BetsAPI real game clock — minutes elapsed */
  timerMin?: number;
  /** BetsAPI real game clock — seconds within the minute */
  timerSec?: number;
}


// ─── Market generators for Goals and Corners tabs ────────────────────────────

interface MarketLine {
  key: string;
  label: string;
  name: string;
  baseOdds: number;
}

interface LiveMarketGroup {
  marketKey: string;
  marketName: string;
  label: string;
  lines: MarketLine[];
}

function rnd(n: number): number { return Math.max(1.05, Math.round(n * 100) / 100); }

/** Map sport string → display label + emoji for filter tabs */
function getSportFilterMeta(sport: string): { label: string; icon: string } {
  if (sport === 'soccer')            return { label: 'Soccer',     icon: '⚽' };
  if (sport === 'basketball')        return { label: 'Basketball', icon: '🏀' };
  if (sport === 'tennis')            return { label: 'Tennis',     icon: '🎾' };
  if (sport === 'americanfootball')  return { label: 'Football',   icon: '🏈' };
  if (sport === 'cricket')           return { label: 'Cricket',    icon: '🏏' };
  if (sport === 'baseball')          return { label: 'Baseball',   icon: '⚾' };
  if (sport === 'mma')               return { label: 'MMA',        icon: '🥋' };
  if (sport === 'aussierules')       return { label: 'AFL',        icon: '🏉' };
  if (sport === 'rugbyleague')       return { label: 'Rugby',      icon: '🏉' };
  return { label: sport.charAt(0).toUpperCase() + sport.slice(1), icon: '🏆' };
}

/**
 * Poisson CDF: P(X <= k) where X ~ Poisson(lambda).
 * Used to compute over/under goal probabilities from expected goals.
 */
function poissonCdf(lambda: number, k: number): number {
  let prob = 0;
  let term = Math.exp(-lambda);
  for (let i = 0; i <= k; i++) {
    prob += term;
    term *= lambda / (i + 1);
  }
  return Math.min(1, prob);
}

/**
 * Generate over/under odds for N.5 goals using Poisson distribution.
 * @param lambda expected total goals for the match
 * @param k      floor of the line (e.g. k=2 for O/U 2.5)
 * @param margin bookmaker margin, applied equally to both sides
 */
function ouOdds(lambda: number, k: number, margin = 1.10): { over: number; under: number } {
  const pUnder = poissonCdf(lambda, k);
  const pOver  = 1 - pUnder;
  return {
    over:  rnd(1 / Math.max(0.04, pOver)  * margin),
    under: rnd(1 / Math.max(0.04, pUnder) * margin),
  };
}

function generateGoalsMarkets(match: LiveMatch): LiveMarketGroup[] {
  const h = match.outcomes.find(o => o.key === 'home')?.baseOdds ?? 2.0;
  const d = match.outcomes.find(o => o.key === 'draw')?.baseOdds ?? 3.2;
  const a = match.outcomes.find(o => o.key === 'away')?.baseOdds ?? 3.5;
  const total = 1/h + 1/d + 1/a;
  const pd = (1/d) / total;  // normalised draw probability

  // Estimate expected goals (λ) from implied draw probability.
  // Higher draw prob → defensive match → fewer goals.
  // Calibrated so pd≈0.28 → λ≈2.5, pd≈0.35 → λ≈2.15, pd≈0.22 → λ≈2.85
  const lambda = Math.max(1.2, Math.min(4.0, 2.5 - (pd - 0.28) * 5.0));

  // BTTS: assuming roughly equal goal split between teams (λ/2 each),
  // P(home scores) = 1 − e^{−λ/2}, P(away scores) = 1 − e^{−λ/2}
  // P(BTTS Yes) ≈ P(home scores) × P(away scores)
  const halfScoring = 1 - Math.exp(-lambda / 2);
  const bttsProbYes = Math.min(0.78, halfScoring * halfScoring);
  const bttsProbNo  = 1 - bttsProbYes;

  const { over: o15o, under: o15u } = ouOdds(lambda, 1);
  // Prefer real API O/U 2.5 when the live event carried totals market data
  const o25o = match.ouOver25  ?? ouOdds(lambda, 2).over;
  const o25u = match.ouUnder25 ?? ouOdds(lambda, 2).under;
  const { over: o35o, under: o35u } = ouOdds(lambda, 3);
  const { over: o45o, under: o45u } = ouOdds(lambda, 4);

  // Prefer real API BTTS odds when available
  const bttsY = match.bttsYes ?? rnd(1 / Math.max(0.05, bttsProbYes) * 1.10);
  const bttsN = match.bttsNo  ?? rnd(1 / Math.max(0.05, bttsProbNo)  * 1.10);

  return [
    {
      marketKey: 'btts', marketName: 'Both Teams to Score', label: 'Both Teams to Score',
      lines: [
        { key: 'btts_y', label: 'Yes', name: 'BTTS — Yes', baseOdds: bttsY },
        { key: 'btts_n', label: 'No',  name: 'BTTS — No',  baseOdds: bttsN },
      ],
    },
    {
      marketKey: 'ou25', marketName: 'Over/Under 2.5 Goals', label: 'Over / Under 2.5 Goals',
      lines: [
        { key: 'ou25_o', label: 'Over 2.5',  name: 'Over 2.5 Goals',  baseOdds: o25o },
        { key: 'ou25_u', label: 'Under 2.5', name: 'Under 2.5 Goals', baseOdds: o25u },
      ],
    },
    {
      marketKey: 'ou15', marketName: 'Over/Under 1.5 Goals', label: 'Over / Under 1.5 Goals',
      lines: [
        { key: 'ou15_o', label: 'Over 1.5',  name: 'Over 1.5 Goals',  baseOdds: o15o },
        { key: 'ou15_u', label: 'Under 1.5', name: 'Under 1.5 Goals', baseOdds: o15u },
      ],
    },
    {
      marketKey: 'ou35', marketName: 'Over/Under 3.5 Goals', label: 'Over / Under 3.5 Goals',
      lines: [
        { key: 'ou35_o', label: 'Over 3.5',  name: 'Over 3.5 Goals',  baseOdds: o35o },
        { key: 'ou35_u', label: 'Under 3.5', name: 'Under 3.5 Goals', baseOdds: o35u },
      ],
    },
    {
      marketKey: 'ou45', marketName: 'Over/Under 4.5 Goals', label: 'Over / Under 4.5 Goals',
      lines: [
        { key: 'ou45_o', label: 'Over 4.5',  name: 'Over 4.5 Goals',  baseOdds: o45o },
        { key: 'ou45_u', label: 'Under 4.5', name: 'Under 4.5 Goals', baseOdds: o45u },
      ],
    },
  ];
}

function generateCornersMarkets(match: LiveMatch): LiveMarketGroup[] {
  const hLabel = (match.homeTeam.split(' ').pop() ?? match.homeTeam).slice(0, 9);
  const aLabel = (match.awayTeam.split(' ').pop() ?? match.awayTeam).slice(0, 9);
  return [
    {
      marketKey: 'c95',  marketName: 'Total Corners — Over/Under 9.5',  label: 'Over / Under 9.5 Corners',
      lines: [
        { key: 'c95_o',  label: 'Over 9.5',  name: 'Over 9.5 Corners',  baseOdds: 2.10 },
        { key: 'c95_u',  label: 'Under 9.5', name: 'Under 9.5 Corners', baseOdds: 1.72 },
      ],
    },
    {
      marketKey: 'c105', marketName: 'Total Corners — Over/Under 10.5', label: 'Over / Under 10.5 Corners',
      lines: [
        { key: 'c105_o', label: 'Over 10.5',  name: 'Over 10.5 Corners',  baseOdds: 3.20 },
        { key: 'c105_u', label: 'Under 10.5', name: 'Under 10.5 Corners', baseOdds: 1.35 },
      ],
    },
    {
      marketKey: 'c85',  marketName: 'Total Corners — Over/Under 8.5',  label: 'Over / Under 8.5 Corners',
      lines: [
        { key: 'c85_o',  label: 'Over 8.5',  name: 'Over 8.5 Corners',  baseOdds: 1.90 },
        { key: 'c85_u',  label: 'Under 8.5', name: 'Under 8.5 Corners', baseOdds: 1.90 },
      ],
    },
    {
      marketKey: 'first_corner', marketName: 'First Team to Take a Corner', label: 'First Corner',
      lines: [
        { key: 'ftc_h', label: hLabel, name: `${match.homeTeam} — First Corner`, baseOdds: 1.58 },
        { key: 'ftc_a', label: aLabel, name: `${match.awayTeam} — First Corner`, baseOdds: 2.22 },
      ],
    },
  ];
}

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

function buildInitialSim(matches: LiveMatch[]): SimState {
  const state: SimState = {};
  for (const m of matches) {
    state[m.id] = {};
    for (const o of m.outcomes) state[m.id][o.key] = o.baseOdds;
    if (m.sport === 'soccer') {
      for (const grp of generateGoalsMarkets(m))
        for (const l of grp.lines) state[m.id][l.key] = l.baseOdds;
      for (const grp of generateCornersMarkets(m))
        for (const l of grp.lines) state[m.id][l.key] = l.baseOdds;
    }
  }
  return state;
}

function nudgeOdds(prev: SimState, matches: LiveMatch[]): SimState {
  const next: SimState = {};
  for (const m of matches) {
    next[m.id] = { ...(prev[m.id] ?? {}) };
    for (const key of Object.keys(next[m.id])) {
      const curr = next[m.id][key];
      const delta = (Math.random() - 0.5) * 0.08;
      next[m.id][key] = Math.max(1.05, Math.round((curr + delta) * 100) / 100);
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
  marketKey,
  marketName,
}: {
  match: LiveMatch;
  outcome: Outcome;
  prob: number;
  currentOdds: number;
  prevOdds: number;
  marketKey: string;
  marketName: string;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { format } = useOddsFormat();

  const selectionId = `live_${match.id}_${marketKey}_${outcome.key}`;
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
        marketId: `live_${match.id}_${marketKey}`,
        matchId: match.id,
        matchName: `${match.homeTeam} vs ${match.awayTeam}`,
        leagueName: match.league,
        marketName,
        selectionType: outcome.label,
        selectionName: outcome.name,
        odds: currentOdds,
        sportId: match.sportKey,
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

// ─── OddsButton (compact button for Goals / Corners tabs) ────────────────────

function OddsButton({
  match,
  line,
  marketKey,
  marketName,
  currentOdds,
  prevOdds,
}: {
  match: LiveMatch;
  line: MarketLine;
  marketKey: string;
  marketName: string;
  currentOdds: number;
  prevOdds: number;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { format } = useOddsFormat();

  const selectionId = `live_${match.id}_${marketKey}_${line.key}`;
  const isSelected  = hasSelection(selectionId);
  const direction: 'up' | 'down' | 'stable' =
    currentOdds > prevOdds ? 'up' : currentOdds < prevOdds ? 'down' : 'stable';

  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(prevOdds);
  useEffect(() => {
    if (prevRef.current !== currentOdds) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 700);
      prevRef.current = currentOdds;
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
        marketId: `live_${match.id}_${marketKey}`,
        matchId: match.id,
        matchName: `${match.homeTeam} vs ${match.awayTeam}`,
        leagueName: match.league,
        marketName,
        selectionType: line.label,
        selectionName: line.name,
        odds: currentOdds,
        sportId: match.sportKey,
        isLive: true,
      });
      playOddsAdd();
      toast({
        title: `${line.name} added`,
        description: `${match.homeTeam} vs ${match.awayTeam} @ ${formatOdds(currentOdds, format)}`,
        duration: 2500,
      });
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border transition-all duration-200',
        isSelected
          ? 'bg-[#00DFA9]/10 border-[#00DFA9]/40 shadow-[0_0_10px_rgba(0,223,169,0.12)]'
          : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] hover:border-[#38BDF8]/25',
      )}
    >
      <span className={cn(
        'text-[10px] font-semibold leading-none text-center',
        isSelected ? 'text-[#00DFA9]' : 'text-[#64748B]',
      )}>
        {line.label}
      </span>
      <span className={cn(
        'text-[15px] font-black tabular-nums leading-none transition-colors duration-300',
        isSelected                                         ? 'text-[#00DFA9]'  : 'text-[#F8FAFC]',
        flashing && direction === 'up'   && !isSelected   && 'text-[#22C55E]',
        flashing && direction === 'down' && !isSelected   && 'text-[#EF4444]',
      )}>
        {formatOdds(currentOdds, format)}
      </span>
      {isSelected && (
        <span className="text-[8px] font-black uppercase tracking-widest text-[#00DFA9]/60">Added</span>
      )}
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
  const isSoccer       = match.sport === 'soccer';
  const isSoccer2      = match.sportKey.startsWith('betsapi_1') || match.sport === 'soccer';
  const [activeTab, setActiveTab] = useState<'result' | 'goals' | 'corners'>('result');
  const probs          = calcProbs(match.outcomes, simOdds);
  const goalsMarkets   = useMemo(() => isSoccer ? generateGoalsMarkets(match)   : [], [match, isSoccer]);
  const cornersMarkets = useMemo(() => isSoccer ? generateCornersMarkets(match) : [], [match, isSoccer]);

  // ── Score change flash ────────────────────────────────────────────────────
  const prevHomeScoreRef = useRef<number | string>(match.homeScore);
  const prevAwayScoreRef = useRef<number | string>(match.awayScore);
  const [homeFlash, setHomeFlash] = useState(false);
  const [awayFlash, setAwayFlash] = useState(false);

  useEffect(() => {
    if (prevHomeScoreRef.current !== match.homeScore) {
      prevHomeScoreRef.current = match.homeScore;
      setHomeFlash(true);
      const t = setTimeout(() => setHomeFlash(false), 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [match.homeScore]);

  useEffect(() => {
    if (prevAwayScoreRef.current !== match.awayScore) {
      prevAwayScoreRef.current = match.awayScore;
      setAwayFlash(true);
      const t = setTimeout(() => setAwayFlash(false), 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [match.awayScore]);

  // ── Live game clock (ticks every second, seeded from BetsAPI timer) ───────
  const [clockMin, setClockMin] = useState(match.timerMin ?? 0);
  const [clockSec, setClockSec] = useState(match.timerSec ?? 0);
  const hasClock = match.timerMin !== undefined && isSoccer2;

  // Reset clock when BetsAPI sends a new timer value
  useEffect(() => {
    if (match.timerMin !== undefined) {
      setClockMin(match.timerMin);
      setClockSec(match.timerSec ?? 0);
    }
  }, [match.timerMin, match.timerSec]);

  // Tick every second while there's a real clock
  useEffect(() => {
    if (!hasClock) return;
    const t = setInterval(() => {
      setClockSec(s => {
        if (s >= 59) { setClockMin(m => Math.min(m + 1, 120)); return 0; }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [hasClock]);

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
          {/* Live pulse + clock */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-black text-[#EF4444] tracking-widest">LIVE</span>
            {hasClock ? (
              <span className="text-[10px] font-black text-[#EF4444] tabular-nums">
                {clockMin}'
              </span>
            ) : (
              <span className="text-[10px] font-bold text-[#EF4444]/70">{match.liveLabel}</span>
            )}
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
              <p className="text-[10px] text-[#475569] mt-0.5 font-medium">Home</p>
            </div>
            {/* Score */}
            <div
              className="shrink-0 text-center px-4 py-2 rounded-xl border transition-all duration-500"
              style={{
                background: (homeFlash || awayFlash) ? 'rgba(0,223,169,0.07)' : 'rgba(255,255,255,0.03)',
                borderColor: (homeFlash || awayFlash) ? 'rgba(0,223,169,0.35)' : 'rgba(255,255,255,0.06)',
                boxShadow: (homeFlash || awayFlash) ? '0 0 16px rgba(0,223,169,0.2)' : undefined,
              }}
            >
              <div className="flex items-center gap-2 tabular-nums">
                <span
                  className="text-[28px] font-black leading-none transition-all duration-300"
                  style={{
                    color: homeFlash ? '#00DFA9' : match.homeScore > match.awayScore ? '#00DFA9' : '#F8FAFC',
                    textShadow: homeFlash ? '0 0 20px rgba(0,223,169,0.8)' : undefined,
                    transform: homeFlash ? 'scale(1.15)' : 'scale(1)',
                    display: 'inline-block',
                  }}
                >
                  {match.homeScore}
                </span>
                <span className="text-[16px] text-[#475569] font-bold">–</span>
                <span
                  className="text-[28px] font-black leading-none transition-all duration-300"
                  style={{
                    color: awayFlash ? '#00DFA9' : (match.awayScore as number) > (match.homeScore as number) ? '#00DFA9' : '#F8FAFC',
                    textShadow: awayFlash ? '0 0 20px rgba(0,223,169,0.8)' : undefined,
                    transform: awayFlash ? 'scale(1.15)' : 'scale(1)',
                    display: 'inline-block',
                  }}
                >
                  {match.awayScore}
                </span>
              </div>
              {/* Live clock sub-label */}
              {hasClock ? (
                <p className="text-[9px] font-black mt-0.5 tracking-wider tabular-nums" style={{ color: '#EF4444' }}>
                  {clockMin}:{String(clockSec).padStart(2, '0')}
                </p>
              ) : match.sport === 'basketball' ? (
                <p className="text-[9px] text-[#475569] font-semibold mt-0.5 tracking-wider">
                  {match.stage.split('·')[1]?.trim()}
                </p>
              ) : null}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[15px] font-black text-[#F8FAFC] leading-tight truncate">{match.awayTeam}</p>
              <p className="text-[10px] text-[#475569] mt-0.5 font-medium">Away</p>
            </div>
          </div>
        )}
      </div>

      {/* Market section — tabs for soccer, plain result for other sports */}
      {isSoccer ? (
        <>
          {/* Tab strip */}
          <div className="px-3 pt-1 pb-2.5 flex gap-1.5 border-t border-white/[0.04]">
            {(['result', 'goals', 'corners'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200',
                  activeTab === tab
                    ? 'bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/30'
                    : 'text-[#475569] hover:text-[#94A3B8] border border-transparent',
                )}
              >
                {tab === 'result' ? '1 X 2' : tab === 'goals' ? '⚽ Goals' : '🚩 Corners'}
              </button>
            ))}
          </div>

          {/* Result tab */}
          {activeTab === 'result' && (
            <>
              <div className="px-4 pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/[0.05]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#475569]">Match Result · Win probability</span>
                  <div className="h-px flex-1 bg-white/[0.05]" />
                </div>
              </div>
              <div className="px-2 pb-3 space-y-0.5">
                {match.outcomes.map(outcome => (
                  <OutcomeRow
                    key={outcome.key}
                    match={match}
                    outcome={outcome}
                    prob={probs[outcome.key] ?? 0}
                    currentOdds={simOdds[outcome.key] ?? outcome.baseOdds}
                    prevOdds={prevSimOdds[outcome.key] ?? outcome.baseOdds}
                    marketKey="h2h"
                    marketName="Match Result"
                  />
                ))}
              </div>
            </>
          )}

          {/* Goals tab */}
          {activeTab === 'goals' && (
            <div className="px-3 pb-4 pt-0.5 space-y-3">
              {goalsMarkets.map(mkt => (
                <div key={mkt.marketKey}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#475569] mb-1.5 px-1">
                    {mkt.label}
                  </p>
                  <div className="flex gap-1.5">
                    {mkt.lines.map(line => (
                      <OddsButton
                        key={line.key}
                        match={match}
                        line={line}
                        marketKey={mkt.marketKey}
                        marketName={mkt.marketName}
                        currentOdds={simOdds[line.key] ?? line.baseOdds}
                        prevOdds={prevSimOdds[line.key] ?? line.baseOdds}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Corners tab */}
          {activeTab === 'corners' && (
            <div className="px-3 pb-4 pt-0.5 space-y-3">
              {cornersMarkets.map(mkt => (
                <div key={mkt.marketKey}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#475569] mb-1.5 px-1">
                    {mkt.label}
                  </p>
                  <div className="flex gap-1.5">
                    {mkt.lines.map(line => (
                      <OddsButton
                        key={line.key}
                        match={match}
                        line={line}
                        marketKey={mkt.marketKey}
                        marketName={mkt.marketName}
                        currentOdds={simOdds[line.key] ?? line.baseOdds}
                        prevOdds={prevSimOdds[line.key] ?? line.baseOdds}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Non-soccer: plain result rows, no tabs */
        <>
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-white/[0.05]" />
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#475569]">Match Result · Win probability</span>
              <div className="h-px flex-1 bg-white/[0.05]" />
            </div>
          </div>
          <div className="px-2 pb-3 space-y-0.5">
            {match.outcomes.map(outcome => (
              <OutcomeRow
                key={outcome.key}
                match={match}
                outcome={outcome}
                prob={probs[outcome.key] ?? 0}
                currentOdds={simOdds[outcome.key] ?? outcome.baseOdds}
                prevOdds={prevSimOdds[outcome.key] ?? outcome.baseOdds}
                marketKey="h2h"
                marketName="Match Result"
              />
            ))}
          </div>
        </>
      )}

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
  // ── Real live data ──────────────────────────────────────────────────────────
  const { matches: realMatches, loading: liveLoading, isRealData, lastUpdated } = useLiveOdds();

  // Show only real live data — no hardcoded fallback
  const displayMatches = useMemo<LiveMatch[]>(
    () => realMatches as LiveMatch[],
    [realMatches],
  );

  // Stable key derived from match IDs — used to detect when the set changes
  const matchKey = useMemo(() => displayMatches.map(m => m.id).join(','), [displayMatches]);

  // ── Simulation state ────────────────────────────────────────────────────────
  const [simOdds,     setSimOdds]     = useState<SimState>(() => buildInitialSim([]));
  const [prevSimOdds, setPrevSimOdds] = useState<SimState>(() => buildInitialSim([]));
  const [tick, setTick] = useState(0);

  // Re-seed sim whenever the match list changes (real data arrived or changed)
  const prevMatchKeyRef = useRef('');
  useEffect(() => {
    if (prevMatchKeyRef.current !== matchKey) {
      prevMatchKeyRef.current = matchKey;
      const fresh = buildInitialSim(displayMatches);
      setSimOdds(fresh);
      setPrevSimOdds(fresh);
    }
  }, [matchKey, displayMatches]);

  // Keep a ref so the drift timer always sees the latest matches without
  // being recreated every time displayMatches changes.
  const displayMatchesRef = useRef(displayMatches);
  displayMatchesRef.current = displayMatches;

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

  // Odds drift every 15–20 minutes (realistic cadence — not instant)
  const driftRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleNextDrift = useCallback(() => {
    const delay = 15 * 60 * 1000 + Math.random() * 5 * 60 * 1000; // 15–20 min
    driftRef.current = setTimeout(() => {
      setPrevSimOdds(s => ({ ...s }));
      setSimOdds(prev => nudgeOdds(prev, displayMatchesRef.current));
      setTick(t => t + 1);
      scheduleNextDrift();
    }, delay);
  }, []);

  useEffect(() => {
    scheduleNextDrift();
    return () => { if (driftRef.current) clearTimeout(driftRef.current); };
  }, [scheduleNextDrift]);

  // Sport filter
  const [activeSport, setActiveSport] = useState<string>('all');

  // Unique sports present in current matches, with counts
  const sportFilters = useMemo(() => {
    const map = new Map<string, { label: string; icon: string; count: number }>();
    for (const m of displayMatches) {
      const meta = getSportFilterMeta(m.sport);
      const existing = map.get(m.sport);
      if (existing) existing.count++;
      else map.set(m.sport, { ...meta, count: 1 });
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v }));
  }, [displayMatches]);

  // Matches after sport filter — auto-fall-back to all if filter produces zero results
  const filteredMatches = useMemo(
    () => {
      if (activeSport === 'all') return displayMatches;
      const filtered = displayMatches.filter(m => m.sport === activeSport);
      return filtered.length > 0 ? filtered : displayMatches;
    },
    [displayMatches, activeSport],
  );

  // If the active sport no longer has any matches, reset to "all"
  useEffect(() => {
    if (activeSport !== 'all') {
      const has = displayMatches.some(m => m.sport === activeSport);
      if (!has) setActiveSport('all');
    }
  }, [displayMatches, activeSport]);

  // "Updated Xs ago" — counts up from 0 each time data is refreshed
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    if (lastUpdated) setSecondsAgo(0);
  }, [lastUpdated]);
  useEffect(() => {
    const t = setInterval(() => setSecondsAgo(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Total stats (based on filtered view)
  const totalBettors = filteredMatches.reduce((s, m) => s + m.bettors, 0);

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
            {/* Top row: title + stats */}
            <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                  <h1 className="text-[15px] font-black text-[#F8FAFC] tracking-tight">Live Betting</h1>
                </div>
                <span className="text-[11px] font-bold bg-[#EF4444] text-white px-2 py-0.5 rounded-full tabular-nums shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                  {liveLoading && !isRealData ? '…' : displayMatches.length}
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-[11px]">
                {/* Bettors */}
                <div className="hidden sm:flex items-center gap-1 text-[#64748B]">
                  <Users className="h-3 w-3" />
                  <span className="font-semibold text-[#94A3B8] tabular-nums">{totalBettors.toLocaleString()}</span>
                  <span>bettors</span>
                </div>

                {/* Updated X ago */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.07]"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <Clock className="h-3 w-3 text-[#64748B]" />
                  <span className="font-mono font-bold tabular-nums text-[#94A3B8]">
                    {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
                  </span>
                  <span className="text-[#475569] text-[10px] hidden sm:inline">updated</span>
                </div>

                {/* Real / demo badge */}
                {isRealData ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00DFA9]/[0.08] border border-[#00DFA9]/25">
                    <Wifi className="h-3 w-3 text-[#00DFA9]" />
                    <span className="text-[#00DFA9] font-semibold text-[10px]">Real Odds</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EF4444]/[0.08] border border-[#EF4444]/20">
                    <Radio className="h-3 w-3 text-[#EF4444]" />
                    <span className="text-[#EF4444] font-semibold text-[10px]">Demo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sport filter tabs */}
            {sportFilters.length > 1 && (
              <div className="px-4 md:px-6 pb-2.5 flex items-center gap-1.5 overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setActiveSport('all')}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-bold transition-all duration-150 border',
                    activeSport === 'all'
                      ? 'bg-[#00DFA9]/12 text-[#00DFA9] border-[#00DFA9]/30'
                      : 'bg-white/[0.03] text-[#64748B] border-white/[0.06] hover:text-[#94A3B8] hover:bg-white/[0.05]',
                  )}
                >
                  All
                  <span className={cn(
                    'text-[10px] font-black px-1.5 py-0.5 rounded-md',
                    activeSport === 'all' ? 'bg-[#00DFA9]/20 text-[#00DFA9]' : 'bg-white/[0.06] text-[#475569]',
                  )}>
                    {displayMatches.length}
                  </span>
                </button>
                {sportFilters.map(sf => (
                  <button
                    key={sf.id}
                    onClick={() => setActiveSport(sf.id)}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-bold transition-all duration-150 border',
                      activeSport === sf.id
                        ? 'bg-[#00DFA9]/12 text-[#00DFA9] border-[#00DFA9]/30'
                        : 'bg-white/[0.03] text-[#64748B] border-white/[0.06] hover:text-[#94A3B8] hover:bg-white/[0.05]',
                    )}
                  >
                    <span className="text-[12px]">{sf.icon}</span>
                    {sf.label}
                    <span className={cn(
                      'text-[10px] font-black px-1.5 py-0.5 rounded-md',
                      activeSport === sf.id ? 'bg-[#00DFA9]/20 text-[#00DFA9]' : 'bg-white/[0.06] text-[#475569]',
                    )}>
                      {sf.count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Page content ────────────────────────────────────────────── */}
          <div className="px-4 md:px-6 py-6 pb-28 max-w-5xl mx-auto">

            {/* Page description */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-bold text-[#94A3B8]">
                  Predict the outcome · Win USDT
                </h2>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  {isRealData
                    ? 'Real in-play events — live scores update every 15 seconds.'
                    : 'Tap any outcome to add it to your Bet Slip. Live scores refresh every 15 seconds.'}
                </p>
              </div>
              {/* Refresh cadence info */}
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold border"
                style={{ background: 'rgba(56,189,248,0.07)', borderColor: 'rgba(56,189,248,0.2)', color: '#38BDF8' }}>
                <RefreshCw className="h-3 w-3" />
                15s refresh
              </div>
            </div>

            {/* ── Match cards grid ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-4">
              {filteredMatches.map(match => (
                <LiveMatchCard
                  key={match.id}
                  match={match}
                  simOdds={simOdds[match.id] ?? {}}
                  prevSimOdds={prevSimOdds[match.id] ?? {}}
                />
              ))}
            </div>

            {/* ── Empty state — no live events ───────────────────────────── */}
            {filteredMatches.length === 0 && !liveLoading && (
              <div className="flex flex-col items-center text-center py-16 px-6 bg-[#121821] rounded-2xl border border-[#253241]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#18212B] border border-[#253241] mb-4">
                  <Radio className="h-6 w-6 text-[#EF4444] opacity-40" />
                </div>
                <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5">No live matches right now</p>
                <p className="text-[13px] text-[#94A3B8]/55 max-w-xs">
                  Live events will appear here as they kick off. Check back soon or browse upcoming matches on the home page.
                </p>
              </div>
            )}

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
