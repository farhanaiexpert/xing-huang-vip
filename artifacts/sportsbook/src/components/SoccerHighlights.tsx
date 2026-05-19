import { useState, useMemo } from 'react';
import { ChevronRight, Flame } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { OddsButton } from './OddsButton';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import {
  ARS_JERSEY, CHE_JERSEY,
  SOCCER_BOOST_CARDS, SOCCER_MATCHES,
  getSoccerPlayerRows,
  type SoccerBoostCard, type SoccerMatchRow, type SoccerMarket,
} from '../data/soccerHighlightsData';

const BB_MID        = 'soc_ars_che_live';
const BB_LEAGUE     = 'Premier League';
const BB_MATCH_NAME = 'Arsenal v Chelsea';

// ── Shared jersey image ───────────────────────────────────────────────────────

function Jersey({
  url, color, size = 24, mirror = false,
}: { url: string; color: string; size?: number; mirror?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="rounded shrink-0"
        style={{ width: size, height: size, background: color }}
      />
    );
  }
  return (
    <img
      src={url} alt="" width={size} height={size}
      className="object-contain shrink-0"
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
      onError={() => setFailed(true)}
    />
  );
}

// ── Team colour badge (match table) ──────────────────────────────────────────

function TeamBadge({ abbr, color, size = 18 }: { abbr: string; color: string; size?: number }) {
  return (
    <div
      className="rounded flex items-center justify-center shrink-0 font-black text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {abbr.slice(0, 3)}
    </div>
  );
}

// ── Boost card ────────────────────────────────────────────────────────────────

function BoostCard({ card }: { card: SoccerBoostCard }) {
  return (
    <div
      className="shrink-0 w-[236px] flex flex-col rounded-xl overflow-hidden cursor-pointer select-none"
      style={{
        background: 'linear-gradient(160deg,#18212B 0%,#121821 100%)',
        border: '1px solid #253241',
        transition: 'border-color 0.15s,box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'rgba(0,223,169,0.35)';
        el.style.boxShadow   = '0 0 20px rgba(0,223,169,0.1)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#253241';
        el.style.boxShadow   = '';
      }}
    >
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,#00DFA9,transparent)' }} />

      <div className="p-3.5 flex flex-col flex-1 gap-2">
        <p className="text-[10.5px] font-black text-[#F8FAFC] uppercase tracking-wide leading-tight">
          {card.title}
        </p>

        <div className="space-y-1.5 flex-1">
          {card.selections.map((sel, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="mt-0.5 text-[10px]">
                {sel.team === 'home' ? '⚽' : '⚽'}
              </span>
              <span className="text-[10.5px] text-[#CBD5E1] leading-snug">{sel.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 pt-1 border-t border-[#253241]">
          <span className="text-[10px] font-black text-[#00DFA9] tracking-wide">BET BOOST</span>
          <ChevronRight className="w-3 h-3 text-[#00DFA9]" />
          <div className="flex-1" />
          {card.popularity && (
            <>
              <Flame className="w-3 h-3 text-[#F97316]" />
              <span className="text-[10px] text-[#94A3B8]/60 tabular-nums font-medium">
                {card.popularity}
              </span>
            </>
          )}
        </div>

        <div className="flex items-end justify-between">
          <p className="text-[9.5px] text-[#94A3B8]/40 leading-snug">{card.returnExample}</p>
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="text-[12px] text-[#94A3B8]/40 line-through tabular-nums font-bold">
              {card.originalOdds.toFixed(2)}
            </span>
            <span className="text-[11px] text-[#94A3B8]/60 font-bold">»</span>
            <span className="text-[20px] font-black leading-none tabular-nums text-[#00DFA9]">
              {card.boostedOdds.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Match row (1X2) ───────────────────────────────────────────────────────────

function MatchRow({ match }: { match: SoccerMatchRow }) {
  const shared = {
    matchId: match.id, marketId: `${match.id}_1x2`,
    matchName: `${match.home} v ${match.away}`, leagueName: 'Soccer Highlights',
    marketName: 'Match Result',
  };

  return (
    <div
      className="grid items-center px-3 py-2.5 border-b border-[#253241]/40 hover:bg-[#121821]/50 transition-colors last:border-0"
      style={{ gridTemplateColumns: '1fr auto 52px 52px 52px 36px' }}
    >
      {/* Teams */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <TeamBadge abbr={match.homeAbbr} color={match.homeClr} size={16} />
          <span className="text-[12.5px] font-semibold text-[#F8FAFC] truncate leading-none">
            {match.home}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TeamBadge abbr={match.awayAbbr} color={match.awayClr} size={16} />
          <span className="text-[12.5px] font-medium text-[#94A3B8] truncate leading-none hover:text-[#F8FAFC] transition-colors">
            {match.away}
          </span>
        </div>
      </div>

      {/* Time / score */}
      <div className="flex flex-col items-end gap-1 mr-2 shrink-0">
        {match.isLive ? (
          <>
            <span className="text-[9px] font-black text-[#EF4444] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              LIVE {match.minute}'
            </span>
            {match.score && (
              <span className="text-[12px] font-black text-[#F8FAFC] tabular-nums">
                {match.score.home} – {match.score.away}
              </span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-[#94A3B8]/50 font-medium whitespace-nowrap">
            {match.time}
          </span>
        )}
      </div>

      {/* Odds */}
      <OddsButton {...shared} selectionType="1" selectionName={match.home} odds={match.odds.h} className="w-full" />
      <OddsButton {...shared} selectionType="X" selectionName="Draw"       odds={match.odds.d} className="w-full" />
      <OddsButton {...shared} selectionType="2" selectionName={match.away} odds={match.odds.a} className="w-full" />

      {/* Market count */}
      <div className="text-right">
        <span className="text-[10px] text-[#94A3B8]/35 font-medium tabular-nums">+{match.markets}</span>
      </div>
    </div>
  );
}

// ── BetBuilder+ ───────────────────────────────────────────────────────────────

function PropCell({
  col, playerName, market,
}: { col: { label: string; odds: number }; playerName: string; market: SoccerMarket }) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const selType = `${playerName}_${market}_${col.label}`;
  const selId   = `${BB_MID}_${selType}`;
  const active  = hasSelection(selId);

  function toggle() {
    if (active) removeSelection(selId);
    else addSelection({
      id: selId, marketId: `${BB_MID}_${market}`,
      matchId: BB_MID, matchName: BB_MATCH_NAME, leagueName: BB_LEAGUE,
      marketName: col.label, selectionType: selType,
      selectionName: `${playerName} — ${col.label}`,
      odds: col.odds,
    });
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex-1 py-2 text-center tabular-nums font-bold text-[13px] transition-all duration-150 rounded select-none',
        active
          ? 'text-[#00DFA9] bg-[#00DFA9]/10'
          : 'text-[#FACC15] hover:text-[#FDE68A] hover:bg-[#FACC15]/5',
      )}
    >
      {col.odds.toFixed(2)}
    </button>
  );
}

function PlayerRow({
  row, market, colHeaders,
}: { row: ReturnType<typeof getSoccerPlayerRows>[number]; market: SoccerMarket; colHeaders: string[] }) {
  const isHome   = row.team === 'home';
  const jerseyUrl = isHome ? ARS_JERSEY : CHE_JERSEY;
  const color     = isHome ? '#EF0107' : '#034694';

  return (
    <div className="flex items-center border-b border-[#1C2736] last:border-0 hover:bg-[#0B1220]/60 transition-colors">
      <div className="w-[200px] shrink-0 flex items-center gap-2.5 px-4 py-3 min-w-0">
        <Jersey url={jerseyUrl} color={color} size={26} mirror={!isHome} />
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-[#F8FAFC] leading-tight truncate">{row.name}</p>
          <p className="text-[10px] text-[#94A3B8]/45 font-medium mt-0.5 tabular-nums tracking-wide">
            {row.last5.join('  ')}
          </p>
        </div>
      </div>
      <div className="w-px self-stretch bg-[#253241]/50 shrink-0" />
      <div className="flex flex-1">
        {row.markets.map((col, i) => (
          <PropCell key={i} col={col} playerName={row.name} market={market} />
        ))}
      </div>
    </div>
  );
}

const MARKET_TABS: { id: SoccerMarket; label: string }[] = [
  { id: 'goals',   label: 'Goals'   },
  { id: 'assists', label: 'Assists' },
  { id: 'cards',   label: 'Cards'   },
  { id: 'corners', label: 'Corners' },
];

function BetBuilderPlus() {
  const [market, setMarket]   = useState<SoccerMarket>('goals');
  const [showAll, setShowAll] = useState(false);
  const rows       = useMemo(() => getSoccerPlayerRows(market), [market]);
  const visible    = showAll ? rows : rows.slice(0, 5);
  const colHeaders = rows[0]?.markets.map(m => m.label) ?? [];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0D1219', border: '1px solid #253241' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#253241]">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-black tracking-wide text-[#00DFA9]">BET BUILDER</span>
          <span className="text-[13px] font-black ml-0.5 text-[#00DFA9]">+</span>
        </div>
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#94A3B8]/60 hover:text-[#F8FAFC] transition-colors">
          Player Markets <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Match header */}
      <div className="flex items-center justify-center gap-4 py-3.5 border-b border-[#1C2736]">
        <div className="flex items-center gap-2">
          <Jersey url={ARS_JERSEY} color="#EF0107" size={26} />
          <span className="text-[13px] font-bold text-[#F8FAFC]">Arsenal</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[12px] font-black text-[#4B5C6B]">v</span>
          <span
            className="text-[8px] font-black px-1.5 py-0.5 rounded tabular-nums"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            LIVE 67'
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#F8FAFC]">Chelsea</span>
          <Jersey url={CHE_JERSEY} color="#034694" size={26} mirror />
        </div>
      </div>
      <p className="text-center text-[10.5px] text-[#94A3B8]/50 py-1.5 border-b border-[#1C2736] font-medium">
        Premier League · 2 – 1 · Anfield Road
      </p>

      {/* Market tabs */}
      <div className="flex border-b border-[#1C2736] bg-[#0B1017] overflow-x-auto">
        {MARKET_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setMarket(tab.id); setShowAll(false); }}
            className={cn(
              'px-4 py-2.5 text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0',
              market === tab.id
                ? 'text-[#F8FAFC] border-b-2 border-[#F8FAFC] -mb-px'
                : 'text-[#94A3B8]/60 hover:text-[#F8FAFC]',
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
          {colHeaders.map(h => (
            <div key={h} className="flex-1 text-center py-1.5 text-[11px] font-bold text-[#94A3B8]/60">{h}</div>
          ))}
        </div>
      </div>

      {/* Rows */}
      {visible.map(row => (
        <PlayerRow key={row.name} row={row} market={market} colHeaders={colHeaders} />
      ))}

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

// ── Main export ───────────────────────────────────────────────────────────────

export function SoccerHighlights() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? SOCCER_MATCHES : SOCCER_MATCHES.slice(0, 4);

  return (
    <div className="mb-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base leading-none">⚽</span>
        <span className="text-[13px] font-bold text-[#F8FAFC]">Soccer Highlights</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#253241] to-transparent" />
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors shrink-0">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Boost cards */}
      <ScrollArea className="w-full mb-4">
        <div className="flex gap-3 pb-1 w-max">
          {SOCCER_BOOST_CARDS.map(card => (
            <BoostCard key={card.id} card={card} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {/* Match table */}
      <div className="rounded-xl overflow-hidden mb-4" style={{ background: '#0F1620', border: '1px solid #253241' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#253241]">
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
            style={{ background: 'rgba(56,189,248,0.08)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            EARLY PAYOUT
          </span>
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
            style={{ background: 'rgba(0,223,169,0.10)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.2)' }}
          >
            ACCA BOOST
          </span>
          <div className="flex-1" />

          {/* Column labels */}
          <div className="flex items-center gap-1.5 shrink-0 mr-8">
            {['1', 'X', '2'].map(h => (
              <div key={h} className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-wider">
                {h}
              </div>
            ))}
          </div>
        </div>

        {visible.map(match => (
          <MatchRow key={match.id} match={match} />
        ))}

        {SOCCER_MATCHES.length > 4 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full py-2.5 text-[11px] font-semibold text-[#94A3B8]/50 hover:text-[#F8FAFC] transition-colors border-t border-[#253241]/60"
          >
            {showAll ? 'Show less ↑' : `Show more (${SOCCER_MATCHES.length - 4} more) ↓`}
          </button>
        )}
      </div>

      {/* BetBuilder+ */}
      <BetBuilderPlus />
    </div>
  );
}
