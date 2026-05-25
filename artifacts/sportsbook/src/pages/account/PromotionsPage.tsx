import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Gift, ExternalLink, CheckCircle2, Clock,
  Loader2, Star, AlertCircle,
} from 'lucide-react';

type PromoCategory = 'All' | 'Welcome' | 'Weekly' | 'Loyalty';
const CATEGORIES: PromoCategory[] = ['All', 'Welcome', 'Weekly', 'Loyalty'];

interface ApiPromotion {
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
  claimed: boolean;
  claimedAt: string | null;
}

function typeToCategory(type: string): PromoCategory {
  if (type === 'welcome') return 'Welcome';
  if (type === 'loyalty' || type === 'cashback' || type === 'vip') return 'Loyalty';
  return 'Weekly';
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function fmtExpiry(expiresAt: string | null) {
  if (!expiresAt) return 'No expiry';
  const d = new Date(expiresAt);
  const now = new Date();
  if (d < now) return 'Expired';
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / 86400_000);
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days}d`;
}

function fmtClaimedAt(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PromotionsPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState<PromoCategory>('All');
  const [promos, setPromos]  = useState<ApiPromotion[]>([]);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [loading, setLoading]   = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    api.get<ApiPromotion[]>('/promotions')
      .then(data => { setPromos(data); setLoading(false); })
      .catch(() => { setApiError(true); setLoading(false); });
  }, []);

  async function claimPromo(id: number) {
    if (!isAuthenticated) { toast({ title: 'Please sign in to claim promotions' }); return; }
    setClaiming(id);
    try {
      await api.post(`/promotions/${id}/claim`, {});
      const now = new Date().toISOString();
      setPromos(prev => prev.map(p => p.id === id ? { ...p, claimed: true, claimedAt: now } : p));
      toast({ title: 'Promotion claimed!', description: 'Check your wallet for the bonus.' });
    } catch {
      toast({ title: 'Already claimed or not eligible', variant: 'destructive' });
    } finally {
      setClaiming(null);
    }
  }

  const filtered = promos.filter(p => active === 'All' || typeToCategory(p.type) === active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#F8FAFC]">Promotions</h2>
        <Link href="/promotions">
          <div className="flex items-center gap-1 text-[11px] text-[#00DFA9] hover:underline cursor-pointer">
            Full page <ExternalLink className="h-3 w-3" />
          </div>
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActive(cat)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-[11.5px] font-semibold whitespace-nowrap border transition-all cursor-pointer',
              active === cat
                ? 'bg-[#00DFA9]/12 text-[#00DFA9] border-[#00DFA9]/30'
                : 'bg-[#0E1520] text-[#94A3B8]/55 border-white/[0.06] hover:text-[#F8FAFC]'
            )}>
            {cat}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="h-5 w-5 text-[#00DFA9] animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && apiError && (
        <div className="rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/5 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-[#EF4444]/50 mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-[#F8FAFC]">Could not load promotions</p>
          <p className="text-[11px] text-[#64748B] mt-1">Please try again later.</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !apiError && filtered.length === 0 && (
        <div className="rounded-2xl border border-[#00DFA9]/12 p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #071A12 0%, #0B0F14 100%)' }}>
          <Gift className="h-10 w-10 text-[#00DFA9]/25 mx-auto mb-3" />
          <p className="text-[14px] font-bold text-[#F8FAFC] mb-1.5">No promotions right now</p>
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            New offers are added regularly. Check back soon.
          </p>
        </div>
      )}

      {/* Promotions list */}
      {!loading && !apiError && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(promo => {
            const expired = isExpired(promo.expiresAt);
            return (
              <div key={promo.id}
                className={cn(
                  'relative rounded-2xl border overflow-hidden',
                  promo.claimed
                    ? 'border-[#00DFA9]/20 bg-[#071A12]/50'
                    : expired
                      ? 'border-white/[0.04] bg-[#0E1520] opacity-60'
                      : 'border-white/[0.09] bg-[#0E1520]'
                )}>
                {!expired && !promo.claimed && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#FACC15]" />
                )}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center shrink-0 mt-0.5 text-[#00DFA9]">
                      <Star className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#00DFA9]/15 text-[#00DFA9]">
                          {promo.type.charAt(0).toUpperCase() + promo.type.slice(1)}
                        </span>
                        <h3 className="text-[14px] font-bold text-[#F8FAFC]">{promo.title}</h3>
                      </div>
                      {promo.bonusAmount && (
                        <p className="text-[12px] font-semibold text-[#00DFA9] mb-1">
                          +{promo.bonusAmount} USDT bonus
                        </p>
                      )}
                      {promo.minDeposit && (
                        <p className="text-[10px] text-[#475569] mb-1">
                          Min. deposit: {promo.minDeposit} USDT
                        </p>
                      )}
                      <p className="text-[11px] text-[#64748B] leading-relaxed">{promo.description}</p>
                      <p className="text-[10px] text-[#475569] mt-1.5">{fmtExpiry(promo.expiresAt)}</p>
                      {promo.claimed && promo.claimedAt && (
                        <p className="text-[10px] text-[#00DFA9]/60 mt-0.5">
                          Claimed on {fmtClaimedAt(promo.claimedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    {promo.claimed ? (
                      <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/25">
                        <CheckCircle2 className="h-3 w-3" /> Claimed
                      </span>
                    ) : expired ? (
                      <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 text-[#64748B] border border-white/[0.08]">
                        <Clock className="h-3 w-3" /> Expired
                      </span>
                    ) : (
                      <button
                        onClick={() => claimPromo(promo.id)}
                        disabled={claiming === promo.id}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97] bg-gradient-to-r from-[#00DFA9] to-[#00C49A] text-[#0B0F14] disabled:opacity-50"
                      >
                        {claiming === promo.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <><Gift className="h-3 w-3" />Claim</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
