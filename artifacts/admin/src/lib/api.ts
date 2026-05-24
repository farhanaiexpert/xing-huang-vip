const BASE = "/api";

function getToken(): string | null {
  return sessionStorage.getItem("cb_admin_token");
}

export function setToken(token: string) {
  sessionStorage.setItem("cb_admin_token", token);
}

export function clearToken() {
  sessionStorage.removeItem("cb_admin_token");
}

export function isTokenStored(): boolean {
  return !!getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = import.meta.env.BASE_URL + "login";
    throw new Error("Session expired — please sign in again");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export interface AdminStats {
  users: { total: number };
  bets: { total: number; volume: string; open: number };
  transactions: { pendingDeposits: number; pendingWithdrawals: number };
  platform: { totalWalletBalance: string; totalCommissionsPaid: string };
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  kycStatus: string;
  country: string | null;
  isSuspended: boolean;
  referralCode: string | null;
  createdAt: string;
  balance: string | null;
}

export interface AdminBet {
  id: number;
  userId: number;
  username: string | null;
  type: string;
  stake: string;
  totalOdds: string;
  potentialReturn: string;
  status: string;
  settledAt: string | null;
  createdAt: string;
}

export interface AdminTransaction {
  id: number;
  userId: number;
  username: string | null;
  type: string;
  amount: string;
  status: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AdminReferral {
  id: number;
  referrerId: number;
  referrerUsername: string | null;
  referredId: number;
  tier: number;
  createdAt: string;
}

export interface AdminReferralsResponse {
  referrals: AdminReferral[];
  stats: {
    totalReferrals: number;
    totalCommissions: string;
    totalPaid: string;
  };
}

export interface AdminPromotion {
  id: number;
  title: string;
  description: string;
  type: string;
  bonusAmount: string | null;
  minDeposit: string | null;
  eligibility: string;
  maxClaims: number | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  claimCount: number;
}

export interface AdminPool {
  id: number;
  title: string;
  sport: string;
  prizePool: string;
  entryFee: string;
  status: string;
  deadline: string;
  settledAt: string | null;
  createdAt: string;
  entryCount: number;
}

export interface AuditLog {
  id: number;
  adminId: number;
  adminUsername: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}
