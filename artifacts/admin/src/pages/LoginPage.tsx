import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, ShieldCheck, Smartphone, ArrowLeft } from "lucide-react";
import { api, setToken, setStoredUser } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // TOTP step
  const [totpToken, setTotpToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (totpToken) codeRef.current?.focus();
  }, [totpToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<
        | { requiresTotp: true; totpToken: string }
        | { accessToken: string; user: { id: number; username: string; email: string; role: string } }
      >("/auth/admin/login", { email, password });

      if ("requiresTotp" in res && res.requiresTotp) {
        setTotpToken(res.totpToken);
        return;
      }

      const r = res as { accessToken: string; user: { id: number; username: string; email: string; role: string } };
      if (r.user.role !== "admin" && r.user.role !== "super_admin") {
        toast.error("Access denied — admin role required");
        return;
      }
      setToken(r.accessToken);
      setStoredUser({ id: r.user.id, username: r.user.username, email: r.user.email, role: r.user.role });
      setLocation("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!totpToken) return;
    setCodeError("");
    setLoading(true);
    try {
      const res = await api.post<{
        accessToken: string;
        user: { id: number; username: string; email: string; role: string };
      }>("/auth/admin/totp/challenge", { totpToken, code });
      setToken(res.accessToken);
      setStoredUser({ id: res.user.id, username: res.user.username, email: res.user.email, role: res.user.role });
      setLocation("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Incorrect code";
      if (msg.includes("expired") || msg.includes("invalid")) {
        setTotpToken(null);
        setCode("");
        toast.error("Session expired — please sign in again");
      } else {
        setCodeError(msg);
        setCode("");
        codeRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#00DFA9]/4 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#38BDF8]/4 blur-[120px]" />
      </div>

      <div className="w-full max-w-[360px] relative z-10">
        <div className="flex flex-col items-center gap-3 mb-7">
          <img
            src="https://media.ourwebprojects.pro/wp-content/uploads/2026/06/Xing-Huang-Logo-official.webp"
            alt="Xing Huang"
            className="h-11 object-contain"
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#00DFA9]/10 border border-[#00DFA9]/25 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00DFA9]" />
            <span className="text-xs text-[#00DFA9] font-medium tracking-wide">Admin Portal</span>
          </div>
        </div>

        <div className="bg-[#0D1117] border border-white/8 rounded-2xl p-7 shadow-2xl shadow-black/40">
          {!totpToken ? (
            <>
              <div className="mb-6">
                <h1 className="text-[17px] font-semibold text-white">Sign in to your account</h1>
                <p className="text-sm text-[#64748B] mt-1">Super admin access only</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Email address</label>
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@xinghuang.vip"
                    className="w-full bg-white/4 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9]/60 focus:bg-white/5 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"} required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/4 border border-white/10 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9]/60 focus:bg-white/5 transition-all"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#94A3B8] transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-[#00DFA9] hover:bg-[#00DFA9]/90 active:scale-[0.98] text-[#0B0F14] font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-4 h-4 text-[#00DFA9]" />
                  <h1 className="text-[17px] font-semibold text-white">Two-factor authentication</h1>
                </div>
                <p className="text-sm text-[#64748B]">Enter the 6-digit code from your authenticator app</p>
              </div>

              <form onSubmit={handleTotpSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Authenticator code</label>
                  <input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setCodeError(""); }}
                    placeholder="000000"
                    className={`w-full bg-white/4 border rounded-lg px-3.5 py-2.5 text-sm text-white text-center tracking-[0.4em] placeholder:text-[#374151] placeholder:tracking-normal focus:outline-none focus:bg-white/5 transition-all font-mono ${codeError ? "border-[#EF4444]/60 focus:border-[#EF4444]" : "border-white/10 focus:border-[#00DFA9]/60"}`}
                    autoComplete="one-time-code"
                  />
                  {codeError && (
                    <p className="text-xs text-[#EF4444] mt-1.5">{codeError}</p>
                  )}
                </div>

                <button type="submit" disabled={loading || code.length !== 6}
                  className="w-full bg-[#00DFA9] hover:bg-[#00DFA9]/90 active:scale-[0.98] text-[#0B0F14] font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : "Verify"}
                </button>

                <button type="button" onClick={() => { setTotpToken(null); setCode(""); setCodeError(""); }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-[#475569] hover:text-[#94A3B8] transition-colors py-1">
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-[#1E293B] mt-5">
          Xing Huang Admin · Restricted access
        </p>
      </div>
    </div>
  );
}
