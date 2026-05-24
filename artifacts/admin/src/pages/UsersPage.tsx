import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminUser, AdminBet, AdminTransaction } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { Search, Ban, CheckCircle, ChevronLeft, ChevronRight, User, Eye, EyeOff, KeyRound, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 20;
const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors";

function roleBadge(role: string) {
  if (role === "super_admin") return "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20";
  if (role === "admin") return "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20";
  return "bg-white/5 text-[#94A3B8] border-white/10";
}

function kycBadge(kyc: string) {
  if (kyc === "verified") return "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20";
  if (kyc === "pending") return "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20";
  if (kyc === "rejected") return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-white/5 text-[#94A3B8] border-white/10";
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-white/5 rounded animate-pulse" style={{ width: `${60 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

function UserDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient();
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNotes, setAdjNotes] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const { data: bets = [] } = useQuery<AdminBet[]>({
    queryKey: ["user-bets", user.id],
    queryFn: () => api.get(`/admin/users/${user.id}/bets`),
  });
  const { data: txns = [] } = useQuery<AdminTransaction[]>({
    queryKey: ["user-txns", user.id],
    queryFn: () => api.get(`/admin/users/${user.id}/transactions`),
  });

  const balMut = useMutation({
    mutationFn: (adjustment: string) =>
      api.patch(`/admin/users/${user.id}`, { balanceAdjustment: parseFloat(adjustment), balanceNote: adjNotes || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Balance adjusted"); setAdjAmount(""); setAdjNotes(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspendMut = useMutation({
    mutationFn: (suspend: boolean) => api.patch(`/admin/users/${user.id}`, { isSuspended: suspend }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success(user.isSuspended ? "User unsuspended" : "User suspended"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPwMut = useMutation({
    mutationFn: (password: string) => api.post(`/admin/users/${user.id}/reset-password`, { newPassword: password }),
    onSuccess: () => { toast.success("Password reset — all sessions invalidated"); setNewPassword(""); setConfirmPassword(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-[520px] max-w-full bg-[#0B0F14] border-l border-white/8 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-white/8">
          <SheetTitle className="text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#38BDF8]/10 flex items-center justify-center">
              <span className="text-[#38BDF8] text-sm font-bold uppercase">{user.username.slice(0, 1)}</span>
            </div>
            <div>
              <div className="text-base">{user.username}</div>
              <div className="text-xs text-[#475569] font-normal">uid:{user.id}</div>
            </div>
          </SheetTitle>
          <p className="text-sm text-[#64748B]">{user.email}</p>
        </SheetHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="bg-white/5 w-full justify-start gap-1 h-auto p-1 rounded-lg">
            {["profile", "balance", "bets", "transactions"].map(tab => (
              <TabsTrigger key={tab} value={tab}
                className="text-xs capitalize data-[state=active]:bg-[#00DFA9] data-[state=active]:text-[#0B0F14] data-[state=active]:font-semibold">
                {tab === "bets" ? `Bets (${bets.length})` : tab === "transactions" ? `Txns (${txns.length})` : tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-3">
            {([
              ["ID", `#${user.id}`],
              ["Username", user.username],
              ["Email", user.email],
              ["Country", user.country ?? "—"],
              ["Referral Code", user.referralCode ?? "—"],
              ["Joined", fmtDate(user.createdAt)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-2 border-b border-white/5">
                <span className="text-[#64748B]">{label}</span>
                <span className="text-white font-mono text-xs">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-[#64748B]">Role</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs border", roleBadge(user.role))}>
                {user.role.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-[#64748B]">KYC</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs border", kycBadge(user.kycStatus))}>
                {user.kycStatus}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-[#64748B]">Status</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs border", user.isSuspended ? statusBg("rejected") : statusBg("active"))}>
                {user.isSuspended ? "Suspended" : "Active"}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-[#64748B]">Wallet Balance</span>
              <span className="text-[#00DFA9] font-mono text-xs font-semibold">
                {user.balance !== null ? `$${fmt(user.balance)} USDT` : "—"}
              </span>
            </div>
            <button onClick={() => suspendMut.mutate(!user.isSuspended)} disabled={suspendMut.isPending}
              className={cn("w-full py-2 rounded-lg text-sm font-semibold transition-colors mt-2", user.isSuspended
                ? "bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20"
                : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
              )}>
              {suspendMut.isPending ? "Updating…" : user.isSuspended ? "Unsuspend User" : "Suspend User"}
            </button>

            <div className="mt-4 pt-4 border-t border-white/8 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <KeyRound className="w-4 h-4 text-[#FACC15]" />
                Reset Password
              </div>
              <div className="relative">
                <input className={cn(inp, "pr-10")} type={showPw ? "text" : "password"}
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 chars)" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-white transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input className={inp} type={showPw ? "text" : "password"}
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password" />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}
              <button onClick={() => {
                if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
                if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
                resetPwMut.mutate(newPassword);
              }} disabled={resetPwMut.isPending || !newPassword || !confirmPassword}
                className="w-full py-2 bg-[#FACC15]/10 text-[#FACC15] hover:bg-[#FACC15]/20 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors">
                {resetPwMut.isPending ? "Resetting…" : "Reset Password & Invalidate Sessions"}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="balance" className="mt-4 space-y-4">
            <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4 text-center">
              <div className="text-xs text-[#64748B] mb-1">Current Balance</div>
              <div className="text-3xl font-bold text-[#00DFA9]">
                ${user.balance !== null ? fmt(user.balance) : "0.00"} <span className="text-base">USDT</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#64748B] mb-1.5">
                Adjustment (USDT) — positive to credit, negative to debit
              </label>
              <input className={inp} type="number" step="0.01" value={adjAmount}
                onChange={e => setAdjAmount(e.target.value)} placeholder="e.g. 50.00 or -25.00" />
            </div>
            <div>
              <label className="block text-xs text-[#64748B] mb-1.5">Notes (optional)</label>
              <input className={inp} value={adjNotes} onChange={e => setAdjNotes(e.target.value)} placeholder="Reason for adjustment…" />
            </div>
            <button onClick={() => { if (adjAmount) balMut.mutate(adjAmount); }}
              disabled={!adjAmount || balMut.isPending}
              className="w-full py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 disabled:opacity-50 transition-colors">
              {balMut.isPending ? "Applying…" : "Apply Adjustment"}
            </button>
          </TabsContent>

          <TabsContent value="bets" className="mt-4">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {bets.length === 0 ? (
                <div className="text-center py-8 text-[#475569] text-sm">No bets yet</div>
              ) : bets.map(b => (
                <div key={b.id} className="bg-[#0D1117] border border-white/8 rounded-lg p-3 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-[#64748B]">#{b.id} · {b.type}</span>
                    <span className={cn("px-2 py-0.5 rounded-full border", statusBg(b.status))}>{b.status}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Stake: <span className="text-[#FACC15]">${fmt(b.stake)}</span></span>
                    <span>Return: <span className="text-[#00DFA9]">${fmt(b.potentialReturn)}</span></span>
                    <span>Odds: {Number(b.totalOdds).toFixed(2)}</span>
                  </div>
                  <div className="text-[#334155] mt-1">{fmtDate(b.createdAt)}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {txns.length === 0 ? (
                <div className="text-center py-8 text-[#475569] text-sm">No transactions yet</div>
              ) : txns.map(t => (
                <div key={t.id} className="bg-[#0D1117] border border-white/8 rounded-lg p-3 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-[#64748B]">#{t.id} · {t.type.replace(/_/g, " ")}</span>
                    <span className={cn("px-2 py-0.5 rounded-full border", statusBg(t.status))}>{t.status}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span className={t.type === "withdrawal" || t.type === "bet_stake" || t.type === "debit" ? "text-red-400" : "text-[#00DFA9]"}>
                      {t.type === "withdrawal" || t.type === "bet_stake" || t.type === "debit" ? "-" : "+"}${fmt(t.amount)} USDT
                    </span>
                    {t.reference && <span className="text-[#334155] font-mono">{t.reference}</span>}
                  </div>
                  <div className="text-[#334155] mt-1">{fmtDate(t.createdAt)}</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: "", username: "", password: "", role: "user" });

  const createMut = useMutation({
    mutationFn: () => api.post("/admin/users", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User created successfully");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Create New User</h2>
          <button onClick={onClose} className="text-[#475569] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          {(["email", "username", "password"] as const).map(field => (
            <div key={field}>
              <label className="block text-xs text-[#64748B] mb-1.5 capitalize">{field}</label>
              <input
                className={inp}
                type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                placeholder={field === "email" ? "user@example.com" : field === "username" ? "username" : "min 8 characters"}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs text-[#64748B] mb-1.5">Role</label>
            <select className={inp} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 bg-white/5 text-[#94A3B8] rounded-lg text-sm hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!form.email || !form.username || !form.password) { toast.error("All fields required"); return; }
              if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
              createMut.mutate();
            }}
            disabled={createMut.isPending}
            className="flex-1 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 disabled:opacity-50 transition-colors">
            {createMut.isPending ? "Creating…" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["admin-users", page, q],
    queryFn: () => api.get(`/admin/users?page=${page}&limit=${PAGE_SIZE}${q ? `&search=${encodeURIComponent(q)}` : ""}`),
  });

  const suspendMut = useMutation({
    mutationFn: ({ id, suspend }: { id: number; suspend: boolean }) =>
      api.patch(`/admin/users/${id}`, { isSuspended: suspend }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("User updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(search);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {selectedUser && <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Users</h1>
          <p className="text-sm text-[#475569] mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={doSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Email or username…"
                className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] w-56 transition-colors"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-white/8 border border-white/10 text-[#94A3B8] rounded-lg text-sm hover:bg-white/12 transition-colors">
              Search
            </button>
          </form>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 transition-colors">
            <UserPlus className="w-4 h-4" /> New User
          </button>
        </div>
      </div>

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#475569] text-[11px] uppercase tracking-wider bg-white/2">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">KYC</th>
                <th className="text-left px-4 py-3 font-medium">Balance</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              ) : data?.users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-[#334155]">No users found</td></tr>
              ) : data?.users.map(u => (
                <tr key={u.id}
                  className="border-b border-white/5 hover:bg-white/2 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(u)}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-[#475569]" />
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">{u.username}</div>
                        <div className="text-[11px] text-[#475569]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium", roleBadge(u.role))}>
                      {u.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium", kycBadge(u.kycStatus))}>
                      {u.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#00DFA9] font-mono text-xs font-semibold">
                    {u.balance !== null ? `$${fmt(u.balance)}` : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[11px] border", u.isSuspended ? statusBg("rejected") : statusBg("active"))}>
                      {u.isSuspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#475569] text-xs">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 text-sm text-[#475569]">
          <span className="text-xs">Page {page} of {pages} · click a row to view details</span>
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
      </div>
    </div>
  );
}
