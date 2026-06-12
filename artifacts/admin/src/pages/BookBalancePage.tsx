import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DollarSign, TrendingUp, TrendingDown, Scale, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SportOpenRow {
  sport: string;
  open_bets: number;
  total_staked: string;
  potential_payout: string;
}

interface SportSettledRow {
  sport: string;
  bets_won: number;
  bets_lost: number;
  bets_voided: number;
  total_staked: string;
  total_paid_out: string;
}

interface BookBalance {
  platform: {
    openBets: number;
    settledBets: number;
    lifetimeStaked: number;
    lifetimePaidOut: number;
    houseEdge: number;
  };
  openBySport: SportOpenRow[];
  settledBySport: SportSettledRow[];
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-[#111827] border border-white/8 rounded-xl p-5 flex items-start gap-4">
      <div className={cn("p-2 rounded-lg shrink-0", color.replace("text-", "bg-") + "/10")}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <p className="text-xs text-[#6B7280] mb-1">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-[#6B7280] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function BookBalancePage() {
  const { data, isLoading, refetch, isFetching } = useQuery<BookBalance>({
    queryKey: ["book-balance"],
    queryFn: () => api.get("/admin/reports/book-balance"),
    refetchInterval: 60_000,
  });

  const p = data?.platform;
  const margin = p && p.lifetimeStaked > 0
    ? ((p.houseEdge / p.lifetimeStaked) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Book Balance</h1>
          <p className="text-sm text-[#6B7280] mt-1">Stakes vs payouts vs settled — overall and per sport</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/8 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-[#6B7280]">Loading…</div>
      ) : (
        <>
          {/* Platform KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Lifetime Staked"
              value={`$${fmt(p?.lifetimeStaked ?? 0)}`}
              sub={`${p?.openBets ?? 0} open + ${p?.settledBets ?? 0} settled bets`}
              color="text-[#38BDF8]"
              icon={DollarSign}
            />
            <StatCard
              label="Lifetime Paid Out"
              value={`$${fmt(p?.lifetimePaidOut ?? 0)}`}
              sub="Won + voided payouts"
              color="text-[#FACC15]"
              icon={TrendingUp}
            />
            <StatCard
              label="House Edge (Net)"
              value={`$${fmt(p?.houseEdge ?? 0)}`}
              sub={`${margin}% effective margin`}
              color={(p?.houseEdge ?? 0) >= 0 ? "text-[#00DFA9]" : "text-[#EF4444]"}
              icon={(p?.houseEdge ?? 0) >= 0 ? TrendingUp : TrendingDown}
            />
            <StatCard
              label="Open Exposure"
              value={`${p?.openBets ?? 0} bets`}
              sub="Bets awaiting settlement"
              color="text-orange-400"
              icon={Scale}
            />
          </div>

          {/* Open bets by sport */}
          <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-2">
              <Scale className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">Open Exposure by Sport</span>
              <span className="ml-auto text-xs text-[#6B7280]">Stakes the house owes if all open bets win</span>
            </div>
            {(data?.openBySport?.length ?? 0) === 0 ? (
              <p className="text-center text-[#6B7280] py-10 text-sm">No open bets</p>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead>
                  <tr className="text-[#6B7280] text-xs border-b border-white/5">
                    <th className="text-left px-5 py-3">Sport</th>
                    <th className="text-right px-5 py-3">Open Bets</th>
                    <th className="text-right px-5 py-3">Total Staked</th>
                    <th className="text-right px-5 py-3">Max Payout Owed</th>
                    <th className="text-right px-5 py-3">Exposure Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.openBySport.map((row) => {
                    const staked = parseFloat(row.total_staked ?? "0");
                    const payout = parseFloat(row.potential_payout ?? "0");
                    const ratio = staked > 0 ? (payout / staked).toFixed(2) : "—";
                    return (
                      <tr key={row.sport} className="border-b border-white/5 hover:bg-white/2">
                        <td className="px-5 py-3 text-white font-medium capitalize">{row.sport.replace(/_/g, " ")}</td>
                        <td className="px-5 py-3 text-right text-[#94A3B8]">{row.open_bets}</td>
                        <td className="px-5 py-3 text-right text-[#38BDF8]">${fmt(staked)}</td>
                        <td className="px-5 py-3 text-right text-orange-400">${fmt(payout)}</td>
                        <td className="px-5 py-3 text-right text-[#94A3B8]">{ratio}×</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            )}
          </div>

          {/* Settled bets by sport */}
          <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00DFA9]" />
              <span className="text-sm font-semibold text-white">Settled P&amp;L by Sport</span>
              <span className="ml-auto text-xs text-[#6B7280]">House keeps: staked − paid out</span>
            </div>
            {(data?.settledBySport?.length ?? 0) === 0 ? (
              <p className="text-center text-[#6B7280] py-10 text-sm">No settled bets yet</p>
            ) : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead>
                  <tr className="text-[#6B7280] text-xs border-b border-white/5">
                    <th className="text-left px-5 py-3">Sport</th>
                    <th className="text-right px-5 py-3">Won</th>
                    <th className="text-right px-5 py-3">Lost</th>
                    <th className="text-right px-5 py-3">Void</th>
                    <th className="text-right px-5 py-3">Staked</th>
                    <th className="text-right px-5 py-3">Paid Out</th>
                    <th className="text-right px-5 py-3">House P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.settledBySport.map((row) => {
                    const staked = parseFloat(row.total_staked ?? "0");
                    const paid = parseFloat(row.total_paid_out ?? "0");
                    const pnl = staked - paid;
                    return (
                      <tr key={row.sport} className="border-b border-white/5 hover:bg-white/2">
                        <td className="px-5 py-3 text-white font-medium capitalize">{row.sport.replace(/_/g, " ")}</td>
                        <td className="px-5 py-3 text-right text-[#00DFA9]">{row.bets_won}</td>
                        <td className="px-5 py-3 text-right text-[#EF4444]">{row.bets_lost}</td>
                        <td className="px-5 py-3 text-right text-[#6B7280]">{row.bets_voided}</td>
                        <td className="px-5 py-3 text-right text-[#38BDF8]">${fmt(staked)}</td>
                        <td className="px-5 py-3 text-right text-[#FACC15]">${fmt(paid)}</td>
                        <td className={cn("px-5 py-3 text-right font-semibold", pnl >= 0 ? "text-[#00DFA9]" : "text-[#EF4444]")}>
                          {pnl >= 0 ? "+" : ""}${fmt(pnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
