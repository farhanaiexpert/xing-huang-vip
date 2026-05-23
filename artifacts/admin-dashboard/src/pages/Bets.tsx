import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetBets,
  useAdminSettleBet,
  useAdminGetSettlementStats,
  useAdminRunSettlement,
  getAdminGetBetsQueryKey,
  getAdminGetSettlementStatsQueryKey,
} from "@workspace/api-client-react";
import { BetStatusBadge } from "./Overview";
import { toast } from "sonner";

type BetWithExtras = {
  id: string;
  userId?: string;
  stake: string;
  totalOdds: string;
  potentialReturn: string;
  status: string;
  currency: string;
  createdAt: string;
  settledAt?: string | null;
  selections: Array<{ homeTeam: string; awayTeam: string; market: string; selection: string; odds: string }>;
};

type SettleStatus = "won" | "lost" | "void";

const thCls = "px-4 py-3 text-left text-[9.5px] font-bold uppercase tracking-[0.1em] whitespace-nowrap";
const thStyle = { color: "#1E3A5F", borderBottom: "1px solid rgba(255,255,255,0.04)" };

/* ─── Stat mini-card ─────────────────────────────────────────── */
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#334155" }}>{label}</p>
      <p className="text-[22px] font-extrabold tracking-tight leading-none" style={{ color }}>{value}</p>
    </div>
  );
}

/* ─── Settle modal ───────────────────────────────────────────── */
function SettleModal({ bet, onClose }: { bet: BetWithExtras; onClose: () => void }) {
  const queryClient = useQueryClient();
  const settleMut = useAdminSettleBet();
  const [pending, setPending] = useState<SettleStatus | null>(null);

  async function settle(status: SettleStatus) {
    setPending(status);
    try {
      const result = await settleMut.mutateAsync({ id: bet.id, data: { status } }) as BetWithExtras & { payout?: number };
      queryClient.invalidateQueries({ queryKey: getAdminGetBetsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminGetSettlementStatsQueryKey() });

      if (status === "won" && result.payout) {
        toast.success(`Bet settled — Won`, {
          description: `$${result.payout.toFixed(2)} USDT credited to user's balance`,
        });
      } else if (status === "void") {
        toast.success(`Bet voided`, {
          description: `$${parseFloat(bet.stake).toFixed(2)} USDT refunded to user's balance`,
        });
      } else {
        toast.success(`Bet settled — Lost`, { description: `No payout. Stake kept by house.` });
      }
      onClose();
    } catch {
      toast.error("Settlement failed", { description: "Could not settle the bet. Try again." });
    } finally {
      setPending(null);
    }
  }

  const sels = bet.selections ?? [];
  const firstSel = sels[0];

  const options: { status: SettleStatus; label: string; description: string; color: string }[] = [
    { status: "won",  label: "Won",  description: `Pay out $${parseFloat(bet.potentialReturn).toFixed(2)}`, color: "#00DFA9" },
    { status: "lost", label: "Lost", description: "No payout",    color: "#EF4444" },
    { status: "void", label: "Void", description: `Refund $${parseFloat(bet.stake).toFixed(2)}`, color: "#64748B" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl"
        style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.08)" }}>

        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <h3 className="text-[13px] font-bold text-white">Settle Bet</h3>
            <p className="text-[10.5px] font-mono mt-0.5" style={{ color: "#334155" }}>{bet.id.slice(0,16)}…</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "#334155" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#CBD5E1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#334155"; }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {firstSel && (
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-[12.5px] font-semibold text-white">
                {firstSel.homeTeam} <span style={{ color: "#334155" }}>vs</span> {firstSel.awayTeam}
              </div>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: "#64748B" }}>
                <span>{firstSel.market}</span>
                <span>·</span>
                <span className="font-semibold" style={{ color: "#00DFA9" }}>{firstSel.selection}</span>
                <span>·</span>
                <span>@{parseFloat(firstSel.odds).toFixed(2)}</span>
              </div>
              {sels.length > 1 && (
                <p className="text-[10px]" style={{ color: "#334155" }}>
                  + {sels.length - 1} more selection{sels.length > 2 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Stake",      value: `$${parseFloat(bet.stake).toFixed(2)}`,         color: "#F1F5F9" },
              { label: "Total Odds", value: parseFloat(bet.totalOdds).toFixed(2),           color: "#F1F5F9" },
              { label: "Return",     value: `$${parseFloat(bet.potentialReturn).toFixed(2)}`, color: "#00DFA9" },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-2.5 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[9.5px] mb-0.5" style={{ color: "#334155" }}>{item.label}</div>
                <div className="text-[13px] font-bold" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#334155" }}>Select outcome</p>
            <div className="grid grid-cols-3 gap-2">
              {options.map(opt => (
                <button
                  key={opt.status}
                  disabled={!!pending}
                  onClick={() => settle(opt.status)}
                  className="py-3 px-2 rounded-xl text-[11.5px] font-semibold border transition-all flex flex-col items-center gap-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `${opt.color}10`,
                    borderColor: `${opt.color}30`,
                    color: opt.color,
                  }}
                  onMouseEnter={e => { if (!pending) (e.currentTarget as HTMLElement).style.background = `${opt.color}20`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${opt.color}10`; }}>
                  {pending === opt.status ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                  ) : (
                    <>
                      <span>{opt.label}</span>
                      <span className="text-[9px] font-normal opacity-70">{opt.description}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function Bets() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminGetBets();
  const { data: statsData } = useAdminGetSettlementStats();
  const runSettlementMut = useAdminRunSettlement();

  const [search, setSearch]     = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [settling, setSettling] = useState<BetWithExtras | null>(null);
  const [running, setRunning]   = useState(false);

  const allBets = (data?.bets ?? []) as BetWithExtras[];

  const bets = allBets.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return b.id.toLowerCase().includes(q) || (b.userId?.toLowerCase().includes(q) ?? false);
  });

  const stats = statsData;

  async function handleRunSettlement() {
    setRunning(true);
    try {
      const result = await runSettlementMut.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getAdminGetBetsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getAdminGetSettlementStatsQueryKey() });
      if (result.settled > 0) {
        toast.success(`Settlement complete`, {
          description: `${result.settled} bets settled · ${result.won} won · ${result.lost} lost · $${result.totalPaidOut.toFixed(2)} paid out`,
        });
      } else {
        toast.info("Settlement run complete", {
          description: result.checked === 0
            ? "No eligible pending bets found"
            : `Checked ${result.checked} bets — no results available yet`,
        });
      }
    } catch {
      toast.error("Settlement run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5 animate-float-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[17px] font-bold text-white tracking-tight">Bets</h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#334155" }}>
            {data?.total ?? 0} total bets · Manual settle or run auto-settlement
          </p>
        </div>
        <button
          onClick={handleRunSettlement}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "rgba(0,223,169,0.12)", color: "#00DFA9", border: "1px solid rgba(0,223,169,0.25)" }}
          onMouseEnter={e => { if (!running) (e.currentTarget as HTMLElement).style.background = "rgba(0,223,169,0.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,223,169,0.12)"; }}>
          {running ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          )}
          {running ? "Running…" : "Run Settlement"}
        </button>
      </div>

      {/* Settlement stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          <StatCard label="Total"    value={stats.total}    color="#F1F5F9"/>
          <StatCard label="Pending"  value={stats.pending}  color="#FCD34D"/>
          <StatCard label="Won"      value={stats.won}      color="#00DFA9"/>
          <StatCard label="Lost"     value={stats.lost}     color="#F87171"/>
          <StatCard label="Void"     value={stats.void}     color="#64748B"/>
          <StatCard label="Wagered"  value={`$${parseFloat(stats.totalWagered).toLocaleString("en",{minimumFractionDigits:0,maximumFractionDigits:0})}`} color="#F1F5F9"/>
          <StatCard label="Paid Out" value={`$${parseFloat(stats.totalPaidOut).toLocaleString("en",{minimumFractionDigits:0,maximumFractionDigits:0})}`} color="#00DFA9"/>
          <StatCard label="House Edge" value={`$${parseFloat(stats.houseEdge).toLocaleString("en",{minimumFractionDigits:0,maximumFractionDigits:0})}`}
            color={parseFloat(stats.houseEdge) >= 0 ? "#A78BFA" : "#F87171"}/>
        </div>
      )}

      {/* How settlement works — info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#93C5FD" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div className="text-[11.5px] leading-relaxed" style={{ color: "#93C5FD" }}>
          <span className="font-semibold">Auto-settlement</span> runs every 5 minutes and checks completed matches via The Odds API.
          Set <code className="text-[10px] px-1 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.15)" }}>ODDS_API_KEY</code> in environment secrets to enable it.
          Without the key, use <span className="font-semibold">manual settle</span> on any pending bet below.
          <span className="font-semibold"> Won</span> bets credit the full return to the user's balance ·
          <span className="font-semibold"> Void</span> bets refund the stake.
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          className="text-[12px] rounded-lg px-3 py-2 outline-none cursor-pointer transition-all"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.08)", color: "#CBD5E1" }}>
          {["all", "pending", "won", "lost", "void"].map(s => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search by bet ID or user ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg text-[12px] placeholder:text-[#334155] outline-none transition-all flex-1 min-w-[200px] max-w-xs"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.08)", color: "#CBD5E1" }}
          onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
        <span className="text-[11.5px] ml-auto" style={{ color: "#334155" }}>
          {bets.length} {bets.length === 1 ? "bet" : "bets"}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full">
            <thead><tr>
              {["Bet ID","User","Match","Odds","Stake","Return","Status",""].map(h => (
                <th key={h} className={thCls} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {Array.from({length:6}).map((_,i) => (
                <tr key={i} className="border-b border-white/[0.03] last:border-0">
                  {Array.from({length:8}).map((__,j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-shimmer" style={{ width: `${50+(j*13)%50}px` }}/>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded-xl text-[12.5px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171" }}>
          Failed to load bets
        </div>
      ) : bets.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20 text-center"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <svg className="w-5 h-5" fill="none" stroke="#334155" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-white mb-1">
            {search || statusFilter !== "all" ? "No bets match your filters" : "No bets placed yet"}
          </p>
          <p className="text-[11.5px]" style={{ color: "#334155" }}>Bets will appear here once users start placing them</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["Bet ID","User","Match","Odds","Stake","Return","Status","Settled",""].map(h => (
                    <th key={h} className={thCls} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bets.map(b => {
                  const sels = b.selections ?? [];
                  const sel0 = sels[0];
                  const matchLabel = sel0 ? `${sel0.homeTeam} v ${sel0.awayTeam}` : "—";
                  return (
                    <tr key={b.id} className="table-row-hover border-b border-white/[0.03] last:border-0">
                      <td className="px-4 py-3 font-mono text-[10px]" style={{ color: "#334155" }}>{b.id.slice(0,8)}…</td>
                      <td className="px-4 py-3 font-mono text-[10px]" style={{ color: "#334155" }}>
                        {b.userId ? `${b.userId.slice(0,8)}…` : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <div className="text-[12px] text-white truncate">{matchLabel}</div>
                        {sels.length > 1 && (
                          <div className="text-[10px] mt-0.5" style={{ color: "#334155" }}>+{sels.length-1} more</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-white whitespace-nowrap">
                        {parseFloat(b.totalOdds).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[12px] font-bold text-white">${parseFloat(b.stake).toFixed(2)}</span>
                        <span className="text-[10px] ml-1" style={{ color: "#334155" }}>{b.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-bold whitespace-nowrap" style={{ color: "#00DFA9" }}>
                        ${parseFloat(b.potentialReturn).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><BetStatusBadge status={b.status}/></td>
                      <td className="px-4 py-3 text-[10.5px] whitespace-nowrap" style={{ color: "#334155" }}>
                        {b.settledAt ? new Date(b.settledAt).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.status === "pending" && (
                          <button
                            onClick={() => setSettling(b)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
                            style={{ background: "rgba(0,223,169,0.08)", color: "#00DFA9", border: "1px solid rgba(0,223,169,0.2)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,223,169,0.16)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,223,169,0.08)"; }}>
                            Settle
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {settling && <SettleModal bet={settling} onClose={() => setSettling(null)}/>}
    </div>
  );
}
