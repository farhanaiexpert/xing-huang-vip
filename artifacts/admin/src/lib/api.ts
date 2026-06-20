const BASE = `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')}/api`;

function getToken(): string | null {
  return sessionStorage.getItem("cb_admin_token");
}

export function setToken(token: string) {
  sessionStorage.setItem("cb_admin_token", token);
}

export function clearToken() {
  sessionStorage.removeItem("cb_admin_token");
  sessionStorage.removeItem("cb_admin_user");
}

export function isTokenStored(): boolean {
  return !!getToken();
}

export interface StoredUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

export function setStoredUser(user: StoredUser) {
  sessionStorage.setItem("cb_admin_user", JSON.stringify(user));
}

export function getStoredUser(): StoredUser | null {
  const raw = sessionStorage.getItem("cb_admin_user");
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredUser; } catch { return null; }
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
    const body = await res.json().catch(() => ({ error: "Unauthorized" }));
    if (getToken()) {
      clearToken();
      window.location.href = import.meta.env.BASE_URL + "login";
    }
    throw new Error(body.error ?? "Session expired — please sign in again");
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
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
};

export interface StatDelta { today: number; yesterday: number }
export interface MoneyDelta { today: string; yesterday: string }

export interface AdminStats {
  users: { total: number };
  bets: { total: number; volume: string; open: number };
  transactions: { pendingDeposits: number; pendingWithdrawals: number };
  platform: { totalWalletBalance: string; totalCommissionsPaid: string; grossRevenue: string };
  deltas?: {
    newUsers: StatDelta;
    bets: StatDelta;
    betVolume: MoneyDelta;
    grossRevenue: MoneyDelta;
    commissions: MoneyDelta;
    pendingDeposits: StatDelta;
    pendingWithdrawals: StatDelta;
    platformBalance: MoneyDelta;
  };
  attention?: {
    kycPending: number;
    riskFlags: number;
  };
}

export interface UsersSummary {
  total: number;
  active: number;
  suspended: number;
  kycVerified: number;
  kycPending: number;
  newThisWeek: number;
  totalBalance: string;
}

export type ApiProviderStatus =
  | "operational" | "degraded" | "throttled" | "down" | "idle" | "paused";

export interface ApiProvider {
  id: string;
  name: string;
  purpose: string;
  configured: boolean;
  paused: boolean;
  status: ApiProviderStatus;
  headline: string;
  callsToday: number;
  errorsToday: number;
  lastStatus: string | null;
  lastError: string | null;
  lastAt: string | null;
  quotaRemaining: number | null;
  quotaUpdatedAt: string | null;
  hourlyLimit?: number;
  hourlyUsed?: number;
  hourlyRemaining?: number;
}

export interface ApiStatusResponse {
  providers: ApiProvider[];
  generatedAt: string;
}

export interface MarketLiabilityRow {
  id: number;
  eventId: string;
  eventName: string;
  sport: string;
  marketType: string;
  selection: string;
  totalStake: string;
  potentialPayout: string;
  betCount: number;
  isSuspended: boolean;
  updatedAt: string;
}

export interface AdminUser {
  id: number;
  email: string | null;
  username: string | null;
  walletAddress: string | null;
  walletNetwork: string | null;
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
  eventName: string | null;
  sport: string | null;
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
  txHash: string | null;
  network: string | null;
  walletAddress: string | null;
  verified: boolean | null;
  verificationNote: string | null;
  nowpaymentsPaymentId: string | null;
  nowpaymentsStatus: string | null;
  plisioPaymentId: string | null;
  plisioStatus: string | null;
  cryptomusUuid: string | null;
  cryptomusStatus: string | null;
  createdAt: string;
  userBalance: string | null;
  userBonusBalance: string | null;
}

export interface AdminReferral {
  id: number;
  referrerId: number;
  referrerUsername: string | null;
  referredId: number;
  referredUsername: string | null;
  tier: number;
  createdAt: string;
}

export interface TopReferrer {
  referrerId: number;
  name: string;
  commission: number;
  count: number;
}

export interface AdminReferralsResponse {
  referrals: AdminReferral[];
  stats: {
    totalReferrals: number;
    totalCommissions: string;
    totalPaid: string;
    totalPending: string;
  };
  topReferrersByCommission: TopReferrer[];
}

export interface PromoRequirement {
  id: number;
  promotionId: number;
  taskType: string;
  targetValue: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}

export interface AdminPromotion {
  id: number;
  title: string;
  description: string;
  type: string;
  rewardType: string;
  bonusAmount: string | null;
  poolAmount: string | null;
  minDeposit: string | null;
  wageringRequirement: string | null;
  bannerColor: string | null;
  eligibility: string;
  maxClaims: number | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  claimCount: number;
  requirements: PromoRequirement[];
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
  correctOutcome: string | null;
}

export interface PendingTotals {
  pendingDepositTotal: string;
  pendingDepositCount: number;
  pendingWithdrawalTotal: string;
  pendingWithdrawalCount: number;
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

export interface BetsChartRow { day: string; count: number; volume: string }
export interface UsersChartRow { day: string; count: number }
export interface RevenueChartRow { day: string; stakes: string; payouts: string }

export type RecentActivityItem = AuditLog;

export interface AdminWinspinPrize {
  id: number;
  label: string;
  prizeAmount: string;
  weight: number;
  color: string;
  isActive: boolean;
  maxPerDay: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWinspinStats {
  totalSpins: number;
  totalPaid: string;
  spinsToday: number;
}

export interface AdminSportControl {
  id: number;
  sportKey: string;
  leagueName: string;
  isEnabled: boolean;
  isSuspended: boolean;
  oddsMultiplier: string;
  marginOverride: string | null;
  updatedAt: string;
}

export interface PlatformSetting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface TranslationOverride {
  id: number;
  lang: string;
  source: string;
  target: string;
  updatedAt: string;
  createdAt: string;
}

export interface TranslationOverridesResponse {
  rows: TranslationOverride[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BulkTranslationResult {
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
}

export interface TranslationQueueRow {
  id: number;
  lang: string;
  source: string;
  category: string;
  context: string | null;
  seenCount: number;
  status: string;
  firstSeen: string;
  lastSeen: string;
}

export interface TranslationQueueResponse {
  rows: TranslationQueueRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: { pending: number; translated: number; ignored: number };
}

export interface BulkResolveResult {
  saved: number;
  existed: number;
  notFound: number;
}

export interface RevenueBySport {
  sport: string;
  betCount: number;
  totalStaked: string;
  totalPaidOut: string;
  netRevenue: string;
}

export interface TopBettor {
  username: string;
  betCount: number;
  totalStaked: string;
}

export interface DailyPnL {
  day: string;
  stakes: string;
  payouts: string;
}

export interface DailyMetricsRow {
  day: string;
  newUsers: number;
  betAmount: string;
  winLoss: string;
  deposits: string;
  withdrawals: string;
}

export interface UserProfileStats {
  user: AdminUser;
  wallet: { balance: string };
  stats: {
    bets: {
      total: number; open: number; won: number; lost: number; voided: number;
      totalStaked: string; totalReturned: string; winRate: number; lifetimeValue: string;
    };
    transactions: {
      totalDeposited: string; totalWithdrawn: string;
      pendingDeposits: number; pendingWithdrawals: number;
    };
    referrals: { referredByUsername: string | null; totalReferred: number; totalCommissions: string };
    winspin: { totalSpins: number; totalWon: string };
    promoClaims: number;
  };
}

export interface BetWithSelections extends AdminBet {
  selections: Array<{
    id: number; eventName: string; marketName: string; outcomeName: string;
    odds: string; sport: string; result: string | null;
  }>;
}

export interface UserSession {
  id: number;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface UserReferralTree {
  referredBy: { id: number; username: string } | null;
  referred: Array<{ id: number; username: string; joinedAt: string; totalStaked: string; commissions: string }>;
  totalCommissions: string;
}

export interface UserPromoClaim {
  id: number;
  promotionId: number;
  promotionTitle: string;
  bonusAmount: string;
  claimedAt: string;
}

export interface UserSpinRecord {
  id: number;
  prizeLabel: string;
  prizeAmount: string;
  createdAt: string;
}

export interface UserNote {
  id: number;
  note: string;
  tag: string;
  adminUsername: string;
  createdAt: string;
}

export interface SettlementEvent {
  event_id: string;
  event_name: string;
  sport: string;
  open_count: number;
  player_count: number;
  total_staked: string;
}

export interface SettlementMarket {
  market_type: string;
  selection: string;
  open_count: number;
  player_count: number;
  total_staked: string;
  total_liability: string;
}

export interface EventDetail {
  eventId: string;
  eventName: string;
  sport: string;
  markets: SettlementMarket[];
}

export interface SettlementResult {
  settled: number;
  won: number;
  lost: number;
  voided: number;
  totalPaidOut: string;
}

export interface UserGrowthRow {
  day: string;
  newUsers: number;
  returningLogins: number;
}

export interface LoginHistoryRow {
  id: number;
  walletAddress: string | null;
  walletNetwork: string | null;
  username: string | null;
  email: string | null;
  kycStatus: string;
  country: string | null;
  lastLogin: string | null;
  sessionCount: number;
}
