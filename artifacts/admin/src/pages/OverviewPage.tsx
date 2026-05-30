import { useQuery } from "@tanstack/react-query";
import { api, AdminStats, BetsChartRow, UsersChartRow, RevenueChartRow, RecentActivityItem, UserGrowthRow } from "@/lib/api";
import { fmt, fmtDate } from "@/lib/utils";
import {
  Users, Receipt, CreditCard, Wallet, TrendingUp, Clock, Banknote,
  ShieldCheck, Activity,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  iconBg?: string;
}) {
  return (
    <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5 hover:border-white/12 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-[#64748B] uppercase tracking-wide">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      {sub && <div className="text-xs text-[#475569] mt-1.5">{sub}</div>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5 animate-pulse">
      <div className="h-3 bg-white/5 rounded w-24 mb-4" />
      <div className="h-7 bg-white/5 rounded w-32 mb-2" />
      <div className="h-2.5 bg-white/5 rounded w-20" />
    </div>
  );
}

const ChartTooltip = ({ active, payload, label, prefix = "" }: {
  active?: boolean;
  payload?: { value: number | string; name: string; color?: string }[];
  label?: string;
  prefix?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1117] border border-white/12 rounded-lg p-3 text-xs shadow-xl">
      <div className="text-[#64748B] mb-2 font-medium">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color ?? "#00DFA9" }} />
          <span className="text-[#94A3B8] capitalize">{p.name}:</span>
          <span className="text-white font-semibold">
            {prefix}{typeof p.value === "number" ? p.value.toLocaleString() : Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

function activityIcon(item: RecentActivityItem) {
  return <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />;
}

export default function OverviewPage() {
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
    refetchInterval: 60_000,
  });

  const { data: betsChart = [] } = useQuery<BetsChartRow[]>({
    queryKey: ["admin-bets-chart"],
    queryFn: () => api.get<BetsChartRow[]>("/admin/stats/bets-chart"),
    refetchInterval: 120_000,
  });

  const { data: usersChart = [] } = useQuery<UsersChartRow[]>({
    queryKey: ["admin-users-chart"],
    queryFn: () => api.get<UsersChartRow[]>("/admin/stats/users-chart"),
    refetchInterval: 120_000,
  });

  const { data: userGrowth = [] } = useQuery<UserGrowthRow[]>({
    queryKey: ["admin-user-growth"],
    queryFn: () => api.get<UserGrowthRow[]>("/admin/stats/user-growth"),
    refetchInterval: 120_000,
  });

  const { data: revenueChart = [] } = useQuery<RevenueChartRow[]>({
    queryKey: ["admin-revenue-chart"],
    queryFn: () => api.get<RevenueChartRow[]>("/admin/stats/revenue-chart"),
    refetchInterval: 120_000,
  });

  const { data: activity = [] } = useQuery<RecentActivityItem[]>({
    queryKey: ["admin-recent-activity"],
    queryFn: () => api.get<RecentActivityItem[]>("/admin/stats/recent-activity"),
    refetchInterval: 30_000,
  });

  if (error) return (
    <div className="text-red-400 bg-red-500/8 border border-red-500/20 rounded-xl p-4 text-sm">
      {error instanceof Error ? error.message : "Failed to load stats"}
    </div>
  );

  const s = stats;

  const kpiCards = s ? [
    { icon: Users,      label: "Total Users",         value: s.users.total.toLocaleString(),             color: "bg-[#38BDF8]/10 text-[#38BDF8]" },
    { icon: Receipt,    label: "Total Bets",           value: s.bets.total.toLocaleString(),              color: "bg-[#00DFA9]/10 text-[#00DFA9]",  sub: `${s.bets.open} open` },
    { icon: TrendingUp, label: "Bet Volume",           value: `$${fmt(s.bets.volume)}`,                   color: "bg-[#FACC15]/10 text-[#FACC15]",  sub: "USDT total staked" },
    { icon: Clock,      label: "Pending Deposits",     value: s.transactions.pendingDeposits,             color: "bg-[#38BDF8]/10 text-[#38BDF8]" },
    { icon: CreditCard, label: "Pending Withdrawals",  value: s.transactions.pendingWithdrawals,          color: "bg-red-500/10 text-red-400" },
    { icon: Wallet,     label: "Platform Balance",     value: `$${fmt(s.platform.totalWalletBalance)}`,   color: "bg-[#00DFA9]/10 text-[#00DFA9]",  sub: "Total user wallets" },
    { icon: Banknote,   label: "Commissions Paid",     value: `$${fmt(s.platform.totalCommissionsPaid)}`, color: "bg-[#FACC15]/10 text-[#FACC15]",  sub: "Referral payouts" },
    { icon: TrendingUp, label: "Gross Revenue (GGR)",  value: `$${fmt(s.platform.grossRevenue)}`,         color: "bg-[#00DFA9]/10 text-[#00DFA9]",  sub: "Stakes − winnings" },
  ] : [];

  const revenueChartNum = revenueChart.map(r => ({
    day: r.day,
    Stakes: parseFloat(r.stakes),
    Payouts: parseFloat(r.payouts),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
          <p className="text-sm text-[#475569] mt-0.5">Platform snapshot · auto-refreshes every minute</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : kpiCards.map(card => <StatCard key={card.label} {...card} />)
        }
      </div>

      {/* Row 1: Bets area + New users line */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#0D1117] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Bets placed — last 30 days</h2>
            {betsChart.length > 0 && (
              <span className="text-xs text-[#475569]">{betsChart.reduce((s, r) => s + r.count, 0).toLocaleString()} total</span>
            )}
          </div>
          {betsChart.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-[#334155] text-sm">No bet data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={betsChart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="betsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00DFA9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00DFA9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#00DFA9" strokeWidth={2} fill="url(#betsGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">New vs Returning — last 30 days</h2>
            <div className="flex items-center gap-3 text-[10px] text-[#475569]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#38BDF8] inline-block" />New</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00DFA9] inline-block" />Returning</span>
            </div>
          </div>
          {userGrowth.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-[#334155] text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={userGrowth} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="newUsers"        name="new"       stroke="#38BDF8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="returningLogins" name="returning" stroke="#00DFA9" strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Revenue vs Payouts stacked bar + Recent admin activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#0D1117] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Revenue vs Payouts — last 30 days</h2>
            <span className="text-xs text-[#475569]">USDT</span>
          </div>
          {revenueChartNum.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-[#334155] text-sm">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueChartNum} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<ChartTooltip prefix="$" />} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#64748B", paddingTop: "8px" }}
                  formatter={(v) => <span style={{ color: "#64748B" }}>{v}</span>}
                />
                <Bar dataKey="Stakes" stackId="a" fill="#00DFA9" fillOpacity={0.75} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Payouts" stackId="a" fill="#F87171" fillOpacity={0.75} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent admin activity</h2>
            <span className="text-xs text-[#334155]">auto-refresh 30s</span>
          </div>
          {activity.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-[#334155] text-sm">No admin activity yet</div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
              {activity.map((item, i) => (
                <div key={`${item.id}-${i}`} className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    {activityIcon(item)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs text-white font-medium truncate">
                        {item.adminUsername ?? `uid:${item.adminId}`}
                      </span>
                      <span className={cn(
                        "text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded",
                        item.entityType ? "bg-[#38BDF8]/8 text-[#38BDF8]" : "bg-white/5 text-[#475569]"
                      )}>
                        {item.entityType ?? "—"}
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B] truncate mt-0.5">{item.action.replace(/_/g, " ")}</div>
                    <div className="text-[10px] text-[#334155] mt-0.5">{fmtDate(item.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
