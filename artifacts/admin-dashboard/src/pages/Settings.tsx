import { useState, useEffect } from "react";
import { useAdminGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { toast } from "sonner";

/* ─── Components ─────────────────────────────────────────────── */
function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <h2 className="text-[13px] font-bold text-white">{title}</h2>
        {description && <p className="text-[11px] mt-0.5" style={{ color: "#334155" }}>{description}</p>}
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[12.5px] font-medium text-white">{label}</p>
        {description && <p className="text-[11px] mt-0.5" style={{ color: "#334155" }}>{description}</p>}
      </div>
      <button onClick={() => onChange(!value)}
        className="relative w-10 h-5 rounded-full transition-colors shrink-0"
        style={{ background: value ? "#00DFA9" : "rgba(255,255,255,0.1)" }}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
          style={{ left: value ? "calc(100% - 1.125rem)" : "2px" }}/>
      </button>
    </div>
  );
}

function InputRow({ label, description, value, type = "text", placeholder, onChange }: {
  label: string; description?: string; value: string; type?: string; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#334155" }}>{label}</label>
      {description && <p className="text-[11px] mb-1.5" style={{ color: "#334155" }}>{description}</p>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-[12.5px] outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F1F5F9" }}
        onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
      />
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function Settings() {
  const { data, isLoading } = useAdminGetSettings();
  const updateMut = useAdminUpdateSettings();

  const [vals, setVals] = useState<Record<string, string>>({
    maintenance_mode: "false",
    live_odds:        "true",
    accept_new_bets:  "true",
    referral_program: "true",
    min_bet:          "1",
    max_bet:          "1000",
    max_odds:         "500",
    platform_name:    "CupBett",
    support_email:    "",
  });
  const [dirty,  setDirty]  = useState(false);
  const [saving, setSaving] = useState(false);

  // Populate from DB once loaded
  useEffect(() => {
    if (data?.settings) {
      setVals(prev => ({ ...prev, ...data.settings }));
      setDirty(false);
    }
  }, [data?.settings]);

  function set(key: string, value: string) {
    setVals(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  }
  function toggle(key: string) {
    set(key, vals[key] === "true" ? "false" : "true");
  }
  function bool(key: string) { return vals[key] === "true"; }

  async function handleSave() {
    setSaving(true);
    try {
      await updateMut.mutateAsync({ data: { settings: vals } });
      toast.success("Settings saved", { description: "Platform configuration updated and persisted." });
      setDirty(false);
    } catch {
      toast.error("Save failed", { description: "Could not save settings. Try again." });
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-2xl animate-float-up">
        <div>
          <h1 className="text-[17px] font-bold text-white">Settings</h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#334155" }}>Platform-wide configuration</p>
        </div>
        {Array.from({length:3}).map((_,i) => (
          <div key={i} className="rounded-2xl h-32 animate-shimmer" style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}/>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl animate-float-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[17px] font-bold text-white tracking-tight">Settings</h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#334155" }}>Platform-wide configuration · saved to database</p>
        </div>
        {dirty && (
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full"
            style={{ background: "rgba(251,191,36,0.1)", color: "#FCD34D", border: "1px solid rgba(251,191,36,0.2)" }}>
            Unsaved changes
          </span>
        )}
      </div>

      <SectionCard title="Platform Status" description="Control core platform features">
        <ToggleRow
          label="Maintenance Mode"
          description="Disable the sportsbook for all users"
          value={bool("maintenance_mode")}
          onChange={() => toggle("maintenance_mode")}
        />
        <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }}/>
        <ToggleRow
          label="Live Odds"
          description="Fetch real-time odds from The Odds API"
          value={bool("live_odds")}
          onChange={() => toggle("live_odds")}
        />
        <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }}/>
        <ToggleRow
          label="Accept New Bets"
          description="Allow users to place bets"
          value={bool("accept_new_bets")}
          onChange={() => toggle("accept_new_bets")}
        />
        <div className="h-px" style={{ background: "rgba(255,255,255,0.04)" }}/>
        <ToggleRow
          label="Referral Program"
          description="Enable commission earning for referrers"
          value={bool("referral_program")}
          onChange={() => toggle("referral_program")}
        />
      </SectionCard>

      <SectionCard title="Betting Limits" description="Set minimum/maximum bet constraints">
        <div className="grid grid-cols-3 gap-3">
          <InputRow label="Min Bet (USDT)" type="number" value={vals.min_bet ?? "1"} onChange={v => set("min_bet", v)} placeholder="1"/>
          <InputRow label="Max Bet (USDT)" type="number" value={vals.max_bet ?? "1000"} onChange={v => set("max_bet", v)} placeholder="1000"/>
          <InputRow label="Max Odds" type="number" value={vals.max_odds ?? "500"} onChange={v => set("max_odds", v)} placeholder="500"/>
        </div>
      </SectionCard>

      <SectionCard title="Platform Info" description="Branding and contact configuration">
        <InputRow label="Platform Name" value={vals.platform_name ?? "CupBett"} onChange={v => set("platform_name", v)} placeholder="CupBett"/>
        <InputRow label="Support Email" type="email" value={vals.support_email ?? ""} onChange={v => set("support_email", v)} placeholder="support@cupbett.com"/>
      </SectionCard>

      <SectionCard title="API Integrations" description="Third-party service connections">
        <div className="space-y-3">
          {[
            { name: "The Odds API",     status: process.env.ODDS_API_KEY ? "connected" : "not_set", desc: "Live sports odds data provider" },
            { name: "Blockchain RPC",   status: "not_set", desc: "On-chain transaction verification" },
            { name: "Webhook Endpoint", status: "not_set", desc: "Event notifications for external systems" },
          ].map(item => (
            <div key={item.name} className="flex items-center justify-between gap-4 py-2.5 last:pb-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div>
                <p className="text-[12.5px] font-semibold text-white">{item.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#334155" }}>{item.desc}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={item.status === "connected"
                  ? { background: "rgba(0,223,169,0.1)", color: "#00DFA9", borderColor: "rgba(0,223,169,0.2)" }
                  : { background: "rgba(255,255,255,0.04)", color: "#334155", borderColor: "rgba(255,255,255,0.08)" }}>
                {item.status === "connected" ? "Connected" : "Not set"}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Save */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-5 py-2.5 rounded-xl text-[12.5px] font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "#00DFA9", color: "#0B1F0F" }}>
          {saving
            ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>Saving…</>
            : "Save Settings"}
        </button>
        <p className="text-[11px]" style={{ color: "#334155" }}>
          {dirty ? "You have unsaved changes." : "All changes are saved to the database."}
        </p>
      </div>
    </div>
  );
}
