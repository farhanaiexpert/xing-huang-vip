import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminTransaction, PendingTotals } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataTable, ColDef } from "@/components/DataTable";

const PAGE_SIZE = 20;

function isDebit(type: string) {
  return type === "withdrawal" || type === "bet_stake" || type === "debit";
}

function TxHashLink({ hash, network }: { hash: string | null; network: string | null }) {
  if (!hash) return <span className="text-[#475569] text-xs">—</span>;
  const short = hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
  const url = (network ?? "TRC-20") === "TRC-20"
    ? `https://tronscan.org/#/transaction/${hash}`
    : `https://bscscan.com/tx/${hash}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[#38BDF8] text-xs font-mono hover:underline">
      {short} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
    </a>
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

  const { data: pendingTotals } = useQuery<PendingTotals>({
    queryKey: ["admin-txns-pending-totals"],
    queryFn: () => api.get("/admin/transactions/pending-totals"),
    refetchInterval: 30_000,
  });

  const approveMut = useMutation({
    mutationFn: ({ id, txStatus, notes }: { id: number; txStatus: string; notes?: string }) =>
      api.patch(`/admin/transactions/${id}`, { status: txStatus, ...(notes ? { notes } : {}) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-txns"] });
      qc.invalidateQueries({ queryKey: ["admin-txns-pending-totals"] });
      toast.success(vars.txStatus === "completed" ? "✅ Transaction approved — balance updated" : "Transaction rejected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sel = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9] transition-colors";

  const cols: ColDef<AdminTransaction>[] = [
    {
      key: "id", label: "ID", sortable: true,
      getValue: t => t.id,
      render: t => <span className="text-[#475569] font-mono text-xs">#{t.id}</span>,
    },
    {
      key: "user", label: "User",
      render: t => <span className="text-white text-sm font-medium">{t.username ?? `uid:${t.userId}`}</span>,
    },
    {
      key: "type", label: "Type", sortable: true,
      getValue: t => t.type,
      render: t => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[#64748B] capitalize text-xs">{t.type.replace(/_/g, " ")}</span>
          {t.network && (
            <span className="text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded-md w-fit">
              {t.network}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "amount", label: "Amount", sortable: true,
      getValue: t => parseFloat(t.amount),
      render: t => (
        <span className={cn("font-mono text-xs font-semibold", isDebit(t.type) ? "text-red-400" : "text-[#00DFA9]")}>
          {isDebit(t.type) ? "−" : "+"}${fmt(t.amount)}
        </span>
      ),
    },
    {
      key: "status", label: "Status", sortable: true,
      getValue: t => t.status,
      render: t => (
        <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium", statusBg(t.status))}>
          {t.status}
        </span>
      ),
    },
    {
      key: "txhash", label: "TxHash / Address",
      render: t => {
        if (t.txHash) return (
          <div className="flex flex-col gap-1">
            <TxHashLink hash={t.txHash} network={t.network} />
            {/* Blockchain verification badge — only shown for deposits */}
            {t.type === "deposit" && (
              t.verified === true ? (
                <span
                  title={t.verificationNote ?? "Auto-verified via Tronscan"}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/20">
                  ✓ Verified on-chain
                </span>
              ) : (
                <span
                  title={t.verificationNote ?? "Manual review required"}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ⚠ Needs review
                </span>
              )
            )}
          </div>
        );
        if (t.walletAddress) return (
          <span className="text-[#475569] text-xs font-mono">
            {t.walletAddress.length > 14
              ? `${t.walletAddress.slice(0, 7)}…${t.walletAddress.slice(-5)}`
              : t.walletAddress}
          </span>
        );
        if (t.reference) return <span className="text-[#475569] text-xs font-mono">{t.reference.slice(0, 20)}{t.reference.length > 20 ? '…' : ''}</span>;
        return <span className="text-[#475569] text-xs">—</span>;
      },
    },
    {
      key: "notes", label: "Notes",
      render: t => {
        const note = t.verificationNote ?? t.notes;
        return (
          <div className="flex flex-col gap-0.5">
            {t.nowpaymentsPaymentId && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/20 px-1.5 py-0.5 rounded-full max-w-[150px] truncate" title={`NowPayments ID: ${t.nowpaymentsPaymentId}`}>
                ⚡ {t.nowpaymentsStatus ?? "NPP"} · {t.nowpaymentsPaymentId.slice(0, 8)}…
              </span>
            )}
            {t.plisioPaymentId && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#A855F7] bg-[#A855F7]/10 border border-[#A855F7]/20 px-1.5 py-0.5 rounded-full max-w-[150px] truncate" title={`Plisio ID: ${t.plisioPaymentId}`}>
                🔷 {t.plisioStatus ?? "Plisio"} · {t.plisioPaymentId.slice(0, 8)}…
              </span>
            )}
            {note
              ? <span className="text-[#475569] text-xs max-w-[150px] truncate block" title={note}>{note}</span>
              : !t.nowpaymentsPaymentId && !t.plisioPaymentId && <span className="text-[#475569] text-xs">—</span>}
          </div>
        );
      },
    },
    {
      key: "date", label: "Date", sortable: true,
      getValue: t => t.createdAt,
      render: t => <span className="text-[#475569] text-xs whitespace-nowrap">{fmtDate(t.createdAt)}</span>,
    },
    {
      key: "action", label: "Action",
      render: t => (
        t.status === "pending" ? (
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => approveMut.mutate({ id: t.id, txStatus: "completed" })}
              disabled={approveMut.isPending}
              className="px-2.5 py-1 rounded-lg text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors font-medium disabled:opacity-50">
              Approve
            </button>
            <button
              onClick={() => approveMut.mutate({ id: t.id, txStatus: "rejected" })}
              disabled={approveMut.isPending}
              className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium disabled:opacity-50">
              Reject
            </button>
          </div>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-sm text-[#475569] mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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

      {/* Pending totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 bg-[#00DFA9]/6 border border-[#00DFA9]/15 rounded-xl px-4 py-3">
          <div className="p-2 rounded-lg bg-[#00DFA9]/10">
            <ArrowDownCircle className="w-4 h-4 text-[#00DFA9]" />
          </div>
          <div>
            <div className="text-xs text-[#475569]">Pending Deposits</div>
            <div className="text-sm font-bold text-[#00DFA9] font-mono">
              ${fmt(pendingTotals?.pendingDepositTotal ?? "0")} USDT
            </div>
          </div>
          <div className="ml-auto text-xs text-[#00DFA9] font-semibold">
            {pendingTotals?.pendingDepositCount ?? 0} pending
          </div>
        </div>
        <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <ArrowUpCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <div className="text-xs text-[#475569]">Pending Withdrawals</div>
            <div className="text-sm font-bold text-red-400 font-mono">
              ${fmt(pendingTotals?.pendingWithdrawalTotal ?? "0")} USDT
            </div>
          </div>
          <div className="ml-auto text-xs text-red-400 font-semibold">
            {pendingTotals?.pendingWithdrawalCount ?? 0} pending
          </div>
        </div>
      </div>

      <DataTable
        cols={cols}
        rows={data?.transactions}
        loading={isLoading}
        rowKey={t => t.id}
        empty="No transactions found"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs">Page {page} of {pages} · {total} total</span>
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
        }
      />
    </div>
  );
}
