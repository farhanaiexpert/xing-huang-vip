import { useAdminGetUsers, useAdminGetBets, useAdminGetTransactions, useAdminGetCommissionSettings } from "@workspace/api-client-react";

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; dot: string }> = {
    active:    { bg: "rgba(16,185,129,0.08)", text: "#34D399", dot: "#10B981" },
    suspended: { bg: "rgba(245,158,11,0.08)", text: "#FCD34D", dot: "#F59E0B" },
    banned:    { bg: "rgba(239,68,68,0.08)",  text: "#F87171", dot: "#EF4444" },
  };
  const s = styles[status] ?? { bg: "rgba(255,255,255,0.05)", text: "#64748B", dot: "#475569" };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.dot}30` }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
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
    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md"
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

interface KpiProps {
  label: string;
  value: string | number;
  sub: string;
  iconBg: string;
  icon: React.ReactNode;
  accent?: boolean;
  accentColor?: string;
}

function KpiCard({ label, value, sub, iconBg, icon, accent, accentColor = "#00DFA9" }: KpiProps) {
  const hexToRgba = (hex: string, a: number) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  };
  const glow = hexToRgba(accentColor, 0.12);
  const border = hexToRgba(accentColor, accent ? 0.25 : 0.06);

  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden transition-all duration-200 hover:-translate-y-[1px]"
      style={{
        background: accent
          ? `linear-gradient(135deg, hsl(222,40%,8%) 0%, hsl(222,40%,7%) 100%)`
          : "hsl(222,40%,7%)",
        border: `1px solid ${border}`,
        boxShadow: accent ? `0 0 0 1px ${hexToRgba(accentColor, 0.06)} inset, 0 8px 32px rgba(0,0,0,0.3)` : "0 4px 20px rgba(0,0,0,0.2)",
      }}
    >
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
          style={{ background: `radial-gradient(circle at 100% 0%, ${glow} 0%, transparent 70%)` }} />
      )}
      <div className="flex items-start justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#334155" }}>{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div className="text-[28px] font-extrabold tracking-tight leading-none mb-1.5"
        style={{ color: accent ? accentColor : "#F1F5F9" }}>
        {value}
      </div>
      <p className="text-[11px]" style={{ color: "#334155" }}>{sub}</p>
    </div>
  );
}

function SkeletonPulse({ w = "full", h = 3.5 }: { w?: string; h?: number }) {
  return <div className={`h-[${h * 4}px] w-${w} rounded animate-shimmer`} style={{ background: "rgba(255,255,255,0.04)" }} />;
}

function SectionTable({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-sm font-semibold text-white">{title}</span>
        {count !== undefined && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#64748B" }}>
            {count} total
          </span>
        )}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

const thCls = "px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap";
const thStyle = { color: "#1E3A5F", borderBottom: "1px solid rgba(255,255,255,0.04)" };

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
  const totalTxns    = tData?.total ?? 0;
  const l1Rate       = cData?.settings?.find(s => s.level === 1)?.rate;
  const l1Pct        = l1Rate ? `${(parseFloat(l1Rate) * 100).toFixed(1)}%` : "—";

  const kpis: KpiProps[] = [
    {
      label: "Total Users", value: totalUsers, sub: "Registered accounts",
      iconBg: "kpi-icon-teal", accent: true, accentColor: "#00DFA9",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: "Pending Bets", value: pendingBets, sub: "Awaiting settlement",
      iconBg: "kpi-icon-amber",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: "Total Wagered", value: `$${totalWagered.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: "USDT · all time",
      iconBg: "kpi-icon-teal", accent: true, accentColor: "#00DFA9",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: "Bets Won", value: wonBets, sub: `of ${bets.length} total`,
      iconBg: "kpi-icon-violet",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: "Transactions", value: totalTxns, sub: "Ledger entries",
      iconBg: "kpi-icon-blue",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
    },
    {
      label: "L1 Commission", value: l1Pct, sub: "Direct referral rate",
      iconBg: "kpi-icon-violet", accent: true, accentColor: "#8B5CF6",
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    },
  ];

  return (
    <div className="space-y-6 animate-float-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-xs text-[#334155] mt-0.5">Platform overview & key metrics</p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs font-medium text-[#334155]">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <div className="text-[10px] text-[#1E3A5F] mt-0.5">Live data</div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3.5">
        {kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionTable title="Recent Users" count={totalUsers}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["User", "Status", "Joined"].map(h => (
                  <th key={h} className={thCls} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-[13px] text-[#1E3A5F]">No users yet</td></tr>
              ) : users.slice(0, 6).map(u => (
                <tr key={u.id} className="table-row-hover border-b border-white/[0.03] last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: "rgba(0,223,169,0.1)", color: "#00DFA9", border: "1px solid rgba(0,223,169,0.15)" }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-white">{u.username}</div>
                        {u.email && <div className="text-[10px] text-[#334155] truncate max-w-[140px]">{u.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-5 py-3 text-[11px] text-[#334155]">{new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionTable>

        <SectionTable title="Recent Bets" count={bets.length}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Match", "Stake", "Status"].map(h => (
                  <th key={h} className={thCls} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-[13px] text-[#1E3A5F]">No bets yet</td></tr>
              ) : bets.slice(0, 6).map(b => {
                const sels = b.selections as Array<{ homeTeam: string; awayTeam: string }> | null;
                const sel0 = Array.isArray(sels) ? sels[0] : null;
                return (
                  <tr key={b.id} className="table-row-hover border-b border-white/[0.03] last:border-0">
                    <td className="px-5 py-3">
                      <div className="text-[13px] font-medium text-white truncate max-w-[180px]">
                        {sel0 ? `${sel0.homeTeam} v ${sel0.awayTeam}` : `Bet #${b.id.slice(0,6)}`}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-bold text-white">${parseFloat(b.stake).toFixed(2)}</td>
                    <td className="px-5 py-3"><BetStatusBadge status={b.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionTable>
      </div>

      <SectionTable title="Recent Transactions" count={totalTxns}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["ID", "Type", "Amount", "Status", "Date"].map(h => (
                <th key={h} className={thCls} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-[#1E3A5F]">No transactions yet</td></tr>
            ) : txns.slice(0, 5).map(t => (
              <tr key={t.id} className="table-row-hover border-b border-white/[0.03] last:border-0">
                <td className="px-5 py-3 font-mono text-[11px] text-[#334155]">{t.id.slice(0,10)}…</td>
                <td className="px-5 py-3"><TxTypeBadge type={t.type} /></td>
                <td className="px-5 py-3 text-[13px] font-bold text-white">${parseFloat(t.amount).toFixed(2)}</td>
                <td className="px-5 py-3"><TxStatusBadge status={t.status} /></td>
                <td className="px-5 py-3 text-[11px] text-[#334155]">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionTable>
    </div>
  );
}
