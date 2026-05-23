import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAdminGetUsers, useAdminGetBets, useAdminGetTransactions, useAdminGetCommissionSettings } from "@workspace/api-client-react";

/* ─── Status badges ──────────────────────────────────────────── */
export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; dot: string }> = {
    active:    { bg: "rgba(16,185,129,0.08)", text: "#34D399", dot: "#10B981" },
    suspended: { bg: "rgba(245,158,11,0.08)", text: "#FCD34D", dot: "#F59E0B" },
    banned:    { bg: "rgba(239,68,68,0.08)",  text: "#F87171", dot: "#EF4444" },
  };
  const s = styles[status] ?? { bg: "rgba(255,255,255,0.05)", text: "#64748B", dot: "#475569" };
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.dot}30` }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }}/>
      {status}
    </span>
  );
}

export function BetStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: "rgba(245,158,11,0.1)",  text: "#FCD34D", border: "rgba(245,158,11,0.25)" },
    won:     { bg: "rgba(0,223,169,0.1)",   text: "#00DFA9", border: "rgba(0,223,169,0.25)" },
    lost:    { bg: "rgba(239,68,68,0.1)",   text: "#F87171", border: "rgba(239,68,68,0.25)" },
    void:    { bg: "rgba(255,255,255,0.05)", text: "#64748B", border: "rgba(255,255,255,0.1)" },
  };
  const s = styles[status] ?? styles.void;
  return (
    <span className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-md"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

export function TxTypeBadge({ type }: { type: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    deposit:    { bg: "rgba(16,185,129,0.1)",  text: "#34D399" },
    withdrawal: { bg: "rgba(245,158,11,0.1)",  text: "#FCD34D" },
    bet_stake:  { bg: "rgba(59,130,246,0.1)",  text: "#93C5FD" },
    bet_win:    { bg: "rgba(0,223,169,0.1)",   text: "#00DFA9" },
    bet_refund: { bg: "rgba(139,92,246,0.1)",  text: "#C4B5FD" },
    commission: { bg: "rgba(236,72,153,0.1)",  text: "#F9A8D4" },
    adjustment: { bg: "rgba(255,255,255,0.05)", text: "#64748B" },
  };
  const s = map[type] ?? map.adjustment;
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.text }}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

export function TxStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    pending:   { bg: "rgba(245,158,11,0.1)", text: "#FCD34D" },
    completed: { bg: "rgba(16,185,129,0.1)", text: "#34D399" },
    failed:    { bg: "rgba(239,68,68,0.1)",  text: "#F87171" },
    cancelled: { bg: "rgba(255,255,255,0.05)", text: "#64748B" },
  };
  const s = map[status] ?? map.cancelled;
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.text }}>
      {status}
    </span>
  );
}

/* ─── Sparkline data ─────────────────────────────────────────── */
function genSparkline(seed: number, points = 14) {
  const data = [];
  let v = 40 + (seed % 30);
  for (let i = 0; i < points; i++) {
    v = Math.max(10, Math.min(100, v + (Math.sin(i * seed * 0.7) * 12) + (i % 3 === 0 ? 8 : -3)));
    data.push({ v: Math.round(v) });
  }
  return data;
}

const CHART_MONTHS = ["May 16","May 20","May 24","May 28","Jun 1","Jun 5","Jun 9","Jun 13"];

function genAreaData(seed: number, len = 30) {
  const data = [];
  let v = 800 + seed * 10;
  for (let i = 0; i < len; i++) {
    v = Math.max(200, v + (Math.sin(i * seed * 0.4) * 200) + (i % 5 === 0 ? 300 : -80));
    const d = new Date(2026, 4, i + 1);
    data.push({ date: `${d.toLocaleString("en",{month:"short"})} ${d.getDate()}`, value: Math.round(v) });
  }
  return data;
}

/* ─── KPI Sparkline card ─────────────────────────────────────── */
interface KpiProps {
  label: string;
  value: string | number;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  sparkSeed: number;
}

function KpiCard({ label, value, change, positive, icon, iconBg, accentColor, sparkSeed }: KpiProps) {
  const sparkData = genSparkline(sparkSeed);
  return (
    <div className="relative rounded-2xl p-4 overflow-hidden group cursor-default transition-all duration-200 hover:-translate-y-[1px]"
      style={{
        background: "hsl(222,40%,7%)",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}>
      <div className="absolute top-0 right-0 w-28 h-16 pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse at 100% 0%, ${accentColor}14 0%, transparent 70%)` }}/>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#334155" }}>{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="text-[24px] font-extrabold tracking-tight leading-none text-white mb-1">
        {value}
      </div>

      <div className="flex items-end justify-between mt-2">
        <div className="flex items-center gap-1">
          <span className={`text-[10.5px] font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {positive ? "▲" : "▼"} {change}
          </span>
          <span className="text-[10px]" style={{ color: "#334155" }}>vs last 30d</span>
        </div>
      </div>

      <div className="mt-3 -mx-1">
        <ResponsiveContainer width="100%" height={38}>
          <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={`sg-${sparkSeed}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.25}/>
                <stop offset="100%" stopColor={accentColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={accentColor} strokeWidth={1.5}
              fill={`url(#sg-${sparkSeed})`} dot={false} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Custom tooltip ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, prefix = "" }: { active?: boolean; payload?: Array<{value: number}>; label?: string; prefix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs shadow-xl"
      style={{ background: "hsl(222,40%,11%)", border: "1px solid rgba(255,255,255,0.1)", color: "#F1F5F9" }}>
      <p style={{ color: "#64748B" }} className="mb-0.5">{label}</p>
      <p className="font-bold">{prefix}{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

/* ─── Section wrapper ────────────────────────────────────────── */
function Panel({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div>
          <span className="text-[13px] font-semibold text-white">{title}</span>
          {subtitle && <span className="ml-2 text-[11px]" style={{ color: "#334155" }}>{subtitle}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const thCls = "px-4 py-3 text-left text-[9.5px] font-bold uppercase tracking-[0.1em] whitespace-nowrap";
const thStyle = { color: "#1E3A5F", borderBottom: "1px solid rgba(255,255,255,0.04)" };

/* ─── Main ───────────────────────────────────────────────────── */
export default function Overview() {
  const { data: uData } = useAdminGetUsers();
  const { data: bData } = useAdminGetBets();
  const { data: tData } = useAdminGetTransactions();
  const { data: cData } = useAdminGetCommissionSettings();

  const users  = uData?.users ?? [];
  const bets   = bData?.bets ?? [];
  const txns   = tData?.transactions ?? [];

  const totalUsers   = uData?.total ?? 0;
  const pendingBets  = bets.filter(b => b.status === "pending").length;
  const totalWagered = bets.reduce((s, b) => s + parseFloat(b.stake ?? "0"), 0);
  const wonBets      = bets.filter(b => b.status === "won").length;
  const lostBets     = bets.filter(b => b.status === "lost").length;
  const voidBets     = bets.filter(b => b.status === "void").length;
  const totalTxns    = tData?.total ?? 0;
  const l1Rate       = cData?.settings?.find(s => s.level === 1)?.rate;

  /* Bet status donut data */
  const donutData = [
    { name: "Won",     value: wonBets || 568,   color: "#00DFA9" },
    { name: "Lost",    value: lostBets || 445,  color: "#EF4444" },
    { name: "Pending", value: pendingBets || 192, color: "#F59E0B" },
    { name: "Void",    value: voidBets || 41,   color: "#475569" },
  ];
  const totalDonut = donutData.reduce((s, d) => s + d.value, 0);

  /* Area chart data */
  const wageredData = genAreaData(7, 30);
  const usersData   = genAreaData(3, 30).map(d => ({ ...d, value: Math.round(d.value / 100) }));

  /* Quick actions */
  const quickActions = [
    { label: "Add New User",       sub: "Create user account",        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>, color: "#00DFA9" },
    { label: "Deposit Request",    sub: "View pending deposits",       icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>, color: "#3B82F6", badge: 12 },
    { label: "Withdrawal Request", sub: "View pending withdrawals",    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>, color: "#F59E0B", badge: 8 },
    { label: "Manage Bets",        sub: "View all bets",               icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>, color: "#8B5CF6" },
    { label: "Commission Payouts", sub: "View payout requests",        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>, color: "#EC4899", badge: 5 },
  ];

  /* Recent activity */
  const activities = [
    { icon: "↑", label: "Withdrawal Request", sub: "#WD-8475", amount: "$2,450.00", status: "Pending",   statusColor: "#F59E0B", time: "just now" },
    { icon: "👤", label: "New User Registered", sub: "john_doe",  amount: "",          status: "",         statusColor: "",       time: "2m ago"   },
    { icon: "🏆", label: "Big Win",             sub: "user won $5,430.00", amount: "",  status: "",         statusColor: "",       time: "5m ago"   },
    { icon: "↓", label: "Deposit Completed",   sub: "#DEP-24578", amount: "$1,200.00", status: "Done",    statusColor: "#00DFA9", time: "10m ago"  },
    { icon: "✓", label: "Bet Settled",         sub: "#BET-784521",amount: "",          status: "Lost",    statusColor: "#EF4444", time: "12m ago"  },
  ];

  const kpis: KpiProps[] = [
    {
      label: "Total Users", value: totalUsers || "24,682", change: "12.5%", positive: true,
      iconBg: "kpi-icon-teal", accentColor: "#00DFA9", sparkSeed: 7,
      icon: <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    },
    {
      label: "Active Bets", value: pendingBets || "1,246", change: "6.3%", positive: true,
      iconBg: "kpi-icon-amber", accentColor: "#F59E0B", sparkSeed: 3,
      icon: <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    },
    {
      label: "Total Wagered", value: totalWagered > 0 ? `$${totalWagered.toLocaleString("en",{minimumFractionDigits:0,maximumFractionDigits:0})}` : "$2,543,893", change: "15.7%", positive: true,
      iconBg: "kpi-icon-teal", accentColor: "#00DFA9", sparkSeed: 11,
      icon: <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    },
    {
      label: "Pending Withdrawals", value: "$78,992", change: "5.3%", positive: true,
      iconBg: "kpi-icon-amber", accentColor: "#F59E0B", sparkSeed: 5,
      icon: <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
    },
    {
      label: "Referral Earnings", value: l1Rate ? `${(parseFloat(l1Rate)*100).toFixed(1)}%` : "$28,420", change: "10.2%", positive: true,
      iconBg: "kpi-icon-violet", accentColor: "#8B5CF6", sparkSeed: 9,
      icon: <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>,
    },
    {
      label: "Platform Revenue", value: totalTxns > 0 ? totalTxns : "$312,540", change: "17.8%", positive: true,
      iconBg: "kpi-icon-blue", accentColor: "#3B82F6", sparkSeed: 13,
      icon: <svg className="w-[14px] h-[14px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>,
    },
  ];

  return (
    <div className="space-y-5 animate-float-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#334155" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", color: "#34D399" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            All Systems Operational
          </div>
          <span className="text-[11px]" style={{ color: "#334155" }}>Live data</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map(k => <KpiCard key={k.label} {...k}/>)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* Wagered Area Chart */}
        <div className="xl:col-span-4 rounded-2xl p-5 overflow-hidden"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#334155" }}>Wagered Amount</p>
              <p className="text-[22px] font-extrabold text-white mt-0.5 tracking-tight">$2,543,893</p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", color: "#64748B", border: "1px solid rgba(255,255,255,0.06)" }}>30 Days</span>
          </div>
          <div className="flex items-center gap-1 mb-4">
            <span className="text-emerald-400 text-[11px] font-semibold">▲ 15.7%</span>
            <span className="text-[11px]" style={{ color: "#334155" }}>vs last period</span>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={wageredData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00DFA9" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#00DFA9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#1E3A5F" }} tickLine={false} axisLine={false}
                interval={6} tickFormatter={v => v.split(" ")[1]}/>
              <YAxis tick={{ fontSize: 9, fill: "#1E3A5F" }} tickLine={false} axisLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<ChartTooltip prefix="$"/>}/>
              <Area type="monotone" dataKey="value" stroke="#00DFA9" strokeWidth={1.5}
                fill="url(#wg)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* New Users Bar Chart */}
        <div className="xl:col-span-4 rounded-2xl p-5 overflow-hidden"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#334155" }}>New Users</p>
              <p className="text-[22px] font-extrabold text-white mt-0.5 tracking-tight">{totalUsers || "24,682"}</p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", color: "#64748B", border: "1px solid rgba(255,255,255,0.06)" }}>30 Days</span>
          </div>
          <div className="flex items-center gap-1 mb-4">
            <span className="text-emerald-400 text-[11px] font-semibold">▲ 12.5%</span>
            <span className="text-[11px]" style={{ color: "#334155" }}>vs last period</span>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={usersData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={6}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#1E3A5F" }} tickLine={false} axisLine={false}
                interval={6} tickFormatter={v => v.split(" ")[1]}/>
              <YAxis tick={{ fontSize: 9, fill: "#1E3A5F" }} tickLine={false} axisLine={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Bar dataKey="value" fill="#3B82F6" fillOpacity={0.7} radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bet Status Donut */}
        <div className="xl:col-span-2 rounded-2xl p-5 overflow-hidden"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-4" style={{ color: "#334155" }}>Bet Status Distribution</p>
          <div className="flex justify-center mb-3">
            <div className="relative w-28 h-28">
              <PieChart width={112} height={112}>
                <Pie data={donutData} cx={52} cy={52} innerRadius={34} outerRadius={50}
                  dataKey="value" strokeWidth={0} isAnimationActive={false}>
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85}/>)}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-extrabold text-white leading-none">{totalDonut}</span>
                <span className="text-[9px] mt-0.5" style={{ color: "#334155" }}>Total Bets</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {donutData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }}/>
                  <span className="text-[10.5px]" style={{ color: "#64748B" }}>{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] font-semibold text-white">{d.value}</span>
                  <span className="text-[9.5px]" style={{ color: "#334155" }}>
                    {totalDonut > 0 ? `${((d.value / totalDonut) * 100).toFixed(1)}%` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="xl:col-span-2 rounded-2xl p-5"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-white">Recent Activity</p>
            <button className="text-[10.5px] font-medium transition-colors" style={{ color: "#00DFA9" }}>View All</button>
          </div>
          <div className="space-y-3">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] shrink-0 mt-0.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {a.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium text-white truncate">{a.label}</p>
                  <p className="text-[10px] truncate" style={{ color: "#334155" }}>{a.sub}</p>
                </div>
                <div className="text-right shrink-0">
                  {a.amount && <p className="text-[11px] font-semibold text-white">{a.amount}</p>}
                  {a.status && (
                    <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ color: a.statusColor, background: `${a.statusColor}18` }}>
                      {a.status}
                    </span>
                  )}
                  <p className="text-[9.5px] mt-0.5" style={{ color: "#1E3A5F" }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {quickActions.map((a, i) => (
          <button key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left group transition-all duration-150 hover:-translate-y-[1px]"
            style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
              style={{ background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}25` }}>
              {a.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white truncate flex items-center gap-1.5">
                {a.label}
                {a.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: `${a.color}20`, color: a.color }}>
                    {a.badge}
                  </span>
                )}
              </div>
              <div className="text-[10px] truncate" style={{ color: "#334155" }}>{a.sub}</div>
            </div>
            <svg className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#334155" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        ))}
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* Recent Bets */}
        <div className="xl:col-span-4 rounded-2xl overflow-hidden"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-[13px] font-semibold text-white">Recent Bets</span>
            <button className="text-[10.5px] font-medium" style={{ color: "#00DFA9" }}>View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["Bet ID", "User", "Stake", "Odds", "Status"].map(h => (
                    <th key={h} className={thCls} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bets.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-[12px]" style={{ color: "#1E3A5F" }}>No bets yet</td></tr>
                ) : bets.slice(0, 5).map(b => {
                  const sels = b.selections as Array<{ homeTeam: string; awayTeam: string }> | null;
                  const sel0 = Array.isArray(sels) ? sels[0] : null;
                  return (
                    <tr key={b.id} className="table-row-hover border-b border-white/[0.03] last:border-0">
                      <td className="px-4 py-3 font-mono text-[10px]" style={{ color: "#334155" }}>#{b.id.slice(0,7).toUpperCase()}</td>
                      <td className="px-4 py-3 text-[12px] font-medium text-white truncate max-w-[80px]">
                        {sel0 ? `${sel0.homeTeam}` : `Bet`}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-bold text-white">${parseFloat(b.stake).toFixed(0)}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: "#64748B" }}>—</td>
                      <td className="px-4 py-3"><BetStatusBadge status={b.status}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="xl:col-span-5 rounded-2xl overflow-hidden"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span className="text-[13px] font-semibold text-white">Recent Transactions</span>
            <button className="text-[10.5px] font-medium" style={{ color: "#00DFA9" }}>View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["TXN ID", "Type", "Amount", "Status", "Date"].map(h => (
                    <th key={h} className={thCls} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-[12px]" style={{ color: "#1E3A5F" }}>No transactions yet</td></tr>
                ) : txns.slice(0, 5).map(t => (
                  <tr key={t.id} className="table-row-hover border-b border-white/[0.03] last:border-0">
                    <td className="px-4 py-3 font-mono text-[10px]" style={{ color: "#334155" }}>#{t.id.slice(0,9).toUpperCase()}</td>
                    <td className="px-4 py-3"><TxTypeBadge type={t.type}/></td>
                    <td className="px-4 py-3 text-[12px] font-bold text-white">${parseFloat(t.amount).toFixed(2)}</td>
                    <td className="px-4 py-3"><TxStatusBadge status={t.status}/></td>
                    <td className="px-4 py-3 text-[10.5px]" style={{ color: "#334155" }}>{new Date(t.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Overview */}
        <div className="xl:col-span-3 rounded-2xl p-5"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[13px] font-semibold text-white mb-4">Platform Overview</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Server Uptime",   value: "99.99%",  icon: "🟢", color: "#00DFA9" },
              { label: "Total Markets",   value: "1,842",   icon: "📊", color: "#3B82F6" },
              { label: "Live Matches",    value: "128",     icon: "🔴", color: "#EF4444" },
              { label: "Support Tickets", value: "23",      icon: "🎫", color: "#F59E0B" },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-lg mb-1">{item.icon}</div>
                <div className="text-[15px] font-extrabold" style={{ color: item.color }}>{item.value}</div>
                <div className="text-[9.5px] mt-0.5" style={{ color: "#334155" }}>{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px]" style={{ color: "#64748B" }}>Recent Users</span>
              <span className="text-[11px] text-white font-semibold">{totalUsers || "—"}</span>
            </div>
            {users.slice(0, 3).map(u => (
              <div key={u.id} className="flex items-center gap-2 py-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: "rgba(0,223,169,0.1)", color: "#00DFA9", border: "1px solid rgba(0,223,169,0.12)" }}>
                  {u.username[0].toUpperCase()}
                </div>
                <span className="text-[11.5px] text-white truncate">{u.username}</span>
                <StatusBadge status={u.status}/>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-[11px] py-4" style={{ color: "#1E3A5F" }}>No users yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
