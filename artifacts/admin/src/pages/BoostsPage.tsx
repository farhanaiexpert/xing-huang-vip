import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Pencil, X, TrendingUp, Info } from "lucide-react";
import { GuideModal, GuideButton } from "@/components/GuideModal";
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
  homeTeam: string;
  awayTeam: string;
  commenceTime: string | null;
  sportKey: string;
  usageCount: number;
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
  homeTeam: "",
  awayTeam: "",
  commenceTime: "",
  sportKey: "",
};

type FormState = typeof EMPTY_FORM;

function BoostForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  initialValues: FormState;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initialValues);
  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const origNum = parseFloat(form.originalOdds) || 0;
  const bstNum  = parseFloat(form.boostedOdds)  || 0;
  const uplift  = origNum > 0 && bstNum > origNum
    ? `+${Math.round(((bstNum - origNum) / origNum) * 100)}%`
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.matchName || !form.selectionName || !form.originalOdds || !form.boostedOdds || !form.matchId) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (bstNum <= origNum) {
      toast.error("Boosted odds must be higher than the original odds");
      return;
    }
    onSubmit(form);
  }

  const inputClass = "w-full bg-[#0B0F14] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#FACC15]/40 transition-colors";
  const labelClass = "block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* What is a Price Boost? */}
      <div className="flex gap-2 p-3 rounded-xl bg-[#FACC15]/5 border border-[#FACC15]/15">
        <Info className="h-4 w-4 text-[#FACC15] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#94A3B8]/70 leading-relaxed">
          A price boost gives users <span className="text-[#FACC15] font-semibold">enhanced odds</span> on a specific match outcome for a limited time.
          The odds you enter here are what users will see and what they'll be paid out at if they win.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Title */}
        <div className="sm:col-span-2">
          <label className={labelClass}>Boost Title <span className="text-red-400">*</span></label>
          <input value={form.title} onChange={e => set("title", e.target.value)}
            placeholder='e.g. "Arsenal Special" or "Saturday Mega Boost"' required
            className={inputClass} />
          <p className="text-[10px] text-[#94A3B8]/40 mt-1">This is the headline users see above the boost card.</p>
        </div>

        {/* Match Name */}
        <div>
          <label className={labelClass}>Match Name <span className="text-red-400">*</span></label>
          <input value={form.matchName} onChange={e => set("matchName", e.target.value)}
            placeholder="Arsenal vs Chelsea" required
            className={inputClass} />
          <p className="text-[10px] text-[#94A3B8]/40 mt-1">Format: Home Team vs Away Team</p>
        </div>

        {/* Match ID */}
        <div>
          <label className={labelClass}>Event ID <span className="text-red-400">*</span></label>
          <input value={form.matchId} onChange={e => set("matchId", e.target.value)}
            placeholder="e.g. abc123 (from Odds API or BetsAPI)" required
            className={inputClass} />
          <p className="text-[10px] text-[#94A3B8]/40 mt-1">Matches the bet to the correct event for settlement.</p>
        </div>

        {/* League */}
        <div>
          <label className={labelClass}>League / Competition</label>
          <input value={form.leagueName} onChange={e => set("leagueName", e.target.value)}
            placeholder="Premier League"
            className={inputClass} />
        </div>

        {/* Sport Key */}
        <div>
          <label className={labelClass}>Sport Key</label>
          <input value={form.sportKey} onChange={e => set("sportKey", e.target.value)}
            placeholder="soccer_epl (leave blank for auto)"
            className={inputClass} />
          <p className="text-[10px] text-[#94A3B8]/40 mt-1">e.g. soccer_epl, basketball_nba — helps with settlement.</p>
        </div>

        {/* Market */}
        <div>
          <label className={labelClass}>Market Type <span className="text-red-400">*</span></label>
          <select value={form.marketName} onChange={e => set("marketName", e.target.value)}
            className={inputClass}>
            <option value="Match Winner">Match Winner</option>
            <option value="Both Teams to Score">Both Teams to Score</option>
            <option value="Over/Under 2.5 Goals">Over/Under 2.5 Goals</option>
            <option value="First Goal Scorer">First Goal Scorer</option>
            <option value="Correct Score">Correct Score</option>
            <option value="Moneyline">Moneyline</option>
            <option value="Handicap">Handicap</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        {/* Selection Name */}
        <div>
          <label className={labelClass}>Selection (what the user is betting on) <span className="text-red-400">*</span></label>
          <input value={form.selectionName} onChange={e => set("selectionName", e.target.value)}
            placeholder='e.g. "Arsenal to win" or "Over 2.5 Goals"' required
            className={inputClass} />
        </div>

        {/* Original Odds */}
        <div>
          <label className={labelClass}>Normal Odds (current market price) <span className="text-red-400">*</span></label>
          <input value={form.originalOdds} onChange={e => set("originalOdds", e.target.value)}
            type="number" step="0.01" min="1.01" placeholder="2.50" required
            className={inputClass} />
          <p className="text-[10px] text-[#94A3B8]/40 mt-1">The odds you'd normally offer. Shown crossed out to the user.</p>
        </div>

        {/* Boosted Odds */}
        <div>
          <label className={labelClass}>Boosted Odds (the enhanced price) <span className="text-red-400">*</span></label>
          <div className="relative">
            <input value={form.boostedOdds} onChange={e => set("boostedOdds", e.target.value)}
              type="number" step="0.01" min="1.01" placeholder="4.00" required
              className={cn(inputClass, "text-[#FACC15] pr-16")} />
            {uplift && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#00DFA9] bg-[#00DFA9]/10 px-1.5 py-0.5 rounded-full">
                {uplift}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#94A3B8]/40 mt-1">Must be higher than the normal odds.</p>
        </div>

        {/* Max Stake */}
        <div>
          <label className={labelClass}>Max Stake per Bet (USDT)</label>
          <input value={form.maxStake} onChange={e => set("maxStake", e.target.value)}
            type="number" step="1" min="1" placeholder="50 (leave blank for no limit)"
            className={inputClass} />
          <p className="text-[10px] text-[#94A3B8]/40 mt-1">Caps risk exposure on this boost.</p>
        </div>

        {/* Expires At */}
        <div>
          <label className={labelClass}>Expires At</label>
          <input value={form.expiresAt} onChange={e => set("expiresAt", e.target.value)}
            type="datetime-local"
            className={inputClass} />
          <p className="text-[10px] text-[#94A3B8]/40 mt-1">Leave blank to keep it live until you manually deactivate it.</p>
        </div>

        {/* Advanced: home/away teams */}
        <div>
          <label className={labelClass}>Home Team Name</label>
          <input value={form.homeTeam} onChange={e => set("homeTeam", e.target.value)}
            placeholder="Arsenal (auto-parsed from match name)"
            className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Away Team Name</label>
          <input value={form.awayTeam} onChange={e => set("awayTeam", e.target.value)}
            placeholder="Chelsea (auto-parsed from match name)"
            className={inputClass} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isPending}
          className="px-5 py-2 rounded-xl bg-[#FACC15] text-[#0B0F14] text-sm font-bold hover:bg-[#FDE047] disabled:opacity-50 transition-colors">
          {isPending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-[#94A3B8] hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

const BOOSTS_GUIDE = [
  {
    title: "What is a Price Boost?",
    items: [
      "A Price Boost gives players enhanced odds on a specific match selection for a limited time — it appears as a featured card on the sportsbook home page.",
      "When a player bets on the boost, they are paid out at the boosted odds (not the normal market price). The difference in liability is absorbed by the house.",
      "Use Price Boosts to drive betting volume on specific matches or to reward loyal players with better value.",
    ],
  },
  {
    title: "Creating a Boost",
    items: [
      "Fill in the Boost Title (the headline players see), Match Name (e.g. Arsenal vs Chelsea), and the exact Event ID from the Odds API or BetsAPI — this ID links the boost to the right event for settlement.",
      "Set the Normal Odds (current market price, shown crossed-out) and the Boosted Odds (must be strictly higher).",
      "The uplift percentage is calculated automatically and shown in real time as you type.",
      "Max Stake caps how much a single player can bet at the boosted price — use this to control your liability. Leave blank for no limit.",
      "Expires At: the boost auto-deactivates at this time. Leave blank to keep it live until you turn it off manually.",
    ],
  },
  {
    title: "Managing Boosts",
    items: [
      "Toggle the switch on any boost to activate or deactivate it instantly — deactivated boosts are hidden from players.",
      "Edit a boost to update odds, extend the expiry, or change the max stake at any time.",
      "Bets Placed counter shows how many bets have been placed using this boost — useful for tracking popularity and exposure.",
      "Delete a boost to remove it permanently. This does not affect bets already placed on it.",
    ],
  },
  {
    title: "Settlement",
    items: [
      "Boosted bets settle the same way as regular bets — the settlement system uses the Event ID you provided to match the result.",
      "Make sure the Event ID exactly matches the ID stored with the player's bet (from the Odds API or BetsAPI, depending on where the match originated).",
    ],
  },
];

export default function BoostsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [showGuide, setShowGuide]   = useState(false);

  const { data: boosts = [], isLoading } = useQuery<PriceBoost[]>({
    queryKey: ["admin-boosts"],
    queryFn: () => api.get("/admin/boosts"),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) =>
      api.post("/admin/boosts", {
        ...data,
        originalOdds: parseFloat(data.originalOdds),
        boostedOdds:  parseFloat(data.boostedOdds),
        maxStake:     data.maxStake ? parseFloat(data.maxStake) : undefined,
        expiresAt:    data.expiresAt || undefined,
        homeTeam:     data.homeTeam || undefined,
        awayTeam:     data.awayTeam || undefined,
        commenceTime: data.commenceTime || undefined,
        sportKey:     data.sportKey || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-boosts"] });
      setShowCreate(false);
      toast.success("Price boost created — it's now live on the sportsbook");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormState }) =>
      api.patch(`/admin/boosts/${id}`, {
        ...data,
        originalOdds: parseFloat(data.originalOdds),
        boostedOdds:  parseFloat(data.boostedOdds),
        maxStake:     data.maxStake ? parseFloat(data.maxStake) : 0,
        expiresAt:    data.expiresAt || null,
        homeTeam:     data.homeTeam,
        awayTeam:     data.awayTeam,
        commenceTime: data.commenceTime || null,
        sportKey:     data.sportKey,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-boosts"] });
      setEditingId(null);
      toast.success("Boost updated");
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

  const active   = boosts.filter(b => b.isActive && (!b.expiresAt || new Date(b.expiresAt) > new Date()));
  const inactive = boosts.filter(b => !b.isActive || (b.expiresAt && new Date(b.expiresAt) <= new Date()));
  const totalUsage = boosts.reduce((sum, b) => sum + (b.usageCount ?? 0), 0);

  return (
    <div className="space-y-6">
      <GuideModal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Price Boosts Guide"
        subtitle="How to create and manage enhanced odds for players"
        accent="#FACC15"
        sections={BOOSTS_GUIDE}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#FACC15]" />
            Price Boosts
          </h1>
          <p className="text-sm text-[#94A3B8]/60 mt-0.5">
            Set enhanced odds on specific match outcomes — they appear on the sportsbook home page
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GuideButton onClick={() => setShowGuide(true)} accent="#FACC15" />
          {!showCreate && (
            <button
              onClick={() => { setShowCreate(true); setEditingId(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FACC15] text-[#0B0F14] text-sm font-bold hover:bg-[#FDE047] transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Boost
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Boosts",  value: boosts.length,    color: "#94A3B8" },
          { label: "Live Now",      value: active.length,    color: "#00DFA9" },
          { label: "Inactive",      value: inactive.length,  color: "#475569" },
          { label: "Bets Placed",   value: totalUsage,       color: "#FACC15", icon: <TrendingUp className="h-3 w-3" /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-[#0E1520] p-3 text-center">
            <p className="text-[22px] font-black tabular-nums flex items-center justify-center gap-1" style={{ color: s.color }}>
              {s.icon}{s.value}
            </p>
            <p className="text-[10px] text-[#94A3B8]/50">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl border border-[#FACC15]/20 bg-[#0E1520] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-bold text-[#FACC15] flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Create New Price Boost
            </h2>
            <button onClick={() => setShowCreate(false)} className="text-[#94A3B8] hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <BoostForm
            initialValues={EMPTY_FORM}
            onSubmit={data => createMutation.mutate(data)}
            onCancel={() => setShowCreate(false)}
            isPending={createMutation.isPending}
            submitLabel="Create Boost"
          />
        </div>
      )}

      {/* Boosts list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-2 border-[#FACC15]/30 border-t-[#FACC15] rounded-full animate-spin" />
        </div>
      ) : boosts.length === 0 ? (
        <div className="text-center py-16 text-[#94A3B8]/40">
          <Zap className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold mb-1">No price boosts yet</p>
          <p className="text-xs">Create your first boost to show enhanced odds on the sportsbook home page.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {boosts.map(boost => {
            const expired = boost.expiresAt && new Date(boost.expiresAt) < new Date();
            const isLive  = boost.isActive && !expired;
            const isEditing = editingId === boost.id;

            return (
              <div key={boost.id} className={cn(
                "rounded-xl border transition-all",
                isLive   ? "border-[#FACC15]/20 bg-[#FACC15]/3" : "border-white/[0.05] bg-[#0E1520] opacity-70"
              )}>
                {/* Collapsed row */}
                {!isEditing && (
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-[13px] font-bold text-white truncate">{boost.title}</p>
                        {expired
                          ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Expired</span>
                          : isLive
                            ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/20">Live</span>
                            : <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#334155]/40 text-[#475569] border border-white/[0.06]">Inactive</span>
                        }
                        {(boost.usageCount ?? 0) > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 flex items-center gap-0.5">
                            <TrendingUp className="h-2 w-2" />
                            {boost.usageCount} bet{boost.usageCount !== 1 ? 's' : ''} placed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#94A3B8]/60 truncate">
                        {boost.matchName} — {boost.selectionName}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] text-[#94A3B8]/40 line-through">{parseFloat(boost.originalOdds).toFixed(2)}</span>
                        <span className="text-[14px] font-black text-[#FACC15]">{parseFloat(boost.boostedOdds).toFixed(2)}</span>
                        <span className="text-[10px] text-[#00DFA9]/70 font-semibold">
                          +{Math.round(((parseFloat(boost.boostedOdds) - parseFloat(boost.originalOdds)) / parseFloat(boost.originalOdds)) * 100)}% better odds
                        </span>
                        {boost.maxStake && parseFloat(boost.maxStake) > 0 && (
                          <span className="text-[10px] text-[#94A3B8]/40">
                            Max {parseFloat(boost.maxStake).toFixed(0)} USDT
                          </span>
                        )}
                        {boost.expiresAt && (
                          <span className="text-[10px] text-[#94A3B8]/40 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(boost.expiresAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingId(boost.id); setShowCreate(false); }}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-[#94A3B8] hover:text-white"
                        title="Edit boost"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleMutation.mutate({ id: boost.id, isActive: !boost.isActive })}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        title={boost.isActive ? "Deactivate (hide from users)" : "Activate (show to users)"}
                      >
                        {boost.isActive
                          ? <ToggleRight className="h-5 w-5 text-[#00DFA9]" />
                          : <ToggleLeft className="h-5 w-5 text-[#475569]" />}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(boost.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-[#94A3B8] hover:text-red-400"
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline edit form */}
                {isEditing && (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[13px] font-bold text-[#FACC15] flex items-center gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Edit Boost
                      </h3>
                      <button onClick={() => setEditingId(null)} className="text-[#94A3B8] hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <BoostForm
                      initialValues={{
                        title:         boost.title,
                        matchId:       boost.matchId,
                        matchName:     boost.matchName,
                        leagueName:    boost.leagueName,
                        marketName:    boost.marketName,
                        selectionName: boost.selectionName,
                        originalOdds:  parseFloat(boost.originalOdds).toFixed(2),
                        boostedOdds:   parseFloat(boost.boostedOdds).toFixed(2),
                        maxStake:      boost.maxStake && parseFloat(boost.maxStake) > 0 ? parseFloat(boost.maxStake).toFixed(0) : "",
                        expiresAt:     boost.expiresAt ? new Date(boost.expiresAt).toISOString().slice(0, 16) : "",
                        homeTeam:      boost.homeTeam || "",
                        awayTeam:      boost.awayTeam || "",
                        commenceTime:  boost.commenceTime ? new Date(boost.commenceTime).toISOString().slice(0, 16) : "",
                        sportKey:      boost.sportKey || "",
                      }}
                      onSubmit={data => editMutation.mutate({ id: boost.id, data })}
                      onCancel={() => setEditingId(null)}
                      isPending={editMutation.isPending}
                      submitLabel="Save Changes"
                    />
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
