import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, ShieldCheck, Smartphone, ArrowLeft, AlertCircle, Globe, Check, Lock } from "lucide-react";
import { api, setToken, setStoredUser } from "@/lib/api";
import { stopChineseTranslation } from "@/i18n/translator";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "zh-CN", label: "Chinese", native: "中文", flag: "🇨🇳", short: "ZH" },
  { code: "en", label: "English", native: "English", flag: "🇬🇧", short: "EN" },
];
const LANG_STORAGE_KEY = "admin_lang";

function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      return stored === "en" || stored === "zh-CN" ? stored : "zh-CN";
    } catch {
      return "zh-CN";
    }
  });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(code: string) {
    if (code === currentLang) {
      setOpen(false);
      return;
    }
    setCurrentLang(code);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
    setOpen(false);
    // Mirror the in-app switcher: the DeepL DOM translator initialises at boot
    // from the stored language, so reload to render cleanly in the new language.
    stopChineseTranslation();
    window.location.reload();
  }

  const active = LANGUAGES.find(l => l.code === currentLang) ?? LANGUAGES[0];

  return (
    <div className="relative" ref={ref} translate="no">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all ${
          open
            ? "border-[#00DFA9]/40 bg-[#00DFA9]/10 text-[#00DFA9]"
            : "border-white/10 bg-white/5 text-[#94A3B8] hover:border-white/20 hover:bg-white/8 hover:text-white"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="leading-none">{active.flag}</span>
        <span className="leading-none">{active.short}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0D1117]/95 shadow-[0_12px_48px_rgba(0,0,0,0.65)] backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
            <Globe className="h-3.5 w-3.5 text-[#00DFA9]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Language</p>
          </div>
          <div className="py-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => select(lang.code)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  currentLang === lang.code
                    ? "bg-[#00DFA9]/10 text-[#00DFA9]"
                    : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-5 text-center text-base leading-none">{lang.flag}</span>
                <span className="flex-1 text-left text-[13px]">{lang.native}</span>
                {currentLang === lang.code && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

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
    setFormError("");
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
        setFormError("Access denied — admin role required");
        toast.error("Access denied — admin role required");
        return;
      }
      setToken(r.accessToken);
      setStoredUser({ id: r.user.id, username: r.user.username, email: r.user.email, role: r.user.role });
      setLocation("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setFormError(msg);
      toast.error(msg);
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
      {/* ── Animated ambient background ── */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#00DFA9]/5 blur-[140px] animate-login-orb" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[520px] h-[520px] rounded-full bg-[#38BDF8]/5 blur-[120px] animate-login-orb-alt" />
        <div className="absolute top-[40%] left-[55%] w-[380px] h-[380px] rounded-full bg-[#FACC15]/3 blur-[130px] animate-login-orb" />
        {/* subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent)",
          }}
        />
      </div>

      {/* ── Top-right language switcher ── */}
      <div className="absolute top-5 right-5 z-20 animate-in fade-in duration-700">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-[380px] relative z-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
        {/* ── Logo / brand ── */}
        <div className="flex flex-col items-center gap-3.5 mb-8">
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-[#00DFA9]/15 blur-2xl scale-150" />
            <img
              src="https://media.ourwebprojects.pro/wp-content/uploads/2026/06/Xing-Huang-Logo-official.webp"
              alt="Xing Huang"
              className="h-[50px] object-contain drop-shadow-[0_4px_20px_rgba(0,223,169,0.15)]"
              onError={e => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#00DFA9]/10 border border-[#00DFA9]/25 rounded-full backdrop-blur-sm shadow-[0_0_20px_rgba(0,223,169,0.08)]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00DFA9]" />
            <span className="text-xs text-[#00DFA9] font-medium tracking-wide">Admin Portal</span>
          </div>
        </div>

        {/* ── Glass card ── */}
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-7 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          {/* top edge highlight */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {!totpToken ? (
            <>
              <div className="mb-6">
                <h1 className="text-[18px] font-semibold text-white tracking-tight">Sign in to your account</h1>
                <p className="text-sm text-[#64748B] mt-1">Super admin access only</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (formError) setFormError("");
                    }}
                    placeholder="admin@xinghuang.vip"
                    autoComplete="username"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-[#374151] transition-all duration-200 focus:outline-none focus:border-[#00DFA9]/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(0,223,169,0.12)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (formError) setFormError("");
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-[#374151] transition-all duration-200 focus:outline-none focus:border-[#00DFA9]/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(0,223,169,0.12)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#94A3B8] transition-colors"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {formError && (
                  <div className="flex items-start gap-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/8 px-3 py-2 text-xs text-[#FCA5A5] animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="login-sheen relative overflow-hidden w-full bg-[#00DFA9] hover:bg-[#00DFA9] text-[#0B0F14] font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 hover:shadow-[0_8px_24px_-6px_rgba(0,223,169,0.5)] hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none mt-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Sign in
                    </span>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-4 h-4 text-[#00DFA9]" />
                  <h1 className="text-[18px] font-semibold text-white tracking-tight">Two-factor authentication</h1>
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
                    onChange={e => {
                      setCode(e.target.value.replace(/\D/g, ""));
                      setCodeError("");
                    }}
                    placeholder="000000"
                    className={`w-full bg-white/[0.04] border rounded-lg px-3.5 py-2.5 text-sm text-white text-center tracking-[0.4em] placeholder:text-[#374151] placeholder:tracking-normal focus:outline-none focus:bg-white/[0.06] transition-all duration-200 font-mono ${
                      codeError
                        ? "border-[#EF4444]/60 focus:border-[#EF4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
                        : "border-white/10 focus:border-[#00DFA9]/60 focus:shadow-[0_0_0_3px_rgba(0,223,169,0.12)]"
                    }`}
                    autoComplete="one-time-code"
                  />
                  {codeError && (
                    <p className="flex items-center gap-1.5 text-xs text-[#FCA5A5] mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {codeError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="login-sheen relative overflow-hidden w-full bg-[#00DFA9] text-[#0B0F14] font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 hover:shadow-[0_8px_24px_-6px_rgba(0,223,169,0.5)] hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    "Verify"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTotpToken(null);
                    setCode("");
                    setCodeError("");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-[#475569] hover:text-[#94A3B8] transition-colors py-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </button>
              </form>
            </>
          )}
        </div>

        {/* ── Trust / security strip ── */}
        <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-[#475569]">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-[#00DFA9]/70" />
            End-to-end encrypted
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-[#00DFA9]/70" />
            2FA protected
          </span>
        </div>

        <p className="text-center text-[11px] text-[#334155] mt-3">
          Xing Huang Admin · Restricted access
        </p>
      </div>
    </div>
  );
}
