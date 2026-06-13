import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api, AdminTransaction, PendingTotals } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, ArrowUpCircle,
  Clock, RefreshCw, Copy, Check, Send,
  CheckCircle2, AlertTriangle, Wallet, Gift,
  ExternalLink, Hash, UserCircle, X, CheckCheck,
  XCircle, Link2,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

// ─── Balance breakdown ────────────────────────────────────────────────────────

function BalanceBreakdown({ txn }: { txn: AdminTransaction }) {
  const real  = parseFloat(txn.userBalance  ?? "0");
  const bonus = parseFloat(txn.userBonusBalance ?? "0");
  const withdrawAmount = parseFloat(txn.amount);
  const hasBonusFunds = bonus > 0;
  const insufficientReal = real < withdrawAmount;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Wallet className="w-3 h-3 text-[#00DFA9] shrink-0" />
        <span className="text-[10px] font-semibold text-[#64748B]">Real:</span>
        <span className={cn("font-mono text-[11px] font-bold", insufficientReal ? "text-red-400" : "text-[#00DFA9]")}>
          ${real.toFixed(2)}
        </span>
      </div>
      {hasBonusFunds && (
        <div className="flex items-center gap-1.5">
          <Gift className="w-3 h-3 text-[#FACC15] shrink-0" />
          <span className="text-[10px] font-semibold text-[#64748B]">Bonus:</span>
          <span className="font-mono text-[11px] font-bold text-[#FACC15]">${bonus.toFixed(2)}</span>
        </div>
      )}
      {hasBonusFunds && (
        <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 border border-amber-500/20 bg-amber-500/6 w-fit">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
          <span className="text-[9px] font-semibold text-amber-400">Bonus not withdrawable</span>
        </div>
      )}
      {insufficientReal && (
        <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5 border border-red-500/20 bg-red-500/6 w-fit">
          <AlertTriangle className="w-2.5 h-2.5 text-red-400 shrink-0" />
          <span className="text-[9px] font-semibold text-red-400">Real balance may be insufficient</span>
        </div>
      )}
    </div>
  );
}

// ─── Wallet address ───────────────────────────────────────────────────────────

function WalletAddressCell({ address, network }: { address: string | null; network: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!address) return <span className="text-[#334155] text-xs">—</span>;
  const isErc = network === "ERC-20";
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-start gap-2">
        <span className={cn("font-mono text-xs break-all leading-relaxed", isErc ? "text-[#A78BFA]" : "text-[#34D399]")}>
          {address}
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
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
      {copied && <span className="text-[10px] text-[#00DFA9] font-semibold">✓ Copied</span>}
    </div>
  );
}

// ─── Network badge ────────────────────────────────────────────────────────────

const NETWORK_STYLES: Record<string, { color: string; border: string; bg: string }> = {
  "TRC-20": { color: "#00DFA9", border: "rgba(0,223,169,0.25)",   bg: "rgba(0,223,169,0.08)" },
  "ERC-20": { color: "#627EEA", border: "rgba(98,126,234,0.25)",  bg: "rgba(98,126,234,0.08)" },
  "BSC":    { color: "#FACC15", border: "rgba(250,204,21,0.25)",  bg: "rgba(250,204,21,0.08)" },
  "SOL":    { color: "#9945FF", border: "rgba(153,69,255,0.25)",  bg: "rgba(153,69,255,0.08)" },
  "BTC":    { color: "#F7931A", border: "rgba(247,147,26,0.25)",  bg: "rgba(247,147,26,0.08)" },
  "TON":    { color: "#38BDF8", border: "rgba(56,189,248,0.25)",  bg: "rgba(56,189,248,0.08)" },
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] border font-semibold whitespace-nowrap", statusBg(status))}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Notes / TX display ───────────────────────────────────────────────────────

function explorerUrl(hash: string, network: string | null) {
  const net = network ?? "TRC-20";
  if (net === "ERC-20") return `https://etherscan.io/tx/${hash}`;
  if (net === "BSC")    return `https://bscscan.com/tx/${hash}`;
  if (net === "SOL")    return `https://solscan.io/tx/${hash}`;
  if (net === "BTC")    return `https://mempool.space/tx/${hash}`;
  if (net === "TON")    return `https://tonscan.org/tx/${hash}`;
  return `https://tronscan.org/#/transaction/${hash}`;
}

function NotesCell({ notes, network }: { notes: string | null; network: string | null }) {
  if (!notes) return <span className="text-[#334155] text-xs">—</span>;
  const looksLikeHash = /^(0x)?[0-9a-fA-F]{40,}$|^[0-9a-fA-F]{64}$|^[A-Za-z0-9+/=_-]{43,90}$/.test(notes.trim());
  const hash = notes.trim();
  return (
    <div className="flex items-center gap-1.5 max-w-[160px]">
      {looksLikeHash ? (
        <>
          <Hash className="w-3 h-3 text-[#475569] shrink-0" />
          <span className="font-mono text-[11px] text-[#94A3B8] truncate">
            {hash.slice(0, 8)}…{hash.slice(-6)}
          </span>
          <a href={explorerUrl(hash, network)} target="_blank" rel="noopener noreferrer"
            className="text-[#38BDF8] hover:text-[#7DD3FC] shrink-0" title="View on explorer">
            <ExternalLink className="w-3 h-3" />
          </a>
        </>
      ) : (
        <span className="text-[11px] text-[#475569] truncate" title={notes}>{notes}</span>
      )}
    </div>
  );
}

// ─── Inline action panel ──────────────────────────────────────────────────────

type ActionMode = "approve" | "reject" | null;

interface ActionState {
  mode: ActionMode;
  txHash: string;
  reason: string;
}

interface ActionPanelProps {
  txn: AdminTransaction;
  state: ActionState;
  onUpdate: (patch: Partial<ActionState>) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

function ActionPanel({ txn, state, onUpdate, onCancel, onConfirm, isPending }: ActionPanelProps) {
  const isApprove = state.mode === "approve";

  return (
    <div className={cn(
      "mt-2 rounded-xl border p-3 space-y-2.5",
      isApprove ? "bg-[#00DFA9]/5 border-[#00DFA9]/20" : "bg-red-500/5 border-red-500/20"
    )}>
      <p className={cn("text-xs font-semibold", isApprove ? "text-[#00DFA9]" : "text-red-400")}>
        {isApprove ? "Confirm Approval" : "Confirm Rejection"}
      </p>

      {isApprove && (
        <div className="space-y-1.5">
          <label className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wide flex items-center gap-1.5">
            <Hash className="w-3 h-3" /> Outgoing TX Hash
            <span className="text-[#334155] font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              value={state.txHash}
              onChange={e => onUpdate({ txHash: e.target.value })}
              placeholder="Paste the outgoing transaction hash…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00DFA9]/50 transition-colors pr-8"
              autoFocus
            />
            {state.txHash && (
              <button onClick={() => onUpdate({ txHash: "" })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#475569] hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {state.txHash && (
            <a href={explorerUrl(state.txHash, txn.network)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-[#38BDF8] hover:underline">
              <Link2 className="w-3 h-3" /> Preview on explorer
            </a>
          )}
        </div>
      )}

      {!isApprove && (
        <div className="space-y-1.5">
          <label className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wide">
            Rejection reason
            <span className="text-[#334155] font-normal normal-case tracking-normal ml-1">(optional)</span>
          </label>
          <input
            value={state.reason}
            onChange={e => onUpdate({ reason: e.target.value })}
            placeholder="e.g. Suspicious activity, wrong network…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#334155] focus:outline-none focus:border-red-500/50 transition-colors"
            autoFocus
          />
        </div>
      )}

      <div className="flex gap-2 pt-0.5">
        <button onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white/5 text-[#475569] hover:bg-white/10 hover:text-white border border-white/10 transition-all">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isPending}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50",
            isApprove
              ? "bg-[#00DFA9]/15 text-[#00DFA9] hover:bg-[#00DFA9]/25 border border-[#00DFA9]/30"
              : "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30"
          )}
        >
          {isPending ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : isApprove ? (
            <><CheckCheck className="w-3.5 h-3.5" /> Approve & Close</>
          ) : (
            <><XCircle className="w-3.5 h-3.5" /> Reject</>
          )}
        </button>
      </div>
    </div>
  );
}

const selClass = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#38BDF8] transition-colors w-full sm:w-auto";

export default function WithdrawalsPage() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [network, setNetwork] = useState("");
  const [actionStates, setActionStates] = useState<Record<number, ActionState>>({});

  const queryKey = ["admin-withdrawals", page, status, network];

  const { data, isLoading, refetch, isFetching } = useQuery<{ transactions: AdminTransaction[]; total: number }>({
    queryKey,
    queryFn: () => {
      let url = `/admin/transactions?page=${page}&limit=${PAGE_SIZE}&type=withdrawal`;
      if (status)  url += `&status=${status}`;
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
    mutationFn: ({ id, txStatus, notes }: { id: number; txStatus: string; notes?: string }) =>
      api.patch(`/admin/transactions/${id}`, { status: txStatus, ...(notes ? { notes } : {}) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-txns-pending-totals"] });
      setActionStates(prev => { const n = { ...prev }; delete n[vars.id]; return n; });
      if (vars.txStatus === "completed") {
        toast.success("✅ Withdrawal approved — mark as sent after transferring funds");
      } else {
        toast.error("❌ Withdrawal rejected");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAction(id: number, mode: "approve" | "reject") {
    setActionStates(prev => ({ ...prev, [id]: { mode, txHash: "", reason: "" } }));
  }

  function updateAction(id: number, patch: Partial<ActionState>) {
    setActionStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function cancelAction(id: number) {
    setActionStates(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function confirmAction(txn: AdminTransaction) {
    const state = actionStates[txn.id];
    if (!state) return;
    const notes = state.mode === "approve"
      ? (state.txHash.trim() || undefined)
      : (state.reason.trim() || undefined);
    approveMut.mutate({ id: txn.id, txStatus: state.mode === "approve" ? "completed" : "rejected", notes });
  }

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pendingCount = pendingTotals?.pendingWithdrawalCount ?? 0;
  const pendingTotal = pendingTotals?.pendingWithdrawalTotal ?? "0";
  const hasFilters = !!(status || network);

  const pendingWithBonus = (data?.transactions ?? [])
    .filter(t => t.status === "pending" && parseFloat(t.userBonusBalance ?? "0") > 0).length;

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F87171]/10 border border-[#F87171]/20 flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4 text-[#F87171]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Withdrawals</h1>
          </div>
          <p className="text-sm text-[#475569] mt-1 ml-[42px]">{total.toLocaleString()} total requests</p>
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

      {/* ── Workflow banner ── */}
      <div className="flex items-start gap-3 rounded-xl border border-[#38BDF8]/15 bg-[#38BDF8]/5 px-4 py-3">
        <Send className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#38BDF8]">Manual Processing Workflow</p>
          <p className="text-xs text-[#475569] mt-0.5">
            Copy the user's wallet address → send USDT manually → click <strong className="text-white">Approve</strong> to credit and close the request.
            Optionally paste the outgoing TX hash when approving to keep a record. <strong className="text-white">Bonus balance is non-withdrawable</strong> — real balance only is eligible.
          </p>
        </div>
      </div>

      {/* ── Bonus warning ── */}
      {pendingWithBonus > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/6 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            <strong>{pendingWithBonus}</strong> pending request{pendingWithBonus > 1 ? "s have" : " has"} bonus balance — verify the <strong>real balance</strong> covers the withdrawal before approving.
          </p>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-[#F87171]/20 bg-[#F87171]/5 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#475569] uppercase tracking-wider leading-tight">Pending</span>
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F87171] shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#F87171]">{pendingCount}</p>
          <p className="text-[10px] text-[#475569] mt-0.5 hidden sm:block">awaiting transfer</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/3 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#475569] uppercase tracking-wider leading-tight">Pending USDT</span>
            <ArrowUpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FACC15] shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">${fmt(pendingTotal)}</p>
          <p className="text-[10px] text-[#475569] mt-0.5 hidden sm:block">to be sent out</p>
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
        <select value={network} onChange={e => { setNetwork(e.target.value); setPage(1); }} className={selClass}>
          <option value="">All networks</option>
          <option value="TRC-20">TRC-20 (Tron)</option>
          <option value="ERC-20">ERC-20 (Ethereum)</option>
          <option value="BSC">BSC (BNB Chain)</option>
          <option value="SOL">Solana</option>
          <option value="BTC">Bitcoin</option>
          <option value="TON">TON</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setStatus(""); setNetwork(""); setPage(1); }}
            className="px-3 py-2 rounded-lg text-sm text-[#475569] hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {/* ── Data container ── */}
      <div className="rounded-xl border border-white/8 bg-[#0E1520] overflow-hidden">

        {/* ── Mobile cards ── */}
        <div className="sm:hidden">
          {isLoading && (
            <div className="p-10 text-center text-[#334155] text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#F87171]" />
              Loading…
            </div>
          )}
          {!isLoading && (!data?.transactions || data.transactions.length === 0) && (
            <div className="p-10 text-center text-[#334155] text-sm">No withdrawal requests found</div>
          )}
          <div className="divide-y divide-white/6">
            {data?.transactions.map(txn => {
              const bonus = parseFloat(txn.userBonusBalance ?? "0");
              const hasBonusFunds = bonus > 0;
              const aState = actionStates[txn.id] ?? null;
              return (
                <div key={txn.id} className={cn(
                  "p-4 space-y-3",
                  txn.status === "pending"
                    ? hasBonusFunds ? "bg-amber-500/[0.03]" : "bg-[#F87171]/[0.02]"
                    : ""
                )}>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <div>
                        <div className="font-semibold text-white text-sm leading-tight">{txn.username ?? `uid:${txn.userId}`}</div>
                        <div className="text-[10px] text-[#334155] font-mono mt-0.5">#{txn.id} · {fmtDate(txn.createdAt)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* View User Profile */}
                      <button
                        onClick={() => navigate(`/users/${txn.userId}`)}
                        title="View user profile"
                        className="p-1.5 rounded-lg bg-[#38BDF8]/8 border border-[#38BDF8]/20 text-[#38BDF8] hover:bg-[#38BDF8]/15 transition-colors"
                      >
                        <UserCircle className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-right">
                        <div className="font-mono font-bold text-[#F87171] text-base">−${fmt(txn.amount)}</div>
                        <div className="text-[10px] text-[#475569]">USDT</div>
                      </div>
                    </div>
                  </div>

                  {/* Network + Status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <NetworkBadge network={txn.network} />
                    <StatusBadge status={txn.status} />
                  </div>

                  {/* Wallet address */}
                  <div className="bg-white/3 rounded-lg p-2.5">
                    <div className="text-[10px] text-[#475569] mb-1 font-semibold uppercase tracking-wider">Wallet Address</div>
                    <WalletAddressCell address={txn.walletAddress} network={txn.network} />
                  </div>

                  {/* Balance breakdown */}
                  <BalanceBreakdown txn={txn} />

                  {/* Notes / TX hash for completed rows */}
                  {txn.notes && txn.status !== "pending" && (
                    <div className="flex items-start gap-2 bg-white/3 rounded-lg px-2.5 py-2">
                      <Hash className="w-3 h-3 text-[#475569] mt-0.5 shrink-0" />
                      <NotesCell notes={txn.notes} network={txn.network} />
                    </div>
                  )}

                  {/* Actions */}
                  {txn.status === "pending" && (
                    aState ? (
                      <ActionPanel
                        txn={txn}
                        state={aState}
                        onUpdate={patch => updateAction(txn.id, patch)}
                        onCancel={() => cancelAction(txn.id)}
                        onConfirm={() => confirmAction(txn)}
                        isPending={approveMut.isPending}
                      />
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => openAction(txn.id, "approve")}
                          className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 border border-[#00DFA9]/20 hover:border-[#00DFA9]/40 transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => openAction(txn.id, "reject")}
                          className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Desktop table ── */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/6 bg-white/2">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">User</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Amount</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">User Balance</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Network</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider w-[260px]">Wallet Address</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Requested</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Notes / TX</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#334155] uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-[#334155] text-sm">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#F87171]" />
                    Loading withdrawals…
                  </td>
                </tr>
              )}
              {!isLoading && (!data?.transactions || data.transactions.length === 0) && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-[#334155] text-sm">
                    No withdrawal requests found
                  </td>
                </tr>
              )}
              {data?.transactions.map(txn => {
                const bonus = parseFloat(txn.userBonusBalance ?? "0");
                const hasBonusFunds = bonus > 0;
                const aState = actionStates[txn.id] ?? null;
                return (
                  <tr key={txn.id}
                    className={cn(
                      "border-b border-white/4 transition-colors align-top",
                      txn.status === "pending"
                        ? hasBonusFunds
                          ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]"
                          : "bg-[#F87171]/[0.02] hover:bg-[#F87171]/[0.04]"
                        : "hover:bg-white/[0.015]"
                    )}
                  >
                    {/* User + view profile */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/users/${txn.userId}`)}
                          title="View user profile"
                          className="p-1 rounded-md bg-[#38BDF8]/8 border border-[#38BDF8]/15 text-[#38BDF8] hover:bg-[#38BDF8]/18 hover:border-[#38BDF8]/30 transition-colors shrink-0"
                        >
                          <UserCircle className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-white truncate max-w-[120px]">{txn.username ?? `uid:${txn.userId}`}</span>
                          <span className="text-[10px] text-[#334155] font-mono">#{txn.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-mono text-sm font-bold text-[#F87171] whitespace-nowrap">
                        −${fmt(txn.amount)} USDT
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <BalanceBreakdown txn={txn} />
                    </td>

                    <td className="px-4 py-4">
                      <NetworkBadge network={txn.network} />
                    </td>

                    <td className="px-4 py-4 max-w-[260px]">
                      <WalletAddressCell address={txn.walletAddress} network={txn.network} />
                    </td>

                    <td className="px-4 py-4">
                      <StatusBadge status={txn.status} />
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-xs text-[#475569] whitespace-nowrap">{fmtDate(txn.createdAt)}</span>
                    </td>

                    {/* Notes / TX hash */}
                    <td className="px-4 py-4">
                      <NotesCell notes={txn.notes} network={txn.network} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 min-w-[200px]">
                      {txn.status === "pending" ? (
                        aState ? (
                          <ActionPanel
                            txn={txn}
                            state={aState}
                            onUpdate={patch => updateAction(txn.id, patch)}
                            onCancel={() => cancelAction(txn.id)}
                            onConfirm={() => confirmAction(txn)}
                            isPending={approveMut.isPending}
                          />
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => openAction(txn.id, "approve")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 border border-[#00DFA9]/20 hover:border-[#00DFA9]/40 transition-all flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <CheckCheck className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => openAction(txn.id, "reject")}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )
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
