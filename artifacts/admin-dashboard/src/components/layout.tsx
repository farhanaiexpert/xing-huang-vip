import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Activity, Users, Receipt, Percent, LogOut, LayoutDashboard } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  const nav = [
    { href: "/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/users", label: "Users", icon: Users },
    { href: "/bets", label: "Bets", icon: Activity },
    { href: "/transactions", label: "Transactions", icon: Receipt },
    { href: "/commissions", label: "Commissions", icon: Percent },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-primary-foreground font-bold font-mono tracking-tighter">
              CB
            </div>
            <span className="font-bold text-lg tracking-tight">CUPBETT ADMIN</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Logged in as</span>
              <span className="text-sm font-medium">{user?.username}</span>
            </div>
            <button onClick={logout} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
