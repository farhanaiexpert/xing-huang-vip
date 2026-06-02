import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, Flame, Clock, Bell, TrendingUp, Zap, Star } from 'lucide-react';
import { OddsButton } from './OddsButton';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useOddsData } from '../hooks/useOddsData';
import type { Match, League } from '../types';

// ── Sport bucket config ────────────────────────────────────────────────────────

interface SportBucketConfig {
  key:        string;
  prefixes:   string[];
  label:      string;
  emoji:      string;
  color:      string;
  marketName: string;
}

const SPORT_BUCKETS: SportBucketConfig[] = [
  { key: 'soccer',     prefixes: ['soccer_', 'sp_soccer', 'sp_ucl'],                label: 'Soccer',     emoji: '⚽', color: '#00DFA9', marketName: 'Match Result'  },
  { key: 'tennis',     prefixes: ['tennis_', 'sp_tennis'],                           label: 'Tennis',     emoji: '🎾', color: '#FACC15', marketName: 'To Win Match'  },
  { key: 'basketball', prefixes: ['basketball_', 'sp_basketball', 'sp_nba'],         label: 'Basketball', emoji: '🏀', color: '#38BDF8', marketName: 'Match Winner'  },
  { key: 'cricket',    prefixes: ['cricket_'],                                       label: 'Cricket',    emoji: '🏏', color: '#A78BFA', marketName: 'Match Winner'  },
  { key: 'mma',        prefixes: ['mma_', 'boxing_'],                                label: 'MMA / UFC',  emoji: '🥊', color: '#EF4444', marketName: 'Fight Winner'  },
  { key: 'nfl',        prefixes: ['americanfootball_'],                              label: 'NFL',        emoji: '🏈', color: '#F97316', marketName: 'Match Winner'  },
  { key: 'baseball',   prefixes: ['baseball_'],                                      label: 'Baseball',   emoji: '⚾', color: '#22C55E', marketName: 'Match Winner'  },
  { key: 'icehockey',  prefixes: ['icehockey_'],                                     label: 'Ice Hockey', emoji: '🏒', color: '#60A5FA', marketName: 'Match Winner'  },
  { key: 'rugby',      prefixes: ['rugbyleague_', 'rugbyunion_', 'betsapi_rugby'],   label: 'Rugby',      emoji: '🏉', color: '#C084FC', marketName: 'Match Winner'  },
  { key: 'volleyball', prefixes: ['volleyball_'],                                    label: 'Volleyball', emoji: '🏐', color: '#EC4899', marketName: 'Match Winner'  },
  { key: 'handball',   prefixes: ['handball_', 'betsapi_handball'],                  label: 'Handball',   emoji: '🤾', color: '#FB923C', marketName: 'Match Winner'  },
  { key: 'darts',      prefixes: ['darts_', 'betsapi_darts'],                        label: 'Darts',      emoji: '🎯', color: '#38BDF8', marketName: 'Match Winner'  },
];

function getBucket(league: League): SportBucketConfig | null {
  const sk = league.sportKey ?? league.sportId ?? '';
  return SPORT_BUCKETS.find(b => b.prefixes.some(p => sk.startsWith(p))) ?? null;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function TeamBadge({ name, size = 20, bg = '#253241', color = '#F8FAFC' }: {
  name: string; size?: number; bg?: string; color?: string;
}) {
  const initials = name
    .split(/[\s\-/]/)
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 3)
    .toUpperCase();
  return (
    <div
      className="rounded shrink-0 flex items-center justify-center font-black"
      style={{ width: size, height: size, fontSize: size * 0.38, background: bg, color }}
    >
      {initials}
    </div>
  );
}

function getTimeLabel(match: Match) {
  return match.kickoffTime ?? (match.date.includes(', ') ? match.date.split(', ')[1] : match.date);
}

// ── Countdown hook ─────────────────────────────────────────────────────────────

function useCountdown(isoTime: string | undefined): string | null {
  const getMs = useCallback(() => {
    if (!isoTime) return 0;
    return Math.max(0, new Date(isoTime).getTime() - Date.now());
  }, [isoTime]);

  const [ms, setMs] = useState(getMs);

  useEffect(() => {
    setMs(getMs());
    const id = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(id);
  }, [getMs]);

  if (ms <= 0) return null;
  const s   = Math.floor(ms / 1000);
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 72) return `${Math.floor(h / 24)}d ${pad(h % 24)}h`;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 · Featured Match Strip
// ══════════════════════════════════════════════════════════════════════════════

interface FeaturedEntry { match: Match; league: League; bucket: SportBucketConfig }

function FeaturedCard({ entry }: { entry: FeaturedEntry }) {
  const { match, league, bucket } = entry;
  const shared = {
    matchId:      match.id,
    marketId:     `feat_${match.id}`,
    matchName:    `${match.team1} v ${match.team2}`,
    leagueName:   league.name,
    marketName:   bucket.marketName,
    sportKey:     match.sportKey ?? match.sportId ?? '',
    homeTeam:     match.team1,
    awayTeam:     match.team2,
    commenceTime: match.commenceIso,
  };
  const timeLabel = getTimeLabel(match);

  return (
    <div
      className="shrink-0 w-[268px] sm:w-[290px] rounded-2xl overflow-hidden border cursor-pointer
                 transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: '#0B1018', borderColor: `${bucket.color}28` }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = `${bucket.color}55`;
        el.style.boxShadow = `0 8px 32px ${bucket.color}18`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = `${bucket.color}28`;
        el.style.boxShadow = '';
      }}
    >
      {/* Top gradient bar */}
      <div className="h-[3px] w-full" style={{
        background: `linear-gradient(90deg, ${bucket.color} 0%, ${bucket.color}50 60%, transparent 100%)`
      }} />

      <div className="p-4">
        {/* Row 1: FEATURED badge + time/LIVE */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Star className="h-2.5 w-2.5" style={{ color: bucket.color }} />
            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
              style={{ background: `${bucket.color}15`, color: bucket.color, border: `1px solid ${bucket.color}28` }}>
              FEATURED
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] leading-none">{bucket.emoji}</span>
            {match.isLive ? (
              <span className="flex items-center gap-0.5 text-[9px] font-black text-[#EF4444]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" /> LIVE
                {match.liveMinute != null && <span className="text-[#EF4444]/70 ml-0.5">{match.liveMinute}'</span>}
              </span>
            ) : (
              <span className="text-[10px] text-[#94A3B8]/50 font-semibold">{timeLabel}</span>
            )}
          </div>
        </div>

        {/* League */}
        <p className="text-[9px] uppercase tracking-widest mb-2.5 truncate" style={{ color: `${bucket.color}60` }}>
          {league.name}
        </p>

        {/* Teams */}
        <div className="flex flex-col gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <TeamBadge name={match.team1} size={30} bg={`${bucket.color}1a`} color={bucket.color} />
            <span className="text-[14px] font-bold text-[#F8FAFC] leading-tight truncate">{match.team1}</span>
          </div>
          <div className="flex items-center gap-2">
            <TeamBadge name={match.team2} size={30} bg="rgba(37,50,65,0.7)" color="#64748B" />
            <span className="text-[14px] font-bold text-[#94A3B8] leading-tight truncate">{match.team2}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${bucket.color}18, transparent)` }} />
          <span className="text-[8px] font-black text-[#94A3B8]/25 tracking-widest">VS</span>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${bucket.color}18)` }} />
        </div>

        {/* Odds row */}
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <div className="flex flex-col items-center gap-0.5 flex-1">
            <span className="text-[8px] text-[#94A3B8]/35 uppercase tracking-wide">Home</span>
            <OddsButton {...shared} selectionType="1" selectionName={match.team1} odds={match.odds.home} />
          </div>
          {match.odds.draw != null && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] text-[#94A3B8]/35 uppercase tracking-wide">Draw</span>
              <OddsButton {...shared} selectionType="X" selectionName="Draw" odds={match.odds.draw} />
            </div>
          )}
          <div className="flex flex-col items-center gap-0.5 flex-1">
            <span className="text-[8px] text-[#94A3B8]/35 uppercase tracking-wide">Away</span>
            <OddsButton {...shared} selectionType="2" selectionName={match.team2} odds={match.odds.away} />
          </div>
        </div>

        {/* Markets */}
        {(match.marketCount ?? 0) > 0 && (
          <div className="mt-2.5 text-center">
            <span className="text-[9px] text-[#38BDF8]/50">+{match.marketCount} markets</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturedStrip({ entries }: { entries: FeaturedEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(250,204,21,0.25),rgba(250,204,21,0.05))', border: '1px solid rgba(250,204,21,0.28)' }}>
            <Star className="h-2.5 w-2.5 text-[#FACC15]" />
          </div>
          <span className="text-[13px] font-black text-[#F8FAFC] uppercase tracking-wide">Featured</span>
          <span className="text-[10px] text-[#94A3B8]/40">Top picks right now</span>
        </div>
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors">
          View All <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-2">
          {entries.map(e => <FeaturedCard key={e.match.id} entry={e} />)}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 · Trending Now Rail
// ══════════════════════════════════════════════════════════════════════════════

interface TrendingPill {
  match: Match; league: League; bucket: SportBucketConfig;
  bestOdds: number; rank: number;
}

function TrendingRail({ pills }: { pills: TrendingPill[] }) {
  if (pills.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <Flame className="h-3.5 w-3.5 text-[#EF4444]" />
        <span className="text-[13px] font-black text-[#F8FAFC] uppercase tracking-wide">Trending Now</span>
        <span className="text-[10px] text-[#94A3B8]/40">Most popular bets</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {pills.map(p => {
          const isHot = p.rank < 2;
          return (
            <div
              key={p.match.id}
              className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              style={{
                background:  isHot ? `${p.bucket.color}0d` : 'rgba(11,16,24,0.9)',
                borderColor: isHot ? `${p.bucket.color}35` : 'rgba(37,50,65,0.55)',
              }}
            >
              {isHot && <Flame className="h-3 w-3 shrink-0 text-[#EF4444]" />}
              <span className="text-[15px] leading-none shrink-0">{p.bucket.emoji}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-semibold text-[#F8FAFC] leading-none truncate max-w-[110px]">
                  {p.match.team1} v {p.match.team2}
                </span>
                <span className="text-[9px] text-[#94A3B8]/45 leading-none mt-0.5 truncate max-w-[110px]">
                  {p.league.name}
                </span>
              </div>
              <div className="flex flex-col items-end ml-1 shrink-0">
                <span className="text-[15px] font-black tabular-nums leading-none"
                  style={{ color: isHot ? '#FACC15' : '#94A3B8' }}>
                  {p.bestOdds.toFixed(2)}
                </span>
                {p.match.isLive && (
                  <span className="flex items-center gap-0.5 text-[8px] font-black text-[#EF4444] mt-0.5">
                    <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" /> LIVE
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 · Multi-Sport Panel Grid
// ══════════════════════════════════════════════════════════════════════════════

interface SportPanelData {
  bucket: SportBucketConfig;
  pairs:  { match: Match; league: League }[];
  total:  number;
}

function PanelMatchRow({ match, league, bucket }: { match: Match; league: League; bucket: SportBucketConfig }) {
  const shared = {
    matchId:      match.id,
    marketId:     `panel_${bucket.key}_${match.id}`,
    matchName:    `${match.team1} v ${match.team2}`,
    leagueName:   league.name,
    marketName:   bucket.marketName,
    sportKey:     match.sportKey ?? match.sportId ?? '',
    homeTeam:     match.team1,
    awayTeam:     match.team2,
    commenceTime: match.commenceIso,
  };
  const timeLabel = getTimeLabel(match);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 transition-colors cursor-pointer"
      style={{ borderColor: 'rgba(37,50,65,0.35)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${bucket.color}07`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      {/* Time / LIVE */}
      <div className="w-[36px] shrink-0 text-right">
        {match.isLive ? (
          <span className="flex items-center justify-end gap-0.5 text-[8.5px] font-black text-[#EF4444]">
            <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" /> LIVE
          </span>
        ) : (
          <span className="text-[9px] text-[#94A3B8]/40 font-semibold leading-tight">{timeLabel}</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <TeamBadge name={match.team1} size={15} bg={`${bucket.color}18`} color={bucket.color} />
          <span className="text-[11.5px] font-medium text-[#F8FAFC] leading-none truncate">{match.team1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TeamBadge name={match.team2} size={15} bg="rgba(37,50,65,0.7)" color="#64748B" />
          <span className="text-[11.5px] font-medium text-[#94A3B8] leading-none truncate">{match.team2}</span>
        </div>
      </div>

      {/* Odds */}
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <OddsButton {...shared} selectionType="1" selectionName={match.team1} odds={match.odds.home} />
        {match.odds.draw != null && (
          <OddsButton {...shared} selectionType="X" selectionName="Draw" odds={match.odds.draw} />
        )}
        <OddsButton {...shared} selectionType="2" selectionName={match.team2} odds={match.odds.away} />
      </div>
    </div>
  );
}

function SportPanel({ data }: { data: SportPanelData }) {
  const { bucket, pairs, total } = data;
  const more = total - pairs.length;

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        background:  '#0B1018',
        borderColor: 'rgba(37,50,65,0.5)',
        borderLeft:  `3px solid ${bucket.color}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 border-b"
        style={{ borderColor: 'rgba(37,50,65,0.35)', background: `${bucket.color}08` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[17px] leading-none">{bucket.emoji}</span>
          <span className="text-[12.5px] font-black text-[#F8FAFC] uppercase tracking-wide">{bucket.label}</span>
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${bucket.color}18`, color: bucket.color, border: `1px solid ${bucket.color}22` }}
          >
            {total}
          </span>
        </div>
        <button className="flex items-center gap-0.5 text-[10px] font-semibold text-[#38BDF8]/60 hover:text-[#38BDF8] transition-colors">
          All <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Rows */}
      <div>
        {pairs.map(({ match, league }) => (
          <PanelMatchRow key={match.id} match={match} league={league} bucket={bucket} />
        ))}
      </div>

      {/* More footer */}
      {more > 0 && (
        <button
          className="w-full py-2 text-center text-[9.5px] font-semibold transition-all border-t"
          style={{ borderColor: 'rgba(37,50,65,0.35)', color: `${bucket.color}70`, background: `${bucket.color}05` }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = bucket.color; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = `${bucket.color}70`; }}
        >
          +{more} more matches →
        </button>
      )}
    </div>
  );
}

function SportPanelGrid({ panels }: { panels: SportPanelData[] }) {
  if (panels.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <TrendingUp className="h-3.5 w-3.5 text-[#00DFA9]" />
        <span className="text-[13px] font-black text-[#F8FAFC] uppercase tracking-wide">All Sports</span>
        <span className="text-[10px] text-[#94A3B8]/40">{panels.length} sports · live odds</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {panels.map(p => <SportPanel key={p.bucket.key} data={p} />)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 · Coming Soon Countdown
// ══════════════════════════════════════════════════════════════════════════════

interface ComingSoonEntry { match: Match; league: League; bucket: SportBucketConfig }

function CountdownCard({ entry }: { entry: ComingSoonEntry }) {
  const { match, league, bucket } = entry;
  const countdown = useCountdown(match.commenceIso);
  const timeLabel  = getTimeLabel(match);

  return (
    <div
      className="shrink-0 w-[220px] rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
      style={{ background: '#0B1018', borderColor: `${bucket.color}22` }}
    >
      <div className="h-[2px]" style={{
        background: `linear-gradient(90deg, ${bucket.color}, ${bucket.color}30, transparent)`
      }} />

      <div className="p-3.5">
        {/* Sport + time */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] leading-none">{bucket.emoji}</span>
            <span className="text-[9px] text-[#94A3B8]/45 truncate max-w-[90px]">{league.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5 text-[#94A3B8]/30" />
            <span className="text-[9px] text-[#94A3B8]/45">{timeLabel}</span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex flex-col gap-1.5 mb-3">
          <div className="flex items-center gap-1.5">
            <TeamBadge name={match.team1} size={21} bg={`${bucket.color}18`} color={bucket.color} />
            <span className="text-[12px] font-bold text-[#F8FAFC] leading-none truncate">{match.team1}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TeamBadge name={match.team2} size={21} bg="rgba(37,50,65,0.75)" color="#64748B" />
            <span className="text-[12px] font-bold text-[#94A3B8] leading-none truncate">{match.team2}</span>
          </div>
        </div>

        {/* Countdown timer */}
        <div
          className="rounded-lg px-3 py-2 mb-3 text-center border"
          style={{ background: 'rgba(250,204,21,0.04)', borderColor: 'rgba(250,204,21,0.1)' }}
        >
          {countdown ? (
            <>
              <div className="text-[7.5px] text-[#94A3B8]/35 uppercase tracking-widest mb-1">Starts in</div>
              <div
                className="text-[17px] font-black tabular-nums text-[#FACC15] leading-none"
                style={{ textShadow: '0 0 14px rgba(250,204,21,0.28)' }}
              >
                {countdown}
              </div>
            </>
          ) : (
            <div className="text-[10px] font-bold text-[#94A3B8]/40 py-0.5">Starting soon</div>
          )}
        </div>

        {/* Reminder button */}
        <button
          className="w-full py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-wider
                     flex items-center justify-center gap-1.5 transition-opacity hover:opacity-75"
          style={{
            background: `${bucket.color}12`,
            color:      bucket.color,
            border:     `1px solid ${bucket.color}22`,
          }}
        >
          <Bell className="h-2.5 w-2.5" />
          Set Reminder
        </button>
      </div>
    </div>
  );
}

function ComingSoonSection({ entries }: { entries: ComingSoonEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1 px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-[#FACC15]" />
            <span className="text-[13px] font-black text-[#F8FAFC] uppercase tracking-wide">Coming Soon</span>
          </div>
          <p className="text-[9.5px] text-[#94A3B8]/40 mt-0.5">Don't miss these upcoming matches</p>
        </div>
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors">
          View All <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-2 pt-3">
          {entries.map(e => <CountdownCard key={e.match.id} entry={e} />)}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Main export
// ══════════════════════════════════════════════════════════════════════════════

export function SportHighlights() {
  const { allLeagues } = useOddsData();

  const { featured, trending, panels, comingSoon } = useMemo(() => {
    const bucketMap = new Map<string, { config: SportBucketConfig; pairs: { match: Match; league: League }[] }>();
    const allPairs: { match: Match; league: League; bucket: SportBucketConfig }[] = [];

    for (const league of allLeagues) {
      const bucket = getBucket(league);
      if (!bucket) continue;
      if (!bucketMap.has(bucket.key)) {
        bucketMap.set(bucket.key, { config: bucket, pairs: [] });
      }
      const entry = bucketMap.get(bucket.key)!;
      for (const match of league.matches) {
        entry.pairs.push({ match, league });
        allPairs.push({ match, league, bucket });
      }
    }

    // 1. Featured — live first, then soonest by commenceIso, cap 4
    const featured: FeaturedEntry[] = [...allPairs]
      .sort((a, b) => {
        if (a.match.isLive !== b.match.isLive) return a.match.isLive ? -1 : 1;
        const ta = a.match.commenceIso ? new Date(a.match.commenceIso).getTime() : Infinity;
        const tb = b.match.commenceIso ? new Date(b.match.commenceIso).getTime() : Infinity;
        return ta - tb;
      })
      .slice(0, 4);

    // 2. Trending — sort by marketCount desc then max odds, cap 6
    const trending: TrendingPill[] = [...allPairs]
      .sort((a, b) => {
        const mc = (b.match.marketCount ?? 0) - (a.match.marketCount ?? 0);
        if (mc !== 0) return mc;
        const maxA = Math.max(a.match.odds.home, a.match.odds.away, a.match.odds.draw ?? 0);
        const maxB = Math.max(b.match.odds.home, b.match.odds.away, b.match.odds.draw ?? 0);
        return maxB - maxA;
      })
      .slice(0, 6)
      .map((p, i) => ({
        match:    p.match,
        league:   p.league,
        bucket:   p.bucket,
        bestOdds: Math.max(p.match.odds.home, p.match.odds.away, p.match.odds.draw ?? 0),
        rank:     i,
      }));

    // 3. Sport panels — sort by match count, cap 6 sports, 3 matches shown each
    const panels: SportPanelData[] = [...bucketMap.values()]
      .filter(b => b.pairs.length > 0)
      .sort((a, b) => b.pairs.length - a.pairs.length)
      .slice(0, 6)
      .map(b => ({
        bucket: b.config,
        pairs:  b.pairs.slice(0, 3),
        total:  b.pairs.length,
      }));

    // 4. Coming soon — future matches with commenceIso, soonest first, cap 4
    const now = Date.now();
    const comingSoon: ComingSoonEntry[] = allPairs
      .filter(p =>
        !p.match.isLive &&
        !!p.match.commenceIso &&
        new Date(p.match.commenceIso).getTime() > now
      )
      .sort((a, b) => {
        const ta = new Date(a.match.commenceIso!).getTime();
        const tb = new Date(b.match.commenceIso!).getTime();
        return ta - tb;
      })
      .slice(0, 4);

    return { featured, trending, panels, comingSoon };
  }, [allLeagues]);

  if (panels.length === 0 && featured.length === 0) return null;

  return (
    <div className="mb-2">
      <FeaturedStrip    entries={featured}   />
      <TrendingRail     pills={trending}     />
      <SportPanelGrid   panels={panels}      />
      <ComingSoonSection entries={comingSoon} />
    </div>
  );
}
