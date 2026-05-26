import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceBoost {
  id: number;
  title: string;
  matchId: string;
  matchName: string;
  leagueName: string;
  marketName: string;
  selectionName: string;
  originalOdds: string;
  boostedOdds: string;
  maxStake: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  title: "",
  matchId: "",
  matchName: "",
  leagueName: "",
  marketName: "Match Winner",
  selectionName: "",
  originalOdds: "",
  boostedOdds: "",
  maxStake: "",
  expiresAt: "",
};

export default function BoostsPage() {
  const qc = useQueryClient();
  const [form, setForm]       = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const { data: boosts = [], isLoading } = useQuery<PriceBoost[]>({
    queryKey: ["admin-boosts"],
    queryFn: () => api.get("/admin/boosts"),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      api.post("/admin/boosts", {
        ...data,
        originalOdds: parseFloat(data.originalOdds),
        boostedOdds:  parseFloat(data.boostedOdds),
        maxStake:     data.maxStake ? parseFloat(data.maxStake) : undefined,
        expiresAt:    data.expiresAt || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-boosts"] });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success("Price boost created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`/admin/boosts/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-boosts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/boosts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-boosts"] });
      toast.success("Boost deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.matchName || !form.selectionName || !form.originalOdds || !form.boostedOdds) {
      toast.error("Fill in all required fields");
      return;
    }
    if (parseFloat(form.boostedOdds) <= parseFloat(form.originalOdds)) {
      toast.error("Boosted odds must be higher than original odds");
      return;
    }
    createMutation.mutate(form);
  }

  const active   = boosts.filter(b => b.isActive);
  const inactive = boosts.filter(b => !b.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#FACC15]" />
            Price Boosts
          </h1>
          <p className="text-sm text-[#94A3B8]/60 mt-0.5">Create enhanced odds offers that appear on the home page</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FACC15] text-[#0B0F14] text-sm font-bold hover:bg-[#FDE047] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Boost
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#FACC15]/20 bg-[#0E1520] p-5 space-y-4">
          <h2 className="text-[13px] font-bold text-[#FACC15] flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Create Price Boost
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Boost Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Premier League Special" required
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Match Name *</label>
              <input value={form.matchName} onChange={e => setForm(f => ({ ...f, matchName: e.target.value }))}
                placeholder="Arsenal vs Chelsea" required
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Match ID</label>
              <input value={form.matchId} onChange={e => setForm(f => ({ ...f, matchId: e.target.value }))}
                placeholder="API match ID (optional)"
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">League</label>
              <input value={form.leagueName} onChange={e => setForm(f => ({ ...f, leagueName: e.target.value }))}
                placeholder="Premier League"
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Market</label>
              <input value={form.marketName} onChange={e => setForm(f => ({ ...f, marketName: e.target.value }))}
                placeholder="Match Winner"
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Selection Name *</label>
              <input value={form.selectionName} onChange={e => setForm(f => ({ ...f, selectionName: e.target.value }))}
                placeholder="Arsenal to win" required
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Original Odds *</label>
              <input value={form.originalOdds} onChange={e => setForm(f => ({ ...f, originalOdds: e.target.value }))}
                type="number" step="0.01" min="1.01" placeholder="2.50" required
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Boosted Odds *</label>
              <input value={form.boostedOdds} onChange={e => setForm(f => ({ ...f, boostedOdds: e.target.value }))}
                type="number" step="0.01" min="1.01" placeholder="3.50" required
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#FACC15] placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Max Stake (USDT)</label>
              <input value={form.maxStake} onChange={e => setForm(f => ({ ...f, maxStake: e.target.value }))}
                type="number" step="1" min="1" placeholder="50 (optional)"
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Expires At</label>
              <input value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                type="datetime-local"
                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#FACC15] text-[#0B0F14] text-sm font-bold hover:bg-[#FDE047] disabled:opacity-50 transition-colors">
              {createMutation.isPending ? "Creating…" : "Create Boost"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-[#94A3B8] hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Boosts", value: boosts.length, color: "#94A3B8" },
          { label: "Active",       value: active.length,   color: "#00DFA9" },
          { label: "Inactive",     value: inactive.length, color: "#334155" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-[#0E1520] p-3 text-center">
            <p className="text-[22px] font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[#94A3B8]/50">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Boosts list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-[#FACC15]/30 border-t-[#FACC15] rounded-full animate-spin" />
        </div>
      ) : boosts.length === 0 ? (
        <div className="text-center py-16 text-[#94A3B8]/40">
          <Zap className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No boosts yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {boosts.map(boost => {
            const expired = boost.expiresAt && new Date(boost.expiresAt) < new Date();
            return (
              <div key={boost.id} className={cn(
                "rounded-xl border p-4 flex items-center gap-4 transition-all",
                boost.isActive && !expired
                  ? "border-[#FACC15]/20 bg-[#FACC15]/3"
                  : "border-white/[0.05] bg-[#0E1520] opacity-60"
              )}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-bold text-white truncate">{boost.title}</p>
                    {expired && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Expired</span>}
                    {boost.isActive && !expired && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/20">Live</span>}
                  </div>
                  <p className="text-[11px] text-[#94A3B8]/60 truncate">{boost.matchName} — {boost.selectionName}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-[#94A3B8]/40 line-through">{parseFloat(boost.originalOdds).toFixed(2)}</span>
                    <span className="text-[13px] font-black text-[#FACC15]">{parseFloat(boost.boostedOdds).toFixed(2)}</span>
                    {boost.maxStake && <span className="text-[10px] text-[#94A3B8]/40">Max ${parseFloat(boost.maxStake).toFixed(0)}</span>}
                    {boost.expiresAt && (
                      <span className="text-[10px] text-[#94A3B8]/40 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(boost.expiresAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleMutation.mutate({ id: boost.id, isActive: !boost.isActive })}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-[#94A3B8] hover:text-white"
                    title={boost.isActive ? "Deactivate" : "Activate"}
                  >
                    {boost.isActive
                      ? <ToggleRight className="h-5 w-5 text-[#00DFA9]" />
                      : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(boost.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-[#94A3B8] hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
