import { useLocation } from 'wouter';
import { SportName } from '../SportName';
import { ChevronLeft, Wifi, Clock, AlertCircle, Star, RefreshCw, Shield, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TeamBadge } from '../TeamBadge';
import type { MatchEntity } from '../../data/types';
import type { LeagueEntity } from '../../data/types';
import { formatKickoffTime, estimatedEndTime } from '../../lib/matchTime';
import type { LiveMatchScoreResult } from '../../hooks/useLiveMatchScore';

interface MatchHeaderProps {
  match:     MatchEntity;
  league:    LeagueEntity;
  liveData?: LiveMatchScoreResult;
}

const FLAG_MAP: Record<string, string> = {
  EU: '🇪🇺', GB: '🇬🇧', US: '🇺🇸', ES: '🇪🇸',
  IT: '🇮🇹', GL: '🌐', DE: '🇩🇪', IN: '🇮🇳', FR: '🇫🇷',
};
function flag(cc: string) { return FLAG_MAP[cc] ?? '🌐'; }

const SPORT_ICON: Record<string, string> = {
  sp_soccer: '⚽', sp_tennis: '🎾', sp_nba: '🏀', sp_basketball: '🏀',
  sp_esports: '🎮', sp_horse_racing: '🏇', sp_cricket: '🏏',
  sp_boxing: '🥊', sp_mma: '🥋', sp_formula_1: '🏎️',
};

function calcWinProb(match: MatchEntity): { home: number; draw: number | null; away: number } | null {
  const pm = match.primaryMarket;
  if (!pm || pm.selections.length < 2) return null;
  const home = pm.selections[0];
  const draw = pm.selections.find(s => s.shortName === 'X');
  const away = pm.selections[pm.selections.length - 1];
  if (!home || !away) return null;
  const ih = 1 / home.odds;
  const id = draw ? 1 / draw.odds : 0;
  const ia = 1 / away.odds;
  const total = ih + id + ia;
  return {
    home: Math.round((ih / total) * 100),
    draw: draw ? Math.round((id / total) * 100) : null,
    away: Math.round((ia / total) * 100),
  };
}

export function MatchHeader({ match, league, liveData }: MatchHeaderProps) {
  const [, setLocation] = useLocation();
  const sportIcon = SPORT_ICON[match.sportId] ?? '🏆';
  const isHorse   = match.sportId === 'sp_horse_racing';
  const isSoccer  = match.sportId === 'sp_soccer';
  const isTennis  = match.sportId === 'sp_tennis';

  return (
    <div className="relative overflow-hidden border-b border-[#1E2D3D]">
      {/* Deep background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1825] via-[#0B1520] to-[#0B0F14]" />

      {/* Ambient glow — home side */}
      <div className="absolute left-0 top-0 bottom-0 w-1/2 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(0,223,169,0.05) 0%, transparent 70%)' }} />
      {/* Ambient glow — away side */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(56,189,248,0.05) 0%, transparent 70%)' }} />

      <div className="relative">
        {/* ── Breadcrumb ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 px-4 pt-3.5 pb-0 min-w-0 overflow-hidden">
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-1 text-[11px] text-[#94A3B8]/60 hover:text-[#00DFA9] transition-colors group shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>All Sports</span>
          </button>
          <span className="text-[#253241] text-[11px] shrink-0">/</span>
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-[#94A3B8]/50 shrink-0">
            {flag(league.countryCode)}&nbsp;<SportName name={league.name} />
          </span>
          <span className="text-[#253241] text-[11px] shrink-0">/</span>
          <span className="text-[11px] text-[#94A3B8]/40 truncate min-w-0">
            {isHorse ? match.homeTeamName : `${match.homeTeamName} vs ${match.awayTeamName}`}
          </span>
        </div>

        {/* ── Main match area ──────────────────────────────────────── */}
        {isHorse ? (
          <HorseHeader match={match} sportIcon={sportIcon} league={league} />
        ) : (
          <TeamsHeader
            match={match}
            sportIcon={sportIcon}
            isTennis={isTennis}
            isSoccer={isSoccer}
            liveData={liveData}
          />
        )}

        {/* ── Win probability bar ──────────────────────────────────── */}
        {!isHorse && !match.isLive && (() => {
          const prob = calcWinProb(match);
          if (!prob) return null;
          return (
            <div className="px-4 sm:px-6 pb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp className="h-3 w-3 text-[#94A3B8]/40 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]/40">Win Probability</span>
              </div>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                <div className="rounded-l-full transition-all duration-700"
                  style={{ width: `${prob.home}%`, background: 'linear-gradient(90deg, #00DFA9, #00c99a)' }} />
                {prob.draw !== null && (
                  <div style={{ width: `${prob.draw}%`, background: '#253241' }} />
                )}
                <div className="rounded-r-full transition-all duration-700"
                  style={{ width: `${prob.away}%`, background: 'linear-gradient(90deg, #2580b8, #38BDF8)' }} />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] font-bold text-[#00DFA9]">{prob.home}%</span>
                {prob.draw !== null && (
                  <span className="text-[10px] font-medium text-[#94A3B8]/50">Draw {prob.draw}%</span>
                )}
                <span className="text-[10px] font-bold text-[#38BDF8]">{prob.away}%</span>
              </div>
            </div>
          );
        })()}

        {/* ── Info strip ───────────────────────────────────────────── */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#253241]/40 pt-2.5">
          {/* Time */}
          <span className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]/55">
            <Clock className="h-3 w-3 shrink-0 text-[#94A3B8]/40" />
            {match.isLive ? 'Started' : 'Kicks off'}&nbsp;
            <span className="text-[#F8FAFC]/70 font-medium">
              {formatKickoffTime(match.startTime) ?? match.displayDate}
            </span>
          </span>
          {(() => {
            const end = estimatedEndTime(match.startTime, match.sportId);
            return end ? <span className="text-[11px] text-[#94A3B8]/40">~Ends {end}</span> : null;
          })()}

          <span className="text-[#253241] shrink-0">·</span>

          {/* League */}
          <span className="text-[11px] text-[#94A3B8]/55 truncate max-w-[160px] sm:max-w-none">
            {flag(league.countryCode)} <SportName name={league.name} />
          </span>

          <span className="text-[#253241] shrink-0">·</span>

          {/* Markets */}
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#94A3B8]/70">
            <Shield className="h-3 w-3 text-[#94A3B8]/40 shrink-0" />
            {match.marketCount} markets
          </span>

          {/* Featured */}
          {match.isFeatured && (
            <>
              <span className="text-[#253241] shrink-0">·</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#FACC15]">
                <Star className="h-2.5 w-2.5 fill-[#FACC15]" />
                Featured
              </span>
            </>
          )}

          {/* Live refresh */}
          {match.isLive && liveData && (
            <>
              <span className="text-[#253241] shrink-0">·</span>
              <span className="flex items-center gap-1 text-[10px] shrink-0"
                style={{ color: liveData.isPolling ? '#00DFA9' : '#475569' }}>
                <RefreshCw className={cn('h-3 w-3', liveData.isPolling && 'animate-spin')} />
                {liveData.isPolling ? 'updating…' : liveData.lastUpdated ? `next in ${liveData.nextRefreshIn}s` : 'polling…'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TeamsHeader ──────────────────────────────────────────────────────────────

function TeamsHeader({ match, sportIcon, isSoccer, isTennis, liveData }: {
  match:     MatchEntity;
  sportIcon: string;
  isSoccer:  boolean;
  isTennis:  boolean;
  liveData?: LiveMatchScoreResult;
}) {
  const displayScore = liveData?.score ?? match.score;
  const homeFlash    = liveData?.homeFlash ?? false;
  const awayFlash    = liveData?.awayFlash ?? false;
  const clockMin     = liveData?.clockMin ?? match.liveMinute ?? null;
  const clockSec     = liveData?.clockSec ?? 0;
  const hasClock     = clockMin !== null && isSoccer && match.isLive;

  return (
    <div className="flex items-center px-3 sm:px-6 py-5 sm:py-7 gap-2 sm:gap-4">

      {/* Home team */}
      <div className="flex-1 flex flex-col items-center gap-2.5 min-w-0">
        <div className="relative">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-2xl blur-lg opacity-30"
            style={{ background: 'radial-gradient(circle, #00DFA9 0%, transparent 70%)' }} />
          <div className="relative block sm:hidden">
            <TeamBadge name={match.homeTeamName} sportIcon={sportIcon} size="md" />
          </div>
          <div className="relative hidden sm:block">
            <TeamBadge name={match.homeTeamName} sportIcon={sportIcon} size="lg" />
          </div>
        </div>
        <span className="text-[12px] sm:text-[14px] font-bold text-[#F8FAFC] text-center leading-tight line-clamp-2 w-full px-1">
          {match.homeTeamName}
        </span>
        {!match.isLive && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00DFA9]/10 text-[#00DFA9]/80 border border-[#00DFA9]/15">
            Home
          </span>
        )}
      </div>

      {/* Centre — score or VS */}
      <div className="shrink-0 flex flex-col items-center gap-2 min-w-[88px] sm:min-w-[110px]">
        {match.isLive && displayScore ? (
          <>
            <div
              className="flex items-center gap-2.5 sm:gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all duration-500"
              style={{
                background:   (homeFlash || awayFlash) ? 'rgba(0,223,169,0.08)' : 'rgba(15,22,32,0.9)',
                borderColor:  (homeFlash || awayFlash) ? 'rgba(0,223,169,0.5)'  : 'rgba(37,50,65,0.8)',
                boxShadow:    (homeFlash || awayFlash) ? '0 0 24px rgba(0,223,169,0.3)' : '0 4px 24px rgba(0,0,0,0.4)',
              }}
            >
              <span
                className="text-[32px] sm:text-[40px] font-black tabular-nums leading-none transition-all duration-300"
                style={{
                  color:      homeFlash ? '#00DFA9' : displayScore.home > displayScore.away ? '#00DFA9' : '#F8FAFC',
                  textShadow: homeFlash ? '0 0 20px rgba(0,223,169,0.8)' : undefined,
                  transform:  homeFlash ? 'scale(1.15)' : 'scale(1)',
                  display:    'inline-block',
                }}
              >{displayScore.home}</span>
              <span className="text-[#94A3B8]/30 text-lg sm:text-2xl font-light">:</span>
              <span
                className="text-[32px] sm:text-[40px] font-black tabular-nums leading-none transition-all duration-300"
                style={{
                  color:      awayFlash ? '#00DFA9' : displayScore.away > displayScore.home ? '#00DFA9' : '#F8FAFC',
                  textShadow: awayFlash ? '0 0 20px rgba(0,223,169,0.8)' : undefined,
                  transform:  awayFlash ? 'scale(1.15)' : 'scale(1)',
                  display:    'inline-block',
                }}
              >{displayScore.away}</span>
            </div>

            {hasClock ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="text-[11px] font-black tabular-nums tracking-wider text-[#EF4444]">
                  {clockMin}:{String(clockSec).padStart(2, '0')}
                </span>
              </div>
            ) : (
              <LivePill match={match} />
            )}
          </>
        ) : (
          <>
            {/* VS orb */}
            <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14">
              <div className="absolute inset-0 rounded-full opacity-20"
                style={{ background: 'conic-gradient(from 0deg, #00DFA9, #38BDF8, #00DFA9)' }} />
              <div className="absolute inset-[3px] rounded-full bg-[#0D1825]" />
              <span className="relative text-[11px] sm:text-[13px] font-black text-[#F8FAFC]/70 tracking-wider">VS</span>
            </div>
            <StatusPill match={match} />
            {isSoccer && (
              <span className="text-[9px] text-[#94A3B8]/30 uppercase tracking-widest hidden sm:inline">Full Time</span>
            )}
          </>
        )}
      </div>

      {/* Away team */}
      <div className="flex-1 flex flex-col items-center gap-2.5 min-w-0">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl blur-lg opacity-25"
            style={{ background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)' }} />
          <div className="relative block sm:hidden">
            <TeamBadge name={match.awayTeamName} sportIcon={sportIcon} size="md" />
          </div>
          <div className="relative hidden sm:block">
            <TeamBadge name={match.awayTeamName} sportIcon={sportIcon} size="lg" />
          </div>
        </div>
        <span className="text-[12px] sm:text-[14px] font-bold text-[#F8FAFC] text-center leading-tight line-clamp-2 w-full px-1">
          {match.awayTeamName}
        </span>
        {!match.isLive && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#38BDF8]/10 text-[#38BDF8]/80 border border-[#38BDF8]/15">
            Away
          </span>
        )}
      </div>
    </div>
  );
}

// ─── HorseHeader ──────────────────────────────────────────────────────────────

function HorseHeader({ match, sportIcon, league }: {
  match: MatchEntity; sportIcon: string; league: LeagueEntity;
}) {
  return (
    <div className="px-4 sm:px-6 py-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-[#253241]"
        style={{ background: 'linear-gradient(135deg, #18212B, #0F1620)' }}>
        {sportIcon}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-bold text-[#F8FAFC] truncate">{match.homeTeamName}</h1>
        <p className="text-xs sm:text-sm text-[#94A3B8]/60 truncate mt-0.5">
          {flag(league.countryCode)} <SportName name={league.name} /> · {match.displayDate}
        </p>
      </div>
      <div className="ml-auto shrink-0">
        <StatusPill match={match} />
      </div>
    </div>
  );
}

// ─── LivePill ─────────────────────────────────────────────────────────────────

function LivePill({ match }: { match: MatchEntity }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-full px-3 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
      <span className="text-[10px] sm:text-[11px] font-bold text-[#EF4444] tabular-nums whitespace-nowrap">
        LIVE {match.liveMinute ? `${match.liveMinute}'` : ''}
      </span>
      <Wifi className="h-3 w-3 text-[#EF4444]/60 shrink-0" />
    </div>
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

function StatusPill({ match }: { match: MatchEntity }) {
  if (match.status === 'live') return <LivePill match={match} />;
  if (match.status === 'suspended') return (
    <div className="flex items-center gap-1.5 bg-[#FACC15]/10 border border-[#FACC15]/25 rounded-full px-3 py-1">
      <AlertCircle className="h-3 w-3 text-[#FACC15] shrink-0" />
      <span className="text-[10px] sm:text-[11px] font-bold text-[#FACC15] whitespace-nowrap">Suspended</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 bg-[#1A2433] border border-[#253241] rounded-full px-3 py-1">
      <Clock className="h-3 w-3 text-[#94A3B8]/50 shrink-0" />
      <span className="text-[10px] sm:text-[11px] font-semibold text-[#94A3B8]/80 whitespace-nowrap">
        {match.displayDate}
      </span>
    </div>
  );
}
