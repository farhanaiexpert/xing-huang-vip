import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminUser, AdminBet, AdminTransaction } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { Search, Ban, CheckCircle, ChevronLeft, ChevronRight, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 20;

function UserDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient();
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNotes, setAdjNotes] = useState("");

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Balance adjusted");
      setAdjAmount("");
      setAdjNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspendMut = useMutation({
    mutationFn: (suspend: boolean) => api.patch(`/admin/users/${user.id}`, { isSuspended: suspend }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(user.isSuspended ? "User unsuspended" : "User suspended");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00DFA9] transition-colors";

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-[520px] max-w-full bg-[#0B0F14] border-l border-white/8 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-white/8">
          <SheetTitle className="text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#38BDF8]/10 flex items-center justify-center">
              <User className="w-4 h-4 text-[#38BDF8]" />
            </div>
            {user.username}
          </SheetTitle>
          <p className="text-sm text-[#94A3B8]">{user.email}</p>
        </SheetHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="bg-white/5 w-full justify-start gap-1 h-auto p-1 rounded-lg">
            <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-[#00DFA9] data-[state=active]:text-[#0B0F14]">Profile</TabsTrigger>
            <TabsTrigger value="balance" className="text-xs data-[state=active]:bg-[#00DFA9] data-[state=active]:text-[#0B0F14]">Balance</TabsTrigger>
            <TabsTrigger value="bets" className="text-xs data-[state=active]:bg-[#00DFA9] data-[state=active]:text-[#0B0F14]">Bets ({bets.length})</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs data-[state=active]:bg-[#00DFA9] data-[state=active]:text-[#0B0F14]">Transactions ({txns.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 space-y-3">
            {[
              ["ID", `#${user.id}`],
              ["Username", user.username],
              ["Email", user.email],
              ["Role", user.role],
              ["KYC Status", user.kycStatus],
              ["Country", user.country ?? "—"],
              ["Referral Code", user.referralCode ?? "—"],
              ["Joined", fmtDate(user.createdAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-2 border-b border-white/5">
                <span className="text-[#94A3B8]">{label}</span>
                <span className="text-white font-mono text-xs">{value}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-[#94A3B8]">Status</span>
              <span className={cn("px-2 py-0.5 rounded-full text-xs border", user.isSuspended ? statusBg("rejected") : statusBg("active"))}>
                {user.isSuspended ? "Suspended" : "Active"}
              </span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-white/5">
              <span className="text-[#94A3B8]">Wallet Balance</span>
              <span className="text-[#00DFA9] font-mono text-xs">
                {user.balance !== null ? `$${fmt(user.balance)} USDT` : "—"}
              </span>
            </div>
            <button
              onClick={() => suspendMut.mutate(!user.isSuspended)}
              disabled={suspendMut.isPending}
              className={cn("w-full py-2 rounded-lg text-sm font-semibold transition-colors mt-2", user.isSuspended
                ? "bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20"
                : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
              )}
            >
              {suspendMut.isPending ? "Updating…" : user.isSuspended ? "Unsuspend User" : "Suspend User"}
            </button>
          </TabsContent>

          <TabsContent value="balance" className="mt-4 space-y-4">
            <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4 text-center">
              <div className="text-xs text-[#94A3B8] mb-1">Current Balance</div>
              <div className="text-3xl font-bold text-[#00DFA9]">
                ${user.balance !== null ? fmt(user.balance) : "0.00"} USDT
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">
                  Adjustment Amount (USDT) — positive to credit, negative to debit
                </label>
                <input
                  className={inp}
                  type="number"
                  step="0.01"
                  value={adjAmount}
                  onChange={e => setAdjAmount(e.target.value)}
                  placeholder="e.g. 50.00 or -25.00"
                />
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Notes (optional)</label>
                <input
                  className={inp}
                  value={adjNotes}
                  onChange={e => setAdjNotes(e.target.value)}
                  placeholder="Reason for adjustment…"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (adjAmount) balMut.mutate(adjAmount); }}
                  disabled={!adjAmount || balMut.isPending}
                  className="flex-1 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 disabled:opacity-50 transition-colors"
                >
                  {balMut.isPending ? "Applying…" : "Apply Adjustment"}
                </button>
              </div>
              <p className="text-xs text-[#64748B]">
                Positive amounts credit the wallet; negative amounts debit it. Both are recorded in the transaction log.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="bets" className="mt-4">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {bets.length === 0 ? (
                <div className="text-center py-8 text-[#94A3B8] text-sm">No bets yet</div>
              ) : bets.map(b => (
                <div key={b.id} className="bg-[#0D1117] border border-white/8 rounded-lg p-3 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-[#94A3B8]">#{b.id} · {b.type}</span>
                    <span className={cn("px-2 py-0.5 rounded-full border", statusBg(b.status))}>{b.status}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>Stake: <span className="text-[#FACC15]">${fmt(b.stake)}</span></span>
                    <span>Return: <span className="text-[#00DFA9]">${fmt(b.potentialReturn)}</span></span>
                    <span>Odds: {Number(b.totalOdds).toFixed(2)}</span>
                  </div>
                  <div className="text-[#64748B] mt-1">{fmtDate(b.createdAt)}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {txns.length === 0 ? (
                <div className="text-center py-8 text-[#94A3B8] text-sm">No transactions yet</div>
              ) : txns.map(t => (
                <div key={t.id} className="bg-[#0D1117] border border-white/8 rounded-lg p-3 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-[#94A3B8]">#{t.id} · {t.type.replace(/_/g, " ")}</span>
                    <span className={cn("px-2 py-0.5 rounded-full border", statusBg(t.status))}>{t.status}</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span className={t.type === "withdrawal" || t.type === "bet_stake" || t.type === "debit" ? "text-red-400" : "text-[#00DFA9]"}>
                      {t.type === "withdrawal" || t.type === "bet_stake" || t.type === "debit" ? "-" : "+"}${fmt(t.amount)} USDT
                    </span>
                    {t.reference && <span className="text-[#64748B] font-mono">{t.reference}</span>}
                  </div>
                  <div className="text-[#64748B] mt-1">{fmtDate(t.createdAt)}</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

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

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.patch(`/admin/users/${id}`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Role updated"); },
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
      {selectedUser && (
        <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-[#94A3B8] mt-1">{total.toLocaleString()} total</p>
        </div>
        <form onSubmit={doSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Email or username…"
              className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00DFA9] w-64 transition-colors"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 transition-colors">
            Search
          </button>
        </form>
      </div>

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[#94A3B8] text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">KYC</th>
                <th className="text-left px-4 py-3">Balance</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-[#94A3B8]">Loading…</td></tr>
              ) : data?.users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-[#94A3B8]">No users found</td></tr>
              ) : data?.users.map(u => (
                <tr key={u.id}
                  className="border-b border-white/5 hover:bg-white/2 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(u)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{u.username}</div>
                    <div className="text-xs text-[#94A3B8]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select
                      value={u.role}
                      onChange={e => roleMut.mutate({ id: u.id, role: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#00DFA9]"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs border", statusBg(u.kycStatus))}>
                      {u.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#00DFA9] font-mono text-xs">
                    {u.balance !== null ? `$${fmt(u.balance)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs border", u.isSuspended ? statusBg("rejected") : statusBg("active"))}>
                      {u.isSuspended ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#94A3B8] text-xs">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 text-sm text-[#94A3B8]">
          <span>Page {page} of {pages} — click a row to view user details</span>
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
