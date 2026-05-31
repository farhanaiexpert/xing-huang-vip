import { useState, useMemo } from 'react';
import { ChevronRight, Zap } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { OddsButton } from './OddsButton';
import { getDailyMatches, buildAccaCards } from '../data/tennisData';
import type { TennisMatch, AccaCard } from '../data/tennisData';

// ── Acca Boost card — styled like FeaturedCards ────────────────────────────────

function AccaCardItem({ card }: { card: AccaCard }) {
  const isSpecial = card.isSpecial;

  return (
    <div
      className="shrink-0 w-[272px] flex flex-col rounded-xl overflow-hidden cursor-pointer select-none group"
      style={{
        background: 'linear-gradient(160deg, #18212B 0%, #121821 100%)',
        border: '1px solid #253241',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'rgba(0,223,169,0.35)';
        el.style.boxShadow   = '0 0 24px rgba(0,223,169,0.1)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#253241';
        el.style.boxShadow   = '';
      }}
    >
      {/* Top accent stripe */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg,#00DFA9,transparent)' }} />

      <div className="p-4 flex flex-col flex-1">
        {/* Badge row */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-[#00DFA9]/10 border border-[#00DFA9]/25">
            <Zap className="h-2.5 w-2.5 text-[#00DFA9]" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00DFA9]">
            {card.boostLabel}
          </span>
        </div>

        {/* Market title */}
        <h3 className="text-[13px] font-semibold text-[#F8FAFC] leading-snug mb-3 line-clamp-2">
          {card.market}
        </h3>

        {/* Selections */}
        <div className="space-y-1.5 mb-4 flex-1">
          {card.selections.map((sel, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-[#94A3B8] leading-snug">
              <img
                src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/tennis-balls.png"
                alt=""
                className="w-3.5 h-3.5 shrink-0 mt-0.5 object-contain"
              />
              <span className="line-clamp-2">{sel}</span>
            </div>
          ))}
          {(card.extraLegs ?? 0) > 0 && (
            <span className="text-[11px] font-semibold text-[#38BDF8] block mt-0.5">
              View {card.extraLegs} more legs
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#253241] pt-3 flex items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            {card.returnExample && (
              <span className="text-[10px] text-[#94A3B8]/60 leading-tight">{card.returnExample}</span>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-[#94A3B8]/60 mb-0.5 uppercase tracking-wide">
              {isSpecial ? 'Boosted' : 'Odds'}
            </div>
            {isSpecial ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[14px] text-[#94A3B8]/40 line-through tabular-nums font-bold">
                  {card.odds.toFixed(2)}
                </span>
                <span className="text-[22px] font-black leading-none tabular-nums text-[#00DFA9]">
                  {card.boostedOdds!.toFixed(2)}
                </span>
              </div>
            ) : (
              <span className="text-[22px] font-black leading-none tabular-nums text-[#FACC15]">
                {card.odds.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tennis match row — mirrors MatchRow layout ─────────────────────────────────

function TennisMatchRow({ match }: { match: TennisMatch }) {
  const sharedProps = {
    matchId:   match.id,
    marketId:  `tennis_market_${match.id}`,
    matchName: `${match.player1} v ${match.player2}`,
    leagueName: match.tournament,
    marketName: 'To Win Match',
    sportKey:  'tennis_atp_wimbledon',
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[#253241]/50 hover:bg-[#121821]/60 transition-colors group cursor-pointer">
      {/* Players + time */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-[13px] font-medium text-[#F8FAFC] leading-none truncate">{match.player1}</span>
        <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate group-hover:text-[#F8FAFC] transition-colors">{match.player2}</span>
        <span className="text-[10px] text-[#94A3B8]/40 font-medium mt-0.5">{match.time}</span>
      </div>

      {/* Market count placeholder */}
      <span className="text-[10px] text-[#94A3B8]/30 font-medium tabular-nums hidden md:block shrink-0">
        +12
      </span>

      {/* Odds buttons — exact same component as the rest of the app */}
      <div className="flex items-center gap-1.5 shrink-0">
        <OddsButton
          {...sharedProps}
          selectionType="1"
          selectionName={match.player1}
          odds={match.odds1}
        />
        <OddsButton
          {...sharedProps}
          selectionType="2"
          selectionName={match.player2}
          odds={match.odds2}
        />
        <div className="w-3" />
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function TennisHighlights() {
  const [showAll, setShowAll] = useState(false);

  const matches   = useMemo(() => getDailyMatches(), []);
  const accaCards = useMemo(() => buildAccaCards(matches), [matches]);

  const today   = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
  const visible = showAll ? matches : matches.slice(0, 5);

  return (
    <div className="mb-5">

      {/* ── Section header ──────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base leading-none">🎾</span>
        <span className="text-[13px] font-bold text-[#F8FAFC]">Tennis Highlights</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#253241] to-transparent" />
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors shrink-0">
          View All
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Acca boost cards ────────────────────────────────── */}
      <ScrollArea className="w-full mb-4">
        <div className="flex gap-3 pb-1 w-max">
          {accaCards.map(card => (
            <AccaCardItem key={card.id} card={card} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {/* ── Match table ─────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: '#0F1620',
          border:     '1px solid #253241',
        }}
      >
        {/* Table column headers */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-[#253241]">
          {/* Left: ACCA BOOST badge + date */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
              style={{ background: 'rgba(0,223,169,0.1)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.2)' }}
            >
              ACCA BOOST
            </span>
            <span className="text-[10px] text-[#94A3B8]/40 font-medium">{today}</span>
          </div>

          {/* Column labels aligned with OddsButton widths */}
          <div className="flex items-center gap-1.5 shrink-0">
            {['1', '2'].map(h => (
              <div key={h} className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/50 uppercase tracking-wider">
                {h}
              </div>
            ))}
            <div className="w-3" />
          </div>
        </div>

        {/* Match rows */}
        {visible.map(match => (
          <TennisMatchRow key={match.id} match={match} />
        ))}

        {/* Show more toggle */}
        {matches.length > 5 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full py-2.5 text-[11px] font-semibold text-[#94A3B8]/50 hover:text-[#F8FAFC] transition-colors border-t border-[#253241]/60"
          >
            {showAll ? 'Show less ↑' : `Show more (${matches.length - 5} more matches) ↓`}
          </button>
        )}
      </div>
    </div>
  );
}
