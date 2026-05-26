import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PlatformSetting } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Settings, Save, AlertTriangle, ToggleLeft, ToggleRight, DollarSign, Shield } from "lucide-react";

const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors";

interface SettingConfig {
  key: string;
  label: string;
  description: string;
  type: "boolean" | "number" | "text";
  section: string;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
}

const SETTING_CONFIGS: SettingConfig[] = [
  { key: "maintenance_mode",         label: "Maintenance Mode",          description: "Take the sportsbook offline for all players. Only admins can log in.",  type: "boolean", section: "Platform",  danger: true },
  { key: "winspin_enabled",          label: "WinSpin",                   description: "Show and allow the prize wheel for all players.",                        type: "boolean", section: "Features"  },
  { key: "promotions_enabled",       label: "Promotions",                description: "Show the Promotions section on the player app.",                         type: "boolean", section: "Features"  },
  { key: "prediction_pools_enabled", label: "Prediction Pools",          description: "Show and allow entry into Prediction Pools.",                            type: "boolean", section: "Features"  },
  { key: "max_bet_amount",           label: "Max Bet Amount (USDT)",     description: "Maximum amount a player can stake on a single bet.",                    type: "number",  section: "Betting"   },
  { key: "max_daily_bet_count",      label: "Max Daily Bets Per User",   description: "Maximum number of bets a player can place in one day.",                 type: "number",  section: "Betting"   },
  { key: "min_deposit_amount",       label: "Min Deposit (USDT)",        description: "Minimum deposit amount a player can request.",                          type: "number",  section: "Finance"   },
  { key: "min_withdrawal_amount",    label: "Min Withdrawal (USDT)",     description: "Minimum withdrawal amount a player can request.",                       type: "number",  section: "Finance"   },
  { key: "global_margin_pct",        label: "Global Margin %",           description: "House margin applied to all odds globally (0–20%). Per-sport overrides take precedence.", type: "number", section: "Odds & Risk" },
  { key: "liability_threshold_usdt", label: "Liability Threshold (USDT)",description: "Auto-suspend a market when its open payout exposure exceeds this amount.", type: "number", section: "Odds & Risk" },
];

const SECTIONS = ["Platform", "Features", "Betting", "Finance", "Odds & Risk"];

function BooleanToggle({ value, onChange, danger }: { value: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn("transition-colors", value
        ? danger ? "text-[#EF4444]" : "text-[#00DFA9]"
        : "text-[#475569]"
      )}
    >
      {value
        ? <ToggleRight className="w-8 h-8" />
        : <ToggleLeft  className="w-8 h-8" />
      }
    </button>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const { data: settings = [], isLoading } = useQuery<PlatformSetting[]>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get("/admin/settings"),
  });

  useEffect(() => {
    if (settings.length > 0) {
      const map: Record<string, string> = {};
      settings.forEach(s => { map[s.key] = s.value; });
      setLocalValues(map);
      setDirty(new Set());
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (updates: Record<string, string>) => api.patch("/admin/settings", updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Settings saved");
      setDirty(new Set());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function setValue(key: string, value: string) {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  }

  function handleSave() {
    const updates: Record<string, string> = {};
    dirty.forEach(key => { updates[key] = localValues[key]; });
    saveMut.mutate(updates);
  }

  function renderControl(cfg: SettingConfig) {
    const val = localValues[cfg.key] ?? "";
    if (cfg.type === "boolean") {
      return (
        <BooleanToggle
          value={val === "true"}
          onChange={v => setValue(cfg.key, String(v))}
          danger={cfg.danger}
        />
      );
    }
    return (
      <input
        type="number"
        className={cn(inp, "w-28 text-right")}
        value={val}
        onChange={e => setValue(cfg.key, e.target.value)}
        min={0}
      />
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-[#475569] text-sm">Loading settings…</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#94A3B8]" /> Platform Settings
          </h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Changes are saved to the database and apply immediately</p>
        </div>
        <button
          onClick={handleSave}
          disabled={dirty.size === 0 || saveMut.isPending}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            dirty.size > 0
              ? "bg-[#00DFA9] text-[#0B0F14] hover:brightness-110"
              : "bg-white/5 text-[#475569] cursor-not-allowed"
          )}
        >
          <Save className="w-4 h-4" />
          {dirty.size > 0 ? `Save ${dirty.size} change${dirty.size > 1 ? "s" : ""}` : "No changes"}
        </button>
      </div>

      {/* Maintenance mode banner */}
      {localValues["maintenance_mode"] === "true" && (
        <div className="flex items-center gap-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0" />
          <p className="text-sm text-[#EF4444]">
            <strong>Maintenance mode is ON.</strong> The sportsbook is offline for all players right now.
          </p>
        </div>
      )}

      {/* Sections */}
      {SECTIONS.map(section => {
        const configs = SETTING_CONFIGS.filter(c => c.section === section);
        return (
          <div key={section} className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-2">
              {section === "Platform"    && <Shield     className="w-4 h-4 text-[#EF4444]" />}
              {section === "Features"    && <ToggleRight className="w-4 h-4 text-[#38BDF8]" />}
              {section === "Betting"     && <DollarSign className="w-4 h-4 text-[#FACC15]" />}
              {section === "Finance"     && <DollarSign className="w-4 h-4 text-[#00DFA9]" />}
              {section === "Odds & Risk" && <Shield     className="w-4 h-4 text-[#00DFA9]" />}
              <span className="text-sm font-semibold text-white">{section}</span>
            </div>
            <div className="divide-y divide-white/5">
              {configs.map(cfg => (
                <div key={cfg.key} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-medium", cfg.danger ? "text-[#EF4444]" : "text-white")}>
                        {cfg.label}
                      </p>
                      {dirty.has(cfg.key) ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#FACC15]/15 text-[#FACC15] rounded-full">unsaved</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[#475569] mt-0.5">{cfg.description}</p>
                  </div>
                  <div className="shrink-0">
                    {renderControl(cfg)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
