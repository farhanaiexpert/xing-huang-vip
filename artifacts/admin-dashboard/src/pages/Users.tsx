import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetUsers,
  useAdminUpdateUserStatus,
  getAdminGetUsersQueryKey,
} from "@workspace/api-client-react";
import { StatusBadge } from "./Overview";
import { toast } from "sonner";

type Status = "active" | "suspended" | "banned";

function TableSkeleton() {
  return (
    <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {["User", "Wallet", "Role", "Status", "Joined", "Actions"].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b border-white/[0.04] last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/5 animate-pulse shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
                    <div className="h-2.5 w-32 rounded bg-white/5 animate-pulse" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-white/5 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-5 w-10 rounded-full bg-white/5 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-white/5 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-3 w-16 rounded bg-white/5 animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-7 w-44 rounded bg-white/5 animate-pulse ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Users() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminGetUsers();
  const updateStatus = useAdminUpdateUserStatus();
  const [search, setSearch]     = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const users = (data?.users ?? []).filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.email?.toLowerCase().includes(q) ?? false) ||
      (u.walletAddress?.toLowerCase().includes(q) ?? false)
    );
  });

  async function handleStatusChange(id: string, status: Status) {
    setUpdating(id);
    try {
      await updateStatus.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
      toast.success("Status updated", { description: `User set to ${status}.` });
    } catch {
      toast.error("Update failed", { description: "Could not change user status." });
    } finally {
      setUpdating(null);
    }
  }

  const statusButtons: { status: Status; label: string; activeCls: string }[] = [
    { status: "active",    label: "Active",    activeCls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    { status: "suspended", label: "Suspend",   activeCls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    { status: "banned",    label: "Ban",       activeCls: "bg-red-500/20 text-red-400 border-red-500/30" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-foreground">Users</h1>
          <p className="text-xs text-[#4A5568] mt-0.5">{data?.total ?? 0} registered accounts</p>
        </div>
        <input
          type="search"
          placeholder="Search username, email, wallet…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0D1117] border border-white/[0.08] text-sm text-foreground placeholder:text-[#4A5568] focus:outline-none focus:border-primary/50 w-72 transition-colors"
        />
      </div>

      {isLoading ? <TableSkeleton /> : error ? (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg">Failed to load users</div>
      ) : users.length === 0 ? (
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl flex flex-col items-center justify-center py-20 text-[#4A5568] gap-3">
          <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 64 64">
            <circle cx="32" cy="24" r="10" /><path d="M10 52c0-12.15 9.85-22 22-22s22 9.85 22 22" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-medium">{search ? "No users match your search" : "No users registered yet"}</p>
        </div>
      ) : (
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["User", "Wallet", "Role", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#4A5568] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const busy = updating === u.id;
                  const isAdmin = u.role === "admin";
                  return (
                    <tr key={u.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">{u.username[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">{u.username}</div>
                            {u.email && <div className="text-[10px] text-[#4A5568] truncate max-w-[160px]">{u.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.walletAddress ? (
                          <span className="font-mono text-[11px] text-[#4A5568]">
                            {u.walletAddress.slice(0, 6)}…{u.walletAddress.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#2D3748] italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isAdmin ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-white/5 text-[#4A5568] border-white/10"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                      <td className="px-4 py-3 text-[11px] text-[#4A5568] whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {!isAdmin && (
                          <div className="flex items-center justify-end gap-1">
                            {statusButtons.map(({ status, label, activeCls }) => (
                              <button
                                key={status}
                                disabled={busy || u.status === status}
                                onClick={() => handleStatusChange(u.id, status)}
                                className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-all disabled:cursor-not-allowed ${
                                  u.status === status
                                    ? activeCls
                                    : "bg-white/[0.03] text-[#4A5568] border-white/[0.06] hover:bg-white/[0.07] hover:text-[#8A9BB3] disabled:opacity-40"
                                }`}
                              >
                                {busy && u.status !== status ? (
                                  <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                ) : label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
