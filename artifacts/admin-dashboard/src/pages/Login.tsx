import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminAuth } from "../hooks/useAdminAuth";

export default function Login() {
  const { login, user } = useAdminAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Login failed");
        return;
      }
      if (data.user?.role !== "admin") {
        navigate("/");
        return;
      }
      login(data.token, data.user);
      navigate("/");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050810]">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="animate-orb absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,223,169,0.07) 0%, transparent 70%)" }} />
        <div className="animate-orb absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)", animationDelay: "-4s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,180,255,0.04) 0%, transparent 60%)" }} />
      </div>

      {/* Dot grid */}
      <div className="dot-grid absolute inset-0 opacity-40 pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[400px] px-4 animate-float-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 relative"
            style={{ background: "linear-gradient(135deg, rgba(0,223,169,0.2) 0%, rgba(0,180,255,0.15) 100%)", border: "1px solid rgba(0,223,169,0.3)" }}>
            <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "0 0 30px rgba(0,223,169,0.2)" }} />
            <svg className="w-7 h-7 relative z-10" viewBox="0 0 28 28" fill="none">
              <path d="M14 3C8.477 3 4 7.477 4 13s4.477 10 10 10 10-4.477 10-10S19.523 3 14 3z" fill="rgba(0,223,169,0.15)" stroke="#00DFA9" strokeWidth="1.5" />
              <path d="M11 10.5a3 3 0 016 0v3a3 3 0 01-6 0v-3z" fill="#00DFA9" />
              <path d="M9.5 16.5h9" stroke="#00DFA9" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Cup<span className="text-gradient-teal">Bett</span>
          </h1>
          <p className="text-sm text-[#64748B] mt-1.5">Admin Control Panel</p>
        </div>

        <div className="relative rounded-2xl p-[1px]"
          style={{ background: "linear-gradient(135deg, rgba(0,223,169,0.2) 0%, rgba(139,92,246,0.15) 50%, rgba(0,180,255,0.2) 100%)" }}>
          <div className="rounded-2xl p-7" style={{ background: "rgba(8,12,20,0.95)", backdropFilter: "blur(20px)" }}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-2 uppercase tracking-widest">Username</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334155]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    required
                    value={form.login}
                    onChange={e => setForm({ ...form, login: e.target.value })}
                    placeholder="admin321"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-[#334155] focus:outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    onFocus={e => { e.currentTarget.style.border = "1px solid rgba(0,223,169,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,223,169,0.08)"; }}
                    onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-2 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334155]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-[#334155] focus:outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    onFocus={e => { e.currentTarget.style.border = "1px solid rgba(0,223,169,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,223,169,0.08)"; }}
                    onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                style={{
                  background: loading ? "rgba(0,223,169,0.6)" : "linear-gradient(135deg, #00DFA9 0%, #00C4E8 100%)",
                  color: "#050810",
                  boxShadow: loading ? "none" : "0 4px 20px rgba(0,223,169,0.3)",
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[11px] text-[#334155] mt-6">
          Restricted to authorized administrators only
        </p>
      </div>
    </div>
  );
}
