import { useState } from "react";
import { useAdminGetBets } from "@workspace/api-client-react";
import { BetStatusBadge } from "./Overview";

export default function Bets() {
  const { data, isLoading, error } = useAdminGetBets();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const bets = (data?.bets ?? []).filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (!search) return true;
    return b.id.toLowerCase().includes(search.toLowerCase());
  });

  const totalStake = bets.reduce((acc, b) => acc + parseFloat(b.stake ?? "0"), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Bets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} total · ${totalStake.toFixed(2)} USDT wagered (filtered)
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
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="search"
            placeholder="Search by bet ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary w-56 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-lg">
          Failed to load bets
        </div>
      ) : bets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search || statusFilter !== "all" ? "No bets match your filters" : "No bets placed yet"}
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bet ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stake</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Odds</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Potential Return</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Placed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selections</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {b.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      ${parseFloat(b.stake).toFixed(2)}
                      <span className="text-xs font-normal text-muted-foreground ml-1">{b.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {parseFloat(b.totalOdds).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-primary font-medium">
                      ${parseFloat(b.potentialReturn).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <BetStatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {Array.isArray(b.selections) ? b.selections.length : 0} leg{Array.isArray(b.selections) && b.selections.length !== 1 ? "s" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
