import { useAdminGetUsers, useAdminGetBets, useAdminGetTransactions, useAdminGetCommissionSettings } from "@workspace/api-client-react";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    suspended: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    banned:    "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${map[status] ?? "bg-white/5 text-[#8A9BB3] border-white/10"}`}>
      {status}
    </span>
  );
}

export function BetStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    won:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    lost:    "bg-red-500/10 text-red-400 border-red-500/20",
    void:    "bg-white/5 text-[#8A9BB3] border-white/10",
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${map[status] ?? "bg-white/5 text-[#8A9BB3] border-white/10"}`}>
      {status}
    </span>
  );
}

function KpiCard({ label, value, sub, highlight, icon }: { label: string; value: string | number; sub?: string; highlight?: boolean; icon: React.ReactNode }) {
  return (
    <div className={`bg-[#0D1117] border rounded-xl p-4 flex flex-col gap-3 ${highlight ? "border-primary/25" : "border-white/[0.06]"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#8A9BB3] uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${highlight ? "bg-primary/15 text-primary" : "bg-white/5 text-[#8A9BB3]"}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className={`text-2xl font-bold tabular-nums tracking-tight ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
        {sub && <div className="text-[11px] text-[#4A5568] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 w-full max-w-[120px] rounded bg-white/5 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function Overview() {
  const { data: usersData } = useAdminGetUsers();
  const { data: betsData } = useAdminGetBets();
  const { data: txData } = useAdminGetTransactions();
  const { data: commData } = useAdminGetCommissionSettings();

  const users = usersData?.users ?? [];
  const bets  = betsData?.bets ?? [];
  const txns  = txData?.transactions ?? [];

  const totalUsers   = usersData?.total ?? 0;
  const pendingBets  = bets.filter(b => b.status === "pending").length;
  const totalWagered = bets.reduce((s, b) => s + parseFloat(b.stake ?? "0"), 0);
  const wonBets      = bets.filter(b => b.status === "won").length;
  const totalTxns    = txData?.total ?? 0;
  const l1Rate       = commData?.settings?.find(s => s.level === 1)?.rate;
  const l1Pct        = l1Rate ? `${(parseFloat(l1Rate) * 100).toFixed(1)}%` : "—";

  const recentUsers = [...users].slice(0, 5);
  const recentBets  = [...bets].slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
        <p className="text-xs text-[#4A5568] mt-0.5">Platform overview</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <KpiCard label="Total Users" value={totalUsers} sub="registered accounts" highlight
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <KpiCard label="Pending Bets" value={pendingBets} sub="awaiting settlement"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="Total Wagered" value={`$${totalWagered.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="USDT · all time" highlight
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="Bets Won" value={wonBets} sub={`of ${bets.length} total bets`}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
        />
        <KpiCard label="Transactions" value={totalTxns} sub="all time ledger entries"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
        />
        <KpiCard label="L1 Commission" value={l1Pct} sub="direct referral rate" highlight
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Users</h2>
            <span className="text-[11px] text-[#4A5568]">{totalUsers} total</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0
                ? <SkeletonRow cols={3} />
                : recentUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">{u.username[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-foreground">{u.username}</div>
                            {u.email && <div className="text-[10px] text-[#4A5568] truncate max-w-[140px]">{u.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={u.status} /></td>
                      <td className="px-4 py-2.5 text-[11px] text-[#4A5568]">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Bets</h2>
            <span className="text-[11px] text-[#4A5568]">{bets.length} total</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">Match</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">Stake</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBets.length === 0
                ? <SkeletonRow cols={3} />
                : recentBets.map(b => {
                    const sels = b.selections as Array<{ homeTeam: string; awayTeam: string }> | null;
                    const sel0 = Array.isArray(sels) ? sels[0] : null;
                    return (
                      <tr key={b.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="text-xs font-medium text-foreground truncate max-w-[160px]">
                            {sel0 ? `${sel0.homeTeam} v ${sel0.awayTeam}` : `Bet ${b.id.slice(0, 8)}`}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-foreground">${parseFloat(b.stake).toFixed(2)}</td>
                        <td className="px-4 py-2.5"><BetStatusBadge status={b.status} /></td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Transactions</h2>
          <span className="text-[11px] text-[#4A5568]">{totalTxns} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">ID</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {txns.length === 0
                ? <SkeletonRow cols={5} />
                : txns.slice(0, 5).map(t => (
                    <tr key={t.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-[#4A5568]">{t.id.slice(0, 8)}…</td>
                      <td className="px-4 py-2.5"><TxTypeBadge type={t.type} /></td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-foreground">${parseFloat(t.amount).toFixed(2)}</td>
                      <td className="px-4 py-2.5"><TxStatusBadge status={t.status} /></td>
                      <td className="px-4 py-2.5 text-[11px] text-[#4A5568]">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function TxTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    deposit:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    withdrawal: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    bet_stake:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
    bet_win:    "bg-primary/10 text-primary border-primary/20",
    bet_refund: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    commission: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    adjustment: "bg-white/5 text-[#8A9BB3] border-white/10",
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${map[type] ?? "bg-white/5 text-[#8A9BB3] border-white/10"}`}>
      {type.replace("_", " ")}
    </span>
  );
}

export function TxStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    failed:    "bg-red-500/10 text-red-400 border-red-500/20",
    cancelled: "bg-white/5 text-[#8A9BB3] border-white/10",
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${map[status] ?? "bg-white/5 text-[#8A9BB3] border-white/10"}`}>
      {status}
    </span>
  );
}
