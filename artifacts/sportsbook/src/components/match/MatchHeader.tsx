import { useLocation } from 'wouter';
import { ChevronLeft, Wifi, Clock, AlertCircle, Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MatchEntity } from '../../data/types';
import type { LeagueEntity } from '../../data/types';

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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors group"
        >
          <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          All Sports
        </button>
        <span className="text-[#253241]">/</span>
        <span className="text-xs text-[#94A3B8]">{flag(league.countryCode)} {league.name}</span>
        <span className="text-[#253241]">/</span>
        <span className="text-xs text-[#F8FAFC]/60 truncate max-w-[200px]">
          {isHorse ? match.homeTeamName : `${match.homeTeamName} vs ${match.awayTeamName}`}
        </span>
      </div>

      {/* Main match area */}
      {isHorse ? (
        <HorseHeader match={match} sportIcon={sportIcon} league={league} />
      ) : (
        <TeamsHeader match={match} sportIcon={sportIcon} isTennis={isTennis} isSoccer={isSoccer} />
      )}

      {/* Info bar */}
      <div className="flex items-center gap-3 px-4 pb-3 mt-1">
        <span className="text-[11px] text-[#94A3B8]/60">
          {flag(league.countryCode)} {league.name}
        </span>
        <span className="text-[#253241]">·</span>
        <span className="flex items-center gap-1 text-[11px] text-[#94A3B8]/60">
          <Clock className="h-3 w-3" />
          {match.displayDate}
        </span>
        <span className="text-[#253241]">·</span>
        <span className="text-[11px] text-[#94A3B8]/60">
          {match.marketCount} markets
        </span>
        {match.isFeatured && (
          <>
            <span className="text-[#253241]">·</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#FACC15]">
              <Star className="h-2.5 w-2.5 fill-[#FACC15]" />
              Featured
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function TeamsHeader({ match, sportIcon, isSoccer, isTennis }: {
  match: MatchEntity; sportIcon: string; isSoccer: boolean; isTennis: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4 gap-4">
      {/* Home team */}
      <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
        <TeamBadge name={match.homeTeamName} sportIcon={sportIcon} size="lg" />
        <span className="text-[13px] font-bold text-[#F8FAFC] text-center leading-tight">
          {match.homeTeamName}
        </span>
      </div>

      {/* Score / status center */}
      <div className="shrink-0 flex flex-col items-center gap-2">
        {match.isLive && match.score ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-[#F8FAFC] tabular-nums">{match.score.home}</span>
              <span className="text-[#94A3B8]/40 text-xl font-bold">:</span>
              <span className="text-4xl font-black text-[#F8FAFC] tabular-nums">{match.score.away}</span>
            </div>
            <LivePill match={match} />
          </>
        ) : (
          <>
            <span className="text-xs text-[#94A3B8]/60 font-medium">VS</span>
            <StatusPill match={match} />
          </>
        )}
        {isSoccer && (
          <span className="text-[9px] text-[#94A3B8]/40 uppercase tracking-wider">
            {isTennis ? 'Set Score' : 'Half Time'}
          </span>
        )}
      </div>

      {/* Away team */}
      <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
        <TeamBadge name={match.awayTeamName} sportIcon={sportIcon} size="lg" />
        <span className="text-[13px] font-bold text-[#F8FAFC] text-center leading-tight">
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
      <div>
        <h1 className="text-xl font-bold text-[#F8FAFC]">{match.homeTeamName}</h1>
        <p className="text-sm text-[#94A3B8]">{league.name} · {match.displayDate}</p>
      </div>
      <div className="ml-auto">
        <StatusPill match={match} />
      </div>
    </div>
  );
}

function TeamBadge({ name, sportIcon, size = 'md' }: { name: string; sportIcon: string; size?: 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 3).join('').toUpperCase();
  const sz = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-10 h-10 text-base';
  return (
    <div className={cn(
      'rounded-2xl bg-gradient-to-br from-[#1E2A38] to-[#121821] border border-[#253241]',
      'flex items-center justify-center font-bold text-[#F8FAFC] shrink-0',
      'shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
      sz
    )}>
      {initials.length <= 2 ? initials : sportIcon}
    </div>
  );
}

function LivePill({ match }: { match: MatchEntity }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-full px-3 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
      <span className="text-[11px] font-bold text-[#EF4444] tabular-nums">
        LIVE {match.liveMinute ? `${match.liveMinute}'` : ''}
      </span>
      <Wifi className="h-3 w-3 text-[#EF4444]/70" />
    </div>
  );
}

function StatusPill({ match }: { match: MatchEntity }) {
  if (match.status === 'live') return <LivePill match={match} />;
  if (match.status === 'suspended') return (
    <div className="flex items-center gap-1.5 bg-[#FACC15]/10 border border-[#FACC15]/30 rounded-full px-3 py-1">
      <AlertCircle className="h-3 w-3 text-[#FACC15]" />
      <span className="text-[11px] font-bold text-[#FACC15]">Suspended</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 bg-[#253241] rounded-full px-3 py-1">
      <Clock className="h-3 w-3 text-[#94A3B8]/60" />
      <span className="text-[11px] font-semibold text-[#94A3B8]">{match.displayDate}</span>
    </div>
  );
}
