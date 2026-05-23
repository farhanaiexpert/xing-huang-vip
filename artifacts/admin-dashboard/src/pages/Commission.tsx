import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetCommissionSettings,
  useAdminUpdateCommissionSettings,
  getAdminGetCommissionSettingsQueryKey,
} from "@workspace/api-client-react";
import { toast } from "sonner";

const LEVELS = [1, 2, 3];

function EmptyIllustration() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <svg className="w-14 h-14 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="22" />
        <path d="M32 22 v10 l6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm">No commission settings found</p>
    </div>
  );
}

export default function Commission() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminGetCommissionSettings();
  const updateSettings = useAdminUpdateCommissionSettings();

  const [rates, setRates] = useState<Record<number, string>>({ 1: "0.05", 2: "0.03", 3: "0.01" });

  useEffect(() => {
    if (data?.settings && data.settings.length > 0) {
      const r: Record<number, string> = { 1: "0.05", 2: "0.03", 3: "0.01" };
      data.settings.forEach((s) => {
        r[s.level] = s.rate;
      });
      setRates(r);
    }
  }, [data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const settings = LEVELS.map((level) => ({
      level,
      rate: rates[level] ?? "0",
    }));
    try {
      await updateSettings.mutateAsync({ data: { settings } });
      queryClient.invalidateQueries({ queryKey: getAdminGetCommissionSettingsQueryKey() });
      toast.success("Settings saved", {
        description: "Commission rates have been updated successfully.",
      });
    } catch {
      toast.error("Save failed", {
        description: "Could not update commission settings. Please try again.",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-lg max-w-2xl">
        Failed to load commission settings
      </div>
    );
  }

  const isEmpty = !data?.settings || data.settings.length === 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Commission Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the 3-level referral commission rates
        </p>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6">
        {isEmpty ? (
          <EmptyIllustration />
        ) : (
          <>
            <div className="mb-5 flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rates apply when a referred user places a bet. Level 1 = direct referral, Level 2 = second-degree, Level 3 = third-degree. Enter as a decimal — e.g. <span className="font-mono text-foreground">0.05</span> = 5%.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {LEVELS.map((level) => {
                const rateVal = rates[level] ?? "0";
                const pct = isNaN(parseFloat(rateVal))
                  ? "—"
                  : `${(parseFloat(rateVal) * 100).toFixed(1)}%`;

                return (
                  <div key={level} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">L{level}</span>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Level {level} Rate
                        {level === 1 && <span className="ml-1 normal-case font-normal text-muted-foreground/70">(direct referral)</span>}
                        {level === 2 && <span className="ml-1 normal-case font-normal text-muted-foreground/70">(referral's referral)</span>}
                        {level === 3 && <span className="ml-1 normal-case font-normal text-muted-foreground/70">(third degree)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          max="1"
                          value={rateVal}
                          onChange={(e) => setRates({ ...rates, [level]: e.target.value })}
                          className="w-full px-3 py-2.5 pr-16 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary pointer-events-none">
                          {pct}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateSettings.isPending}
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateSettings.isPending ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
