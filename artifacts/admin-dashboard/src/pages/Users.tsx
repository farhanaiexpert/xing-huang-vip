import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminGetUsers,
  useAdminEditUser,
  useAdminAdjustUserBalance,
  useAdminGetUserDetail,
  getAdminGetUsersQueryKey,
} from "@workspace/api-client-react";
import { StatusBadge } from "./Overview";
import { toast } from "sonner";

type UserRow = {
  id: string; username: string; email?: string | null;
  walletAddress?: string | null; role: string; status: string; createdAt: string;
};

const thCls = "px-4 py-3 text-left text-[9.5px] font-bold uppercase tracking-[0.1em] whitespace-nowrap";
const thStyle = { color: "#1E3A5F", borderBottom: "1px solid rgba(255,255,255,0.04)" };
const inputCls = "w-full px-3 py-2 rounded-xl text-[12.5px] outline-none transition-all";
const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#F1F5F9" };

/* ─── Field ─────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#334155" }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Edit User Modal ────────────────────────────────────────── */
function EditUserModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const editMut = useAdminEditUser();
  const adjustMut = useAdminAdjustUserBalance();
  const { data: detail, isLoading: detailLoading } = useAdminGetUserDetail(user.id);

  const [tab, setTab] = useState<"edit" | "balance" | "detail">("edit");
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [username,      setUsername]      = useState(user.username);
  const [email,         setEmail]         = useState(user.email ?? "");
  const [wallet,        setWallet]        = useState(user.walletAddress ?? "");
  const [role,          setRole]          = useState(user.role);
  const [status,        setStatus]        = useState(user.status);
  const [newPassword,   setNewPassword]   = useState("");

  // Balance form state
  const [adjDir,    setAdjDir]    = useState<"credit" | "debit">("credit");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (username !== user.username)                     body.username = username;
      if (email !== (user.email ?? ""))                   body.email = email || null;
      if (wallet !== (user.walletAddress ?? ""))          body.walletAddress = wallet || null;
      if (role !== user.role)                             body.role = role;
      if (status !== user.status)                         body.status = status;
      if (newPassword)                                    body.newPassword = newPassword;

      if (Object.keys(body).length === 0) { toast.info("No changes to save"); setSaving(false); return; }

      await editMut.mutateAsync({ id: user.id, data: body as any });
      queryClient.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
      toast.success("User updated", { description: `Changes saved for ${username}` });
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to update user";
      toast.error("Update failed", { description: msg });
    } finally {
      setSaving(false);
    }
  }

  async function handleAdjust() {
    const amt = parseFloat(adjAmount);
    if (!adjAmount || isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!adjReason.trim()) { toast.error("Reason is required"); return; }
    setAdjusting(true);
    try {
      const finalAmt = adjDir === "debit" ? -amt : amt;
      const result = await adjustMut.mutateAsync({ id: user.id, data: { amount: finalAmt, reason: adjReason } });
      toast.success(adjDir === "credit" ? "Balance credited" : "Balance debited", {
        description: `$${amt.toFixed(2)} USDT ${adjDir === "credit" ? "added to" : "deducted from"} balance. New balance: $${parseFloat(result.available).toFixed(2)}`,
      });
      setAdjAmount(""); setAdjReason("");
      queryClient.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Adjustment failed";
      toast.error("Adjustment failed", { description: msg });
    } finally {
      setAdjusting(false);
    }
  }

  const tabs = [
    { id: "edit",    label: "Edit Profile" },
    { id: "balance", label: "Adjust Balance" },
    { id: "detail",  label: "Activity" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-10 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.08)" }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: "rgba(0,223,169,0.12)", color: "#00DFA9", border: "1px solid rgba(0,223,169,0.2)" }}>
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">{user.username}</p>
              <p className="text-[10.5px]" style={{ color: "#334155" }}>{user.email ?? "No email"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ color: "#334155" }}
            onMouseEnter={e => { (e.target as HTMLElement).closest("button")!.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).closest("button")!.style.background = "transparent"; }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-3 gap-1 shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all"
              style={tab === t.id
                ? { background: "rgba(0,223,169,0.12)", color: "#00DFA9", border: "1px solid rgba(0,223,169,0.2)" }
                : { background: "transparent", color: "#334155", border: "1px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto flex-1">

          {/* ── Edit Profile ── */}
          {tab === "edit" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username">
                  <input className={inputCls} style={inputStyle} value={username} onChange={e => setUsername(e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}/>
                </Field>
                <Field label="Email">
                  <input type="email" className={inputCls} style={inputStyle} value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Optional"
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}/>
                </Field>
              </div>

              <Field label="Wallet Address">
                <input className={inputCls} style={inputStyle} value={wallet} onChange={e => setWallet(e.target.value)}
                  placeholder="0x… (optional)"
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}/>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Role">
                  <select className={inputCls} style={{ ...inputStyle, cursor: "pointer" }}
                    value={role} onChange={e => setRole(e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select className={inputCls} style={{ ...inputStyle, cursor: "pointer" }}
                    value={status} onChange={e => setStatus(e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </Field>
              </div>

              <Field label="Reset Password">
                <input type="password" className={inputCls} style={inputStyle} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current"
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}/>
              </Field>

              <button onClick={handleSave} disabled={saving}
                className="w-full py-2.5 rounded-xl text-[12.5px] font-bold transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "#00DFA9", color: "#0B1F0F" }}>
                {saving
                  ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>Saving…</>
                  : "Save Changes"}
              </button>
            </div>
          )}

          {/* ── Adjust Balance ── */}
          {tab === "balance" && (
            <div className="space-y-4">
              {detail?.balance && (
                <div className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: "rgba(0,223,169,0.06)", border: "1px solid rgba(0,223,169,0.15)" }}>
                  <span className="text-[11.5px] font-semibold" style={{ color: "#334155" }}>Current Balance</span>
                  <span className="text-[18px] font-extrabold" style={{ color: "#00DFA9" }}>
                    ${parseFloat(detail.balance.available).toFixed(2)} <span className="text-[11px] font-semibold">USDT</span>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {(["credit","debit"] as const).map(d => (
                  <button key={d} onClick={() => setAdjDir(d)}
                    className="py-2.5 rounded-xl text-[12px] font-semibold transition-all capitalize"
                    style={adjDir === d
                      ? d === "credit"
                        ? { background: "rgba(0,223,169,0.15)", color: "#00DFA9", border: "1px solid rgba(0,223,169,0.3)" }
                        : { background: "rgba(239,68,68,0.12)", color: "#F87171", border: "1px solid rgba(239,68,68,0.25)" }
                      : { background: "rgba(255,255,255,0.03)", color: "#334155", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {d === "credit" ? "+ Credit" : "− Debit"}
                  </button>
                ))}
              </div>

              <Field label="Amount (USDT)">
                <input type="number" min="0.01" step="0.01" className={inputCls} style={inputStyle}
                  value={adjAmount} onChange={e => setAdjAmount(e.target.value)}
                  placeholder="e.g. 50.00"
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}/>
              </Field>

              <Field label="Reason">
                <textarea className={`${inputCls} resize-none`} style={{ ...inputStyle, minHeight: "72px" }}
                  value={adjReason} onChange={e => setAdjReason(e.target.value)}
                  placeholder="e.g. Welcome bonus, compensation, correction…"
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}/>
              </Field>

              <button onClick={handleAdjust} disabled={adjusting}
                className="w-full py-2.5 rounded-xl text-[12.5px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={adjDir === "credit"
                  ? { background: "#00DFA9", color: "#0B1F0F" }
                  : { background: "rgba(239,68,68,0.8)", color: "#fff" }}>
                {adjusting
                  ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>Processing…</>
                  : adjDir === "credit" ? `Credit $${adjAmount || "0.00"} USDT` : `Debit $${adjAmount || "0.00"} USDT`}
              </button>
            </div>
          )}

          {/* ── Activity ── */}
          {tab === "detail" && (
            <div className="space-y-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: "#334155" }}/>
                </div>
              ) : detail ? (
                <>
                  {/* Balance summary */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Available", value: `$${parseFloat(detail.balance.available).toFixed(2)}`, color: "#00DFA9" },
                      { label: "Locked",    value: `$${parseFloat(detail.balance.locked ?? "0").toFixed(2)}`,    color: "#F1F5F9" },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl p-3"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <p className="text-[9.5px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#334155" }}>{item.label}</p>
                        <p className="text-[16px] font-extrabold" style={{ color: item.color }}>{item.value}</p>
                        <p className="text-[9px]" style={{ color: "#334155" }}>USDT</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent bets */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#334155" }}>
                      Recent Bets ({detail.recentBets.length})
                    </p>
                    {detail.recentBets.length === 0 ? (
                      <p className="text-[12px] text-center py-4" style={{ color: "#334155" }}>No bets placed</p>
                    ) : (
                      <div className="space-y-1.5">
                        {detail.recentBets.map((bet: any) => (
                          <div key={bet.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div>
                              <p className="text-[11px] font-semibold text-white">
                                {bet.selections?.[0]
                                  ? `${bet.selections[0].homeTeam} v ${bet.selections[0].awayTeam}`
                                  : bet.id.slice(0, 12) + "…"}
                              </p>
                              <p className="text-[10px] mt-0.5" style={{ color: "#334155" }}>
                                ${parseFloat(bet.stake).toFixed(2)} stake · @{parseFloat(bet.totalOdds).toFixed(2)}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              bet.status === "won"     ? "text-emerald-400 bg-emerald-500/10"
                            : bet.status === "lost"    ? "text-red-400 bg-red-500/10"
                            : bet.status === "void"    ? "text-slate-400 bg-white/5"
                            : "text-yellow-400 bg-yellow-500/10"}`}>
                              {bet.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent transactions */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#334155" }}>
                      Recent Transactions ({detail.recentTransactions.length})
                    </p>
                    {detail.recentTransactions.length === 0 ? (
                      <p className="text-[12px] text-center py-4" style={{ color: "#334155" }}>No transactions</p>
                    ) : (
                      <div className="space-y-1.5">
                        {detail.recentTransactions.map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                            <div>
                              <p className="text-[11px] font-semibold text-white capitalize">{tx.type.replace(/_/g, " ")}</p>
                              {tx.description && <p className="text-[10px] mt-0.5 truncate max-w-[220px]" style={{ color: "#334155" }}>{tx.description}</p>}
                            </div>
                            <span className={`text-[12px] font-bold ${
                              tx.type === "bet_win" || tx.type === "bet_refund" || tx.type === "deposit"
                                ? "text-emerald-400"
                                : "text-red-400"}`}>
                              {tx.type === "bet_win" || tx.type === "bet_refund" || tx.type === "deposit" ? "+" : "−"}
                              ${parseFloat(tx.amount).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-center py-8 text-sm" style={{ color: "#334155" }}>Could not load user data</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Users page ────────────────────────────────────────── */
export default function Users() {
  const { data, isLoading, error } = useAdminGetUsers();
  const [search,   setSearch]   = useState("");
  const [editing,  setEditing]  = useState<UserRow | null>(null);

  const users = (data?.users ?? []).filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.email?.toLowerCase().includes(q) ?? false) ||
      (u.walletAddress?.toLowerCase().includes(q) ?? false)
    );
  }) as UserRow[];

  return (
    <div className="space-y-5 animate-float-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[17px] font-bold text-white tracking-tight">Users</h1>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#334155" }}>
            {data?.total ?? 0} registered accounts · Click any row to edit
          </p>
        </div>
        <input
          type="search"
          placeholder="Search username, email, wallet…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-xl text-[12px] placeholder:text-[#334155] outline-none transition-all w-72"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.08)", color: "#CBD5E1" }}
          onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        />
      </div>

      {isLoading ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <table className="w-full">
            <thead><tr>
              {["User","Wallet","Role","Status","Joined",""].map(h => (
                <th key={h} className={thCls} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {Array.from({length:6}).map((_,i) => (
                <tr key={i} className="border-b border-white/[0.03] last:border-0">
                  {Array.from({length:6}).map((__,j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-shimmer" style={{ width: `${40+(j*12)%50}px` }}/>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <div className="px-4 py-3 rounded-xl text-[12.5px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171" }}>
          Failed to load users
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-20"
          style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <svg className="w-5 h-5" fill="none" stroke="#334155" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-white mb-1">
            {search ? "No users match your search" : "No users registered yet"}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "hsl(222,40%,7%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["User","Wallet","Role","Status","Joined",""].map(h => (
                    <th key={h} className={thCls} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}
                    className="table-row-hover border-b border-white/[0.03] last:border-0 cursor-pointer"
                    onClick={() => setEditing(u)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold"
                          style={{ background: "rgba(0,223,169,0.1)", color: "#00DFA9", border: "1px solid rgba(0,223,169,0.15)" }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[12.5px] font-semibold text-white">{u.username}</p>
                          {u.email && <p className="text-[10px] truncate max-w-[160px]" style={{ color: "#334155" }}>{u.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.walletAddress ? (
                        <span className="font-mono text-[10.5px]" style={{ color: "#4A6080" }}>
                          {u.walletAddress.slice(0,6)}…{u.walletAddress.slice(-4)}
                        </span>
                      ) : <span className="text-[11px] italic" style={{ color: "#1E3A5F" }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={u.role === "admin"
                          ? { background: "rgba(251,191,36,0.1)", color: "#FCD34D", borderColor: "rgba(251,191,36,0.2)" }
                          : { background: "rgba(255,255,255,0.04)", color: "#334155", borderColor: "rgba(255,255,255,0.08)" }}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.status}/></td>
                    <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: "#334155" }}>
                      {new Date(u.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.04)", color: "#334155" }}>
                        Edit →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)}/>}
    </div>
  );
}
