import { useState, useMemo } from 'react';
import { ChevronRight, Eye } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { getDailyMatches, buildAccaCards } from '../data/tennisData';
import type { TennisMatch, AccaCard } from '../data/tennisData';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';

// ── Acca card ─────────────────────────────────────────────────────────────────

function AccaCardItem({ card, onBet }: { card: AccaCard; onBet: () => void }) {
  return (
    <div
      className="shrink-0 w-[280px] flex flex-col rounded-xl overflow-hidden cursor-pointer select-none"
      style={{
        background: 'linear-gradient(160deg, #141D2B 0%, #0F1720 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      onClick={onBet}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,223,169,0.25)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(0,223,169,0.08)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Title */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[13px] font-bold text-[#F8FAFC] leading-snug">{card.market}</p>
      </div>

      {/* Selections */}
      <div className="px-4 pb-3 flex flex-col gap-1.5 flex-1">
        {card.selections.map((sel, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-[11px] leading-none mt-0.5 shrink-0">🎾</span>
            <span className="text-[11px] text-[#CBD5E1] leading-snug">{sel}</span>
          </div>
        ))}
        {(card.extraLegs ?? 0) > 0 && (
          <button className="text-[11px] font-semibold text-[#00DFA9] hover:text-[#00DFA9]/80 text-left mt-0.5 transition-colors">
            View {card.extraLegs} more legs
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 border-t border-[#253241]/60 pt-3 mt-auto">
        {card.isSpecial ? (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#00DFA9] tracking-wide">{card.specialLabel}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[14px] text-[#94A3B8]/50 line-through tabular-nums">{card.odds.toFixed(2)}</span>
              <span className="text-[26px] font-black text-[#00DFA9] leading-none tabular-nums">
                {card.boostedOdds!.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black tracking-widest text-[#00DFA9] uppercase">{card.boostLabel}</span>
              <span className="text-[26px] font-black text-[#F8FAFC] leading-none tabular-nums">{card.odds.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-[#94A3B8]/50 leading-snug">{card.returnExample}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Match row ─────────────────────────────────────────────────────────────────

function MatchRow({ match }: { match: TennisMatch }) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();

  function toggleOdd(which: 1 | 2) {
    const id  = `tennis_${match.id}_${which}`;
    const odds = which === 1 ? match.odds1 : match.odds2;
    const name = which === 1 ? match.player1 : match.player2;
    if (hasSelection(id)) {
      removeSelection(id);
    } else {
      addSelection({
        id,
        marketId:      `tennis_${match.id}`,
        matchId:       match.id,
        matchName:     `${match.player1} v ${match.player2}`,
        leagueName:    match.tournament,
        marketName:    'To Win Match',
        selectionType: which === 1 ? '1' : '2',
        selectionName: name,
        odds,
      });
    }
  }

  const id1 = `tennis_${match.id}_1`;
  const id2 = `tennis_${match.id}_2`;

  return (
    <div
      className="grid items-center border-b border-[#1E2A38] hover:bg-[#121821]/50 transition-colors"
      style={{ gridTemplateColumns: '1fr auto auto auto' }}
    >
      {/* Players + time */}
      <div className="px-4 py-3 min-w-0">
        <p className="text-[13px] font-semibold text-[#F8FAFC] leading-snug truncate">{match.player1}</p>
        <p className="text-[13px] font-semibold text-[#F8FAFC] leading-snug truncate mt-0.5">{match.player2}</p>
        <p className="text-[10px] text-[#94A3B8]/50 mt-1 font-medium">{match.time}</p>
      </div>

      {/* Stats icon */}
      <div className="px-3 self-center">
        <Eye className="w-3.5 h-3.5 text-[#3E4C5E]" />
      </div>

      {/* Odds */}
      {([1, 2] as const).map(which => {
        const odds  = which === 1 ? match.odds1 : match.odds2;
        const selId = which === 1 ? id1 : id2;
        const active = hasSelection(selId);
        return (
          <button
            key={which}
            onClick={() => toggleOdd(which)}
            className={cn(
              'w-[72px] py-4 text-[13px] font-bold tabular-nums text-center transition-all duration-150 border-l border-[#1E2A38]',
              active
                ? 'bg-[#00DFA9]/12 text-[#00DFA9]'
                : 'text-[#FACC15] hover:bg-[#1E2A38] hover:text-[#FDE68A]'
            )}
          >
            {odds.toFixed(2)}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TennisHighlights() {
  const [showAll, setShowAll] = useState(false);

  const matches   = useMemo(() => getDailyMatches(), []);
  const accaCards = useMemo(() => buildAccaCards(matches), [matches]);

  const today     = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
  const visible   = showAll ? matches : matches.slice(0, 5);

  return (
    <div className="mb-5">
      {/* ── Highlights header ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">🎾</span>
          <span className="text-[14px] font-bold text-[#F8FAFC]">Highlights</span>
          <div className="w-px h-3 bg-[#253241]" />
          <span className="text-[11px] text-[#94A3B8]/50 font-medium">Tennis · {today}</span>
        </div>
        <button className="flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors">
          View All
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Acca boost cards ──────────────────────────────────── */}
      <ScrollArea className="w-full mb-4">
        <div className="flex gap-3 pb-1 w-max">
          {accaCards.map(card => (
            <AccaCardItem key={card.id} card={card} onBet={() => {}} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {/* ── Match table ───────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          border: '1px solid rgba(255,255,255,0.06)',
          background: '#0F1620',
        }}
      >
        {/* Table header */}
        <div
          className="grid items-center px-4 py-2"
          style={{ gridTemplateColumns: '1fr auto auto auto' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,223,169,0.12)', color: '#00DFA9' }}
            >
              ACCA BOOST
            </span>
            <span className="text-[10px] text-[#94A3B8]/50 font-medium">{today}</span>
          </div>
          <div className="w-[28px]" />
          {['1', '2'].map(h => (
            <div
              key={h}
              className="w-[72px] text-center text-[11px] font-bold text-[#94A3B8]/60 border-l border-[#1E2A38] py-1.5"
            >
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {visible.map(match => (
          <MatchRow key={match.id} match={match} />
        ))}

        {/* Show more */}
        {matches.length > 5 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full py-2.5 text-[12px] font-semibold text-[#94A3B8]/60 hover:text-[#F8FAFC] transition-colors flex items-center justify-center gap-1.5 border-t border-[#1E2A38]"
          >
            {showAll ? 'Show less' : `Show more (${matches.length - 5} more matches)`}
          </button>
        )}
      </div>
    </div>
  );
}
