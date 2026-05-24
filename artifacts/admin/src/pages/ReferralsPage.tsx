import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, AdminReferral, AdminReferralsResponse } from "@/lib/api";
import { fmt, fmtDate } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ReferrerGroup {
  referrerId: number;
  referrerUsername: string | null;
  referrals: AdminReferral[];
  tierBreakdown: Record<number, number>;
}

function groupByReferrer(referrals: AdminReferral[]): ReferrerGroup[] {
  const map = new Map<number, ReferrerGroup>();
  for (const r of referrals) {
    if (!map.has(r.referrerId)) {
      map.set(r.referrerId, {
        referrerId: r.referrerId,
        referrerUsername: r.referrerUsername,
        referrals: [],
        tierBreakdown: {},
      });
    }
    const g = map.get(r.referrerId)!;
    g.referrals.push(r);
    g.tierBreakdown[r.tier] = (g.tierBreakdown[r.tier] ?? 0) + 1;
  }
  return Array.from(map.values()).sort((a, b) => b.referrals.length - a.referrals.length);
}

export default function ReferralsPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"list" | "tree">("tree");

  const { data, isLoading } = useQuery<AdminReferralsResponse>({
    queryKey: ["admin-referrals"],
    queryFn: () => api.get<AdminReferralsResponse>("/admin/referrals"),
  });

  const referrals: AdminReferral[] = data?.referrals ?? [];
  const stats = data?.stats;
  const groups = groupByReferrer(referrals);

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Referrals</h1>
        <p className="text-sm text-[#94A3B8] mt-1">{stats?.totalReferrals ?? 0} total referrals across {groups.length} referrers</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#94A3B8] mb-1">Total Referrals</div>
            <div className="text-2xl font-bold text-white">{stats.totalReferrals.toLocaleString()}</div>
            <div className="text-xs text-[#94A3B8] mt-1">{groups.length} unique referrers</div>
          </div>
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#94A3B8] mb-1">Total Commissions</div>
            <div className="text-2xl font-bold text-[#FACC15]">${fmt(stats.totalCommissions)} USDT</div>
          </div>
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#94A3B8] mb-1">Commissions Paid</div>
            <div className="text-2xl font-bold text-[#00DFA9]">${fmt(stats.totalPaid)} USDT</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["tree", "list"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${view === v ? "bg-[#00DFA9] text-[#0B0F14]" : "bg-white/5 text-[#94A3B8] hover:bg-white/10"}`}>
            {v === "tree" ? "Per-Referrer Tree" : "All Referrals"}
          </button>
        ))}
      </div>

      {view === "tree" ? (
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-[#94A3B8]">Loading…</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 text-[#94A3B8] bg-[#0D1117] border border-white/8 rounded-xl">No referrals yet</div>
          ) : groups.map(g => {
            const isOpen = expanded.has(g.referrerId);
            return (
              <div key={g.referrerId} className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleExpand(g.referrerId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-[#94A3B8]" /> : <ChevronRight className="w-4 h-4 text-[#94A3B8]" />}
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{g.referrerUsername ?? `uid:${g.referrerId}`}</div>
                      <div className="text-xs text-[#94A3B8]">uid:{g.referrerId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#38BDF8] font-semibold">{g.referrals.length} referred</span>
                    {Object.entries(g.tierBreakdown).map(([tier, count]) => (
                      <span key={tier} className="text-[#94A3B8]">T{tier}: {count}</span>
                    ))}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-white/8 divide-y divide-white/5">
                    {g.referrals.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-6 py-2 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]" />
                          <span className="text-[#94A3B8]">Referred uid:{r.referredId}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[#94A3B8]">
                          <span className="px-2 py-0.5 rounded-full border border-[#38BDF8]/20 bg-[#38BDF8]/10 text-[#38BDF8]">Tier {r.tier}</span>
                          <span>{fmtDate(r.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-[#94A3B8] text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Referrer</th>
                  <th className="text-left px-4 py-3">Referred User ID</th>
                  <th className="text-left px-4 py-3">Tier</th>
                  <th className="text-left px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-12 text-[#94A3B8]">Loading…</td></tr>
                ) : referrals.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-[#94A3B8]">No referrals yet</td></tr>
                ) : referrals.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-white">{r.referrerUsername ?? `uid:${r.referrerId}`}</td>
                    <td className="px-4 py-3 text-[#94A3B8] font-mono text-xs">uid:{r.referredId}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs border bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20">
                        Tier {r.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8] text-xs">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
