import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminTransaction, PendingTotals } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, ArrowDownCircle,
  ExternalLink, CheckCircle2, AlertTriangle, Clock,
  RefreshCw, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function CopyableId({ id, label, color }: { id: string; label: string; color: string }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[10px]" style={{ color }}>
        {id.slice(0, 8)}…{id.slice(-6)}
      </span>
      <button onClick={doCopy} className="text-[#475569] hover:text-[#94A3B8] transition-colors" title={`Copy ${label}`}>
        {copied ? <Check className="w-3 h-3 text-[#00DFA9]" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

const NPP_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  waiting:      { bg: 'rgba(250,204,21,0.08)',  text: '#FACC15',  border: 'rgba(250,204,21,0.20)',  label: 'Waiting' },
  confirming:   { bg: 'rgba(56,189,248,0.08)',  text: '#38BDF8',  border: 'rgba(56,189,248,0.20)',  label: 'Confirming' },
  confirmed:    { bg: 'rgba(0,223,169,0.08)',   text: '#00DFA9',  border: 'rgba(0,223,169,0.20)',   label: 'Confirmed' },
  finished:     { bg: 'rgba(0,223,169,0.08)',   text: '#00DFA9',  border: 'rgba(0,223,169,0.20)',   label: 'Finished ✓' },
  failed:       { bg: 'rgba(239,68,68,0.08)',   text: '#F87171',  border: 'rgba(239,68,68,0.20)',   label: 'Failed' },
  refunded:     { bg: 'rgba(239,68,68,0.08)',   text: '#F87171',  border: 'rgba(239,68,68,0.20)',   label: 'Refunded' },
  expired:      { bg: 'rgba(100,116,139,0.10)', text: '#94A3B8',  border: 'rgba(100,116,139,0.20)', label: 'Expired' },
  partially_paid: { bg: 'rgba(250,204,21,0.08)', text: '#FACC15', border: 'rgba(250,204,21,0.20)', label: 'Partial' },
};

function NppStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const cfg = NPP_STATUS_COLORS[status] ?? {
    bg: 'rgba(100,116,139,0.10)', text: '#94A3B8', border: 'rgba(100,116,139,0.20)', label: status,
  };
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
      ⚡ {cfg.label}
    </span>
  );
}

function TxHashCell({ hash, network, nowpaymentsPaymentId, nowpaymentsStatus }: {
  hash: string | null;
  network: string | null;
  nowpaymentsPaymentId: string | null;
  nowpaymentsStatus: string | null;
}) {
  const [copied, setCopied] = useState(false);

  function copyHash() {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const url = hash ? ((network ?? "TRC-20") === "ERC-20"
    ? `https://etherscan.io/tx/${hash}`
    : `https://tronscan.org/#/transaction/${hash}`) : null;

  return (
    <div className="flex flex-col gap-1">
      {hash ? (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-[#94A3B8]">
            {hash.slice(0, 10)}…{hash.slice(-6)}
          </span>
          <button onClick={copyHash} className="text-[#475569] hover:text-[#94A3B8] transition-colors" title="Copy hash">
            {copied ? <Check className="w-3 h-3 text-[#00DFA9]" /> : <Copy className="w-3 h-3" />}
          </button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="text-[#38BDF8] hover:text-[#7DD3FC] transition-colors" title="View on explorer">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      ) : null}
      {nowpaymentsPaymentId && (
        <div className="flex flex-col gap-0.5">
          <CopyableId id={nowpaymentsPaymentId} label="NOWPay ID" color="#38BDF8" />
          {nowpaymentsStatus && <NppStatusBadge status={nowpaymentsStatus} />}
        </div>
      )}
      {!hash && !nowpaymentsPaymentId && <span className="text-[#334155] text-xs">—</span>}
    </div>
  );
}

function VerificationBadge({ verified, note }: { verified: boolean | null; note: string | null }) {
  if (verified === true) return (
    <span title={note ?? "Auto-verified on-chain"}
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/20 whitespace-nowrap">
      <CheckCircle2 className="w-2.5 h-2.5" /> On-chain ✓
    </span>
  );
  if (verified === false) return (
    <span title={note ?? "Manual review required"}
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
      <AlertTriangle className="w-2.5 h-2.5" /> Needs review
    </span>
  );
  return <span className="text-[#334155] text-xs">—</span>;
}

function NetworkBadge({ network }: { network: string | null }) {
  if (!network) return <span className="text-[#334155] text-xs">—</span>;
  const isErc = network === "ERC-20";
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border",
      isErc
        ? "bg-[#627EEA]/10 text-[#627EEA] border-[#627EEA]/20"
        : "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20"
    )}>
      {network}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] border font-semibold", statusBg(status))}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function DepositsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [network, setNetwork] = useState("");

  const queryKey = ["admin-deposits", page, status, network];

  const { data, isLoading, refetch, isFetching } = useQuery<{ transactions: AdminTransaction[]; total: number }>({
    queryKey,
    queryFn: () => {
      let url = `/admin/transactions?page=${page}&limit=${PAGE_SIZE}&type=deposit`;
      if (status) url += `&status=${status}`;
      if (network) url += `&network=${encodeURIComponent(network)}`;
      return api.get(url);
    },
    refetchInterval: 30_000,
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
      qc.invalidateQueries({ queryKey: ["admin-deposits"] });
      qc.invalidateQueries({ queryKey: ["admin-txns-pending-totals"] });
      toast.success(vars.txStatus === "completed" ? "✅ Deposit approved — balance credited" : "❌ Deposit rejected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selClass = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9] transition-colors";

  const pendingCount = pendingTotals?.pendingDepositCount ?? 0;
  const pendingTotal = pendingTotals?.pendingDepositTotal ?? "0";

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center">
              <ArrowDownCircle className="w-4 h-4 text-[#00DFA9]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Deposits</h1>
          </div>
          <p className="text-sm text-[#475569] mt-1 ml-10">{total.toLocaleString()} total deposits</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#94A3B8] hover:text-white hover:bg-white/8 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#00DFA9]/20 bg-[#00DFA9]/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Pending Review</span>
            <Clock className="w-3.5 h-3.5 text-[#00DFA9]" />
          </div>
          <p className="text-2xl font-black text-[#00DFA9]">{pendingCount}</p>
          <p className="text-[11px] text-[#475569] mt-0.5">deposits awaiting approval</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Pending USDT</span>
            <ArrowDownCircle className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <p className="text-2xl font-black text-white">${fmt(pendingTotal)}</p>
          <p className="text-[11px] text-[#475569] mt-0.5">waiting to be credited</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Total Records</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="text-2xl font-black text-white">{total.toLocaleString()}</p>
          <p className="text-[11px] text-[#475569] mt-0.5">all-time deposits</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={selClass}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={network} onChange={e => { setNetwork(e.target.value); setPage(1); }} className={selClass}>
          <option value="">All networks</option>
          <option value="TRC-20">TRC-20 (Tron)</option>
          <option value="ERC-20">ERC-20 (Ethereum)</option>
        </select>
        {(status || network) && (
          <button onClick={() => { setStatus(""); setNetwork(""); setPage(1); }}
            className="px-3 py-2 rounded-lg text-sm text-[#475569] hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 bg-[#0E1520] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/6 bg-white/2">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Network</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">TxHash</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Verification</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#334155] text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading deposits…
                  </td>
                </tr>
              )}
              {!isLoading && (!data?.transactions || data.transactions.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#334155] text-sm">
                    No deposits found
                  </td>
                </tr>
              )}
              {data?.transactions.map((txn, i) => (
                <tr key={txn.id}
                  className={cn(
                    "border-b border-white/4 transition-colors hover:bg-white/2",
                    txn.status === "pending" && "bg-[#00DFA9]/2"
                  )}
                >
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{txn.username ?? `uid:${txn.userId}`}</span>
                      <span className="text-[10px] text-[#334155] font-mono">#{txn.id}</span>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold text-[#00DFA9]">
                      +${fmt(txn.amount)} USDT
                    </span>
                  </td>

                  {/* Network */}
                  <td className="px-4 py-3">
                    <NetworkBadge network={txn.network} />
                  </td>

                  {/* TxHash / NOWPay */}
                  <td className="px-4 py-3">
                    <TxHashCell
                      hash={txn.txHash}
                      network={txn.network}
                      nowpaymentsPaymentId={txn.nowpaymentsPaymentId}
                      nowpaymentsStatus={txn.nowpaymentsStatus}
                    />
                  </td>

                  {/* Verification */}
                  <td className="px-4 py-3">
                    <VerificationBadge verified={txn.verified} note={txn.verificationNote} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={txn.status} />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#475569] whitespace-nowrap">{fmtDate(txn.createdAt)}</span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    {txn.status === "pending" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => approveMut.mutate({ id: txn.id, txStatus: "completed" })}
                          disabled={approveMut.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 border border-[#00DFA9]/20 hover:border-[#00DFA9]/40 transition-all disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => approveMut.mutate({ id: txn.id, txStatus: "rejected" })}
                          disabled={approveMut.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[#334155] text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/6 bg-white/1">
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
