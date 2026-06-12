import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api, AdminUser } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { Search, Ban, CheckCircle, ChevronLeft, ChevronRight, User, UserPlus, X, History, Wallet, Network, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataTable, ColDef } from "@/components/DataTable";

const PAGE_SIZE = 20;
const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors";

const NETWORK_COLORS: Record<string, string> = {
  Ethereum:  "bg-[#627EEA]/10 text-[#627EEA] border-[#627EEA]/20",
  BSC:       "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20",
  Polygon:   "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20",
  Avalanche: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
  Optimism:  "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
  Arbitrum:  "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20",
  Base:      "bg-[#0052FF]/10 text-[#60A5FA] border-[#60A5FA]/20",
  Fantom:    "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20",
};

function WalletCell({ u }: { u: AdminUser }) {
  const [copied, setCopied] = useState(false);
  if (!u.walletAddress) return <span className="text-[#334155] text-xs">—</span>;
  function doCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(u.walletAddress!).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const netStyle = u.walletNetwork ? (NETWORK_COLORS[u.walletNetwork] ?? "bg-white/5 text-[#94A3B8] border-white/10") : "";
  return (
    <div className="flex items-center gap-1.5 group/wc">
      <Wallet className="w-3 h-3 text-[#334155] shrink-0" />
      <span className="font-mono text-[11px] text-[#64748B]" title={u.walletAddress}>
        {u.walletAddress.slice(0, 6)}…{u.walletAddress.slice(-4)}
      </span>
      <button onClick={doCopy} title="Copy address"
        className="opacity-0 group-hover/wc:opacity-100 text-[#334155] hover:text-[#00DFA9] transition-all">
        {copied ? <Check className="w-3 h-3 text-[#00DFA9]" /> : <Copy className="w-3 h-3" />}
      </button>
      {u.walletNetwork && (
        <span className={cn("flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium border", netStyle)}>
          <Network className="w-2 h-2" /> {u.walletNetwork}
        </span>
      )}
    </div>
  );
}

function roleBadge(role: string) {
  if (role === "super_admin") return "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20";
  if (role === "admin") return "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20";
  return "bg-white/5 text-[#94A3B8] border-white/10";
}

function kycBadge(kyc: string) {
  if (kyc === "verified" || kyc === "approved") return "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20";
  if (kyc === "pending") return "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20";
  if (kyc === "rejected") return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-white/5 text-[#94A3B8] border-white/10";
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
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
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

  const cols: ColDef<AdminUser>[] = [
    {
      key: "user", label: "User",
      render: u => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-[#475569]" />
          </div>
          <div>
            <div className="font-medium text-white text-sm">{u.username ?? <span className="text-[#475569] italic">no username</span>}</div>
            <div className="text-[11px] text-[#475569]">{u.email ?? "—"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "wallet", label: "Wallet",
      render: u => <WalletCell u={u} />,
    },
    {
      key: "role", label: "Role", sortable: true,
      getValue: u => u.role,
      render: u => (
        <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium", roleBadge(u.role))}>
          {u.role.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "kyc", label: "KYC", sortable: true,
      getValue: u => u.kycStatus,
      render: u => (
        <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium", kycBadge(u.kycStatus))}>
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
    <div className="space-y-5">
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Users</h1>
          <p className="text-sm text-[#475569] mt-0.5">{total.toLocaleString()} total · tap a row to open full profile</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <form onSubmit={doSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Email or username…"
                className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] w-full sm:w-52 transition-colors"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-white/8 border border-white/10 text-[#94A3B8] rounded-lg text-sm hover:bg-white/12 transition-colors shrink-0">
              Search
            </button>
          </form>
          <div className="flex gap-2">
            <button onClick={() => navigate("/login-history")}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 text-[#94A3B8] hover:text-white rounded-lg text-sm hover:bg-white/10 transition-colors">
              <History className="w-4 h-4" /><span className="hidden sm:inline">Login History</span>
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:bg-[#00DFA9]/90 transition-colors flex-1 sm:flex-none justify-center">
              <UserPlus className="w-4 h-4" /> New User
            </button>
          </div>
        </div>
      </div>

      <DataTable
        cols={cols}
        rows={data?.users}
        loading={isLoading}
        rowKey={u => u.id}
        onRowClick={u => navigate(`/users/${u.id}`)}
        empty="No users found"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs">Page {page} of {pages}</span>
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
