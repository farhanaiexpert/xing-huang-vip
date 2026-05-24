import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminPool } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function PoolsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", sport: "football", prizePool: "", entryFee: "", deadline: "",
  });

  const { data, isLoading } = useQuery<{ pools: AdminPool[]; total: number }>({
    queryKey: ["admin-pools", page],
    queryFn: () => api.get(`/admin/pools?page=${page}&limit=${PAGE_SIZE}`),
  });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api.post("/admin/pools", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pools"] });
      toast.success("Pool created");
      setShowForm(false);
      setForm({ title: "", sport: "football", prizePool: "", entryFee: "", deadline: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settleMut = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/pools/${id}`, { status: "settled" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pools"] }); toast.success("Pool settled"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/pools/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pools"] }); toast.success("Pool deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00DFA9] transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prediction Pools</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total.toLocaleString()} total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 transition-colors">
          <Plus className="w-4 h-4" /> New Pool
        </button>
      </div>

      {showForm && (
        <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Create Pool</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-[#94A3B8] mb-1">Title</label>
              <input className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Champions League Predict" />
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Sport</label>
              <select className={inp} value={form.sport} onChange={e => setForm(f => ({ ...f, sport: e.target.value }))}>
                <option value="football">Football</option>
                <option value="basketball">Basketball</option>
                <option value="tennis">Tennis</option>
                <option value="cricket">Cricket</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Prize Pool (USDT)</label>
              <input className={inp} type="number" step="0.01" value={form.prizePool} onChange={e => setForm(f => ({ ...f, prizePool: e.target.value }))} placeholder="1000.00" />
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Entry Fee (USDT)</label>
              <input className={inp} type="number" step="0.01" value={form.entryFee} onChange={e => setForm(f => ({ ...f, entryFee: e.target.value }))} placeholder="10.00" />
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Deadline</label>
              <input className={inp} type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-white/5 text-[#94A3B8] rounded-lg text-sm hover:bg-white/10 transition-colors">Cancel</button>
            <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}
              className="px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 transition-colors disabled:opacity-50">
              {createMut.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#94A3B8] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Pool</th>
                <th className="text-left px-4 py-3">Sport</th>
                <th className="text-left px-4 py-3">Prize</th>
                <th className="text-left px-4 py-3">Fee</th>
                <th className="text-left px-4 py-3">Entries</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Deadline</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#94A3B8]">Loading…</td></tr>
              ) : data?.pools.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#94A3B8]">No pools</td></tr>
              ) : data?.pools.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-[#94A3B8] capitalize">{p.sport}</td>
                  <td className="px-4 py-3 text-[#FACC15] font-mono text-xs">${fmt(p.prizePool)}</td>
                  <td className="px-4 py-3 text-[#94A3B8] font-mono text-xs">${fmt(p.entryFee)}</td>
                  <td className="px-4 py-3 text-[#38BDF8]">{p.entryCount}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs border", statusBg(p.status))}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">{fmtDate(p.deadline)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {p.status === "open" && (
                        <button onClick={() => settleMut.mutate(p.id)}
                          className="px-2 py-1 rounded text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors">
                          Settle
                        </button>
                      )}
                      <button onClick={() => { if (confirm("Delete this pool?")) deleteMut.mutate(p.id); }}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
