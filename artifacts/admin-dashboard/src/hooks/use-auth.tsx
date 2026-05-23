import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthTokenGetter, useGetMe, getGetMeQueryKey, UserResponse } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("cupbett_admin_jwt");
  });
  
  const [, setLocation] = useLocation();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("cupbett_admin_jwt"));
  }, []);

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    }
  });

  useEffect(() => {
    if (user && user.role !== "admin") {
      logout();
    }
  }, [user]);

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError]);

  const login = (newToken: string) => {
    localStorage.setItem("cupbett_admin_jwt", newToken);
    setToken(newToken);
    setLocation("/overview");
  };

  const logout = () => {
    localStorage.removeItem("cupbett_admin_jwt");
    setToken(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading: !!token && isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
