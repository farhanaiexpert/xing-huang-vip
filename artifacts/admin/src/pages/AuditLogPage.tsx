import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, AuditLog } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable, ColDef } from "@/components/DataTable";

const PAGE_SIZE = 30;

const ACTION_COLORS: Record<string, string> = {
  create:  "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20",
  delete:  "bg-red-500/10 text-red-400 border-red-500/20",
  update:  "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20",
  patch:   "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20",
  settle:  "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20",
  approve: "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20",
  reset:   "bg-purple-500/10 text-purple-400 border-purple-500/20",
  login:   "bg-white/8 text-[#94A3B8] border-white/12",
};

function actionBadgeClass(action: string): string {
  for (const key of Object.keys(ACTION_COLORS)) {
    if (action.startsWith(key)) return ACTION_COLORS[key];
  }
  return "bg-white/5 text-[#64748B] border-white/10";
}

function ExpandableDetails({ details }: { details: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const preview = JSON.stringify(details).slice(0, 60);
  return (
    <div>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center gap-1 text-[#475569] hover:text-[#94A3B8] transition-colors"
      >
        <span className="font-mono truncate max-w-[180px]">
          {preview}{JSON.stringify(details).length > 60 ? "…" : ""}
        </span>
        <ChevronDown className={cn("w-3 h-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <pre className="mt-2 p-2.5 bg-black/30 border border-white/8 rounded-lg text-[10px] text-[#64748B] font-mono overflow-x-auto max-w-xs whitespace-pre-wrap break-all">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");

  const { data, isLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ["admin-audit", page, actionFilter, adminFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (actionFilter) params.set("action", actionFilter);
      if (adminFilter) params.set("adminId", adminFilter);
      return api.get(`/admin/audit-logs?${params}`);
    },
    refetchInterval: 30_000,
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const adminIds = Array.from(
    new Map((data?.logs ?? []).map(l => [l.adminId, l.adminUsername])).entries()
  ).map(([id, name]) => ({ id, name }));

  const sel = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9] transition-colors";

  const cols: ColDef<AuditLog>[] = [
    {
      key: "admin", label: "Admin",
      render: log => (
        <div>
          <div className="text-white text-sm font-medium">{log.adminUsername ?? "—"}</div>
          <div className="text-[11px] text-[#475569]">uid:{log.adminId}</div>
        </div>
      ),
    },
    {
      key: "action", label: "Action", sortable: true,
      getValue: log => log.action,
      render: log => (
        <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-mono font-medium", actionBadgeClass(log.action))}>
          {log.action}
        </span>
      ),
    },
    {
      key: "entity", label: "Entity",
      render: log => (
        log.entityType ? (
          <span className="text-[#64748B] text-xs font-mono">
            {log.entityType}
            {log.entityId ? <span className="text-[#475569]"> #{log.entityId}</span> : ""}
          </span>
        ) : <span className="text-[#334155] text-xs">—</span>
      ),
    },
    {
      key: "details", label: "Details",
      render: log => (
        log.details
          ? <ExpandableDetails details={log.details} />
          : <span className="text-[#334155] text-xs">—</span>
      ),
    },
    {
      key: "time", label: "Time", sortable: true,
      getValue: log => log.createdAt,
      render: log => <span className="text-[#475569] text-xs whitespace-nowrap">{fmtDate(log.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Log</h1>
          <p className="text-sm text-[#475569] mt-0.5">{total.toLocaleString()} entries · auto-refresh 30s</p>
        </div>
        <div className="flex gap-2">
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className={sel}>
            <option value="">All actions</option>
            <option value="create">Create</option>
            <option value="update">Update / Patch</option>
            <option value="delete">Delete</option>
            <option value="settle">Settle</option>
            <option value="approve">Approve</option>
            <option value="reset">Reset</option>
            <option value="login">Login</option>
          </select>
          {adminIds.length > 1 && (
            <select value={adminFilter} onChange={e => { setAdminFilter(e.target.value); setPage(1); }} className={sel}>
              <option value="">All admins</option>
              {adminIds.map(a => (
                <option key={a.id} value={String(a.id)}>{a.name ?? `uid:${a.id}`}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <DataTable
        cols={cols}
        rows={data?.logs}
        loading={isLoading}
        rowKey={log => log.id}
        empty="No audit entries"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs">Page {page} of {pages} · {total.toLocaleString()} entries</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs px-2">{page}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
}
