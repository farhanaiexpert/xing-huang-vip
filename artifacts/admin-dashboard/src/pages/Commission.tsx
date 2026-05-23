import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetCommissionSettings,
  useAdminUpdateCommissionSettings,
  getAdminGetCommissionSettingsQueryKey,
} from "@workspace/api-client-react";

export default function Commission() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminGetCommissionSettings();
  const updateSettings = useAdminUpdateCommissionSettings();

  const [rates, setRates] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (data?.settings) {
      const r: Record<number, string> = {};
      data.settings.forEach((s) => {
        r[s.level] = s.rate;
      });
      setRates(r);
    }
  }, [data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setSaveError("");
    const settings = Object.entries(rates).map(([level, rate]) => ({
      level: parseInt(level),
      rate,
    }));
    try {
      await updateSettings.mutateAsync({ data: { settings } });
      queryClient.invalidateQueries({ queryKey: getAdminGetCommissionSettingsQueryKey() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Failed to save commission settings");
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
      <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-lg">
        Failed to load commission settings
      </div>
    );
  }

  const levels = data?.settings ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Commission Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the 3-level referral commission rates
        </p>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6">
        <div className="mb-5 flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-lg px-4 py-3">
          <svg className="w-4 h-4 text-primary mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Rates are applied when a referred user places a bet. Level 1 = direct referral, Level 2 = referral's referral, Level 3 = third degree. Enter as a decimal (e.g. <span className="text-foreground font-mono">0.05</span> = 5%).
          </p>
        </div>

        {levels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No commission settings configured</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {levels
              .slice()
              .sort((a, b) => a.level - b.level)
              .map((s) => (
                <div key={s.level} className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">L{s.level}</span>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Level {s.level} Commission Rate
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          max="1"
                          value={rates[s.level] ?? s.rate}
                          onChange={(e) => setRates({ ...rates, [s.level]: e.target.value })}
                          className="w-full px-3 py-2 pr-10 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {rates[s.level] != null
                            ? `${(parseFloat(rates[s.level]) * 100).toFixed(1)}%`
                            : `${(parseFloat(s.rate) * 100).toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={updateSettings.isPending}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateSettings.isPending ? "Saving…" : "Save Settings"}
              </button>
              {saved && (
                <span className="text-sm text-primary flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
              {saveError && (
                <span className="text-sm text-destructive">{saveError}</span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
