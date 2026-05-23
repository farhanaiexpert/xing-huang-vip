import { useState } from "react";
import { useAdminGetBets } from "@workspace/api-client-react";
import { BetStatusBadge } from "./Overview";

type BetWithExtras = {
  id: string;
  stake: string;
  totalOdds: string;
  potentialReturn: string;
  status: string;
  currency: string;
  createdAt: string;
  selections: unknown;
  userId?: string;
};

function TableSkeleton() {
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {["Bet ID", "User", "Match", "Status", "Stake", "Potential Return"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-36 rounded bg-muted animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-muted animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyIllustration({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 64 64">
        <rect x="10" y="8" width="44" height="48" rx="4" />
        <line x1="10" y1="20" x2="54" y2="20" />
        <line x1="20" y1="30" x2="44" y2="30" />
        <line x1="20" y1="38" x2="38" y2="38" />
        <line x1="20" y1="46" x2="30" y2="46" />
      </svg>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export default function Bets() {
  const { data, isLoading, error } = useAdminGetBets();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const allBets = (data?.bets ?? []) as BetWithExtras[];

  const bets = allBets.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.id.toLowerCase().includes(q) ||
      (b.userId?.toLowerCase().includes(q) ?? false)
    );
  });

  const totalStake = bets.reduce((acc, b) => acc + parseFloat(b.stake ?? "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} total · ${totalStake.toFixed(2)} USDT (filtered)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-card border border-border text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="void">Void</option>
          </select>
          <input
            type="search"
            placeholder="Search bet ID or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary w-56 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-lg">
          Failed to load bets
        </div>
      ) : bets.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl">
          <EmptyIllustration
            message={search || statusFilter !== "all" ? "No bets match your filters" : "No bets placed yet"}
          />
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bet ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Match</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stake</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Potential Return</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((b) => {
                  const sels = b.selections as Array<{ homeTeam: string; awayTeam: string }> | null;
                  const firstSel = Array.isArray(sels) ? sels[0] : null;
                  const matchLabel = firstSel
                    ? `${firstSel.homeTeam} v ${firstSel.awayTeam}`
                    : "—";
                  const extraLegs =
                    Array.isArray(sels) && sels.length > 1 ? `+${sels.length - 1} more` : null;

                  return (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {b.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {b.userId ? `${b.userId.slice(0, 8)}…` : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="text-xs text-foreground truncate">{matchLabel}</div>
                        {extraLegs && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{extraLegs}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <BetStatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-foreground">${parseFloat(b.stake).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-1">{b.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-primary font-medium whitespace-nowrap">
                        ${parseFloat(b.potentialReturn).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
