import { useQuery } from "@tanstack/react-query";
import { api, AdminReferral, AdminReferralsResponse } from "@/lib/api";
import { fmt, fmtDate } from "@/lib/utils";

export default function ReferralsPage() {
  const { data, isLoading } = useQuery<AdminReferralsResponse>({
    queryKey: ["admin-referrals"],
    queryFn: () => api.get<AdminReferralsResponse>("/admin/referrals"),
  });

  const referrals: AdminReferral[] = data?.referrals ?? [];
  const stats = data?.stats;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Referrals</h1>
        <p className="text-sm text-[#94A3B8] mt-1">{stats?.totalReferrals ?? 0} total relationships</p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#94A3B8] mb-1">Total Referrals</div>
            <div className="text-xl font-bold text-white">{stats.totalReferrals}</div>
          </div>
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#94A3B8] mb-1">Total Commissions Generated</div>
            <div className="text-xl font-bold text-[#FACC15]">${fmt(stats.totalCommissions)} USDT</div>
          </div>
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-[#94A3B8] mb-1">Total Commissions Paid</div>
            <div className="text-xl font-bold text-[#00DFA9]">${fmt(stats.totalPaid)} USDT</div>
          </div>
        </div>
      )}

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
    </div>
  );
}
