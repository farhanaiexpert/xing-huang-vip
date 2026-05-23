import { useState } from "react";
import { toast } from "sonner";

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-[11px] text-[#4A5568] mt-0.5">{description}</p>}
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-[11px] text-[#4A5568] mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? "bg-primary" : "bg-white/10"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? "left-[calc(100%-1.125rem)]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function InputRow({ label, description, value, placeholder, onChange }: { label: string; description?: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1">{label}</label>
      {description && <p className="text-[11px] text-[#4A5568] mb-1.5">{description}</p>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-background border border-white/[0.08] text-sm text-foreground placeholder:text-[#4A5568] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
      />
    </div>
  );
}

export default function Settings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [liveOdds, setLiveOdds]               = useState(true);
  const [newBets, setNewBets]                 = useState(true);
  const [referrals, setReferrals]             = useState(true);
  const [maxBet, setMaxBet]                   = useState("1000");
  const [minBet, setMinBet]                   = useState("1");
  const [maxOdds, setMaxOdds]                 = useState("500");
  const [platformName, setPlatformName]       = useState("CupBett");
  const [supportEmail, setSupportEmail]       = useState("");

  function handleSave() {
    toast.success("Settings saved", { description: "Platform configuration updated." });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
        <p className="text-xs text-[#4A5568] mt-0.5">Platform-wide configuration</p>
      </div>

      <SectionCard title="Platform Status" description="Control core platform features">
        <ToggleRow
          label="Maintenance Mode"
          description="Temporarily disable the sportsbook for users"
          value={maintenanceMode}
          onChange={v => { setMaintenanceMode(v); toast.info(v ? "Maintenance mode enabled" : "Maintenance mode disabled"); }}
        />
        <ToggleRow label="Live Odds" description="Fetch real-time odds from The Odds API" value={liveOdds} onChange={setLiveOdds} />
        <ToggleRow label="Accept New Bets" description="Allow users to place bets" value={newBets} onChange={setNewBets} />
        <ToggleRow label="Referral Program" description="Enable commission earning for referrers" value={referrals} onChange={setReferrals} />
      </SectionCard>

      <SectionCard title="Betting Limits" description="Set minimum/maximum bet constraints">
        <div className="grid grid-cols-3 gap-3">
          <InputRow label="Min Bet (USDT)" value={minBet} onChange={setMinBet} placeholder="1" />
          <InputRow label="Max Bet (USDT)" value={maxBet} onChange={setMaxBet} placeholder="1000" />
          <InputRow label="Max Odds" value={maxOdds} onChange={setMaxOdds} placeholder="500" />
        </div>
      </SectionCard>

      <SectionCard title="Platform Info" description="Branding and contact configuration">
        <InputRow label="Platform Name" value={platformName} onChange={setPlatformName} placeholder="CupBett" />
        <InputRow label="Support Email" value={supportEmail} onChange={setSupportEmail} placeholder="support@cupbett.com" />
      </SectionCard>

      <SectionCard title="API Integrations" description="Third-party service connections">
        <div className="space-y-3">
          {[
            { name: "The Odds API", status: "connected", desc: "Live sports odds data provider" },
            { name: "Blockchain RPC", status: "not_set", desc: "On-chain transaction verification" },
            { name: "Webhook Endpoint", status: "not_set", desc: "Event notifications for external systems" },
          ].map(item => (
            <div key={item.name} className="flex items-center justify-between gap-4 py-2.5 border-b border-white/[0.04] last:border-0">
              <div>
                <div className="text-xs font-semibold text-foreground">{item.name}</div>
                <div className="text-[10px] text-[#4A5568] mt-0.5">{item.desc}</div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.status === "connected" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-[#4A5568] border-white/10"}`}>
                {item.status === "connected" ? "Connected" : "Not set"}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg bg-primary text-[#0B0F14] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Save Settings
        </button>
        <p className="text-[11px] text-[#4A5568]">Changes to toggles take effect immediately.</p>
      </div>
    </div>
  );
}
