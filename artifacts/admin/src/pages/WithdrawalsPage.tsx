import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminTransaction, PendingTotals } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, ArrowUpCircle,
  Clock, RefreshCw, Copy, Check, Send,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function WalletAddressCell({ address, network }: { address: string | null; network: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!address) return <span className="text-[#334155] text-xs">—</span>;

  function copyAddress() {
    navigator.clipboard.writeText(address!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isErc = network === "ERC-20";

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {/* Full address — monospace, wraps on small screens */}
      <div className="flex items-start gap-2">
        <span className={cn(
          "font-mono text-xs break-all leading-relaxed",
          isErc ? "text-[#A78BFA]" : "text-[#34D399]"
        )}>
          {address}
        </span>
        <button
          onClick={copyAddress}
          title="Copy wallet address"
          className={cn(
            "shrink-0 mt-0.5 p-1 rounded-md border transition-all",
            copied
              ? "bg-[#00DFA9]/10 border-[#00DFA9]/30 text-[#00DFA9]"
              : "bg-white/5 border-white/10 text-[#475569] hover:text-white hover:border-white/20"
          )}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
      {copied && (
        <span className="text-[10px] text-[#00DFA9] font-semibold">✓ Copied to clipboard</span>
      )}
    </div>
  );
}

function NetworkBadge({ network }: { network: string | null }) {
  if (!network) return <span className="text-[#334155] text-xs">—</span>;
  const isErc = network === "ERC-20";
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border",
      isErc
        ? "bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/20"
        : "bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20"
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

export default function WithdrawalsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [network, setNetwork] = useState("");

  const queryKey = ["admin-withdrawals", page, status, network];

  const { data, isLoading, refetch, isFetching } = useQuery<{ transactions: AdminTransaction[]; total: number }>({
    queryKey,
    queryFn: () => {
      let url = `/admin/transactions?page=${page}&limit=${PAGE_SIZE}&type=withdrawal`;
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
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-txns-pending-totals"] });
      if (vars.txStatus === "completed") {
        toast.success("✅ Withdrawal approved — mark as sent after transferring funds");
      } else {
        toast.error("❌ Withdrawal rejected");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selClass = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38BDF8] transition-colors";

  const pendingCount = pendingTotals?.pendingWithdrawalCount ?? 0;
  const pendingTotal = pendingTotals?.pendingWithdrawalTotal ?? "0";

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F87171]/10 border border-[#F87171]/20 flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4 text-[#F87171]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Withdrawals</h1>
          </div>
          <p className="text-sm text-[#475569] mt-1 ml-10">{total.toLocaleString()} total withdrawal requests</p>
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

      {/* Workflow reminder banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#38BDF8]/15 bg-[#38BDF8]/5 px-4 py-3">
        <Send className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#38BDF8]">Manual Processing Workflow</p>
          <p className="text-xs text-[#475569] mt-0.5">
            Copy the user's wallet address → send USDT manually → click <strong className="text-white">Approve</strong> to credit and close the request.
            Always verify the network (TRC-20 or ERC-20) before sending.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#F87171]/20 bg-[#F87171]/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Pending Requests</span>
            <Clock className="w-3.5 h-3.5 text-[#F87171]" />
          </div>
          <p className="text-2xl font-black text-[#F87171]">{pendingCount}</p>
          <p className="text-[11px] text-[#475569] mt-0.5">awaiting manual transfer</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Pending USDT</span>
            <ArrowUpCircle className="w-3.5 h-3.5 text-[#FACC15]" />
          </div>
          <p className="text-2xl font-black text-white">${fmt(pendingTotal)}</p>
          <p className="text-[11px] text-[#475569] mt-0.5">total to be sent out</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider">Total Records</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#94A3B8]" />
          </div>
          <p className="text-2xl font-black text-white">{total.toLocaleString()}</p>
          <p className="text-[11px] text-[#475569] mt-0.5">all-time withdrawals</p>
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
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider w-[300px]">Wallet Address</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Requested</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#334155] text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading withdrawals…
                  </td>
                </tr>
              )}
              {!isLoading && (!data?.transactions || data.transactions.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#334155] text-sm">
                    No withdrawal requests found
                  </td>
                </tr>
              )}
              {data?.transactions.map(txn => (
                <tr key={txn.id}
                  className={cn(
                    "border-b border-white/4 transition-colors hover:bg-white/2",
                    txn.status === "pending" && "bg-[#F87171]/2 hover:bg-[#F87171]/4"
                  )}
                >
                  {/* User */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{txn.username ?? `uid:${txn.userId}`}</span>
                      <span className="text-[10px] text-[#334155] font-mono">#{txn.id}</span>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-4">
                    <span className="font-mono text-sm font-bold text-[#F87171]">
                      −${fmt(txn.amount)} USDT
                    </span>
                  </td>

                  {/* Network */}
                  <td className="px-4 py-4">
                    <NetworkBadge network={txn.network} />
                  </td>

                  {/* Wallet address — full + copy */}
                  <td className="px-4 py-4 max-w-[300px]">
                    <WalletAddressCell address={txn.walletAddress} network={txn.network} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <StatusBadge status={txn.status} />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-4">
                    <span className="text-xs text-[#475569] whitespace-nowrap">{fmtDate(txn.createdAt)}</span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-4">
                    {txn.status === "pending" ? (
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => approveMut.mutate({ id: txn.id, txStatus: "completed" })}
                          disabled={approveMut.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 border border-[#00DFA9]/20 hover:border-[#00DFA9]/40 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          ✓ Approve & Close
                        </button>
                        <button
                          onClick={() => approveMut.mutate({ id: txn.id, txStatus: "rejected" })}
                          disabled={approveMut.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          ✕ Reject
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
