/**
 * SPORT DETAIL PAGE
 * Bet365-style sport page with configurable tabs per sport.
 * Supports: featured/coupons/matches, competitions, futures/outrights,
 *           offers, freeGames tabs. Plus inline sections: BetBoost,
 *           InPlay, MatchCoupon, MatchLists.
 */
import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft, RefreshCw, ChevronRight, Trophy, Tag, Star,
  Flame, Zap, ChevronDown, MonitorPlay, Gamepad2, BarChart2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { League } from '../types';
import {
  SPORT_DETAIL_CONFIGS, SPORT_DETAIL_IDS,
  type MockMatchCard, type TabId,
} from '../data/sportDetailData';
import { useBetSlip } from '../hooks/useBetSlip';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  sportId:          string;
  leagues:          League[];
  onBack:           () => void;
  lastUpdatedLabel: string;
  onRefresh:        () => void;
  isRefreshing?:    boolean;
}

// ── Flag helper ───────────────────────────────────────────────────────────────

function flag(cc: string): string {
  if (!cc) return '';
  if (cc === 'EU') return '🇪🇺';
  if (cc === 'GL' || cc === 'WW') return '🌐';
  try {
    return cc.toUpperCase().slice(0, 2).split('').map(c =>
      String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
    ).join('');
  } catch { return '🌐'; }
}

// ── Derived secondary market odds ─────────────────────────────────────────────

function deriveMarkets(odds1: number, oddsDraw: number | null | undefined, odds2: number) {
  const clamp = (n: number) => Math.max(1.01, Math.round(n * 100) / 100);
  const i1 = 1 / odds1;
  const id = oddsDraw ? 1 / oddsDraw : 0;
  const i2 = 1 / odds2;
  const tot = i1 + id + i2;
  const ph = i1 / tot;
  const pd = id / tot;
  const pa = i2 / tot;

  const ou25O = clamp(1.88 * (1 + (pd - 0.28) * 0.45));
  const ou25U = clamp(1.92 * (1 - (pd - 0.28) * 0.45));

  const bttsY = clamp(1.62 + pd * 0.7);
  const bttsN = clamp(2.18 - pd * 0.5);

  const fairLine = (ph - pa) * 3.5;
  const dist = 0 - fairLine;
  const adjF = Math.exp(dist * 0.35);
  const hcpIsFavHome = ph > 0.52;
  const hcpIsFavAway = pa > 0.52;
  const hLine = hcpIsFavHome ? '-1' : hcpIsFavAway ? '+1' : '0';
  const aLine = hcpIsFavHome ? '+1' : hcpIsFavAway ? '-1' : '0';
  const hcpH  = clamp(1.90 * adjF);
  const hcpA  = clamp(1.90 / adjF);

  const dnbH = clamp(1 / (ph / (ph + pa)) * 1.06);
  const dnbA = clamp(1 / (pa / (ph + pa)) * 1.06);

  return { ou25O, ou25U, bttsY, bttsN, hLine, aLine, hcpH, hcpA, dnbH, dnbA };
}

// ── Odds button ───────────────────────────────────────────────────────────────

function OddsButton({
  label, odds, selectionId, marketId, matchId, matchName, leagueName, selectionName, marketName, sportKey,
}: {
  label: string; odds: number; selectionId: string; marketId: string;
  matchId: string; matchName: string; leagueName: string; selectionName: string;
  marketName?: string; sportKey?: string;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const active = hasSelection(selectionId);

  function toggle() {
    if (active) removeSelection(selectionId);
    else addSelection({
      id: selectionId, marketId, matchId, matchName, leagueName,
      marketName: marketName ?? 'Match Result', selectionType: label, selectionName, odds,
      sportKey: sportKey ?? '',
    });
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-150',
        active
          ? 'bg-[#00DFA9]/12 border-[#00DFA9]/60 text-[#00DFA9]'
          : 'bg-[#18212B] border-[#253241] text-[#94A3B8] hover:bg-[#253241] hover:border-[#2E3D50] hover:text-[#F8FAFC]'
      )}
    >
      <span className={cn('text-[10px] font-bold', active ? 'text-[#00DFA9]/70' : 'text-[#94A3B8]/50')}>{label}</span>
      <span className={cn('font-bold tabular-nums', active ? 'text-[#00DFA9]' : 'text-[#F8FAFC]')}>{odds.toFixed(2)}</span>
    </button>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

type MarketTabId = 'h2h' | 'ou25' | 'btts' | 'hcp' | 'dnb';

const MARKET_TABS: { id: MarketTabId; label: string; hasDraw: boolean }[] = [
  { id: 'h2h',  label: '1X2',   hasDraw: true  },
  { id: 'ou25', label: 'O/U',   hasDraw: false },
  { id: 'btts', label: 'BTTS',  hasDraw: false },
  { id: 'hcp',  label: 'HCP',   hasDraw: false },
  { id: 'dnb',  label: 'DNB',   hasDraw: false },
];

function MatchCard({ match, leagueName }: { match: MockMatchCard; leagueName: string }) {
  const [activeTab, setActiveTab] = useState<MarketTabId>('h2h');
  const [, navigate] = useLocation();
  const hasDraw   = match.oddsDraw != null;
  const matchName = `${match.team1} v ${match.team2}`;

  const sec = useMemo(
    () => deriveMarkets(match.odds1, match.oddsDraw, match.odds2),
    [match.odds1, match.oddsDraw, match.odds2],
  );

  type OddsEntry = { label: string; selId: string; marketId: string; selName: string; odds: number; marketName: string };

  const oddsRow: OddsEntry[] = useMemo(() => {
    const base = `${match.id}`;
    if (activeTab === 'h2h') {
      const mid = `${base}_h2h`;
      const rows: OddsEntry[] = [
        { label: '1', selId: `${base}_1`, marketId: mid, selName: match.team1, odds: match.odds1,    marketName: hasDraw ? 'Match Result' : 'Match Winner' },
        { label: '2', selId: `${base}_2`, marketId: mid, selName: match.team2, odds: match.odds2,    marketName: hasDraw ? 'Match Result' : 'Match Winner' },
      ];
      if (hasDraw) rows.splice(1, 0, { label: 'X', selId: `${base}_x`, marketId: mid, selName: 'Draw', odds: match.oddsDraw!, marketName: 'Match Result' });
      return rows;
    }
    if (activeTab === 'ou25') {
      const mid = `${base}_ou25`;
      return [
        { label: 'O 2.5', selId: `${base}_ou25_o`, marketId: mid, selName: 'Over 2.5',  odds: sec.ou25O, marketName: 'Over/Under 2.5 Goals' },
        { label: 'U 2.5', selId: `${base}_ou25_u`, marketId: mid, selName: 'Under 2.5', odds: sec.ou25U, marketName: 'Over/Under 2.5 Goals' },
      ];
    }
    if (activeTab === 'btts') {
      const mid = `${base}_btts`;
      return [
        { label: 'Yes', selId: `${base}_btts_y`, marketId: mid, selName: 'Yes', odds: sec.bttsY, marketName: 'Both Teams to Score' },
        { label: 'No',  selId: `${base}_btts_n`, marketId: mid, selName: 'No',  odds: sec.bttsN, marketName: 'Both Teams to Score' },
      ];
    }
    if (activeTab === 'hcp') {
      const mid = `${base}_hcp`;
      return [
        { label: `H ${sec.hLine}`, selId: `${base}_hcp_h`, marketId: mid, selName: `${match.team1} ${sec.hLine}`, odds: sec.hcpH, marketName: `Asian Handicap ${sec.hLine}` },
        { label: `A ${sec.aLine}`, selId: `${base}_hcp_a`, marketId: mid, selName: `${match.team2} ${sec.aLine}`, odds: sec.hcpA, marketName: `Asian Handicap ${sec.hLine}` },
      ];
    }
    if (activeTab === 'dnb') {
      const mid = `${base}_dnb`;
      return [
        { label: match.team1.split(' ')[0], selId: `${base}_dnb_h`, marketId: mid, selName: match.team1, odds: sec.dnbH, marketName: 'Draw No Bet' },
        { label: match.team2.split(' ')[0], selId: `${base}_dnb_a`, marketId: mid, selName: match.team2, odds: sec.dnbA, marketName: 'Draw No Bet' },
      ];
    }
    return [];
  }, [activeTab, match, sec, hasDraw]);

  const visibleTabs = hasDraw ? MARKET_TABS : MARKET_TABS.map(t => t.id === 'h2h' ? { ...t, label: 'MW' } : t);

  return (
    <div className={cn(
      'bg-[#121821] rounded-xl border transition-all duration-200 flex flex-col',
      match.isLive
        ? 'border-[#EF4444]/30 shadow-[0_0_12px_rgba(239,68,68,0.07)]'
        : 'border-[#253241] hover:border-[#2E3D50]'
    )}>
      {/* Live bar */}
      {match.isLive && (
        <div className="px-3 pt-2.5 pb-0 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
          <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider">Live</span>
          {match.liveStatus && (
            <span className="text-[10px] text-[#94A3B8]/50">{match.liveStatus}</span>
          )}
        </div>
      )}

      {/* Teams */}
      <div className="px-3 pt-3 pb-2 flex-1">
        <div className="flex items-center gap-1.5 mb-1.5">
          {match.team1Country && <span className="text-sm leading-none shrink-0">{flag(match.team1Country)}</span>}
          <p className="text-[13px] font-semibold text-[#F8FAFC] leading-tight truncate">{match.team1}</p>
          {match.score1 && <span className="ml-auto text-[12px] font-bold text-[#F8FAFC] tabular-nums shrink-0">{match.score1}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {match.team2Country && <span className="text-sm leading-none shrink-0">{flag(match.team2Country)}</span>}
          <p className="text-[13px] font-semibold text-[#F8FAFC] leading-tight truncate">{match.team2}</p>
          {match.score2 && <span className="ml-auto text-[12px] font-bold text-[#F8FAFC] tabular-nums shrink-0">{match.score2}</span>}
        </div>
        {!match.isLive && (
          <p className="text-[11px] text-[#94A3B8]/50 mt-2 flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-[#38BDF8]/40" />
            {match.dateLabel}
          </p>
        )}
      </div>

      {/* Market tab strip */}
      <div className="px-3 pb-1.5 flex items-center gap-1 border-t border-[#1E2A38]">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none pt-1.5">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide transition-all duration-100 border',
                activeTab === tab.id
                  ? 'bg-[#00DFA9]/15 border-[#00DFA9]/40 text-[#00DFA9]'
                  : 'bg-transparent border-[#253241]/60 text-[#94A3B8]/50 hover:text-[#94A3B8] hover:border-[#253241]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Odds row */}
      <div className="px-3 pb-2.5 flex gap-2">
        {oddsRow.map(entry => (
          <OddsButton
            key={entry.selId}
            label={entry.label} odds={entry.odds} selectionId={entry.selId}
            marketId={entry.marketId} matchId={match.id} matchName={matchName}
            leagueName={leagueName} selectionName={entry.selName} marketName={entry.marketName}
            sportKey={match.sportKey ?? match.sportId ?? ''}
          />
        ))}
      </div>

      {/* More markets footer */}
      <button
        onClick={() => navigate(`/match/${match.id}`)}
        className="mx-3 mb-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#0F1620] border border-[#1E2A38] hover:border-[#2E3D50] hover:bg-[#18212B] transition-all duration-150 group"
      >
        <div className="flex items-center gap-1.5">
          <BarChart2 className="h-3 w-3 text-[#38BDF8]/60 group-hover:text-[#38BDF8] transition-colors" />
          <span className="text-[10px] font-semibold text-[#94A3B8]/50 group-hover:text-[#94A3B8] transition-colors">
            All markets
          </span>
        </div>
        <ChevronRight className="h-3 w-3 text-[#94A3B8]/30 group-hover:text-[#94A3B8]/70 transition-colors" />
      </button>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-1">
      {icon}
      <span className="text-[13px] font-bold text-[#00DFA9]">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-[#00DFA9]/20 to-transparent" />
    </div>
  );
}

// ── BetBoost section ──────────────────────────────────────────────────────────

function BetBoostSection({ cards }: { cards: NonNullable<typeof import('../data/sportDetailData').SPORT_DETAIL_CONFIGS[string]['betBoostCards']> }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-3.5 w-3.5 text-[#00DFA9]" />
        <span className="text-[13px] font-bold text-[#00DFA9]">Bet Boost</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#00DFA9]/20 to-transparent" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map(card => (
          <div
            key={card.id}
            className="bg-[#121821] rounded-xl border border-[#253241] hover:border-[#2E3D50] p-3.5 cursor-pointer transition-all duration-150 flex flex-col gap-2"
          >
            <div className="flex items-center gap-1">
              <Zap className="h-2.5 w-2.5 text-[#00DFA9]" />
              <span className="text-[9px] font-bold text-[#00DFA9] uppercase tracking-wider">BET BOOST »</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#F8FAFC] leading-tight">{card.title}</p>
              {card.subtitle && (
                <p className="text-[11px] text-[#94A3B8]/60 mt-0.5 leading-tight">{card.subtitle}</p>
              )}
              <p className="text-[10px] text-[#94A3B8]/40 mt-1">{card.matchName}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-auto pt-1">
              <span className="text-[11px] text-[#94A3B8]/50 tabular-nums line-through">{card.baseOdds.toFixed(2)}</span>
              <span className="text-[10px] text-[#94A3B8]/30">»</span>
              <span className="text-[14px] font-bold text-[#00DFA9] tabular-nums">{card.boostedOdds.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-[#94A3B8]/40">{card.exampleReturn}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── In-Play section ───────────────────────────────────────────────────────────

function InPlaySection({ items }: { items: NonNullable<typeof import('../data/sportDetailData').SPORT_DETAIL_CONFIGS[string]['inPlayItems']> }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
        <span className="text-[13px] font-bold text-[#EF4444]">In-Play</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#EF4444]/20 to-transparent" />
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <div
            key={item.id}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-[#121821] border border-[#253241] hover:border-[#EF4444]/25 cursor-pointer transition-all duration-150"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
            <span className="flex-1 text-[13px] font-medium text-[#D1D9E2] group-hover:text-[#F8FAFC] transition-colors">{item.name}</span>
            <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]/30 group-hover:text-[#94A3B8]/60 shrink-0 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Match Coupon section ──────────────────────────────────────────────────────

function MatchCouponSection({ items }: { items: NonNullable<typeof import('../data/sportDetailData').SPORT_DETAIL_CONFIGS[string]['matchCouponItems']> }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-bold text-[#F8FAFC]">Match Coupon</span>
        <div className="flex-1 h-px bg-[#253241]/60" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
        {items.map(item => (
          <div
            key={item.id}
            className="group flex items-center gap-2 py-2.5 border-b border-[#253241]/40 cursor-pointer hover:bg-[#121821] px-2 rounded transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]/30 group-hover:text-[#94A3B8]/60 shrink-0 transition-colors" />
            <span className="text-[13px] text-[#94A3B8]/70 group-hover:text-[#F8FAFC] transition-colors">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Match Lists section (Esports) ─────────────────────────────────────────────

function MatchListsSection({ items }: { items: NonNullable<typeof import('../data/sportDetailData').SPORT_DETAIL_CONFIGS[string]['matchLists']> }) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Gamepad2 className="h-3.5 w-3.5 text-[#94A3B8]/60" />
        <span className="text-[13px] font-bold text-[#F8FAFC]">Match Lists</span>
        <div className="flex-1 h-px bg-[#253241]/60" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0">
        {items.map(item => (
          <div
            key={item.id}
            className="group flex items-center justify-between py-3 border-b border-[#253241]/40 cursor-pointer hover:bg-[#121821] px-2 rounded transition-all"
          >
            <span className={cn(
              'text-[13px] font-medium transition-colors',
              item.isHighlighted ? 'text-[#D1D9E2]' : 'text-[#94A3B8]/65 group-hover:text-[#D1D9E2]'
            )}>
              {item.name}
            </span>
            {item.count != null && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#F8FAFC] bg-[#00DFA9]/20 border border-[#00DFA9]/30 px-1.5 py-0.5 rounded-sm">
                {item.count}
                <ChevronRight className="h-2.5 w-2.5 text-[#00DFA9]/60" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Boxing competitions in coupons (collapsible) ──────────────────────────────

function BoxingCompSection({ sportId }: { sportId: string }) {
  const [open, setOpen] = useState(false);
  const config = SPORT_DETAIL_CONFIGS[sportId];
  if (!config.competitions.length) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-[#121821] border border-[#253241] hover:border-[#2E3D50] transition-all"
      >
        <span className="text-[14px] font-bold text-[#F8FAFC]">{config.name}</span>
        <ChevronDown className={cn('h-4 w-4 text-[#94A3B8]/60 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-1 bg-[#121821] rounded-xl border border-[#253241] overflow-hidden">
          {config.competitions.map((comp, i) => (
            <div
              key={comp.id}
              className={cn(
                'group flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-[#18212B] transition-all',
                i < config.competitions.length - 1 && 'border-b border-[#253241]/40'
              )}
            >
              <span className="text-lg leading-none w-6 text-center shrink-0">
                {comp.countryCode ? flag(comp.countryCode) : '🌐'}
              </span>
              <span className="flex-1 text-[14px] font-medium text-[#D1D9E2] group-hover:text-[#F8FAFC] transition-colors">{comp.name}</span>
              <ChevronRight className="h-4 w-4 text-[#94A3B8]/30 group-hover:text-[#94A3B8]/70 shrink-0 transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main tab (Featured / Coupons / Matches) ───────────────────────────────────

function MainTab({
  sportId, leagues, lastUpdatedLabel, onRefresh, isRefreshing,
}: {
  sportId: string; leagues: League[]; lastUpdatedLabel: string;
  onRefresh: () => void; isRefreshing?: boolean;
}) {
  const config = SPORT_DETAIL_CONFIGS[sportId];

  const groups = useMemo(() => {
    if (leagues.length > 0) {
      return leagues.map(l => ({
        leagueName:  l.name,
        countryCode: l.countryCode ?? '',
        matches:     l.matches.map(m => ({
          id: m.id, team1: m.team1, team2: m.team2,
          leagueName: l.name, dateLabel: m.date,
          odds1: m.odds.home, odds2: m.odds.away, oddsDraw: m.odds.draw,
          isLive: m.isLive,
          sportKey: m.sportKey ?? m.sportId ?? '',
          sportId: m.sportId,
        } satisfies MockMatchCard)),
      }));
    }
    const map = new Map<string, MockMatchCard[]>();
    for (const m of config.mockMatches) {
      const arr = map.get(m.leagueName) ?? [];
      arr.push(m);
      map.set(m.leagueName, arr);
    }
    return Array.from(map.entries()).map(([leagueName, matches]) => {
      const comp = config.competitions.find(c => c.name === leagueName);
      return { leagueName, countryCode: comp?.countryCode ?? '', matches };
    });
  }, [leagues, config]);

  const hasData = groups.some(g => g.matches.length > 0);
  const featuredLabel = config.featuredSectionLabel ?? 'Featured Matches';

  return (
    <div className="px-5 py-4">
      {/* Status row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isRefreshing && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]/50">
              <RefreshCw className="h-3 w-3 animate-spin" /> Updating…
            </span>
          )}
          {!isRefreshing && lastUpdatedLabel && (
            <span className="text-[10px] text-[#94A3B8]/40 font-medium">{lastUpdatedLabel}</span>
          )}
        </div>
        <button
          onClick={onRefresh} disabled={isRefreshing}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold border border-[#253241] text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-[#121821] disabled:opacity-30 transition-all"
        >
          <RefreshCw className={cn('h-2.5 w-2.5', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {hasData ? (
        <div className="space-y-6">
          {/* Featured section header */}
          <div>
            <SectionHeader label={featuredLabel} />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {groups.flatMap(g => g.matches).slice(0, 6).map(match => (
                <MatchCard key={match.id} match={match} leagueName={match.leagueName} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-16 px-6 bg-[#121821] rounded-xl border border-[#253241]">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#18212B] border border-[#253241] mb-4">
            <span className="text-2xl">{config.emoji}</span>
          </div>
          <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5">No upcoming events</p>
          <p className="text-[13px] text-[#94A3B8]/55 mb-4">
            Check back closer to the season or browse competitions below.
          </p>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#253241] text-[#F8FAFC] hover:bg-[#2E3D50] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh data
          </button>
        </div>
      )}

      {/* Optional sections */}
      {config.inPlayItems && config.inPlayItems.length > 0 && (
        <InPlaySection items={config.inPlayItems} />
      )}
      {config.betBoostCards && config.betBoostCards.length > 0 && (
        <BetBoostSection cards={config.betBoostCards} />
      )}
      {config.matchCouponItems && config.matchCouponItems.length > 0 && (
        <MatchCouponSection items={config.matchCouponItems} />
      )}
      {config.matchLists && config.matchLists.length > 0 && (
        <MatchListsSection items={config.matchLists} />
      )}
      {config.showCompInCoupons && (
        <BoxingCompSection sportId={sportId} />
      )}
    </div>
  );
}

// ── Competitions tab ──────────────────────────────────────────────────────────

function CompetitionsTab({ sportId }: { sportId: string }) {
  const config = SPORT_DETAIL_CONFIGS[sportId];
  if (!config.competitions.length) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#18212B] border border-[#253241] mb-4">
          <Trophy className="h-6 w-6 text-[#94A3B8]/30" />
        </div>
        <p className="text-[14px] text-[#94A3B8]/50">No competitions listed</p>
      </div>
    );
  }
  return (
    <div className="py-2">
      {config.competitions.map((comp, i) => (
        <div
          key={comp.id}
          className={cn(
            'group flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150 hover:bg-[#121821]',
            i < config.competitions.length - 1 && 'border-b border-[#253241]/40'
          )}
        >
          <span className="text-xl leading-none w-7 text-center shrink-0">
            {comp.countryCode ? flag(comp.countryCode) : '🌐'}
          </span>
          <span className="flex-1 text-[14px] font-medium text-[#D1D9E2] group-hover:text-[#F8FAFC] transition-colors">{comp.name}</span>
          {comp.matchCount != null && (
            <span className="text-[11px] font-semibold text-[#94A3B8]/45 tabular-nums mr-1">{comp.matchCount}</span>
          )}
          <ChevronRight className="h-4 w-4 text-[#94A3B8]/30 group-hover:text-[#94A3B8]/70 shrink-0 transition-colors" />
        </div>
      ))}
    </div>
  );
}

// ── Futures / Outrights tab ───────────────────────────────────────────────────

function FuturesTab({ sportId }: { sportId: string }) {
  const config = SPORT_DETAIL_CONFIGS[sportId];
  return (
    <div className="py-2">
      {config.futuresMarkets.map((market, i) => (
        <div
          key={market}
          className={cn(
            'group flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all duration-150 hover:bg-[#121821]',
            i < config.futuresMarkets.length - 1 && 'border-b border-[#253241]/40'
          )}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#18212B] border border-[#253241] shrink-0">
            <Trophy className="h-3.5 w-3.5 text-[#FACC15]/60" />
          </div>
          <span className="flex-1 text-[14px] font-medium text-[#D1D9E2] group-hover:text-[#F8FAFC] transition-colors">{market}</span>
          <ChevronRight className="h-4 w-4 text-[#94A3B8]/30 group-hover:text-[#94A3B8]/70 shrink-0 transition-colors" />
        </div>
      ))}
    </div>
  );
}

// ── Offers tab ────────────────────────────────────────────────────────────────

function OffersTab({ sportId }: { sportId: string }) {
  const config = SPORT_DETAIL_CONFIGS[sportId];
  const offers = [
    { id: 'acca-boost',   title: 'Acca Boost',       desc: `Get up to 70% extra winnings on your ${config.name} accumulators with 3+ selections.`, tag: 'Popular',    color: '#00DFA9' },
    { id: 'early-payout', title: 'Early Payout Offer',desc: `If your ${config.name} selection goes 2 scores ahead — we pay you out early as a winner.`, tag: 'Best Value', color: '#38BDF8' },
    { id: 'same-game',    title: 'Same Game Multi',   desc: `Combine multiple selections from the same ${config.name} match for a boosted multi-bet.`, tag: 'New',        color: '#A78BFA' },
  ];
  return (
    <div className="px-5 py-4 space-y-3">
      {offers.map(offer => (
        <div
          key={offer.id}
          style={{ borderColor: `${offer.color}25` }}
          className="group flex items-start gap-4 p-4 rounded-xl bg-[#121821] border cursor-pointer hover:bg-[#18212B] transition-all duration-150"
        >
          <div
            style={{ backgroundColor: `${offer.color}15`, borderColor: `${offer.color}30` }}
            className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 mt-0.5"
          >
            <Tag className="h-4 w-4" style={{ color: offer.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] font-semibold text-[#F8FAFC]">{offer.title}</span>
              <span style={{ color: offer.color, backgroundColor: `${offer.color}15` }} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                {offer.tag}
              </span>
            </div>
            <p className="text-[12px] text-[#94A3B8]/65 leading-relaxed">{offer.desc}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#94A3B8]/30 group-hover:text-[#94A3B8]/60 shrink-0 mt-1 transition-colors" />
        </div>
      ))}
    </div>
  );
}

// ── Free Games tab (Basketball) ───────────────────────────────────────────────

function FreeGamesTab() {
  const games = [
    { id: 'sg_1', title: 'Score Predictor',      desc: 'Predict the final score of tonights NBA game and win a free bet.',   icon: '🎯', color: '#00DFA9' },
    { id: 'sg_2', title: 'Fantasy Pick\'em',     desc: 'Select your top 5 players for todays slate and compete for prizes.', icon: '⭐', color: '#38BDF8' },
    { id: 'sg_3', title: 'Top Scorer Challenge', desc: 'Pick the top scorer across all games tonight for a cash reward.',    icon: '🏆', color: '#FACC15' },
    { id: 'sg_4', title: 'Half-time Predictor',  desc: 'Predict half-time leaders in 3 games and earn free bet credits.',   icon: '⏱️', color: '#A78BFA' },
  ];
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-4">
        <MonitorPlay className="h-4 w-4 text-[#00DFA9]" />
        <span className="text-[14px] font-bold text-[#F8FAFC]">Free to Play Games</span>
        <span className="text-[9px] font-bold text-[#00DFA9] bg-[#00DFA9]/15 border border-[#00DFA9]/25 px-1.5 py-0.5 rounded uppercase tracking-wider">
          Free Entry
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {games.map(game => (
          <div
            key={game.id}
            style={{ borderColor: `${game.color}20` }}
            className="group flex items-start gap-3 p-4 rounded-xl bg-[#121821] border cursor-pointer hover:bg-[#18212B] transition-all"
          >
            <div
              style={{ backgroundColor: `${game.color}12` }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            >
              {game.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#F8FAFC] mb-0.5">{game.title}</p>
              <p className="text-[12px] text-[#94A3B8]/55 leading-relaxed">{game.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function SportDetailPage({
  sportId, leagues, onBack, lastUpdatedLabel, onRefresh, isRefreshing,
}: Props) {
  const config = SPORT_DETAIL_CONFIGS[sportId];
  if (!config) return null;

  const [activeTab, setActiveTab] = useState<TabId>(config.defaultTab);

  const liveCount = useMemo(
    () => config.mockMatches.filter(m => m.isLive).length +
          leagues.flatMap(l => l.matches).filter(m => m.isLive).length,
    [config, leagues]
  );

  function renderTabContent() {
    switch (activeTab) {
      case 'featured':
      case 'coupons':
      case 'matches':
        return (
          <MainTab
            sportId={sportId} leagues={leagues}
            lastUpdatedLabel={lastUpdatedLabel}
            onRefresh={onRefresh} isRefreshing={isRefreshing}
          />
        );
      case 'competitions':
        return <CompetitionsTab sportId={sportId} />;
      case 'futures':
      case 'outrights':
        return <FuturesTab sportId={sportId} />;
      case 'offers':
        return <OffersTab sportId={sportId} />;
      case 'freeGames':
        return <FreeGamesTab />;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#253241]/60">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#18212B] border border-[#253241] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241] transition-all duration-150 shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl leading-none">{config.emoji}</span>
          <h1 className="text-[17px] font-bold text-[#F8FAFC]">{config.name}</h1>
          {liveCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/25 px-1.5 py-0.5 rounded-full">
              <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
              {liveCount} Live
            </span>
          )}
        </div>

        <button
          onClick={onRefresh} disabled={isRefreshing}
          title="Refresh data"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[#94A3B8]/50 hover:text-[#00DFA9] hover:bg-[#00DFA9]/8 disabled:opacity-30 transition-all duration-150"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[#253241]/60 bg-[#0B0F14] sticky top-0 z-10 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {config.tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-5 py-3 text-[13px] font-semibold transition-all duration-150 whitespace-nowrap shrink-0',
              activeTab === tab.id
                ? 'text-[#F8FAFC]'
                : 'text-[#94A3B8]/55 hover:text-[#94A3B8]/90'
            )}
          >
            {tab.label}
            {tab.id === 'featured' && liveCount > 0 && (
              <Flame className="h-3 w-3 text-[#EF4444]" />
            )}
            {(tab.id === 'futures' || tab.id === 'outrights') && (
              <Star className="h-2.5 w-2.5 text-[#FACC15]/60" />
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-[#00DFA9] shadow-[0_0_8px_rgba(0,223,169,0.6)]" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      {renderTabContent()}

    </div>
  );
}

export { SPORT_DETAIL_IDS };
