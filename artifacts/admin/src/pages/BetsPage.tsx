import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminBet } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-white/5 rounded animate-pulse" style={{ width: `${55 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function BetsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery<{ bets: AdminBet[]; total: number }>({
    queryKey: ["admin-bets", page, status, q],
    queryFn: () => api.get(
      `/admin/bets?page=${page}&limit=${PAGE_SIZE}${status ? `&status=${status}` : ""}${q ? `&search=${encodeURIComponent(q)}` : ""}`
    ),
  });

  const settleMut = useMutation({
    mutationFn: ({ id, betStatus }: { id: number; betStatus: string }) =>
      api.patch(`/admin/bets/${id}`, { status: betStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bets"] }); toast.success("Bet updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const openBets = data?.bets.filter(b => b.status === "open") ?? [];
  const openLiability = openBets.reduce((sum, b) => sum + parseFloat(b.potentialReturn), 0);

  const sel = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9] transition-colors";

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(search);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bets</h1>
          <p className="text-sm text-[#475569] mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <form onSubmit={doSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Username…"
                className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] w-44 transition-colors" />
            </div>
            <button type="submit" className="px-3 py-2 bg-white/8 border border-white/10 text-[#94A3B8] rounded-lg text-sm hover:bg-white/12 transition-colors">Search</button>
          </form>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={sel}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="void">Void</option>
            <option value="settled">Settled</option>
          </select>
        </div>
      </div>

      {openBets.length > 0 && (
        <div className="flex items-center gap-3 bg-[#FACC15]/6 border border-[#FACC15]/15 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#FACC15] shrink-0" />
          <span className="text-sm text-[#FACC15]">
            <span className="font-semibold">{openBets.length} open bets</span> on this page ·
            potential liability: <span className="font-mono font-semibold">${fmt(String(openLiability))} USDT</span>
          </span>
        </div>
      )}

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#475569] text-[11px] uppercase tracking-wider bg-white/2">
                <th className="text-left px-4 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Stake</th>
                <th className="text-left px-4 py-3 font-medium">Odds</th>
                <th className="text-left px-4 py-3 font-medium">Potential</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Placed</th>
                <th className="text-left px-4 py-3 font-medium">Settle</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
              ) : data?.bets.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-[#334155]">No bets found</td></tr>
              ) : data?.bets.map(b => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3.5 text-[#475569] font-mono text-xs">#{b.id}</td>
                  <td className="px-4 py-3.5 text-white text-sm font-medium">{b.username ?? `uid:${b.userId}`}</td>
                  <td className="px-4 py-3.5 text-[#64748B] capitalize text-xs">{b.type}</td>
                  <td className="px-4 py-3.5 text-[#FACC15] font-mono text-xs font-semibold">${fmt(b.stake)}</td>
                  <td className="px-4 py-3.5 text-white font-mono text-xs">{fmt(b.totalOdds, 3)}×</td>
                  <td className="px-4 py-3.5 text-[#00DFA9] font-mono text-xs font-semibold">${fmt(b.potentialReturn)}</td>
                  <td className="px-4 py-3.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium", statusBg(b.status))}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#475569] text-xs whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    {b.status === "open" && (
                      <div className="flex gap-1">
                        <button onClick={() => settleMut.mutate({ id: b.id, betStatus: "won" })}
                          className="px-2 py-1 rounded text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors font-medium">
                          Won
                        </button>
                        <button onClick={() => settleMut.mutate({ id: b.id, betStatus: "lost" })}
                          className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium">
                          Lost
                        </button>
                        <button onClick={() => settleMut.mutate({ id: b.id, betStatus: "void" })}
                          className="px-2 py-1 rounded text-xs bg-white/5 text-[#64748B] hover:bg-white/10 transition-colors">
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 text-[#475569]">
          <span className="text-xs">Page {page} of {pages} · {total.toLocaleString()} bets total</span>
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
