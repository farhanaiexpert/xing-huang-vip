import { useState } from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { OddsButton } from './OddsButton';

// ── Static match data drawn from matches.ts ────────────────────────────────────

interface SoccerMatch {
  id: string; league: string; leagueFlag: string;
  home: string; away: string;
  isLive: boolean; minute?: number; score?: { h: number; a: number };
  time: string; markets: number;
  h: number; d: number; a: number;
}

const LEAGUES: { id: string; name: string; flag: string; matches: SoccerMatch[] }[] = [
  {
    id: 'pl', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    matches: [
      { id: 'm1',  league: 'Premier League', leagueFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Arsenal',   away: 'Chelsea',    isLive: true,  minute: 67, score: { h:2, a:1 }, time: '',           markets: 84,  h: 1.85, d: 3.40, a: 4.20 },
      { id: 'm2',  league: 'Premier League', leagueFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Man City',  away: 'Liverpool',  isLive: false,                               time: 'Tomorrow, 17:30', markets: 92,  h: 2.10, d: 3.25, a: 3.50 },
      { id: 'm3',  league: 'Premier League', leagueFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Tottenham', away: 'Aston Villa',isLive: false,                               time: 'Sun, 14:00',      markets: 76,  h: 2.45, d: 3.15, a: 2.80 },
    ],
  },
  {
    id: 'laliga', name: 'La Liga', flag: '🇪🇸',
    matches: [
      { id: 'm4',  league: 'La Liga', leagueFlag: '🇪🇸', home: 'Barcelona',      away: 'Real Madrid', isLive: true,  minute: 34, score: { h:1, a:1 }, time: '',           markets: 104, h: 2.20, d: 3.30, a: 3.10 },
      { id: 'm5',  league: 'La Liga', leagueFlag: '🇪🇸', home: 'Atletico Madrid', away: 'Sevilla',     isLive: false,                               time: 'Tomorrow, 19:00', markets: 71,  h: 1.70, d: 3.50, a: 5.00 },
    ],
  },
  {
    id: 'ucl', name: 'Champions League', flag: '🏆',
    matches: [
      { id: 'm6',  league: 'Champions League', leagueFlag: '🏆', home: 'PSG',        away: 'Bayern Munich', isLive: false, time: 'Wed, 20:00', markets: 112, h: 2.75, d: 3.20, a: 2.55 },
      { id: 'm7b', league: 'Champions League', leagueFlag: '🏆', home: 'Real Madrid', away: 'Man City',      isLive: false, time: 'Thu, 20:00', markets: 128, h: 2.40, d: 3.10, a: 2.95 },
    ],
  },
  {
    id: 'seriea', name: 'Serie A', flag: '🇮🇹',
    matches: [
      { id: 'sa1', league: 'Serie A', leagueFlag: '🇮🇹', home: 'Juventus', away: 'Napoli', isLive: true, minute: 78, score: { h:1, a:0 }, time: '', markets: 88, h: 1.90, d: 3.40, a: 4.00 },
      { id: 'sa2', league: 'Serie A', leagueFlag: '🇮🇹', home: 'Inter',    away: 'AS Roma', isLive: false,                               time: 'Tomorrow, 20:45', markets: 82, h: 1.75, d: 3.50, a: 4.50 },
    ],
  },
];

// ── Boost cards ────────────────────────────────────────────────────────────────

const BOOST_CARDS = [
  {
    label: 'ACCA BOOST', title: 'Arsenal Win & Both Teams to Score',
    selections: ['Arsenal to Win', 'Both Teams to Score — Yes', 'Arsenal: 2+ Goals'],
    odds: 4.50, boosted: 5.00, returnEx: '€10 returns €50',
  },
  {
    label: 'SUPER BOOST', title: 'El Clásico — Barcelona to Win & Messi to Score',
    selections: ['Barcelona to Win', 'Lewandowski to Score Anytime', 'Over 2.5 Goals'],
    odds: 6.00, boosted: 7.50, returnEx: '€10 returns €75',
    hot: 247,
  },
  {
    label: 'ACCA BOOST', title: 'PSG to Win & Both Strikers to Score',
    selections: ['PSG to Win vs Bayern', 'Dembélé to Score Anytime', 'Mbappé to Score Anytime'],
    odds: 8.00, boosted: 10.00, returnEx: '€10 returns €100',
  },
  {
    label: 'EARLY PAYOUT', title: 'Man City Win by 2+ Goals vs Liverpool',
    selections: ['Man City Win — Yes', 'Asian Handicap -1.5', 'Haaland 1+ Shot on Target'],
    odds: 3.20, boosted: 3.80, returnEx: '€10 returns €38',
    hot: 91,
  },
];

function BoostCard({ card }: { card: typeof BOOST_CARDS[0] }) {
  return (
    <div
      className="shrink-0 w-[252px] flex flex-col rounded-xl overflow-hidden cursor-pointer select-none"
      style={{
        background: 'linear-gradient(160deg,#18212B 0%,#121821 100%)',
        border: '1px solid #253241',
        transition: 'border-color 0.15s,box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'rgba(0,223,169,0.35)';
        el.style.boxShadow   = '0 0 20px rgba(0,223,169,0.08)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#253241';
        el.style.boxShadow   = '';
      }}
    >
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,#00DFA9,transparent)' }} />
      <div className="p-3.5 flex flex-col flex-1 gap-2">
        {/* Label row */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md flex items-center justify-center bg-[#00DFA9]/10 border border-[#00DFA9]/25 shrink-0">
            <Zap className="h-2.5 w-2.5 text-[#00DFA9]" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00DFA9]">{card.label}</span>
          {card.hot && (
            <span className="ml-auto text-[9px] font-bold text-[#F97316] bg-[#F97316]/10 border border-[#F97316]/20 px-1.5 py-0.5 rounded-full">
              🔥 {card.hot}
            </span>
          )}
        </div>
        {/* Title */}
        <h3 className="text-[12.5px] font-semibold text-[#F8FAFC] leading-snug line-clamp-2">{card.title}</h3>
        {/* Selections */}
        <div className="space-y-1.5 flex-1">
          {card.selections.map((sel, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-[#94A3B8] leading-snug">
              <span className="text-[10px] mt-0.5 shrink-0">⚽</span>
              <span className="line-clamp-1">{sel}</span>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="border-t border-[#253241] pt-2.5 flex items-end justify-between gap-2">
          <div>
            <span className="text-[10px] text-[#94A3B8]/60">{card.returnEx}</span>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-[#94A3B8]/60 mb-0.5 uppercase tracking-wide">Boosted</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[12px] text-[#94A3B8]/40 line-through tabular-nums font-bold">
                {card.odds.toFixed(2)}
              </span>
              <span className="text-[20px] font-black leading-none tabular-nums text-[#00DFA9]">
                {card.boosted.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Match row ──────────────────────────────────────────────────────────────────

function SoccerMatchRow({ match }: { match: SoccerMatch }) {
  const shared = {
    matchId:    match.id,
    marketId:   `soccer_1x2_${match.id}`,
    matchName:  `${match.home} v ${match.away}`,
    leagueName: match.league,
    marketName: 'Match Result',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#253241]/50 hover:bg-[#121821]/60 transition-colors cursor-pointer">
      {/* Live badge / time */}
      <div className="w-[52px] shrink-0 text-right">
        {match.isLive ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#EF4444] leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
              LIVE
            </span>
            <span className="text-[10px] text-[#EF4444]/70 font-semibold leading-none">{match.minute}'</span>
          </div>
        ) : (
          <span className="text-[10px] text-[#94A3B8]/50 font-medium leading-none">{match.time.split(',')[1]?.trim() ?? match.time}</span>
        )}
      </div>

      {/* Teams + score */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#F8FAFC] leading-none truncate">{match.home}</span>
          {match.isLive && match.score && (
            <span className="text-[12px] font-black text-[#EF4444] tabular-nums leading-none shrink-0">{match.score.h}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate">{match.away}</span>
          {match.isLive && match.score && (
            <span className="text-[12px] font-black text-[#EF4444] tabular-nums leading-none shrink-0">{match.score.a}</span>
          )}
        </div>
      </div>

      {/* Market count */}
      <span className="text-[10px] text-[#94A3B8]/30 font-medium tabular-nums hidden md:block shrink-0">
        +{match.markets}
      </span>

      {/* 1X2 odds */}
      <div className="flex items-center gap-1 shrink-0">
        <OddsButton {...shared} selectionType="1" selectionName={match.home} odds={match.h} />
        <OddsButton {...shared} selectionType="X" selectionName="Draw"       odds={match.d} />
        <OddsButton {...shared} selectionType="2" selectionName={match.away} odds={match.a} />
      </div>
    </div>
  );
}

// ── League group header ────────────────────────────────────────────────────────

function LeagueHeader({ flag, name }: { flag: string; name: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#121821]/80 border-b border-[#253241]/60">
      <div className="flex items-center gap-2">
        <span className="text-[13px] leading-none">{flag}</span>
        <span className="text-[11px] font-bold text-[#94A3B8]/70 uppercase tracking-wider">{name}</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]/40 font-semibold uppercase tracking-wide">
        <span className="hidden sm:inline">1</span>
        <span className="w-[52px] hidden sm:block text-center">X</span>
        <span className="w-[52px] hidden sm:block text-center">2</span>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function SoccerHighlights() {
  const [showAllLeagues, setShowAllLeagues] = useState(false);
  const visibleLeagues = showAllLeagues ? LEAGUES : LEAGUES.slice(0, 3);

  return (
    <div className="mb-5">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-[#00DFA9]/10 border border-[#00DFA9]/25 shrink-0">
            <span className="text-[13px] leading-none">⚽</span>
          </div>
          <span className="text-[13px] font-bold text-[#F8FAFC] uppercase tracking-wide">Soccer Highlights</span>
          <span className="text-[10px] font-semibold text-[#94A3B8]/40 uppercase tracking-widest hidden sm:block">
            · Premier League · La Liga · UCL · Serie A
          </span>
        </div>
        <button className="flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors shrink-0">
          All Soccer <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Boost cards ── */}
      <ScrollArea className="mb-4">
        <div className="flex gap-3 pb-2">
          {BOOST_CARDS.map((card, i) => <BoostCard key={i} card={card} />)}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* ── Match table ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid #253241', background: '#18212B' }}
      >
        {/* Column headers */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#253241] bg-[#0D1520]/60">
          <span className="text-[10px] font-bold text-[#94A3B8]/40 uppercase tracking-widest">Match</span>
          <div className="flex items-center gap-1 shrink-0">
            {['1','X','2'].map(h => (
              <div key={h} className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/40 uppercase tracking-widest">{h}</div>
            ))}
          </div>
        </div>

        {visibleLeagues.map(lg => (
          <div key={lg.id}>
            <LeagueHeader flag={lg.flag} name={lg.name} />
            {lg.matches.map(m => <SoccerMatchRow key={m.id} match={m} />)}
          </div>
        ))}

        {/* Show more */}
        {!showAllLeagues && (
          <button
            onClick={() => setShowAllLeagues(true)}
            className="w-full py-2.5 text-[11px] font-semibold text-[#38BDF8]/60 hover:text-[#38BDF8] hover:bg-[#121821]/50 transition-colors flex items-center justify-center gap-1"
          >
            Show Serie A <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
