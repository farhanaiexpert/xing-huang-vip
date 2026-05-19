/**
 * SPORT DETAIL PAGE
 * Bet365-style sport page with Featured / Competitions / Futures / Offers tabs.
 * Rendered by MainContent when a "sport detail" sport ID is selected.
 */
import { useState, useMemo } from 'react';
import { ArrowLeft, RefreshCw, ChevronRight, Trophy, Tag, Star, Flame } from 'lucide-react';
import { cn } from '../lib/utils';
import type { League } from '../types';
import { SPORT_DETAIL_CONFIGS, SPORT_DETAIL_IDS, type MockMatchCard } from '../data/sportDetailData';
import { useBetSlip } from '../hooks/useBetSlip';

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = 'featured' | 'competitions' | 'futures' | 'offers';

interface Props {
  sportId:          string;
  leagues:          League[];
  onBack:           () => void;
  lastUpdatedLabel: string;
  onRefresh:        () => void;
  isRefreshing?:    boolean;
}

// ── Flag helper ────────────────────────────────────────────────────────────────

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

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'featured',     label: 'Featured'      },
  { id: 'competitions', label: 'Competitions'  },
  { id: 'futures',      label: 'Futures'       },
  { id: 'offers',       label: 'Offers'        },
];

// ── Odds button ───────────────────────────────────────────────────────────────

function OddsButton({
  label, odds, selectionId, marketId, matchId, matchName, leagueName, selectionName,
}: {
  label: string; odds: number; selectionId: string; marketId: string;
  matchId: string; matchName: string; leagueName: string; selectionName: string;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const active = hasSelection(selectionId);

  function toggle() {
    if (active) {
      removeSelection(selectionId);
    } else {
      addSelection({
        id:            selectionId,
        marketId,
        matchId,
        matchName,
        leagueName,
        marketName:    'Match Result',
        selectionType: label,
        selectionName,
        odds,
      });
    }
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

// ── Match card (Featured grid item) ──────────────────────────────────────────

function MatchCard({ match, leagueName }: { match: MockMatchCard; leagueName: string }) {
  const marketId = `${match.id}_h2h`;
  const matchName = `${match.team1} v ${match.team2}`;

  return (
    <div className={cn(
      'bg-[#121821] rounded-xl border transition-all duration-200',
      match.isLive
        ? 'border-[#EF4444]/30 shadow-[0_0_16px_rgba(239,68,68,0.08)]'
        : 'border-[#253241] hover:border-[#2E3D50]'
    )}>
      {/* Live badge */}
      {match.isLive && (
        <div className="px-3 pt-2.5 pb-0 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
          <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider">Live</span>
        </div>
      )}

      {/* Teams */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex flex-col gap-1.5 min-h-[48px]">
          <p className="text-[13px] font-semibold text-[#F8FAFC] leading-tight truncate">{match.team1}</p>
          <p className="text-[13px] font-semibold text-[#F8FAFC] leading-tight truncate">{match.team2}</p>
        </div>
        <p className="text-[11px] text-[#94A3B8]/55 mt-1.5 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-[#38BDF8]/40" />
          {match.dateLabel}
        </p>
      </div>

      {/* Odds */}
      <div className="px-3 pb-3 flex gap-2">
        <OddsButton
          label="1" odds={match.odds1}
          selectionId={`${match.id}_1`} marketId={marketId}
          matchId={match.id} matchName={matchName} leagueName={leagueName}
          selectionName={match.team1}
        />
        {match.oddsDraw != null && (
          <OddsButton
            label="X" odds={match.oddsDraw}
            selectionId={`${match.id}_x`} marketId={marketId}
            matchId={match.id} matchName={matchName} leagueName={leagueName}
            selectionName="Draw"
          />
        )}
        <OddsButton
          label="2" odds={match.odds2}
          selectionId={`${match.id}_2`} marketId={marketId}
          matchId={match.id} matchName={matchName} leagueName={leagueName}
          selectionName={match.team2}
        />
      </div>
    </div>
  );
}

// ── Featured tab ──────────────────────────────────────────────────────────────

function FeaturedTab({
  sportId, leagues, lastUpdatedLabel, onRefresh, isRefreshing,
}: {
  sportId: string; leagues: League[]; lastUpdatedLabel: string;
  onRefresh: () => void; isRefreshing?: boolean;
}) {
  const config = SPORT_DETAIL_CONFIGS[sportId];

  // Build match groups: prefer real API leagues, fall back to mock matches
  const groups = useMemo(() => {
    if (leagues.length > 0) {
      // Use real API data — group by league
      return leagues.map(l => ({
        leagueName:  l.name,
        countryCode: l.countryCode ?? '',
        matches:     l.matches.map(m => ({
          id:        m.id,
          team1:     m.team1,
          team2:     m.team2,
          leagueName: l.name,
          dateLabel: m.date,
          odds1:     m.odds.home,
          odds2:     m.odds.away,
          oddsDraw:  m.odds.draw,
          isLive:    m.isLive,
        } satisfies MockMatchCard)),
      }));
    }
    // Fall back to mock matches grouped by leagueName
    const map = new Map<string, MockMatchCard[]>();
    for (const m of config.mockMatches) {
      const arr = map.get(m.leagueName) ?? [];
      arr.push(m);
      map.set(m.leagueName, arr);
    }
    // Infer countryCode from competitions config
    return Array.from(map.entries()).map(([leagueName, matches]) => {
      const comp = config.competitions.find(c => c.name === leagueName);
      return { leagueName, countryCode: comp?.countryCode ?? '', matches };
    });
  }, [leagues, config]);

  const hasData = groups.some(g => g.matches.length > 0);

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
            <span className="text-[10px] text-[#94A3B8]/45 font-medium">{lastUpdatedLabel}</span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold border border-[#253241] text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-[#121821] disabled:opacity-30 transition-all"
        >
          <RefreshCw className={cn('h-2.5 w-2.5', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {hasData ? (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.leagueName}>
              {/* League header */}
              <div className="flex items-center gap-2 mb-3">
                {group.countryCode && (
                  <span className="text-base leading-none">{flag(group.countryCode)}</span>
                )}
                <span className="text-[13px] font-bold text-[#00DFA9]">{group.leagueName}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#00DFA9]/20 to-transparent ml-1" />
              </div>
              {/* Match card grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.matches.map(match => (
                  <MatchCard key={match.id} match={match} leagueName={group.leagueName} />
                ))}
              </div>
            </div>
          ))}
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
    </div>
  );
}

// ── Competitions tab ──────────────────────────────────────────────────────────

function CompetitionsTab({ sportId }: { sportId: string }) {
  const config = SPORT_DETAIL_CONFIGS[sportId];

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
          <span className="flex-1 text-[14px] font-medium text-[#D1D9E2] group-hover:text-[#F8FAFC] transition-colors">
            {comp.name}
          </span>
          {comp.matchCount != null && (
            <span className="text-[11px] font-semibold text-[#94A3B8]/45 tabular-nums mr-1">
              {comp.matchCount}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-[#94A3B8]/30 group-hover:text-[#94A3B8]/70 shrink-0 transition-colors" />
        </div>
      ))}
    </div>
  );
}

// ── Futures tab ───────────────────────────────────────────────────────────────

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
          <span className="flex-1 text-[14px] font-medium text-[#D1D9E2] group-hover:text-[#F8FAFC] transition-colors">
            {market}
          </span>
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
    {
      id: 'acca-boost',
      title: 'Acca Boost',
      desc: `Get up to 70% extra winnings on your ${config.name} accumulators with 3+ selections.`,
      tag: 'Popular',
      color: '#00DFA9',
    },
    {
      id: 'early-payout',
      title: 'Early Payout Offer',
      desc: `If your ${config.name} selection goes 2 goals/scores ahead — we pay you out early as a winner.`,
      tag: 'Best Value',
      color: '#38BDF8',
    },
    {
      id: 'same-game',
      title: 'Same Game Multi',
      desc: `Combine multiple selections from the same ${config.name} match for a boosted multi-bet.`,
      tag: 'New',
      color: '#A78BFA',
    },
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
              <span
                style={{ color: offer.color, backgroundColor: `${offer.color}15` }}
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              >
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
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh data"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[#94A3B8]/50 hover:text-[#00DFA9] hover:bg-[#00DFA9]/8 disabled:opacity-30 transition-all duration-150"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[#253241]/60 bg-[#0B0F14] sticky top-0 z-10">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-5 py-3 text-[13px] font-semibold transition-all duration-150 whitespace-nowrap',
              activeTab === tab.id
                ? 'text-[#F8FAFC]'
                : 'text-[#94A3B8]/55 hover:text-[#94A3B8]/90'
            )}
          >
            {tab.label}
            {tab.id === 'featured' && liveCount > 0 && (
              <Flame className="h-3 w-3 text-[#EF4444]" />
            )}
            {tab.id === 'futures' && (
              <Star className="h-2.5 w-2.5 text-[#FACC15]/60" />
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-[#00DFA9] shadow-[0_0_8px_rgba(0,223,169,0.6)]" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────────────── */}
      {activeTab === 'featured' && (
        <FeaturedTab
          sportId={sportId}
          leagues={leagues}
          lastUpdatedLabel={lastUpdatedLabel}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}
      {activeTab === 'competitions' && <CompetitionsTab sportId={sportId} />}
      {activeTab === 'futures'      && <FuturesTab sportId={sportId} />}
      {activeTab === 'offers'       && <OffersTab sportId={sportId} />}

    </div>
  );
}

export { SPORT_DETAIL_IDS };
