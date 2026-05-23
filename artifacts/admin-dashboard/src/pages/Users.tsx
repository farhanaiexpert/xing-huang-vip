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
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {["User", "Wallet", "Role", "Status", "Joined", "Actions"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                <div className="h-3 w-36 rounded bg-muted animate-pulse mt-1.5" />
              </td>
              <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-muted animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-5 w-12 rounded-full bg-muted animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-muted animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></td>
              <td className="px-4 py-3"><div className="h-7 w-48 rounded bg-muted animate-pulse ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyIllustration({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 64 64">
        <circle cx="32" cy="24" r="10" />
        <path d="M10 52c0-12.15 9.85-22 22-22s22 9.85 22 22" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export default function Users() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useAdminGetUsers();
  const updateStatus = useAdminUpdateUserStatus();
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const users = (data?.users ?? []).filter((u) => {
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
      toast.success("Status updated", { description: `User has been set to ${status}.` });
    } catch {
      toast.error("Update failed", { description: "Could not change user status." });
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} total registered
          </p>
        </div>
        <input
          type="search"
          placeholder="Search by username, email or wallet…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary w-72 transition-colors"
        />
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-lg">
          Failed to load users
        </div>
      ) : users.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl">
          <EmptyIllustration
            message={search ? "No users match your search" : "No users registered yet"}
          />
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wallet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const busy = updating === u.id;
                  const isAdmin = u.role === "admin";
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{u.username}</div>
                        {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {u.walletAddress ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            {u.walletAddress.slice(0, 8)}…{u.walletAddress.slice(-6)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">none</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isAdmin ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {!isAdmin && (
                          <div className="flex items-center justify-end gap-1.5">
                            {(["active", "suspended", "banned"] as Status[]).map((s) => (
                              <button
                                key={s}
                                disabled={busy || u.status === s}
                                onClick={() => handleStatusChange(u.id, s)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all disabled:cursor-not-allowed ${
                                  u.status === s
                                    ? s === "active"
                                      ? "bg-primary/20 text-primary border border-primary/30"
                                      : s === "suspended"
                                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                        : "bg-destructive/20 text-destructive border border-destructive/30"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border disabled:opacity-40"
                                }`}
                              >
                                {busy && u.status !== s ? (
                                  <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  s.charAt(0).toUpperCase() + s.slice(1)
                                )}
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
