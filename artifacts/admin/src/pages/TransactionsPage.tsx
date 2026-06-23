import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminTransaction, PendingTotals } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle,
  ExternalLink, RefreshCw, Gift, Zap, Link2, Hash, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function isDebit(type: string) {
  return type === "withdrawal" || type === "bet_stake" || type === "debit";
}

function amountColor(type: string) {
  if (type === "bonus") return "text-[#FACC15]";
  if (isDebit(type))   return "text-red-400";
  return "text-[#00DFA9]";
}

function amountSign(type: string) {
  if (type === "bonus")  return "+";
  if (isDebit(type))     return "−";
  return "+";
}

const TYPE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  deposit:    { bg: "rgba(0,223,169,0.08)",   color: "#00DFA9", border: "rgba(0,223,169,0.20)" },
  withdrawal: { bg: "rgba(239,68,68,0.08)",   color: "#F87171", border: "rgba(239,68,68,0.20)" },
  bonus:      { bg: "rgba(250,204,21,0.10)",  color: "#FACC15", border: "rgba(250,204,21,0.25)" },
  credit:     { bg: "rgba(56,189,248,0.08)",  color: "#38BDF8", border: "rgba(56,189,248,0.20)" },
  debit:      { bg: "rgba(239,68,68,0.08)",   color: "#F87171", border: "rgba(239,68,68,0.20)" },
  bet_stake:  { bg: "rgba(100,116,139,0.08)", color: "#94A3B8", border: "rgba(100,116,139,0.20)" },
  bet_win:    { bg: "rgba(0,223,169,0.08)",   color: "#00DFA9", border: "rgba(0,223,169,0.20)" },
  commission: { bg: "rgba(167,139,250,0.08)", color: "#A78BFA", border: "rgba(167,139,250,0.20)" },
  refund:     { bg: "rgba(56,189,248,0.08)",  color: "#38BDF8", border: "rgba(56,189,248,0.20)" },
};

function TypeBadge({ type }: { type: string }) {
  const s = TYPE_STYLES[type] ?? { bg: "rgba(100,116,139,0.08)", color: "#94A3B8", border: "rgba(100,116,139,0.20)" };
  const icon = type === "bonus" ? <Gift className="w-2.5 h-2.5 shrink-0" /> : null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {icon}
      {type.replace(/_/g, " ")}
    </span>
  );
}

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="shrink-0 text-[#475569] hover:text-[#94A3B8] transition-colors" title={`Copy ${label}`}>
      {copied ? <Check className="w-3 h-3 text-[#00DFA9]" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function explorerUrl(hash: string, network: string | null) {
  const net = network ?? "TRC-20";
  if (net === "ERC-20") return `https://etherscan.io/tx/${hash}`;
  if (net === "BSC")    return `https://bscscan.com/tx/${hash}`;
  if (net === "SOL")    return `https://solscan.io/tx/${hash}`;
  if (net === "BTC")    return `https://mempool.space/tx/${hash}`;
  if (net === "TON")    return `https://tonscan.org/tx/${hash}`;
  return `https://tronscan.org/#/transaction/${hash}`;
}

function TxRefCell({ txn }: { txn: AdminTransaction }) {
  const [copiedHash, setCopiedHash] = useState(false);
  function copyHash() {
    if (!txn.txHash) return;
    navigator.clipboard.writeText(txn.txHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  }

  if (txn.type === "bonus" && txn.reference) {
    const promoNum = txn.reference.replace("promo_", "");
    const isPromo = txn.reference.startsWith("promo_");
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/25 whitespace-nowrap w-fit">
          <Gift className="w-2.5 h-2.5" />
          {isPromo ? `Promo #${promoNum}` : txn.reference}
        </span>
        {txn.notes && <span className="text-[10px] text-[#64748B] max-w-[160px] truncate" title={txn.notes}>{txn.notes}</span>}
      </div>
    );
  }

  if (txn.txHash) {
    const short = `${txn.txHash.slice(0, 8)}…${txn.txHash.slice(-6)}`;
    return (
      <div className="flex items-center gap-1.5">
        <Hash className="w-3 h-3 text-[#475569] shrink-0" />
        <span className="font-mono text-[11px] text-[#94A3B8]">{short}</span>
        <button onClick={copyHash} className="text-[#475569] hover:text-[#94A3B8]" title="Copy hash">
          {copiedHash ? <Check className="w-3 h-3 text-[#00DFA9]" /> : <Copy className="w-3 h-3" />}
        </button>
        <a href={explorerUrl(txn.txHash, txn.network)} target="_blank" rel="noopener noreferrer"
          className="text-[#38BDF8] hover:text-[#7DD3FC]" title="View on explorer">
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  if (txn.walletAddress) {
    const short = txn.walletAddress.length > 14
      ? `${txn.walletAddress.slice(0, 7)}…${txn.walletAddress.slice(-5)}`
      : txn.walletAddress;
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[#64748B] font-mono">{short}</span>
        <CopyBtn value={txn.walletAddress} label="address" />
      </div>
    );
  }

  if (txn.reference) {
    return <span className="text-[11px] text-[#475569] font-mono">{txn.reference.slice(0, 22)}{txn.reference.length > 22 ? "…" : ""}</span>;
  }

  return <span className="text-[#334155] text-xs">—</span>;
}

function GatewayCell({ txn }: { txn: AdminTransaction }) {
  const parts: React.ReactNode[] = [];

  if (txn.nowpaymentsPaymentId) {
    parts.push(
      <div key="npp" className="flex items-center gap-1">
        <Zap className="w-3 h-3 text-[#38BDF8] shrink-0" />
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/20 px-1.5 py-0.5 rounded-full max-w-[140px] truncate" title={txn.nowpaymentsPaymentId}>
          NPP · {txn.nowpaymentsStatus ?? "—"} · {txn.nowpaymentsPaymentId.slice(0, 8)}…
        </span>
        <a href={`https://nowpayments.io/payment/?iid=${txn.nowpaymentsPaymentId}`} target="_blank" rel="noopener noreferrer"
          className="text-[#38BDF8]/50 hover:text-[#38BDF8]" title="View on NOWPayments">
          <Link2 className="w-3 h-3" />
        </a>
      </div>
    );
  }

  const note = txn.verificationNote ?? txn.notes;
  if (note && !txn.nowpaymentsPaymentId) {
    parts.push(
      <span key="note" className="text-[#475569] text-xs max-w-[150px] truncate block" title={note}>{note}</span>
    );
  }

  return parts.length > 0
    ? <div className="flex flex-col gap-0.5">{parts}</div>
    : <span className="text-[#334155] text-xs">—</span>;
}

const sel = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9] transition-colors w-full sm:w-auto";

export default function TransactionsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery<{ transactions: AdminTransaction[]; total: number }>({
    queryKey: ["admin-txns", page, typeFilter, status],
    queryFn: () =>
      api.get(`/admin/transactions?page=${page}&limit=${PAGE_SIZE}${typeFilter ? `&type=${typeFilter}` : ""}${status ? `&status=${status}` : ""}`),
  });

  const { data: pendingTotals } = useQuery<PendingTotals>({
    queryKey: ["admin-txns-pending-totals"],
    queryFn: () => api.get("/admin/transactions/pending-totals"),
    refetchInterval: 30_000,
  });

  const approveMut = useMutation({
    mutationFn: ({ id, txStatus }: { id: number; txStatus: string }) =>
      api.patch(`/admin/transactions/${id}`, { status: txStatus }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-txns"] });
      qc.invalidateQueries({ queryKey: ["admin-txns-pending-totals"] });
      toast.success(vars.txStatus === "completed" ? "✅ Transaction approved" : "Transaction rejected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(typeFilter || status);

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-sm text-[#475569] mt-0.5">{total.toLocaleString()} total records</p>
        </div>
      </div>

      {/* ── Pending totals ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 bg-[#00DFA9]/6 border border-[#00DFA9]/15 rounded-xl px-3 sm:px-4 py-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-[#00DFA9]/10 shrink-0">
            <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00DFA9]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs text-[#475569]">Pending Deposits</div>
            <div className="text-xs sm:text-sm font-bold text-[#00DFA9] font-mono truncate">
              ${fmt(pendingTotals?.pendingDepositTotal ?? "0")}
            </div>
          </div>
          <div className="text-[10px] sm:text-xs text-[#00DFA9] font-semibold shrink-0">
            {pendingTotals?.pendingDepositCount ?? 0}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 bg-red-500/5 border border-red-500/15 rounded-xl px-3 sm:px-4 py-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 shrink-0">
            <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-xs text-[#475569]">Pending Withdrawals</div>
            <div className="text-xs sm:text-sm font-bold text-red-400 font-mono truncate">
              ${fmt(pendingTotals?.pendingWithdrawalTotal ?? "0")}
            </div>
          </div>
          <div className="text-[10px] sm:text-xs text-red-400 font-semibold shrink-0">
            {pendingTotals?.pendingWithdrawalCount ?? 0}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={sel}>
          <option value="">All types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="bonus">Bonus (Promo)</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
          <option value="bet_stake">Bet Stake</option>
          <option value="bet_win">Bet Win</option>
          <option value="commission">Commission</option>
          <option value="refund">Refund</option>
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={sel}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setTypeFilter(""); setStatus(""); setPage(1); }}
            className="px-3 py-2 rounded-lg text-sm text-[#475569] hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* ── Data container ── */}
      <div className="rounded-xl border border-white/8 bg-[#0E1520] overflow-hidden">

        {/* ── Mobile cards (< sm) ── */}
        <div className="sm:hidden">
          {isLoading && (
            <div className="p-10 text-center text-[#334155] text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00DFA9]" />
              Loading…
            </div>
          )}
          {!isLoading && (!data?.transactions || data.transactions.length === 0) && (
            <div className="p-10 text-center text-[#334155] text-sm">No transactions found</div>
          )}
          <div className="divide-y divide-white/6">
            {data?.transactions.map(txn => {
              const isBonus = txn.type === "bonus";
              return (
                <div key={txn.id} className={cn(
                  "p-4 space-y-2.5",
                  isBonus && "bg-[#FACC15]/[0.02]",
                  txn.status === "pending" && !isBonus && "bg-[#00DFA9]/[0.02]",
                )}>
                  {/* Top row: ID + user + type */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{txn.username ?? `uid:${txn.userId}`}</span>
                        <TypeBadge type={txn.type} />
                      </div>
                      <div className="text-[10px] text-[#475569] font-mono mt-0.5">#{txn.id} · {fmtDate(txn.createdAt)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("font-mono font-bold text-base", amountColor(txn.type))}>
                        {amountSign(txn.type)}${fmt(txn.amount)}
                      </div>
                      {isBonus && <div className="text-[9px] text-[#FACC15]/50">non-withdrawable</div>}
                    </div>
                  </div>

                  {/* Status + network */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium whitespace-nowrap", statusBg(txn.status))}>
                      {txn.status}
                    </span>
                    {txn.network && (
                      <span className="text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded-md">
                        {txn.network}
                      </span>
                    )}
                  </div>

                  {/* Ref */}
                  <TxRefCell txn={txn} />

                  {/* Actions */}
                  {txn.status === "pending" && (
                    <div className="flex gap-2 pt-0.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => approveMut.mutate({ id: txn.id, txStatus: "completed" })}
                        disabled={approveMut.isPending}
                        className="flex-1 py-2 rounded-lg text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors font-semibold disabled:opacity-50">
                        Approve
                      </button>
                      <button
                        onClick={() => approveMut.mutate({ id: txn.id, txStatus: "rejected" })}
                        disabled={approveMut.isPending}
                        className="flex-1 py-2 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-semibold disabled:opacity-50">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Desktop table (sm+) ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/6 bg-white/2">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Ref / TxHash</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Gateway</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-[#334155] text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00DFA9]" />
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && (!data?.transactions || data.transactions.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-[#334155] text-sm">
                    No transactions found
                  </td>
                </tr>
              )}
              {data?.transactions.map(txn => {
                const isBonus = txn.type === "bonus";
                return (
                  <tr key={txn.id}
                    className={cn(
                      "border-b border-white/4 transition-colors hover:bg-white/[0.015]",
                      isBonus && "bg-[#FACC15]/[0.02] hover:bg-[#FACC15]/[0.04]",
                      txn.status === "pending" && !isBonus && "bg-[#00DFA9]/[0.02]",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[#475569] font-mono text-xs">#{txn.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-white whitespace-nowrap">
                        {txn.username ?? `uid:${txn.userId}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <TypeBadge type={txn.type} />
                        {txn.network && (
                          <span className="text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded-md w-fit">
                            {txn.network}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("font-mono text-sm font-bold whitespace-nowrap", amountColor(txn.type))}>
                        {amountSign(txn.type)}${fmt(txn.amount)}
                      </span>
                      {isBonus && (
                        <p className="text-[9px] text-[#FACC15]/50 mt-0.5">non-withdrawable</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium whitespace-nowrap", statusBg(txn.status))}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <TxRefCell txn={txn} />
                    </td>
                    <td className="px-4 py-3">
                      <GatewayCell txn={txn} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#475569] text-xs whitespace-nowrap">{fmtDate(txn.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {txn.status === "pending" ? (
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => approveMut.mutate({ id: txn.id, txStatus: "completed" })}
                            disabled={approveMut.isPending}
                            className="px-2.5 py-1 rounded-lg text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors font-semibold disabled:opacity-50 whitespace-nowrap">
                            Approve
                          </button>
                          <button
                            onClick={() => approveMut.mutate({ id: txn.id, txStatus: "rejected" })}
                            disabled={approveMut.isPending}
                            className="px-2.5 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-semibold disabled:opacity-50 whitespace-nowrap">
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#334155] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/6 bg-white/[0.01]">
          <span className="text-xs text-[#334155]">Page {page} of {pages} · {total} total</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors text-[#475569]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#475569] px-2 font-mono">{page}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors text-[#475569]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
