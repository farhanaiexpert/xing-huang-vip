import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminSportControl } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Globe, PauseCircle, PlayCircle, TrendingUp, EyeOff, Eye, Percent } from "lucide-react";
import { useState } from "react";

const MULTIPLIER_OPTIONS = [
  { label: "×0.90", value: "0.9000" },
  { label: "×0.95", value: "0.9500" },
  { label: "×1.00", value: "1.0000" },
  { label: "×1.05", value: "1.0500" },
  { label: "×1.10", value: "1.1000" },
];

const MARGIN_OPTIONS = [
  { label: "Global", value: null },
  { label: "0%", value: "0" },
  { label: "2%", value: "2" },
  { label: "5%", value: "5" },
  { label: "8%", value: "8" },
  { label: "10%", value: "10" },
];

function MultiplierSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {MULTIPLIER_OPTIONS.map(o => (
        <button key={o.value} type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors",
            parseFloat(value) === parseFloat(o.value)
              ? "bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40"
              : "bg-white/5 text-[#475569] hover:text-[#94A3B8] border border-transparent"
          )}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MarginSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="flex gap-1">
      {MARGIN_OPTIONS.map(o => {
        const active = o.value === null ? value === null : value === o.value;
        return (
          <button key={String(o.value)} type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors",
              active
                ? "bg-[#00DFA9]/20 text-[#00DFA9] border border-[#00DFA9]/40"
                : "bg-white/5 text-[#475569] hover:text-[#94A3B8] border border-transparent"
            )}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function MarketsPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<number | null>(null);

  const { data: controls = [], isLoading } = useQuery<AdminSportControl[]>({
    queryKey: ["admin-sport-controls"],
    queryFn: () => api.get("/admin/markets"),
  });

  async function patch(id: number, body: Partial<AdminSportControl> & { marginOverride?: string | null }) {
    setSaving(id);
    try {
      await api.patch(`/admin/markets/${id}`, body);
      qc.invalidateQueries({ queryKey: ["admin-sport-controls"] });
      toast.success("Market updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  const toggleMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/admin/markets/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-sport-controls"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const suspended = controls.filter(c => c.isSuspended).length;
  const disabled   = controls.filter(c => !c.isEnabled).length;
  const withMult   = controls.filter(c => parseFloat(c.oddsMultiplier) !== 1).length;
  const withMargin = controls.filter(c => c.marginOverride !== null).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#38BDF8]" /> Markets & Sports Control
        </h1>
        <p className="text-sm text-[#94A3B8] mt-0.5">Enable/disable sports, suspend betting, adjust odds multipliers and per-sport margin overrides</p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: `${controls.length} sports`, color: "bg-white/5 text-[#94A3B8]" },
          { label: `${suspended} suspended`, color: suspended > 0 ? "bg-[#EF4444]/10 text-[#EF4444]" : "bg-white/5 text-[#475569]" },
          { label: `${disabled} hidden`, color: disabled > 0 ? "bg-[#FACC15]/10 text-[#FACC15]" : "bg-white/5 text-[#475569]" },
          { label: `${withMult} with multiplier`, color: withMult > 0 ? "bg-[#38BDF8]/10 text-[#38BDF8]" : "bg-white/5 text-[#475569]" },
          { label: `${withMargin} margin override`, color: withMargin > 0 ? "bg-[#00DFA9]/10 text-[#00DFA9]" : "bg-white/5 text-[#475569]" },
        ].map(c => (
          <span key={c.label} className={cn("text-xs font-medium px-3 py-1 rounded-full", c.color)}>{c.label}</span>
        ))}
      </div>

      {/* Margin info banner */}
      <div className="flex items-start gap-3 bg-[#00DFA9]/5 border border-[#00DFA9]/15 rounded-xl p-3">
        <Percent className="w-4 h-4 text-[#00DFA9] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#94A3B8]">
          <span className="text-[#00DFA9] font-medium">Margin Override</span> — sets per-sport house edge.
          "Global" uses the platform-wide margin from Settings. Formula: displayedOdds = trueOdds × (1 − margin%).
          E.g. odds 2.00 at 5% → shown as 1.90.
        </p>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-white/8">
          <span className="text-sm font-semibold text-white">Sport / League Settings</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[#475569] text-sm">Loading…</div>
        ) : controls.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-[#475569] text-sm">No sports have been configured yet.</p>
            <p className="text-xs text-[#374151]">Sports appear here automatically when odds are first fetched.</p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 text-[#475569] text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-2.5">League</th>
                <th className="text-left px-4 py-2.5 hidden md:table-cell">Key</th>
                <th className="text-center px-4 py-2.5">Visible</th>
                <th className="text-center px-4 py-2.5">Betting</th>
                <th className="text-center px-4 py-2.5">Multiplier</th>
                <th className="text-center px-4 py-2.5">Margin Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {controls.map(c => (
                <tr key={c.id} className={cn("hover:bg-white/2 transition-colors", !c.isEnabled && "opacity-50")}>
                  <td className="px-5 py-3">
                    <span className="text-white font-medium">{c.leagueName}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <code className="text-[10px] text-[#475569] bg-white/5 px-1.5 py-0.5 rounded">{c.sportKey}</code>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      disabled={saving === c.id}
                      onClick={() => toggleMut.mutate({ id: c.id, body: { isEnabled: !c.isEnabled } })}
                      title={c.isEnabled ? "Hide from sportsbook" : "Show in sportsbook"}
                      className={cn("transition-colors", c.isEnabled ? "text-[#00DFA9] hover:text-[#00DFA9]/70" : "text-[#475569] hover:text-[#94A3B8]")}
                    >
                      {c.isEnabled ? <Eye className="w-4 h-4 mx-auto" /> : <EyeOff className="w-4 h-4 mx-auto" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      disabled={saving === c.id}
                      onClick={() => toggleMut.mutate({ id: c.id, body: { isSuspended: !c.isSuspended } })}
                      title={c.isSuspended ? "Resume betting" : "Suspend betting"}
                      className={cn("transition-colors", c.isSuspended ? "text-[#EF4444] hover:text-[#EF4444]/70" : "text-[#00DFA9] hover:text-[#00DFA9]/70")}
                    >
                      {c.isSuspended
                        ? <PauseCircle className="w-4 h-4 mx-auto" />
                        : <PlayCircle className="w-4 h-4 mx-auto" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <MultiplierSelect
                        value={c.oddsMultiplier}
                        onChange={v => patch(c.id, { oddsMultiplier: v })}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <MarginSelect
                        value={c.marginOverride}
                        onChange={v => patch(c.id, { marginOverride: v })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-[#475569]">
        <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-[#00DFA9]" /> Visible in sportsbook</span>
        <span className="flex items-center gap-1.5"><EyeOff className="w-3.5 h-3.5" /> Hidden from sportsbook</span>
        <span className="flex items-center gap-1.5"><PlayCircle className="w-3.5 h-3.5 text-[#00DFA9]" /> Betting open</span>
        <span className="flex items-center gap-1.5"><PauseCircle className="w-3.5 h-3.5 text-[#EF4444]" /> Betting suspended</span>
        <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-[#38BDF8]" /> Multiplier: raw odds price adjustment</span>
        <span className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5 text-[#00DFA9]" /> Margin: house edge % (overrides global setting)</span>
      </div>
    </div>
  );
}
