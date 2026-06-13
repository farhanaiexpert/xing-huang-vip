import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PlatformSetting } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Settings, Save, AlertTriangle, ToggleLeft, ToggleRight, DollarSign, Shield, ShieldAlert, ShieldCheck, ShieldOff, Smartphone, X, QrCode } from "lucide-react";

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
  { key: "global_margin_pct",           label: "Global Margin %",                  description: "House margin applied to all odds globally (0–20%). Per-sport overrides take precedence.", type: "number", section: "Odds & Risk" },
  { key: "liability_threshold_usdt",    label: "Liability Threshold (USDT)",        description: "Auto-suspend a market when its open payout exposure exceeds this amount.", type: "number", section: "Odds & Risk" },
  { key: "max_win_per_day",             label: "Max Win Per Day (USDT)",            description: "Maximum total winnings a player can receive in one calendar day. Bets that would exceed this cap are rejected.", type: "number", section: "Risk Controls" },
  { key: "bet_velocity_limit",          label: "Bet Velocity Limit",               description: "If a player places this many bets within the velocity window, their account is flagged for review (bet still goes through).", type: "number", section: "Risk Controls" },
  { key: "bet_velocity_window_minutes", label: "Velocity Window (minutes)",        description: "Rolling time window in minutes used for the bet velocity check.", type: "number", section: "Risk Controls" },
];

const SECTIONS = ["Platform", "Features", "Betting", "Finance", "Odds & Risk", "Risk Controls"];

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

// ── TOTP 2FA Card ─────────────────────────────────────────────────────────────
function TotpCard() {
  const qc = useQueryClient();
  const [setupOpen, setSetupOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [qrDataUri, setQrDataUri] = useState("");
  const [pendingSecret, setPendingSecret] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [removeCode, setRemoveCode] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  const { data: status, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["totp-status"],
    queryFn: () => api.get("/auth/admin/totp/status"),
  });

  async function openSetup() {
    setSetupLoading(true);
    setConfirmCode("");
    setConfirmError("");
    try {
      const res = await api.post<{ secret: string; qrDataUri: string }>("/auth/admin/totp/setup", {});
      setQrDataUri(res.qrDataUri);
      setPendingSecret(res.secret);
      setSetupOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate QR code");
    } finally {
      setSetupLoading(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setConfirmError("");
    setConfirmLoading(true);
    try {
      await api.post("/auth/admin/totp/confirm", { secret: pendingSecret, code: confirmCode });
      toast.success("Two-factor authentication enabled");
      qc.invalidateQueries({ queryKey: ["totp-status"] });
      setSetupOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Incorrect code";
      setConfirmError(msg);
      setConfirmCode("");
    } finally {
      setConfirmLoading(false);
    }
  }

  async function confirmRemove(e: React.FormEvent) {
    e.preventDefault();
    setRemoveError("");
    setRemoveLoading(true);
    try {
      await api.post("/auth/admin/totp/remove", { code: removeCode });
      toast.success("Two-factor authentication removed");
      qc.invalidateQueries({ queryKey: ["totp-status"] });
      setRemoveOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Incorrect code";
      setRemoveError(msg);
      setRemoveCode("");
    } finally {
      setRemoveLoading(false);
    }
  }

  return (
    <div className="bg-[#111827] border border-white/8 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/8 flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-[#38BDF8]" />
        <span className="text-sm font-semibold text-white">Two-Factor Authentication</span>
      </div>

      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Google Authenticator (TOTP)</p>
          <p className="text-xs text-[#475569] mt-0.5">
            Require a 6-digit code from your authenticator app on every login.
          </p>
        </div>
        <div className="shrink-0">
          {isLoading ? (
            <div className="w-16 h-6 bg-white/5 rounded-full animate-pulse" />
          ) : status?.enabled ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-[#00DFA9] bg-[#00DFA9]/10 border border-[#00DFA9]/25 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Enabled
              </span>
              <button
                onClick={() => { setRemoveOpen(true); setRemoveCode(""); setRemoveError(""); }}
                className="flex items-center gap-1 text-xs font-medium text-[#EF4444] hover:text-[#EF4444]/80 bg-[#EF4444]/8 hover:bg-[#EF4444]/15 border border-[#EF4444]/20 px-2.5 py-1 rounded-full transition-all"
              >
                <ShieldOff className="w-3 h-3" /> Remove
              </button>
            </div>
          ) : (
            <button
              onClick={openSetup}
              disabled={setupLoading}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0B0F14] bg-[#00DFA9] hover:bg-[#00DFA9]/90 px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
            >
              {setupLoading ? (
                <span className="w-3 h-3 border border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" />
              ) : (
                <QrCode className="w-3 h-3" />
              )}
              Set up 2FA
            </button>
          )}
        </div>
      </div>

      {/* Setup dialog */}
      {setupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Set up authenticator</h2>
              <button onClick={() => setSetupOpen(false)} className="text-[#475569] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] mb-4">
              Scan this QR code with Google Authenticator, Authy, or any TOTP app. Then enter the 6-digit code to confirm.
            </p>

            {qrDataUri && (
              <div className="flex justify-center mb-4">
                <div className="bg-white p-2 rounded-lg">
                  <img src={qrDataUri} alt="TOTP QR Code" className="w-40 h-40" />
                </div>
              </div>
            )}

            <form onSubmit={confirmSetup} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Confirm code from app</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={confirmCode}
                  onChange={e => { setConfirmCode(e.target.value.replace(/\D/g, "")); setConfirmError(""); }}
                  placeholder="000000"
                  autoFocus
                  className={cn(
                    "w-full bg-white/4 border rounded-lg px-3.5 py-2.5 text-sm text-white text-center tracking-[0.4em] placeholder:text-[#374151] placeholder:tracking-normal focus:outline-none focus:bg-white/5 transition-all font-mono",
                    confirmError ? "border-[#EF4444]/60" : "border-white/10 focus:border-[#00DFA9]/60"
                  )}
                  autoComplete="one-time-code"
                />
                {confirmError && <p className="text-xs text-[#EF4444] mt-1.5">{confirmError}</p>}
              </div>
              <button
                type="submit"
                disabled={confirmLoading || confirmCode.length !== 6}
                className="w-full bg-[#00DFA9] hover:bg-[#00DFA9]/90 text-[#0B0F14] font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" />
                    Activating…
                  </span>
                ) : "Activate 2FA"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Remove dialog */}
      {removeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Remove 2FA</h2>
              <button onClick={() => setRemoveOpen(false)} className="text-[#475569] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B] mb-4">
              Enter a current code from your authenticator app to disable 2FA. This cannot be undone.
            </p>

            <form onSubmit={confirmRemove} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Current code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={removeCode}
                  onChange={e => { setRemoveCode(e.target.value.replace(/\D/g, "")); setRemoveError(""); }}
                  placeholder="000000"
                  autoFocus
                  className={cn(
                    "w-full bg-white/4 border rounded-lg px-3.5 py-2.5 text-sm text-white text-center tracking-[0.4em] placeholder:text-[#374151] placeholder:tracking-normal focus:outline-none focus:bg-white/5 transition-all font-mono",
                    removeError ? "border-[#EF4444]/60" : "border-white/10 focus:border-[#00DFA9]/60"
                  )}
                  autoComplete="one-time-code"
                />
                {removeError && <p className="text-xs text-[#EF4444] mt-1.5">{removeError}</p>}
              </div>
              <button
                type="submit"
                disabled={removeLoading || removeCode.length !== 6}
                className="w-full bg-[#EF4444] hover:bg-[#EF4444]/90 text-white font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removeLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Removing…
                  </span>
                ) : "Remove 2FA"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
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

      {/* 2FA card */}
      <TotpCard />

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
              {section === "Odds & Risk"    && <Shield      className="w-4 h-4 text-[#00DFA9]" />}
              {section === "Risk Controls" && <ShieldAlert className="w-4 h-4 text-[#EF4444]" />}
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
