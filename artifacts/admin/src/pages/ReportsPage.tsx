import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, RevenueBySport, TopBettor, DailyPnL, DailyMetricsRow } from "@/lib/api";
import { BarChart2, Download, TrendingUp, Trophy, Activity, Calendar, RotateCcw, Users, Wallet, ArrowDownLeft, ArrowUpRight, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

function fmt(n: string | number) {
  const v = parseFloat(String(n));
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sportLabel(sport: string) {
  const map: Record<string, string> = {
    sp_soccer: "Soccer", sp_basketball: "Basketball", sp_american_football: "Football",
    sp_tennis: "Tennis", sp_cricket: "Cricket", sp_baseball: "Baseball",
    sp_mma: "MMA", sp_aussie_rules: "Aussie Rules",
  };
  return map[sport] ?? sport.replace(/^sp_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

async function downloadCSV(path: string, filename: string) {
  const token = sessionStorage.getItem("cb_admin_token");
  const res = await fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Section({ title, icon: Icon, accent, headerRight, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-2 flex-wrap">
        <Icon className={cn("w-4 h-4 shrink-0", accent)} />
        <span className="text-sm font-semibold text-white flex-1">{title}</span>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function defaultFromStr() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  positive?: boolean;
}

function StatCard({ label, value, icon: Icon, color, bg, positive }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 bg-white/3 border border-white/6 rounded-lg px-4 py-3 min-w-0">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", bg)}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#475569] uppercase tracking-wide truncate">{label}</p>
        <p className={cn("text-sm font-bold tabular-nums truncate", positive === false ? "text-[#F87171]" : positive === true ? "text-[#00DFA9]" : "text-white")}>
          {value}
        </p>
      </div>
    </div>
  );
}

const inputCls = "bg-[#0B0F14] border border-white/10 text-white text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#A78BFA]/60 [color-scheme:dark]";

export default function ReportsPage() {
  const [from, setFrom] = useState(defaultFromStr);
  const [to, setTo]     = useState(todayStr);

  const isDefault = from === defaultFromStr() && to === todayStr();

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
    GGR: Math.max(0, parseFloat(row.stakes) - parseFloat(row.payouts)),
    Stakes: parseFloat(row.stakes),
  }));

  const metricsData = dailyMetrics.map(row => ({
    day: row.day,
    "New Users":   Number(row.newUsers),
    "Bet Amount":  parseFloat(row.betAmount),
    "Win/Loss":    parseFloat(row.winLoss),
    "Deposits":    parseFloat(row.deposits),
    "Withdrawals": parseFloat(row.withdrawals),
  }));

  const totals = dailyMetrics.reduce(
    (acc, row) => ({
      newUsers:    acc.newUsers    + Number(row.newUsers),
      betAmount:   acc.betAmount   + parseFloat(row.betAmount),
      winLoss:     acc.winLoss     + parseFloat(row.winLoss),
      deposits:    acc.deposits    + parseFloat(row.deposits),
      withdrawals: acc.withdrawals + parseFloat(row.withdrawals),
    }),
    { newUsers: 0, betAmount: 0, winLoss: 0, deposits: 0, withdrawals: 0 },
  );

  const periodLabel = isDefault ? "Last 30 days" : `${from} → ${to}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#38BDF8]" /> Reports & Analytics
          </h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Revenue breakdown, top players, and CSV exports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => downloadCSV("/admin/reports/export/bets", "cupbett-bets.csv")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Bets CSV
          </button>
          <button
            onClick={() => downloadCSV("/admin/reports/export/transactions", "cupbett-transactions.csv")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Transactions CSV
          </button>
        </div>
      </div>

      {/* Daily P&L chart */}
      <Section title="Daily Gross Gaming Revenue — last 30 days" icon={TrendingUp} accent="text-[#00DFA9]">
        <div className="p-5">
          {loadingPnL ? (
            <div className="h-48 flex items-center justify-center text-[#475569] text-sm">Loading…</div>
          ) : pnlData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[#475569] text-sm">No settled bets yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pnlData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${Number(v).toLocaleString("en-US")}`} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#94A3B8" }}
                  formatter={(v: number) => [fmt(v)]}
                />
                <Bar dataKey="Stakes" fill="#38BDF820" radius={[3, 3, 0, 0]} />
                <Bar dataKey="GGR" fill="#00DFA9" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {pnlData.length > 0 && (
            <div className="flex gap-4 mt-2 text-xs text-[#475569]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#00DFA9] inline-block" /> GGR (Revenue)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]/20 inline-block" /> Total Stakes</span>
            </div>
          )}
        </div>
      </Section>

      {/* Daily Metrics */}
      <Section
        title="Daily Metrics"
        icon={Activity}
        accent="text-[#A78BFA]"
        headerRight={
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#475569]" />
            <input
              type="date"
              value={from}
              max={to}
              onChange={e => setFrom(e.target.value)}
              className={inputCls}
            />
            <span className="text-[#475569] text-xs">→</span>
            <input
              type="date"
              value={to}
              min={from}
              max={todayStr()}
              onChange={e => setTo(e.target.value)}
              className={inputCls}
            />
            {!isDefault && (
              <button
                onClick={() => { setFrom(defaultFromStr()); setTo(todayStr()); }}
                className="p-1.5 rounded-md bg-white/5 border border-white/10 text-[#475569] hover:text-white transition-colors"
                title="Reset to last 30 days"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        }
      >
        <div className="p-5 space-y-4">
          {/* Period label */}
          <p className="text-xs text-[#475569]">
            Showing totals for: <span className="text-[#94A3B8] font-medium">{periodLabel}</span>
          </p>

          {/* Snapshot cards */}
          {loadingMetrics ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-white/3 border border-white/6 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <StatCard
                label="New Users"
                value={totals.newUsers.toLocaleString("en-US")}
                icon={Users}
                color="text-[#A78BFA]"
                bg="bg-[#A78BFA]/10"
              />
              <StatCard
                label="Bet Amount"
                value={fmtShort(totals.betAmount)}
                icon={BarChart2}
                color="text-[#38BDF8]"
                bg="bg-[#38BDF8]/10"
              />
              <StatCard
                label="Win / Loss"
                value={fmtShort(totals.winLoss)}
                icon={totals.winLoss >= 0 ? TrendingUp : TrendingDown}
                color={totals.winLoss >= 0 ? "text-[#00DFA9]" : "text-[#F87171]"}
                bg={totals.winLoss >= 0 ? "bg-[#00DFA9]/10" : "bg-[#F87171]/10"}
                positive={totals.winLoss >= 0}
              />
              <StatCard
                label="Deposits"
                value={fmtShort(totals.deposits)}
                icon={ArrowDownLeft}
                color="text-[#FACC15]"
                bg="bg-[#FACC15]/10"
              />
              <StatCard
                label="Withdrawals"
                value={fmtShort(totals.withdrawals)}
                icon={ArrowUpRight}
                color="text-[#F87171]"
                bg="bg-[#F87171]/10"
              />
            </div>
          )}

          {/* Line chart */}
          {loadingMetrics ? (
            <div className="h-56 flex items-center justify-center text-[#475569] text-sm">Loading…</div>
          ) : metricsData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-[#475569] text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={metricsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="usd"
                  tick={{ fill: "#475569", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${Number(v).toLocaleString("en-US")}`}
                />
                <YAxis
                  yAxisId="users"
                  orientation="right"
                  tick={{ fill: "#475569", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#94A3B8" }}
                  formatter={(v: number, name: string) =>
                    name === "New Users"
                      ? [v.toLocaleString("en-US"), name]
                      : [fmt(v), name]
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={value => <span style={{ color: "#94A3B8" }}>{value}</span>}
                />
                <Line yAxisId="usd"   type="monotone" dataKey="Bet Amount"  stroke="#38BDF8" strokeWidth={2} dot={false} />
                <Line yAxisId="usd"   type="monotone" dataKey="Win/Loss"    stroke="#00DFA9" strokeWidth={2} dot={false} />
                <Line yAxisId="usd"   type="monotone" dataKey="Deposits"    stroke="#FACC15" strokeWidth={2} dot={false} />
                <Line yAxisId="usd"   type="monotone" dataKey="Withdrawals" stroke="#F87171" strokeWidth={2} dot={false} />
                <Line yAxisId="users" type="monotone" dataKey="New Users"   stroke="#A78BFA" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}

          <p className="text-xs text-[#475569]">
            Win/Loss = house profit from settled bets (stakes − payouts). New Users on right axis (dashed).
          </p>
        </div>
      </Section>

      {/* Revenue by sport */}
      <Section title="Revenue by Sport" icon={BarChart2} accent="text-[#38BDF8]">
        {loadingSport ? (
          <div className="p-8 text-center text-[#475569] text-sm">Loading…</div>
        ) : revBySport.length === 0 ? (
          <div className="p-8 text-center text-[#475569] text-sm">No settled bets to report on yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[#475569] text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-2.5">Sport</th>
                <th className="text-right px-4 py-2.5">Bets</th>
                <th className="text-right px-4 py-2.5">Total Staked</th>
                <th className="text-right px-4 py-2.5">Paid Out</th>
                <th className="text-right px-4 py-2.5">Net Revenue</th>
                <th className="text-right px-4 py-2.5">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {revBySport.map(r => {
                const net = parseFloat(r.netRevenue);
                const staked = parseFloat(r.totalStaked);
                const margin = staked > 0 ? ((net / staked) * 100).toFixed(1) : "—";
                return (
                  <tr key={r.sport} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 text-white font-medium">{sportLabel(r.sport)}</td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{r.betCount}</td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{fmt(r.totalStaked)}</td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{fmt(r.totalPaidOut)}</td>
                    <td className={cn("px-4 py-3 text-right font-semibold", net >= 0 ? "text-[#00DFA9]" : "text-[#EF4444]")}>
                      {net >= 0 ? "+" : ""}{fmt(net)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{margin}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* Top bettors */}
      <Section title="Top Bettors by Volume" icon={Trophy} accent="text-[#FACC15]">
        {loadingTop ? (
          <div className="p-8 text-center text-[#475569] text-sm">Loading…</div>
        ) : topBettors.length === 0 ? (
          <div className="p-8 text-center text-[#475569] text-sm">No bets placed yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[#475569] text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-2.5">#</th>
                <th className="text-left px-4 py-2.5">Player</th>
                <th className="text-right px-4 py-2.5">Bets</th>
                <th className="text-right px-5 py-2.5">Total Staked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topBettors.map((b, i) => (
                <tr key={b.username} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-3">
                    <span className={cn("text-xs font-bold w-5 h-5 inline-flex items-center justify-center rounded-full",
                      i === 0 ? "bg-[#FACC15]/20 text-[#FACC15]" :
                      i === 1 ? "bg-[#94A3B8]/20 text-[#94A3B8]" :
                      i === 2 ? "bg-[#F97316]/20 text-[#F97316]" :
                      "text-[#475569]"
                    )}>{i + 1}</span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{b.username}</td>
                  <td className="px-4 py-3 text-right text-[#94A3B8]">{b.betCount}</td>
                  <td className="px-5 py-3 text-right font-semibold text-[#00DFA9]">{fmt(b.totalStaked)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
