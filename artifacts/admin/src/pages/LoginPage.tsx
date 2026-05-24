import { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { api, setToken } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; user: { role: string } }>("/auth/login", { email, password });
      if (res.user.role !== "super_admin") {
        toast.error("Access denied — super_admin role required");
        return;
      }
      setToken(res.accessToken);
      setLocation("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <ShieldCheck className="w-8 h-8 text-[#00DFA9]" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Cup<span className="text-[#00DFA9]">Bett</span>
            <span className="ml-1 text-sm font-normal text-[#94A3B8]">Admin</span>
          </span>
        </div>

        <form onSubmit={handleSubmit}
          className="bg-[#0D1117] border border-white/8 rounded-2xl p-8 space-y-5"
        >
          <div>
            <h1 className="text-xl font-semibold text-white mb-1">Sign in</h1>
            <p className="text-sm text-[#94A3B8]">Super admin access only</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@cupbett.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00DFA9] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#00DFA9] transition-colors"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-[#00DFA9] hover:bg-[#00DFA9]/90 text-[#0B0F14] font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
