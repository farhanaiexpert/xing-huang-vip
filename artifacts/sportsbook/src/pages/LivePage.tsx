import { useState, useEffect, useRef, useMemo } from 'react';
import { Radio, Users, Flame, TrendingUp, TrendingDown, Minus, Zap, Wifi, Clock, RefreshCw } from 'lucide-react';
import { formatKickoffTime, estimatedEndTime } from '@/lib/matchTime';
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
import { useBetSlipSidebar } from '@/contexts/BetSlipSidebarContext';

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
  /** Real API O/U 2.5 over odds (soccer only, Odds API events only) */
  ouOver25?: number;
  /** Real API O/U 2.5 under odds (soccer only, Odds API events only) */
  ouUnder25?: number;
  /** Real API BTTS Yes odds (soccer only, Odds API events only) */
  bttsYes?: number;
  /** Real API BTTS No odds (soccer only, Odds API events only) */
  bttsNo?: number;
  /** BetsAPI real game clock — minutes elapsed */
  timerMin?: number;
  /** BetsAPI real game clock — seconds within the minute */
  timerSec?: number;
  /** ISO 8601 match start time */
  commenceIso?: string;
}

// ─── Market types ─────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
 * Compute implied win probabilities from real bookmaker odds.
 * Uses the overround-normalised implied probability for each outcome.
 */
function calcProbs(outcomes: Outcome[]): Record<string, number> {
  const total = outcomes.reduce((s, o) => s + 1 / o.baseOdds, 0);
  const result: Record<string, number> = {};
  for (const o of outcomes) {
    result[o.key] = Math.round((1 / o.baseOdds / total) * 100);
  }
  return result;
}

/**
 * Build real goals markets from Odds API data only.
 * Only markets with confirmed real bookmaker odds are included.
 * No Poisson-derived or fake odds are ever generated.
 */
function buildRealGoalsMarkets(match: LiveMatch): LiveMarketGroup[] {
  const groups: LiveMarketGroup[] = [];

  if (match.bttsYes !== undefined && match.bttsNo !== undefined) {
    groups.push({
      marketKey: 'btts', marketName: 'Both Teams to Score', label: 'Both Teams to Score',
      lines: [
        { key: 'btts_y', label: 'Yes', name: 'BTTS — Yes', baseOdds: match.bttsYes },
        { key: 'btts_n', label: 'No',  name: 'BTTS — No',  baseOdds: match.bttsNo  },
      ],
    });
  }

  if (match.ouOver25 !== undefined && match.ouUnder25 !== undefined) {
    groups.push({
      marketKey: 'ou25', marketName: 'Over/Under 2.5 Goals', label: 'Over / Under 2.5 Goals',
      lines: [
        { key: 'ou25_o', label: 'Over 2.5',  name: 'Over 2.5 Goals',  baseOdds: match.ouOver25  },
        { key: 'ou25_u', label: 'Under 2.5', name: 'Under 2.5 Goals', baseOdds: match.ouUnder25 },
      ],
    });
  }

  return groups;
}

// ─── OutcomeRow (Polymarket-style clickable row) ──────────────────────────────

function OutcomeRow({
  match,
  outcome,
  prob,
  currentOdds,
  marketKey,
  marketName,
}: {
  match: LiveMatch;
  outcome: Outcome;
  prob: number;
  currentOdds: number;
  marketKey: string;
  marketName: string;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { format } = useOddsFormat();

  const selectionId = `live_${match.id}_${marketKey}_${outcome.key}`;
  const isSelected  = hasSelection(selectionId);

  // Track previous value to detect real odds changes between API polls
  const prevOddsRef = useRef(currentOdds);
  const direction: 'up' | 'down' | 'stable' =
    currentOdds > prevOddsRef.current ? 'up'
    : currentOdds < prevOddsRef.current ? 'down'
    : 'stable';

  const [flashing, setFlashing] = useState(false);
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
        sportKey: match.sportKey,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        commenceTime: match.commenceIso,
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
          color:      isSelected ? '#0B0F14' : outcome.color,
          border:     `1px solid ${isSelected ? '#00DFA9' : outcome.color}30`,
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
              width:     `${prob}%`,
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
          flashing && direction === 'up'   && 'text-[#22C55E]',
          flashing && direction === 'down' && 'text-[#EF4444]',
        )}>
          {formatOdds(currentOdds, format)}
        </div>
        <div className={cn(
          'flex items-center justify-end gap-0.5 text-[9px] font-bold mt-0.5',
          direction === 'up'   ? 'text-[#22C55E]'
          : direction === 'down' ? 'text-[#EF4444]'
          : 'text-[#475569]'
        )}>
          {direction === 'up'   ? <TrendingUp   className="h-2.5 w-2.5" /> :
           direction === 'down' ? <TrendingDown  className="h-2.5 w-2.5" /> :
                                  <Minus         className="h-2.5 w-2.5" />}
          {direction === 'stable' ? 'stable' : direction === 'up' ? 'rising' : 'falling'}
        </div>
      </div>
    </button>
  );
}

// ─── OddsButton (compact button for Goals tab) ────────────────────────────────

function OddsButton({
  match,
  line,
  marketKey,
  marketName,
  currentOdds,
}: {
  match: LiveMatch;
  line: MarketLine;
  marketKey: string;
  marketName: string;
  currentOdds: number;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { format } = useOddsFormat();

  const selectionId = `live_${match.id}_${marketKey}_${line.key}`;
  const isSelected  = hasSelection(selectionId);

  const prevRef = useRef(currentOdds);
  const direction: 'up' | 'down' | 'stable' =
    currentOdds > prevRef.current ? 'up'
    : currentOdds < prevRef.current ? 'down'
    : 'stable';

  const [flashing, setFlashing] = useState(false);
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
        sportKey: match.sportKey,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        commenceTime: match.commenceIso,
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
        isSelected                                       ? 'text-[#00DFA9]'  : 'text-[#F8FAFC]',
        flashing && direction === 'up'   && !isSelected && 'text-[#22C55E]',
        flashing && direction === 'down' && !isSelected && 'text-[#EF4444]',
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

function LiveMatchCard({ match }: { match: LiveMatch }) {
  const isSoccer  = match.sport === 'soccer';
  const isSoccer2 = match.sportKey.startsWith('betsapi_1') || match.sport === 'soccer';

  // Real goals markets — only populated for Odds API soccer events with real data
  const goalsMarkets  = useMemo(() => isSoccer ? buildRealGoalsMarkets(match) : [], [match, isSoccer]);
  const showGoalsTab  = goalsMarkets.length > 0;

  const [activeTab, setActiveTab] = useState<'result' | 'goals'>('result');
  const probs = useMemo(() => calcProbs(match.outcomes), [match.outcomes]);

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

  // ── Live game clock (real BetsAPI timer, ticks every second) ─────────────
  const [clockMin, setClockMin] = useState(match.timerMin ?? 0);
  const [clockSec, setClockSec] = useState(match.timerSec ?? 0);
  const hasClock = match.timerMin !== undefined && isSoccer2;

  useEffect(() => {
    if (match.timerMin !== undefined) {
      setClockMin(match.timerMin);
      setClockSec(match.timerSec ?? 0);
    }
  }, [match.timerMin, match.timerSec]);

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
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      {/* Top accent stripe */}
      <div className="h-[2px]" style={{
        background: `linear-gradient(90deg, ${match.accent}CC, ${match.accent}40, transparent)`,
      }} />

      {/* Card header */}
      <div className="flex items-center justify-between px-3 sm:px-4 pt-3.5 pb-3 gap-2 border-b border-white/[0.05]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-black text-[#EF4444] tracking-widest">LIVE</span>
            {hasClock ? (
              <span className="text-[10px] font-black text-[#EF4444] tabular-nums">{clockMin}'</span>
            ) : (
              <span className="text-[10px] font-bold text-[#EF4444]/70">{match.liveLabel}</span>
            )}
          </div>
          <span className="text-[11px] font-medium text-[#64748B] truncate">{match.icon} {match.league}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {match.isHot && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FACC15]/10 border border-[#FACC15]/20">
              <Flame className="h-2.5 w-2.5 text-[#FACC15]" />
              <span className="text-[9px] font-black text-[#FACC15] tracking-wider">HOT</span>
            </div>
          )}
          <span className="text-[10px] text-[#475569] truncate max-w-[80px] sm:max-w-none">{match.stage}</span>
        </div>
      </div>

      {/* Start / estimated end time row */}
      {match.commenceIso && (() => {
        const started = formatKickoffTime(match.commenceIso);
        const ends    = estimatedEndTime(match.commenceIso, match.sport);
        if (!started && !ends) return null;
        return (
          <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 border-b border-white/[0.04]">
            <Clock className="h-3 w-3 text-[#475569] shrink-0" />
            {started && (
              <span className="text-[10px] text-[#475569]">
                Started <span className="tabular-nums text-[#64748B] font-medium">{started}</span>
              </span>
            )}
            {ends && (
              <>
                <span className="text-[#253241]">·</span>
                <span className="text-[10px] text-[#475569]">
                  ~Ends <span className="tabular-nums text-[#64748B] font-medium">{ends}</span>
                </span>
              </>
            )}
          </div>
        );
      })()}

      {/* Scoreboard */}
      <div className="px-4 py-5">
        {match.sport === 'tennis' ? (
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[15px] font-black text-[#F8FAFC] leading-tight truncate">{match.homeTeam}</p>
              <p className="text-[10px] text-[#475569] mt-0.5 font-medium">Home</p>
            </div>
            <div
              className="shrink-0 text-center px-4 py-2 rounded-xl border transition-all duration-500"
              style={{
                background:   (homeFlash || awayFlash) ? 'rgba(0,223,169,0.07)' : 'rgba(255,255,255,0.03)',
                borderColor:  (homeFlash || awayFlash) ? 'rgba(0,223,169,0.35)' : 'rgba(255,255,255,0.06)',
                boxShadow:    (homeFlash || awayFlash) ? '0 0 16px rgba(0,223,169,0.2)' : undefined,
              }}
            >
              <div className="flex items-center gap-2 tabular-nums">
                <span
                  className="text-[28px] font-black leading-none transition-all duration-300"
                  style={{
                    color:      homeFlash ? '#00DFA9' : match.homeScore > match.awayScore ? '#00DFA9' : '#F8FAFC',
                    textShadow: homeFlash ? '0 0 20px rgba(0,223,169,0.8)' : undefined,
                    transform:  homeFlash ? 'scale(1.15)' : 'scale(1)',
                    display:    'inline-block',
                  }}
                >
                  {match.homeScore}
                </span>
                <span className="text-[16px] text-[#475569] font-bold">–</span>
                <span
                  className="text-[28px] font-black leading-none transition-all duration-300"
                  style={{
                    color:      awayFlash ? '#00DFA9' : (match.awayScore as number) > (match.homeScore as number) ? '#00DFA9' : '#F8FAFC',
                    textShadow: awayFlash ? '0 0 20px rgba(0,223,169,0.8)' : undefined,
                    transform:  awayFlash ? 'scale(1.15)' : 'scale(1)',
                    display:    'inline-block',
                  }}
                >
                  {match.awayScore}
                </span>
              </div>
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

      {/* Market section */}
      {isSoccer && showGoalsTab ? (
        <>
          {/* Tab strip — Result + Goals (only when real data available) */}
          <div className="px-3 pt-1 pb-2.5 flex gap-1.5 border-t border-white/[0.04]">
            {(['result', 'goals'] as const).map(tab => (
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
                {tab === 'result' ? '1 X 2' : '⚽ Goals'}
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
                    currentOdds={outcome.baseOdds}
                    marketKey="h2h"
                    marketName="Match Result"
                  />
                ))}
              </div>
            </>
          )}

          {/* Goals tab — real Odds API markets only */}
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
                        currentOdds={line.baseOdds}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* No tabs — plain result rows */
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
                currentOdds={outcome.baseOdds}
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
  const { collapsed } = useBetSlipSidebar();
  const { matches: realMatches, loading: liveLoading, isRealData, lastUpdated, refreshing, nextRefreshIn } = useLiveOdds();

  const displayMatches = useMemo<LiveMatch[]>(
    () => realMatches as LiveMatch[],
    [realMatches],
  );

  const slipScrollRef = useRef<HTMLDivElement>(null);
  const [slipScrolled, setSlipScrolled] = useState(false);

  useEffect(() => {
    const el = slipScrollRef.current;
    if (!el) return;
    const handler = () => setSlipScrolled(el.scrollTop > 90);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  // Sport filter
  const [activeSport, setActiveSport] = useState<string>('all');

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

  const filteredMatches = useMemo(
    () => {
      if (activeSport === 'all') return displayMatches;
      const filtered = displayMatches.filter(m => m.sport === activeSport);
      return filtered.length > 0 ? filtered : displayMatches;
    },
    [displayMatches, activeSport],
  );

  useEffect(() => {
    if (activeSport !== 'all') {
      const has = displayMatches.some(m => m.sport === activeSport);
      if (!has) setActiveSport('all');
    }
  }, [displayMatches, activeSport]);

  // "Updated Xs ago" counter
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    if (lastUpdated) setSecondsAgo(0);
  }, [lastUpdated]);
  useEffect(() => {
    const t = setInterval(() => setSecondsAgo(p => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

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
                    {secondsAgo < 5 ? 'just now' : secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`}
                  </span>
                  <span className="text-[#475569] text-[10px] hidden sm:inline">updated</span>
                </div>

                {/* Real / no data badge */}
                {isRealData ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00DFA9]/[0.08] border border-[#00DFA9]/25">
                    <Wifi className="h-3 w-3 text-[#00DFA9]" />
                    <span className="text-[#00DFA9] font-semibold text-[10px]">Real Odds</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EF4444]/[0.08] border border-[#EF4444]/20">
                    <Radio className="h-3 w-3 text-[#EF4444]" />
                    <span className="text-[#EF4444] font-semibold text-[10px]">Loading…</span>
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

            <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-[13px] font-bold text-[#94A3B8]">
                  Predict the outcome · Win USDT
                </h2>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  Real in-play events with live bookmaker odds — scores update every 60 seconds.
                </p>
              </div>
              <div className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-colors duration-300"
                style={{
                  background:   refreshing ? 'rgba(0,223,169,0.07)' : 'rgba(56,189,248,0.07)',
                  borderColor:  refreshing ? 'rgba(0,223,169,0.25)' : 'rgba(56,189,248,0.2)',
                  color:        refreshing ? '#00DFA9' : '#38BDF8',
                }}>
                <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
                {refreshing ? 'Refreshing…' : `${nextRefreshIn}s`}
              </div>
            </div>

            {/* ── Match cards grid ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-4">
              {filteredMatches.map(match => (
                <LiveMatchCard key={match.id} match={match} />
              ))}
            </div>

            {/* ── Empty state ─────────────────────────────────────────────── */}
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
        <div className={cn('shrink-0 hidden xl:block transition-[width] duration-300', collapsed ? 'w-14' : 'w-[260px]')} />
        <BetSlip isScrolled={slipScrolled} />
      </div>

      <style>{`
        @keyframes oddsFlashUp   { 0%{color:#22C55E;} 100%{color:inherit} }
        @keyframes oddsFlashDown { 0%{color:#EF4444;} 100%{color:inherit} }
      `}</style>
    </div>
  );
}
