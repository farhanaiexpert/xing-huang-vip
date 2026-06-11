import { useState, useRef, useEffect } from 'react';
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
  accentColor?:  string;
  /** Bumped by the parent when this group is selected in the nav — forces it open. */
  openSignalNonce?: number;
}

function updatedLabel(groupId: string): string {
  const n   = groupId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const min = 1 + (n % 14);
  return min === 1 ? 'Just updated' : `${min}m ago`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function MarketGroup({
  group, matchId, matchName, leagueName, defaultOpen, isFeatured, groupIndex = 0,
  sportKey, homeTeam, awayTeam, commenceTime, accentColor, openSignalNonce = 0,
}: MarketGroupProps) {
  const [isOpen, setIsOpen]   = useState(defaultOpen ?? group.isDefaultOpen);
  const contentRef            = useRef<HTMLDivElement>(null);

  // When this group is selected in the nav, force it open (even if collapsed).
  useEffect(() => {
    if (openSignalNonce > 0) setIsOpen(true);
  }, [openSignalNonce]);
  const totalSelections       = group.markets.reduce((acc, m) => acc + m.selections.length, 0);
  const label                 = updatedLabel(group.id);
  const isTrending            = groupIndex === 0 || (groupIndex % 4 === 1);
  const isHot                 = groupIndex === 0;

  const color  = accentColor ?? '#38BDF8';
  const { r, g, b } = hexToRgb(color);

  return (
    <div
      id={`mg-${group.id}`}
      className="rounded-2xl overflow-hidden border transition-all duration-200"
      style={{
        background:  'linear-gradient(180deg, #101825 0%, #0C1219 100%)',
        borderColor: isOpen ? `rgba(${r},${g},${b},0.22)` : 'rgba(25,37,52,0.8)',
        boxShadow:   isOpen
          ? `0 0 28px rgba(${r},${g},${b},0.07), 0 4px 16px rgba(0,0,0,0.3)`
          : '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      {/* Top accent bar — always shown, color matches category */}
      <div
        className="h-[2px] w-full"
        style={{ background: `linear-gradient(90deg, ${color} 0%, rgba(${r},${g},${b},0.1) 70%, transparent 100%)` }}
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3.5 min-h-[54px] transition-colors duration-150 group',
          isOpen ? 'bg-[#0D1520]/60' : 'bg-transparent hover:bg-[#0D1520]/40'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Icon box */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition-all duration-150"
            style={{
              background:   `rgba(${r},${g},${b},0.10)`,
              border:       `1px solid rgba(${r},${g},${b},0.22)`,
              boxShadow:    isOpen ? `0 0 10px rgba(${r},${g},${b},0.12)` : 'none',
            }}
          >
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
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
            style={{
              background: `rgba(${r},${g},${b},0.10)`,
              color:       `rgba(${r},${g},${b},0.75)`,
              border:      `1px solid rgba(${r},${g},${b},0.18)`,
            }}
          >
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
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-200"
            style={isOpen ? {
              background:  `rgba(${r},${g},${b},0.12)`,
              borderColor: `rgba(${r},${g},${b},0.30)`,
            } : {
              background:  'rgba(26,36,51,0.6)',
              borderColor: 'rgba(37,50,65,0.6)',
            }}
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-all duration-200', isOpen ? 'rotate-180' : 'text-[#94A3B8]/50')}
              style={isOpen ? { color } : {}}
            />
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
          <div className="divide-y divide-[#1A2433]/50">
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
                accentColor={color}
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
  accentColor?:  string;
};

function MarketSection({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime, accentColor }: MarketSectionProps) {
  const isCorrectScore = market.marketTypeId === 'mt_correct_score';
  const isGoalScorer   = market.marketTypeId === 'mt_first_scorer' || market.marketTypeId === 'mt_anytime_scorer';
  const isRunners      = market.marketTypeId === 'mt_win_only' || market.marketTypeId === 'mt_place' || market.marketTypeId === 'mt_each_way';
  const isWide         = market.selections.length <= 3;

  const props = { market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime, accentColor };

  if (isCorrectScore)              return <CorrectScoreLayout {...props} />;
  if (isGoalScorer || isRunners)   return <PlayerListLayout  {...props} />;
  if (isWide)                      return <WideLayout        {...props} />;
  return                                  <GridLayout        {...props} />;
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ name, color }: { name: string; color?: string }) {
  if (!name) return null;
  const c = color ?? '#38BDF8';
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
      <span className="h-px flex-1" style={{ background: 'rgba(30,45,61,0.8)' }} />
      <span style={{ color: `${c}90` }}>{name}</span>
      <span className="h-px flex-1" style={{ background: 'rgba(30,45,61,0.8)' }} />
    </p>
  );
}

// ── Wide layout: 2–3 selections ───────────────────────────────────────────────

function WideLayout({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime, accentColor }: MarketSectionProps) {
  const count = market.selections.length;
  return (
    <div className="px-4 xl:px-5 py-4">
      <SectionLabel name={market.name} color={accentColor} />
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

function GridLayout({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime, accentColor }: MarketSectionProps) {
  const count    = market.selections.length;
  const gridCols = count <= 6
    ? 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-6'
    : 'grid-cols-2 sm:grid-cols-4 xl:grid-cols-5';
  return (
    <div className="px-4 xl:px-5 py-4">
      <SectionLabel name={market.name} color={accentColor} />
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

function CorrectScoreLayout({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime, accentColor }: MarketSectionProps) {
  return (
    <div className="px-4 xl:px-5 py-4">
      <SectionLabel name={market.name} color={accentColor} />
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

function PlayerListLayout({ market, matchId, matchName, leagueName, sportKey, homeTeam, awayTeam, commenceTime, accentColor }: MarketSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed             = showAll ? market.selections : market.selections.slice(0, 8);
  const hasMore               = market.selections.length > 8;
  const color                 = accentColor ?? '#38BDF8';
  const { r, g, b }           = { r: parseInt(color.slice(1,3),16), g: parseInt(color.slice(3,5),16), b: parseInt(color.slice(5,7),16) };

  return (
    <div className="px-4 xl:px-5 py-4">
      <SectionLabel name={market.name} color={accentColor} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        {displayed.map((sel, i) => (
          <div
            key={sel.id}
            className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 border transition-all duration-150 min-h-[48px] group"
            style={{
              background:  'linear-gradient(135deg, #0D1520, #0B1018)',
              borderColor: 'rgba(30,45,61,0.8)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = `rgba(${r},${g},${b},0.22)`;
              (e.currentTarget as HTMLElement).style.background  = `linear-gradient(135deg, rgba(${r},${g},${b},0.04), #0D1520)`;
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
          className="mt-3 w-full py-3 rounded-xl text-[11px] font-bold transition-all duration-150"
          style={{
            color:        color,
            background:   `rgba(${r},${g},${b},0.05)`,
            border:       `1px solid rgba(${r},${g},${b},0.15)`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = `rgba(${r},${g},${b},0.10)`;
            (e.currentTarget as HTMLElement).style.borderColor = `rgba(${r},${g},${b},0.28)`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = `rgba(${r},${g},${b},0.05)`;
            (e.currentTarget as HTMLElement).style.borderColor = `rgba(${r},${g},${b},0.15)`;
          }}
        >
          Show {market.selections.length - 8} more →
        </button>
      )}
    </div>
  );
}
