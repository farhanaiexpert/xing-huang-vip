import { useState, useRef } from 'react';
import { ChevronDown, Star, TrendingUp, Clock, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { OddsButton } from '../OddsButton';
import type { MarketEntity } from '../../data/types';
import type { MarketDetailGroup } from '../../data/marketDetails';

interface MarketGroupProps {
  group:        MarketDetailGroup;
  matchId:      string;
  matchName:    string;
  leagueName:   string;
  defaultOpen?: boolean;
  isFeatured?:  boolean;
  groupIndex?:  number;
  sportKey?:    string;
  homeTeam?:    string;
  awayTeam?:    string;
  commenceTime?: string;
}

function updatedLabel(groupId: string): string {
  const n   = groupId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const min = 1 + (n % 14);
  return min === 1 ? 'Just updated' : `${min}m ago`;
}

export function MarketGroup({
  group, matchId, matchName, leagueName, defaultOpen, isFeatured, groupIndex = 0,
  sportKey, homeTeam, awayTeam, commenceTime,
}: MarketGroupProps) {
  const [isOpen, setIsOpen]   = useState(defaultOpen ?? group.isDefaultOpen);
  const contentRef            = useRef<HTMLDivElement>(null);
  const totalSelections       = group.markets.reduce((acc, m) => acc + m.selections.length, 0);
  const label                 = updatedLabel(group.id);
  const isTrending            = groupIndex === 0 || (groupIndex % 4 === 1);
  const isHot                 = groupIndex === 0;

  return (
    <div
      id={`mg-${group.id}`}
      className={cn(
        'rounded-2xl overflow-hidden border transition-all duration-200',
        isFeatured
          ? 'border-[#00DFA9]/20 shadow-[0_0_24px_rgba(0,223,169,0.06),0_2px_12px_rgba(0,0,0,0.3)]'
          : 'border-[#1E2D3D] shadow-[0_2px_8px_rgba(0,0,0,0.2)]',
      )}
      style={{ background: 'linear-gradient(180deg, #111827 0%, #0f1520 100%)' }}
    >
      {/* Featured left accent bar */}
      {isFeatured && (
        <div className="h-[2px] w-full"
          style={{ background: 'linear-gradient(90deg, #00DFA9 0%, #38BDF8 60%, transparent 100%)' }} />
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3.5 min-h-[52px] transition-colors duration-150 group',
          isOpen ? 'bg-[#0D1520]/80' : 'bg-transparent hover:bg-[#0D1520]/60'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Icon */}
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition-colors duration-150',
            isFeatured
              ? 'bg-[#00DFA9]/10 border border-[#00DFA9]/20'
              : 'bg-[#1A2433] border border-[#253241]/60'
          )}>
            {group.icon}
          </div>

          {/* Name */}
          <span className={cn(
            'text-[13px] font-bold truncate transition-colors duration-150',
            isOpen ? 'text-[#F8FAFC]' : 'text-[#CBD5E1] group-hover:text-[#F8FAFC]'
          )}>
            {group.name}
          </span>

          {/* Count pill */}
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0',
            isFeatured
              ? 'bg-[#00DFA9]/10 text-[#00DFA9]/80 border border-[#00DFA9]/15'
              : 'bg-[#1A2433] text-[#94A3B8]/50 border border-[#253241]/60'
          )}>
            {totalSelections}
          </span>

          {/* Badges */}
          {isFeatured && (
            <span className="hidden sm:flex items-center gap-1 text-[9px] font-bold text-[#FACC15] bg-[#FACC15]/8 border border-[#FACC15]/20 px-2 py-0.5 rounded-full shrink-0">
              <Star className="h-2.5 w-2.5 fill-[#FACC15]" />
              Featured
            </span>
          )}
          {isHot && !isFeatured && (
            <span className="hidden sm:flex items-center gap-1 text-[9px] font-bold text-[#EF4444] bg-[#EF4444]/8 border border-[#EF4444]/20 px-2 py-0.5 rounded-full shrink-0">
              <Zap className="h-2.5 w-2.5 fill-[#EF4444]" />
              Hot
            </span>
          )}
          {isTrending && !isFeatured && !isHot && (
            <span className="hidden sm:flex items-center gap-1 text-[9px] font-bold text-[#38BDF8] bg-[#38BDF8]/8 border border-[#38BDF8]/20 px-2 py-0.5 rounded-full shrink-0">
              <TrendingUp className="h-2.5 w-2.5" />
              Popular
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden md:flex items-center gap-1 text-[9px] text-[#94A3B8]/30 font-medium">
            <Clock className="h-2.5 w-2.5" />
            {label}
          </span>
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200',
            isOpen
              ? 'bg-[#00DFA9]/10 border-[#00DFA9]/25'
              : 'bg-[#1A2433]/60 border-[#253241]/60 group-hover:border-[#253241]'
          )}>
            <ChevronDown className={cn(
              'h-3.5 w-3.5 transition-all duration-200',
              isOpen ? 'rotate-180 text-[#00DFA9]' : 'text-[#94A3B8]/50'
            )} />
          </div>
        </div>
      </button>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? '9999px' : '0px', opacity: isOpen ? 1 : 0 }}
      >
        {isOpen && (
          <div className="divide-y divide-[#1E2D3D]/60">
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
    </div>
  );
}

// ── Individual market within a group ──────────────────────────────────────────

type MarketSectionProps = {
  market:       MarketEntity;
  matchId:      string;
  matchName:    string;
  leagueName:   string;
  sportKey?:    string;
  homeTeam?:    string;
  awayTeam?:    string;
  commenceTime?: string;
};

function MarketSection({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }: MarketSectionProps) {
  const isCorrectScore = market.marketTypeId === 'mt_correct_score';
  const isGoalScorer   = market.marketTypeId === 'mt_first_scorer' || market.marketTypeId === 'mt_anytime_scorer';
  const isRunners      = market.marketTypeId === 'mt_win_only' || market.marketTypeId === 'mt_place' || market.marketTypeId === 'mt_each_way';
  const isWide         = market.selections.length <= 3;

  if (isCorrectScore)  return <CorrectScoreLayout  {...{ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }} />;
  if (isGoalScorer || isRunners) return <PlayerListLayout {...{ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }} />;
  if (isWide)          return <WideLayout          {...{ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }} />;
  return                      <GridLayout          {...{ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }} />;
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ name }: { name: string }) {
  if (!name) return null;
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]/40 mb-3 flex items-center gap-2">
      <span className="h-px flex-1 bg-[#1E2D3D]" />
      {name}
      <span className="h-px flex-1 bg-[#1E2D3D]" />
    </p>
  );
}

// ── Wide layout: 2–3 selections ───────────────────────────────────────────────

function WideLayout({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime }: MarketSectionProps) {
  const count = market.selections.length;
  return (
    <div className="px-4 xl:px-5 py-4">
      <SectionLabel name={market.name} />
      <div className={cn('grid gap-2.5', count === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3')}>
        {market.selections.map(sel => (
          <div key={sel.id} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-[#94A3B8]/55 font-semibold leading-none truncate max-w-full px-1 text-center">
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
  const count    = market.selections.length;
  const gridCols = count <= 6
    ? 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-6'
    : 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-5';
  return (
    <div className="px-4 xl:px-5 py-4">
      <SectionLabel name={market.name} />
      <div className={`grid ${gridCols} gap-2`}>
        {market.selections.map(sel => (
          <div key={sel.id} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-[#94A3B8]/55 font-semibold leading-none text-center">
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
    <div className="px-4 xl:px-5 py-4">
      <SectionLabel name={market.name} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {market.selections.map(sel => (
          <div key={sel.id} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-[#94A3B8]/50 leading-none font-medium">{sel.shortName}</span>
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
  const displayed             = showAll ? market.selections : market.selections.slice(0, 8);
  const hasMore               = market.selections.length > 8;

  return (
    <div className="px-4 xl:px-5 py-4">
      <SectionLabel name={market.name} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        {displayed.map((sel, i) => (
          <div
            key={sel.id}
            className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 border transition-all duration-150 min-h-[48px] group"
            style={{
              background:   'linear-gradient(135deg, #0D1520, #0B1018)',
              borderColor:  'rgba(30,45,61,0.8)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(56,189,248,0.2)';
              (e.currentTarget as HTMLElement).style.background  = 'linear-gradient(135deg, #0F1825, #0D1520)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,45,61,0.8)';
              (e.currentTarget as HTMLElement).style.background  = 'linear-gradient(135deg, #0D1520, #0B1018)';
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[10px] font-bold text-[#94A3B8]/30 tabular-nums w-4 shrink-0">{i + 1}</span>
              <span className="text-[13px] text-[#E2E8F0] font-medium truncate group-hover:text-[#F8FAFC] transition-colors">{sel.name}</span>
            </div>
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
          className="mt-3 w-full py-3 rounded-xl text-[11px] font-bold text-[#38BDF8] bg-[#38BDF8]/5 hover:bg-[#38BDF8]/10 border border-[#38BDF8]/15 hover:border-[#38BDF8]/25 transition-all duration-150"
        >
          Show {market.selections.length - 8} more runners →
        </button>
      )}
    </div>
  );
}
