import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetUsers,
  useAdminUpdateUserStatus,
  getAdminGetUsersQueryKey,
} from "@workspace/api-client-react";
import { StatusBadge } from "./Overview";

type Status = "active" | "suspended" | "banned";

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
        <div className="flex items-center justify-center h-48">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-lg">
          Failed to load users
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {search ? "No users match your search" : "No users yet"}
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
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-foreground">{u.username}</div>
                        {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                      </div>
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
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${u.role === "admin" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== "admin" && (
                        <StatusSelect
                          current={u.status as Status}
                          disabled={updating === u.id}
                          onChange={(s) => handleStatusChange(u.id, s)}
                        />
                      )}
                    </td>
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

function StatusSelect({
  current,
  disabled,
  onChange,
}: {
  current: Status;
  disabled: boolean;
  onChange: (s: Status) => void;
}) {
  return (
    <select
      value={current}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Status)}
      className="text-xs bg-background border border-border text-foreground rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 cursor-pointer"
    >
      <option value="active">Active</option>
      <option value="suspended">Suspend</option>
      <option value="banned">Ban</option>
    </select>
  );
}
