/**
 * REFERRAL / AFFILIATE SYSTEM
 * Fetches real data from /api/referral/* when authenticated.
 * Falls back to empty defaults when not logged in.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';

export const COMMISSION_RATES: Record<1 | 2 | 3, number> = { 1: 0.05, 2: 0.03, 3: 0.01 };

export interface ReferralUser {
  id:             string;
  address:        string;
  level:          1 | 2 | 3;
  joinedAt:       string;
  referredByCode: string;
}

export interface CommissionEntry {
  id:              string;
  date:            string;
  referredAddress: string;
  level:           1 | 2 | 3;
  txAmount:        number;
  commissionPct:   number;
  earned:          number;
  status:          'pending' | 'paid';
}

export interface ReferralStore {
  myCode:         string;
  referredByCode: string | null;
  referrals:      ReferralUser[];
  commissions:    CommissionEntry[];
}

export interface ReferralState extends ReferralStore {
  isLoaded:        boolean;
  myLink:          string;
  level1:          ReferralUser[];
  level2:          ReferralUser[];
  level3:          ReferralUser[];
  totalEarned:     number;
  pendingEarned:   number;
  paidEarned:      number;
  registerReferrer: (refCode: string) => void;
  addCommission:   (entry: Omit<CommissionEntry, 'id'>) => void;
  claimPending:    () => void;
  updateCode:      (newCode: string) => boolean;
}

interface ApiCommission {
  id: number;
  amount: string;
  status: string;
  createdAt: string;
}
interface ApiNetwork {
  tier1: Array<{ userId: number; username: string; createdAt: string }>;
  totalReferrals: number;
}
interface ApiCommissionsResponse {
  commissions: ApiCommission[];
  summary: { total: number; pending: number; paid: number };
}

function buildLink(code: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?ref=${code}`;
}

const DEFAULT_STATE: ReferralStore = {
  myCode: 'IHFFXMRP',
  referredByCode: null,
  referrals: [],
  commissions: [],
};

export function useReferral(): ReferralState {
  const { user, isAuthenticated } = useAuth();
  const [store, setStore]       = useState<ReferralStore>(DEFAULT_STATE);
  const [isLoaded, setLoaded]   = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setStore(DEFAULT_STATE);
      setLoaded(false);
      return;
    }

    async function loadData() {
      try {
        const [networkData, commData] = await Promise.all([
          api.get<ApiNetwork>('/referral/network'),
          api.get<ApiCommissionsResponse>('/referral/commissions'),
        ]);

        const referrals: ReferralUser[] = networkData.tier1.map(r => ({
          id: String(r.userId),
          address: r.username,
          level: 1 as const,
          joinedAt: r.createdAt,
          referredByCode: user!.referralCode ?? '',
        }));

        const commissions: CommissionEntry[] = commData.commissions.map(c => ({
          id: String(c.id),
          date: c.createdAt,
          referredAddress: '',
          level: 1 as const,
          txAmount: 0,
          commissionPct: COMMISSION_RATES[1],
          earned: parseFloat(c.amount),
          status: c.status as 'pending' | 'paid',
        }));

        setStore({
          myCode: user!.referralCode ?? 'IHFFXMRP',
          referredByCode: null,
          referrals,
          commissions,
        });
      } catch {
        setStore({
          myCode: user!.referralCode ?? 'IHFFXMRP',
          referredByCode: null,
          referrals: [],
          commissions: [],
        });
      }
      setLoaded(true);
    }

    loadData();
  }, [isAuthenticated, user]);

  const registerReferrer = useCallback((_refCode: string) => {
    // Handled at registration time via API
  }, []);

  const addCommission = useCallback((_entry: Omit<CommissionEntry, 'id'>) => {
    // Handled server-side
  }, []);

  const claimPending = useCallback(() => {
    // Handled server-side
  }, []);

  const updateCode = useCallback((_newCode: string): boolean => {
    return false; // Not yet supported via API
  }, []);

  const level1      = store.referrals.filter(r => r.level === 1);
  const level2      = store.referrals.filter(r => r.level === 2);
  const level3      = store.referrals.filter(r => r.level === 3);
  const totalEarned   = store.commissions.reduce((a, c) => a + c.earned, 0);
  const pendingEarned = store.commissions.filter(c => c.status === 'pending').reduce((a, c) => a + c.earned, 0);
  const paidEarned    = store.commissions.filter(c => c.status === 'paid').reduce((a, c) => a + c.earned, 0);
  const myLink = isLoaded ? buildLink(store.myCode) : '';

  return {
    ...store,
    isLoaded,
    myLink,
    level1, level2, level3,
    totalEarned, pendingEarned, paidEarned,
    registerReferrer, addCommission, claimPending, updateCode,
  };
}
