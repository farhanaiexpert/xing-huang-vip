import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminPromotion } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { Plus, ToggleLeft, ToggleRight, Trash2, Pencil, X, Tag, Users, Gift } from "lucide-react";
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

function typeIcon(type: string) {
  if (type === "deposit_bonus" || type === "welcome") return <Gift className="w-4 h-4" />;
  if (type === "referral_boost") return <Users className="w-4 h-4" />;
  return <Tag className="w-4 h-4" />;
}

function typeColor(type: string) {
  if (type === "deposit_bonus") return "bg-[#00DFA9]/10 text-[#00DFA9]";
  if (type === "free_bet") return "bg-[#38BDF8]/10 text-[#38BDF8]";
  if (type === "cashback") return "bg-[#FACC15]/10 text-[#FACC15]";
  if (type === "referral_boost") return "bg-purple-500/10 text-purple-400";
  return "bg-white/8 text-[#94A3B8]";
}

const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors";

function PromoFormFields({ value, onChange }: { value: PromoForm; onChange: (f: PromoForm) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="block text-xs text-[#64748B] mb-1.5">Title</label>
        <input className={inp} value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} placeholder="Welcome Bonus" />
      </div>
      <div className="col-span-2">
        <label className="block text-xs text-[#64748B] mb-1.5">Description</label>
        <textarea className={cn(inp, "resize-none")} rows={2} value={value.description} onChange={e => onChange({ ...value, description: e.target.value })} placeholder="Describe the promotion…" />
      </div>
      <div>
        <label className="block text-xs text-[#64748B] mb-1.5">Type</label>
        <select className={inp} value={value.type} onChange={e => onChange({ ...value, type: e.target.value })}>
          <option value="deposit_bonus">Deposit Bonus</option>
          <option value="free_bet">Free Bet</option>
          <option value="cashback">Cashback</option>
          <option value="referral_boost">Referral Boost</option>
          <option value="welcome">Welcome</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-[#64748B] mb-1.5">Eligibility</label>
        <select className={inp} value={value.eligibility} onChange={e => onChange({ ...value, eligibility: e.target.value })}>
          <option value="all">All users</option>
          <option value="new">New users</option>
          <option value="vip">VIP users</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-[#64748B] mb-1.5">Bonus Amount (USDT)</label>
        <input className={inp} type="number" step="0.01" value={value.bonusAmount} onChange={e => onChange({ ...value, bonusAmount: e.target.value })} placeholder="50.00" />
      </div>
      <div>
        <label className="block text-xs text-[#64748B] mb-1.5">Min Deposit (USDT)</label>
        <input className={inp} type="number" step="0.01" value={value.minDeposit} onChange={e => onChange({ ...value, minDeposit: e.target.value })} placeholder="100.00" />
      </div>
      <div>
        <label className="block text-xs text-[#64748B] mb-1.5">Max Claims</label>
        <input className={inp} type="number" value={value.maxClaims} onChange={e => onChange({ ...value, maxClaims: e.target.value })} placeholder="Unlimited" />
      </div>
      <div>
        <label className="block text-xs text-[#64748B] mb-1.5">Expires At</label>
        <input className={inp} type="datetime-local" value={value.expiresAt} onChange={e => onChange({ ...value, expiresAt: e.target.value })} />
      </div>
    </div>
  );
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promotions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/promotions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promotions"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = promotions.filter(p => p.isActive).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Promotions</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            {promotions.length} total · <span className="text-[#00DFA9]">{active} active</span>
          </p>
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 transition-colors">
          <Plus className="w-4 h-4" /> New Promotion
        </button>
      </div>

      {showCreate && (
        <div className="bg-[#0D1117] border border-[#00DFA9]/20 rounded-xl p-5 space-y-4">
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#0D1117] border border-white/8 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-white/5 rounded w-3/4 mb-3" />
              <div className="h-3 bg-white/5 rounded w-full mb-2" />
              <div className="h-3 bg-white/5 rounded w-2/3 mb-4" />
              <div className="h-2 bg-white/5 rounded w-full" />
            </div>
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16 text-[#334155] bg-[#0D1117] border border-white/8 rounded-xl">No promotions yet</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {promotions.map(p => {
            const usagePct = p.maxClaims ? Math.min(100, (p.claimCount / p.maxClaims) * 100) : null;
            return (
              <div key={p.id} className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden hover:border-white/12 transition-colors flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", typeColor(p.type))}>
                        {typeIcon(p.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm leading-tight truncate">{p.title}</div>
                        <div className="text-xs text-[#475569] mt-0.5 capitalize">{p.type.replace(/_/g, " ")} · {p.eligibility}</div>
                      </div>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] border shrink-0", statusBg(p.isActive ? "active" : "closed"))}>
                      {p.isActive ? "Active" : "Off"}
                    </span>
                  </div>

                  {p.description && (
                    <p className="text-xs text-[#64748B] mb-3 line-clamp-2">{p.description}</p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3">
                    {p.bonusAmount && (
                      <span className="text-[#64748B]">Bonus: <span className="text-[#00DFA9] font-semibold">${fmt(p.bonusAmount)}</span></span>
                    )}
                    {p.minDeposit && (
                      <span className="text-[#64748B]">Min: <span className="text-white">${fmt(p.minDeposit)}</span></span>
                    )}
                    {p.expiresAt && (
                      <span className="text-[#64748B]">Exp: <span className="text-white">{fmtDate(p.expiresAt)}</span></span>
                    )}
                  </div>

                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Claims</span>
                    <span className="text-[#38BDF8] font-semibold">
                      {p.claimCount}{p.maxClaims ? ` / ${p.maxClaims}` : ""}
                    </span>
                  </div>
                  {usagePct !== null && (
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", usagePct >= 90 ? "bg-red-400" : usagePct >= 60 ? "bg-[#FACC15]" : "bg-[#38BDF8]")}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-white/8 flex items-center justify-between px-4 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingId(editingId === p.id ? null : p.id); setForm(promoToForm(p)); setShowCreate(false); }}
                      className="p-1.5 rounded-lg text-[#38BDF8] hover:bg-[#38BDF8]/10 transition-colors">
                      {editingId === p.id ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => { if (confirm("Delete this promotion?")) deleteMut.mutate(p.id); }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })}
                    className={cn("flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                      p.isActive ? "text-[#00DFA9] hover:bg-[#00DFA9]/10" : "text-[#475569] hover:bg-white/5"
                    )}>
                    {p.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {p.isActive ? "Active" : "Inactive"}
                  </button>
                </div>

                {editingId === p.id && (
                  <div className="border-t border-white/8 p-4 space-y-4 bg-white/2">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
