import { useState } from "react";
import { Link, useLocation } from "wouter";
import { clearToken, getStoredUser } from "@/lib/api";
import {
  LayoutDashboard, Users, Receipt, CreditCard, Share2,
  Gift, Trophy, ScrollText, LogOut, ChevronLeft, ChevronRight,
  Shield, ShieldCheck, Zap, Globe, BarChart2, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "Platform",
    items: [
      { href: "/",            icon: LayoutDashboard, label: "Overview"     },
      { href: "/users",       icon: Users,           label: "Users"        },
      { href: "/bets",        icon: Receipt,         label: "Bets"         },
      { href: "/transactions",icon: CreditCard,      label: "Transactions" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/referrals",   icon: Share2,          label: "Referrals"    },
      { href: "/promotions",  icon: Gift,            label: "Promotions"   },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/pools",    icon: Trophy, label: "Pools"    },
      { href: "/winspin",  icon: Zap,    label: "WinSpin"  },
      { href: "/markets",  icon: Globe,  label: "Markets"  },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/reports",  icon: BarChart2, label: "Reports"  },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin-accounts", icon: ShieldCheck, label: "Admin Accounts" },
      { href: "/audit",          icon: ScrollText,  label: "Audit Log"      },
      { href: "/settings",       icon: Settings,    label: "Settings"       },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const storedUser = getStoredUser();

  function logout() {
    clearToken();
    setLocation("/login");
  }

  return (
    <div className="flex h-screen bg-[#0B0F14] text-[#F8FAFC] overflow-hidden">
      <aside
        className={cn(
          "shrink-0 flex flex-col bg-[#070B10] border-r border-white/8 transition-all duration-200",
          collapsed ? "w-[56px]" : "w-[220px]"
        )}
      >
        <div className={cn(
          "flex items-center border-b border-white/8 h-[56px] px-3",
          collapsed ? "justify-center" : "justify-between px-4"
        )}>
          {!collapsed && (
            <img
              src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/cupbetlogo-1.webp"
              alt="CupBett"
              className="h-7 object-contain"
              onError={e => {
                e.currentTarget.style.display = "none";
                const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (next) next.style.display = "flex";
              }}
            />
          )}
          {!collapsed && (
            <span className="hidden items-center gap-1.5 font-bold text-base">
              Cup<span className="text-[#00DFA9]">Bett</span>
            </span>
          )}
          {collapsed && (
            <Shield className="w-5 h-5 text-[#00DFA9]" />
          )}
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

        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {NAV_SECTIONS.map(section => (
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
                {section.items.map(({ href, icon: Icon, label }) => {
                  const active = href === "/" ? location === "/" : location.startsWith(href);
                  return (
                    <Link key={href} href={href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg text-sm transition-all",
                        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
                        active
                          ? "bg-[#00DFA9]/12 text-[#00DFA9]"
                          : "text-[#64748B] hover:text-[#C4D4E3] hover:bg-white/5"
                      )}
                      title={collapsed ? label : undefined}
                    >
                      <Icon className={cn("shrink-0", collapsed ? "w-[18px] h-[18px]" : "w-4 h-4")} />
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/8 p-2">
          {!collapsed && storedUser && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1 rounded-lg bg-white/3">
              <div className="w-7 h-7 rounded-full bg-[#00DFA9]/15 flex items-center justify-center shrink-0">
                <span className="text-[#00DFA9] text-xs font-bold uppercase">
                  {storedUser.username.slice(0, 1)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{storedUser.username}</div>
                <div className="text-[10px] text-[#475569] capitalize">{storedUser.role.replace(/_/g, " ")}</div>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-lg text-sm text-[#475569] hover:text-red-400 hover:bg-red-500/8 transition-colors",
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
            )}
            title={collapsed ? "Sign out" : undefined}
          >
            <LogOut className={cn("shrink-0", collapsed ? "w-[18px] h-[18px]" : "w-4 h-4")} />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
