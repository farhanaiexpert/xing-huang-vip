import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminTransaction, PendingTotals } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, ArrowDownCircle,
  ExternalLink, CheckCircle2, AlertTriangle, Clock,
  RefreshCw, Copy, Check, Zap, Link2, Hash,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

type GatewayKind = "nowpayments" | "manual" | "none";

function detectGateway(txn: AdminTransaction): GatewayKind {
  if (txn.nowpaymentsPaymentId) return "nowpayments";
  if (txn.txHash) return "manual";
  return "none";
}

const GATEWAY_LABELS: Record<GatewayKind, { label: string; color: string; border: string; bg: string; icon: string }> = {
  nowpayments: { label: "NOWPayments", color: "#38BDF8", border: "rgba(56,189,248,0.25)", bg: "rgba(56,189,248,0.08)", icon: "⚡" },
  manual:      { label: "On-chain",    color: "#00DFA9", border: "rgba(0,223,169,0.25)",   bg: "rgba(0,223,169,0.08)",   icon: "#" },
  none:        { label: "Unknown",     color: "#64748B", border: "rgba(100,116,139,0.15)", bg: "rgba(100,116,139,0.06)", icon: "?" },
};

function GatewayBadge({ txn }: { txn: AdminTransaction }) {
  const kind = detectGateway(txn);
  const cfg = GATEWAY_LABELS[kind];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function CopyBtn({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={doCopy} className="shrink-0 text-[#475569] hover:text-[#94A3B8] transition-colors" title={`Copy ${label}`}>
      {copied ? <Check className="w-3 h-3 text-[#00DFA9]" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

const NPP_STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  waiting:        { bg: "rgba(250,204,21,0.08)",  text: "#FACC15", border: "rgba(250,204,21,0.20)",  label: "Waiting" },
  confirming:     { bg: "rgba(56,189,248,0.08)",  text: "#38BDF8", border: "rgba(56,189,248,0.20)",  label: "Confirming" },
  confirmed:      { bg: "rgba(0,223,169,0.08)",   text: "#00DFA9", border: "rgba(0,223,169,0.20)",   label: "Confirmed" },
  finished:       { bg: "rgba(0,223,169,0.08)",   text: "#00DFA9", border: "rgba(0,223,169,0.20)",   label: "Finished ✓" },
  failed:         { bg: "rgba(239,68,68,0.08)",   text: "#F87171", border: "rgba(239,68,68,0.20)",   label: "Failed" },
  refunded:       { bg: "rgba(239,68,68,0.08)",   text: "#F87171", border: "rgba(239,68,68,0.20)",   label: "Refunded" },
  expired:        { bg: "rgba(100,116,139,0.10)", text: "#94A3B8", border: "rgba(100,116,139,0.20)", label: "Expired" },
  partially_paid: { bg: "rgba(250,204,21,0.08)",  text: "#FACC15", border: "rgba(250,204,21,0.20)",  label: "Partial" },
};

function StatusPill({ status, colors }: { status: string; colors: Record<string, { bg: string; text: string; border: string; label: string }> }) {
  const cfg = colors[status] ?? { bg: "rgba(100,116,139,0.10)", text: "#94A3B8", border: "rgba(100,116,139,0.20)", label: status };
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function explorerUrl(hash: string, network: string | null) {
  const net = network ?? "TRC-20";
  if (net === "ERC-20")  return `https://etherscan.io/tx/${hash}`;
  if (net === "BSC")     return `https://bscscan.com/tx/${hash}`;
  if (net === "SOL")     return `https://solscan.io/tx/${hash}`;
  if (net === "BTC")     return `https://mempool.space/tx/${hash}`;
  if (net === "TON")     return `https://tonscan.org/tx/${hash}`;
  if (net === "XRP")     return `https://xrpscan.com/tx/${hash}`;
  return `https://tronscan.org/#/transaction/${hash}`;
}

function PaymentDetailsCell({ txn }: { txn: AdminTransaction }) {
  const [copiedHash, setCopiedHash] = useState(false);
  function copyHash() {
    if (!txn.txHash) return;
    navigator.clipboard.writeText(txn.txHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      {txn.txHash && (
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3 text-[#475569] shrink-0" />
          <span className="font-mono text-[11px] text-[#94A3B8]">
            {txn.txHash.slice(0, 10)}…{txn.txHash.slice(-6)}
          </span>
          <button onClick={copyHash} className="text-[#475569] hover:text-[#94A3B8] transition-colors" title="Copy tx hash">
            {copiedHash ? <Check className="w-3 h-3 text-[#00DFA9]" /> : <Copy className="w-3 h-3" />}
          </button>
          <a href={explorerUrl(txn.txHash, txn.network)} target="_blank" rel="noopener noreferrer"
            className="text-[#38BDF8] hover:text-[#7DD3FC] transition-colors" title="View on explorer">
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
      {txn.nowpaymentsPaymentId && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-[#38BDF8] shrink-0" />
            <span className="font-mono text-[11px] text-[#38BDF8]">
              {txn.nowpaymentsPaymentId.slice(0, 10)}…
            </span>
            <CopyBtn value={txn.nowpaymentsPaymentId} label="NOWPay ID" />
            <a href={`https://nowpayments.io/payment/?iid=${txn.nowpaymentsPaymentId}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[#38BDF8]/60 hover:text-[#38BDF8] transition-colors" title="Open in NOWPayments">
              <Link2 className="w-3 h-3" />
            </a>
          </div>
          {txn.nowpaymentsStatus && <StatusPill status={txn.nowpaymentsStatus} colors={NPP_STATUS_COLORS} />}
        </div>
      )}
      {!txn.txHash && !txn.nowpaymentsPaymentId && (
        <span className="text-[#334155] text-xs">—</span>
      )}
    </div>
  );
}

const NETWORK_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  "TRC-20": { color: "#00DFA9", border: "rgba(0,223,169,0.25)",   bg: "rgba(0,223,169,0.08)" },
  "ERC-20": { color: "#627EEA", border: "rgba(98,126,234,0.25)",  bg: "rgba(98,126,234,0.08)" },
  "BSC":    { color: "#FACC15", border: "rgba(250,204,21,0.25)",  bg: "rgba(250,204,21,0.08)" },
  "SOL":    { color: "#9945FF", border: "rgba(153,69,255,0.25)",  bg: "rgba(153,69,255,0.08)" },
  "BTC":    { color: "#F7931A", border: "rgba(247,147,26,0.25)",  bg: "rgba(247,147,26,0.08)" },
  "TON":    { color: "#38BDF8", border: "rgba(56,189,248,0.25)",  bg: "rgba(56,189,248,0.08)" },
  "XRP":    { color: "#346AA9", border: "rgba(52,106,169,0.25)",  bg: "rgba(52,106,169,0.08)" },
};

function NetworkBadge({ network }: { network: string | null }) {
  if (!network) return <span className="text-[#334155] text-xs">—</span>;
  const s = NETWORK_STYLES[network] ?? { color: "#94A3B8", border: "rgba(148,163,184,0.20)", bg: "rgba(148,163,184,0.08)" };
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap"
      style={{ color: s.color, borderColor: s.border, background: s.bg }}>
      {network}
    </span>
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] border font-semibold whitespace-nowrap", statusBg(status))}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

const selClass = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9] transition-colors w-full sm:w-auto";

export default function DepositsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [network, setNetwork] = useState("");
  const [gateway, setGateway] = useState("");

  const queryKey = ["admin-deposits", page, status, network, gateway];

  const { data, isLoading, refetch, isFetching } = useQuery<{ transactions: AdminTransaction[]; total: number }>({
    queryKey,
    queryFn: () => {
      let url = `/admin/transactions?page=${page}&limit=${PAGE_SIZE}&type=deposit`;
      if (status)  url += `&status=${status}`;
      if (network) url += `&network=${encodeURIComponent(network)}`;
      if (gateway) url += `&gateway=${gateway}`;
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
  const pendingCount = pendingTotals?.pendingDepositCount ?? 0;
  const pendingTotal = pendingTotals?.pendingDepositTotal ?? "0";
  const hasFilters = !!(status || network || gateway);

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center">
              <ArrowDownCircle className="w-4 h-4 text-[#00DFA9]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Deposits</h1>
          </div>
          <p className="text-sm text-[#475569] mt-1 ml-[42px]">{total.toLocaleString()} total deposits</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#94A3B8] hover:text-white hover:bg-white/8 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-[#00DFA9]/20 bg-[#00DFA9]/5 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#475569] uppercase tracking-wider leading-tight">Pending</span>
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00DFA9] shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#00DFA9]">{pendingCount}</p>
          <p className="text-[10px] text-[#475569] mt-0.5 hidden sm:block">awaiting approval</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#475569] uppercase tracking-wider leading-tight">Pending USDT</span>
            <ArrowDownCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#38BDF8] shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">${fmt(pendingTotal)}</p>
          <p className="text-[10px] text-[#475569] mt-0.5 hidden sm:block">to be credited</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#475569] uppercase tracking-wider leading-tight">Total</span>
            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#94A3B8] shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{total.toLocaleString()}</p>
          <p className="text-[10px] text-[#475569] mt-0.5 hidden sm:block">all-time</p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={selClass}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={gateway} onChange={e => { setGateway(e.target.value); setPage(1); }} className={selClass}>
          <option value="">All gateways</option>
          <option value="manual">On-chain / Manual</option>
          <option value="nowpayments">⚡ NOWPayments</option>
        </select>
        <select value={network} onChange={e => { setNetwork(e.target.value); setPage(1); }} className={selClass}>
          <option value="">All networks</option>
          <option value="TRC-20">TRC-20 (Tron)</option>
          <option value="ERC-20">ERC-20 (Ethereum)</option>
          <option value="BSC">BSC (BNB Chain)</option>
          <option value="SOL">Solana</option>
          <option value="BTC">Bitcoin</option>
          <option value="TON">TON</option>
          <option value="XRP">XRP</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setStatus(""); setNetwork(""); setGateway(""); setPage(1); }}
            className="px-3 py-2 rounded-lg text-sm text-[#475569] hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
            Clear filters
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
            <div className="p-10 text-center text-[#334155] text-sm">No deposits found</div>
          )}
          <div className="divide-y divide-white/6">
            {data?.transactions.map(txn => (
              <div key={txn.id} className={cn(
                "p-4 space-y-3",
                txn.status === "pending" && "bg-[#00DFA9]/[0.025]"
              )}>
                {/* Top row: user + amount */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white text-sm leading-tight">{txn.username ?? `uid:${txn.userId}`}</div>
                    <div className="text-[10px] text-[#334155] font-mono mt-0.5">#{txn.id} · {fmtDate(txn.createdAt)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-[#00DFA9] text-base">+${fmt(txn.amount)}</div>
                    <div className="text-[10px] text-[#475569]">USDT</div>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <GatewayBadge txn={txn} />
                  {txn.network && <NetworkBadge network={txn.network} />}
                  <StatusBadge status={txn.status} />
                </div>

                {/* Payment reference */}
                {(txn.txHash || txn.nowpaymentsPaymentId) && (
                  <div className="bg-white/3 rounded-lg p-2.5">
                    <div className="text-[10px] text-[#475569] mb-1.5 font-semibold uppercase tracking-wider">Payment Details</div>
                    <PaymentDetailsCell txn={txn} />
                  </div>
                )}

                {/* Verification */}
                <VerificationBadge verified={txn.verified} note={txn.verificationNote} />

                {/* Actions */}
                {txn.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => approveMut.mutate({ id: txn.id, txStatus: "completed" })}
                      disabled={approveMut.isPending}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 border border-[#00DFA9]/20 hover:border-[#00DFA9]/40 transition-all disabled:opacity-50"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => approveMut.mutate({ id: txn.id, txStatus: "rejected" })}
                      disabled={approveMut.isPending}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Desktop table (sm+) ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/6 bg-white/2">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">User</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Gateway</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Network</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Payment Details</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Verification</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-[#334155] text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00DFA9]" />
                    Loading deposits…
                  </td>
                </tr>
              )}
              {!isLoading && (!data?.transactions || data.transactions.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-[#334155] text-sm">
                    No deposits found
                  </td>
                </tr>
              )}
              {data?.transactions.map(txn => (
                <tr key={txn.id}
                  className={cn(
                    "border-b border-white/4 transition-colors hover:bg-white/[0.015]",
                    txn.status === "pending" && "bg-[#00DFA9]/[0.025]"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{txn.username ?? `uid:${txn.userId}`}</span>
                      <span className="text-[10px] text-[#334155] font-mono">#{txn.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold text-[#00DFA9] whitespace-nowrap">
                      +${fmt(txn.amount)}
                    </span>
                    <p className="text-[10px] text-[#475569]">USDT</p>
                  </td>
                  <td className="px-4 py-3">
                    <GatewayBadge txn={txn} />
                  </td>
                  <td className="px-4 py-3">
                    <NetworkBadge network={txn.network} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentDetailsCell txn={txn} />
                  </td>
                  <td className="px-4 py-3">
                    <VerificationBadge verified={txn.verified} note={txn.verificationNote} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={txn.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#475569] whitespace-nowrap">{fmtDate(txn.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {txn.status === "pending" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => approveMut.mutate({ id: txn.id, txStatus: "completed" })}
                          disabled={approveMut.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 border border-[#00DFA9]/20 hover:border-[#00DFA9]/40 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => approveMut.mutate({ id: txn.id, txStatus: "rejected" })}
                          disabled={approveMut.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50 whitespace-nowrap"
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
