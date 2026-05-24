import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminWinspinPrize, AdminWinspinStats } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { Plus, Pencil, Trash2, X, Zap, TrendingUp, DollarSign, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors";

const PRESET_COLORS = [
  "#00DFA9", "#38BDF8", "#FACC15", "#F97316",
  "#A855F7", "#EC4899", "#22C55E", "#EF4444",
  "#475569", "#94A3B8",
];

type PrizeForm = {
  label: string;
  prizeAmount: string;
  weight: string;
  color: string;
  maxPerDay: string;
};

const EMPTY: PrizeForm = { label: "", prizeAmount: "0", weight: "10", color: "#00DFA9", maxPerDay: "" };

function prizeToForm(p: AdminWinspinPrize): PrizeForm {
  return {
    label: p.label,
    prizeAmount: p.prizeAmount,
    weight: String(p.weight),
    color: p.color,
    maxPerDay: p.maxPerDay !== null ? String(p.maxPerDay) : "",
  };
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="bg-[#111827] border border-white/8 rounded-xl p-4 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-[#94A3B8] mb-0.5">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function WinSpinPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminWinspinPrize | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PrizeForm>(EMPTY);

  const { data: prizes = [], isLoading } = useQuery<AdminWinspinPrize[]>({
    queryKey: ["admin-winspin-prizes"],
    queryFn: () => api.get("/admin/winspin/prizes"),
  });

  const { data: stats } = useQuery<AdminWinspinStats>({
    queryKey: ["admin-winspin-stats"],
    queryFn: () => api.get("/admin/winspin/stats"),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(p: AdminWinspinPrize) {
    setEditing(p);
    setForm(prizeToForm(p));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
  }

  const createMut = useMutation({
    mutationFn: (body: object) => api.post("/admin/winspin/prizes", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-winspin-prizes"] }); toast.success("Prize created"); closeForm(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/admin/winspin/prizes/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-winspin-prizes"] }); toast.success("Prize updated"); closeForm(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/winspin/prizes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-winspin-prizes"] }); toast.success("Prize deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`/admin/winspin/prizes/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-winspin-prizes"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      label: form.label,
      prizeAmount: form.prizeAmount || "0",
      weight: parseInt(form.weight) || 10,
      color: form.color,
      maxPerDay: form.maxPerDay ? parseInt(form.maxPerDay) : null,
    };
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  }

  const totalWeight = prizes.filter(p => p.isActive).reduce((s, p) => s + p.weight, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FACC15]" /> WinSpin Configuration
          </h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Manage prize wheel prizes, weights, and limits</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#00DFA9] text-[#0B0F14] font-semibold text-sm px-4 py-2 rounded-lg hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Prize
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={RotateCcw} label="Total Spins" value={stats?.totalSpins ?? "—"} accent="bg-[#38BDF8]/10 text-[#38BDF8]" />
        <StatCard icon={DollarSign} label="Total Paid Out" value={stats ? `$${parseFloat(stats.totalPaid).toFixed(2)}` : "—"} accent="bg-[#00DFA9]/10 text-[#00DFA9]" />
        <StatCard icon={TrendingUp} label="Spins Today" value={stats?.spinsToday ?? "—"} accent="bg-[#FACC15]/10 text-[#FACC15]" />
        <StatCard icon={Zap} label="Active Prizes" value={prizes.filter(p => p.isActive).length} accent="bg-[#A855F7]/10 text-[#A855F7]" />
      </div>

      {/* Prize table */}
      <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Prize Wheel Segments</span>
          <span className="text-xs text-[#94A3B8]">Higher weight = more likely</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[#475569] text-sm">Loading…</div>
        ) : prizes.length === 0 ? (
          <div className="p-8 text-center text-[#475569] text-sm">No prizes configured</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[#475569] text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-2.5">Prize</th>
                <th className="text-right px-4 py-2.5">Amount</th>
                <th className="text-right px-4 py-2.5">Weight</th>
                <th className="text-right px-4 py-2.5">Probability</th>
                <th className="text-right px-4 py-2.5">Max/Day</th>
                <th className="text-center px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {prizes.map(p => {
                const prob = totalWeight > 0 ? ((p.weight / totalWeight) * 100).toFixed(1) : "—";
                return (
                  <tr key={p.id} className={cn("hover:bg-white/2 transition-colors", !p.isActive && "opacity-40")}>
                    <td className="px-5 py-3 flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="text-white font-medium">{p.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#00DFA9] font-mono font-semibold">
                      {parseFloat(p.prizeAmount) > 0 ? `$${parseFloat(p.prizeAmount).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{p.weight}</td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{prob}%</td>
                    <td className="px-4 py-3 text-right text-[#94A3B8]">{p.maxPerDay ?? "∞"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })}
                        className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full transition-colors",
                          p.isActive ? "bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20" : "bg-white/5 text-[#475569] hover:bg-white/10"
                        )}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/8 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMut.mutate(p.id)} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-semibold text-white">{editing ? "Edit Prize" : "Add Prize"}</h2>
              <button onClick={closeForm} className="text-[#475569] hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Label</label>
                <input className={inp} placeholder="e.g. 25 USDT" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Prize Amount (USDT)</label>
                  <input className={inp} type="number" min="0" step="0.01" placeholder="0" value={form.prizeAmount} onChange={e => setForm(f => ({ ...f, prizeAmount: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Weight (1–100)</label>
                  <input className={inp} type="number" min="1" max="100" placeholder="10" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Max Spins Per Day (blank = unlimited)</label>
                <input className={inp} type="number" min="1" placeholder="Unlimited" value={form.maxPerDay} onChange={e => setForm(f => ({ ...f, maxPerDay: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Color</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={cn("w-7 h-7 rounded-full border-2 transition-all", form.color === c ? "border-white scale-110" : "border-transparent")}
                      style={{ background: c }} />
                  ))}
                </div>
                <input className={inp} placeholder="#00DFA9" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-sm text-[#94A3B8] hover:text-white hover:border-white/20 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#00DFA9] text-[#0B0F14] text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50">
                  {editing ? "Save Changes" : "Create Prize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
