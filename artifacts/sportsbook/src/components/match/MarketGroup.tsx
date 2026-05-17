import { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
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
}

export function MarketGroup({ group, matchId, matchName, leagueName, defaultOpen }: MarketGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? group.isDefaultOpen);
  const totalSelections = group.markets.reduce((acc, m) => acc + m.selections.length, 0);

  return (
    <div id={`mg-${group.id}`} className="rounded-xl overflow-hidden border border-[#253241] bg-[#121821]">
      {/* Header */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#0F1620] hover:bg-[#18212B] transition-colors duration-150 group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">{group.icon}</span>
          <span className="text-[13px] font-semibold text-[#F8FAFC]">{group.name}</span>
          <span className="text-[10px] text-[#94A3B8]/50 bg-[#253241]/60 px-1.5 py-0.5 rounded font-medium tabular-nums">
            {totalSelections}
          </span>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-[#94A3B8]/50 transition-transform duration-200 group-hover:text-[#94A3B8]',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="divide-y divide-[#253241]/50">
          {group.markets.map(market => (
            <MarketSection
              key={market.id}
              market={market}
              matchId={matchId}
              matchName={matchName}
              leagueName={leagueName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Individual market within a group ─────────────────────────────────────────

function MarketSection({ market, matchId, matchName, leagueName }: {
  market: MarketEntity;
  matchId: string;
  matchName: string;
  leagueName: string;
}) {
  const isCorrectScore = market.marketTypeId === 'mt_correct_score';
  const isGoalScorer   = market.marketTypeId === 'mt_first_scorer' || market.marketTypeId === 'mt_anytime_scorer';
  const isRunners      = market.marketTypeId === 'mt_win_only' || market.marketTypeId === 'mt_place' || market.marketTypeId === 'mt_each_way';
  const isWide         = market.selections.length <= 3;

  if (isCorrectScore) {
    return <CorrectScoreLayout market={market} matchId={matchId} matchName={matchName} leagueName={leagueName} />;
  }
  if (isGoalScorer || isRunners) {
    return <PlayerListLayout market={market} matchId={matchId} matchName={matchName} leagueName={leagueName} />;
  }
  if (isWide) {
    return <WideLayout market={market} matchId={matchId} matchName={matchName} leagueName={leagueName} />;
  }
  return <GridLayout market={market} matchId={matchId} matchName={matchName} leagueName={leagueName} />;
}

// ── Wide layout: up to 3 selections in full-width columns ─────────────────────

function WideLayout({ market, matchId, matchName, leagueName }: MarketSectionProps) {
  return (
    <div className="px-4 py-3">
      {/* Market label */}
      {market.name !== '' && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 mb-2.5">
          {market.name}
        </p>
      )}
      <div className={cn('grid gap-2', market.selections.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {market.selections.map(sel => (
          <div key={sel.id} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-[#94A3B8]/60 font-medium leading-none truncate max-w-full px-1 text-center">
              {sel.shortName.length > 6 ? sel.name : sel.shortName}
            </span>
            <OddsButton
              matchId={matchId}
              marketId={market.id}
              matchName={matchName}
              leagueName={leagueName}
              marketName={market.name}
              selectionType={sel.shortName}
              selectionName={sel.name}
              odds={sel.odds}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Grid layout: 4+ selections in a grid ─────────────────────────────────────

function GridLayout({ market, matchId, matchName, leagueName }: MarketSectionProps) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 mb-2.5">
        {market.name}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {market.selections.map(sel => (
          <div key={sel.id} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-[#94A3B8]/60 font-medium leading-none text-center">
              {sel.shortName}
            </span>
            <OddsButton
              matchId={matchId}
              marketId={market.id}
              matchName={matchName}
              leagueName={leagueName}
              marketName={market.name}
              selectionType={sel.shortName}
              selectionName={sel.name}
              odds={sel.odds}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Correct score grid ────────────────────────────────────────────────────────

function CorrectScoreLayout({ market, matchId, matchName, leagueName }: MarketSectionProps) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 mb-2.5">
        {market.name}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {market.selections.map(sel => (
          <div key={sel.id} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-[#94A3B8]/50 leading-none">{sel.shortName}</span>
            <OddsButton
              matchId={matchId}
              marketId={market.id}
              matchName={matchName}
              leagueName={leagueName}
              marketName={market.name}
              selectionType={sel.shortName}
              selectionName={sel.name}
              odds={sel.odds}
              className="w-full text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Player / runner list layout ───────────────────────────────────────────────

function PlayerListLayout({ market, matchId, matchName, leagueName }: MarketSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? market.selections : market.selections.slice(0, 6);
  const hasMore   = market.selections.length > 6;

  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 mb-2.5">
        {market.name}
      </p>
      <div className="space-y-1.5">
        {displayed.map(sel => (
          <div key={sel.id} className="flex items-center justify-between gap-3 bg-[#0B0F14] border border-[#253241]/60 rounded-lg px-3 py-2 hover:border-[#2E3D50] transition-colors">
            <span className="text-sm text-[#F8FAFC] font-medium truncate">{sel.name}</span>
            <OddsButton
              matchId={matchId}
              marketId={market.id}
              matchName={matchName}
              leagueName={leagueName}
              marketName={market.name}
              selectionType={sel.shortName}
              selectionName={sel.name}
              odds={sel.odds}
              className="shrink-0"
            />
          </div>
        ))}
      </div>
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 w-full text-[11px] font-medium text-[#38BDF8] hover:text-[#38BDF8]/80 py-1.5 transition-colors"
        >
          Show {market.selections.length - 6} more →
        </button>
      )}
    </div>
  );
}

type MarketSectionProps = {
  market: MarketEntity;
  matchId: string;
  matchName: string;
  leagueName: string;
};
