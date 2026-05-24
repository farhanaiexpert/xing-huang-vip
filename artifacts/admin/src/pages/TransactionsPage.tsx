import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminTransaction } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function isDebit(type: string) {
  return type === "withdrawal" || type === "bet_stake" || type === "debit";
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-white/5 rounded animate-pulse" style={{ width: `${55 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
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

  const { data: pendingData } = useQuery<{ transactions: AdminTransaction[]; total: number }>({
    queryKey: ["admin-txns-pending-deposits"],
    queryFn: () => api.get("/admin/transactions?status=pending&type=deposit&limit=100"),
  });
  const { data: pendingWithdrawData } = useQuery<{ transactions: AdminTransaction[]; total: number }>({
    queryKey: ["admin-txns-pending-withdrawals"],
    queryFn: () => api.get("/admin/transactions?status=pending&type=withdrawal&limit=100"),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, txStatus, notes }: { id: number; txStatus: string; notes?: string }) =>
      api.patch(`/admin/transactions/${id}`, { status: txStatus, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-txns"] }); toast.success("Transaction updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pendingDepositTotal = (pendingData?.transactions ?? []).reduce((s, t) => s + parseFloat(t.amount), 0);
  const pendingWithdrawTotal = (pendingWithdrawData?.transactions ?? []).reduce((s, t) => s + parseFloat(t.amount), 0);

  const sel = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9] transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-sm text-[#475569] mt-0.5">{total.toLocaleString()} total</p>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 bg-[#00DFA9]/6 border border-[#00DFA9]/15 rounded-xl px-4 py-3">
          <div className="p-2 rounded-lg bg-[#00DFA9]/10">
            <ArrowDownCircle className="w-4 h-4 text-[#00DFA9]" />
          </div>
          <div>
            <div className="text-xs text-[#475569]">Pending Deposits</div>
            <div className="text-sm font-bold text-[#00DFA9] font-mono">${fmt(String(pendingDepositTotal))} USDT</div>
          </div>
          <div className="ml-auto text-xs text-[#00DFA9] font-semibold">
            {pendingData?.total ?? 0} pending
          </div>
        </div>
        <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <ArrowUpCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <div className="text-xs text-[#475569]">Pending Withdrawals</div>
            <div className="text-sm font-bold text-red-400 font-mono">${fmt(String(pendingWithdrawTotal))} USDT</div>
          </div>
          <div className="ml-auto text-xs text-red-400 font-semibold">
            {pendingWithdrawData?.total ?? 0} pending
          </div>
        </div>
      </div>

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#475569] text-[11px] uppercase tracking-wider bg-white/2">
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Reference</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
              ) : data?.transactions.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-[#334155]">No transactions found</td></tr>
              ) : data?.transactions.map(t => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3.5 text-[#475569] font-mono text-xs">#{t.id}</td>
                  <td className="px-4 py-3.5 text-white text-sm font-medium">{t.username ?? `uid:${t.userId}`}</td>
                  <td className="px-4 py-3.5 text-[#64748B] capitalize text-xs">{t.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold">
                    <span className={isDebit(t.type) ? "text-red-400" : "text-[#00DFA9]"}>
                      {isDebit(t.type) ? "−" : "+"}${fmt(t.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium", statusBg(t.status))}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#475569] text-xs font-mono">{t.reference ?? "—"}</td>
                  <td className="px-4 py-3.5 text-[#475569] text-xs whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    {t.status === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => approveMut.mutate({ id: t.id, txStatus: "completed" })}
                          className="px-2.5 py-1 rounded-lg text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors font-medium">
                          Approve
                        </button>
                        <button onClick={() => approveMut.mutate({ id: t.id, txStatus: "rejected" })}
                          className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium">
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 text-[#475569]">
          <span className="text-xs">Page {page} of {pages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2">{page}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
