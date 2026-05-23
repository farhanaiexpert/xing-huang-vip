import { useState } from "react";
import { useAdminGetTransactions } from "@workspace/api-client-react";
import { TxTypeBadge, TxStatusBadge } from "./Overview";
import type { TransactionItem } from "@workspace/api-client-react";

function TableSkeleton() {
  return (
    <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {["ID", "User", "Type", "Amount", "Status", "Description", "Date"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 7 }).map((_, i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-0">
              {Array.from({ length: 7 }).map((__, j) => (
                <td key={j} className="px-4 py-3"><div className="h-3.5 rounded bg-white/5 animate-pulse" style={{ width: `${50 + (j * 20) % 80}px` }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TX_TYPES = ["all", "deposit", "withdrawal", "bet_stake", "bet_win", "bet_refund", "commission", "adjustment"];
const TX_STATUSES = ["all", "pending", "completed", "failed", "cancelled"];

export default function Transactions() {
  const { data, isLoading, error } = useAdminGetTransactions();
  const [typeFilter, setType]       = useState("all");
  const [statusFilter, setStatus]   = useState("all");
  const [search, setSearch]         = useState("");

  const allTxns = (data?.transactions ?? []) as TransactionItem[];

  const txns = allTxns.filter(t => {
    if (typeFilter   !== "all" && t.type   !== typeFilter)   return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return t.id.toLowerCase().includes(q) || t.userId.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q) ?? false);
  });

  const totalAmount = txns.reduce((s, t) => s + parseFloat(t.amount ?? "0"), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-foreground">Transactions</h1>
          <p className="text-xs text-[#4A5568] mt-0.5">
            {txns.length} entries · ${totalAmount.toFixed(2)} USDT (filtered)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={typeFilter} onChange={e => setType(e.target.value)}
            className="text-xs bg-[#0D1117] border border-white/[0.08] text-foreground rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50 cursor-pointer">
            {TX_TYPES.map(t => <option key={t} value={t}>{t === "all" ? "All types" : t.replace("_", " ")}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
            className="text-xs bg-[#0D1117] border border-white/[0.08] text-foreground rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50 cursor-pointer">
            {TX_STATUSES.map(s => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
          </select>
          <input
            type="search"
            placeholder="Search ID, user, description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0D1117] border border-white/[0.08] text-sm text-foreground placeholder:text-[#4A5568] focus:outline-none focus:border-primary/50 w-56 transition-colors"
          />
        </div>
      </div>

      {isLoading ? <TableSkeleton /> : error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
          Failed to load transactions
        </div>
      ) : txns.length === 0 ? (
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center py-20 text-[#4A5568] gap-3">
          <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 64 64">
            <path d="M10 32h44M32 10l22 22-22 22" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-medium">{search || typeFilter !== "all" || statusFilter !== "all" ? "No transactions match your filters" : "No transactions recorded yet"}</p>
        </div>
      ) : (
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Txn ID", "User ID", "Type", "Amount", "Status", "Description", "Date"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map(t => (
                  <tr key={t.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-[#4A5568] whitespace-nowrap">{t.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#4A5568] whitespace-nowrap">{t.userId.slice(0, 8)}…</td>
                    <td className="px-4 py-3 whitespace-nowrap"><TxTypeBadge type={t.type} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-foreground">${parseFloat(t.amount).toFixed(2)}</span>
                      <span className="text-[10px] text-[#4A5568] ml-1">{t.currency}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><TxStatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <span className="text-[11px] text-[#8A9BB3] truncate block">{t.description ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-[#4A5568] whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}{" "}
                      <span className="text-[#2D3748]">{new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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
