import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, AdminReferral, AdminReferralsResponse, TopReferrer } from "@/lib/api";
import { fmt, fmtDate } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

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
      map.set(r.referrerId, { referrerId: r.referrerId, referrerUsername: r.referrerUsername, referrals: [], tierBreakdown: {} });
    }
    const g = map.get(r.referrerId)!;
    g.referrals.push(r);
    g.tierBreakdown[r.tier] = (g.tierBreakdown[r.tier] ?? 0) + 1;
  }
  return Array.from(map.values()).sort((a, b) => b.referrals.length - a.referrals.length);
}

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D1117] border border-white/12 rounded-lg p-2.5 text-xs shadow-xl">
      <div className="text-[#64748B] mb-1.5">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="text-[#FACC15] font-semibold">
          ${p.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT commission
        </div>
      ))}
    </div>
  );
};

export default function ReferralsPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"tree" | "chart" | "list">("tree");

  const { data, isLoading } = useQuery<AdminReferralsResponse>({
    queryKey: ["admin-referrals"],
    queryFn: () => api.get<AdminReferralsResponse>("/admin/referrals"),
  });

  const referrals: AdminReferral[] = data?.referrals ?? [];
  const stats = data?.stats;
  const groups = groupByReferrer(referrals);
  const top10: TopReferrer[] = data?.topReferrersByCommission ?? [];

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
        <h1 className="text-2xl font-bold text-white tracking-tight">Referrals</h1>
        <p className="text-sm text-[#475569] mt-0.5">
          {stats?.totalReferrals ?? 0} total · {groups.length} unique referrers
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#64748B] mb-1.5 uppercase tracking-wide">Total Referrals</div>
            <div className="text-2xl font-bold text-white">{stats.totalReferrals.toLocaleString()}</div>
            <div className="text-xs text-[#475569] mt-1">{groups.length} unique referrers</div>
          </div>
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#64748B] mb-1.5 uppercase tracking-wide">Total Commissions</div>
            <div className="text-2xl font-bold text-[#FACC15]">${fmt(stats.totalCommissions)}</div>
            <div className="text-xs text-[#475569] mt-1">USDT earned</div>
          </div>
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#64748B] mb-1.5 uppercase tracking-wide">Commissions Paid</div>
            <div className="text-2xl font-bold text-[#00DFA9]">${fmt(stats.totalPaid)}</div>
            <div className="text-xs text-[#475569] mt-1">USDT paid out</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["tree", "chart", "list"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              view === v ? "bg-[#00DFA9] text-[#0B0F14]" : "bg-white/5 text-[#64748B] hover:bg-white/10 hover:text-white"
            }`}>
            {v === "tree" ? "Per-Referrer" : v === "chart" ? "Top 10 Chart" : "All Referrals"}
          </button>
        ))}
      </div>

      {view === "chart" && (
        <div className="bg-[#0D1117] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Top 10 Referrers by Commission Earned</h2>
            <span className="text-xs text-[#475569]">USDT</span>
          </div>
          {top10.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[#334155] text-sm">No referral data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#334155", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="commission" radius={[0, 4, 4, 0]}>
                  {top10.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#FACC15" : i === 1 ? "#94A3B8" : i === 2 ? "#CD7C54" : "#38BDF8"} fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {view === "tree" && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-[#475569]">Loading…</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-16 text-[#334155] bg-[#0D1117] border border-white/8 rounded-xl">No referrals yet</div>
          ) : groups.map(g => {
            const isOpen = expanded.has(g.referrerId);
            return (
              <div key={g.referrerId} className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleExpand(g.referrerId)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-[#475569]" /> : <ChevronRight className="w-4 h-4 text-[#475569]" />}
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{g.referrerUsername ?? `uid:${g.referrerId}`}</div>
                      <div className="text-xs text-[#475569]">uid:{g.referrerId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 font-semibold">
                      {g.referrals.length} referred
                    </span>
                    {Object.entries(g.tierBreakdown).map(([tier, count]) => (
                      <span key={tier} className="text-[#475569]">T{tier}:{count}</span>
                    ))}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-white/8 divide-y divide-white/5">
                    {g.referrals.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-6 py-2.5 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]" />
                          <span className="text-[#64748B]">uid:{r.referredId}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[#64748B]">
                          <span className="px-2 py-0.5 rounded-full border border-[#38BDF8]/20 bg-[#38BDF8]/8 text-[#38BDF8]">Tier {r.tier}</span>
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
      )}

      {view === "list" && (
        <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-[#475569] text-[11px] uppercase tracking-wider bg-white/2">
                  <th className="text-left px-4 py-3 font-medium">Referrer</th>
                  <th className="text-left px-4 py-3 font-medium">Referred</th>
                  <th className="text-left px-4 py-3 font-medium">Tier</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-12 text-[#475569]">Loading…</td></tr>
                ) : referrals.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-16 text-[#334155]">No referrals yet</td></tr>
                ) : referrals.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3.5 text-white font-medium">{r.referrerUsername ?? `uid:${r.referrerId}`}</td>
                    <td className="px-4 py-3.5 text-[#64748B] font-mono text-xs">uid:{r.referredId}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-xs border bg-[#38BDF8]/8 text-[#38BDF8] border-[#38BDF8]/20">
                        Tier {r.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#475569] text-xs">{fmtDate(r.createdAt)}</td>
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
