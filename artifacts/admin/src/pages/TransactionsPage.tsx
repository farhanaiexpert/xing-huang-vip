import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminTransaction } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function isDebit(type: string) {
  return type === "withdrawal" || type === "bet_stake" || type === "debit";
}

export default function TransactionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery<{ transactions: AdminTransaction[]; total: number }>({
    queryKey: ["admin-txns", page, type, status],
    queryFn: () =>
      api.get(`/admin/transactions?page=${page}&limit=${PAGE_SIZE}${type ? `&type=${type}` : ""}${status ? `&status=${status}` : ""}`),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, txStatus, notes }: { id: number; txStatus: string; notes?: string }) =>
      api.patch(`/admin/transactions/${id}`, { status: txStatus, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-txns"] }); toast.success("Transaction updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sel = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9] transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total.toLocaleString()} total</p>
        </div>
        <div className="flex gap-2">
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className={sel}>
            <option value="">All types</option>
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="bet_stake">Bet stake</option>
            <option value="bet_win">Bet win</option>
            <option value="commission">Commission</option>
            <option value="promotion">Promotion</option>
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={sel}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#94A3B8] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Reference</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#94A3B8]">Loading…</td></tr>
              ) : data?.transactions.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#94A3B8]">No transactions</td></tr>
              ) : data?.transactions.map(t => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-[#94A3B8] font-mono text-xs">#{t.id}</td>
                  <td className="px-4 py-3 text-white">{t.username ?? `uid:${t.userId}`}</td>
                  <td className="px-4 py-3 text-[#94A3B8] capitalize text-xs">{t.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    <span className={isDebit(t.type) ? "text-red-400" : "text-[#00DFA9]"}>
                      {isDebit(t.type) ? "-" : "+"}${fmt(t.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs border", statusBg(t.status))}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs font-mono">{t.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">{fmtDate(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    {t.status === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => approveMut.mutate({ id: t.id, txStatus: "completed" })}
                          className="px-2 py-1 rounded text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors">
                          Approve
                        </button>
                        <button onClick={() => approveMut.mutate({ id: t.id, txStatus: "rejected" })}
                          className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 text-sm text-[#94A3B8]">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
