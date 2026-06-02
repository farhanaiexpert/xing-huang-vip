import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { LeagueSection } from "./LeagueSection";
import { FeaturedCards } from "./FeaturedCards";
import { PopularBets } from "./PopularBets";
import { SkeletonLeague } from "./SkeletonLeague";
import { UpcomingMatchesCarousel } from "./UpcomingMatchesCarousel";
import { WinnersTicker } from "./WinnersTicker";
import { SportQuickNav } from "./SportQuickNav";
import { TennisHighlights } from "./TennisHighlights";
import { SoccerHighlights } from "./SoccerHighlights";
import { NBAHighlights } from "./NBAHighlights";
import { AllSportsHighlights } from "./AllSportsHighlights";
import { EuropaLeagueFinal } from "./EuropaLeagueFinal";
import { FlashOdds } from "./FlashOdds";
import { JackpotPool } from "./JackpotPool";
import { LiveBetFeed } from "./LiveBetFeed";
import { SportHighlights } from "./SportHighlights";
import { LiveScoresTicker } from "./LiveScoresTicker";
import { LiveEventsBanner } from "./LiveEventsBanner";
import { MatchOfTheDay } from "./MatchOfTheDay";
import { SportDetailPage, SPORT_DETAIL_IDS } from "./SportDetailPage";
import { ConnectWalletModal } from "./ConnectWalletModal";
import { cn } from "../lib/utils";
import {
  Search,
  X,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  Lock,
  Zap,
  Users,
  BarChart2,
  Award,
  Twitter,
  Github,
  Instagram,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  LayoutList,
} from "lucide-react";
import { Input } from "./ui/input";
import { useOddsData } from "../hooks/useOddsData";
import { REAL_DATA_SPORT_IDS } from "../lib/oddsApi";
import type { League } from "../types";

interface MainContentProps {
  selectedSportId: string | null;
  onSelectSport: (id: string | null) => void;
}

type DateFilter = "all" | "today" | "tomorrow" | "upcoming";

const CAROUSEL_SPORTS = [
  { id: "soccer", name: "Soccer", icon: "⚽", count: 1247 },
  { id: "tennis", name: "Tennis", icon: "🎾", count: 486 },
  { id: "basketball", name: "Basketball", icon: "🏀", count: 318 },
  { id: "cricket", name: "Cricket", icon: "🏏", count: 124 },
  { id: "esports", name: "Esports", icon: "🎮", count: 203 },
  { id: "horse-racing", name: "Horse Racing", icon: "🏇", count: 847 },
  { id: "formula-1", name: "Formula 1", icon: "🏎️", count: 38 },
  { id: "boxing", name: "Boxing", icon: "🥊", count: 24 },
  { id: "golf", name: "Golf", icon: "⛳", count: 96 },
  { id: "darts", name: "Darts", icon: "🎯", count: 48 },
  { id: "ice-hockey", name: "Ice Hockey", icon: "🏒", count: 178 },
  { id: "mma", name: "MMA", icon: "🥋", count: 35 },
  {
    id: "nba",
    name: "NBA",
    icon: "https://www.bet365.com/home/images/Home/imgs/V9FlagIcons/USA.svg",
    count: 156,
  },
  { id: "american-football", name: "NFL", icon: "🏈", count: 28 },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "upcoming", label: "Upcoming" },
];

const PROMO_PILLS = [
  { id: "early-payout", label: "Early Payout", color: "#38BDF8" },
  { id: "acca-boost", label: "Acca Boost", color: "#00DFA9" },
];

function USDTDepositBanner({ onDeposit }: { onDeposit: () => void }) {
  return (
    <div
      className="relative mb-5 rounded-xl p-px"
      style={{ background: "linear-gradient(105deg, #00DFA9 0%, #1E9E78 40%, #FACC15 100%)" }}
    >
      <div
        className="relative rounded-xl overflow-hidden px-4 py-3"
        style={{ background: "linear-gradient(105deg, #091812 0%, #0B0F14 55%, #10140E 100%)" }}
      >
        {/* Glows */}
        <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(0,223,169,0.18)" }} />
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-3xl pointer-events-none" style={{ background: "rgba(250,204,21,0.12)" }} />

        {/* ── MOBILE layout (default) ── */}
        <div className="relative sm:hidden flex flex-col gap-2.5">
          {/* Row 1: badge + heading */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: "rgba(0,223,169,0.1)", border: "1px solid rgba(0,223,169,0.2)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#00DFA9] whitespace-nowrap">Live Offer</span>
            </div>
            <p className="text-[14px] font-black leading-tight text-white tracking-tight">
              Deposit{" "}
              <span style={{ background: "linear-gradient(90deg,#00DFA9 0%,#FACC15 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                USDT
              </span>{" "}
              &amp; Start Gambling
            </p>
          </div>
          {/* Feature tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {["Zero fees", "Instant settlement", "TRC-20 · ERC-20"].map((t, i) => (
              <span key={t} className="flex items-center gap-1">
                {i > 0 && <span className="text-[#253241] text-[10px]">·</span>}
                <span className="text-[10px] text-[#6EE7C7] font-medium">{t}</span>
              </span>
            ))}
          </div>
          {/* Row 2: bonus + CTA */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]/50 leading-none">Bonus up to</p>
              <p className="text-[20px] font-black tabular-nums leading-none mt-0.5"
                style={{ background: "linear-gradient(135deg,#FACC15 20%,#FDE68A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                500 <span className="text-[12px]">USDT</span>
              </p>
              <p className="text-[8px] text-[#94A3B8]/40 leading-none mt-0.5">100% first deposit match</p>
            </div>
            <button
              onClick={onDeposit}
              className="shrink-0 px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wide text-[#071510] transition-all duration-150 active:scale-95 whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#00DFA9 0%,#00C98A 100%)" }}>
              Deposit Now →
            </button>
          </div>
        </div>

        {/* ── DESKTOP layout (sm+) ── */}
        <div className="relative hidden sm:flex items-center gap-4">
          {/* Live badge */}
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: "rgba(0,223,169,0.1)", border: "1px solid rgba(0,223,169,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] animate-pulse shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#00DFA9] whitespace-nowrap">Live Offer</span>
          </div>
          {/* Main text */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black leading-tight text-white tracking-tight">
              Deposit{" "}
              <span style={{ background: "linear-gradient(90deg,#00DFA9 0%,#FACC15 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                USDT
              </span>{" "}
              &amp; Start Gambling
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {["Zero fees", "Instant settlement", "TRC-20 · ERC-20"].map((t, i) => (
                <span key={t} className="flex items-center gap-1">
                  {i > 0 && <span className="text-[#253241] text-[10px]">·</span>}
                  <span className="text-[10px] text-[#6EE7C7] font-medium">{t}</span>
                </span>
              ))}
            </div>
          </div>
          {/* Divider */}
          <div className="shrink-0 w-px h-9 rounded-full"
            style={{ background: "linear-gradient(180deg,transparent,rgba(0,223,169,0.25),transparent)" }} />
          {/* Bonus */}
          <div className="shrink-0 text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]/50 leading-none">Bonus up to</p>
            <p className="text-[22px] font-black tabular-nums leading-none mt-0.5"
              style={{ background: "linear-gradient(135deg,#FACC15 20%,#FDE68A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              500 <span className="text-[13px]">USDT</span>
            </p>
            <p className="text-[8px] text-[#94A3B8]/40 leading-none mt-0.5">100% first deposit match</p>
          </div>
          {/* CTA */}
          <button
            onClick={onDeposit}
            className="shrink-0 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide text-[#071510] transition-all duration-150 hover:brightness-110 hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(0,223,169,0.5)] whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#00DFA9 0%,#00C98A 100%)" }}>
            Deposit Now →
          </button>
        </div>
      </div>
    </div>
  );
}

export function MainContent({
  selectedSportId,
  onSelectSport,
}: MainContentProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [leagueVisibleCount, setLeagueVisibleCount] = useState(5);
  const searchRef = useRef<HTMLInputElement>(null);

  const scrollToLeagueList = useCallback(() => {
    const container = document.getElementById('main-content-scroll');
    const list      = document.getElementById('league-list');
    if (container && list) {
      const top = list.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  // Real + mock leagues from global context (also powers MatchDetail page)
  const {
    allLeagues,
    realLeagues,
    loading: oddsLoading,
    refreshing: oddsRefreshing,
    error: oddsError,
    hasRealData,
    isStale,
    lastUpdatedLabel,
    refresh: refreshOdds,
  } = useOddsData();

  // Simulate initial data load
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  // ⌘K / Ctrl+K → focus search
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setSearch("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch("");
    searchRef.current?.focus();
  }, []);

  // Count live matches
  const liveCount = useMemo(
    () => allLeagues.flatMap((l) => l.matches).filter((m) => m.isLive).length,
    [allLeagues],
  );

  // Filtered leagues
  const filteredLeagues = useMemo<League[]>(() => {
    let leagues = allLeagues;

    if (
      selectedSportId &&
      !["all", "early-payout", "acca-boost"].includes(selectedSportId)
    ) {
      leagues = leagues.filter(
        (l) =>
          l.sportId === selectedSportId ||
          l.sportId === `sp_${selectedSportId.replace("-", "_")}`,
      );
    }

    if (dateFilter !== "all") {
      leagues = leagues
        .map((l) => ({
          ...l,
          matches: l.matches.filter((m) => m.dateTag === dateFilter),
        }))
        .filter((l) => l.matches.length > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      leagues = leagues
        .map((l) => ({
          ...l,
          matches: l.matches.filter(
            (m) =>
              m.team1.toLowerCase().includes(q) ||
              (m.team2 && m.team2.toLowerCase().includes(q)) ||
              l.name.toLowerCase().includes(q) ||
              (m.team1 + " vs " + m.team2).toLowerCase().includes(q),
          ),
        }))
        .filter((l) => l.matches.length > 0);
    }

    return leagues;
  }, [selectedSportId, dateFilter, search]);

  const totalMatchCount = useMemo(
    () => filteredLeagues.reduce((acc, l) => acc + l.matches.length, 0),
    [filteredLeagues],
  );

  const showFeatured =
    !isLoading &&
    !search.trim() &&
    (!selectedSportId ||
      selectedSportId === "all" ||
      selectedSportId === "early-payout" ||
      selectedSportId === "acca-boost") &&
    dateFilter === "all";

  // On the homepage show leagueVisibleCount at a time (+10 per click)
  const LEAGUE_PAGE = 10;
  const sortedLeagues = useMemo(
    () => showFeatured
      ? [...filteredLeagues].sort((a, b) => b.matches.length - a.matches.length)
      : filteredLeagues,
    [filteredLeagues, showFeatured],
  );
  const displayedLeagues = useMemo(
    () => showFeatured ? sortedLeagues.slice(0, leagueVisibleCount) : filteredLeagues,
    [sortedLeagues, filteredLeagues, showFeatured, leagueVisibleCount],
  );
  const hiddenCount = showFeatured ? Math.max(0, filteredLeagues.length - leagueVisibleCount) : 0;
  const nextBatch   = Math.min(hiddenCount, LEAGUE_PAGE);

  // Reset pagination when sport changes
  useEffect(() => {
    setLeagueVisibleCount(5);
  }, [selectedSportId]);

  const hasActiveFilter =
    !!search.trim() ||
    (!!selectedSportId && selectedSportId !== "all") ||
    dateFilter !== "all";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B0F14] overflow-hidden">
      <div
        id="main-content-scroll"
        className="flex-1 overflow-y-auto overflow-x-hidden h-[calc(100vh-3.5rem)] pb-14 xl:pb-0"
        style={{ scrollbarWidth: "none" }}
      >
        {/* ── Sticky controls ─────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-[#0B0F14]/97 backdrop-blur-md border-b border-[#253241]/60">
          {/* Winners ticker */}
          <WinnersTicker />

          {/* Quick sport navigation */}
          <SportQuickNav
            selectedId={selectedSportId}
            liveCount={liveCount}
            onSelect={onSelectSport}
          />

          {/* Search */}
          <div className="px-4 pt-3.5 pb-2.5">
            <div className="relative group max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/50 group-focus-within:text-[#00DFA9] transition-colors duration-200 pointer-events-none" />
              <Input
                ref={searchRef}
                className="w-full pl-9 pr-20 h-10 rounded-xl text-sm bg-[#121821] border border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-2 focus-visible:ring-[#00DFA9]/25 focus-visible:border-[#00DFA9]/50 transition-all duration-200"
                placeholder="Search events, teams or leagues…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                {CAROUSEL_SPORTS.map((sport) => {
                  const isActive = selectedSportId === sport.id;
                  return (
                    <button
                      key={sport.id}
                      onClick={() =>
                        onSelectSport(
                          sport.id === selectedSportId ? null : sport.id,
                        )
                      }
                      data-testid={`sport-tab-${sport.id}`}
                      className={cn(
                        "group flex flex-col items-center gap-1 py-2 px-2.5 rounded-xl min-w-[68px] transition-all duration-200 select-none",
                        isActive
                          ? "bg-[#18212B] ring-1 ring-[#00DFA9]/40 shadow-[0_0_16px_rgba(0,223,169,0.1)]"
                          : "hover:bg-[#121821]/80",
                      )}
                    >
                      {sport.icon.startsWith("http") ? (
                        <img
                          src={sport.icon}
                          alt={sport.name}
                          className="w-5 h-5 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xl leading-none">
                          {sport.icon}
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[11px] font-medium leading-none transition-colors",
                          isActive
                            ? "text-[#00DFA9]"
                            : "text-[#94A3B8] group-hover:text-[#F8FAFC]",
                        )}
                      >
                        {sport.name}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-semibold leading-none tabular-nums transition-colors",
                          isActive
                            ? "text-[#00DFA9]/60"
                            : "text-[#94A3B8]/35 group-hover:text-[#94A3B8]/60",
                        )}
                      >
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
              {DATE_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id)}
                  data-testid={`filter-${f.id}`}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150",
                    dateFilter === f.id
                      ? "bg-[#253241] text-[#F8FAFC] shadow-sm"
                      : "text-[#94A3B8]/60 hover:text-[#F8FAFC]",
                  )}
                >
                  {f.label}
                  {f.id === "today" && liveCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#EF4444]">
                      <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                      {liveCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-[#253241] hidden sm:block" />

            {PROMO_PILLS.map((pill) => {
              const isActive = selectedSportId === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => onSelectSport(isActive ? null : pill.id)}
                  style={
                    isActive
                      ? {
                          borderColor: `${pill.color}40`,
                          color: pill.color,
                          backgroundColor: `${pill.color}10`,
                        }
                      : {}
                  }
                  className={cn(
                    "hidden sm:flex px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150",
                    !isActive &&
                      "bg-transparent text-[#94A3B8] border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC] hover:border-[#2E3D50]",
                  )}
                >
                  {pill.label}
                </button>
              );
            })}

            <button
              onClick={() => {
                onSelectSport(null);
                setDateFilter("all");
                setSearch("");
              }}
              className={cn(
                "hidden sm:flex px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150",
                !selectedSportId || selectedSportId === "all"
                  ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/25"
                  : "bg-transparent text-[#94A3B8] border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC]",
              )}
            >
              All Sports
            </button>

            {/* Right-side: status + results count + always-visible refresh */}
            {!isLoading && (
              <div className="ml-auto shrink-0 flex items-center gap-2">
                {/* Results count when filtered */}
                {hasActiveFilter && filteredLeagues.length > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]/60 font-medium select-none">
                    <span className="text-[#F8FAFC]/80 font-bold">
                      {totalMatchCount}
                    </span>
                    <span>event{totalMatchCount !== 1 ? "s" : ""}</span>
                    <span className="text-[#253241]">·</span>
                    <span>
                      {filteredLeagues.length} league
                      {filteredLeagues.length !== 1 ? "s" : ""}
                    </span>
                  </span>
                )}

                {/* Live odds status badge */}
                {(oddsLoading || oddsRefreshing) && (
                  <span className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]/40 font-medium">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    {oddsRefreshing ? "Refreshing…" : "Fetching odds…"}
                  </span>
                )}
                {!oddsLoading && !oddsRefreshing && hasRealData && (
                  <span
                    className="flex items-center gap-1.5 text-[10px] font-semibold"
                    style={{
                      color: isStale
                        ? "rgba(250,204,21,0.7)"
                        : "rgba(0,223,169,0.7)",
                    }}
                  >
                    <Wifi className="h-3 w-3" />
                    {lastUpdatedLabel || "Live odds"}
                  </span>
                )}
                {!oddsLoading &&
                  !oddsRefreshing &&
                  oddsError &&
                  !hasRealData && (
                    <span className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]/35 font-medium">
                      <WifiOff className="h-3 w-3" />
                      Using cached data
                    </span>
                  )}

                {/* Always-visible Refresh button */}
                <button
                  onClick={refreshOdds}
                  disabled={oddsLoading || oddsRefreshing}
                  title="Refresh odds now"
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border border-[#253241] text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:border-[#253241]/80 hover:bg-[#121821] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                >
                  <RefreshCw
                    className={`h-2.5 w-2.5 ${oddsRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Stale data banner ───────────────────────────────────────── */}
        {!isLoading && isStale && hasRealData && !oddsError && (
          <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#FACC15]/6 border border-[#FACC15]/20">
            <span className="text-[11px] text-[#FACC15]/70 flex-1">
              Odds data is over 24 hours old.
            </span>
            <button
              onClick={refreshOdds}
              disabled={oddsRefreshing}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FACC15]/80 hover:text-[#FACC15] disabled:opacity-40 transition-colors"
            >
              <RefreshCw
                className={`h-3 w-3 ${oddsRefreshing ? "animate-spin" : ""}`}
              />
              Refresh now
            </button>
          </div>
        )}

        {/* ── Live scores ticker (full-width, above hero) ─────────────── */}
        {!isLoading && <LiveScoresTicker />}

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
                    <div
                      key={i}
                      className="rounded-xl bg-[#18212B] border border-[#253241]/60 animate-pulse"
                      style={{ width: w, height: 160, flexShrink: 0 }}
                    />
                  ))}
                </div>
              </div>
              <SkeletonLeague rows={4} cols={3} />
              <SkeletonLeague rows={3} cols={2} />
              <SkeletonLeague rows={2} cols={3} />
            </div>
          ) : selectedSportId && SPORT_DETAIL_IDS.has(selectedSportId) ? (
            /* ── Sport detail page ── */
            <div className="-mx-4 -mt-4">
              <SportDetailPage
                sportId={selectedSportId}
                leagues={filteredLeagues}
                onBack={() => {
                  onSelectSport(null);
                  setDateFilter("all");
                }}
                lastUpdatedLabel={lastUpdatedLabel}
                onRefresh={refreshOdds}
                isRefreshing={oddsRefreshing}
              />
            </div>
          ) : (
            <>
              {showFeatured && (
                <div className="mb-5 rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="https://media.ourwebprojects.pro/wp-content/uploads/2026/06/cupBett-hero-banner-WC.webp"
                    alt="CupBett — Sports Betting"
                    className="w-full h-auto block"
                    draggable={false}
                  />
                </div>
              )}
              {showFeatured && <div className="mb-4"><JackpotPool /></div>}
              {showFeatured && <div className="mb-4"><LiveBetFeed /></div>}
              {showFeatured && <LiveEventsBanner />}
              {showFeatured && <USDTDepositBanner onDeposit={() => setDepositOpen(true)} />}
              {showFeatured && (
                <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#1E2A38] to-transparent" />
              )}
              {showFeatured && <FeaturedCards />}
              {showFeatured && <PopularBets />}
              {showFeatured && (
                <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#1E2A38] to-transparent" />
              )}
              {showFeatured && hasRealData && <TopMatchesBanner leagues={realLeagues} />}
              {showFeatured && <EuropaLeagueFinal />}
              {showFeatured && <SportHighlights onSelectSport={onSelectSport} onComingSoonViewAll={() => { setDateFilter("all"); scrollToLeagueList(); }} />}
              {showFeatured && <MatchOfTheDay />}
              {showFeatured && (
                <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#1E2A38] to-transparent" />
              )}
              {!search.trim() && selectedSportId === "soccer" && (
                <SoccerHighlights onViewAll={scrollToLeagueList} />
              )}
              {!search.trim() && selectedSportId === "ucl-final" && (
                <EuropaLeagueFinal />
              )}
              {!search.trim() && selectedSportId === "tennis" && (
                <TennisHighlights onViewAll={scrollToLeagueList} />
              )}
              {!search.trim() && selectedSportId === "nba" && <NBAHighlights onViewAll={scrollToLeagueList} />}

              {/* Live heading */}
              {dateFilter === "today" && liveCount > 0 && (
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
                  <span className="text-[11px] font-bold text-[#F8FAFC] bg-[#253241] px-2 py-0.5 rounded">
                    &ldquo;{search}&rdquo;
                  </span>
                  <div className="flex-1 h-px bg-[#253241]/50" />
                  <button
                    onClick={clearSearch}
                    className="text-[10px] font-medium text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors flex items-center gap-0.5"
                  >
                    Clear <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}

              <div id="league-list" className="space-y-2.5">
                {filteredLeagues.length > 0 ? (
                  displayedLeagues.map((league) => (
                    <div key={league.id}>
                      <LeagueSection league={league} />
                    </div>
                  ))
                ) : (
                  <NoResultsState
                    search={search}
                    selectedSportId={selectedSportId}
                    onClear={clearSearch}
                    onReset={() => {
                      onSelectSport(null);
                      setDateFilter("all");
                      setSearch("");
                    }}
                  />
                )}
              </div>

              {/* ── Load more leagues ── */}
              {showFeatured && hiddenCount > 0 && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-[#1A2535]"
                  style={{ background: 'linear-gradient(180deg, #0A0E15 0%, #080C12 100%)' }}
                >
                  {/* Preview chips — next batch of hidden leagues */}
                  <div className="px-4 pt-3 pb-2.5 flex flex-wrap gap-1.5">
                    {sortedLeagues.slice(leagueVisibleCount, leagueVisibleCount + 6).map((l) => (
                      <span
                        key={l.id}
                        className="inline-flex items-center gap-1 text-[9px] font-medium text-[#64748B] bg-[#111827] border border-[#1E2A38] px-2.5 py-1 rounded-full whitespace-nowrap"
                      >
                        <LayoutList className="h-2.5 w-2.5 shrink-0 opacity-50" />
                        {l.name}
                      </span>
                    ))}
                    {hiddenCount > 6 && (
                      <span className="inline-flex items-center text-[9px] font-medium text-[#374151] px-2 py-1">
                        +{hiddenCount - 6} more leagues
                      </span>
                    )}
                  </div>

                  {/* Divider with progress indicator */}
                  <div className="mx-4 flex items-center gap-2.5 mb-3">
                    <div className="flex-1 h-px bg-[#1A2535]" />
                    <span className="text-[9px] font-semibold text-[#374151] tabular-nums">
                      {leagueVisibleCount} / {filteredLeagues.length} shown
                    </span>
                    <div className="flex-1 h-px bg-[#1A2535]" />
                  </div>

                  {/* CTA button */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => setLeagueVisibleCount((n) => n + LEAGUE_PAGE)}
                      className="w-full group flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-200 active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(90deg, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0.05) 100%)',
                        border: '1px solid rgba(56,189,248,0.18)',
                        color: '#7DD3FC',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          'linear-gradient(90deg, rgba(56,189,248,0.14) 0%, rgba(56,189,248,0.09) 100%)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.32)';
                        (e.currentTarget as HTMLButtonElement).style.color = '#BAE6FD';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          'linear-gradient(90deg, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0.05) 100%)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.18)';
                        (e.currentTarget as HTMLButtonElement).style.color = '#7DD3FC';
                      }}
                    >
                      <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform duration-200" />
                      Show {nextBatch} more league{nextBatch !== 1 ? 's' : ''}
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(56,189,248,0.12)',
                          border: '1px solid rgba(56,189,248,0.2)',
                        }}
                      >
                        {hiddenCount} left
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Post-match activity panels (below the match list) ── */}
              {showFeatured && <div className="mt-5"><FlashOdds /></div>}
            </>
          )}
        </div>

        {/* ── Upcoming matches carousel ───────────────────────────────── */}
        {!isLoading && !search.trim() && (
          <div className="px-4 pt-2 pb-0">
            <UpcomingMatchesCarousel />
          </div>
        )}

        {/* ── Status bar ──────────────────────────────────────────────── */}
        {!isLoading && (
          <StatusBar
            matchCount={totalMatchCount}
            leagueCount={filteredLeagues.length}
            isLive={hasRealData}
            isStale={isStale}
            lastUpdatedLabel={lastUpdatedLabel}
          />
        )}

        {/* ── Trust footer ────────────────────────────────────────────── */}
        {!isLoading && <TrustFooter />}

        {/* ── Site footer ─────────────────────────────────────────────── */}
        {!isLoading && <SiteFooter />}
      </div>

      <ConnectWalletModal open={depositOpen} onOpenChange={setDepositOpen} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TOP MATCHES BANNER — 6-8 soonest upcoming matches across all real sports
// ────────────────────────────────────────────────────────────────────────────
const SPORT_EMOJI: Record<string, string> = {
  sp_soccer: '⚽', sp_basketball: '🏀', sp_american_football: '🏈',
  sp_tennis: '🎾', sp_cricket: '🏏', sp_baseball: '⚾',
  sp_ice_hockey: '🏒', sp_rugby_league: '🏉', sp_rugby_union: '🏉',
  sp_mma: '🥋', sp_boxing: '🥊', sp_golf: '⛳', sp_aussie_rules: '🏈',
  sp_darts: '🎯', sp_handball: '🤾', sp_volleyball: '🏐', sp_ucl: '⚽',
};

function TopMatchesBanner({ leagues }: { leagues: League[] }) {
  const topMatches = useMemo(() => {
    const now = Date.now();
    return leagues
      .flatMap(l =>
        l.matches.map(m => ({
          ...m,
          leagueName: l.name,
          _sportId: l.sportId,
        }))
      )
      .filter(
        (m) =>
          m.commenceIso &&
          new Date(m.commenceIso).getTime() > now &&
          !m.isLive,
      )
      .sort(
        (a, b) =>
          new Date(a.commenceIso!).getTime() - new Date(b.commenceIso!).getTime(),
      )
      .slice(0, 8);
  }, [leagues]);

  if (topMatches.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Zap className="w-3 h-3 text-[#38BDF8]/70" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#38BDF8]/70">
          Next Up — All Sports
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#38BDF8]/15 to-transparent" />
      </div>
      <div
        className="rounded-xl overflow-hidden border border-[#253241]/60"
        style={{ background: "rgba(18,24,33,0.6)" }}
      >
        {topMatches.map((match, i) => (
          <div
            key={match.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 hover:bg-[#1E2A38]/60 transition-colors cursor-pointer",
              i > 0 && "border-t border-[#253241]/40",
            )}
          >
            <span className="text-base shrink-0">
              {SPORT_EMOJI[match._sportId] ?? "🏆"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#F8FAFC] truncate leading-tight">
                {match.team1}{" "}
                <span className="text-[#64748B] font-normal">vs</span>{" "}
                {match.team2}
              </p>
              <p className="text-[10px] text-[#64748B] truncate mt-0.5">
                {match.leagueName} · {match.date}
              </p>
            </div>
            {match.odds.home && match.odds.away && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] font-bold text-[#F8FAFC] bg-[#253241] hover:bg-[#2E3D50] px-1.5 py-0.5 rounded cursor-pointer transition-colors">
                  {match.odds.home.toFixed(2)}
                </span>
                {match.odds.draw && (
                  <span className="text-[11px] font-bold text-[#F8FAFC] bg-[#253241] hover:bg-[#2E3D50] px-1.5 py-0.5 rounded cursor-pointer transition-colors">
                    {match.odds.draw.toFixed(2)}
                  </span>
                )}
                <span className="text-[11px] font-bold text-[#F8FAFC] bg-[#253241] hover:bg-[#2E3D50] px-1.5 py-0.5 rounded cursor-pointer transition-colors">
                  {match.odds.away.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// NO RESULTS STATE
// ────────────────────────────────────────────────────────────────────────────
const ALL_SPORT_EMOJI: Record<string, string> = {
  // Covered by Odds API
  sp_soccer: '⚽', sp_basketball: '🏀', sp_american_football: '🏈',
  sp_tennis: '🎾', sp_cricket: '🏏', sp_baseball: '⚾',
  sp_ice_hockey: '🏒', sp_rugby_league: '🏉', sp_rugby_union: '🏉',
  sp_mma: '🥋', sp_boxing: '🥊', sp_golf: '⛳', sp_aussie_rules: '🏈',
  sp_darts: '🎯', sp_handball: '🤾', sp_volleyball: '🏐', sp_ucl: '⚽',
  // Not yet covered
  sp_formula_1: '🏎️', sp_horse_racing: '🏇', sp_esports: '🎮',
  sp_cycling: '🚴', sp_snooker: '🎱', sp_badminton: '🏸',
  sp_table_tennis: '🏓', sp_water_polo: '🤽', sp_sailing: '⛵',
  sp_skiing: '⛷️', sp_winter_sports: '⛷️', sp_xc_skiing: '⛷️',
  sp_biathlon: '🎿', sp_ski_jumping: '🎿', sp_sumo: '🤼',
  sp_surfing: '🏄', sp_lacrosse: '🥍', sp_squash: '🎾',
  sp_motorsports: '🏎️', sp_motorbikes: '🏍️',
  sp_gaelic: '🏐', sp_futsal: '⚽', sp_softball: '⚾',
  sp_speedway: '🏍️', sp_trotting: '🏇', sp_greyhounds: '🐕',
  sp_lotto: '🎰', sp_virtual: '🎮', sp_fantasy: '🎯',
};

function NoResultsState({
  search,
  selectedSportId,
  onClear,
  onReset,
}: {
  search: string;
  selectedSportId: string | null;
  onClear: () => void;
  onReset: () => void;
}) {
  const isCoveredSport =
    !selectedSportId || REAL_DATA_SPORT_IDS.has(selectedSportId);
  const sportEmoji = selectedSportId ? ALL_SPORT_EMOJI[selectedSportId] : null;

  return (
    <div className="flex flex-col items-center text-center py-16 px-6 bg-[#121821] rounded-xl border border-[#253241]">
      <div className="relative mb-5">
        <div className={cn(
          "absolute inset-0 rounded-3xl blur-2xl scale-[2]",
          isCoveredSport ? "bg-[#38BDF8]/5" : "bg-[#94A3B8]/5"
        )} />
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center bg-[#18212B] border border-[#253241] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {sportEmoji ? (
            <span className="text-3xl leading-none">{sportEmoji}</span>
          ) : (
            <TrendingUp className="h-7 w-7 text-[#94A3B8]/30" />
          )}
        </div>
      </div>

      {search ? (
        <>
          <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5">
            No matches found
          </p>
          <p className="text-sm text-[#94A3B8]/70 mb-5 max-w-xs leading-relaxed">
            No events matching{" "}
            <span className="text-[#F8FAFC] font-medium">
              &ldquo;{search}&rdquo;
            </span>
            . Try a different team, league, or sport name.
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
      ) : !isCoveredSport ? (
        <>
          <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5">
            Coming Soon
          </p>
          <p className="text-sm text-[#94A3B8]/70 mb-5 max-w-xs leading-relaxed">
            We're working on live odds for this sport. Check back soon — new
            markets are added regularly.
          </p>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#121821] border border-[#253241] text-[#F8FAFC] text-sm font-semibold hover:bg-[#18212B] transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            All Sports
          </button>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5">
            No markets right now
          </p>
          <p className="text-sm text-[#94A3B8]/70 mb-5 max-w-xs leading-relaxed">
            No upcoming fixtures match your filters. Check back soon — or
            try a different date.
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
const FOOTER_NAV = [
  {
    heading: "Sports",
    links: [
      { label: "Soccer", href: "/" },
      { label: "Tennis", href: "/" },
      { label: "Basketball", href: "/" },
      { label: "Esports", href: "/" },
      { label: "Horse Racing", href: "/" },
      { label: "Formula 1", href: "/" },
      { label: "Boxing", href: "/" },
      { label: "Cricket", href: "/" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { label: "All Sports", href: "/" },
      { label: "Promotions", href: "/promotions" },
      { label: "Bet History", href: "/bet-history" },
      { label: "Help & Rules", href: "/help" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "AML Policy", href: "/aml" },
    ],
  },
];

const SOCIAL_LINKS = [
  { icon: <Twitter className="h-3.5 w-3.5" />, label: "Twitter" },
  { icon: <Instagram className="h-3.5 w-3.5" />, label: "Instagram" },
  { icon: <Github className="h-3.5 w-3.5" />, label: "GitHub" },
] as const;

function SiteFooter() {
  return (
    <footer className="border-t border-[#253241]/70 bg-[#0B0F14] mt-2">
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
        {/* ── MOBILE brand strip (hidden on sm+) ────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-5 sm:hidden">
          <div className="min-w-0">
            <img
              src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/cupbetlogo-1.webp"
              alt="CupBett"
              className="w-auto object-contain mb-1.5"
              style={{ height: '33.6px', filter: "drop-shadow(0 0 6px rgba(0,223,169,0.15))" }}
            />
            <p className="text-[11px] text-[#94A3B8]/50 leading-snug">
              Live odds · instant settlement · provably fair
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0 pt-0.5">
            {SOCIAL_LINKS.map((s) => (
              <button
                key={s.label}
                aria-label={s.label}
                className="w-8 h-8 rounded-lg border border-[#253241] bg-[#121821] flex items-center justify-center text-[#94A3B8]/40 hover:text-[#00DFA9] hover:border-[#00DFA9]/30 transition-colors duration-150"
              >
                {s.icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── MOBILE license badge (hidden on sm+) ─────────────────────── */}
        <div className="flex items-start gap-1.5 rounded-lg bg-[#121821] border border-[#253241]/80 p-2.5 mb-5 sm:hidden">
          <ShieldCheck className="h-3 w-3 text-[#00DFA9]/70 mt-px shrink-0" />
          <p className="text-[9px] text-[#94A3B8]/40 leading-snug">
            Licensed by the Malta Gaming Authority · MGA/B2C/123/2021
          </p>
        </div>

        {/* ── MOBILE nav grid — 3 columns of links (hidden on sm+) ─────── */}
        <div className="sm:hidden grid grid-cols-3 gap-x-2 gap-y-1 pb-5 border-b border-[#253241]/40">
          {FOOTER_NAV.map((col) => (
            <div key={col.heading}>
              <p className="text-[9px] font-bold text-[#94A3B8]/30 uppercase tracking-widest mb-2">
                {col.heading}
              </p>
              <ul className="space-y-1.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[11px] text-[#94A3B8]/55 hover:text-[#F8FAFC] transition-colors duration-150 leading-snug block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── DESKTOP 4-col grid (hidden on mobile) ────────────────────── */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-8 pb-8">
          <div className="space-y-3">
            <img
              src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/cupbetlogo-1.webp"
              alt="CupBett"
              className="w-auto object-contain"
              style={{ height: '33.6px', filter: "drop-shadow(0 0 6px rgba(0,223,169,0.15))" }}
            />
            <p className="text-[11px] text-[#94A3B8]/50 leading-relaxed max-w-[180px]">
              Live odds, instant settlement, and provably fair sports markets.
            </p>
            <div className="flex items-start gap-1.5 rounded-lg bg-[#121821] border border-[#253241]/80 p-2.5">
              <ShieldCheck className="h-3 w-3 text-[#00DFA9]/70 mt-px shrink-0" />
              <p className="text-[9px] text-[#94A3B8]/40 leading-snug">
                Licensed by the Malta Gaming Authority · MGA/B2C/123/2021
              </p>
            </div>
            <div className="flex gap-1.5 pt-1">
              {SOCIAL_LINKS.map((s) => (
                <button
                  key={s.label}
                  aria-label={s.label}
                  className="w-7 h-7 rounded-md border border-[#253241] bg-[#121821] flex items-center justify-center text-[#94A3B8]/40 hover:text-[#00DFA9] hover:border-[#00DFA9]/30 transition-colors duration-150"
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>
          {FOOTER_NAV.map((col) => (
            <div key={col.heading}>
              <p className="text-[10px] font-semibold text-[#94A3B8]/35 uppercase tracking-widest mb-3">
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[11px] text-[#94A3B8]/50 hover:text-[#F8FAFC] transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────────── */}
        <div className="pt-4 sm:border-t sm:border-[#253241]/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-[10px] text-[#94A3B8]/30 leading-snug">
            © 2021–2026 <span translate="no">CupBett</span> Ltd. All rights reserved.
            <span className="hidden sm:inline">
              {" "}
              · 18+ · Gamble responsibly.
            </span>
          </p>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {["18+", "BeGambleAware", "GamCare", "Gamble Responsibly"].map(
              (b) => (
                <span
                  key={b}
                  className="text-[9px] font-semibold text-[#94A3B8]/25"
                >
                  {b}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TRUST FOOTER
// ────────────────────────────────────────────────────────────────────────────
const TRUST_STATS = [
  {
    icon: <BarChart2 className="h-4 w-4" />,
    value: "2.4B+ USDT",
    label: "Volume Wagered",
    color: "text-[#00DFA9]",
    glow: "rgba(0,223,169,0.10)",
  },
  {
    icon: <Users className="h-4 w-4" />,
    value: "142,000+",
    label: "Active Users",
    color: "text-[#38BDF8]",
    glow: "rgba(56,189,248,0.10)",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    value: "< 0.3s",
    label: "Avg Settlement",
    color: "text-[#FACC15]",
    glow: "rgba(250,204,21,0.10)",
  },
  {
    icon: <Award className="h-4 w-4" />,
    value: "Est. 2021",
    label: "5 Yrs Operating",
    color: "text-[#A78BFA]",
    glow: "rgba(167,139,250,0.10)",
  },
];

const TRUST_BADGES = [
  { icon: <Lock className="h-3 w-3" />, label: "SSL 256-bit" },
  { icon: <ShieldCheck className="h-3 w-3" />, label: "Provably Fair" },
  { icon: <ShieldCheck className="h-3 w-3" />, label: "KYC Verified" },
  { icon: <Zap className="h-3 w-3" />, label: "Instant Payouts" },
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
            <div className={cn("shrink-0", stat.color)}>{stat.icon}</div>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-black leading-none tabular-nums",
                  stat.color,
                )}
              >
                {stat.value}
              </p>
              <p className="text-[10px] text-[#94A3B8]/50 mt-1.5 leading-none truncate">
                {stat.label}
              </p>
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
          <span translate="no">CupBett</span> · For entertainment purposes
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// STATUS BAR
// ────────────────────────────────────────────────────────────────────────────
function StatusBar({
  matchCount,
  leagueCount,
  isLive,
  lastUpdatedLabel,
  isStale,
}: {
  matchCount: number;
  leagueCount: number;
  isLive?: boolean;
  lastUpdatedLabel?: string;
  isStale?: boolean;
}) {
  const dotColor = isStale ? "#FACC15" : isLive ? "#00DFA9" : "#94A3B8";
  const textColor = isStale
    ? "rgba(250,204,21,0.6)"
    : isLive
      ? "rgba(0,223,169,0.6)"
      : "rgba(148,163,184,0.4)";

  return (
    <div className="mx-4 mb-6 mt-4 flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-[#0A0E13] border border-[#253241]/40">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span
          className="flex items-center gap-1.5 text-[10px] shrink-0"
          style={{ color: textColor }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: dotColor,
              boxShadow:
                isLive && !isStale ? "0 0 4px rgba(0,223,169,0.7)" : "none",
              animation:
                isLive && !isStale
                  ? "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite"
                  : "none",
            }}
          />
          {isStale
            ? "Odds may be outdated"
            : isLive
              ? "Real-time odds"
              : "Simulated"}
        </span>
        <span className="text-[10px] text-[#253241]">|</span>
        <span className="text-[10px] text-[#94A3B8]/40 tabular-nums">
          <span className="text-[#94A3B8]/70 font-semibold">{matchCount}</span>{" "}
          event{matchCount !== 1 ? "s" : ""}
          {leagueCount > 0 && (
            <>
              {" "}
              ·{" "}
              <span className="text-[#94A3B8]/70 font-semibold">
                {leagueCount}
              </span>{" "}
              league{leagueCount !== 1 ? "s" : ""}
            </>
          )}
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {lastUpdatedLabel && (
          <span className="text-[10px] text-[#94A3B8]/30">
            {lastUpdatedLabel}
          </span>
        )}
        <span className="text-[10px] text-[#253241]">·</span>
        <span className="text-[10px] text-[#94A3B8]/30">All times local</span>
      </div>
    </div>
  );
}
