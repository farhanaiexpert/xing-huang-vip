import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetCommissionSettings,
  useAdminUpdateCommissionSettings,
  getAdminGetCommissionSettingsQueryKey,
} from "@workspace/api-client-react";
import { toast } from "sonner";

const LEVELS = [1, 2, 3];
const DEFAULTS: Record<number, string> = { 1: "0.05", 2: "0.03", 3: "0.01" };
const LEVEL_LABELS: Record<number, string> = {
  1: "Direct referral (Level 1)",
  2: "Referral's referral (Level 2)",
  3: "Third-degree referral (Level 3)",
};

export default function Commission() {
  const queryClient    = useQueryClient();
  const { data, isLoading, error } = useAdminGetCommissionSettings();
  const updateSettings = useAdminUpdateCommissionSettings();

  const [rates, setRates] = useState<Record<number, string>>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.settings && data.settings.length > 0) {
      const r: Record<number, string> = { ...DEFAULTS };
      data.settings.forEach(s => { r[s.level] = s.rate; });
      setRates(r);
      setDirty(false);
    }
  }, [data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const settings = LEVELS.map(level => ({ level, rate: rates[level] ?? "0" }));
    try {
      await updateSettings.mutateAsync({ data: { settings } });
      queryClient.invalidateQueries({ queryKey: getAdminGetCommissionSettingsQueryKey() });
      toast.success("Commission rates saved", { description: "All levels updated successfully." });
      setDirty(false);
    } catch {
      toast.error("Save failed", { description: "Could not update commission settings." });
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-foreground">Commission Settings</h1>
        <p className="text-xs text-[#4A5568] mt-0.5">Configure the 3-level referral commission rates</p>
      </div>

      <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl p-5 space-y-1">
        <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/15 rounded-lg px-3.5 py-3 mb-5">
          <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[11px] text-[#8A9BB3] leading-relaxed">
            Rates are applied when a referred user places a bet. Enter as a decimal — e.g. <span className="font-mono text-foreground bg-white/5 px-1 rounded">0.05</span> = 5%. Changes take effect immediately for new bets.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {LEVELS.map(l => (
              <div key={l} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                <div className="flex-1 h-10 rounded-lg bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">
            Failed to load commission settings
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {LEVELS.map(level => {
              const rateVal = rates[level] ?? DEFAULTS[level];
              const pct = isNaN(parseFloat(rateVal)) ? "—" : `${(parseFloat(rateVal) * 100).toFixed(2)}%`;
              return (
                <div key={level} className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">L{level}</span>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-[#4A5568] mb-1.5 uppercase tracking-wider">
                      {LEVEL_LABELS[level]}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={rateVal}
                        onChange={e => { setRates({ ...rates, [level]: e.target.value }); setDirty(true); }}
                        className="w-full px-3 py-2.5 pr-16 rounded-lg bg-background border border-white/[0.08] text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary pointer-events-none">{pct}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={updateSettings.isPending}
                className="px-5 py-2.5 rounded-lg bg-primary text-[#0B0F14] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateSettings.isPending ? "Saving…" : "Save Changes"}
              </button>
              {dirty && !updateSettings.isPending && (
                <span className="text-[11px] text-amber-400">Unsaved changes</span>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">How commissions work</h2>
        <div className="space-y-3">
          {[
            { level: 1, label: "Direct referrals", desc: "User A refers User B — User A earns L1 commission on every bet B places." },
            { level: 2, label: "Second degree",    desc: "User B refers User C — User A (original referrer) earns L2 commission on C's bets." },
            { level: 3, label: "Third degree",     desc: "User C refers User D — User A earns L3 commission on D's bets." },
          ].map(item => (
            <div key={item.level} className="flex gap-3">
              <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{item.level}</span>
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">{item.label}</div>
                <div className="text-[11px] text-[#4A5568] mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
