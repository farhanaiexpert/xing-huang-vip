import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt, fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, CheckCircle2, Trophy, Users, Coins, ChevronRight,
  AlertCircle, Loader2, ArrowLeft, CheckCheck, TrendingDown,
  RotateCcw, Zap, ClipboardList, Bot, UserCog, Filter,
  ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";

// ─── Shared types ─────────────────────────────────────────────────────────────

interface SettlementEvent {
  event_id: string;
  event_name: string;
  sport: string;
  open_count: number;
  player_count: number;
  total_staked: string;
}

interface SettlementMarket {
  market_type: string;
  selection: string;
  open_count: number;
  player_count: number;
  total_staked: string;
  total_liability: string;
}

interface EventDetail {
  eventId: string;
  eventName: string;
  sport: string;
  markets: SettlementMarket[];
}

interface SettlementResult {
  settled: number;
  won: number;
  lost: number;
  voided: number;
  totalPaidOut: string;
}

interface SettlementLogEntry {
  id: number;
  eventId: string;
  eventName: string;
  sport: string;
  result: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  betsSettled: number;
  betsWon: number;
  betsLost: number;
  betsVoided: number;
  totalPayout: string;
  source: string;
  settledAt: string;
}

type OutcomeResult = "won" | "lost" | "void" | "";

const RESULT_STYLES: Record<string, { label: string; cls: string }> = {
  "":    { label: "— Set result", cls: "bg-white/5 text-[#475569] border-white/10" },
  won:   { label: "✓ Won",        cls: "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20" },
  lost:  { label: "✗ Lost",       cls: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20" },
  void:  { label: "— Void",       cls: "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20" },
};

function outcomeKey(marketType: string, selection: string) {
  return `${marketType}||${selection}`;
}

// ─── Result badge ──────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    home:    { label: "Home Win", cls: "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20" },
    away:    { label: "Away Win", cls: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20" },
    draw:    { label: "Draw",     cls: "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20" },
    void:    { label: "Void",     cls: "bg-white/5 text-[#475569] border-white/10" },
    manual:  { label: "Manual",   cls: "bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/20" },
  };
  const style = map[result] ?? { label: result, cls: "bg-white/5 text-[#475569] border-white/10" };
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide", style.cls)}>
      {style.label}
    </span>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const isAuto = source === "auto";
  return (
    <span className={cn(
      "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit",
      isAuto
        ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20"
        : "bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/20",
    )}>
      {isAuto ? <Bot className="w-2.5 h-2.5" /> : <UserCog className="w-2.5 h-2.5" />}
      {isAuto ? "Auto" : "Manual"}
    </span>
  );
}

// ─── Success summary card ─────────────────────────────────────────────────────

function SuccessCard({ result, eventName, onReset }: { result: SettlementResult; eventName: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#00DFA9]/10 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-[#00DFA9]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Settlement Complete</h2>
        <p className="text-[#475569] text-sm">{eventName}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
        {[
          { label: "Bets Settled",  value: String(result.settled),  accent: "#94A3B8" },
          { label: "Won",           value: String(result.won),       accent: "#00DFA9" },
          { label: "Lost",          value: String(result.lost),      accent: "#EF4444" },
          { label: "Void / Refund", value: String(result.voided),    accent: "#FACC15" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="bg-[#111827] border border-white/8 rounded-xl p-4">
            <p className="text-xs text-[#475569] mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#111827] border border-white/8 rounded-xl p-4 w-full max-w-lg">
        <p className="text-xs text-[#475569] mb-1">Total Paid Out to Players</p>
        <p className="text-3xl font-bold text-[#00DFA9] font-mono">
          ${fmt(result.totalPaidOut)} <span className="text-base text-[#475569]">USDT</span>
        </p>
      </div>
      <button
        onClick={onReset}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#00DFA9] text-[#0B0F14] rounded-lg font-semibold hover:brightness-110 transition-all"
      >
        <RotateCcw className="w-4 h-4" /> Settle Another Event
      </button>
    </div>
  );
}

// ─── Market resolution panel ──────────────────────────────────────────────────

function EventPanel({ detail, onBack }: { detail: EventDetail; onBack: () => void }) {
  const qc = useQueryClient();
  const [outcomes, setOutcomes] = useState<Record<string, OutcomeResult>>({});
  const [result, setResult] = useState<SettlementResult | null>(null);

  const setOutcome = (key: string, value: OutcomeResult) =>
    setOutcomes(prev => ({ ...prev, [key]: value }));

  const grouped = useMemo(() => {
    const map = new Map<string, SettlementMarket[]>();
    for (const m of detail.markets) {
      const arr = map.get(m.market_type) ?? [];
      arr.push(m);
      map.set(m.market_type, arr);
    }
    return map;
  }, [detail.markets]);

  const allSet = detail.markets.every(m => outcomes[outcomeKey(m.market_type, m.selection)]);
  const setCount = Object.values(outcomes).filter(Boolean).length;
  const totalBets = detail.markets.reduce((a, m) => a + m.open_count, 0);

  const settleMut = useMutation({
    mutationFn: () => {
      const mapped = detail.markets
        .map(m => ({
          marketType: m.market_type,
          selection: m.selection,
          result: outcomes[outcomeKey(m.market_type, m.selection)] as "won" | "lost" | "void",
        }))
        .filter(o => o.result);
      return api.post("/admin/settlement/settle", { eventId: detail.eventId, outcomes: mapped });
    },
    onSuccess: (data: SettlementResult) => {
      qc.invalidateQueries({ queryKey: ["settlement-events"] });
      qc.invalidateQueries({ queryKey: ["settlement-log"] });
      setResult(data);
      toast.success(`Settled ${data.settled} bets on ${detail.eventName}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (result) return <SuccessCard result={result} eventName={detail.eventName} onReset={onBack} />;

  function applyAll(result: OutcomeResult) {
    const next: Record<string, OutcomeResult> = {};
    for (const m of detail.markets) next[outcomeKey(m.market_type, m.selection)] = result;
    setOutcomes(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-white transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> All events
          </button>
          <h2 className="text-lg font-bold text-white">{detail.eventName}</h2>
          <p className="text-sm text-[#475569]">
            {detail.sport && <span className="mr-2">{detail.sport}</span>}
            <span>{totalBets} open bets · {detail.markets.length} market{detail.markets.length !== 1 ? "s" : ""}</span>
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap shrink-0">
          <span className="text-xs text-[#334155] self-center">Quick-set all:</span>
          {(["won", "lost", "void", ""] as OutcomeResult[]).map(r => (
            <button key={r} onClick={() => applyAll(r)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors",
                r === ""    ? "bg-white/5 text-[#475569] border-white/10 hover:bg-white/10" :
                r === "won" ? "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20 hover:bg-[#00DFA9]/20" :
                r === "lost"? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20 hover:bg-[#EF4444]/20" :
                              "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20 hover:bg-[#FACC15]/20")}>
              {r === "" ? "Clear" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {[...grouped.entries()].map(([marketType, markets]) => (
          <div key={marketType} className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/5 bg-white/2">
              <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">{marketType}</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-[#334155] uppercase tracking-wide border-b border-white/5">
                  <th className="text-left px-4 py-2">Selection / Outcome</th>
                  <th className="text-center px-3 py-2">Bets</th>
                  <th className="text-center px-3 py-2">Players</th>
                  <th className="text-right px-3 py-2">Staked</th>
                  <th className="text-right px-3 py-2">Max Liability</th>
                  <th className="text-right px-4 py-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {markets.map(m => {
                  const key = outcomeKey(m.market_type, m.selection);
                  const current = outcomes[key] ?? "";
                  const style = RESULT_STYLES[current];
                  return (
                    <tr key={key} className={cn("transition-colors", current ? "bg-white/1" : "")}>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-white">{m.selection}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-semibold text-[#38BDF8]">{m.open_count}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs text-[#475569]">{m.player_count}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-xs font-mono text-[#FACC15]">${fmt(m.total_staked)}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-xs font-mono text-[#EF4444]">${fmt(m.total_liability)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={current}
                          onChange={e => setOutcome(key, e.target.value as OutcomeResult)}
                          className={cn("text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none transition-colors", style.cls)}
                        >
                          <option value="">— Set result</option>
                          <option value="won">✓ Won</option>
                          <option value="lost">✗ Lost</option>
                          <option value="void">— Void</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-1 bg-[#0B0F14]/95 backdrop-blur border-t border-white/8 px-4 py-3 flex items-center justify-between gap-4 rounded-b-xl">
        <div className="text-sm text-[#475569]">
          {setCount === 0
            ? "Set a result for each selection to continue"
            : !allSet
              ? <span className="text-[#FACC15]">{detail.markets.length - setCount} selection{detail.markets.length - setCount !== 1 ? "s" : ""} still need a result</span>
              : <span className="text-[#00DFA9]">All {detail.markets.length} selections ready — {totalBets} bets will be settled</span>}
        </div>
        <button
          onClick={() => settleMut.mutate()}
          disabled={!allSet || settleMut.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#00DFA9] text-[#0B0F14] rounded-lg font-semibold text-sm hover:brightness-110 disabled:opacity-40 transition-all shrink-0"
        >
          {settleMut.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Settling…</>
            : <><CheckCheck className="w-4 h-4" /> Settle {totalBets} Bets</>}
        </button>
      </div>
    </div>
  );
}

// ─── Settlement Log tab ───────────────────────────────────────────────────────

interface LogResponse {
  logs: SettlementLogEntry[];
  total: number;
  page: number;
  limit: number;
}

function SettlementLogTab() {
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sportFilter, setSportFilter] = useState("");
  const LIMIT = 20;

  const { data, isLoading } = useQuery<LogResponse>({
    queryKey: ["settlement-log", page, sourceFilter, sportFilter],
    queryFn: () =>
      api.get(
        `/admin/settlement/log?page=${page}&limit=${LIMIT}` +
          (sourceFilter !== "all" ? `&source=${sourceFilter}` : "") +
          (sportFilter ? `&sport=${encodeURIComponent(sportFilter)}` : ""),
      ),
    refetchInterval: 30_000,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / LIMIT);

  function resetPage() { setPage(1); }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#475569]" />
          <span className="text-xs text-[#475569] font-medium">Filter:</span>
        </div>
        <select
          value={sourceFilter}
          onChange={e => { setSourceFilter(e.target.value); resetPage(); }}
          className="bg-[#111827] border border-white/10 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00DFA9] cursor-pointer"
        >
          <option value="all">All Sources</option>
          <option value="auto">Auto Only</option>
          <option value="manual">Manual Only</option>
        </select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#475569]" />
          <input
            value={sportFilter}
            onChange={e => { setSportFilter(e.target.value); resetPage(); }}
            placeholder="Filter by sport…"
            className="pl-7 pr-3 py-1.5 bg-[#111827] border border-white/10 rounded-lg text-xs text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors w-40"
          />
        </div>
        <span className="text-xs text-[#475569] ml-auto">{total} total entries</span>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[#475569] text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading log…
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-[#475569] text-sm">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No settlement log entries yet</p>
            <p className="text-xs mt-1 text-[#334155]">Entries appear here after bets are settled (auto or manual)</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="text-[10px] text-[#334155] uppercase tracking-wide border-b border-white/8 bg-white/2">
                    <th className="text-left px-4 py-3">Event</th>
                    <th className="text-left px-3 py-3">Sport</th>
                    <th className="text-center px-3 py-3">Result</th>
                    <th className="text-center px-3 py-3">Score</th>
                    <th className="text-center px-3 py-3">Bets</th>
                    <th className="text-right px-3 py-3">Payout</th>
                    <th className="text-center px-3 py-3">Source</th>
                    <th className="text-right px-4 py-3">Settled At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white truncate max-w-[220px]">{log.eventName}</p>
                        <p className="text-[10px] text-[#475569] mt-0.5">ID: {log.eventId.slice(0, 12)}…</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-[#94A3B8]">{log.sport || "—"}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ResultBadge result={log.result} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {log.homeScore || log.awayScore ? (
                          <span className="text-xs font-mono text-white">
                            {log.homeScore} – {log.awayScore}
                          </span>
                        ) : (
                          <span className="text-xs text-[#334155]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-[10px]">
                          <span className="text-[#00DFA9] font-bold">{log.betsWon}W</span>
                          <span className="text-[#EF4444] font-bold">{log.betsLost}L</span>
                          <span className="text-[#FACC15] font-bold">{log.betsVoided}V</span>
                        </div>
                        <p className="text-[10px] text-[#475569] mt-0.5">{log.betsSettled} total</p>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-xs font-mono font-semibold text-[#00DFA9]">
                          ${fmt(log.totalPayout)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <SourceBadge source={log.source} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-[#475569]">{fmtDate(log.settledAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
                <span className="text-xs text-[#475569]">
                  Page {page} of {pages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/8 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/8 disabled:opacity-30 transition-all"
                  >
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Auto-settlement info card */}
      <div className="bg-[#38BDF8]/5 border border-[#38BDF8]/15 rounded-xl p-4 flex items-start gap-3">
        <Bot className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-[#38BDF8] mb-0.5">Auto-Settlement Active</p>
          <p className="text-xs text-[#475569] leading-relaxed">
            The engine polls match scores every 5 minutes and settles all h2h bets automatically when a match is
            marked completed. Non-h2h markets (totals, spreads) are voided and shown here for manual review.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettlementPage() {
  const [search, setSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"batch" | "log">("batch");

  const { data: events = [], isLoading } = useQuery<SettlementEvent[]>({
    queryKey: ["settlement-events"],
    queryFn: () => api.get("/admin/settlement/events"),
    refetchInterval: 30_000,
  });

  const { data: eventDetail, isLoading: detailLoading } = useQuery<EventDetail>({
    queryKey: ["settlement-event-detail", selectedEventId],
    queryFn: () => api.get(`/admin/settlement/events/${selectedEventId}`),
    enabled: !!selectedEventId,
  });

  const filtered = events.filter(e =>
    !search || e.event_name.toLowerCase().includes(search.toLowerCase()) || e.sport.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Settlement</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            Auto-settlement runs every 5 min · Manual batch tool below
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] border border-white/8 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("batch")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "batch"
              ? "bg-[#00DFA9] text-[#0B0F14]"
              : "text-[#475569] hover:text-white",
          )}
        >
          <CheckCheck className="w-3.5 h-3.5" /> Batch Settlement
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "log"
              ? "bg-[#38BDF8] text-[#0B0F14]"
              : "text-[#475569] hover:text-white",
          )}
        >
          <ClipboardList className="w-3.5 h-3.5" /> Settlement Log
        </button>
      </div>

      {/* ── Batch Settlement tab ── */}
      {activeTab === "batch" && (
        <>
          {!selectedEventId && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Search,     step: "1", label: "Pick an event",      desc: "Select any match with open bets below" },
                { icon: Trophy,     step: "2", label: "Set each result",    desc: "Choose Won / Lost / Void per selection" },
                { icon: CheckCheck, step: "3", label: "Settle all at once", desc: "All matching bets resolved, payouts credited automatically" },
              ].map(({ icon: Icon, step, label, desc }) => (
                <div key={step} className="bg-[#111827] border border-white/8 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#00DFA9]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#00DFA9] text-xs font-bold">{step}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">{label}</p>
                    <p className="text-xs text-[#475569]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4">
            {/* Left: event list */}
            <div className={cn("transition-all duration-200", selectedEventId ? "w-72 shrink-0" : "flex-1")}>
              <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-white/8">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569]" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search events…"
                      className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-[#475569] text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading events…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-[#475569] text-sm">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    {events.length === 0
                      ? "No events with open bets"
                      : "No events match your search"}
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                    {filtered.map(e => {
                      const active = selectedEventId === e.event_id;
                      return (
                        <button
                          key={e.event_id}
                          onClick={() => setSelectedEventId(e.event_id)}
                          className={cn(
                            "w-full text-left px-4 py-3.5 transition-colors flex items-center gap-3",
                            active
                              ? "bg-[#00DFA9]/8 border-l-2 border-[#00DFA9]"
                              : "hover:bg-white/3 border-l-2 border-transparent",
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium truncate", active ? "text-[#00DFA9]" : "text-white")}>
                              {e.event_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {e.sport && <span className="text-[11px] text-[#334155]">{e.sport}</span>}
                              <span className="text-[11px] text-[#475569]">{e.player_count} player{e.player_count !== 1 ? "s" : ""}</span>
                              <span className="text-[11px] font-mono text-[#FACC15]">${fmt(e.total_staked)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs font-bold text-[#38BDF8]">{e.open_count}</span>
                            <span className="text-[10px] text-[#334155]">bets</span>
                          </div>
                          {active && <ChevronRight className="w-3.5 h-3.5 text-[#00DFA9] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: event detail */}
            {selectedEventId && (
              <div className="flex-1 min-w-0">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-40 gap-2 text-[#475569] text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading markets…
                  </div>
                ) : eventDetail ? (
                  <EventPanel
                    key={selectedEventId}
                    detail={eventDetail}
                    onBack={() => setSelectedEventId(null)}
                  />
                ) : null}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Settlement Log tab ── */}
      {activeTab === "log" && <SettlementLogTab />}
    </div>
  );
}
