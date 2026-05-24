import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminPromotion } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { Plus, ToggleLeft, ToggleRight, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function toIso(localDatetime: string): string | undefined {
  if (!localDatetime) return undefined;
  return new Date(localDatetime).toISOString();
}

function toLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type PromoForm = {
  title: string; description: string; type: string;
  bonusAmount: string; minDeposit: string; eligibility: string;
  maxClaims: string; expiresAt: string;
};

const EMPTY_FORM: PromoForm = {
  title: "", description: "", type: "deposit_bonus",
  bonusAmount: "", minDeposit: "", eligibility: "all",
  maxClaims: "", expiresAt: "",
};

function promoToForm(p: AdminPromotion): PromoForm {
  return {
    title: p.title, description: p.description, type: p.type,
    bonusAmount: p.bonusAmount ?? "", minDeposit: p.minDeposit ?? "",
    eligibility: p.eligibility,
    maxClaims: p.maxClaims !== null ? String(p.maxClaims) : "",
    expiresAt: toLocal(p.expiresAt),
  };
}

export default function PromotionsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);

  const { data: promotions = [], isLoading } = useQuery<AdminPromotion[]>({
    queryKey: ["admin-promotions"],
    queryFn: () => api.get<AdminPromotion[]>("/admin/promotions"),
  });

  const createMut = useMutation({
    mutationFn: (body: PromoForm) => api.post("/admin/promotions", {
      title: body.title, description: body.description, type: body.type,
      eligibility: body.eligibility,
      bonusAmount: body.bonusAmount || undefined,
      minDeposit: body.minDeposit || undefined,
      maxClaims: body.maxClaims ? parseInt(body.maxClaims) : undefined,
      expiresAt: toIso(body.expiresAt),
      isActive: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      toast.success("Promotion created");
      setShowCreate(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: PromoForm }) => api.patch(`/admin/promotions/${id}`, {
      title: body.title, description: body.description, type: body.type,
      eligibility: body.eligibility,
      bonusAmount: body.bonusAmount || undefined,
      minDeposit: body.minDeposit || undefined,
      maxClaims: body.maxClaims ? parseInt(body.maxClaims) : null,
      expiresAt: toIso(body.expiresAt),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      toast.success("Promotion updated");
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`/admin/promotions/${id}`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promotions"] }); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/promotions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promotions"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00DFA9] transition-colors";

  function PromoFormFields({ value, onChange }: { value: PromoForm; onChange: (f: PromoForm) => void }) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-[#94A3B8] mb-1">Title</label>
          <input className={inp} value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} placeholder="Welcome Bonus" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-[#94A3B8] mb-1">Description</label>
          <textarea className={inp} rows={2} value={value.description} onChange={e => onChange({ ...value, description: e.target.value })} placeholder="Describe the promotion…" />
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Type</label>
          <select className={inp} value={value.type} onChange={e => onChange({ ...value, type: e.target.value })}>
            <option value="deposit_bonus">Deposit Bonus</option>
            <option value="free_bet">Free Bet</option>
            <option value="cashback">Cashback</option>
            <option value="referral_boost">Referral Boost</option>
            <option value="welcome">Welcome</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Eligibility</label>
          <select className={inp} value={value.eligibility} onChange={e => onChange({ ...value, eligibility: e.target.value })}>
            <option value="all">All users</option>
            <option value="new">New users</option>
            <option value="vip">VIP users</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Bonus Amount (USDT)</label>
          <input className={inp} type="number" step="0.01" value={value.bonusAmount} onChange={e => onChange({ ...value, bonusAmount: e.target.value })} placeholder="50.00" />
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Min Deposit (USDT)</label>
          <input className={inp} type="number" step="0.01" value={value.minDeposit} onChange={e => onChange({ ...value, minDeposit: e.target.value })} placeholder="100.00" />
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Max Claims</label>
          <input className={inp} type="number" value={value.maxClaims} onChange={e => onChange({ ...value, maxClaims: e.target.value })} placeholder="Unlimited" />
        </div>
        <div>
          <label className="block text-xs text-[#94A3B8] mb-1">Expires At</label>
          <input className={inp} type="datetime-local" value={value.expiresAt} onChange={e => onChange({ ...value, expiresAt: e.target.value })} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Promotions</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{promotions.length} total</p>
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 transition-colors">
          <Plus className="w-4 h-4" /> New Promotion
        </button>
      </div>

      {showCreate && (
        <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Create Promotion</h2>
          <PromoFormFields value={form} onChange={setForm} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 bg-white/5 text-[#94A3B8] rounded-lg text-sm hover:bg-white/10 transition-colors">Cancel</button>
            <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.title}
              className="px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 disabled:opacity-50 transition-colors">
              {createMut.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-[#94A3B8]">Loading…</div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-12 text-[#94A3B8] bg-[#0D1117] border border-white/8 rounded-xl">No promotions yet</div>
        ) : promotions.map(p => (
          <div key={p.id} className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{p.title}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs border", statusBg(p.isActive ? "active" : "closed"))}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-[#94A3B8] mb-3">{p.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-[#94A3B8]">
                    <span>Type: <span className="text-white capitalize">{p.type.replace(/_/g, " ")}</span></span>
                    {p.bonusAmount && <span>Bonus: <span className="text-[#00DFA9]">${fmt(p.bonusAmount)}</span></span>}
                    {p.minDeposit && <span>Min deposit: <span className="text-white">${fmt(p.minDeposit)}</span></span>}
                    <span>Claims: <span className="text-[#38BDF8]">{p.claimCount}{p.maxClaims ? ` / ${p.maxClaims}` : ""}</span></span>
                    {p.expiresAt && <span>Expires: <span className="text-white">{fmtDate(p.expiresAt)}</span></span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingId(editingId === p.id ? null : p.id); setForm(promoToForm(p)); setShowCreate(false); }}
                    className="p-2 rounded-lg text-[#38BDF8] hover:bg-[#38BDF8]/10 transition-colors">
                    {editingId === p.id ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })}
                    className={cn("p-2 rounded-lg transition-colors", p.isActive ? "text-[#00DFA9] hover:bg-[#00DFA9]/10" : "text-[#94A3B8] hover:bg-white/5")}>
                    {p.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => { if (confirm("Delete this promotion?")) deleteMut.mutate(p.id); }}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {editingId === p.id && (
              <div className="border-t border-white/8 p-5 space-y-4 bg-white/2">
                <h3 className="text-sm font-semibold text-white">Edit Promotion</h3>
                <PromoFormFields value={form} onChange={setForm} />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-white/5 text-[#94A3B8] rounded-lg text-sm hover:bg-white/10 transition-colors">Cancel</button>
                  <button onClick={() => editMut.mutate({ id: p.id, body: form })} disabled={editMut.isPending || !form.title}
                    className="px-4 py-2 bg-[#38BDF8] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#38BDF8]/90 disabled:opacity-50 transition-colors">
                    {editMut.isPending ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
