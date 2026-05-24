import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, AuditLog } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 30;

export default function AuditLogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ["admin-audit", page],
    queryFn: () => api.get(`/admin/audit-logs?page=${page}&limit=${PAGE_SIZE}`),
    refetchInterval: 30_000,
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function actionColor(action: string): string {
    if (action.startsWith("create")) return "text-[#00DFA9]";
    if (action.startsWith("delete")) return "text-red-400";
    if (action.startsWith("update") || action.startsWith("patch")) return "text-[#38BDF8]";
    if (action.startsWith("settle") || action.startsWith("approve")) return "text-[#FACC15]";
    return "text-[#94A3B8]";
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-sm text-[#94A3B8] mt-1">{total.toLocaleString()} entries</p>
      </div>

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#94A3B8] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Admin</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Details</th>
                <th className="text-left px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12 text-[#94A3B8]">Loading…</td></tr>
              ) : data?.logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-[#94A3B8]">No audit entries</td></tr>
              ) : data?.logs.map(log => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white">{log.adminUsername ?? `uid:${log.adminId}`}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-xs ${actionColor(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">
                    {log.entityType ? (
                      <span>{log.entityType}{log.entityId ? ` #${log.entityId}` : ""}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs font-mono max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs whitespace-nowrap">{fmtDate(log.createdAt)}</td>
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
