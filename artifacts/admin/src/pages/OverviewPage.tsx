import { useQuery } from "@tanstack/react-query";
import { api, AdminStats } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Users, Receipt, CreditCard, Wallet, TrendingUp, Clock } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-[#94A3B8]">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-[#94A3B8] mt-1">{sub}</div>}
    </div>
  );
}

interface ChartRow { day: string; count: number; volume: string }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1117] border border-white/10 rounded-lg p-3 text-xs">
      <div className="text-[#94A3B8] mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="text-white">
          {p.name === "count" ? `${p.value} bets` : `$${Number(p.value).toFixed(2)} vol`}
        </div>
      ))}
    </div>
  );
};

export default function OverviewPage() {
  const { data, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
    refetchInterval: 60_000,
  });

  const { data: chart = [] } = useQuery<ChartRow[]>({
    queryKey: ["admin-bets-chart"],
    queryFn: () => api.get<ChartRow[]>("/admin/stats/bets-chart"),
    refetchInterval: 120_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#00DFA9] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm">
      {error instanceof Error ? error.message : "Failed to load stats"}
    </div>
  );

  const s = data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-[#94A3B8] mt-1">Platform snapshot</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={s.users.total.toLocaleString()} color="bg-[#38BDF8]/10 text-[#38BDF8]" />
        <StatCard icon={Receipt} label="Total Bets" value={s.bets.total.toLocaleString()} sub={`${s.bets.open} open`} color="bg-[#00DFA9]/10 text-[#00DFA9]" />
        <StatCard icon={TrendingUp} label="Bet Volume" value={`$${fmt(s.bets.volume)} USDT`} color="bg-[#FACC15]/10 text-[#FACC15]" />
        <StatCard icon={Clock} label="Pending Deposits" value={s.transactions.pendingDeposits} color="bg-[#FACC15]/10 text-[#FACC15]" />
        <StatCard icon={CreditCard} label="Pending Withdrawals" value={s.transactions.pendingWithdrawals} color="bg-red-500/10 text-red-400" />
        <StatCard icon={Wallet} label="Total Wallet Balance" value={`$${fmt(s.platform.totalWalletBalance)} USDT`} sub={`Commissions paid: $${fmt(s.platform.totalCommissionsPaid)}`} color="bg-[#00DFA9]/10 text-[#00DFA9]" />
      </div>

      <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Bets placed — last 30 days</h2>
        {chart.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-[#94A3B8] text-sm">No bet data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="betsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00DFA9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00DFA9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="count" stroke="#00DFA9" strokeWidth={2} fill="url(#betsGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
