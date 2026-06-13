import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { clearToken, getStoredUser, api, PendingTotals, isTokenStored } from "@/lib/api";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useQuery } from "@tanstack/react-query";
import { stopChineseTranslation } from "@/i18n/translator";
import {
  LayoutDashboard, Users, Receipt, CreditCard, Share2,
  Gift, Trophy, ScrollText, LogOut, ChevronLeft, ChevronRight,
  Shield, ShieldCheck, Zap, Globe, BarChart2, Settings, CheckCheck,
  Activity, DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle, Clock, Check,
  Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { code: 'zh-CN', label: 'Chinese', native: '中文',   flag: '🇨🇳', short: 'ZH' },
  { code: 'en',    label: 'English', native: 'English', flag: '🇬🇧', short: 'EN' },
];

const LANG_STORAGE_KEY = 'admin_lang';

function NavSections({
  sections,
  location,
  collapsed,
  onNavClick,
}: {
  sections: ReturnType<typeof buildNavSections>;
  location: string;
  collapsed: boolean;
  onNavClick?: () => void;
}) {
  return (
    <nav className={cn("flex-1 py-3 overflow-y-auto overflow-x-hidden", collapsed ? "" : "")}>
      {sections.map(section => (
        <div key={section.label} className="mb-1">
          {!collapsed && (
            <div className="px-4 pb-1 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#334155]">
                {section.label}
              </span>
            </div>
          )}
          {collapsed && <div className="mx-3 my-1 border-t border-white/6" />}
          <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-2")}>
            {section.items.map(({ href, icon: Icon, label, badge }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavClick}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg text-sm transition-all",
                    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                    active
                      ? "bg-[#00DFA9]/12 text-[#00DFA9]"
                      : "text-[#64748B] hover:text-[#C4D4E3] hover:bg-white/5"
                  )}
                  title={collapsed ? label : undefined}
                >
                  <div className="relative shrink-0">
                    <Icon className={cn(collapsed ? "w-[18px] h-[18px]" : "w-4 h-4")} />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black leading-none">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="flex-1">{label}</span>
                  )}
                  {!collapsed && badge > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function buildNavSections(depositBadge: number, withdrawalBadge: number) {
  return [
    {
      label: "Platform",
      items: [
        { href: "/",           icon: LayoutDashboard, label: "Overview",    badge: 0 },
        { href: "/users",      icon: Users,           label: "Users",       badge: 0 },
        { href: "/bets",       icon: Receipt,         label: "Bets",        badge: 0 },
        { href: "/settlement", icon: CheckCheck,      label: "Settlement",  badge: 0 },
      ],
    },
    {
      label: "Finance",
      items: [
        { href: "/deposits",     icon: ArrowDownCircle, label: "Deposits",     badge: depositBadge },
        { href: "/withdrawals",  icon: ArrowUpCircle,   label: "Withdrawals",  badge: withdrawalBadge },
        { href: "/transactions", icon: CreditCard,      label: "Transactions", badge: 0 },
        { href: "/promotions",   icon: Gift,            label: "Promotions",   badge: 0 },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/pools",   icon: Trophy,      label: "Pools",         badge: 0 },
        { href: "/winspin", icon: Zap,         label: "WinSpin",       badge: 0 },
        { href: "/markets", icon: Globe,        label: "Markets",       badge: 0 },
        { href: "/boosts",  icon: TrendingUp,  label: "Price Boosts",  badge: 0 },
      ],
    },
    {
      label: "Risk & Compliance",
      items: [
        { href: "/liability",      icon: Activity,     label: "Liability",       badge: 0 },
        { href: "/rg-players",     icon: Shield,       label: "RG Players",      badge: 0 },
        { href: "/book-balance",   icon: DollarSign,   label: "Book Balance",    badge: 0 },
        { href: "/login-history",  icon: Clock,        label: "Login History",   badge: 0 },
      ],
    },
    {
      label: "Analytics",
      items: [
        { href: "/reports", icon: BarChart2, label: "Reports", badge: 0 },
      ],
    },
    {
      label: "System",
      items: [
        { href: "/admin-accounts", icon: ShieldCheck, label: "Admin Accounts", badge: 0 },
        { href: "/api-status",     icon: Activity,    label: "API Status",     badge: 0 },
        { href: "/audit",          icon: ScrollText,  label: "Audit Log",      badge: 0 },
        { href: "/settings",       icon: Settings,    label: "Settings",       badge: 0 },
      ],
    },
  ];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const storedUser = getStoredUser();

  const [currentLang, setCurrentLang] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      // Only English + Chinese are supported; sanitize any stale value.
      return stored === 'en' || stored === 'zh-CN' ? stored : 'zh-CN';
    } catch { return 'zh-CN'; }
  });
  const [showLang, setShowLang] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  function handleSelectLanguage(code: string) {
    setCurrentLang(code);
    try { localStorage.setItem(LANG_STORAGE_KEY, code); } catch { /* ignore */ }
    setShowLang(false);
    // The DeepL DOM translator is initialised at boot in main.tsx based on the
    // stored language. Reload so the page renders cleanly in the chosen language
    // (Chinese → translated, English → original).
    stopChineseTranslation();
    window.location.reload();
  }

  useEffect((): (() => void) | void => {
    if (currentLang === 'zh-CN') {
      return () => stopChineseTranslation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const activeLang = LANGUAGES.find(l => l.code === currentLang) ?? LANGUAGES[0];

  const handleCountChange = useCallback((count: number) => {
    setPendingCount(count);
  }, []);

  useAdminNotifications(handleCountChange);

  const { data: pendingTotals } = useQuery<PendingTotals>({
    queryKey: ["admin-txns-pending-totals"],
    queryFn: () => api.get("/admin/transactions/pending-totals"),
    refetchInterval: 30_000,
    enabled: isTokenStored(),
  });
  const depositBadge = pendingTotals?.pendingDepositCount ?? 0;
  const withdrawalBadge = pendingTotals?.pendingWithdrawalCount ?? 0;

  const navSections = buildNavSections(depositBadge, withdrawalBadge);

  function logout() {
    clearToken();
    setLocation("/login");
  }

  const LogoImg = () => (
    <img
      src="https://media.ourwebprojects.pro/wp-content/uploads/2026/06/Xing-Huang-Logo-official.webp"
      alt="Xing Huang"
      className="h-9 object-contain"
      onError={e => { e.currentTarget.style.display = "none"; }}
    />
  );

  const LangBottomSection = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div className="border-t border-white/8 p-2">
      {!inDrawer && !collapsed && storedUser && (
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-lg bg-white/3">
          <div className="w-7 h-7 rounded-full bg-[#00DFA9]/15 flex items-center justify-center shrink-0">
            <span className="text-[#00DFA9] text-xs font-bold uppercase">
              {(storedUser.username ?? storedUser.email ?? "A").slice(0, 1)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{storedUser.username ?? storedUser.email}</div>
            <div className="text-[10px] text-[#475569] capitalize">{storedUser.role.replace(/_/g, " ")}</div>
          </div>
        </div>
      )}
      {inDrawer && storedUser && (
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-lg bg-white/3">
          <div className="w-7 h-7 rounded-full bg-[#00DFA9]/15 flex items-center justify-center shrink-0">
            <span className="text-[#00DFA9] text-xs font-bold uppercase">
              {(storedUser.username ?? storedUser.email ?? "A").slice(0, 1)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{storedUser.username ?? storedUser.email}</div>
            <div className="text-[10px] text-[#475569] capitalize">{storedUser.role.replace(/_/g, " ")}</div>
          </div>
        </div>
      )}

      <div className="relative mb-0.5" ref={inDrawer ? undefined : langRef}>
        <button
          onClick={() => setShowLang(v => !v)}
          className={cn(
            "flex items-center gap-2.5 w-full rounded-lg text-sm transition-colors",
            showLang ? "text-[#00DFA9] bg-[#00DFA9]/8" : "text-[#475569] hover:text-[#94A3B8] hover:bg-white/5",
            (!inDrawer && collapsed) ? "justify-center px-0 py-2.5" : "px-3 py-2"
          )}
          title={(!inDrawer && collapsed) ? "Language" : undefined}
        >
          <Globe className={cn("shrink-0", (!inDrawer && collapsed) ? "w-[18px] h-[18px]" : "w-4 h-4")} />
          {(inDrawer || !collapsed) && (
            <>
              <span className="flex-1 text-left">
                <span className="mr-1.5">{activeLang.flag}</span>
                {activeLang.native}
              </span>
              <span className="text-[10px] font-bold text-[#475569]">{activeLang.short}</span>
            </>
          )}
        </button>

        {showLang && (
          <div
            translate="no"
            className={cn(
              "absolute bottom-[calc(100%+4px)] z-50 bg-[#0D1117] border border-[#253241] rounded-xl shadow-[0_-8px_40px_rgba(0,0,0,0.7)] overflow-hidden",
              (!inDrawer && collapsed) ? "left-full ml-2 w-48" : "left-0 right-0"
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#253241]">
              <Globe className="h-3.5 w-3.5 text-[#00DFA9]" />
              <p className="text-[10px] font-bold text-[#F8FAFC]/60 uppercase tracking-widest">Language</p>
            </div>
            <div className="py-1 max-h-64 overflow-y-auto">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                    currentLang === lang.code
                      ? "bg-[#00DFA9]/8 text-[#00DFA9]"
                      : "text-[#64748B] hover:text-[#F8FAFC] hover:bg-[#253241]/50"
                  )}
                >
                  <span className="text-base leading-none w-5 text-center">{lang.flag}</span>
                  <span className="flex-1 text-left text-[12px]">{lang.native}</span>
                  <span className="text-[9px] font-bold text-[#475569]">{lang.short}</span>
                  {currentLang === lang.code && <Check className="h-3 w-3 ml-1 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={logout}
        className={cn(
          "flex items-center gap-2.5 w-full rounded-lg text-sm text-[#475569] hover:text-red-400 hover:bg-red-500/8 transition-colors",
          (!inDrawer && collapsed) ? "justify-center px-0 py-2.5" : "px-3 py-2"
        )}
        title={(!inDrawer && collapsed) ? "Sign out" : undefined}
      >
        <LogOut className={cn("shrink-0", (!inDrawer && collapsed) ? "w-[18px] h-[18px]" : "w-4 h-4")} />
        {(inDrawer || !collapsed) && "Sign out"}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0B0F14] text-[#F8FAFC] overflow-hidden">

      {/* ── Mobile top header ── */}
      <header className="md:hidden shrink-0 flex items-center gap-3 h-14 px-4 bg-[#070B10] border-b border-white/8 z-30">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-lg text-[#64748B] hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <LogoImg />
        <div className="flex-1" />
        {pendingCount > 0 && (
          <span className="min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-[#475569] hover:text-red-400 hover:bg-red-500/8 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* ── Mobile nav drawer overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[280px] max-w-[85vw] h-full bg-[#070B10] border-r border-white/8 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/8 shrink-0">
              <LogoImg />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavSections
              sections={navSections}
              location={location}
              collapsed={false}
              onNavClick={() => setMobileOpen(false)}
            />
            <LangBottomSection inDrawer />
          </aside>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col bg-[#070B10] border-r border-white/8 transition-all duration-200",
          collapsed ? "w-[56px]" : "w-[220px]"
        )}
      >
        <div className={cn(
          "flex items-center border-b border-white/8 h-[64px] px-3",
          collapsed ? "justify-center" : "justify-between px-4"
        )}>
          {!collapsed && <LogoImg />}
          {!collapsed && (
            <span className="hidden items-center gap-1.5 font-bold text-base">
              Cup<span className="text-[#00DFA9]">Bett</span>
            </span>
          )}
          {collapsed && <Shield className="w-5 h-5 text-[#00DFA9]" />}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-md text-[#4B5563] hover:text-[#94A3B8] hover:bg-white/5 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center py-2 border-b border-white/8">
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded-md text-[#4B5563] hover:text-[#94A3B8] hover:bg-white/5 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <NavSections
          sections={navSections}
          location={location}
          collapsed={collapsed}
        />

        <LangBottomSection />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
        {children}
      </main>
    </div>
  );
}
