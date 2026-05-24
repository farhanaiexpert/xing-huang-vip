import { Link, useLocation } from "wouter";
import { clearToken } from "@/lib/api";
import {
  LayoutDashboard, Users, Receipt, CreditCard, Share2,
  Gift, Trophy, ScrollText, LogOut, ShieldCheck,
} from "lucide-react";

const nav = [
  { href: "/",            icon: LayoutDashboard, label: "Overview"     },
  { href: "/users",       icon: Users,           label: "Users"        },
  { href: "/bets",        icon: Receipt,         label: "Bets"         },
  { href: "/transactions",icon: CreditCard,      label: "Transactions" },
  { href: "/referrals",   icon: Share2,          label: "Referrals"    },
  { href: "/promotions",  icon: Gift,            label: "Promotions"   },
  { href: "/pools",       icon: Trophy,          label: "Pools"        },
  { href: "/audit",       icon: ScrollText,      label: "Audit Log"    },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  function logout() {
    clearToken();
    setLocation("/login");
  }

  return (
    <div className="flex h-screen bg-[#0B0F14] text-[#F8FAFC] overflow-hidden">
      <aside className="w-60 shrink-0 flex flex-col bg-[#060A0F] border-r border-white/8">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/8">
          <ShieldCheck className="w-6 h-6 text-[#00DFA9]" />
          <span className="font-bold text-lg tracking-tight">
            Cup<span className="text-[#00DFA9]">Bett</span>
            <span className="ml-1 text-xs font-normal text-[#94A3B8]">Admin</span>
          </span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = href === "/" ? location === "/" : location.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-[#00DFA9]/10 text-[#00DFA9]"
                    : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5"
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/8">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
