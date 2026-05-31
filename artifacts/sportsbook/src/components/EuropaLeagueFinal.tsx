import { useState, useMemo } from 'react';
import { ChevronRight, Flame } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { OddsButton } from './OddsButton';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import {
  EUROPA_MATCHUP,
  EUROPA_BOOST_CARDS,
  getEuropaPlayerRows,
  SCF_JERSEY,
  AVL_JERSEY,
  type EuropaBoostCard,
  type EuropaMarket,
  type EuropaPlayerRow,
} from '../data/europaData';

const MID     = 'uel_scf_avl_final';
const LEAGUE  = 'UEFA Europa League Final';
const MATCH_NAME = 'SC Freiburg v Aston Villa';

// ── Jersey image with fallback ────────────────────────────────────────────────

function JerseyImg({
  url, number, color, size = 28, mirror = false,
}: { url: string; number: string; color: string; size?: number; mirror?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      {!failed ? (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          className="object-contain w-full h-full"
          style={mirror ? { transform: 'scaleX(-1)' } : undefined}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="w-full h-full rounded flex items-center justify-center font-black text-white"
          style={{ background: color, fontSize: size * 0.35 }}
        >
          {number}
        </div>
      )}
      {/* number overlay — only when image loads */}
      {!failed && (
        <span
          className="absolute bottom-0 right-0 font-black text-white leading-none select-none"
          style={{
            fontSize: size * 0.30,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            lineHeight: 1,
          }}
        >
          {number}
        </span>
      )}
    </div>
  );
}

// ── Team display (large) ──────────────────────────────────────────────────────

function TeamJersey({ url, color, size = 32, mirror = false }: { url: string; color: string; size?: number; mirror?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="rounded shrink-0" style={{ width: size, height: size, background: color }} />;
  }
  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="object-contain shrink-0"
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
      onError={() => setFailed(true)}
    />
  );
}

// ── Boost card ─────────────────────────────────────────────────────────────────

function BoostCard({ card }: { card: EuropaBoostCard }) {
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
        el.style.borderColor = 'rgba(250,204,21,0.30)';
        el.style.boxShadow   = '0 0 20px rgba(250,204,21,0.08)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#253241';
        el.style.boxShadow   = '';
      }}
    >
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,#FACC15,transparent)' }} />

      <div className="p-3.5 flex flex-col flex-1 gap-2">
        {/* Title + jersey icons */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-black text-[#F8FAFC] uppercase tracking-wide leading-tight flex-1">{card.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <TeamJersey url={SCF_JERSEY} color="#CC0000" size={16} />
            <TeamJersey url={AVL_JERSEY} color="#95BFE5" size={16} mirror />
          </div>
        </div>

        {/* Selections */}
        <div className="space-y-1.5 flex-1">
          {card.selections.map((sel, i) => (
            <div key={i} className="flex items-start gap-2">
              <TeamJersey
                url={sel.team === 'away' ? SCF_JERSEY : AVL_JERSEY}
                color={sel.team === 'away' ? '#CC0000' : '#95BFE5'}
                size={13}
                mirror={sel.team === 'home'}
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
          {card.popularity && (
            <>
              <Flame className="w-3 h-3 text-[#F97316]" />
              <span className="text-[10px] text-[#94A3B8]/60 tabular-nums font-medium">{card.popularity}</span>
            </>
          )}
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

// ── 1 X 2 match table ─────────────────────────────────────────────────────────

function MatchTable() {
  const { home, away, time, day, odds } = EUROPA_MATCHUP;
  const shared = { matchId: MID, matchName: MATCH_NAME, leagueName: LEAGUE, sportKey: 'soccer_uefa_europa_league' };

  return (
    <div className="rounded-xl overflow-hidden mb-4" style={{ background: '#0F1620', border: '1px solid #253241' }}>
      {/* Header badges */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#253241]">
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
          style={{ background: 'rgba(56,189,248,0.08)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
          EARLY PAYOUT
        </span>
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
          style={{ background: 'rgba(0,223,169,0.1)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.2)' }}>
          ACCA BOOST
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-[#94A3B8]/40 font-medium">{day}</span>
      </div>

      {/* Column headers */}
      <div className="grid px-4 py-1.5 border-b border-[#253241]/50 text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-wider"
        style={{ gridTemplateColumns: '1fr 52px 52px 52px 28px' }}>
        <span />
        <span className="text-center">1</span>
        <span className="text-center">X</span>
        <span className="text-center">2</span>
        <span />
      </div>

      {/* Away team row */}
      <div className="grid items-center px-4 py-2.5 border-b border-[#253241]/30 hover:bg-[#121821]/40 transition-colors"
        style={{ gridTemplateColumns: '1fr 52px 52px 52px 28px' }}>
        <div className="flex items-center gap-2 min-w-0">
          <TeamJersey url={away.jerseyUrl} color={away.color} size={22} />
          <span className="text-[13px] font-semibold text-[#F8FAFC] truncate">{away.name}</span>
        </div>
        <div /><div /><div /><div />
      </div>

      {/* Home team row + odds */}
      <div className="grid items-center px-4 py-2.5 hover:bg-[#121821]/40 transition-colors"
        style={{ gridTemplateColumns: '1fr 52px 52px 52px 28px' }}>
        <div className="flex items-center gap-2 min-w-0">
          <TeamJersey url={home.jerseyUrl} color={home.color} size={22} mirror />
          <span className="text-[13px] font-medium text-[#94A3B8] truncate">{home.name}</span>
        </div>
        <OddsButton {...shared} marketId={`${MID}_1x2`} marketName="Match Result"
          selectionType="1" selectionName={away.name} odds={odds.home} className="w-full" />
        <OddsButton {...shared} marketId={`${MID}_1x2`} marketName="Match Result"
          selectionType="X" selectionName="Draw" odds={odds.draw} className="w-full" />
        <OddsButton {...shared} marketId={`${MID}_1x2`} marketName="Match Result"
          selectionType="2" selectionName={home.name} odds={odds.away} className="w-full" />
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] text-[#94A3B8]/50 tabular-nums font-medium">{time}</span>
        </div>
      </div>
    </div>
  );
}

// ── Soccer player prop cell ───────────────────────────────────────────────────

function SoccerPropCell({
  col, player, market,
}: { col: { label: string; odds: number }; player: EuropaPlayerRow; market: EuropaMarket }) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const selType = `${player.name}_${market}_${col.label}`;
  const selId   = `${MID}_${market}-${selType}`;
  const active  = hasSelection(selId);

  function toggle() {
    if (active) removeSelection(selId);
    else addSelection({
      id: selId, marketId: `${MID}_${market}`,
      matchId: MID, matchName: MATCH_NAME, leagueName: LEAGUE,
      marketName: col.label, selectionType: selType,
      selectionName: `${player.name} — ${col.label}`,
      odds: col.odds,
      sportKey: 'soccer_uefa_europa_league',
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
      {col.odds.toFixed(2)}
    </button>
  );
}

// ── Player row ────────────────────────────────────────────────────────────────

function SoccerPlayerRow({ row, market, colHeaders }: { row: EuropaPlayerRow; market: EuropaMarket; colHeaders: string[] }) {
  const isAway  = row.team === 'away';
  const jerseyUrl = isAway ? SCF_JERSEY : AVL_JERSEY;
  const color     = isAway ? '#CC0000'  : '#95BFE5';

  return (
    <div className="flex items-center border-b border-[#1C2736] last:border-0 hover:bg-[#0B1220]/60 transition-colors">
      {/* Player info */}
      <div className="w-[200px] shrink-0 flex items-center gap-2.5 px-4 py-3 min-w-0">
        <JerseyImg url={jerseyUrl} number={row.number} color={color} size={28} mirror={!isAway} />
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-[#F8FAFC] leading-tight truncate">{row.name}</p>
          <p className="text-[10px] text-[#94A3B8]/45 font-medium mt-0.5 tabular-nums tracking-wide">
            {row.last5.join('  ')}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch bg-[#253241]/50 shrink-0" />

      {/* Market columns */}
      <div className="flex flex-1">
        {row.markets.map((col, i) => (
          <SoccerPropCell key={i} col={col} player={row} market={market} />
        ))}
      </div>
    </div>
  );
}

// ── BET BUILDER+ ──────────────────────────────────────────────────────────────

const MARKET_TABS: { id: EuropaMarket; label: string }[] = [
  { id: 'main',           label: 'Main'            },
  { id: 'shots_on_target', label: 'Shots on Target' },
  { id: 'shots',          label: 'Shots'           },
  { id: 'fouls',          label: 'Fouls'           },
  { id: 'tackles',        label: 'Tackles'         },
];

function BetBuilderPlus() {
  const [market, setMarket]   = useState<EuropaMarket>('main');
  const [showAll, setShowAll] = useState(false);

  const rows    = useMemo(() => getEuropaPlayerRows(market), [market]);
  const visible = showAll ? rows : rows.slice(0, 5);
  const colHeaders = rows[0]?.markets.map(m => m.label) ?? [];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0D1219', border: '1px solid #253241' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#253241]">
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-black tracking-wide" style={{ color: '#00DFA9' }}>BET BUILDER</span>
          <span className="text-[13px] font-black ml-0.5" style={{ color: '#00DFA9' }}>+</span>
        </div>
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#94A3B8]/60 hover:text-[#F8FAFC] transition-colors">
          Player Markets <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Match header */}
      <div className="flex items-center justify-center gap-4 py-3.5 border-b border-[#1C2736]">
        <div className="flex items-center gap-2">
          <TeamJersey url={SCF_JERSEY} color="#CC0000" size={26} />
          <span className="text-[13px] font-bold text-[#F8FAFC]">SC Freiburg</span>
        </div>
        <span className="text-[12px] font-black text-[#4B5C6B]">v</span>
        <div className="flex items-center gap-2">
          <TeamJersey url={AVL_JERSEY} color="#95BFE5" size={26} mirror />
          <span className="text-[13px] font-bold text-[#F8FAFC]">Aston Villa</span>
        </div>
      </div>
      <p className="text-center text-[10.5px] text-[#94A3B8]/50 py-1.5 border-b border-[#1C2736] font-medium">
        UEFA Europa League Wed 22:00
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
          {colHeaders.map(h => (
            <div key={h} className="flex-1 text-center py-1.5 text-[11px] font-bold text-[#94A3B8]/60">
              {h}
            </div>
          ))}
        </div>
      </div>

      {/* Player rows */}
      {visible.map(row => (
        <SoccerPlayerRow key={row.name} row={row} market={market} colHeaders={colHeaders} />
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

// ── Main export ───────────────────────────────────────────────────────────────

export function EuropaLeagueFinal() {
  return (
    <div className="mb-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base leading-none">🏆</span>
        <span className="text-[13px] font-bold text-[#F8FAFC]">UEFA Europa League Final</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#253241] to-transparent" />
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors shrink-0">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Boost cards */}
      <ScrollArea className="w-full mb-4">
        <div className="flex gap-3 pb-1 w-max">
          {EUROPA_BOOST_CARDS.map(card => (
            <BoostCard key={card.id} card={card} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {/* 1X2 match table */}
      <MatchTable />

      {/* BET BUILDER+ */}
      <BetBuilderPlus />
    </div>
  );
}
