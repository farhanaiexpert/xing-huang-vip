import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAdminAuth } from "../hooks/useAdminAuth";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    path: "/",
    label: "Overview",
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    path: "/users",
    label: "Users",
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    path: "/bets",
    label: "Bets",
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    path: "/transactions",
    label: "Transactions",
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    path: "/commission",
    label: "Commission",
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    path: "/settings",
    label: "Settings",
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

function NavLinks({ onNav }: { onNav?: () => void }) {
  const [location] = useLocation();
  return (
    <div className="space-y-[2px]">
      {navItems.map(item => {
        const active =
          item.path === "/" ? location === "/" : location === item.path || location.startsWith(item.path + "/");
        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={onNav}
            className={`flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${active ? "nav-item-active" : "nav-item-default"}`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(0,223,169,0.15)", color: "#00DFA9" }}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function SidebarLogo() {
  return (
    <div className="px-4 py-5 flex items-center gap-3">
      <div className="relative shrink-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(0,223,169,0.25) 0%, rgba(0,180,255,0.2) 100%)", border: "1px solid rgba(0,223,169,0.3)" }}>
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8s2.91 6.5 6.5 6.5S14.5 11.59 14.5 8 11.59 1.5 8 1.5z" fill="rgba(0,223,169,0.2)" stroke="#00DFA9" strokeWidth="1" />
            <path d="M6 5.5h1.5v5H6V5.5zm2.5 0H10L8 8.5l2 2.5H8.5L7 8.5 8.5 5.5z" fill="#00DFA9" />
          </svg>
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[hsl(222,47%,5%)]" />
      </div>
      <div>
        <div className="text-[13px] font-bold text-white tracking-tight leading-none">
          Cup<span className="text-gradient-teal">Bett</span>
        </div>
        <div className="text-[10px] text-[#334155] mt-0.5">Administration</div>
      </div>
    </div>
  );
}

function SidebarFooter({ user, logout }: { user: { username: string } | null; logout: () => void }) {
  return (
    <div className="px-3 py-3">
      <div className="rounded-xl p-2.5 mb-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs"
              style={{ background: "linear-gradient(135deg, rgba(0,223,169,0.2) 0%, rgba(0,180,255,0.15) 100%)", border: "1px solid rgba(0,223,169,0.25)", color: "#00DFA9" }}>
              {user?.username?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-[hsl(222,47%,5%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{user?.username ?? "Admin"}</div>
            <div className="text-[10px] text-[#334155]">Super Administrator</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#334155] hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { user, logout } = useAdminAuth();
  return (
    <>
      <SidebarLogo />

      <div className="h-px mx-4 mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />

      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <p className="px-3 mb-2.5 text-[10px] font-bold text-[#1E3A5F] uppercase tracking-[0.12em]">Navigation</p>
        <NavLinks onNav={onNav} />
      </div>

      <div className="h-px mx-4 mt-1" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />

      <SidebarFooter user={user} logout={logout} />
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: "hsl(222,47%,4%)" }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[228px] flex-col fixed top-0 bottom-0 left-0 z-20"
        style={{ background: "hsl(222,47%,5%)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-13 flex items-center px-4 gap-3"
        style={{ background: "rgba(5,8,16,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(0,223,169,0.25), rgba(0,180,255,0.2))", border: "1px solid rgba(0,223,169,0.3)" }}>
            <svg className="w-3.5 h-3.5 text-[#00DFA9]" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8s2.91 6.5 6.5 6.5S14.5 11.59 14.5 8 11.59 1.5 8 1.5z" fill="rgba(0,223,169,0.2)" stroke="#00DFA9" strokeWidth="1" />
              <path d="M6 5.5h1.5v5H6V5.5zm2.5 0H10L8 8.5l2 2.5H8.5L7 8.5 8.5 5.5z" fill="#00DFA9" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white">Cup<span className="text-gradient-teal">Bett</span> <span className="text-[#334155] font-normal">Admin</span></span>
        </div>
        <button onClick={() => setMobileOpen(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <svg className="w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-[228px] h-full flex flex-col shadow-2xl"
            style={{ background: "hsl(222,47%,5%)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="px-4 py-4 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Cup<span className="text-gradient-teal">Bett</span></span>
              <button onClick={() => setMobileOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 text-[#334155]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <SidebarContent onNav={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col md:ml-[228px] min-w-0">
        <main className="flex-1 p-6 pt-[calc(52px+1.5rem)] md:pt-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
