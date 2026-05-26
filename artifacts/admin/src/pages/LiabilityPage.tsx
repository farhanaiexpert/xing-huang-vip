import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, TrendingUp, DollarSign, RefreshCw, ShieldOff, ShieldCheck, Activity,
} from "lucide-react";
import { useState } from "react";

interface MarketLiability {
  id: number;
  eventId: string;
  eventName: string;
  sport: string;
  marketType: string;
  selection: string;
  totalStake: string;
  potentialPayout: string;
  betCount: number;
  isSuspended: boolean;
  updatedAt: string;
}

function risk(payout: number, threshold: number) {
  const ratio = payout / threshold;
  if (ratio >= 1) return { label: "Critical", color: "text-red-400 bg-red-400/10 border-red-400/30" };
  if (ratio >= 0.75) return { label: "High", color: "text-orange-400 bg-orange-400/10 border-orange-400/30" };
  if (ratio >= 0.5) return { label: "Medium", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" };
  return { label: "Low", color: "text-[#00DFA9] bg-[#00DFA9]/10 border-[#00DFA9]/30" };
}

export default function LiabilityPage() {
  const qc = useQueryClient();
  const [acting, setActing] = useState<number | null>(null);

  const { data = [], isLoading, refetch } = useQuery<MarketLiability[]>({
    queryKey: ["admin-liability"],
    queryFn: () => api.get("/admin/liability"),
    refetchInterval: 30_000,
  });

  const { data: settings = [] } = useQuery<{ key: string; value: string }[]>({
    queryKey: ["admin-settings"],
    queryFn: () => api.get("/admin/settings"),
  });

  const thresholdSetting = settings.find(s => s.key === "liability_threshold_usdt");
  const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 5000;

  const toggleMut = useMutation({
    mutationFn: ({ id, isSuspended }: { id: number; isSuspended: boolean }) =>
      api.patch(`/admin/liability/${id}`, { isSuspended }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-liability"] });
      toast.success("Market updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalStake = data.reduce((a, r) => a + parseFloat(r.totalStake), 0);
  const totalPayout = data.reduce((a, r) => a + parseFloat(r.potentialPayout), 0);
  const suspended = data.filter(r => r.isSuspended).length;
  const critical = data.filter(r => parseFloat(r.potentialPayout) >= threshold).length;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#00DFA9]/30 border-t-[#00DFA9] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#38BDF8]" /> Liability Monitor
          </h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Open market risk — threshold: {threshold.toLocaleString()} USDT · auto-refreshes every 30s
          </p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open Markets",      value: data.length,                  icon: TrendingUp,    color: "text-[#38BDF8]" },
          { label: "Total Staked",      value: `${totalStake.toFixed(2)} USDT`,   icon: DollarSign,    color: "text-[#00DFA9]" },
          { label: "Max Payout",        value: `${totalPayout.toFixed(2)} USDT`,  icon: AlertTriangle, color: "text-yellow-400" },
          { label: "Critical Markets",  value: critical,                     icon: ShieldOff,     color: "text-red-400" },
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
          <Activity className="w-10 h-10 text-[#475569] mx-auto mb-3" />
          <p className="text-[#94A3B8]">No open market liability yet. Bets will appear here when placed.</p>
        </div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#64748B] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Event</th>
                <th className="text-left px-4 py-3">Market</th>
                <th className="text-left px-4 py-3">Selection</th>
                <th className="text-right px-4 py-3">Staked</th>
                <th className="text-right px-4 py-3">Max Payout</th>
                <th className="text-center px-4 py-3">Bets</th>
                <th className="text-center px-4 py-3">Risk</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data
                .sort((a, b) => parseFloat(b.potentialPayout) - parseFloat(a.potentialPayout))
                .map(row => {
                  const payout = parseFloat(row.potentialPayout);
                  const stake = parseFloat(row.totalStake);
                  const riskInfo = risk(payout, threshold);
                  return (
                    <tr key={row.id} className={cn(
                      "hover:bg-white/3 transition-colors",
                      row.isSuspended && "opacity-60"
                    )}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium truncate max-w-[180px]">{row.eventName}</p>
                        <p className="text-[#64748B] text-xs">{row.sport}</p>
                      </td>
                      <td className="px-4 py-3 text-[#94A3B8] capitalize">{row.marketType.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-white">{row.selection}</td>
                      <td className="px-4 py-3 text-right text-[#94A3B8] font-mono">{stake.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">{payout.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center text-[#94A3B8]">{row.betCount}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", riskInfo.color)}>
                          {riskInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.isSuspended ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/30">Suspended</span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/30">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          disabled={acting === row.id}
                          onClick={() => {
                            setActing(row.id);
                            toggleMut.mutate({ id: row.id, isSuspended: !row.isSuspended });
                            setTimeout(() => setActing(null), 1000);
                          }}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-lg border transition-colors",
                            row.isSuspended
                              ? "border-[#00DFA9]/40 text-[#00DFA9] hover:bg-[#00DFA9]/10"
                              : "border-red-400/40 text-red-400 hover:bg-red-400/10"
                          )}>
                          {row.isSuspended ? (
                            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Lift</span>
                          ) : (
                            <span className="flex items-center gap-1"><ShieldOff className="w-3 h-3" /> Suspend</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {suspended > 0 && (
        <p className="text-xs text-[#64748B] text-center">
          {suspended} market{suspended > 1 ? "s" : ""} currently suspended (dimmed rows)
        </p>
      )}
    </div>
  );
}
