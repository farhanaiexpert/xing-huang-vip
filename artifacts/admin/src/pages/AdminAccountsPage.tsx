import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminUser } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import {
  Search, Eye, EyeOff, KeyRound, UserPlus, X, Shield, ShieldCheck,
  Ban, CheckCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, ColDef } from "@/components/DataTable";

const PAGE_SIZE = 50;

const inp =
  "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors";

function roleBadge(role: string) {
  if (role === "super_admin")
    return "bg-[#FACC15]/12 text-[#FACC15] border-[#FACC15]/25";
  return "bg-[#38BDF8]/12 text-[#38BDF8] border-[#38BDF8]/25";
}

function roleIcon(role: string) {
  return role === "super_admin" ? (
    <ShieldCheck className="w-3.5 h-3.5" />
  ) : (
    <Shield className="w-3.5 h-3.5" />
  );
}


function AdminDrawer({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [newRole, setNewRole] = useState(user.role);

  const suspendMut = useMutation({
    mutationFn: (suspend: boolean) =>
      api.patch(`/admin/users/${user.id}`, { isSuspended: suspend }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-admin-accounts"] });
      toast.success(user.isSuspended ? "Account unsuspended" : "Account suspended");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: (role: string) =>
      api.patch(`/admin/users/${user.id}`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-admin-accounts"] });
      toast.success("Role updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPwMut = useMutation({
    mutationFn: (password: string) =>
      api.post(`/admin/users/${user.id}/reset-password`, {
        newPassword: password,
      }),
    onSuccess: () => {
      toast.success("Password reset — all sessions invalidated");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[480px] max-w-full bg-[#0B0F14] border-l border-white/8 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-white/8">
          <SheetTitle className="text-white flex items-center gap-2.5">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center",
                user.role === "super_admin"
                  ? "bg-[#FACC15]/12"
                  : "bg-[#38BDF8]/12"
              )}
            >
              <span
                className={cn(
                  "text-sm font-bold uppercase",
                  user.role === "super_admin"
                    ? "text-[#FACC15]"
                    : "text-[#38BDF8]"
                )}
              >
                {(user.username ?? user.walletAddress ?? "?").slice(0, 1)}
              </span>
            </div>
            <div>
              <div className="text-base">{user.username ?? user.walletAddress ?? "—"}</div>
              <div className="text-xs text-[#475569] font-normal">
                uid:{user.id}
              </div>
            </div>
          </SheetTitle>
          <p className="text-sm text-[#64748B]">{user.email}</p>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Profile fields */}
          <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
            {[
              ["Account ID", `#${user.id}`],
              ["Username", user.username],
              ["Email", user.email],
              ["Joined", fmtDate(user.createdAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between text-sm px-4 py-2.5 border-b border-white/5 last:border-0"
              >
                <span className="text-[#64748B]">{label}</span>
                <span className="text-white font-mono text-xs">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm px-4 py-2.5 border-b border-white/5">
              <span className="text-[#64748B]">Status</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs border",
                  user.isSuspended
                    ? statusBg("rejected")
                    : statusBg("active")
                )}
              >
                {user.isSuspended ? "Suspended" : "Active"}
              </span>
            </div>
            <div className="flex justify-between text-sm px-4 py-2.5">
              <span className="text-[#64748B]">Wallet Balance</span>
              <span className="text-[#00DFA9] font-mono text-xs font-semibold">
                {user.balance !== null
                  ? `$${fmt(user.balance)} USDT`
                  : "—"}
              </span>
            </div>
          </div>

          {/* Role change */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-white uppercase tracking-wide">
              Role
            </label>
            <div className="flex gap-2">
              {(["admin", "super_admin"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setNewRole(r)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold border transition-colors",
                    newRole === r
                      ? r === "super_admin"
                        ? "bg-[#FACC15]/12 text-[#FACC15] border-[#FACC15]/30"
                        : "bg-[#38BDF8]/12 text-[#38BDF8] border-[#38BDF8]/30"
                      : "bg-white/3 text-[#475569] border-white/8 hover:bg-white/6"
                  )}
                >
                  {r === "super_admin" ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Shield className="w-3.5 h-3.5" />
                  )}
                  {r.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <button
              onClick={() => roleMut.mutate(newRole)}
              disabled={roleMut.isPending || newRole === user.role}
              className="w-full py-2 bg-[#38BDF8]/10 text-[#38BDF8] hover:bg-[#38BDF8]/18 disabled:opacity-40 rounded-lg text-sm font-semibold transition-colors"
            >
              {roleMut.isPending
                ? "Updating…"
                : newRole === user.role
                ? "No change"
                : `Set role to "${newRole.replace(/_/g, " ")}"`}
            </button>
          </div>

          {/* Suspend / unsuspend */}
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wide mb-2.5">
              Account Status
            </label>
            <button
              onClick={() => suspendMut.mutate(!user.isSuspended)}
              disabled={suspendMut.isPending}
              className={cn(
                "w-full py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                user.isSuspended
                  ? "bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/18"
                  : "bg-red-500/10 text-red-400 hover:bg-red-500/18"
              )}
            >
              {user.isSuspended ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Unsuspend Account
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" /> Suspend Account
                </>
              )}
            </button>
          </div>

          {/* Password reset */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wide">
              <KeyRound className="w-3.5 h-3.5 text-[#FACC15]" />
              Reset Password
            </label>
            <div className="relative">
              <input
                className={cn(inp, "pr-10")}
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-white transition-colors"
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <input
              className={inp}
              type={showPw ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
            <button
              onClick={() => {
                if (newPassword.length < 8) {
                  toast.error("Password must be at least 8 characters");
                  return;
                }
                if (newPassword !== confirmPassword) {
                  toast.error("Passwords do not match");
                  return;
                }
                resetPwMut.mutate(newPassword);
              }}
              disabled={
                resetPwMut.isPending || !newPassword || !confirmPassword
              }
              className="w-full py-2 bg-[#FACC15]/10 text-[#FACC15] hover:bg-[#FACC15]/18 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors"
            >
              {resetPwMut.isPending
                ? "Resetting…"
                : "Reset Password & Invalidate Sessions"}
            </button>
            <p className="text-xs text-[#334155]">
              Immediately changes the password and signs the account out of all
              active sessions.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CreateAdminModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    role: "admin" as "admin" | "super_admin",
  });
  const [showPw, setShowPw] = useState(false);

  const createMut = useMutation({
    mutationFn: () => api.post("/admin/users", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-admin-accounts"] });
      toast.success("Admin account created");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-white">
              Create Admin Account
            </h2>
            <p className="text-xs text-[#475569] mt-0.5">
              New account will have admin-level access
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#475569] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">
              Email address
            </label>
            <input
              className={inp}
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="admin@xinghuang.vip"
            />
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">
              Username
            </label>
            <input
              className={inp}
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
              placeholder="admin_username"
            />
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                className={cn(inp, "pr-10")}
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="min 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-white transition-colors"
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">Role</label>
            <div className="flex gap-2">
              {(["admin", "super_admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold border transition-colors",
                    form.role === r
                      ? r === "super_admin"
                        ? "bg-[#FACC15]/12 text-[#FACC15] border-[#FACC15]/30"
                        : "bg-[#38BDF8]/12 text-[#38BDF8] border-[#38BDF8]/30"
                      : "bg-white/3 text-[#475569] border-white/8 hover:bg-white/6"
                  )}
                >
                  {r === "super_admin" ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Shield className="w-3.5 h-3.5" />
                  )}
                  {r.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-white/5 text-[#94A3B8] rounded-lg text-sm hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!form.email || !form.username || !form.password) {
                toast.error("All fields required");
                return;
              }
              if (form.password.length < 8) {
                toast.error("Password must be at least 8 characters");
                return;
              }
              createMut.mutate();
            }}
            disabled={createMut.isPending}
            className="flex-1 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 disabled:opacity-50 transition-colors"
          >
            {createMut.isPending ? "Creating…" : "Create Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAccountsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["admin-admin-accounts", page, q],
    queryFn: () =>
      api.get(
        `/admin/users?role=admins&page=${page}&limit=${PAGE_SIZE}${q ? `&search=${encodeURIComponent(q)}` : ""}`
      ),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, suspend }: { id: number; suspend: boolean }) =>
      api.patch(`/admin/users/${id}`, { isSuspended: suspend }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-admin-accounts"] });
      toast.success("Account updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const superAdminCount =
    data?.users.filter((u) => u.role === "super_admin").length ?? 0;
  const adminCount =
    data?.users.filter((u) => u.role === "admin").length ?? 0;

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(search);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {selectedUser && (
        <AdminDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
      {showCreate && (
        <CreateAdminModal onClose={() => setShowCreate(false)} />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Admin Accounts
          </h1>
          <p className="text-sm text-[#475569] mt-0.5">
            {superAdminCount} super admin
            {superAdminCount !== 1 ? "s" : ""} · {adminCount} admin
            {adminCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={doSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Email or username…"
                className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] w-52 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-white/8 border border-white/10 text-[#94A3B8] rounded-lg text-sm hover:bg-white/12 transition-colors"
            >
              Search
            </button>
          </form>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> New Admin
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-[#38BDF8]/5 border border-[#38BDF8]/12 rounded-xl px-4 py-3 text-xs text-[#64748B]">
        <ShieldCheck className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
        <span>
          This page shows <span className="text-[#38BDF8] font-medium">admin</span> and{" "}
          <span className="text-[#FACC15] font-medium">super admin</span> accounts only.
          Regular users are managed under the{" "}
          <span className="text-white">Users</span> page. Click any row to edit role, reset password, or suspend.
        </span>
      </div>

      {(() => {
        const cols: ColDef<AdminUser>[] = [
          {
            key: "account", label: "Account",
            render: u => (
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                  u.role === "super_admin" ? "bg-[#FACC15]/10" : "bg-[#38BDF8]/10"
                )}>
                  <span className={cn(
                    "text-xs font-bold uppercase",
                    u.role === "super_admin" ? "text-[#FACC15]" : "text-[#38BDF8]"
                  )}>
                    {(u.username ?? u.walletAddress ?? "?").slice(0, 1)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-white text-sm">{u.username ?? <span className="italic text-[#475569]">no username</span>}</div>
                  <div className="text-[11px] text-[#475569]">{u.email ?? "—"}</div>
                </div>
              </div>
            ),
          },
          {
            key: "role", label: "Role", sortable: true,
            getValue: u => u.role,
            render: u => (
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border font-medium", roleBadge(u.role))}>
                {roleIcon(u.role)}
                {u.role.replace(/_/g, " ")}
              </span>
            ),
          },
          {
            key: "kyc", label: "KYC", sortable: true,
            getValue: u => u.kycStatus,
            render: u => (
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] border", statusBg(u.kycStatus))}>
                {u.kycStatus}
              </span>
            ),
          },
          {
            key: "balance", label: "Balance", sortable: true,
            getValue: u => parseFloat(u.balance ?? "0"),
            render: u => (
              <span className="text-[#00DFA9] font-mono text-xs font-semibold">
                {u.balance !== null ? `$${fmt(u.balance)}` : "—"}
              </span>
            ),
          },
          {
            key: "status", label: "Status", sortable: true,
            getValue: u => u.isSuspended ? "suspended" : "active",
            render: u => (
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] border", u.isSuspended ? statusBg("rejected") : statusBg("active"))}>
                {u.isSuspended ? "Suspended" : "Active"}
              </span>
            ),
          },
          {
            key: "joined", label: "Joined", sortable: true,
            getValue: u => u.createdAt,
            render: u => <span className="text-[#475569] text-xs whitespace-nowrap">{fmtDate(u.createdAt)}</span>,
          },
          {
            key: "actions", label: "Actions",
            render: u => (
              <div onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => suspendMut.mutate({ id: u.id, suspend: !u.isSuspended })}
                  title={u.isSuspended ? "Unsuspend" : "Suspend"}
                  className={cn("p-1.5 rounded-lg transition-colors", u.isSuspended
                    ? "text-[#00DFA9] hover:bg-[#00DFA9]/10"
                    : "text-red-400 hover:bg-red-500/10"
                  )}
                >
                  {u.isSuspended ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </button>
              </div>
            ),
          },
        ];
        return (
          <DataTable
            cols={cols}
            rows={data?.users}
            loading={isLoading}
            rowKey={u => u.id}
            onRowClick={u => setSelectedUser(u)}
            empty="No admin accounts found"
            footer={
              <div className="flex items-center justify-between">
                <span className="text-xs">Page {page} of {pages} · {total} admin accounts</span>
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
        );
      })()}
    </div>
  );
}
