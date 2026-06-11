import { useState } from "react";
import { ShieldCheck, Eye, EyeOff, UserPlus, Lock, CheckCircle2 } from "lucide-react";
import { api, getStoredUser } from "@/lib/api";

export default function SecretAdminPage() {
  const user = getStoredUser();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ username: string; email: string } | null>(null);

  if (!user || user.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p className="text-white font-bold text-lg">Access Denied</p>
          <p className="text-[#64748B] text-sm mt-1">Super admin access required</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    try {
      const res = await api.post<{ id: number; username: string; email: string }>(
        "/admin/users",
        { username: form.username, email: form.email, password: form.password, role: "super_admin" }
      );
      setSuccess({ username: res.username, email: res.email });
      setForm({ username: "", email: "", password: "", confirm: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00DFA9]/10 border border-[#00DFA9]/20 mb-4">
            <ShieldCheck className="h-7 w-7 text-[#00DFA9]" />
          </div>
          <h1 className="text-xl font-bold text-white">Create Super Admin</h1>
          <p className="text-[#64748B] text-sm mt-1">Restricted — not visible in navigation</p>
          <p className="text-[#00DFA9]/60 text-xs mt-1">Logged in as: {user.email}</p>
        </div>

        {success ? (
          <div className="bg-[#0E1520] border border-[#00DFA9]/30 rounded-2xl p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#00DFA9] mx-auto mb-3" />
            <p className="text-white font-bold mb-1">Account Created</p>
            <p className="text-[#94A3B8] text-sm">@{success.username}</p>
            <p className="text-[#64748B] text-xs">{success.email}</p>
            <button
              onClick={() => setSuccess(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/30 text-[#00DFA9] text-sm font-semibold hover:bg-[#00DFA9]/20 transition-colors"
            >
              Create Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#0E1520] border border-[#1E2D3D] rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Username</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="superadmin2"
                className="w-full h-10 px-3 rounded-xl bg-[#121821] border border-[#253241] text-white text-sm placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#00DFA9]/50 focus:ring-1 focus:ring-[#00DFA9]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="admin2@xinghuang.vip"
                className="w-full h-10 px-3 rounded-xl bg-[#121821] border border-[#253241] text-white text-sm placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#00DFA9]/50 focus:ring-1 focus:ring-[#00DFA9]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  className="w-full h-10 pl-3 pr-10 rounded-xl bg-[#121821] border border-[#253241] text-white text-sm placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#00DFA9]/50 focus:ring-1 focus:ring-[#00DFA9]/20"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wide">Confirm Password</label>
              <input
                type={showPw ? "text" : "password"}
                required
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat password"
                className="w-full h-10 px-3 rounded-xl bg-[#121821] border border-[#253241] text-white text-sm placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#00DFA9]/50 focus:ring-1 focus:ring-[#00DFA9]/20"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#00DFA9] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#00DFA9]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? "Creating…" : "Create Super Admin"}
            </button>
          </form>
        )}

        <p className="text-center text-[#374151] text-xs mt-6">
          This page is not linked from any navigation.<br />
          URL: /admin/secret/admin
        </p>
      </div>
    </div>
  );
}
