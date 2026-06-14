import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt, fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, CheckCircle2, Users, Coins, ChevronRight,
  AlertCircle, Loader2, ArrowLeft, CheckCheck, TrendingDown,
  RotateCcw, ClipboardList, Bot, UserCog, Filter,
  ChevronLeft, ChevronRight as ChevronRightIcon, ShieldAlert, X,
} from "lucide-react";
import { GuideModal, GuideButton } from "@/components/GuideModal";

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

interface EventSelections {
  eventId: string;
  eventName: string;
  sport: string;
  selections: { market_type: string; selection: string }[];
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

// ─── Badges ───────────────────────────────────────────────────────────────────

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

function SourceBadge({ source }: { source: string }) {
  const cfg: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    auto:            { label: "Auto",     icon: <Bot className="w-2.5 h-2.5" />,       cls: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20" },
    manual:          { label: "Manual",   icon: <UserCog className="w-2.5 h-2.5" />,   cls: "bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/20" },
    manual_override: { label: "Override", icon: <ShieldAlert className="w-2.5 h-2.5" />, cls: "bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20" },
  };
  const c = cfg[source] ?? cfg.manual;
  return (
    <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit", c.cls)}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Success card ─────────────────────────────────────────────────────────────

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
      <button onClick={onReset} className="flex items-center gap-2 px-5 py-2.5 bg-[#00DFA9] text-[#0B0F14] rounded-lg font-semibold hover:brightness-110 transition-all">
        <RotateCcw className="w-4 h-4" /> Settle Another Event
      </button>
    </div>
  );
}

// ─── Event panel (batch settlement) ──────────────────────────────────────────

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
        .map(m => ({ marketType: m.market_type, selection: m.selection, result: outcomes[outcomeKey(m.market_type, m.selection)] as "won" | "lost" | "void" }))
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

  function applyAll(r: OutcomeResult) {
    const next: Record<string, OutcomeResult> = {};
    for (const m of detail.markets) next[outcomeKey(m.market_type, m.selection)] = r;
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
                  <th className="text-left px-4 py-2">Selection</th>
                  <th className="text-center px-3 py-2">Bets</th>
                  <th className="text-center px-3 py-2">Players</th>
                  <th className="text-right px-3 py-2">Staked</th>
                  <th className="text-right px-3 py-2">Liability</th>
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
                      <td className="px-4 py-3"><span className="text-sm font-medium text-white">{m.selection}</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-xs font-semibold text-[#38BDF8]">{m.open_count}</span></td>
                      <td className="px-3 py-3 text-center"><span className="text-xs text-[#475569]">{m.player_count}</span></td>
                      <td className="px-3 py-3 text-right"><span className="text-xs font-mono text-[#FACC15]">${fmt(m.total_staked)}</span></td>
                      <td className="px-3 py-3 text-right"><span className="text-xs font-mono text-[#EF4444]">${fmt(m.total_liability)}</span></td>
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

// ─── Override modal ───────────────────────────────────────────────────────────

function OverrideModal({ log, onClose }: { log: SettlementLogEntry; onClose: () => void }) {
  const qc = useQueryClient();
  const [outcomes, setOutcomes] = useState<Record<string, OutcomeResult>>({});

  const { data: selData, isLoading } = useQuery<EventSelections>({
    queryKey: ["event-selections", log.eventId],
    queryFn: () => api.get(`/admin/settlement/events/${log.eventId}/selections`),
  });

  const selections = selData?.selections ?? [];
  const allSet = selections.length > 0 && selections.every(s => outcomes[outcomeKey(s.market_type, s.selection)]);

  const overrideMut = useMutation({
    mutationFn: () => {
      const mapped = selections.map(s => ({
        marketType: s.market_type,
        selection: s.selection,
        result: (outcomes[outcomeKey(s.market_type, s.selection)] || "void") as "won" | "lost" | "void",
      }));
      return api.post("/admin/settlement/override", { eventId: log.eventId, outcomes: mapped });
    },
    onSuccess: (data: SettlementResult) => {
      qc.invalidateQueries({ queryKey: ["settlement-log"] });
      toast.success(`Override applied — ${data.settled} bets re-settled`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Group by market type
  const grouped = useMemo(() => {
    const map = new Map<string, { market_type: string; selection: string }[]>();
    for (const s of selections) {
      const arr = map.get(s.market_type) ?? [];
      arr.push(s);
      map.set(s.market_type, arr);
    }
    return map;
  }, [selections]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-[#F97316]" />
              <span className="text-xs font-bold text-[#F97316] uppercase tracking-wide">Override Settlement</span>
            </div>
            <h3 className="text-base font-bold text-white truncate max-w-[300px]">{log.eventName}</h3>
            <p className="text-xs text-[#475569] mt-0.5">{log.sport || "Unknown sport"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/8 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning */}
        <div className="mx-5 mt-4 p-3 bg-[#F97316]/8 border border-[#F97316]/20 rounded-xl text-xs text-[#F97316]">
          <strong>Warning:</strong> This will reverse all existing payouts/refunds for this event, then re-settle every bet with the outcomes you specify below. This action is logged as a <strong>manual override</strong>.
        </div>

        {/* Selections */}
        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-[#475569] text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading selections…
            </div>
          ) : selections.length === 0 ? (
            <p className="text-center text-[#475569] text-sm py-4">No selections found for this event.</p>
          ) : (
            [...grouped.entries()].map(([marketType, items]) => (
              <div key={marketType}>
                <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-2">{marketType}</p>
                <div className="space-y-1.5">
                  {items.map(s => {
                    const key = outcomeKey(s.market_type, s.selection);
                    const current = outcomes[key] ?? "";
                    const style = RESULT_STYLES[current];
                    return (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white">{s.selection}</span>
                        <select
                          value={current}
                          onChange={e => setOutcomes(prev => ({ ...prev, [key]: e.target.value as OutcomeResult }))}
                          className={cn("text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer focus:outline-none transition-colors", style.cls)}
                        >
                          <option value="">— Set result</option>
                          <option value="won">✓ Won</option>
                          <option value="lost">✗ Lost</option>
                          <option value="void">— Void</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#475569] hover:text-white hover:bg-white/8 border border-white/10 transition-all">
            Cancel
          </button>
          <button
            onClick={() => overrideMut.mutate()}
            disabled={!allSet || overrideMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white rounded-lg font-semibold text-sm hover:brightness-110 disabled:opacity-40 transition-all"
          >
            {overrideMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</>
              : <><ShieldAlert className="w-4 h-4" /> Apply Override</>}
          </button>
        </div>
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overrideEntry, setOverrideEntry] = useState<SettlementLogEntry | null>(null);
  const LIMIT = 20;

  function resetPage() { setPage(1); }

  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (sourceFilter !== "all") params.set("source", sourceFilter);
  if (sportFilter) params.set("sport", sportFilter);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo)   params.set("dateTo", dateTo);

  const { data, isLoading } = useQuery<LogResponse>({
    queryKey: ["settlement-log", page, sourceFilter, sportFilter, dateFrom, dateTo],
    queryFn: () => api.get(`/admin/settlement/log?${params}`),
    refetchInterval: 30_000,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / LIMIT);

  return (
    <>
      {overrideEntry && <OverrideModal log={overrideEntry} onClose={() => setOverrideEntry(null)} />}

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#475569]" />
            <span className="text-xs text-[#475569] font-medium">Filter:</span>
          </div>

          <select
            value={sourceFilter}
            onChange={e => { setSourceFilter(e.target.value); resetPage(); }}
            className="bg-[#111827] border border-white/10 text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#00DFA9] cursor-pointer"
          >
            <option value="all">All Sources</option>
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
            <option value="manual_override">Override</option>
          </select>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#475569]" />
            <input
              value={sportFilter}
              onChange={e => { setSportFilter(e.target.value); resetPage(); }}
              placeholder="Sport…"
              className="pl-7 pr-3 py-1.5 bg-[#111827] border border-white/10 rounded-lg text-xs text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors w-32"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#334155]">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); resetPage(); }}
              className="bg-[#111827] border border-white/10 text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00DFA9] transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#334155]">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); resetPage(); }}
              className="bg-[#111827] border border-white/10 text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00DFA9] transition-colors"
            />
          </div>

          {(sourceFilter !== "all" || sportFilter || dateFrom || dateTo) && (
            <button
              onClick={() => { setSourceFilter("all"); setSportFilter(""); setDateFrom(""); setDateTo(""); resetPage(); }}
              className="text-xs text-[#475569] hover:text-white underline"
            >
              Clear filters
            </button>
          )}

          <span className="text-xs text-[#475569] ml-auto">{total} entries</span>
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
              <p className="font-medium">No settlement log entries</p>
              <p className="text-xs mt-1 text-[#334155]">Entries appear after bets are settled (auto or manual)</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
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
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-white/2 transition-colors group">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white truncate max-w-[200px]">{log.eventName}</p>
                          <p className="text-[10px] text-[#334155] mt-0.5 font-mono">{log.eventId.slice(0, 14)}…</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-[#94A3B8]">{log.sport || "—"}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <ResultBadge result={log.result} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {log.homeScore || log.awayScore ? (
                            <span className="text-xs font-mono text-white">{log.homeScore} – {log.awayScore}</span>
                          ) : (
                            <span className="text-xs text-[#334155]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-[10px]">
                            <span className="text-[#00DFA9] font-bold">{log.betsWon}W</span>
                            <span className="text-[#EF4444] font-bold">{log.betsLost}L</span>
                            <span className="text-[#FACC15] font-bold">{log.betsVoided}V</span>
                          </div>
                          <p className="text-[10px] text-[#475569] mt-0.5">{log.betsSettled} total</p>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-xs font-mono font-semibold text-[#00DFA9]">${fmt(log.totalPayout)}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <SourceBadge source={log.source} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-[#475569]">{fmtDate(log.settledAt)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setOverrideEntry(log)}
                            title="Override this settlement"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-[#F97316] hover:bg-[#F97316]/10 border border-transparent hover:border-[#F97316]/20"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
                  <span className="text-xs text-[#475569]">Page {page} of {pages}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/8 disabled:opacity-30 transition-all">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                      className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/8 disabled:opacity-30 transition-all">
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Auto-settlement info */}
        <div className="bg-[#38BDF8]/5 border border-[#38BDF8]/15 rounded-xl p-4 flex items-start gap-3">
          <Bot className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#38BDF8] mb-0.5">Auto-Settlement Active</p>
            <p className="text-xs text-[#475569] leading-relaxed">
              The engine polls scores every 5 minutes and auto-settles h2h bets when a match completes.
              Use the <ShieldAlert className="w-3 h-3 inline text-[#F97316] mx-0.5" /> override button on any log row
              to atomically reverse and re-settle all bets for that event.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SETTLEMENT_GUIDE = [
  {
    title: "How Auto-Settlement Works",
    items: [
      "A background cron job runs every 5 minutes and checks completed events against the Odds API (by event ID) and BetsAPI (by betsapi_* prefix).",
      "When a result is found, every open bet on that event is settled automatically — winners are credited, losers are marked lost.",
      "Events with no result after 48 hours are flagged for manual review so nothing is left open indefinitely.",
    ],
  },
  {
    title: "Manual Batch Settlement",
    items: [
      "The Batch Settlement tab lists every event that has open bets waiting for a result.",
      "Click an event to open the settlement panel. Each market (Match Result, BTTS, etc.) shows all selections with their open bet count, total staked, and maximum liability.",
      "Use the Quick-set buttons to mark all selections Won, Lost, or Void at once — or set each selection individually from the dropdown.",
      'Once every selection has a result, click "Settle Bets". Winners are paid out immediately and the event disappears from the list.',
      "Voiding a selection refunds the full stake to each affected player.",
    ],
  },
  {
    title: "Settlement Log & Overrides",
    items: [
      "The Settlement Log tab records every settlement action — auto or manual — with the source badge (Auto / Manual / Override).",
      "If a result was entered incorrectly, click the Override button on any log entry. The system reverses all payouts/refunds for that event and re-settles every bet with the new outcomes you provide.",
      "Overrides are clearly flagged in the log so you always have a full audit trail.",
    ],
  },
  {
    title: "Key Terms",
    items: [
      { text: "Staked", note: "total USDT wagered by players on that selection" },
      { text: "Liability", note: "maximum payout owed if that selection wins (stake × odds)" },
      { text: "Void", note: "bet is cancelled and the full stake is returned to the player" },
    ],
  },
];

export default function SettlementPage() {
  const [search, setSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"batch" | "log">("batch");
  const [showGuide, setShowGuide] = useState(false);

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
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Settlement Guide"
        subtitle="How bet results are processed and paid out"
        accent="#00DFA9"
        sections={SETTLEMENT_GUIDE}
      />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Settlement</h1>
          <p className="text-sm text-[#475569] mt-0.5">Auto-settlement runs every 5 min · Manual batch tool below</p>
        </div>
        <GuideButton onClick={() => setShowGuide(true)} accent="#00DFA9" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111827] border border-white/8 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("batch")}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "batch" ? "bg-[#00DFA9] text-[#0B0F14]" : "text-[#475569] hover:text-white")}
        >
          <CheckCheck className="w-3.5 h-3.5" /> Batch Settlement
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === "log" ? "bg-[#38BDF8] text-[#0B0F14]" : "text-[#475569] hover:text-white")}
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
                { step: "1", label: "Pick an event",      desc: "Select any match with open bets below" },
                { step: "2", label: "Set each result",    desc: "Choose Won / Lost / Void per selection" },
                { step: "3", label: "Settle all at once", desc: "All matching bets resolved; payouts credited" },
              ].map(({ step, label, desc }) => (
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
                    {events.length === 0 ? "No events with open bets" : "No events match your search"}
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                    {filtered.map(e => {
                      const active = selectedEventId === e.event_id;
                      return (
                        <button key={e.event_id} onClick={() => setSelectedEventId(e.event_id)}
                          className={cn("w-full text-left px-4 py-3.5 transition-colors flex items-center gap-3",
                            active ? "bg-[#00DFA9]/8 border-l-2 border-[#00DFA9]" : "hover:bg-white/3 border-l-2 border-transparent")}>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium truncate", active ? "text-[#00DFA9]" : "text-white")}>{e.event_name}</p>
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

            {selectedEventId && (
              <div className="flex-1 min-w-0">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-40 gap-2 text-[#475569] text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading markets…
                  </div>
                ) : eventDetail ? (
                  <EventPanel key={selectedEventId} detail={eventDetail} onBack={() => setSelectedEventId(null)} />
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
