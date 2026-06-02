import { useLocation } from 'wouter';
import { ChevronLeft, Wifi, Clock, AlertCircle, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TeamBadge } from '../TeamBadge';
import type { MatchEntity } from '../../data/types';
import type { LeagueEntity } from '../../data/types';
import { formatKickoffTime, estimatedEndTime } from '../../lib/matchTime';

interface MatchHeaderProps {
  match: MatchEntity;
  league: LeagueEntity;
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

export function MatchHeader({ match, league }: MatchHeaderProps) {
  const [, setLocation] = useLocation();
  const sportIcon = SPORT_ICON[match.sportId] ?? '🏆';
  const isSoccer  = match.sportId === 'sp_soccer';
  const isTennis  = match.sportId === 'sp_tennis';
  const isHorse   = match.sportId === 'sp_horse_racing';

  return (
    <div className="bg-gradient-to-b from-[#0F1825] to-[#0B0F14] border-b border-[#253241]">

      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 min-w-0 overflow-hidden">
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors group shrink-0"
        >
          <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>All Sports</span>
        </button>
        {/* League segment — hidden on mobile to save space */}
        <span className="text-[#253241] hidden sm:inline shrink-0">/</span>
        <span className="hidden sm:inline text-xs text-[#94A3B8] shrink-0">
          {flag(league.countryCode)} {league.name}
        </span>
        <span className="text-[#253241] shrink-0">/</span>
        <span className="text-xs text-[#F8FAFC]/60 truncate min-w-0">
          {isHorse ? match.homeTeamName : `${match.homeTeamName} vs ${match.awayTeamName}`}
        </span>
      </div>

      {/* ── Main match area ─────────────────────────────────────────── */}
      {isHorse ? (
        <HorseHeader match={match} sportIcon={sportIcon} league={league} />
      ) : (
        <TeamsHeader match={match} sportIcon={sportIcon} isTennis={isTennis} isSoccer={isSoccer} />
      )}

      {/* ── Info bar — two rows on mobile, one row on sm+ ──────────── */}
      <div className="px-4 pb-3 mt-0.5 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
        {/* Time row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]/60">
            <Clock className="h-3 w-3 shrink-0" />
            {match.isLive ? 'Started' : 'Kicks off'}&nbsp;{formatKickoffTime(match.startTime) ?? match.displayDate}
          </span>
          {(() => {
            const end = estimatedEndTime(match.startTime, match.sportId);
            return end ? (
              <span className="text-[11px] text-[#94A3B8]/60">· ~Ends {end}</span>
            ) : null;
          })()}
        </div>

        {/* League + markets row */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#94A3B8]/60 truncate max-w-[180px] sm:max-w-none">
            {flag(league.countryCode)} {league.name}
          </span>
          <span className="text-[#253241] shrink-0">·</span>
          <span className="text-[11px] text-[#94A3B8]/60 shrink-0">
            {match.marketCount} markets
          </span>
          {match.isFeatured && (
            <>
              <span className="text-[#253241] shrink-0">·</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[#FACC15] shrink-0">
                <Star className="h-2.5 w-2.5 fill-[#FACC15]" />
                Featured
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamsHeader({ match, sportIcon, isSoccer, isTennis }: {
  match: MatchEntity; sportIcon: string; isSoccer: boolean; isTennis: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-5 py-4 sm:py-5 gap-3 sm:gap-5">

      {/* Home team */}
      <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
        {/* Badge: md on mobile, lg on sm+ */}
        <div className="block sm:hidden">
          <TeamBadge name={match.homeTeamName} sportIcon={sportIcon} size="md" />
        </div>
        <div className="hidden sm:block">
          <TeamBadge name={match.homeTeamName} sportIcon={sportIcon} size="lg" />
        </div>
        <span className="text-[11px] sm:text-[13px] font-bold text-[#F8FAFC] text-center leading-tight line-clamp-2 w-full px-1">
          {match.homeTeamName}
        </span>
      </div>

      {/* Score / status — fixed min-width so it never gets squeezed */}
      <div className="shrink-0 flex flex-col items-center gap-1.5 sm:gap-2 min-w-[80px] sm:min-w-[96px]">
        {match.isLive && match.score ? (
          <>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[28px] sm:text-4xl font-black text-[#F8FAFC] tabular-nums leading-none">
                {match.score.home}
              </span>
              <span className="text-[#94A3B8]/40 text-base sm:text-xl font-bold">:</span>
              <span className="text-[28px] sm:text-4xl font-black text-[#F8FAFC] tabular-nums leading-none">
                {match.score.away}
              </span>
            </div>
            <LivePill match={match} />
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1A2433] border border-[#253241]">
              <span className="text-[10px] sm:text-xs text-[#94A3B8]/70 font-bold">VS</span>
            </div>
            <StatusPill match={match} />
          </>
        )}
        {isSoccer && !match.isLive && (
          <span className="text-[9px] text-[#94A3B8]/35 uppercase tracking-wider hidden sm:inline">
            {isTennis ? 'Set Score' : 'Full Time'}
          </span>
        )}
      </div>

      {/* Away team */}
      <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
        <div className="block sm:hidden">
          <TeamBadge name={match.awayTeamName} sportIcon={sportIcon} size="md" />
        </div>
        <div className="hidden sm:block">
          <TeamBadge name={match.awayTeamName} sportIcon={sportIcon} size="lg" />
        </div>
        <span className="text-[11px] sm:text-[13px] font-bold text-[#F8FAFC] text-center leading-tight line-clamp-2 w-full px-1">
          {match.awayTeamName}
        </span>
      </div>
    </div>
  );
}

function HorseHeader({ match, sportIcon, league }: {
  match: MatchEntity; sportIcon: string; league: LeagueEntity;
}) {
  return (
    <div className="px-4 py-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#18212B] to-[#0F1620] border border-[#253241] flex items-center justify-center text-2xl shrink-0">
        {sportIcon}
      </div>
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-[#F8FAFC] truncate">{match.homeTeamName}</h1>
        <p className="text-xs sm:text-sm text-[#94A3B8] truncate">{league.name} · {match.displayDate}</p>
      </div>
      <div className="ml-auto shrink-0">
        <StatusPill match={match} />
      </div>
    </div>
  );
}

function LivePill({ match }: { match: MatchEntity }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-full px-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
      <span className="text-[10px] sm:text-[11px] font-bold text-[#EF4444] tabular-nums whitespace-nowrap">
        LIVE {match.liveMinute ? `${match.liveMinute}'` : ''}
      </span>
      <Wifi className="h-3 w-3 text-[#EF4444]/70 shrink-0" />
    </div>
  );
}

function StatusPill({ match }: { match: MatchEntity }) {
  if (match.status === 'live') return <LivePill match={match} />;
  if (match.status === 'suspended') return (
    <div className="flex items-center gap-1.5 bg-[#FACC15]/10 border border-[#FACC15]/30 rounded-full px-2.5 py-1">
      <AlertCircle className="h-3 w-3 text-[#FACC15] shrink-0" />
      <span className="text-[10px] sm:text-[11px] font-bold text-[#FACC15] whitespace-nowrap">Suspended</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1 bg-[#253241] rounded-full px-2.5 py-1">
      <Clock className="h-3 w-3 text-[#94A3B8]/60 shrink-0" />
      <span className="text-[10px] sm:text-[11px] font-semibold text-[#94A3B8] whitespace-nowrap">{match.displayDate}</span>
    </div>
  );
}
