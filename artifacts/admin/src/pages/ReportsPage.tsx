import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, RevenueBySport, TopBettor, DailyPnL, DailyMetricsRow } from "@/lib/api";
import {
  BarChart2, Download, TrendingUp, Trophy, Activity, RotateCcw,
  Users, ArrowDownLeft, ArrowUpRight, TrendingDown, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, ReferenceLine,
} from "recharts";

function fmtUSD(n: string | number) {
  const v = parseFloat(String(n));
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sportLabel(s: string) {
  const map: Record<string, string> = {
    sp_soccer: "Soccer", sp_basketball: "Basketball", sp_american_football: "NFL",
    sp_tennis: "Tennis", sp_cricket: "Cricket", sp_baseball: "Baseball",
    sp_mma: "MMA", sp_aussie_rules: "Aussie Rules", sp_ice_hockey: "Ice Hockey",
    sp_boxing: "Boxing", sp_golf: "Golf", sp_rugby_union: "Rugby",
  };
  return map[s] ?? s.replace(/^sp_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

async function downloadCSV(path: string, filename: string) {
  const token = sessionStorage.getItem("cb_admin_token");
  const res = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function offsetStr(days: number) {
  const d = new Date(); d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Today",  from: () => todayStr(),      to: () => todayStr() },
  { label: "7d",     from: () => offsetStr(6),     to: () => todayStr() },
  { label: "30d",    from: () => offsetStr(29),    to: () => todayStr() },
  { label: "90d",    from: () => offsetStr(89),    to: () => todayStr() },
];

const inputCls =
  "bg-[#0B0F14] border border-white/10 text-white text-xs rounded-md px-2.5 py-1.5 " +
  "focus:outline-none focus:border-[#A78BFA]/50 [color-scheme:dark] w-[118px]";

function ChartTip({ active, payload, label, usdKeys, countKeys }: {
  active?: boolean;
  payload?: { value: number; name: string; color?: string }[];
  label?: string;
  usdKeys?: string[];
  countKeys?: string[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1117] border border-white/12 rounded-lg p-3 text-xs shadow-xl">
      <div className="text-[#64748B] font-medium mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[#94A3B8]">{p.name}:</span>
          <span className="text-white font-semibold tabular-nums">
            {countKeys?.includes(p.name)
              ? p.value.toLocaleString("en-US")
              : fmtUSD(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, description, icon: Icon, accent, action, children }: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/6 flex items-start gap-3">
        <div className={cn("p-2 rounded-lg mt-0.5 shrink-0", accent.replace("text-", "bg-").replace("]", "/10]"))}>
          <Icon className={cn("w-3.5 h-3.5", accent)} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white leading-tight">{title}</h2>
          {description && <p className="text-xs text-[#475569] mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color, bg, dimValue }: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string; dimValue?: boolean;
}) {
  return (
    <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4 hover:border-white/12 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest">{label}</span>
        <div className={cn("p-1.5 rounded-lg", bg)}>
          <Icon className={cn("w-3.5 h-3.5", color)} />
        </div>
      </div>
      <div className={cn("text-xl font-bold tabular-nums leading-tight", dimValue ? color : "text-white")}>{value}</div>
      {sub && <div className="text-[11px] text-[#475569] mt-1">{sub}</div>}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-white/5 rounded-lg", className)} />;
}

function MarginBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[#475569]">—</span>;
  const cls = pct >= 8 ? "bg-[#00DFA9]/15 text-[#00DFA9]"
    : pct >= 3 ? "bg-[#FACC15]/15 text-[#FACC15]"
    : pct >= 0 ? "bg-[#94A3B8]/15 text-[#94A3B8]"
    : "bg-[#F87171]/15 text-[#F87171]";
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums", cls)}>
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

function VolumeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function ReportsPage() {
  const [from, setFrom] = useState(() => offsetStr(29));
  const [to,   setTo]   = useState(() => todayStr());

  const activePreset = PRESETS.find(p => p.from() === from && p.to() === to)?.label ?? null;

  function applyPreset(p: typeof PRESETS[0]) {
    setFrom(p.from()); setTo(p.to());
  }

  const { data: revBySport = [], isLoading: loadingSport } = useQuery<RevenueBySport[]>({
    queryKey: ["admin-reports-sport"],
    queryFn: () => api.get("/admin/reports/revenue-by-sport"),
  });

  const { data: topBettors = [], isLoading: loadingTop } = useQuery<TopBettor[]>({
    queryKey: ["admin-reports-top-bettors"],
    queryFn: () => api.get("/admin/reports/top-bettors"),
  });

  const { data: pnl = [], isLoading: loadingPnL } = useQuery<DailyPnL[]>({
    queryKey: ["admin-reports-pnl"],
    queryFn: () => api.get("/admin/reports/daily-pnl"),
  });

  const { data: dailyMetrics = [], isLoading: loadingMetrics } = useQuery<DailyMetricsRow[]>({
    queryKey: ["admin-reports-daily-metrics", from, to],
    queryFn: () => api.get(`/admin/reports/daily-metrics?from=${from}&to=${to}`),
  });

  const pnlData = pnl.map(row => ({
    day: row.day,
    GGR: parseFloat(row.stakes) - parseFloat(row.payouts),
    Stakes: parseFloat(row.stakes),
  }));

  const metricsChart = dailyMetrics.map(row => ({
    day: row.day,
    "New Users":   Number(row.newUsers),
    "Bet Amount":  parseFloat(row.betAmount),
    "Win/Loss":    parseFloat(row.winLoss),
    "Deposits":    parseFloat(row.deposits),
    "Withdrawals": parseFloat(row.withdrawals),
  }));

  const totals = dailyMetrics.reduce(
    (a, r) => ({
      newUsers:    a.newUsers    + Number(r.newUsers),
      betAmount:   a.betAmount   + parseFloat(r.betAmount),
      winLoss:     a.winLoss     + parseFloat(r.winLoss),
      deposits:    a.deposits    + parseFloat(r.deposits),
      withdrawals: a.withdrawals + parseFloat(r.withdrawals),
    }),
    { newUsers: 0, betAmount: 0, winLoss: 0, deposits: 0, withdrawals: 0 },
  );

  const todayRow = dailyMetrics.find(r => r.day === todayStr()) ?? dailyMetrics[dailyMetrics.length - 1] ?? null;
  const todayStats = todayRow
    ? {
        newUsers:    Number(todayRow.newUsers),
        betAmount:   parseFloat(todayRow.betAmount),
        winLoss:     parseFloat(todayRow.winLoss),
        deposits:    parseFloat(todayRow.deposits),
        withdrawals: parseFloat(todayRow.withdrawals),
      }
    : null;

  const maxStaked = Math.max(...topBettors.map(b => parseFloat(b.totalStaked)), 0);
  const maxMarginAbs = Math.max(...revBySport.map(r => {
    const staked = parseFloat(r.totalStaked);
    return staked > 0 ? Math.abs((parseFloat(r.netRevenue) / staked) * 100) : 0;
  }), 1);

  const periodDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
  const periodLabel = activePreset
    ? (activePreset === "Today" ? "Today" : `Last ${periodDays} days`)
    : `${from} → ${to}`;

  const avgGGR = pnlData.length > 0
    ? pnlData.reduce((s, r) => s + r.GGR, 0) / pnlData.length
    : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#38BDF8]" /> Reports & Analytics
          </h1>
          <p className="text-sm text-[#475569] mt-0.5">Platform performance, revenue breakdown, and player activity</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV("/admin/reports/export/bets", "xinghuang-bets.csv")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/8 transition-colors">
            <Download className="w-3.5 h-3.5" /> Bets CSV
          </button>
          <button onClick={() => downloadCSV("/admin/reports/export/transactions", "xinghuang-transactions.csv")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/8 transition-colors">
            <Download className="w-3.5 h-3.5" /> Transactions CSV
          </button>
        </div>
      </div>

      {/* ── Daily Metrics section ────────────────────────────────────────────── */}
      <SectionCard
        title="Daily Metrics"
        description={`Period totals · ${periodLabel}`}
        icon={Activity}
        accent="text-[#A78BFA]"
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Presets */}
            <div className="flex gap-1">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => applyPreset(p)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                    activePreset === p.label
                      ? "bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30"
                      : "bg-white/5 text-[#475569] border border-white/8 hover:text-[#94A3B8]",
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
            {/* Custom range */}
            <div className="flex items-center gap-1.5">
              <input type="date" value={from} max={to}
                onChange={e => setFrom(e.target.value)} className={inputCls} />
              <span className="text-[#475569] text-xs">→</span>
              <input type="date" value={to} min={from} max={todayStr()}
                onChange={e => setTo(e.target.value)} className={inputCls} />
              {!activePreset && (
                <button onClick={() => { setFrom(offsetStr(29)); setTo(todayStr()); }}
                  title="Reset to last 30 days"
                  className="p-1.5 rounded-md bg-white/5 border border-white/8 text-[#475569] hover:text-white transition-colors">
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="p-5 space-y-5">
          {/* KPI cards */}
          {loadingMetrics ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard label="New Users" icon={Users}
                value={totals.newUsers.toLocaleString("en-US")}
                sub={`over ${periodDays} days`}
                color="text-[#A78BFA]" bg="bg-[#A78BFA]/10" />
              <KpiCard label="Bet Amount" icon={BarChart2}
                value={fmtShort(totals.betAmount)}
                sub="total wagered"
                color="text-[#38BDF8]" bg="bg-[#38BDF8]/10" />
              <KpiCard label="House Win/Loss" icon={totals.winLoss >= 0 ? TrendingUp : TrendingDown}
                value={fmtShort(totals.winLoss)}
                sub="stakes − payouts"
                color={totals.winLoss >= 0 ? "text-[#00DFA9]" : "text-[#F87171]"}
                bg={totals.winLoss >= 0 ? "bg-[#00DFA9]/10" : "bg-[#F87171]/10"}
                dimValue />
              <KpiCard label="Deposits" icon={ArrowDownLeft}
                value={fmtShort(totals.deposits)}
                sub="approved only"
                color="text-[#FACC15]" bg="bg-[#FACC15]/10" />
              <KpiCard label="Withdrawals" icon={ArrowUpRight}
                value={fmtShort(totals.withdrawals)}
                sub="approved only"
                color="text-[#F87171]" bg="bg-[#F87171]/10" />
            </div>
          )}

          {/* Today's snapshot cards */}
          <div>
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest mb-2">Today's Snapshot</p>
            {loadingMetrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : todayStats === null ? (
              <div className="h-16 flex items-center justify-center text-[#475569] text-xs rounded-lg border border-dashed border-white/6">
                No data for today
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {/* New Users — purple */}
                <div className="bg-[#A78BFA]/5 border border-[#A78BFA]/15 rounded-lg px-3 py-2.5 flex flex-col gap-0.5 hover:border-[#A78BFA]/30 transition-colors">
                  <span className="text-[10px] font-semibold text-[#A78BFA]/70 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3" /> New Users
                  </span>
                  <span className="text-lg font-bold text-[#A78BFA] tabular-nums leading-tight">
                    {todayStats.newUsers.toLocaleString("en-US")}
                  </span>
                </div>
                {/* Bet Amount — blue */}
                <div className="bg-[#38BDF8]/5 border border-[#38BDF8]/15 rounded-lg px-3 py-2.5 flex flex-col gap-0.5 hover:border-[#38BDF8]/30 transition-colors">
                  <span className="text-[10px] font-semibold text-[#38BDF8]/70 uppercase tracking-wider flex items-center gap-1">
                    <BarChart2 className="w-3 h-3" /> Bet Amount
                  </span>
                  <span className="text-lg font-bold text-[#38BDF8] tabular-nums leading-tight">
                    {fmtShort(todayStats.betAmount)}
                  </span>
                </div>
                {/* Win/Loss — green/red */}
                <div className={cn(
                  "border rounded-lg px-3 py-2.5 flex flex-col gap-0.5 transition-colors",
                  todayStats.winLoss >= 0
                    ? "bg-[#00DFA9]/5 border-[#00DFA9]/15 hover:border-[#00DFA9]/30"
                    : "bg-[#F87171]/5 border-[#F87171]/15 hover:border-[#F87171]/30",
                )}>
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1",
                    todayStats.winLoss >= 0 ? "text-[#00DFA9]/70" : "text-[#F87171]/70",
                  )}>
                    {todayStats.winLoss >= 0
                      ? <TrendingUp className="w-3 h-3" />
                      : <TrendingDown className="w-3 h-3" />}
                    Win/Loss
                  </span>
                  <span className={cn(
                    "text-lg font-bold tabular-nums leading-tight",
                    todayStats.winLoss >= 0 ? "text-[#00DFA9]" : "text-[#F87171]",
                  )}>
                    {fmtShort(todayStats.winLoss)}
                  </span>
                </div>
                {/* Deposits — gold */}
                <div className="bg-[#FACC15]/5 border border-[#FACC15]/15 rounded-lg px-3 py-2.5 flex flex-col gap-0.5 hover:border-[#FACC15]/30 transition-colors">
                  <span className="text-[10px] font-semibold text-[#FACC15]/70 uppercase tracking-wider flex items-center gap-1">
                    <ArrowDownLeft className="w-3 h-3" /> Deposits
                  </span>
                  <span className="text-lg font-bold text-[#FACC15] tabular-nums leading-tight">
                    {fmtShort(todayStats.deposits)}
                  </span>
                </div>
                {/* Withdrawals — red */}
                <div className="bg-[#F87171]/5 border border-[#F87171]/15 rounded-lg px-3 py-2.5 flex flex-col gap-0.5 hover:border-[#F87171]/30 transition-colors">
                  <span className="text-[10px] font-semibold text-[#F87171]/70 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Withdrawals
                  </span>
                  <span className="text-lg font-bold text-[#F87171] tabular-nums leading-tight">
                    {fmtShort(todayStats.withdrawals)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Trend chart */}
          <div>
            <p className="text-xs text-[#475569] mb-3">
              Daily trend — <span className="text-[#94A3B8]">amounts on left axis · new users (dashed) on right axis</span>
            </p>
            {loadingMetrics ? (
              <Skeleton className="h-52 w-full" />
            ) : metricsChart.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-[#475569] text-sm rounded-lg border border-dashed border-white/6">
                No data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={metricsChart} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="usd" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${Number(v).toLocaleString("en-US")}`} />
                  <YAxis yAxisId="users" orientation="right" tick={{ fill: "#475569", fontSize: 10 }}
                    axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTip usdKeys={["Bet Amount","Win/Loss","Deposits","Withdrawals"]} countKeys={["New Users"]} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                    formatter={v => <span style={{ color: "#94A3B8" }}>{v}</span>} />
                  <Line yAxisId="usd"   type="monotone" dataKey="Bet Amount"  stroke="#38BDF8" strokeWidth={1.5} dot={false} />
                  <Line yAxisId="usd"   type="monotone" dataKey="Win/Loss"    stroke="#00DFA9" strokeWidth={1.5} dot={false} />
                  <Line yAxisId="usd"   type="monotone" dataKey="Deposits"    stroke="#FACC15" strokeWidth={1.5} dot={false} />
                  <Line yAxisId="usd"   type="monotone" dataKey="Withdrawals" stroke="#F87171" strokeWidth={1.5} dot={false} />
                  <Line yAxisId="users" type="monotone" dataKey="New Users"   stroke="#A78BFA" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Gross Gaming Revenue chart ───────────────────────────────────────── */}
      <SectionCard
        title="Gross Gaming Revenue"
        description="Daily GGR vs total stakes · last 30 days · settled bets only"
        icon={TrendingUp}
        accent="text-[#00DFA9]"
      >
        <div className="p-5">
          {loadingPnL ? (
            <Skeleton className="h-52 w-full" />
          ) : pnlData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-[#475569] text-sm rounded-lg border border-dashed border-white/6">
              No settled bets yet
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pnlData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${Number(v).toLocaleString("en-US")}`} />
                  {avgGGR !== null && (
                    <ReferenceLine y={avgGGR} yAxisId={undefined as unknown as string}
                      stroke="#00DFA9" strokeDasharray="4 3" strokeOpacity={0.4} />
                  )}
                  <Tooltip content={<ChartTip usdKeys={["Stakes", "GGR"]} />} />
                  <Bar dataKey="Stakes" fill="#38BDF8" fillOpacity={0.12} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="GGR"    fill="#00DFA9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-3 text-xs text-[#475569]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#00DFA9] inline-block" /> GGR (house profit)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]/20 inline-block" /> Total stakes
                </span>
                {avgGGR !== null && (
                  <span className="flex items-center gap-1.5">
                    <Minus className="w-3 h-3 text-[#00DFA9]/40" /> Avg GGR / day ({fmtUSD(avgGGR)})
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* ── Revenue by Sport + Top Bettors (2-col) ──────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Revenue by sport */}
        <SectionCard
          title="Revenue by Sport"
          description="All-time · settled bets"
          icon={BarChart2}
          accent="text-[#38BDF8]"
        >
          {loadingSport ? (
            <div className="p-5 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : revBySport.length === 0 ? (
            <div className="p-8 text-center text-[#475569] text-sm">No settled bets yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-[#475569] text-[10px] uppercase tracking-wider">
                    <th className="text-left px-5 py-2.5 font-semibold">Sport</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Bets</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Staked</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Net Rev.</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {revBySport.map(r => {
                    const net = parseFloat(r.netRevenue);
                    const staked = parseFloat(r.totalStaked);
                    const marginPct = staked > 0 ? (net / staked) * 100 : null;
                    return (
                      <tr key={r.sport} className="hover:bg-white/2 transition-colors group">
                        <td className="px-5 py-3">
                          <span className="text-white font-medium">{sportLabel(r.sport)}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-[#64748B] tabular-nums">{r.betCount.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-[#94A3B8] tabular-nums text-xs">{fmtUSD(r.totalStaked)}</td>
                        <td className={cn("px-3 py-3 text-right font-semibold tabular-nums text-xs",
                          net >= 0 ? "text-[#00DFA9]" : "text-[#F87171]")}>
                          {net >= 0 ? "+" : ""}{fmtUSD(net)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MarginBadge pct={marginPct} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-white/8">
                  <tr>
                    <td className="px-5 py-2.5 text-xs text-[#475569]" colSpan={2}>
                      {revBySport.reduce((s, r) => s + r.betCount, 0).toLocaleString()} total bets
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-[#475569] tabular-nums">
                      {fmtUSD(revBySport.reduce((s, r) => s + parseFloat(r.totalStaked), 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums text-[#00DFA9]">
                      {fmtUSD(revBySport.reduce((s, r) => s + parseFloat(r.netRevenue), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Top bettors */}
        <SectionCard
          title="Top Bettors by Volume"
          description="All-time ranking by total amount wagered"
          icon={Trophy}
          accent="text-[#FACC15]"
        >
          {loadingTop ? (
            <div className="p-5 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : topBettors.length === 0 ? (
            <div className="p-8 text-center text-[#475569] text-sm">No bets placed yet</div>
          ) : (
            <div className="divide-y divide-white/4">
              {topBettors.map((b, i) => {
                const staked = parseFloat(b.totalStaked);
                const medal = i === 0 ? { bg: "bg-[#FACC15]/15", text: "text-[#FACC15]" }
                  : i === 1 ? { bg: "bg-[#94A3B8]/15", text: "text-[#94A3B8]" }
                  : i === 2 ? { bg: "bg-[#F97316]/15", text: "text-[#F97316]" }
                  : null;
                return (
                  <div key={b.username} className="flex items-center gap-4 px-5 py-3 hover:bg-white/2 transition-colors">
                    {/* Rank */}
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      medal ? `${medal.bg} ${medal.text}` : "text-[#475569]")}>
                      {i + 1}
                    </div>
                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{b.username}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <VolumeBar value={staked} max={maxStaked} color="#00DFA9" />
                        <span className="text-[10px] text-[#475569]">{b.betCount} bets</span>
                      </div>
                    </div>
                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-[#00DFA9] tabular-nums">{fmtShort(staked)}</div>
                      <div className="text-[10px] text-[#475569] tabular-nums">
                        {maxStaked > 0 ? ((staked / maxStaked) * 100).toFixed(0) : 0}% of #1
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  );
}
