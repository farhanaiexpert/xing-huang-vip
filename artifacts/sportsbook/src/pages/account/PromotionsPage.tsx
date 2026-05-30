import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Gift, ExternalLink, CheckCircle2, Clock,
  Loader2, AlertCircle, Target, Trophy, Lock,
  ChevronRight, Zap, Users, TrendingUp, Wallet,
} from 'lucide-react';

type PromoCategory = 'All' | 'Welcome' | 'Weekly' | 'Loyalty';
const CATEGORIES: PromoCategory[] = ['All', 'Welcome', 'Weekly', 'Loyalty'];

interface PromoRequirement {
  id: number;
  taskType: string;
  targetValue: string;
  description: string;
  currentValue: number;
  completed: boolean;
}

interface ApiPromotion {
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
  claimed: boolean;
  claimedAt: string | null;
  requirements: PromoRequirement[];
  allRequirementsMet: boolean;
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

function taskIcon(taskType: string) {
  switch (taskType) {
    case 'place_bets':      return <Zap className="h-3.5 w-3.5" />;
    case 'min_deposit':     return <Wallet className="h-3.5 w-3.5" />;
    case 'refer_friends':   return <Users className="h-3.5 w-3.5" />;
    case 'min_stake_bets':  return <TrendingUp className="h-3.5 w-3.5" />;
    case 'min_odds_bets':   return <Target className="h-3.5 w-3.5" />;
    default:                return <Target className="h-3.5 w-3.5" />;
  }
}

function rewardLabel(promo: ApiPromotion) {
  const amt = promo.bonusAmount ? parseFloat(promo.bonusAmount) : 0;
  const pool = promo.poolAmount ? parseFloat(promo.poolAmount) : 0;
  switch (promo.rewardType) {
    case 'pool_split':   return pool > 0 ? `${pool.toLocaleString()} USDT Prize Pool` : 'Prize Pool';
    case 'free_bet':     return amt > 0 ? `${amt} USDT Free Bet` : 'Free Bet';
    case 'cashback':     return amt > 0 ? `${amt}% Cashback` : 'Cashback';
    case 'percentage':   return amt > 0 ? `${amt}% Bonus` : 'Bonus';
    default:             return amt > 0 ? `+${amt} USDT Bonus` : 'Bonus';
  }
}

function rewardColor(rewardType: string) {
  switch (rewardType) {
    case 'pool_split': return 'text-[#FACC15]';
    case 'free_bet':   return 'text-[#38BDF8]';
    case 'cashback':   return 'text-purple-400';
    default:           return 'text-[#00DFA9]';
  }
}

function ProgressBar({ req }: { req: PromoRequirement }) {
  const target = parseFloat(req.targetValue);
  const current = Math.min(req.currentValue, target);
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  const isDeposit = req.taskType === 'min_deposit';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'p-0.5 rounded',
            req.completed ? 'text-[#00DFA9]' : 'text-[#64748B]'
          )}>
            {req.completed
              ? <CheckCircle2 className="h-3.5 w-3.5 text-[#00DFA9]" />
              : taskIcon(req.taskType)
            }
          </span>
          <span className="text-[11px] text-[#94A3B8]">{req.description}</span>
        </div>
        <span className={cn('text-[11px] font-semibold tabular-nums', req.completed ? 'text-[#00DFA9]' : 'text-[#F8FAFC]')}>
          {isDeposit
            ? `${current.toFixed(0)}/${parseFloat(req.targetValue).toFixed(0)} USDT`
            : `${current}/${parseFloat(req.targetValue).toFixed(0)}`
          }
        </span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            req.completed ? 'bg-[#00DFA9]' : pct >= 60 ? 'bg-[#38BDF8]' : 'bg-[#475569]'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Already claimed or not eligible';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setClaiming(null);
    }
  }

  const filtered = promos.filter(p => active === 'All' || typeToCategory(p.type) === active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#F8FAFC]">Promotions & Missions</h2>
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

      {loading && (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="h-5 w-5 text-[#00DFA9] animate-spin" />
        </div>
      )}

      {!loading && apiError && (
        <div className="rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/5 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-[#EF4444]/50 mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-[#F8FAFC]">Could not load promotions</p>
          <p className="text-[11px] text-[#64748B] mt-1">Please try again later.</p>
        </div>
      )}

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

      {!loading && !apiError && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(promo => {
            const expired = isExpired(promo.expiresAt);
            const bannerColor = promo.bannerColor ?? '#00DFA9';
            const hasRequirements = promo.requirements.length > 0;
            const completedCount = promo.requirements.filter(r => r.completed).length;
            const allMet = promo.allRequirementsMet;
            const canClaim = !promo.claimed && !expired && (!hasRequirements || allMet);

            return (
              <div key={promo.id}
                className={cn(
                  'relative rounded-2xl border overflow-hidden transition-all',
                  promo.claimed
                    ? 'border-[#00DFA9]/20 bg-[#071A12]/50'
                    : expired
                      ? 'border-white/[0.04] bg-[#0E1520] opacity-60'
                      : 'border-white/[0.09] bg-[#0E1520]'
                )}>

                {/* Top color bar */}
                {!expired && !promo.claimed && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, ${bannerColor}, ${bannerColor}88, transparent)` }}
                  />
                )}

                <div className="p-4">
                  {/* Header row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${bannerColor}18`, borderColor: `${bannerColor}30` }}>
                      {promo.rewardType === 'pool_split'
                        ? <Trophy className="h-5 w-5" style={{ color: bannerColor }} />
                        : promo.rewardType === 'free_bet'
                          ? <Zap className="h-5 w-5" style={{ color: bannerColor }} />
                          : <Gift className="h-5 w-5" style={{ color: bannerColor }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                          style={{ background: `${bannerColor}20`, color: bannerColor }}>
                          {promo.type.charAt(0).toUpperCase() + promo.type.slice(1).replace(/_/g, ' ')}
                        </span>
                        {promo.wageringRequirement && parseFloat(promo.wageringRequirement) > 1 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-white/6 text-[#64748B]">
                            {promo.wageringRequirement}x wagering
                          </span>
                        )}
                      </div>
                      <h3 className="text-[14px] font-bold text-[#F8FAFC] leading-snug">{promo.title}</h3>
                      <p className={cn('text-[12px] font-semibold mt-0.5', rewardColor(promo.rewardType))}>
                        {rewardLabel(promo)}
                      </p>
                    </div>
                    {promo.claimed && (
                      <CheckCircle2 className="h-5 w-5 text-[#00DFA9] shrink-0" />
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-[#64748B] leading-relaxed mb-3">{promo.description}</p>

                  {/* Mission requirements */}
                  {hasRequirements && (
                    <div className={cn(
                      'rounded-xl border p-3 mb-3 space-y-2.5',
                      promo.claimed ? 'border-white/[0.06] bg-white/[0.02]' : 'border-white/[0.08] bg-[#0B0F14]/60'
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[#94A3B8] tracking-wider uppercase">
                          Mission Tasks
                        </span>
                        <span className={cn(
                          'text-[10px] font-semibold',
                          completedCount === promo.requirements.length ? 'text-[#00DFA9]' : 'text-[#64748B]'
                        )}>
                          {completedCount}/{promo.requirements.length} complete
                        </span>
                      </div>
                      {promo.requirements.map(req => (
                        <ProgressBar key={req.id} req={req} />
                      ))}
                    </div>
                  )}

                  {/* Footer row */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#475569]">{fmtExpiry(promo.expiresAt)}</p>
                    <div className="flex items-center gap-2">
                      {promo.claimed ? (
                        <div className="space-y-0.5 text-right">
                          <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/25">
                            <CheckCircle2 className="h-3 w-3" /> Claimed
                          </span>
                          {promo.claimedAt && (
                            <p className="text-[9px] text-[#00DFA9]/40 text-right">
                              {fmtClaimedAt(promo.claimedAt)}
                            </p>
                          )}
                        </div>
                      ) : expired ? (
                        <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 text-[#64748B] border border-white/[0.08]">
                          <Clock className="h-3 w-3" /> Expired
                        </span>
                      ) : !isAuthenticated ? (
                        <button
                          onClick={() => window.dispatchEvent(new Event('openLoginModal'))}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] bg-white/8 text-[#94A3B8] border border-white/[0.10]"
                        >
                          Connect wallet to track <ChevronRight className="h-3 w-3" />
                        </button>
                      ) : !canClaim ? (
                        <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 text-[#475569] border border-white/[0.06] cursor-not-allowed select-none">
                          <Lock className="h-3 w-3" /> Complete tasks first
                        </span>
                      ) : (
                        <button
                          onClick={() => claimPromo(promo.id)}
                          disabled={claiming === promo.id}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97] bg-gradient-to-r from-[#00DFA9] to-[#00C49A] text-[#0B0F14] disabled:opacity-50"
                        >
                          {claiming === promo.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <><Gift className="h-3 w-3" />Claim Reward</>}
                        </button>
                      )}
                    </div>
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
