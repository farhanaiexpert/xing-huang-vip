import { useState } from "react";
import { toast } from "sonner";
import {
  useAdminGetWithdrawals,
  useAdminReviewWithdrawal,
  getAdminGetWithdrawalsQueryKey,
} from "@workspace/api-client-react";
import type { WithdrawalRequestItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type WStatus = "pending" | "approved" | "rejected" | "processed";

const STATUS_FILTERS: { key: "all" | WStatus; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "approved",  label: "Approved"  },
  { key: "rejected",  label: "Rejected"  },
  { key: "processed", label: "Processed" },
];

function StatusBadge({ status }: { status: WStatus }) {
  const cfg = {
    pending:   { label: "Pending",   cls: "text-amber-400  bg-amber-400/10  border-amber-400/20"  },
    approved:  { label: "Approved",  cls: "text-sky-400    bg-sky-400/10    border-sky-400/20"    },
    rejected:  { label: "Rejected",  cls: "text-red-400    bg-red-400/10    border-red-400/20"    },
    processed: { label: "Processed", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  }[status] ?? { label: status, cls: "text-gray-400 bg-gray-400/10 border-gray-400/20" };

  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function shortenAddr(addr: string) {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

function formatDate(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TableSkeleton() {
  return (
    <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {["ID", "User", "Amount", "Wallet", "Status", "Submitted", "Actions"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-0">
              {Array.from({ length: 7 }).map((__, j) => (
                <td key={j} className="px-4 py-3">
                  <div className="h-3.5 rounded bg-white/5 animate-pulse" style={{ width: `${40 + (j * 25) % 100}px` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewModal({
  withdrawal,
  action,
  onClose,
  onConfirm,
  isPending,
}: {
  withdrawal: WithdrawalRequestItem;
  action: "approve" | "reject" | "process";
  onClose: () => void;
  onConfirm: (note: string) => void;
  isPending: boolean;
}) {
  const [note, setNote] = useState("");

  const cfg = {
    approve: { title: "Approve Withdrawal",  color: "bg-sky-500",     desc: "This will deduct the amount from the user's balance and mark the withdrawal as approved." },
    reject:  { title: "Reject Withdrawal",   color: "bg-red-500",     desc: "The withdrawal will be rejected. If it was previously approved, the balance will be refunded." },
    process: { title: "Mark as Processed",   color: "bg-emerald-500", desc: "Mark this withdrawal as fully processed (crypto has been sent)." },
  }[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#0D1117] border border-white/[0.08] rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-white mb-1">{cfg.title}</h3>
        <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">{cfg.desc}</p>

        <div className="bg-[#111827] rounded-xl p-3 mb-4 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-[#4A5568]">Amount</span>
            <span className="font-bold text-white">${parseFloat(withdrawal.amount).toFixed(2)} {withdrawal.currency}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#4A5568]">Wallet</span>
            <span className="font-mono text-[#8A9BB3]">{shortenAddr(withdrawal.walletAddress)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#4A5568]">User</span>
            <span className="font-mono text-[#8A9BB3]">{withdrawal.userId.slice(0, 8)}…</span>
          </div>
        </div>

        <label className="block text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1.5">
          Note <span className="font-normal normal-case text-[#4A5568]">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Add a note for the user or internal record…"
          className="w-full bg-[#111827] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#4A5568] focus:outline-none focus:border-white/20 resize-none mb-4"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-white/[0.08] text-sm text-[#6B7280] hover:text-white hover:border-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={isPending}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 ${cfg.color} hover:opacity-90`}
          >
            {isPending ? "Processing…" : cfg.title}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Withdrawals() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminGetWithdrawals();
  const reviewMutation = useAdminReviewWithdrawal();

  const [statusFilter, setStatusFilter] = useState<"all" | WStatus>("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ withdrawal: WithdrawalRequestItem; action: "approve" | "reject" | "process" } | null>(null);

  const all = (data?.withdrawals ?? []) as WithdrawalRequestItem[];

  const filtered = all.filter(w => {
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.id.toLowerCase().includes(q) ||
      w.userId.toLowerCase().includes(q) ||
      w.walletAddress.toLowerCase().includes(q)
    );
  });

  const pendingCount = all.filter(w => w.status === "pending").length;
  const totalPending = all.filter(w => w.status === "pending").reduce((s, w) => s + parseFloat(w.amount), 0);

  function handleConfirm(note: string) {
    if (!modal) return;
    reviewMutation.mutate(
      { id: modal.withdrawal.id, data: { action: modal.action, note: note || undefined } },
      {
        onSuccess: () => {
          toast.success(`Withdrawal ${modal.action === "approve" ? "approved" : modal.action === "reject" ? "rejected" : "marked as processed"}`);
          queryClient.invalidateQueries({ queryKey: getAdminGetWithdrawalsQueryKey() });
          setModal(null);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message ?? "Action failed");
        },
      }
    );
  }

  return (
    <div className="space-y-5 animate-float-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[17px] font-bold text-white tracking-tight">Withdrawals</h1>
          <p className="text-[11.5px] mt-0.5 text-[#4A5568]">
            {all.length} total · {pendingCount} pending
            {pendingCount > 0 && ` · $${totalPending.toFixed(2)} USDT awaiting review`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs bg-[#0D1117] border border-white/[0.08] text-foreground rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            {STATUS_FILTERS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Search ID, user, wallet…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#0D1117] border border-white/[0.08] text-sm text-foreground placeholder:text-[#4A5568] focus:outline-none focus:border-primary/50 w-52 transition-colors"
          />
        </div>
      </div>

      {/* Stats row */}
      {all.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pending",   value: all.filter(w => w.status === "pending").length,   color: "text-amber-400" },
            { label: "Approved",  value: all.filter(w => w.status === "approved").length,  color: "text-sky-400" },
            { label: "Processed", value: all.filter(w => w.status === "processed").length, color: "text-emerald-400" },
            { label: "Rejected",  value: all.filter(w => w.status === "rejected").length,  color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-[#0D1117] border border-white/[0.06] px-4 py-3">
              <p className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-[#4A5568] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? <TableSkeleton /> : error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
          Failed to load withdrawal requests
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center py-20 text-[#4A5568] gap-3">
          <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 64 64">
            <path d="M16 32h32M32 16l16 16-16 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-medium">
            {search || statusFilter !== "all" ? "No withdrawals match your filters" : "No withdrawal requests yet"}
          </p>
        </div>
      ) : (
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["ID", "User", "Amount", "Wallet", "Status", "Submitted", "Note", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-[#4A5568] whitespace-nowrap">{w.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#4A5568] whitespace-nowrap">{w.userId.slice(0, 8)}…</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-bold text-white">${parseFloat(w.amount).toFixed(2)}</span>
                      <span className="text-[10px] text-[#4A5568] ml-1">{w.currency}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#8A9BB3] whitespace-nowrap">{shortenAddr(w.walletAddress)}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={w.status as WStatus} /></td>
                    <td className="px-4 py-3 text-[11px] text-[#4A5568] whitespace-nowrap">{formatDate(w.createdAt)}</td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="text-[11px] text-[#6B7280] truncate block italic">{w.note ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {w.status === "pending" && (
                          <>
                            <button
                              onClick={() => setModal({ withdrawal: w, action: "approve" })}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setModal({ withdrawal: w, action: "reject" })}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {w.status === "approved" && (
                          <>
                            <button
                              onClick={() => setModal({ withdrawal: w, action: "process" })}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors"
                            >
                              Mark Processed
                            </button>
                            <button
                              onClick={() => setModal({ withdrawal: w, action: "reject" })}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(w.status === "rejected" || w.status === "processed") && (
                          <span className="text-[11px] text-[#4A5568]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ReviewModal
          withdrawal={modal.withdrawal}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleConfirm}
          isPending={reviewMutation.isPending}
        />
      )}
    </div>
  );
}
