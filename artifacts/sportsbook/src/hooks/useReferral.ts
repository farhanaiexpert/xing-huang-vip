// Referral system stub — backend removed, UI renders empty/coming-soon state
export const COMMISSION_RATES: Record<1 | 2 | 3, number> = { 1: 0.05, 2: 0.03, 3: 0.01 };

export interface ReferralUser {
  id: string; address: string; level: 1 | 2 | 3;
  joinedAt: string; referredByCode: string;
}
export interface CommissionEntry {
  id: string; date: string; referredAddress: string;
  level: 1 | 2 | 3; txAmount: number; commissionPct: number;
  earned: number; status: 'pending' | 'paid';
}
export interface ReferralStore {
  code: string;
  myCode: string;
  myLink: string;
  referrals: ReferralUser[];
  level1: ReferralUser[];
  level2: ReferralUser[];
  level3: ReferralUser[];
  commissions: CommissionEntry[];
  totalEarned: number;
  pendingEarned: number;
  setCustomCode: (c: string) => void;
  updateCode: (c: string) => boolean;
  claimPending: () => void;
}

export function useReferral(): ReferralStore {
  return {
    code: '',
    myCode: '',
    myLink: '',
    referrals: [],
    level1: [],
    level2: [],
    level3: [],
    commissions: [],
    totalEarned: 0,
    pendingEarned: 0,
    setCustomCode: () => {},
    updateCode: () => false,
    claimPending: () => {},
  };
}
