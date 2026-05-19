import { useState, useMemo, useRef } from 'react';
import { ChevronRight, Zap } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { OddsButton } from './OddsButton';
import { getDailyMatches, buildAccaCards } from '../data/tennisData';
import type { TennisMatch, AccaCard } from '../data/tennisData';

// ── Bet365 tennis classification SVG icon ─────────────────────────────────────
const BET365_TENNIS_ICON = 'https://www.bet365.com/sports-assets/sports/ClassificationIconsLib/assets/classification/13.svg';

function TennisIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <img
      ref={imgRef}
      src={BET365_TENNIS_ICON}
      alt="Tennis"
      width={size}
      height={size}
      className={className}
      style={{ display: 'inline-block' }}
      onError={() => {
        if (imgRef.current) imgRef.current.style.display = 'none';
      }}
    />
  );
}

// ── Acca Boost card ───────────────────────────────────────────────────────────

function AccaCardItem({ card, index }: { card: AccaCard; index: number }) {
  const isSpecial = card.isSpecial;

  return (
    <div
      className="shrink-0 w-[272px] flex flex-col rounded-xl overflow-hidden cursor-pointer select-none group"
      style={{
        background: 'linear-gradient(160deg, #18212B 0%, #121821 100%)',
        border: '1px solid #253241',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        animation: `tennisCardIn 0.38s cubic-bezier(0.22,1,0.36,1) ${index * 70}ms both`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'rgba(0,223,169,0.35)';
        el.style.boxShadow   = '0 0 28px rgba(0,223,169,0.12)';
        el.style.transform   = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = '#253241';
        el.style.boxShadow   = '';
        el.style.transform   = '';
      }}
    >
      {/* Animated shimmer stripe at top */}
      <div
        className="h-[2px] w-full"
        style={{
          background: 'linear-gradient(90deg, transparent, #00DFA9 40%, #38BDF8 60%, transparent)',
          backgroundSize: '200% 100%',
          animation: 'tennisStripe 2.8s linear infinite',
          animationDelay: `${index * 0.4}s`,
        }}
      />

      <div className="p-4 flex flex-col flex-1">
        {/* Badge row */}
        <div className="flex items-center gap-1.5 mb-3">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(0,223,169,0.1)',
              border: '1px solid rgba(0,223,169,0.25)',
              animation: 'accentPulse 2.4s ease-in-out infinite',
              animationDelay: `${index * 0.6}s`,
            }}
          >
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
              <div className="w-3 h-3 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-[#00DFA9]/25">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]" />
              </div>
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

// ── Tennis match row ──────────────────────────────────────────────────────────

function TennisMatchRow({ match, index }: { match: TennisMatch; index: number }) {
  const sharedProps = {
    matchId:    match.id,
    marketId:   `tennis_market_${match.id}`,
    matchName:  `${match.player1} v ${match.player2}`,
    leagueName: match.tournament,
    marketName: 'To Win Match',
  };

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 border-b border-[#253241]/50 hover:bg-[#121821]/60 transition-colors group cursor-pointer"
      style={{
        animation: `tennisRowIn 0.3s ease-out ${index * 45}ms both`,
      }}
    >
      {/* Player icon + names */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,223,169,0.08)', border: '1px solid rgba(0,223,169,0.15)' }}
        >
          <TennisIcon size={15} />
        </div>
      </div>

      {/* Players + time */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-[13px] font-medium text-[#F8FAFC] leading-none truncate">{match.player1}</span>
        <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate group-hover:text-[#F8FAFC] transition-colors">{match.player2}</span>
        <span className="text-[10px] text-[#94A3B8]/40 font-medium mt-0.5">{match.time}</span>
      </div>

      {/* Market count */}
      <span className="text-[10px] text-[#94A3B8]/30 font-medium tabular-nums hidden md:block shrink-0">+12</span>

      {/* Odds buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <OddsButton {...sharedProps} selectionType="1" selectionName={match.player1} odds={match.odds1} />
        <OddsButton {...sharedProps} selectionType="2" selectionName={match.player2} odds={match.odds2} />
        <div className="w-3" />
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export function TennisHighlights() {
  const [showAll, setShowAll]         = useState(false);
  const [iconSpinning, setIconSpinning] = useState(false);

  const matches   = useMemo(() => getDailyMatches(), []);
  const accaCards = useMemo(() => buildAccaCards(matches), [matches]);

  const today   = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
  const visible = showAll ? matches : matches.slice(0, 5);

  return (
    <div className="mb-5">

      {/* ── Section header ─────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        {/* Animated tennis icon — spins on click/hover */}
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-lg shrink-0 focus:outline-none"
          style={{
            background: 'rgba(0,223,169,0.08)',
            border: '1px solid rgba(0,223,169,0.2)',
          }}
          onClick={() => {
            if (!iconSpinning) {
              setIconSpinning(true);
              setTimeout(() => setIconSpinning(false), 700);
            }
          }}
          title="Tennis"
        >
          <TennisIcon
            size={18}
            className={`transition-none${iconSpinning ? ' spinning' : ' tennis-icon-wrap'}`}
          />
          <style>{`
            .tennis-icon-wrap { animation: tennisIconIdle 3s ease-in-out infinite; }
            .spinning { animation: tennisSpin 0.65s cubic-bezier(0.22,1,0.36,1) forwards; }
          `}</style>
        </button>

        <div className="flex flex-col">
          <span className="text-[14px] font-bold text-[#F8FAFC] leading-none">Tennis Highlights</span>
          <span className="text-[10px] text-[#94A3B8]/50 font-medium mt-0.5">{today}</span>
        </div>

        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,223,169,0.25), transparent)' }} />

        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors shrink-0">
          View All
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Acca boost cards ──────────────────────────────── */}
      <ScrollArea className="w-full mb-4">
        <div className="flex gap-3 pb-1 w-max">
          {accaCards.map((card, i) => (
            <AccaCardItem key={card.id} card={card} index={i} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {/* ── Match table ───────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#0F1620', border: '1px solid #253241' }}
      >
        {/* Table header */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-[#253241]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded"
              style={{ background: 'rgba(0,223,169,0.1)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.2)' }}
            >
              ACCA BOOST
            </span>
            <span className="text-[10px] text-[#94A3B8]/40 font-medium">{today}</span>
          </div>
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
        {visible.map((match, i) => (
          <TennisMatchRow key={match.id} match={match} index={i} />
        ))}

        {/* Show more */}
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
