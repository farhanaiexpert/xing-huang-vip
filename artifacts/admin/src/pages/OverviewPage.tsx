import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  api, AdminStats, BetsChartRow, UsersChartRow, RevenueChartRow, RecentActivityItem, UserGrowthRow,
  UsersSummary, ApiStatusResponse, ApiProvider, MarketLiabilityRow, RevenueBySport,
} from "@/lib/api";
import { fmt, fmtDate } from "@/lib/utils";
import {
  Users, Receipt, CreditCard, Wallet, TrendingUp, Clock, Banknote,
  ShieldCheck, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle,
  Server, ShieldAlert, Trophy, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

type DeltaTone = "up-good" | "down-good";

function DeltaBadge({ today, yesterday, tone = "up-good" }: {
  today: number; yesterday: number; tone?: DeltaTone;
}) {
  // No baseline at all → neutral, nothing to compare.
  if (yesterday === 0 && today === 0) {
    return <span className="inline-flex items-center gap-1 text-[10px] text-[#475569]"><Minus className="w-3 h-3" />no change vs yesterday</span>;
  }

  let pctLabel: string;
  let direction: "up" | "down" | "flat";
  if (yesterday === 0) {
    pctLabel = "new today";
    direction = "up";
  } else {
    const pct = ((today - yesterday) / yesterday) * 100;
    direction = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
    pctLabel = `${Math.abs(pct).toFixed(0)}% vs yesterday`;
  }

  if (direction === "flat") {
    return <span className="inline-flex items-center gap-1 text-[10px] text-[#475569]"><Minus className="w-3 h-3" />no change vs yesterday</span>;
  }

  const favorable = tone === "up-good" ? direction === "up" : direction === "down";
  const color = favorable ? "text-[#00DFA9]" : "text-[#FACC15]";
  const Icon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium tabular-nums", color)}>
      <Icon className="w-3 h-3" />{pctLabel}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, delta }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5 hover:border-white/12 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-[#64748B] uppercase tracking-wide">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white tracking-tight tabular-nums">{value}</div>
      {delta ? <div className="mt-1.5">{delta}</div> : sub && <div className="text-xs text-[#475569] mt-1.5">{sub}</div>}
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
          <span className="text-white font-semibold tabular-nums">
            {prefix}{typeof p.value === "number" ? p.value.toLocaleString() : Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

function activityIcon(_item: RecentActivityItem) {
  return <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />;
}

// ── Shared widget shell with per-widget loading / empty / error states ──
function Widget({ title, icon: Icon, headerRight, isLoading, error, isEmpty, emptyText, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  headerRight?: React.ReactNode;
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#64748B]" />{title}
        </h2>
        {headerRight}
      </div>
      {isLoading ? (
        <div className="space-y-2.5 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-8 bg-white/5 rounded" />)}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 text-red-400/80 text-xs text-center px-4">
          {error instanceof Error ? error.message : "Failed to load"}
        </div>
      ) : isEmpty ? (
        <div className="flex items-center justify-center h-32 text-[#334155] text-sm">{emptyText}</div>
      ) : children}
    </div>
  );
}

const STATUS_META: Record<ApiProvider["status"], { dot: string; label: string; text: string }> = {
  operational: { dot: "bg-[#00DFA9]", label: "Operational", text: "text-[#00DFA9]" },
  idle:        { dot: "bg-[#38BDF8]", label: "Idle",        text: "text-[#38BDF8]" },
  degraded:    { dot: "bg-[#FACC15]", label: "Degraded",    text: "text-[#FACC15]" },
  throttled:   { dot: "bg-[#FACC15]", label: "Throttled",   text: "text-[#FACC15]" },
  paused:      { dot: "bg-[#64748B]", label: "Paused",      text: "text-[#64748B]" },
  down:        { dot: "bg-red-400",   label: "Down",        text: "text-red-400" },
};

const SPORT_COLORS = ["#00DFA9", "#38BDF8", "#FACC15", "#A78BFA", "#F472B6", "#34D399", "#FB923C"];

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

  // ── New widgets (each independent, own loading/empty/error) ──
  const usersSummary = useQuery<UsersSummary>({
    queryKey: ["admin-users-summary"],
    queryFn: () => api.get<UsersSummary>("/admin/users/summary?excludeTest=true"),
    refetchInterval: 60_000,
  });

  const apiStatus = useQuery<ApiStatusResponse>({
    queryKey: ["admin-api-status"],
    queryFn: () => api.get<ApiStatusResponse>("/admin/api-status"),
    refetchInterval: 60_000,
  });

  const liability = useQuery<MarketLiabilityRow[]>({
    queryKey: ["admin-liability"],
    queryFn: () => api.get<MarketLiabilityRow[]>("/admin/liability"),
    refetchInterval: 60_000,
  });

  const revenueBySport = useQuery<RevenueBySport[]>({
    queryKey: ["admin-revenue-by-sport"],
    queryFn: () => api.get<RevenueBySport[]>("/admin/reports/revenue-by-sport"),
    refetchInterval: 120_000,
  });

  if (error) return (
    <div className="text-red-400 bg-red-500/8 border border-red-500/20 rounded-xl p-4 text-sm">
      {error instanceof Error ? error.message : "Failed to load stats"}
    </div>
  );

  const s = stats;
  const d = s?.deltas;

  const kpiCards = s ? [
    { icon: Users,      label: "Total Users",         value: s.users.total.toLocaleString(),             color: "bg-[#38BDF8]/10 text-[#38BDF8]",
      delta: d && <DeltaBadge today={d.newUsers.today} yesterday={d.newUsers.yesterday} /> },
    { icon: Receipt,    label: "Total Bets",           value: s.bets.total.toLocaleString(),              color: "bg-[#00DFA9]/10 text-[#00DFA9]",  sub: `${s.bets.open} open`,
      delta: d && <DeltaBadge today={d.bets.today} yesterday={d.bets.yesterday} /> },
    { icon: TrendingUp, label: "Bet Volume",           value: `$${fmt(s.bets.volume)}`,                   color: "bg-[#FACC15]/10 text-[#FACC15]",  sub: "USDT total staked",
      delta: d && <DeltaBadge today={Number(d.betVolume.today)} yesterday={Number(d.betVolume.yesterday)} /> },
    { icon: Clock,      label: "Pending Deposits",     value: s.transactions.pendingDeposits,             color: "bg-[#38BDF8]/10 text-[#38BDF8]" },
    { icon: CreditCard, label: "Pending Withdrawals",  value: s.transactions.pendingWithdrawals,          color: "bg-red-500/10 text-red-400" },
    { icon: Wallet,     label: "Platform Balance",     value: `$${fmt(s.platform.totalWalletBalance)}`,   color: "bg-[#00DFA9]/10 text-[#00DFA9]",  sub: "Total user wallets" },
    { icon: Banknote,   label: "Commissions Paid",     value: `$${fmt(s.platform.totalCommissionsPaid)}`, color: "bg-[#FACC15]/10 text-[#FACC15]",  sub: "Referral payouts",
      delta: d && <DeltaBadge today={Number(d.commissions.today)} yesterday={Number(d.commissions.yesterday)} tone="down-good" /> },
    { icon: TrendingUp, label: "Gross Revenue (GGR)",  value: `$${fmt(s.platform.grossRevenue)}`,         color: "bg-[#00DFA9]/10 text-[#00DFA9]",  sub: "Stakes − winnings",
      delta: d && <DeltaBadge today={Number(d.grossRevenue.today)} yesterday={Number(d.grossRevenue.yesterday)} /> },
  ] : [];

  const revenueChartNum = revenueChart.map(r => ({
    day: r.day,
    Stakes: parseFloat(r.stakes),
    Payouts: parseFloat(r.payouts),
  }));

  // ── Attention strip chips ──
  const providers = apiStatus.data?.providers ?? [];
  const apiIssues = providers.filter(p => p.status === "down" || p.status === "throttled").length;
  type Chip = { label: string; count: number; to: string; tone: "red" | "gold" | "blue" };
  const chips: Chip[] = s ? ([
    { label: "Pending deposits",    count: s.transactions.pendingDeposits,    to: "/deposits",    tone: "blue" },
    { label: "Pending withdrawals", count: s.transactions.pendingWithdrawals, to: "/withdrawals", tone: "red" },
    { label: "KYC pending",         count: s.attention?.kycPending ?? 0,      to: "/users",       tone: "gold" },
    { label: "Risk flags (24h)",    count: s.attention?.riskFlags ?? 0,       to: "/rg-players",  tone: "red" },
    { label: "API issues",          count: apiIssues,                         to: "/api-status",  tone: "gold" },
  ] as Chip[]).filter(c => c.count > 0) : [];

  const chipTone: Record<Chip["tone"], string> = {
    red:  "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15",
    gold: "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20 hover:bg-[#FACC15]/15",
    blue: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20 hover:bg-[#38BDF8]/15",
  };

  // ── Liability / sport-volume derived ──
  const topMarkets = (liability.data ?? []).slice(0, 6);
  const sportRows = (revenueBySport.data ?? [])
    .map(r => ({ sport: r.sport, staked: Number(r.totalStaked), betCount: r.betCount }))
    .filter(r => r.staked > 0)
    .sort((a, b) => b.staked - a.staked)
    .slice(0, 7);
  const sportMax = sportRows.reduce((m, r) => Math.max(m, r.staked), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
          <p className="text-sm text-[#475569] mt-0.5">Platform snapshot · auto-refreshes every minute</p>
        </div>
      </div>

      {/* Action Required strip */}
      {chips.length > 0 && (
        <div className="bg-[#0D1117] border border-[#FACC15]/20 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] pr-1">
            <AlertTriangle className="w-4 h-4" />Action required
          </span>
          {chips.map(c => (
            <Link
              key={c.label}
              href={c.to}
              className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors", chipTone[c.tone])}
            >
              {c.label}
              <span className="tabular-nums font-bold rounded bg-black/20 px-1.5 py-0.5 text-[11px]">{c.count.toLocaleString()}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : kpiCards.map(card => <StatCard key={card.label} {...card} />)
        }
      </div>

      {/* Operations row: API health · Player health · Top markets · Volume by sport */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* API health */}
        <Widget
          title="API health"
          icon={Server}
          isLoading={apiStatus.isLoading}
          error={apiStatus.error}
          isEmpty={providers.length === 0}
          emptyText="No providers"
          headerRight={<span className="text-[10px] text-[#334155]">today</span>}
        >
          <div className="space-y-3">
            {providers.map(p => {
              const meta = STATUS_META[p.status];
              return (
                <div key={p.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
                      <span className="text-xs text-white font-medium truncate">{p.name}</span>
                    </div>
                    <div className="text-[10px] text-[#475569] mt-0.5 tabular-nums">
                      {p.callsToday.toLocaleString()} calls · {p.errorsToday.toLocaleString()} err
                      {p.quotaRemaining != null && <> · {p.quotaRemaining.toLocaleString()} credits</>}
                      {p.hourlyRemaining != null && <> · {p.hourlyRemaining}/{p.hourlyLimit} window</>}
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-semibold shrink-0", meta.text)}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </Widget>

        {/* Player health */}
        <Widget
          title="Player health"
          icon={ShieldAlert}
          isLoading={usersSummary.isLoading}
          error={usersSummary.error}
          isEmpty={!usersSummary.data}
          emptyText="No data"
        >
          {usersSummary.data && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Active</span>
                <span className="text-[#00DFA9] font-semibold tabular-nums">{usersSummary.data.active.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Suspended</span>
                <span className="text-red-400 font-semibold tabular-nums">{usersSummary.data.suspended.toLocaleString()}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">KYC verified</span>
                <span className="text-[#00DFA9] font-semibold tabular-nums">{usersSummary.data.kycVerified.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">KYC pending</span>
                <span className="text-[#FACC15] font-semibold tabular-nums">{usersSummary.data.kycPending.toLocaleString()}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Risk flags (24h)</span>
                <span className={cn("font-semibold tabular-nums", (s?.attention?.riskFlags ?? 0) > 0 ? "text-[#FACC15]" : "text-[#475569]")}>
                  {(s?.attention?.riskFlags ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </Widget>

        {/* Top markets by liability */}
        <Widget
          title="Top liability"
          icon={Trophy}
          isLoading={liability.isLoading}
          error={liability.error}
          isEmpty={topMarkets.length === 0}
          emptyText="No open exposure"
          headerRight={<span className="text-[10px] text-[#334155]">USDT payout</span>}
        >
          <div className="space-y-2.5">
            {topMarkets.map(m => (
              <div key={m.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-white font-medium truncate">{m.eventName}</div>
                  <div className="text-[10px] text-[#475569] truncate">{m.selection} · {m.betCount} bets</div>
                </div>
                <span className="text-xs font-semibold text-[#FACC15] tabular-nums shrink-0">${fmt(m.potentialPayout)}</span>
              </div>
            ))}
          </div>
        </Widget>

        {/* Volume by sport */}
        <Widget
          title="Volume by sport"
          icon={BarChart3}
          isLoading={revenueBySport.isLoading}
          error={revenueBySport.error}
          isEmpty={sportRows.length === 0}
          emptyText="No volume yet"
          headerRight={<span className="text-[10px] text-[#334155]">USDT staked</span>}
        >
          <div className="space-y-2.5">
            {sportRows.map((r, i) => (
              <div key={r.sport}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#94A3B8] truncate capitalize">{r.sport}</span>
                  <span className="text-white font-semibold tabular-nums">${fmt(r.staked)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${sportMax > 0 ? (r.staked / sportMax) * 100 : 0}%`, backgroundColor: SPORT_COLORS[i % SPORT_COLORS.length] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Widget>
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
