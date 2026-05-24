import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminBet } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function BetsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery<{ bets: AdminBet[]; total: number }>({
    queryKey: ["admin-bets", page, status],
    queryFn: () => api.get(`/admin/bets?page=${page}&limit=${PAGE_SIZE}${status ? `&status=${status}` : ""}`),
  });

  const settleMut = useMutation({
    mutationFn: ({ id, betStatus }: { id: number; betStatus: string }) =>
      api.patch(`/admin/bets/${id}`, { status: betStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bets"] }); toast.success("Bet updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bets</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total.toLocaleString()} total</p>
        </div>
        <select
          value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9]"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="void">Void</option>
          <option value="settled">Settled</option>
        </select>
      </div>

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#94A3B8] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Stake</th>
                <th className="text-left px-4 py-3">Odds</th>
                <th className="text-left px-4 py-3">Potential</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Placed</th>
                <th className="text-left px-4 py-3">Settle</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="text-center py-12 text-[#94A3B8]">Loading…</td></tr>
              ) : data?.bets.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-[#94A3B8]">No bets</td></tr>
              ) : data?.bets.map(b => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-[#94A3B8] font-mono text-xs">#{b.id}</td>
                  <td className="px-4 py-3 text-white">{b.username ?? `uid:${b.userId}`}</td>
                  <td className="px-4 py-3 text-[#94A3B8] capitalize">{b.type}</td>
                  <td className="px-4 py-3 text-[#FACC15] font-mono text-xs">${fmt(b.stake)}</td>
                  <td className="px-4 py-3 text-white font-mono text-xs">{fmt(b.totalOdds, 3)}x</td>
                  <td className="px-4 py-3 text-[#00DFA9] font-mono text-xs">${fmt(b.potentialReturn)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs border", statusBg(b.status))}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">{fmtDate(b.createdAt)}</td>
                  <td className="px-4 py-3">
                    {b.status === "open" && (
                      <div className="flex gap-1">
                        <button onClick={() => settleMut.mutate({ id: b.id, betStatus: "won" })}
                          className="px-2 py-1 rounded text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors">
                          Won
                        </button>
                        <button onClick={() => settleMut.mutate({ id: b.id, betStatus: "lost" })}
                          className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                          Lost
                        </button>
                        <button onClick={() => settleMut.mutate({ id: b.id, betStatus: "void" })}
                          className="px-2 py-1 rounded text-xs bg-white/5 text-[#94A3B8] hover:bg-white/10 transition-colors">
                          Void
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
