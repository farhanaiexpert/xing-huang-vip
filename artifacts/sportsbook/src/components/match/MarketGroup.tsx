import { useState } from 'react';
import { ChevronDown, Star, TrendingUp, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { OddsButton } from '../OddsButton';
import type { MarketEntity } from '../../data/types';
import type { MarketDetailGroup } from '../../data/marketDetails';

interface MarketGroupProps {
  group: MarketDetailGroup;
  matchId: string;
  matchName: string;
  leagueName: string;
  defaultOpen?: boolean;
  isFeatured?: boolean;
  groupIndex?: number;
  sportKey?: string;
  homeTeam?: string;
  awayTeam?: string;
  commenceTime?: string;
}

function updatedLabel(groupId: string): string {
  const n = groupId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const min = 1 + (n % 14);
  return min === 1 ? 'Just updated' : `${min}m ago`;
}

export function MarketGroup({
  group, matchId, matchName, leagueName, defaultOpen, isFeatured, groupIndex = 0,
  sportKey, homeTeam, awayTeam, commenceTime,
}: MarketGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? group.isDefaultOpen);
  const totalSelections = group.markets.reduce((acc, m) => acc + m.selections.length, 0);
  const label = updatedLabel(group.id);
  const isTrending = groupIndex === 0 || (groupIndex % 4 === 1);

  return (
    <div
      id={`mg-${group.id}`}
      className={cn(
        'rounded-xl overflow-hidden border bg-[#121821] transition-shadow duration-200',
        isFeatured
          ? 'border-[#00DFA9]/25 shadow-[0_0_20px_rgba(0,223,169,0.05)]'
          : 'border-[#253241]'
      )}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[48px] bg-[#0F1620] hover:bg-[#18212B] transition-colors duration-150 group"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-base leading-none shrink-0">{group.icon}</span>

          <span className="text-[13px] font-semibold text-[#F8FAFC] truncate">{group.name}</span>

          {/* Selection count */}
          <span className="text-[10px] text-[#94A3B8]/50 bg-[#253241]/60 px-1.5 py-0.5 rounded font-medium tabular-nums shrink-0">
            {totalSelections}
          </span>

          {/* Badges — shown on all screen sizes (icon only on very small screens) */}
          {isFeatured && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/20 px-1.5 py-0.5 rounded shrink-0">
              <Star className="h-2.5 w-2.5 fill-[#FACC15]" />
              <span className="hidden sm:inline">Featured</span>
            </span>
          )}
          {isTrending && !isFeatured && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-[#38BDF8] bg-[#38BDF8]/8 border border-[#38BDF8]/20 px-1.5 py-0.5 rounded shrink-0">
              <TrendingUp className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Popular</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:flex items-center gap-1 text-[9px] text-[#94A3B8]/30 font-medium">
            <Clock className="h-2.5 w-2.5" />
            {label}
          </span>
          <ChevronDown className={cn(
            'h-4 w-4 text-[#94A3B8]/50 transition-transform duration-200 group-hover:text-[#94A3B8]',
            isOpen && 'rotate-180'
          )} />
        </div>
      </button>

      {/* ── Content ───────────────────────────────────────────────── */}
      {isOpen && (
        <div className="divide-y divide-[#253241]/50">
          {group.markets.map(market => (
            <MarketSection
              key={market.id}
              market={market}
              matchId={matchId}
              matchName={matchName}
              leagueName={leagueName}
              sportKey={sportKey}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              commenceTime={commenceTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Individual market within a group ──────────────────────────────────────────

type MarketSectionProps = {
  market: MarketEntity;
  matchId: string;
  matchName: string;
  leagueName: string;
  sportKey?: string;
  homeTeam?: string;
  awayTeam?: string;
  commenceTime?: string;
};

function MarketSection({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }: MarketSectionProps) {
  const isCorrectScore = market.marketTypeId === 'mt_correct_score';
  const isGoalScorer   = market.marketTypeId === 'mt_first_scorer' || market.marketTypeId === 'mt_anytime_scorer';
  const isRunners      = market.marketTypeId === 'mt_win_only' || market.marketTypeId === 'mt_place' || market.marketTypeId === 'mt_each_way';
  const isWide         = market.selections.length <= 3;

  if (isCorrectScore) return <CorrectScoreLayout market={market} matchId={matchId} matchName={matchName} leagueName={leagueName} sportKey={sportKey} homeTeam={homeTeam} awayTeam={awayTeam} commenceTime={commenceTime} />;
  if (isGoalScorer || isRunners) return <PlayerListLayout market={market} matchId={matchId} matchName={matchName} leagueName={leagueName} sportKey={sportKey} homeTeam={homeTeam} awayTeam={awayTeam} commenceTime={commenceTime} />;
  if (isWide) return <WideLayout market={market} matchId={matchId} matchName={matchName} leagueName={leagueName} sportKey={sportKey} homeTeam={homeTeam} awayTeam={awayTeam} commenceTime={commenceTime} />;
  return <GridLayout market={market} matchId={matchId} matchName={matchName} leagueName={leagueName} sportKey={sportKey} homeTeam={homeTeam} awayTeam={awayTeam} commenceTime={commenceTime} />;
}

// ── Wide layout: 2–3 selections ───────────────────────────────────────────────

function WideLayout({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }: MarketSectionProps) {
  const count = market.selections.length;
  return (
    <div className="px-3 sm:px-4 py-3.5">
      {market.name !== '' && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 mb-3">
          {market.name}
        </p>
      )}
      {/* 2 selections → 2-col always; 3 selections → 2-col on mobile, 3-col on sm+ */}
      <div className={cn('grid gap-2', count === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>
        {market.selections.map(sel => (
          <div key={sel.id} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-[#94A3B8]/60 font-medium leading-none truncate max-w-full px-1 text-center">
              {sel.shortName.length > 6 ? sel.name : sel.shortName}
            </span>
            <OddsButton
              matchId={matchId} marketId={market.id} matchName={matchName}
              leagueName={leagueName} marketName={market.name}
              selectionType={sel.shortName} selectionName={sel.name}
              odds={sel.odds} className="w-full"
              sportKey={sportKey} homeTeam={homeTeam} awayTeam={awayTeam} commenceTime={commenceTime}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Grid layout: 4+ selections ────────────────────────────────────────────────

function GridLayout({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }: MarketSectionProps) {
  return (
    <div className="px-3 sm:px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 mb-3">
        {market.name}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {market.selections.map(sel => (
          <div key={sel.id} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-[#94A3B8]/60 font-medium leading-none text-center">
              {sel.shortName}
            </span>
            <OddsButton
              matchId={matchId} marketId={market.id} matchName={matchName}
              leagueName={leagueName} marketName={market.name}
              selectionType={sel.shortName} selectionName={sel.name}
              odds={sel.odds} className="w-full"
              sportKey={sportKey} homeTeam={homeTeam} awayTeam={awayTeam} commenceTime={commenceTime}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Correct score grid ────────────────────────────────────────────────────────

function CorrectScoreLayout({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }: MarketSectionProps) {
  return (
    <div className="px-3 sm:px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 mb-3">
        {market.name}
      </p>
      {/* 2-col on xs, 3-col on sm, 4-col on md+ for dense score grids */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
        {market.selections.map(sel => (
          <div key={sel.id} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-[#94A3B8]/50 leading-none">{sel.shortName}</span>
            <OddsButton
              matchId={matchId} marketId={market.id} matchName={matchName}
              leagueName={leagueName} marketName={market.name}
              selectionType={sel.shortName} selectionName={sel.name}
              odds={sel.odds} className="w-full text-xs"
              sportKey={sportKey} homeTeam={homeTeam} awayTeam={awayTeam} commenceTime={commenceTime}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Player / runner list layout ───────────────────────────────────────────────

function PlayerListLayout({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }: MarketSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? market.selections : market.selections.slice(0, 6);
  const hasMore   = market.selections.length > 6;

  return (
    <div className="px-3 sm:px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 mb-3">
        {market.name}
      </p>
      <div className="space-y-1.5">
        {displayed.map(sel => (
          <div
            key={sel.id}
            className="flex items-center justify-between gap-3 bg-[#0B0F14] border border-[#253241]/60 rounded-lg px-3 py-2.5 hover:border-[#2E3D50] hover:bg-[#0F1620] transition-all duration-100 min-h-[44px]"
          >
            <span className="text-[13px] text-[#F8FAFC] font-medium truncate">{sel.name}</span>
            <OddsButton
              matchId={matchId} marketId={market.id} matchName={matchName}
              leagueName={leagueName} marketName={market.name}
              selectionType={sel.shortName} selectionName={sel.name}
              odds={sel.odds} className="shrink-0"
              sportKey={sportKey} homeTeam={homeTeam} awayTeam={awayTeam} commenceTime={commenceTime}
            />
          </div>
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 w-full py-2.5 rounded-lg text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 bg-[#38BDF8]/5 hover:bg-[#38BDF8]/10 border border-[#38BDF8]/15 transition-all duration-150"
        >
          Show {market.selections.length - 6} more →
        </button>
      )}
    </div>
  );
}
