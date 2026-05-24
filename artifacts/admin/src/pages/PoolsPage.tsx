import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminPool } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { Plus, Trash2, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

function toIso(localDatetime: string): string {
  return new Date(localDatetime).toISOString();
}

export default function PoolsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [settlingPool, setSettlingPool] = useState<AdminPool | null>(null);
  const [outcome, setOutcome] = useState("");
  const [form, setForm] = useState({
    title: "", sport: "football", prizePool: "", entryFee: "", deadline: "",
  });

  const { data: pools = [], isLoading } = useQuery<AdminPool[]>({
    queryKey: ["admin-pools"],
    queryFn: () => api.get<AdminPool[]>("/admin/pools"),
  });

  const createMut = useMutation({
    mutationFn: (body: typeof form) => api.post("/admin/pools", {
      title: body.title, sport: body.sport,
      prizePool: body.prizePool || "0",
      entryFee: body.entryFee || "0",
      deadline: toIso(body.deadline),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pools"] });
      toast.success("Pool created");
      setShowForm(false);
      setForm({ title: "", sport: "football", prizePool: "", entryFee: "", deadline: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settleMut = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      api.patch(`/admin/pools/${id}`, { status: "settled", notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pools"] });
      toast.success("Pool settled and entries processed");
      setSettlingPool(null);
      setOutcome("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelPoolMut = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/pools/${id}`, { status: "cancelled" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pools"] }); toast.success("Pool cancelled"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/pools/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-pools"] }); toast.success("Pool deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00DFA9] transition-colors";

  return (
    <div className="space-y-5">
      <Dialog open={!!settlingPool} onOpenChange={open => !open && setSettlingPool(null)}>
        <DialogContent className="bg-[#0D1117] border border-white/8 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Settle Pool: {settlingPool?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-[#94A3B8]">
              Set the correct outcome for this pool. All entries will be evaluated and prizes distributed accordingly.
            </p>
            <div>
              <label className="block text-xs text-[#94A3B8] mb-1">Correct Outcome / Result Notes</label>
              <textarea
                className={inp}
                rows={3}
                value={outcome}
                onChange={e => setOutcome(e.target.value)}
                placeholder="e.g. Home win, final score 2-1, Player A wins…"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => { setSettlingPool(null); setOutcome(""); }}
              className="px-4 py-2 bg-white/5 text-[#94A3B8] rounded-lg text-sm hover:bg-white/10 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => settlingPool && settleMut.mutate({ id: settlingPool.id, notes: outcome })}
              disabled={settleMut.isPending}
              className="px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 disabled:opacity-50 transition-colors"
            >
              {settleMut.isPending ? "Settling…" : "Confirm & Settle Entries"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prediction Pools</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{pools.length} total</p>
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
            <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.title || !form.deadline}
              className="px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 disabled:opacity-50 transition-colors">
              {createMut.isPending ? "Creating…" : "Create Pool"}
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
              ) : pools.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#94A3B8]">No pools yet</td></tr>
              ) : pools.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{p.title}</td>
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
                        <>
                          <button
                            onClick={() => { setSettlingPool(p); setOutcome(""); }}
                            title="Set outcome & settle entries"
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors"
                          >
                            <CheckSquare className="w-3 h-3" /> Settle
                          </button>
                          <button
                            onClick={() => { if (confirm("Cancel this pool?")) cancelPoolMut.mutate(p.id); }}
                            className="px-2 py-1 rounded text-xs bg-[#FACC15]/10 text-[#FACC15] hover:bg-[#FACC15]/20 transition-colors">
                            Cancel
                          </button>
                        </>
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
      </div>
    </div>
  );
}
