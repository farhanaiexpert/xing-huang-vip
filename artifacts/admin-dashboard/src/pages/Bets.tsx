import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetBets,
  useAdminSettleBet,
  getAdminGetBetsQueryKey,
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
  selections: Array<{ homeTeam: string; awayTeam: string; market: string; selection: string; odds: string }>;
};

type SettleStatus = "won" | "lost" | "void";

function TableSkeleton() {
  return (
    <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.04]">
            {["Bet ID", "User ID", "Match", "Odds", "Stake", "Return", "Status", "Actions"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-0">
              {Array.from({ length: 8 }).map((__, j) => (
                <td key={j} className="px-4 py-3"><div className="h-3.5 rounded bg-white/5 animate-pulse" style={{ width: `${60 + (j * 15) % 60}px` }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettleModal({ bet, onClose }: { bet: BetWithExtras; onClose: () => void }) {
  const queryClient = useQueryClient();
  const settleMut = useAdminSettleBet();
  const [pending, setPending] = useState<SettleStatus | null>(null);

  async function settle(status: SettleStatus) {
    setPending(status);
    try {
      await settleMut.mutateAsync({ id: bet.id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getAdminGetBetsQueryKey() });
      toast.success(`Bet settled as ${status}`, { description: `Bet ${bet.id.slice(0, 8)}… marked ${status}` });
      onClose();
    } catch {
      toast.error("Settlement failed", { description: "Could not update the bet. Try again." });
    } finally {
      setPending(null);
    }
  }

  const sels = bet.selections ?? [];
  const firstSel = sels[0];

  const options: { status: SettleStatus; label: string; cls: string }[] = [
    { status: "won",  label: "Mark Won",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25" },
    { status: "lost", label: "Mark Lost", cls: "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25" },
    { status: "void", label: "Void",      cls: "bg-white/5 text-[#8A9BB3] border-white/10 hover:bg-white/10" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#0D1117] border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Settle Bet</h3>
            <p className="text-[11px] text-[#4A5568] mt-0.5 font-mono">{bet.id.slice(0, 16)}…</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-[#4A5568] hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {firstSel && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2.5">
              <div className="text-xs font-semibold text-foreground">{firstSel.homeTeam} <span className="text-[#4A5568]">vs</span> {firstSel.awayTeam}</div>
              <div className="flex items-center gap-3 text-[11px] text-[#4A5568]">
                <span>{firstSel.market}</span>
                <span>·</span>
                <span className="text-primary font-semibold">{firstSel.selection}</span>
                <span>·</span>
                <span>@{parseFloat(firstSel.odds as string).toFixed(2)}</span>
              </div>
              {sels.length > 1 && <p className="text-[10px] text-[#4A5568]">+ {sels.length - 1} more selection{sels.length > 2 ? "s" : ""}</p>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-[#4A5568] mb-0.5">Stake</div>
              <div className="text-sm font-bold text-foreground">${parseFloat(bet.stake).toFixed(2)}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-[#4A5568] mb-0.5">Total Odds</div>
              <div className="text-sm font-bold text-foreground">{parseFloat(bet.totalOdds).toFixed(2)}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-center">
              <div className="text-[10px] text-[#4A5568] mb-0.5">Return</div>
              <div className="text-sm font-bold text-primary">${parseFloat(bet.potentialReturn).toFixed(2)}</div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#4A5568] mb-2 uppercase tracking-wider">Select outcome</p>
            <div className="grid grid-cols-3 gap-2">
              {options.map(opt => (
                <button
                  key={opt.status}
                  disabled={!!pending}
                  onClick={() => settle(opt.status)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${opt.cls}`}
                >
                  {pending === opt.status ? (
                    <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Bets() {
  const { data, isLoading, error } = useAdminGetBets();
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [settling, setSettling]   = useState<BetWithExtras | null>(null);

  const allBets = (data?.bets ?? []) as BetWithExtras[];

  const bets = allBets.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return b.id.toLowerCase().includes(q) || (b.userId?.toLowerCase().includes(q) ?? false);
  });

  const totalStake = bets.reduce((s, b) => s + parseFloat(b.stake ?? "0"), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-foreground">Bets</h1>
          <p className="text-xs text-[#4A5568] mt-0.5">
            {data?.total ?? 0} total · ${totalStake.toFixed(2)} USDT wagered (filtered)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="text-xs bg-[#0D1117] border border-white/[0.08] text-foreground rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            {["all", "pending", "won", "lost", "void"].map(s => (
              <option key={s} value={s}>{s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search bet ID or user ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0D1117] border border-white/[0.08] text-sm text-foreground placeholder:text-[#4A5568] focus:outline-none focus:border-primary/50 w-56 transition-colors"
          />
        </div>
      </div>

      {isLoading ? <TableSkeleton /> : error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
          Failed to load bets
        </div>
      ) : bets.length === 0 ? (
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center py-20 text-[#4A5568] gap-3">
          <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 64 64">
            <rect x="10" y="8" width="44" height="48" rx="4" /><line x1="10" y1="20" x2="54" y2="20" />
            <line x1="20" y1="30" x2="44" y2="30" /><line x1="20" y1="38" x2="38" y2="38" />
          </svg>
          <p className="text-sm font-medium">{search || statusFilter !== "all" ? "No bets match your filters" : "No bets placed yet"}</p>
        </div>
      ) : (
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Bet ID", "User ID", "Match", "Odds", "Stake", "Return", "Status", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bets.map(b => {
                  const sels = b.selections ?? [];
                  const sel0 = sels[0];
                  const matchLabel = sel0 ? `${sel0.homeTeam} v ${sel0.awayTeam}` : "—";
                  const canSettle = b.status === "pending";
                  return (
                    <tr key={b.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-[#4A5568] whitespace-nowrap">{b.id.slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#4A5568] whitespace-nowrap">{b.userId ? `${b.userId.slice(0, 8)}…` : "—"}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="text-xs text-foreground truncate">{matchLabel}</div>
                        {sels.length > 1 && <div className="text-[10px] text-[#4A5568] mt-0.5">+{sels.length - 1} more</div>}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-foreground whitespace-nowrap">{parseFloat(b.totalOdds).toFixed(2)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-foreground">${parseFloat(b.stake).toFixed(2)}</span>
                        <span className="text-[10px] text-[#4A5568] ml-1">{b.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-primary whitespace-nowrap">${parseFloat(b.potentialReturn).toFixed(2)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><BetStatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {canSettle && (
                          <button
                            onClick={() => setSettling(b)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/5 text-[#8A9BB3] border border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                          >
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

      {settling && <SettleModal bet={settling} onClose={() => setSettling(null)} />}
    </div>
  );
}
