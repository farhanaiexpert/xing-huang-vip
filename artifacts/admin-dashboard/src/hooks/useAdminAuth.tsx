import { useState, useEffect, createContext, useContext } from "react";
import { useLocation } from "wouter";

interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  status: string;
}

interface AdminAuthCtx {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthCtx | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem("cupbett_jwt");
    if (!stored) {
      setLoading(false);
      return;
    }
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (data.role !== "admin") {
          localStorage.removeItem("cupbett_jwt");
          setLoading(false);
          return;
        }
        setToken(stored);
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("cupbett_jwt");
        setLoading(false);
      });
  }, []);

  function login(tok: string, u: AdminUser) {
    localStorage.setItem("cupbett_jwt", tok);
    setToken(tok);
    setUser(u);
  }

  function logout() {
    localStorage.removeItem("cupbett_jwt");
    setToken(null);
    setUser(null);
    navigate("/login");
  }

  return (
    <AdminAuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be inside AdminAuthProvider");
  return ctx;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
