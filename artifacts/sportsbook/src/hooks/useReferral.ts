/**
 * REFERRAL / AFFILIATE SYSTEM
 * Fetches real data from /api/referral/* when authenticated.
 * Falls back to empty defaults when not logged in.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { shortAddress } from '../lib/utils';

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
  claimPending:    () => Promise<void>;
  updateCode:      (newCode: string) => Promise<{ ok: boolean; error?: string }>;
}

interface ApiCommission {
  id: number;
  amount: string;
  status: string;
  tier: number;
  createdAt: string;
  referredUsername: string | null;
}
interface ApiNetworkUser {
  userId: number;
  username: string;
  createdAt: string;
}
interface ApiNetwork {
  tier1: ApiNetworkUser[];
  tier2?: ApiNetworkUser[];
  tier3?: ApiNetworkUser[];
  totalReferrals: number;
}
interface ApiCommissionsResponse {
  commissions: ApiCommission[];
  summary: { total: number; pending: number; paid: number };
}

function buildLink(code: string): string {
  return `${window.location.origin}/?ref=${code}`;
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

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setStore(DEFAULT_STATE);
      setLoaded(false);
      return;
    }

    try {
      const [networkData, commData] = await Promise.all([
        api.get<ApiNetwork>('/referral/network'),
        api.get<ApiCommissionsResponse>('/referral/commissions'),
      ]);

      const mapUser = (r: ApiNetworkUser, level: 1 | 2 | 3): ReferralUser => ({
        id: String(r.userId),
        address: shortAddress(r.username) ?? r.username,
        level,
        joinedAt: r.createdAt,
        referredByCode: user!.referralCode ?? '',
      });

      const referrals: ReferralUser[] = [
        ...(networkData.tier1 ?? []).map(r => mapUser(r, 1)),
        ...(networkData.tier2 ?? []).map(r => mapUser(r, 2)),
        ...(networkData.tier3 ?? []).map(r => mapUser(r, 3)),
      ];

      const commissions: CommissionEntry[] = commData.commissions.map(c => {
        const tier = ([1, 2, 3].includes(c.tier) ? c.tier : 1) as 1 | 2 | 3;
        return {
          id: String(c.id),
          date: c.createdAt,
          referredAddress: c.referredUsername ?? '',
          level: tier,
          txAmount: 0,
          commissionPct: COMMISSION_RATES[tier],
          earned: parseFloat(c.amount),
          status: c.status as 'pending' | 'paid',
        };
      });

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
  }, [isAuthenticated, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const registerReferrer = useCallback((_refCode: string) => {}, []);
  const addCommission = useCallback((_entry: Omit<CommissionEntry, 'id'>) => {}, []);

  const claimPending = useCallback(async () => {
    await api.post('/referral/commissions/claim', {});
    await loadData();
  }, [loadData]);

  const updateCode = useCallback(async (newCode: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      await api.patch('/referral/code', { code: newCode });
      await loadData();
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update code';
      return { ok: false, error: msg };
    }
  }, [loadData]);

  const level1        = store.referrals.filter(r => r.level === 1);
  const level2        = store.referrals.filter(r => r.level === 2);
  const level3        = store.referrals.filter(r => r.level === 3);
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
