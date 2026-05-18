import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'wouter';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { LEAGUES } from '../data/mockData';
import { LeagueSection } from './LeagueSection';
import { FeaturedCards } from './FeaturedCards';
import { PopularBets } from './PopularBets';
import { SkeletonLeague } from './SkeletonLeague';
import { UpcomingRaces } from './UpcomingRaces';
import { cn } from '../lib/utils';
import { Search, X, TrendingUp, ChevronRight, ShieldCheck, Lock, Zap, Users, BarChart2, Award, Twitter, Github, Instagram, ExternalLink } from 'lucide-react';
import { Input } from './ui/input';
import { League } from '../types';

interface MainContentProps {
  selectedSportId: string | null;
  onSelectSport: (id: string | null) => void;
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'upcoming';

const CAROUSEL_SPORTS = [
  { id: 'soccer',            name: 'Soccer',       icon: '⚽', count: 284 },
  { id: 'tennis',            name: 'Tennis',       icon: '🎾', count: 96  },
  { id: 'basketball',        name: 'Basketball',   icon: '🏀', count: 42  },
  { id: 'cricket',           name: 'Cricket',      icon: '🏏', count: 18  },
  { id: 'esports',           name: 'Esports',      icon: '🎮', count: 63  },
  { id: 'horse-racing',      name: 'Horse Racing', icon: '🏇', count: 195 },
  { id: 'formula-1',         name: 'Formula 1',    icon: '🏎️', count: 12  },
  { id: 'boxing',            name: 'Boxing',       icon: '🥊', count: 8   },
  { id: 'golf',              name: 'Golf',         icon: '⛳', count: 24  },
  { id: 'darts',             name: 'Darts',        icon: '🎯', count: 31  },
  { id: 'ice-hockey',        name: 'Ice Hockey',   icon: '🏒', count: 54  },
  { id: 'mma',               name: 'MMA',          icon: '🥋', count: 14  },
  { id: 'nba',               name: 'NBA',          icon: '🏀', count: 22  },
  { id: 'american-football', name: 'NFL',          icon: '🏈', count: 16  },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'today',    label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'upcoming', label: 'Upcoming' },
];

const PROMO_PILLS = [
  { id: 'early-payout', label: 'Early Payout', color: '#38BDF8' },
  { id: 'acca-boost',   label: 'Acca Boost',   color: '#00DFA9' },
];

// ── Stable "last updated" timestamp ─────────────────────────────────────────
const UPDATED_AT = new Date();

export function MainContent({ selectedSportId, onSelectSport }: MainContentProps) {
  const [dateFilter,  setDateFilter] = useState<DateFilter>('all');
  const [search,      setSearch]     = useState('');
  const [isLoading,   setIsLoading]  = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // Simulate initial data load
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  // ⌘K / Ctrl+K → focus search
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearch('');
        searchRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    searchRef.current?.focus();
  }, []);

  // Count live matches
  const liveCount = useMemo(
    () => LEAGUES.flatMap(l => l.matches).filter(m => m.isLive).length,
    []
  );

  // Filtered leagues
  const filteredLeagues = useMemo<League[]>(() => {
    let leagues = LEAGUES;

    if (selectedSportId && !['all', 'early-payout', 'acca-boost'].includes(selectedSportId)) {
      leagues = leagues.filter(l =>
        l.sportId === selectedSportId ||
        l.sportId === `sp_${selectedSportId.replace('-', '_')}`
      );
    }

    if (dateFilter !== 'all') {
      leagues = leagues
        .map(l => ({ ...l, matches: l.matches.filter(m => m.dateTag === dateFilter) }))
        .filter(l => l.matches.length > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      leagues = leagues
        .map(l => ({
          ...l,
          matches: l.matches.filter(
            m =>
              m.team1.toLowerCase().includes(q) ||
              (m.team2 && m.team2.toLowerCase().includes(q)) ||
              l.name.toLowerCase().includes(q) ||
              (m.team1 + ' vs ' + m.team2).toLowerCase().includes(q)
          ),
        }))
        .filter(l => l.matches.length > 0);
    }

    return leagues;
  }, [selectedSportId, dateFilter, search]);

  const totalMatchCount = useMemo(
    () => filteredLeagues.reduce((acc, l) => acc + l.matches.length, 0),
    [filteredLeagues]
  );

  const showFeatured =
    !isLoading &&
    !search.trim() &&
    (!selectedSportId || selectedSportId === 'all' || selectedSportId === 'early-payout' || selectedSportId === 'acca-boost') &&
    dateFilter === 'all';

  const hasActiveFilter = !!search.trim() || (!!selectedSportId && selectedSportId !== 'all') || dateFilter !== 'all';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B0F14] overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden h-[calc(100vh-3.5rem)]" style={{ scrollbarWidth: 'none' }}>

        {/* ── Sticky controls ─────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-[#0B0F14]/97 backdrop-blur-md border-b border-[#253241]/60">

          {/* Search */}
          <div className="px-4 pt-3.5 pb-2.5">
            <div className="relative group max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/50 group-focus-within:text-[#00DFA9] transition-colors duration-200 pointer-events-none" />
              <Input
                ref={searchRef}
                className="w-full pl-9 pr-20 h-10 rounded-xl text-sm bg-[#121821] border border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-2 focus-visible:ring-[#00DFA9]/25 focus-visible:border-[#00DFA9]/50 transition-all duration-200"
                placeholder="Search events, teams or leagues…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-search"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {search ? (
                  <button
                    onClick={clearSearch}
                    data-testid="button-clear-search"
                    className="p-1 rounded-md text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-[#253241]/60 transition-all duration-150"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="text-[9px] text-[#94A3B8]/40 bg-[#1E2A38] border border-[#253241] px-1.5 py-0.5 rounded font-mono pointer-events-none select-none">
                    ⌘K
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* Sport carousel */}
          <div className="px-4 pb-2">
            <ScrollArea className="w-full">
              <div className="flex gap-1 w-max pb-1">
                {CAROUSEL_SPORTS.map(sport => {
                  const isActive = selectedSportId === sport.id;
                  return (
                    <button
                      key={sport.id}
                      onClick={() => onSelectSport(sport.id === selectedSportId ? null : sport.id)}
                      data-testid={`sport-tab-${sport.id}`}
                      className={cn(
                        'group flex flex-col items-center gap-1 py-2 px-2.5 rounded-xl min-w-[68px] transition-all duration-200 select-none',
                        isActive
                          ? 'bg-[#18212B] ring-1 ring-[#00DFA9]/40 shadow-[0_0_16px_rgba(0,223,169,0.1)]'
                          : 'hover:bg-[#121821]/80'
                      )}
                    >
                      <span className="text-xl leading-none">{sport.icon}</span>
                      <span className={cn(
                        'text-[11px] font-medium leading-none transition-colors',
                        isActive ? 'text-[#00DFA9]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                      )}>
                        {sport.name}
                      </span>
                      <span className={cn(
                        'text-[9px] font-semibold leading-none tabular-nums transition-colors',
                        isActive ? 'text-[#00DFA9]/60' : 'text-[#94A3B8]/35 group-hover:text-[#94A3B8]/60'
                      )}>
                        {sport.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          </div>

          {/* Filter bar */}
          <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#121821] rounded-lg p-0.5 border border-[#253241] gap-0.5">
              {DATE_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id)}
                  data-testid={`filter-${f.id}`}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150',
                    dateFilter === f.id
                      ? 'bg-[#253241] text-[#F8FAFC] shadow-sm'
                      : 'text-[#94A3B8]/60 hover:text-[#F8FAFC]'
                  )}
                >
                  {f.label}
                  {f.id === 'today' && liveCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#EF4444]">
                      <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                      {liveCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-[#253241] hidden sm:block" />

            {PROMO_PILLS.map(pill => {
              const isActive = selectedSportId === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => onSelectSport(isActive ? null : pill.id)}
                  style={isActive ? { borderColor: `${pill.color}40`, color: pill.color, backgroundColor: `${pill.color}10` } : {}}
                  className={cn(
                    'hidden sm:flex px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                    !isActive && 'bg-transparent text-[#94A3B8] border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC] hover:border-[#2E3D50]'
                  )}
                >
                  {pill.label}
                </button>
              );
            })}

            <button
              onClick={() => { onSelectSport(null); setDateFilter('all'); setSearch(''); }}
              className={cn(
                'hidden sm:flex px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                (!selectedSportId || selectedSportId === 'all')
                  ? 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/25'
                  : 'bg-transparent text-[#94A3B8] border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC]'
              )}
            >
              All Sports
            </button>

            {/* Results count — shows on the right when filtered */}
            {!isLoading && hasActiveFilter && (
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[#94A3B8]/60 font-medium select-none">
                <span className="text-[#F8FAFC]/80 font-bold">{totalMatchCount}</span>
                <span>event{totalMatchCount !== 1 ? 's' : ''}</span>
                {filteredLeagues.length > 0 && (
                  <>
                    <span className="text-[#253241]">·</span>
                    <span>{filteredLeagues.length} league{filteredLeagues.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2">

          {isLoading ? (
            /* ── Skeleton state ─────────────────────────────────── */
            <div className="space-y-3">
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-16 rounded-full bg-[#1E2A38] animate-pulse" />
                    <div className="h-px w-8 bg-[#253241]" />
                  </div>
                </div>
                <div className="flex gap-3">
                  {[290, 290, 290].map((w, i) => (
                    <div key={i} className="rounded-xl bg-[#18212B] border border-[#253241]/60 animate-pulse" style={{ width: w, height: 160, flexShrink: 0 }} />
                  ))}
                </div>
              </div>
              <SkeletonLeague rows={4} cols={3} />
              <SkeletonLeague rows={3} cols={2} />
              <SkeletonLeague rows={2} cols={3} />
            </div>
          ) : (
            <>
              {showFeatured && <FeaturedCards />}
              {showFeatured && <PopularBets />}

              {/* Live heading */}
              {dateFilter === 'today' && liveCount > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#EF4444]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                    {liveCount} Live Now
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#EF4444]/20 to-transparent" />
                </div>
              )}

              {/* Search results heading */}
              {search.trim() && filteredLeagues.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold text-[#94A3B8]/60 uppercase tracking-widest">
                    Results for
                  </span>
                  <span className="text-[11px] font-bold text-[#F8FAFC] bg-[#253241] px-2 py-0.5 rounded">&ldquo;{search}&rdquo;</span>
                  <div className="flex-1 h-px bg-[#253241]/50" />
                  <button
                    onClick={clearSearch}
                    className="text-[10px] font-medium text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors flex items-center gap-0.5"
                  >
                    Clear <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                {filteredLeagues.length > 0 ? (
                  filteredLeagues.map(league => (
                    <div key={league.id}>
                      <LeagueSection league={league} />
                      {/* Upcoming Races appears immediately after Ligue 1 */}
                      {!search.trim() && league.id === 'lg_ligue1' && <UpcomingRaces />}
                    </div>
                  ))
                ) : (
                  <NoResultsState search={search} onClear={clearSearch} onReset={() => { onSelectSport(null); setDateFilter('all'); setSearch(''); }} />
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Status bar ──────────────────────────────────────────────── */}
        {!isLoading && (
          <StatusBar
            matchCount={totalMatchCount}
            leagueCount={filteredLeagues.length}
            updatedAt={UPDATED_AT}
          />
        )}

        {/* ── Trust footer ────────────────────────────────────────────── */}
        {!isLoading && <TrustFooter />}

        {/* ── Site footer ─────────────────────────────────────────────── */}
        {!isLoading && <SiteFooter />}

      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// NO RESULTS STATE
// ────────────────────────────────────────────────────────────────────────────
function NoResultsState({
  search, onClear, onReset,
}: { search: string; onClear: () => void; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 bg-[#121821] rounded-xl border border-[#253241]">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-[#38BDF8]/5 blur-2xl scale-[2]" />
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center bg-[#18212B] border border-[#253241] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <TrendingUp className="h-7 w-7 text-[#94A3B8]/30" />
        </div>
      </div>

      {search ? (
        <>
          <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5">No matches found</p>
          <p className="text-sm text-[#94A3B8]/70 mb-5 max-w-xs leading-relaxed">
            No events matching <span className="text-[#F8FAFC] font-medium">&ldquo;{search}&rdquo;</span>. Try a different team, league, or sport name.
          </p>
          <button
            onClick={onClear}
            data-testid="button-clear-search-empty"
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#00DFA9] text-[#0B0F14] text-sm font-bold hover:shadow-[0_0_20px_rgba(0,223,169,0.35)] transition-all duration-150"
          >
            <X className="h-3.5 w-3.5" />
            Clear search
          </button>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5">No events available</p>
          <p className="text-sm text-[#94A3B8]/70 mb-5 max-w-xs leading-relaxed">
            There are no events matching your current filters. Try a different date or sport.
          </p>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#121821] border border-[#253241] text-[#F8FAFC] text-sm font-semibold hover:bg-[#18212B] transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            Reset filters
          </button>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SITE FOOTER
// ────────────────────────────────────────────────────────────────────────────
const FOOTER_SPORTS = [
  'Soccer', 'Tennis', 'Basketball', 'Cricket', 'Esports',
  'Horse Racing', 'Formula 1', 'Boxing', 'Golf', 'Darts',
  'Ice Hockey', 'MMA', 'American Football', 'Baseball',
];

const FOOTER_COLS = [
  {
    heading: 'Betting',
    links: [
      { label: 'In-Play Betting', href: '/' },
      { label: 'Bet Builder', href: '/' },
      { label: 'Accumulators', href: '/' },
      { label: 'Early Payout', href: '/' },
      { label: 'Acca Boost', href: '/' },
      { label: 'My Bet History', href: '/bet-history' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About OddsChain', href: '/' },
      { label: 'Blog', href: '/' },
      { label: 'Careers', href: '/' },
      { label: 'Press & Media', href: '/' },
      { label: 'Affiliate Program', href: '/' },
      { label: 'API for Operators', href: '/' },
    ],
  },
  {
    heading: 'Help & Legal',
    links: [
      { label: 'Help & Rules', href: '/help' },
      { label: 'Responsible Gambling', href: '/help' },
      { label: 'Self-Exclusion', href: '/help' },
      { label: 'Privacy Policy', href: '/' },
      { label: 'Terms & Conditions', href: '/' },
      { label: 'Cookie Policy', href: '/' },
      { label: 'AML Policy', href: '/' },
    ],
  },
];

const PAYMENT_METHODS = ['Visa', 'Mastercard', 'Bitcoin', 'Ethereum', 'Litecoin', 'PayPal', 'Skrill', 'Neteller', 'Bank Transfer'];

function SiteFooter() {
  return (
    <footer className="border-t border-[#253241] bg-[#0B0F14] mt-2">
      {/* Main grid */}
      <div className="px-6 pt-8 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">

          {/* Brand column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00DFA9]/15 border border-[#00DFA9]/30 flex items-center justify-center">
                <BarChart2 className="h-3.5 w-3.5 text-[#00DFA9]" />
              </div>
              <span className="font-black text-[#F8FAFC] tracking-tight text-sm">OddsChain</span>
            </div>
            <p className="text-[11px] text-[#94A3B8]/60 leading-relaxed">
              Next-generation sports trading platform. Live odds, instant settlement, and provably fair markets.
            </p>
            {/* License badge */}
            <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-[#121821] border border-[#253241]">
              <ShieldCheck className="h-3 w-3 text-[#00DFA9] mt-0.5 shrink-0" />
              <p className="text-[9px] text-[#94A3B8]/50 leading-snug">
                Licensed &amp; regulated by the Malta Gaming Authority (MGA/B2C/123/2021). Gambling can be addictive — play responsibly.
              </p>
            </div>
            {/* Social icons */}
            <div className="flex items-center gap-2">
              {[
                { icon: <Twitter className="h-3.5 w-3.5" />, label: 'Twitter' },
                { icon: <Instagram className="h-3.5 w-3.5" />, label: 'Instagram' },
                { icon: <Github className="h-3.5 w-3.5" />, label: 'GitHub' },
              ].map((s) => (
                <button
                  key={s.label}
                  aria-label={s.label}
                  className="w-7 h-7 rounded-lg border border-[#253241] bg-[#121821] flex items-center justify-center text-[#94A3B8]/50 hover:text-[#00DFA9] hover:border-[#00DFA9]/40 transition-colors duration-150"
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Sports column */}
          <div>
            <p className="text-[10px] font-bold text-[#94A3B8]/40 uppercase tracking-widest mb-3">Sports</p>
            <ul className="space-y-1.5">
              {FOOTER_SPORTS.map((sport) => (
                <li key={sport}>
                  <span className="text-[11px] text-[#94A3B8]/55 hover:text-[#00DFA9] cursor-pointer transition-colors duration-150 flex items-center gap-1 group">
                    <ChevronRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#00DFA9] -ml-0.5" />
                    {sport}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <p className="text-[10px] font-bold text-[#94A3B8]/40 uppercase tracking-widest mb-3">{col.heading}</p>
              <ul className="space-y-1.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[11px] text-[#94A3B8]/55 hover:text-[#00DFA9] transition-colors duration-150 flex items-center gap-1 group"
                    >
                      <ChevronRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#00DFA9] -ml-0.5" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div className="mt-8 pt-6 border-t border-[#253241]/60">
          <p className="text-[10px] font-bold text-[#94A3B8]/30 uppercase tracking-widest mb-3">Accepted Payment Methods</p>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map((method) => (
              <span
                key={method}
                className="px-2.5 py-1 rounded-md bg-[#121821] border border-[#253241]/70 text-[10px] font-medium text-[#94A3B8]/50"
              >
                {method}
              </span>
            ))}
          </div>
        </div>

        {/* Responsible gambling logos row */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {['18+', 'BeGambleAware', 'GamStop', 'GamCare', 'Gambling Therapy'].map((badge) => (
            <div key={badge} className="flex items-center gap-1 px-2 py-1 rounded border border-[#253241]/50 bg-[#0A0E13]">
              <Lock className="h-2.5 w-2.5 text-[#94A3B8]/30" />
              <span className="text-[9px] font-semibold text-[#94A3B8]/35">{badge}</span>
            </div>
          ))}
          <div className="flex-1" />
          <a
            href="#"
            className="flex items-center gap-1 text-[9px] text-[#94A3B8]/30 hover:text-[#94A3B8]/50 transition-colors"
          >
            Sitemap <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#253241]/40 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[9px] text-[#94A3B8]/25">
          © 2021–2026 OddsChain Ltd. All rights reserved. Registered in Malta. VAT MT12345678.
        </p>
        <p className="text-[9px] text-[#94A3B8]/20">
          Odds are subject to change. Past results do not guarantee future outcomes. For entertainment purposes only.
        </p>
      </div>
    </footer>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TRUST FOOTER
// ────────────────────────────────────────────────────────────────────────────
const TRUST_STATS = [
  { icon: <BarChart2   className="h-4 w-4" />, value: '$2.4B+',    label: 'Volume Wagered',  color: 'text-[#00DFA9]', glow: 'rgba(0,223,169,0.10)' },
  { icon: <Users       className="h-4 w-4" />, value: '142,000+',  label: 'Active Users',    color: 'text-[#38BDF8]', glow: 'rgba(56,189,248,0.10)' },
  { icon: <Zap         className="h-4 w-4" />, value: '< 0.3s',    label: 'Avg Settlement',  color: 'text-[#FACC15]', glow: 'rgba(250,204,21,0.10)' },
  { icon: <Award       className="h-4 w-4" />, value: 'Est. 2021', label: '5 Yrs Operating', color: 'text-[#A78BFA]', glow: 'rgba(167,139,250,0.10)' },
];

const TRUST_BADGES = [
  { icon: <Lock        className="h-3 w-3" />, label: 'SSL 256-bit' },
  { icon: <ShieldCheck className="h-3 w-3" />, label: 'Provably Fair' },
  { icon: <ShieldCheck className="h-3 w-3" />, label: 'KYC Verified' },
  { icon: <Zap         className="h-3 w-3" />, label: 'Instant Payouts' },
];

function TrustFooter() {
  return (
    <div className="mx-4 mb-6 mt-2 space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TRUST_STATS.map((stat, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 rounded-xl bg-[#121821] border border-[#253241] px-3 py-3 hover:border-[#2E3D50] transition-colors duration-200"
            style={{ boxShadow: `inset 0 0 20px ${stat.glow}` }}
          >
            <div className={cn('shrink-0', stat.color)}>{stat.icon}</div>
            <div className="min-w-0">
              <p className={cn('text-sm font-black leading-none tabular-nums', stat.color)}>{stat.value}</p>
              <p className="text-[10px] text-[#94A3B8]/50 mt-1.5 leading-none truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Security badges + small print */}
      <div className="flex items-center gap-2 flex-wrap">
        {TRUST_BADGES.map((badge, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0A0E13] border border-[#253241]/60 text-[10px] font-medium text-[#94A3B8]/60"
          >
            <span className="text-[#00DFA9]/70">{badge.icon}</span>
            {badge.label}
          </div>
        ))}
        <div className="flex-1" />
        <p className="text-[9px] text-[#94A3B8]/25 leading-none whitespace-nowrap">
          OddsChain · For entertainment purposes
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// STATUS BAR
// ────────────────────────────────────────────────────────────────────────────
function StatusBar({
  matchCount, leagueCount, updatedAt,
}: { matchCount: number; leagueCount: number; updatedAt: Date }) {
  const timeStr = updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mx-4 mb-6 mt-4 flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-[#0A0E13] border border-[#253241]/40">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]/50 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] shadow-[0_0_4px_rgba(0,223,169,0.7)]" />
          Live
        </span>
        <span className="text-[10px] text-[#253241]">|</span>
        <span className="text-[10px] text-[#94A3B8]/40 tabular-nums">
          <span className="text-[#94A3B8]/70 font-semibold">{matchCount}</span> event{matchCount !== 1 ? 's' : ''}
          {leagueCount > 0 && <> · <span className="text-[#94A3B8]/70 font-semibold">{leagueCount}</span> league{leagueCount !== 1 ? 's' : ''}</>}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-[#94A3B8]/30">Odds updated {timeStr}</span>
        <span className="text-[10px] text-[#253241]">·</span>
        <span className="text-[10px] text-[#94A3B8]/30">All times local</span>
      </div>
    </div>
  );
}
