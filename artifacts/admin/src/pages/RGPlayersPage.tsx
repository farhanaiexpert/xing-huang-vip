import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Shield, Clock, Ban, AlertTriangle, UserCheck, RefreshCw } from "lucide-react";
import { useState } from "react";

interface RGPlayer {
  userId: number;
  username: string;
  email: string;
  exclusion: {
    id: number;
    isPermanent: boolean;
    isTakeABreak: boolean;
    endsAt: string | null;
    reason: string | null;
    liftedAt: string | null;
    createdAt: string;
  } | null;
  limits: {
    id: number;
    limitType: string;
    period: string;
    amountUsdt: string;
    currentUsage: string;
    resetAt: string;
  }[];
}

function timeLeft(endsAt: string | null): string {
  if (!endsAt) return "Permanent";
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d remaining`;
  return `${h}h remaining`;
}

export default function RGPlayersPage() {
  const qc = useQueryClient();
  const [lifting, setLifting] = useState<number | null>(null);
  const [extendId, setExtendId] = useState<number | null>(null);
  const [extendHours, setExtendHours] = useState<string>("24");
  const [extending, setExtending] = useState<number | null>(null);

  const { data = [], isLoading, refetch } = useQuery<RGPlayer[]>({
    queryKey: ["admin-rg-players"],
    queryFn: () => api.get("/admin/rg/players"),
    refetchInterval: 60_000,
  });

  const liftMut = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/rg/exclusions/${id}`, { action: "lift" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rg-players"] });
      toast.success("Exclusion lifted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const extendMut = useMutation({
    mutationFn: ({ id, hours }: { id: number; hours: number }) =>
      api.patch(`/admin/rg/exclusions/${id}`, { action: "extend", extendHours: hours }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rg-players"] });
      toast.success("Exclusion extended");
      setExtendId(null);
      setExtending(null);
    },
    onError: (e: Error) => { toast.error(e.message); setExtending(null); },
  });

  const excluded = data.filter(p => p.exclusion && !p.exclusion.liftedAt);
  const withLimits = data.filter(p => p.limits.length > 0);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#38BDF8]/30 border-t-[#38BDF8] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#38BDF8]" /> Responsible Gambling Players
          </h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Players with self-exclusions or active spend limits
          </p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Players",    value: data.length,         icon: UserCheck, color: "text-[#38BDF8]" },
          { label: "Self-Excluded",    value: excluded.length,     icon: Ban,       color: "text-red-400" },
          { label: "Active Limits",    value: withLimits.length,   icon: AlertTriangle, color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className={cn("flex items-center gap-1.5 text-xs mb-1", color)}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </div>
            <p className="text-white font-bold text-lg">{value}</p>
          </div>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-xl p-12 text-center">
          <Shield className="w-10 h-10 text-[#475569] mx-auto mb-3" />
          <p className="text-[#94A3B8]">No players with active RG settings yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(player => (
            <div key={player.userId}
              className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white font-medium">{player.username}</p>
                  <p className="text-[#64748B] text-xs">{player.email}</p>
                </div>
                {player.exclusion && !player.exclusion.liftedAt && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                      player.exclusion.isPermanent
                        ? "bg-red-400/10 text-red-400 border-red-400/30"
                        : player.exclusion.isTakeABreak
                          ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                          : "bg-orange-400/10 text-orange-400 border-orange-400/30"
                    )}>
                      {player.exclusion.isPermanent ? "Permanent Exclusion" : player.exclusion.isTakeABreak ? "Take a Break" : "Self-Excluded"}
                    </span>
                    {!player.exclusion.isPermanent && (
                      <span className="text-[10px] text-[#94A3B8] flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {timeLeft(player.exclusion.endsAt)}
                      </span>
                    )}

                    {/* Extend inline UI */}
                    {!player.exclusion.isPermanent && extendId === player.exclusion.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={extendHours}
                          onChange={e => setExtendHours(e.target.value)}
                          className="w-16 text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-[#38BDF8]/60"
                          placeholder="hrs"
                        />
                        <span className="text-[10px] text-[#64748B]">h</span>
                        <button
                          disabled={extending === player.exclusion.id}
                          onClick={() => {
                            const h = parseInt(extendHours, 10);
                            if (!h || h < 1) { toast.error("Enter a valid number of hours"); return; }
                            setExtending(player.exclusion!.id);
                            extendMut.mutate({ id: player.exclusion!.id, hours: h });
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg border border-[#38BDF8]/40 text-[#38BDF8] hover:bg-[#38BDF8]/10 transition-colors disabled:opacity-50">
                          Confirm
                        </button>
                        <button
                          onClick={() => setExtendId(null)}
                          className="text-xs px-2 py-1 rounded-lg border border-white/10 text-[#94A3B8] hover:bg-white/5 transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      !player.exclusion.isPermanent && (
                        <button
                          onClick={() => { setExtendId(player.exclusion!.id); setExtendHours("24"); }}
                          className="text-xs px-2.5 py-1 rounded-lg border border-[#38BDF8]/40 text-[#38BDF8] hover:bg-[#38BDF8]/10 transition-colors">
                          Extend
                        </button>
                      )
                    )}

                    <button
                      disabled={lifting === player.exclusion.id}
                      onClick={() => {
                        setLifting(player.exclusion!.id);
                        liftMut.mutate(player.exclusion!.id);
                        setTimeout(() => setLifting(null), 1000);
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg border border-[#00DFA9]/40 text-[#00DFA9] hover:bg-[#00DFA9]/10 transition-colors">
                      Lift
                    </button>
                  </div>
                )}
                {player.exclusion?.liftedAt && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-[#64748B] border border-white/10">
                    Exclusion Lifted
                  </span>
                )}
              </div>

              {player.limits.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                  {player.limits.map(lim => {
                    const used = parseFloat(lim.currentUsage);
                    const cap = parseFloat(lim.amountUsdt);
                    const pct = Math.min(100, Math.round((used / cap) * 100));
                    return (
                      <div key={lim.id}
                        className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-[#94A3B8] capitalize">{lim.limitType} {lim.period}:</span>
                        <span className="text-white font-mono">{used.toFixed(2)}/{cap.toFixed(2)} USDT</span>
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-400" : pct >= 60 ? "bg-yellow-400" : "bg-[#00DFA9]")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={cn("font-medium", pct >= 90 ? "text-red-400" : pct >= 60 ? "text-yellow-400" : "text-[#00DFA9]")}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {player.exclusion?.reason && (
                <p className="text-xs text-[#64748B] italic">"{player.exclusion.reason}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
