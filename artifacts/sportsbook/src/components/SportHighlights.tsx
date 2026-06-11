import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { ChevronRight, Flame, Clock, Bell, TrendingUp, Star, ArrowRight, Layers } from 'lucide-react';
import { estimatedEndTime } from '../lib/matchTime';
import { OddsButton } from './OddsButton';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useOddsData } from '../hooks/useOddsData';
import { SportName } from './SportName';
import { TeamBadge as TeamBadgeBase } from './TeamBadge';
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

/** Derives the sport ID used by MainContent's filter from a bucket config */
function bucketToSportId(bucket: SportBucketConfig): string {
  const p = bucket.prefixes[0];
  if (p.endsWith('_')) return p.slice(0, -1); // "soccer_" → "soccer"
  if (p.startsWith('betsapi_')) return p.replace('betsapi_', ''); // "betsapi_rugby" → "rugby"
  return p;
}

function scrollToTop() {
  document.getElementById('main-content-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Fisher–Yates shuffle — returns a new array, does not mutate the input. */
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function TeamBadge({ name, size = 20, emoji }: { name: string; size?: number; emoji?: string }) {
  return <TeamBadgeBase name={name} sportIcon={emoji} size={size} />;
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
    marketId:     `1x2_${match.id}`,
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
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[11px] text-[#F8FAFC]/80 font-bold tabular-nums">{timeLabel}</span>
                {(() => {
                  const end = estimatedEndTime(match.commenceIso, match.sportId);
                  return end ? (
                    <span className="flex items-center gap-0.5 text-[9px] font-medium text-[#00DFA9]/55">
                      <ArrowRight className="h-2 w-2" />~{end}
                    </span>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* League */}
        <p className="text-[9px] uppercase tracking-widest mb-2.5 truncate" style={{ color: `${bucket.color}60` }}>
          <SportName name={league.name} />
        </p>

        {/* Teams */}
        <div className="flex flex-col gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <TeamBadge name={match.team1} size={30} emoji={bucket.emoji} />
            <span className="text-[14px] font-bold text-[#F8FAFC] leading-tight truncate">{match.team1}</span>
          </div>
          <div className="flex items-center gap-2">
            <TeamBadge name={match.team2} size={30} emoji={bucket.emoji} />
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

function TrendingCard({ p }: { p: TrendingPill }) {
  const { match, league, bucket, rank } = p;
  const [, setLocation] = useLocation();
  const isHot     = match.isLive || rank < 2;
  const hasDraw   = match.odds.draw != null;
  const marketCnt = match.marketCount ?? 0;
  const shared  = {
    matchId:      match.id,
    marketId:     `1x2_${match.id}`,
    matchName:    `${match.team1} v ${match.team2}`,
    leagueName:   league.name,
    marketName:   bucket.marketName,
    sportKey:     match.sportKey ?? match.sportId ?? '',
    homeTeam:     match.team1,
    awayTeam:     match.team2,
    commenceTime: match.commenceIso,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setLocation(`/match/${match.id}`)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLocation(`/match/${match.id}`); } }}
      className="group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00DFA9]/40"
      style={{
        background:  'linear-gradient(160deg, #0E1824 0%, #0B1220 100%)',
        borderColor: 'rgba(30,45,61,0.8)',
        boxShadow:   '0 2px 8px rgba(0,0,0,0.25)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow   = `0 8px 28px ${bucket.color}1f, 0 2px 8px rgba(0,0,0,0.35)`;
        el.style.borderColor = `${bucket.color}55`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow   = '0 2px 8px rgba(0,0,0,0.25)';
        el.style.borderColor = 'rgba(30,45,61,0.8)';
      }}
    >
      {/* Sport-coloured glow accent */}
      <div className="h-[3px] w-full shrink-0"
        style={{ background: `linear-gradient(90deg, ${bucket.color} 0%, ${bucket.color}50 55%, transparent 100%)` }} />
      <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `${bucket.color}14` }} />

      <div className="relative flex flex-col flex-1 p-3 gap-0">

        {/* ── Row 1: sport + HOT + time ── */}
        <div className="flex items-center justify-between gap-1 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm leading-none">{bucket.emoji}</span>
            <span className="text-[9px] font-bold uppercase tracking-wide truncate"
              style={{ color: bucket.color }}>
              <SportName name={bucket.label} />
            </span>
            {isHot && (
              <span className="flex items-center gap-0.5 text-[7px] font-black uppercase shrink-0 px-1 py-0.5 rounded-full"
                style={{ color: '#EF4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)' }}>
                <Flame className="h-[8px] w-[8px]" /> HOT
              </span>
            )}
          </div>
          {match.isLive ? (
            <span className="flex items-center gap-1 text-[8px] font-black text-[#EF4444] shrink-0 px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>
              <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
              LIVE{match.liveMinute != null ? ` ${match.liveMinute}'` : ''}
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-[#475569] shrink-0 tabular-nums bg-[#131C28] px-1.5 py-0.5 rounded-full border border-[#1E2D3D]">
              {getTimeLabel(match)}
            </span>
          )}
        </div>

        {/* ── Row 2: teams stacked ── */}
        <div className="flex flex-col gap-0 mb-2.5">
          {/* Home */}
          <div className="flex items-center gap-2 py-1.5 border-l-2 pl-2 rounded-r"
            style={{ borderColor: bucket.color }}>
            <TeamBadge name={match.team1} emoji={bucket.emoji} size={20} />
            <span className="text-[12px] font-bold text-[#F0F4F8] leading-none truncate">{match.team1}</span>
          </div>

          {/* VS separator */}
          <div className="flex items-center gap-2 py-1 pl-2">
            <div className="w-5 shrink-0 flex justify-center">
              <div className="w-px h-2.5 bg-[#1E2D3D]" />
            </div>
            <span className="text-[7.5px] font-black text-[#2A3A52] uppercase tracking-widest">vs</span>
          </div>

          {/* Away */}
          <div className="flex items-center gap-2 py-1.5 border-l-2 pl-2 rounded-r border-[#1E2D3D]">
            <TeamBadge name={match.team2} emoji={bucket.emoji} size={20} />
            <span className="text-[11px] font-semibold text-[#64748B] leading-none truncate">{match.team2}</span>
          </div>
        </div>

        {/* ── Row 2.5: league + markets meta ── */}
        <div className="flex items-center justify-between gap-1.5 mb-2.5 min-w-0">
          <span className="text-[8.5px] font-medium text-[#475569] truncate">
            <SportName name={league.name} />
          </span>
          {marketCnt > 1 && (
            <span className="flex items-center gap-0.5 shrink-0 text-[8px] font-bold text-[#38BDF8]/80 bg-[#38BDF8]/8 border border-[#38BDF8]/15 px-1.5 py-0.5 rounded-full">
              <Layers className="h-[8px] w-[8px]" /> +{marketCnt} markets
            </span>
          )}
        </div>

        {/* ── Row 3: odds ── */}
        <div className="mt-auto" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
          <div className={`grid mb-1.5 ${hasDraw ? 'grid-cols-3' : 'grid-cols-2'} gap-1`}>
            <span className="text-center text-[8px] font-bold uppercase tracking-wider text-[#334155]">
              {hasDraw ? '1' : 'HOME'}
            </span>
            {hasDraw && (
              <span className="text-center text-[8px] font-bold uppercase tracking-wider text-[#334155]">X</span>
            )}
            <span className="text-center text-[8px] font-bold uppercase tracking-wider text-[#334155]">
              {hasDraw ? '2' : 'AWAY'}
            </span>
          </div>
          <div className={`grid ${hasDraw ? 'grid-cols-3' : 'grid-cols-2'} gap-1`}>
            <OddsButton {...shared} selectionType="1" selectionName={match.team1} odds={match.odds.home} className="w-full" />
            {hasDraw && (
              <OddsButton {...shared} selectionType="X" selectionName="Draw" odds={match.odds.draw!} className="w-full" />
            )}
            <OddsButton {...shared} selectionType="2" selectionName={match.team2} odds={match.odds.away} className="w-full" />
          </div>
        </div>

      </div>
    </div>
  );
}

function TrendingRail({ pills }: { pills: TrendingPill[] }) {
  if (pills.length === 0) return null;
  return (
    <div className="mb-5">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-3 px-0.5">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.22), rgba(239,68,68,0.06))',
            border:     '1px solid rgba(239,68,68,0.28)',
          }}>
          <Flame className="h-3 w-3 text-[#EF4444]" />
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[13px] font-black text-[#F8FAFC] uppercase tracking-wide">Trending Now</span>
          <span className="text-[10px] text-[#94A3B8]/40 hidden sm:inline">Most popular bets</span>
        </div>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-bold text-[#EF4444]/70 bg-[#EF4444]/8 border border-[#EF4444]/15 px-2 py-0.5 rounded-full">
            {pills.length} events
          </span>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 gap-2">
        {pills.map(p => <TrendingCard key={p.match.id} p={p} />)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 · Multi-Sport Panel Grid
// ══════════════════════════════════════════════════════════════════════════════

interface SportPanelData {
  bucket:    SportBucketConfig;
  pairs:     { match: Match; league: League }[];
  total:     number;
  liveCount: number;
}

function PanelMatchRow({ match, league, bucket }: { match: Match; league: League; bucket: SportBucketConfig }) {
  const shared = {
    matchId:      match.id,
    marketId:     `1x2_${match.id}`,
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
          <TeamBadge name={match.team1} size={15} emoji={bucket.emoji} />
          <span className="text-[11.5px] font-medium text-[#F8FAFC] leading-none truncate">{match.team1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TeamBadge name={match.team2} size={15} emoji={bucket.emoji} />
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

function SportPanel({ data, onSelectSport }: { data: SportPanelData; onSelectSport?: (id: string) => void }) {
  const { bucket, pairs, total, liveCount } = data;
  const more = total - pairs.length;
  const handleDrillDown = () => {
    onSelectSport?.(bucketToSportId(bucket));
    scrollToTop();
  };

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
          <span className="text-[12.5px] font-black text-[#F8FAFC] uppercase tracking-wide"><SportName name={bucket.label} /></span>
          {liveCount > 0 && (
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.22)' }}
            >
              <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
              {liveCount} LIVE
            </span>
          )}
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${bucket.color}18`, color: bucket.color, border: `1px solid ${bucket.color}22` }}
          >
            {total}
          </span>
        </div>
        <button
          onClick={handleDrillDown}
          className="flex items-center gap-0.5 text-[10px] font-semibold text-[#38BDF8]/60 hover:text-[#38BDF8] transition-colors"
        >
          View All <ChevronRight className="h-3 w-3" />
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
          onClick={handleDrillDown}
          className="w-full py-2 text-center text-[9.5px] font-semibold transition-all border-t"
          style={{ borderColor: 'rgba(37,50,65,0.35)', color: `${bucket.color}70`, background: `${bucket.color}05` }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = bucket.color; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = `${bucket.color}70`; }}
        >
          Show all {total} <SportName name={bucket.label} /> matches →
        </button>
      )}
    </div>
  );
}

function SportPanelGrid({ panels, onSelectSport }: { panels: SportPanelData[]; onSelectSport?: (id: string) => void }) {
  if (panels.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <TrendingUp className="h-3.5 w-3.5 text-[#00DFA9]" />
        <span className="text-[13px] font-black text-[#F8FAFC] uppercase tracking-wide">All Sports</span>
        <span className="text-[10px] text-[#94A3B8]/40">{panels.length} sports · live odds</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {panels.map(p => <SportPanel key={p.bucket.key} data={p} onSelectSport={onSelectSport} />)}
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
            <span className="text-[9px] text-[#94A3B8]/45 truncate max-w-[90px]"><SportName name={league.name} /></span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5 text-[#94A3B8]/30" />
            <span className="text-[9px] text-[#94A3B8]/45">{timeLabel}</span>
          </div>
        </div>

        {/* Teams */}
        <div className="flex flex-col gap-1.5 mb-3">
          <div className="flex items-center gap-1.5">
            <TeamBadge name={match.team1} size={21} emoji={bucket.emoji} />
            <span className="text-[12px] font-bold text-[#F8FAFC] leading-none truncate">{match.team1}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TeamBadge name={match.team2} size={21} emoji={bucket.emoji} />
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

function ComingSoonSection({ entries, onViewAll }: { entries: ComingSoonEntry[]; onViewAll?: () => void }) {
  if (entries.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1 px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[#FACC15]" />
            <span className="text-[13px] font-black text-[#F8FAFC] uppercase tracking-wide">⏰ Coming Soon</span>
          </div>
          <p className="text-[9.5px] text-[#94A3B8]/40 mt-0.5">Don't miss these upcoming matches</p>
        </div>
        <button onClick={onViewAll} className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors">
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

export function SportHighlights({ onSelectSport, onComingSoonViewAll }: { onSelectSport?: (id: string) => void; onComingSoonViewAll?: () => void } = {}) {
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

    // 2. Trending — randomised premium mix of BetsAPI + Odds API events.
    //    BetsAPI events have ids prefixed "betsapi_"; everything else is Odds API.
    //    We surface the richest events from each source, then shuffle so the rail
    //    feels fresh on every refresh while always blending both feeds.
    const TRENDING_TARGET = 8;
    const byRichness = (
      a: { match: Match }, b: { match: Match },
    ) => (b.match.marketCount ?? 0) - (a.match.marketCount ?? 0);

    const eligible = allPairs.filter(p =>
      p.match.team1 && p.match.team2 &&
      p.match.odds.home > 1 && p.match.odds.away > 1,
    );
    const betsPool = eligible.filter(p => p.match.id.startsWith('betsapi_'));
    const oddsPool = eligible.filter(p => !p.match.id.startsWith('betsapi_'));

    // Take a shuffled slice from each source's richest events.
    const half = Math.ceil(TRENDING_TARGET / 2);
    const pickFrom = (pool: typeof eligible, n: number) =>
      shuffle([...pool].sort(byRichness).slice(0, Math.max(n * 3, 12))).slice(0, n);

    const picked = [...pickFrom(betsPool, half), ...pickFrom(oddsPool, half)];

    // Top up from whichever pool still has events if one source is thin/empty.
    const seenIds = new Set(picked.map(p => p.match.id));
    if (picked.length < TRENDING_TARGET) {
      const filler = shuffle(
        eligible.filter(p => !seenIds.has(p.match.id)).sort(byRichness),
      );
      for (const p of filler) {
        if (picked.length >= TRENDING_TARGET) break;
        if (seenIds.has(p.match.id)) continue;
        seenIds.add(p.match.id);
        picked.push(p);
      }
    }

    const trending: TrendingPill[] = shuffle(picked)
      .slice(0, TRENDING_TARGET)
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
        bucket:    b.config,
        pairs:     b.pairs.slice(0, 3),
        total:     b.pairs.length,
        liveCount: b.pairs.filter(p => p.match.isLive).length,
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
      <FeaturedStrip     entries={featured}                       />
      <TrendingRail      pills={trending}                         />
      <SportPanelGrid    panels={panels} onSelectSport={onSelectSport} />
      <ComingSoonSection entries={comingSoon} onViewAll={onComingSoonViewAll} />
    </div>
  );
}
