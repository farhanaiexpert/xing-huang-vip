import { useState, useMemo } from 'react';
import { ChevronRight, Flame, BarChart2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import {
  generateNbaMatchup,
  generateBoostCards,
  generatePlayerProps,
  type NbaBoostCard,
  type NbaMatchup,
  type NbaMarket,
  type PlayerPropRow,
} from '../data/nbaData';

const NBA_CDN = 'https://content001.bet365.com/SoccerSilks/';

// ── Team icon with fallback ───────────────────────────────────────────────────

function TeamIcon({
  iconUrl, abbr, color, size = 24,
}: { iconUrl: string; abbr: string; color: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="rounded flex items-center justify-center shrink-0 font-black text-white"
        style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      >
        {abbr.slice(0, 3)}
      </div>
    );
  }
  return (
    <img
      src={iconUrl}
      alt={abbr}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

// ── Boost card ─────────────────────────────────────────────────────────────────

function BoostCard({ card, matchup }: { card: NbaBoostCard; matchup: NbaMatchup }) {
  return (
    <div
      className="shrink-0 w-[236px] flex flex-col rounded-xl overflow-hidden cursor-pointer select-none group"
      style={{
        background: 'linear-gradient(160deg,#18212B 0%,#121821 100%)',
        border: '1px solid #253241',
        transition: 'border-color 0.15s,box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'rgba(250,204,21,0.30)';
        el.style.boxShadow   = '0 0 20px rgba(250,204,21,0.08)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#253241';
        el.style.boxShadow   = '';
      }}
    >
      {/* Top accent */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,#FACC15,transparent)' }} />

      <div className="p-3.5 flex flex-col flex-1 gap-2">
        {/* Title + matchup */}
        <div>
          <p className="text-[11px] font-black text-[#F8FAFC] uppercase tracking-wide leading-tight">{card.title}</p>
          <p className="text-[10px] text-[#94A3B8]/60 mt-0.5 font-medium">{card.matchup}</p>
        </div>

        {/* Selections */}
        <div className="space-y-1.5 flex-1">
          {card.selections.map((sel, i) => (
            <div key={i} className="flex items-start gap-2">
              <TeamIcon
                iconUrl={`${NBA_CDN}${sel.teamAbbr === matchup.away.abbr ? matchup.away.iconUrl.split('/').pop()! : matchup.home.iconUrl.split('/').pop()!}`}
                abbr={sel.teamAbbr}
                color={sel.teamAbbr === matchup.away.abbr ? matchup.away.color : matchup.home.color}
                size={14}
              />
              <span className="text-[10.5px] text-[#CBD5E1] leading-snug">{sel.label}</span>
            </div>
          ))}
        </div>

        {/* BET BOOST row */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#253241]">
          <span className="text-[10px] font-black text-[#FACC15] tracking-wide">BET BOOST</span>
          <ChevronRight className="w-3 h-3 text-[#FACC15]" />
          <div className="flex-1" />
          <Flame className="w-3 h-3 text-[#F97316]" />
          <span className="text-[10px] text-[#94A3B8]/60 tabular-nums font-medium">{card.popularity}</span>
        </div>

        {/* Odds */}
        <div className="flex items-end justify-between">
          <p className="text-[9.5px] text-[#94A3B8]/40 leading-snug">{card.returnExample}</p>
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="text-[12px] text-[#94A3B8]/40 line-through tabular-nums font-bold">
              {card.originalOdds.toFixed(2)}
            </span>
            <span className="text-[11px] text-[#94A3B8]/60 font-bold">»</span>
            <span className="text-[20px] font-black leading-none tabular-nums text-[#FACC15]">
              {card.boostedOdds.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Spread / Total / Money Line odds cell ─────────────────────────────────────

function OddsCell({
  matchId, marketId, matchName, leagueName, marketName,
  selectionType, selectionName, odds, label,
}: {
  matchId: string; marketId: string; matchName: string; leagueName: string;
  marketName: string; selectionType: string; selectionName: string; odds: number;
  label?: string;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const selId   = `${marketId}-${selectionType}`;
  const active  = hasSelection(selId);

  function toggle() {
    if (active) removeSelection(selId);
    else addSelection({ id: selId, marketId, matchId, matchName, leagueName, marketName, selectionType, selectionName, odds });
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex flex-col items-center justify-center py-2.5 px-2 rounded-lg transition-all duration-150 min-w-[64px]',
        active
          ? 'bg-[#00DFA9] text-[#0B0F14] shadow-[0_0_16px_rgba(0,223,169,0.4)]'
          : 'bg-[#0B1220] border border-[#2A3A52] text-[#FACC15] hover:bg-[#18212B] hover:border-[#38BDF8]/40'
      )}
    >
      {label && (
        <span className={cn('text-[10px] font-bold leading-none mb-0.5', active ? 'text-[#0B0F14]/70' : 'text-[#94A3B8]/60')}>
          {label}
        </span>
      )}
      <span className="text-[13px] font-bold tabular-nums leading-none">{odds.toFixed(2)}</span>
    </button>
  );
}

// ── Match table (Spread / Total / Money Line) ─────────────────────────────────

function MatchTable({ matchup }: { matchup: NbaMatchup }) {
  const mid = matchup.id;
  const matchName = `${matchup.away.name} @ ${matchup.home.name}`;
  const league    = 'NBA Play-Offs';

  const shared = { matchId: mid, matchName, leagueName: league };

  // Spread label strings
  const homeSpreadLabel = matchup.spread.line > 0 ? `+${matchup.spread.line}` : `-${matchup.spread.line}`;
  const awaySpreadLabel = matchup.spread.line > 0 ? `-${matchup.spread.line}` : `+${matchup.spread.line}`;

  return (
    <div className="rounded-xl overflow-hidden mb-4" style={{ background: '#0F1620', border: '1px solid #253241' }}>
      {/* Header badges */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#253241]">
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
          style={{ background: 'rgba(0,223,169,0.1)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.2)' }}>
          ACCA BOOST
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
          style={{ background: 'rgba(56,189,248,0.08)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
          EARLY PAYOUT
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-[#94A3B8]/40 font-medium">{matchup.day}</span>
      </div>

      {/* Column headers */}
      <div className="grid px-4 py-1.5 border-b border-[#253241]/50 text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-wider"
        style={{ gridTemplateColumns: '1fr 80px 100px 90px 28px' }}>
        <span />
        <span className="text-center">Spread</span>
        <span className="text-center">Total</span>
        <span className="text-center">Money Line</span>
        <span />
      </div>

      {/* Away team row */}
      <div className="grid items-center px-4 py-2.5 border-b border-[#253241]/40 hover:bg-[#121821]/40 transition-colors"
        style={{ gridTemplateColumns: '1fr 80px 100px 90px 28px' }}>
        <div className="flex items-center gap-2 min-w-0">
          <TeamIcon iconUrl={matchup.away.iconUrl} abbr={matchup.away.abbr} color={matchup.away.color} size={22} />
          <span className="text-[13px] font-semibold text-[#F8FAFC] truncate">{matchup.away.name}</span>
        </div>
        {/* Spread */}
        <div className="flex justify-center">
          <OddsCell {...shared} marketId={`${mid}_spread`} marketName="Spread" selectionType="away_spread"
            selectionName={`${matchup.away.name} ${awaySpreadLabel}`} odds={matchup.spread.awayOdds} label={awaySpreadLabel} />
        </div>
        {/* Total */}
        <div className="flex justify-center">
          <OddsCell {...shared} marketId={`${mid}_total`} marketName="Total" selectionType="over"
            selectionName={`Over ${matchup.total.line}`} odds={matchup.total.overOdds} label={`O ${matchup.total.line}`} />
        </div>
        {/* ML */}
        <div className="flex justify-center">
          <OddsCell {...shared} marketId={`${mid}_ml`} marketName="Money Line" selectionType="away_ml"
            selectionName={matchup.away.name} odds={matchup.moneyLine.awayOdds} />
        </div>
        <div />
      </div>

      {/* Home team row */}
      <div className="grid items-center px-4 py-2.5 hover:bg-[#121821]/40 transition-colors"
        style={{ gridTemplateColumns: '1fr 80px 100px 90px 28px' }}>
        <div className="flex items-center gap-2 min-w-0">
          <TeamIcon iconUrl={matchup.home.iconUrl} abbr={matchup.home.abbr} color={matchup.home.color} size={22} />
          <span className="text-[13px] font-medium text-[#94A3B8] truncate">{matchup.home.name}</span>
        </div>
        {/* Spread */}
        <div className="flex justify-center">
          <OddsCell {...shared} marketId={`${mid}_spread`} marketName="Spread" selectionType="home_spread"
            selectionName={`${matchup.home.name} ${homeSpreadLabel}`} odds={matchup.spread.homeOdds} label={homeSpreadLabel} />
        </div>
        {/* Total */}
        <div className="flex justify-center">
          <OddsCell {...shared} marketId={`${mid}_total`} marketName="Total" selectionType="under"
            selectionName={`Under ${matchup.total.line}`} odds={matchup.total.underOdds} label={`U ${matchup.total.line}`} />
        </div>
        {/* ML */}
        <div className="flex justify-center">
          <OddsCell {...shared} marketId={`${mid}_ml`} marketName="Money Line" selectionType="home_ml"
            selectionName={matchup.home.name} odds={matchup.moneyLine.homeOdds} />
        </div>
        {/* Time */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-[#94A3B8]/50 tabular-nums font-medium whitespace-nowrap">{matchup.time}</span>
          <BarChart2 className="w-3 h-3 text-[#3E4C5E]" />
        </div>
      </div>
    </div>
  );
}

// ── Jersey number badge ───────────────────────────────────────────────────────

function JerseyBadge({ number, color }: { number: string; color: string }) {
  return (
    <div
      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-black text-white select-none"
      style={{ background: color, fontSize: number.length > 2 ? '8px' : '10px', letterSpacing: '-0.5px' }}
    >
      {number}
    </div>
  );
}

// ── Inline odds cell (plain text style, no button border) ─────────────────────

function PropCell({
  matchId, marketId, matchName, leagueName, market, row, threshold,
}: {
  matchId: string; marketId: string; matchName: string; leagueName: string;
  market: NbaMarket; row: PlayerPropRow; threshold: { value: number; odds: number };
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const selType  = `${row.player.name}_${market}_${threshold.value}`;
  const selId    = `${marketId}-${selType}`;
  const active   = hasSelection(selId);
  const mktLabel = market === 'points'   ? 'Points'
                 : market === 'assists'  ? 'Assists'
                 : market === 'rebounds' ? 'Rebounds'
                 : 'Threes Made';

  function toggle() {
    if (active) removeSelection(selId);
    else addSelection({
      id: selId, marketId, matchId, matchName, leagueName,
      marketName:    `Player ${mktLabel}`,
      selectionType: selType,
      selectionName: `${row.player.name} ${threshold.value}+ ${mktLabel}`,
      odds:          threshold.odds,
    });
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex-1 py-2 text-center tabular-nums font-bold text-[13px] transition-all duration-150 rounded select-none',
        active
          ? 'text-[#00DFA9] bg-[#00DFA9]/10'
          : 'text-[#FACC15] hover:text-[#FDE68A] hover:bg-[#FACC15]/5'
      )}
    >
      {threshold.odds.toFixed(2)}
    </button>
  );
}

// ── Player row ────────────────────────────────────────────────────────────────

function PlayerPropRowItem({ row, matchup, market }: { row: PlayerPropRow; matchup: NbaMatchup; market: NbaMarket }) {
  const mid       = matchup.id;
  const matchName = `${matchup.away.name} @ ${matchup.home.name}`;
  const teamColor = row.player.team === 'away' ? matchup.away.color : matchup.home.color;

  return (
    <div className="flex items-center border-b border-[#1C2736] last:border-0 hover:bg-[#0B1220]/60 transition-colors group">
      {/* Player info */}
      <div className="w-[200px] shrink-0 flex items-center gap-2.5 px-4 py-3 min-w-0">
        <JerseyBadge number={row.player.number} color={teamColor} />
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-[#F8FAFC] leading-tight truncate">{row.player.name}</p>
          <p className="text-[10px] text-[#94A3B8]/45 font-medium mt-0.5 tabular-nums tracking-wide">
            {row.last5.map(v => Math.round(v)).join('  ')}
          </p>
        </div>
      </div>

      {/* Vertical divider */}
      <div className="w-px self-stretch bg-[#253241]/50 shrink-0" />

      {/* Odds columns */}
      <div className="flex flex-1">
        {row.thresholds.map(t => (
          <PropCell
            key={t.value}
            matchId={mid}
            marketId={`${mid}_${market}_${row.player.name}`}
            matchName={matchName}
            leagueName="NBA Play-Offs"
            market={market}
            row={row}
            threshold={t}
          />
        ))}
      </div>
    </div>
  );
}

// ── BET BUILDER+ section ──────────────────────────────────────────────────────

const MARKET_TABS: { id: NbaMarket; label: string }[] = [
  { id: 'points',   label: 'Points'      },
  { id: 'assists',  label: 'Assists'     },
  { id: 'rebounds', label: 'Rebounds'    },
  { id: 'threes',   label: 'Threes Made' },
];

function BetBuilderPlus({ matchup }: { matchup: NbaMatchup }) {
  const [market, setMarket]   = useState<NbaMarket>('points');
  const [showAll, setShowAll] = useState(false);

  const rows    = useMemo(() => generatePlayerProps(matchup, market), [matchup, market]);
  const visible = showAll ? rows : rows.slice(0, 5);
  const headers = rows[0]?.thresholds.map(t => t.value) ?? [];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0D1219', border: '1px solid #253241' }}>

      {/* Top bar: BET BUILDER + / Player Markets */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#253241]">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-black tracking-wide" style={{ color: '#00DFA9' }}>BET BUILDER</span>
          <span className="text-[13px] font-black ml-0.5" style={{ color: '#00DFA9' }}>+</span>
        </div>
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#94A3B8]/60 hover:text-[#F8FAFC] transition-colors">
          Player Markets
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Match header */}
      <div className="flex items-center justify-center gap-4 py-3.5 border-b border-[#1C2736]">
        <div className="flex items-center gap-2">
          <TeamIcon iconUrl={matchup.away.iconUrl} abbr={matchup.away.abbr} color={matchup.away.color} size={26} />
          <span className="text-[13px] font-bold text-[#F8FAFC]">{matchup.away.name}</span>
        </div>
        <span className="text-[12px] font-black text-[#4B5C6B]">@</span>
        <div className="flex items-center gap-2">
          <TeamIcon iconUrl={matchup.home.iconUrl} abbr={matchup.home.abbr} color={matchup.home.color} size={26} />
          <span className="text-[13px] font-bold text-[#F8FAFC]">{matchup.home.name}</span>
        </div>
      </div>

      {/* Sub-title */}
      <p className="text-center text-[10.5px] text-[#94A3B8]/50 py-1.5 border-b border-[#1C2736] font-medium">
        NBA {matchup.day.split(',')[0]} {matchup.time}
      </p>

      {/* Market tabs */}
      <div className="flex border-b border-[#1C2736] bg-[#0B1017]">
        {MARKET_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setMarket(tab.id); setShowAll(false); }}
            className={cn(
              'px-4 py-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap',
              market === tab.id
                ? 'text-[#F8FAFC] border-b-2 border-[#F8FAFC] -mb-px'
                : 'text-[#94A3B8]/60 hover:text-[#F8FAFC]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center border-b border-[#1C2736] bg-[#0B1017]">
        <div className="w-[200px] shrink-0 px-4 py-1.5">
          <span className="text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-wider">Player / Last 5</span>
        </div>
        <div className="w-px self-stretch bg-[#253241]/50 shrink-0" />
        <div className="flex flex-1">
          {headers.map(h => (
            <div key={h} className="flex-1 text-center py-1.5 text-[11px] font-bold text-[#94A3B8]/60 tabular-nums">
              {h}
            </div>
          ))}
        </div>
      </div>

      {/* Player rows */}
      {visible.map(row => (
        <PlayerPropRowItem key={row.player.name} row={row} matchup={matchup} market={market} />
      ))}

      {/* Show more */}
      {rows.length > 5 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full py-2.5 text-[12px] font-semibold text-[#94A3B8]/50 hover:text-[#F8FAFC] transition-colors border-t border-[#1C2736] flex items-center justify-center gap-1"
        >
          {showAll ? 'Show less' : 'Show more'}
          <span className="text-[10px]">{showAll ? '↑' : '↓'}</span>
        </button>
      )}
    </div>
  );
}

// ── Main exported section ─────────────────────────────────────────────────────

export function NBAHighlights() {
  const matchup    = useMemo(() => generateNbaMatchup(), []);
  const boostCards = useMemo(() => generateBoostCards(matchup), [matchup]);

  return (
    <div className="mb-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base leading-none">🏀</span>
        <span className="text-[13px] font-bold text-[#F8FAFC]">NBA Play-Offs</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#253241] to-transparent" />
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors shrink-0">
          View All
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Boost cards */}
      <ScrollArea className="w-full mb-4">
        <div className="flex gap-3 pb-1 w-max">
          {boostCards.map(card => (
            <BoostCard key={card.id} card={card} matchup={matchup} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {/* Match table */}
      <MatchTable matchup={matchup} />

      {/* BET BUILDER+ */}
      <BetBuilderPlus matchup={matchup} />
    </div>
  );
}
