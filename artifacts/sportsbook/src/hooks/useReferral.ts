/**
 * REFERRAL / AFFILIATE SYSTEM
 * Frontend-only with localStorage persistence.
 * API_HOOK: Replace loadStore/saveStore with real API calls when backend is ready.
 */
import { useState, useEffect, useCallback } from 'react';

// ─── Commission rates ────────────────────────────────────────────────────────
export const COMMISSION_RATES: Record<1 | 2 | 3, number> = { 1: 0.05, 2: 0.03, 3: 0.01 };

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ReferralUser {
  id:             string;
  address:        string;
  level:          1 | 2 | 3;
  joinedAt:       string;   // ISO date
  referredByCode: string;
}

export interface CommissionEntry {
  id:              string;
  date:            string;  // ISO date
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'cupbett_referral_v1';
const CODE_CHARS  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(): string {
  return Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

function shortAddr(seed: number): string {
  const h = '0123456789abcdef';
  const p1 = Array.from({ length: 4 }, (_, i) => h[(seed * 7  + i * 13) % 16]).join('');
  const p2 = Array.from({ length: 4 }, (_, i) => h[(seed * 11 + i * 17) % 16]).join('');
  return `0x${p1}...${p2}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function seedMockData(myCode: string): Pick<ReferralStore, 'referrals' | 'commissions'> {
  const referrals: ReferralUser[] = [
    { id: 'r1', address: shortAddr(1),  level: 1, joinedAt: daysAgo(14), referredByCode: myCode },
    { id: 'r2', address: shortAddr(2),  level: 1, joinedAt: daysAgo(9),  referredByCode: myCode },
    { id: 'r3', address: shortAddr(3),  level: 1, joinedAt: daysAgo(4),  referredByCode: myCode },
    { id: 'r4', address: shortAddr(4),  level: 2, joinedAt: daysAgo(11), referredByCode: 'L1A' },
    { id: 'r5', address: shortAddr(5),  level: 2, joinedAt: daysAgo(6),  referredByCode: 'L1B' },
    { id: 'r6', address: shortAddr(6),  level: 3, joinedAt: daysAgo(8),  referredByCode: 'L2A' },
  ];
  const commissions: CommissionEntry[] = [
    { id: 'c1', date: daysAgo(13), referredAddress: shortAddr(1), level: 1, txAmount: 500,  commissionPct: 5, earned: 25.00, status: 'paid'    },
    { id: 'c2', date: daysAgo(10), referredAddress: shortAddr(4), level: 2, txAmount: 300,  commissionPct: 3, earned:  9.00, status: 'paid'    },
    { id: 'c3', date: daysAgo(8),  referredAddress: shortAddr(6), level: 3, txAmount: 200,  commissionPct: 1, earned:  2.00, status: 'paid'    },
    { id: 'c4', date: daysAgo(6),  referredAddress: shortAddr(2), level: 1, txAmount: 750,  commissionPct: 5, earned: 37.50, status: 'paid'    },
    { id: 'c5', date: daysAgo(3),  referredAddress: shortAddr(5), level: 2, txAmount: 400,  commissionPct: 3, earned: 12.00, status: 'pending' },
    { id: 'c6', date: daysAgo(1),  referredAddress: shortAddr(3), level: 1, txAmount: 1000, commissionPct: 5, earned: 50.00, status: 'pending' },
  ];
  return { referrals, commissions };
}

function loadStore(): ReferralStore | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReferralStore) : null;
  } catch { return null; }
}

function saveStore(store: ReferralStore) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch {}
}

function initStore(): ReferralStore {
  const existing = loadStore();
  if (existing) return existing;

  // Read ?ref= from URL
  const refParam = new URLSearchParams(window.location.search).get('ref') ?? null;
  const myCode   = makeCode();
  const mock     = seedMockData(myCode);

  const store: ReferralStore = {
    myCode,
    referredByCode: refParam,
    ...mock,
  };
  saveStore(store);
  return store;
}

function buildLink(code: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?ref=${code}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useReferral(): ReferralState {
  const [store, setStore]     = useState<ReferralStore | null>(null);
  const [isLoaded, setLoaded] = useState(false);

  useEffect(() => {
    setStore(initStore());
    setLoaded(true);
  }, []);

  const update = useCallback((updater: (prev: ReferralStore) => ReferralStore) => {
    setStore(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      saveStore(next);
      return next;
    });
  }, []);

  const registerReferrer = useCallback((refCode: string) => {
    update(s => ({ ...s, referredByCode: refCode }));
  }, [update]);

  const addCommission = useCallback((entry: Omit<CommissionEntry, 'id'>) => {
    update(s => ({
      ...s,
      commissions: [{ ...entry, id: `c${Date.now()}` }, ...s.commissions],
    }));
  }, [update]);

  const claimPending = useCallback(() => {
    update(s => ({
      ...s,
      commissions: s.commissions.map(c => c.status === 'pending' ? { ...c, status: 'paid' as const } : c),
    }));
  }, [update]);

  const s = store ?? { myCode: '--------', referredByCode: null, referrals: [], commissions: [] };

  const level1      = s.referrals.filter(r => r.level === 1);
  const level2      = s.referrals.filter(r => r.level === 2);
  const level3      = s.referrals.filter(r => r.level === 3);
  const totalEarned = s.commissions.reduce((a, c) => a + c.earned, 0);
  const pendingEarned = s.commissions.filter(c => c.status === 'pending').reduce((a, c) => a + c.earned, 0);
  const paidEarned    = s.commissions.filter(c => c.status === 'paid').reduce((a, c) => a + c.earned, 0);
  const myLink = isLoaded ? buildLink(s.myCode) : '';

  return {
    ...s,
    isLoaded,
    myLink,
    level1, level2, level3,
    totalEarned, pendingEarned, paidEarned,
    registerReferrer, addCommission, claimPending,
  };
}
