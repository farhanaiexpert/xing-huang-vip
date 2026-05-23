import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAdminAuth } from "../hooks/useAdminAuth";

interface NavItem {
  path: string;
  label: string;
  badge?: number;
  icon: React.ReactNode;
}

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      {
        path: "/", label: "Dashboard",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>,
      },
      {
        path: "/users", label: "Users",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
      },
      {
        path: "/bets", label: "Bets",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
      },
      {
        path: "/transactions", label: "Transactions",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>,
      },
      {
        path: "/withdrawals", label: "Withdrawals",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        path: "/referrals", label: "Referrals",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>,
      },
      {
        path: "/commission", label: "Commissions",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
      },
      {
        path: "/promotions", label: "Promotions",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        path: "/settings", label: "Settings",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>,
      },
      {
        path: "/audit", label: "Audit Logs",
        icon: <svg className="w-[15px] h-[15px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
      },
    ],
  },
];

function NavLinks({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const [location] = useLocation();
  return (
    <div className="space-y-4">
      {NAV_SECTIONS.map(section => (
        <div key={section.label}>
          {!collapsed && (
            <p className="px-3 mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "#1E3A5F" }}>
              {section.label}
            </p>
          )}
          <div className="space-y-[2px]">
            {section.items.map((item: NavItem) => {
              const active = item.path === "/" ? location === "/" : location === item.path || location.startsWith(item.path + "/");
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onNav}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-150 cursor-pointer group relative ${collapsed ? "px-[13px] justify-center" : "pl-3 pr-3"} ${active ? "nav-item-active" : "nav-item-default"}`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="ml-auto text-[9.5px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      style={{ background: "rgba(0,223,169,0.15)", color: "#00DFA9" }}>
                      {item.badge}
                    </span>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "#00DFA9" }} />
                  )}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50"
                      style={{ background: "hsl(222,40%,11%)", color: "#F1F5F9", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarContent({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const { user, logout } = useAdminAuth();
  return (
    <>
      <div className={`py-4 flex items-center gap-3 ${collapsed ? "px-[14px] justify-center" : "px-4"}`}>
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(0,223,169,0.22) 0%, rgba(0,180,255,0.16) 100%)", border: "1px solid rgba(0,223,169,0.28)" }}>
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8s2.91 6.5 6.5 6.5S14.5 11.59 14.5 8 11.59 1.5 8 1.5z" fill="rgba(0,223,169,0.2)" stroke="#00DFA9" strokeWidth="1"/>
              <path d="M6 5.5h1.5v5H6V5.5zm2.5 0H10L8 8.5l2 2.5H8.5L7 8.5 8.5 5.5z" fill="#00DFA9"/>
            </svg>
          </div>
        </div>
        {!collapsed && (
          <div>
            <div className="text-[13px] font-bold text-white tracking-tight leading-none">Cup<span className="text-gradient-teal">Bett</span></div>
            <div className="text-[9.5px] mt-0.5" style={{ color: "#334155" }}>Administration</div>
          </div>
        )}
      </div>

      <div className="h-px mx-3 mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }}/>

      <div className="flex-1 overflow-y-auto px-2.5 pb-2 overflow-x-hidden">
        <NavLinks collapsed={collapsed} onNav={onNav}/>
      </div>

      <div className="h-px mx-3 mt-1" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }}/>

      <div className={`py-3 ${collapsed ? "px-2" : "px-3"}`}>
        {!collapsed ? (
          <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs"
                  style={{ background: "linear-gradient(135deg, rgba(0,223,169,0.18) 0%, rgba(0,180,255,0.12) 100%)", border: "1px solid rgba(0,223,169,0.22)", color: "#00DFA9" }}>
                  {user?.username?.[0]?.toUpperCase() ?? "A"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[hsl(222,47%,5%)]"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-white truncate">{user?.username ?? "Admin"}</div>
                <div className="text-[10px]" style={{ color: "#334155" }}>Super Administrator</div>
              </div>
              <button onClick={logout} title="Sign out"
                className="w-6.5 h-6.5 rounded-lg flex items-center justify-center transition-all"
                style={{ color: "#334155" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#334155"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button onClick={logout} title="Sign out"
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{ color: "#334155", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#F87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#334155"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Topbar({ collapsed, onToggleSidebar }: { collapsed: boolean; onToggleSidebar: () => void }) {
  const { user } = useAdminAuth();
  return (
    <header className="fixed top-0 right-0 z-20 h-[54px] flex items-center px-5 gap-4"
      style={{
        left: collapsed ? "64px" : "228px",
        background: "hsl(222,47%,5%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        transition: "left 0.22s cubic-bezier(0.4,0,0.2,1)",
      }}>
      <button onClick={onToggleSidebar}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
        style={{ color: "#64748B" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#CBD5E1"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#64748B"; }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <div className="flex-1 max-w-[380px]">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" style={{ color: "#334155" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-8 pr-16 py-1.5 text-[12.5px] rounded-lg outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#CBD5E1",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,223,169,0.3)"; e.currentTarget.style.background = "rgba(0,223,169,0.03)"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#334155", border: "1px solid rgba(255,255,255,0.07)" }}>⌘</kbd>
            <kbd className="text-[9px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#334155", border: "1px solid rgba(255,255,255,0.07)" }}>K</kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "#64748B" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#CBD5E1"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#64748B"; }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "#00DFA9" }}/>
        </button>

        <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "#64748B" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#CBD5E1"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#64748B"; }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>

        <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.07)" }}/>

        <div className="flex items-center gap-2.5 pl-1 cursor-pointer group">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all"
              style={{ background: "linear-gradient(135deg, rgba(0,223,169,0.2) 0%, rgba(0,180,255,0.14) 100%)", border: "1px solid rgba(0,223,169,0.25)", color: "#00DFA9" }}>
              {user?.username?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-[1.5px]" style={{ borderColor: "hsl(222,47%,5%)" }}/>
          </div>
          <div className="hidden sm:block">
            <div className="text-[12px] font-semibold text-white leading-none">{user?.username ?? "Admin"}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#334155" }}>Super Admin</div>
          </div>
          <svg className="w-3 h-3 hidden sm:block" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "#334155" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarW = collapsed ? 64 : 228;

  return (
    <div className="min-h-screen flex" style={{ background: "hsl(222,47%,4%)" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-30"
        style={{
          width: `${sidebarW}px`,
          background: "hsl(222,47%,5%)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}>
        <div style={{ width: "228px", minWidth: "228px" }}>
          <SidebarContent collapsed={collapsed}/>
        </div>
      </aside>

      {/* Topbar */}
      <div className="hidden md:block">
        <Topbar collapsed={collapsed} onToggleSidebar={() => setCollapsed(c => !c)}/>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-[54px] flex items-center px-4 gap-3"
        style={{ background: "rgba(5,8,16,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(0,223,169,0.22), rgba(0,180,255,0.16))", border: "1px solid rgba(0,223,169,0.28)" }}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5C4.41 1.5 1.5 4.41 1.5 8s2.91 6.5 6.5 6.5S14.5 11.59 14.5 8 11.59 1.5 8 1.5z" fill="rgba(0,223,169,0.2)" stroke="#00DFA9" strokeWidth="1"/>
              <path d="M6 5.5h1.5v5H6V5.5zm2.5 0H10L8 8.5l2 2.5H8.5L7 8.5 8.5 5.5z" fill="#00DFA9"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-white">Cup<span className="text-gradient-teal">Bett</span></span>
        </div>
        <button onClick={() => setMobileOpen(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.05)", color: "#64748B" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)}/>
          <aside className="relative z-50 w-[228px] h-full flex flex-col shadow-2xl overflow-hidden"
            style={{ background: "hsl(222,47%,5%)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            <SidebarContent collapsed={false} onNav={() => setMobileOpen(false)}/>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{
          marginLeft: 0,
          transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}>
        <div className="hidden md:block" style={{ marginLeft: `${sidebarW}px`, transition: "margin-left 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
          <main className="pt-[54px] min-h-screen">
            <div className="p-6 max-w-[1520px] w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
        <div className="md:hidden">
          <main className="pt-[54px] min-h-screen p-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
