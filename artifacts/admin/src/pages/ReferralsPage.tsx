import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminReferral {
  id: number;
  referrerId: number;
  referrerUsername: string | null;
  refereeId: number;
  refereeUsername: string | null;
  commissionRate: string;
  totalEarned: string;
  status: string;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function ReferralsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ referrals: AdminReferral[]; total: number }>({
    queryKey: ["admin-referrals", page],
    queryFn: () => api.get(`/admin/referrals?page=${page}&limit=${PAGE_SIZE}`),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Referrals</h1>
        <p className="text-sm text-[#94A3B8] mt-1">{total.toLocaleString()} total relationships</p>
      </div>

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#94A3B8] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Referrer</th>
                <th className="text-left px-4 py-3">Referee</th>
                <th className="text-left px-4 py-3">Commission Rate</th>
                <th className="text-left px-4 py-3">Total Earned</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#94A3B8]">Loading…</td></tr>
              ) : data?.referrals.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#94A3B8]">No referrals</td></tr>
              ) : data?.referrals.map(r => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white">{r.referrerUsername ?? `uid:${r.referrerId}`}</td>
                  <td className="px-4 py-3 text-white">{r.refereeUsername ?? `uid:${r.refereeId}`}</td>
                  <td className="px-4 py-3 text-[#38BDF8] font-mono text-xs">{fmt(parseFloat(r.commissionRate) * 100, 1)}%</td>
                  <td className="px-4 py-3 text-[#00DFA9] font-mono text-xs">${fmt(r.totalEarned)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs border", statusBg(r.status))}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 text-sm text-[#94A3B8]">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
