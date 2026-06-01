import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Gift, ExternalLink, CheckCircle2, Clock,
  Loader2, AlertCircle, Target, Trophy, Lock,
  ChevronRight, Zap, Users, TrendingUp, Wallet,
  PartyPopper,
} from 'lucide-react';

type PromoCategory = 'All' | 'Welcome' | 'Weekly' | 'Loyalty';
const CATEGORIES: PromoCategory[] = ['All', 'Welcome', 'Weekly', 'Loyalty'];

// ── Coin rain particles (stable reference, generated once) ─────────────────────
const COINS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: 5 + Math.random() * 90,
  delay: Math.random() * 1.4,
  dur: 1.6 + Math.random() * 1.4,
  size: 14 + Math.random() * 20,
  rot: Math.random() * 360,
  drift: (Math.random() - 0.5) * 80,
}));

// ── Animated counter ──────────────────────────────────────────────────────────
function useCounter(target: number, active: boolean, duration = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((target * ease).toFixed(2)));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

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

// ── Congratulations overlay ───────────────────────────────────────────────────
function CongratsOverlay({ amount, onClose }: { amount: number; onClose: () => void }) {
  const [, navigate] = useLocation();
  const counterVal = useCounter(amount, true);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(11,15,20,0.93)', backdropFilter: 'blur(10px)' }}>
      <style>{`
        @keyframes ppCoinFall { 0%{transform:translateY(-60px) rotate(0deg) translateX(0);opacity:1} 100%{transform:translateY(110vh) rotate(var(--ppRot)) translateX(var(--ppDrift));opacity:0} }
        @keyframes ppCardIn   { 0%{transform:scale(.7);opacity:0} 65%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
        @keyframes ppGoldPulse{ 0%,100%{text-shadow:0 0 30px rgba(250,204,21,.5)} 50%{text-shadow:0 0 60px rgba(250,204,21,.95)} }
        @keyframes ppRingPulse{ 0%,100%{box-shadow:0 0 0 0 rgba(250,204,21,.5)} 50%{box-shadow:0 0 0 20px rgba(250,204,21,0)} }
        @keyframes ppPopIn    { 0%{transform:scale(0)} 70%{transform:scale(1.15)} 100%{transform:scale(1)} }
      `}</style>

      {/* Coin rain */}
      {COINS.map(c => (
        <div
          key={c.id}
          className="fixed rounded-full flex items-center justify-center font-black text-[#0B0F14] select-none pointer-events-none"
          style={{
            left: `${c.x}%`,
            top: '-40px',
            width: c.size,
            height: c.size,
            fontSize: c.size * 0.55,
            background: 'radial-gradient(circle at 35% 35%,#FFE066,#FACC15 55%,#B8960C)',
            boxShadow: '0 2px 8px rgba(250,204,21,0.5)',
            ['--ppRot' as string]: `${c.rot}deg`,
            ['--ppDrift' as string]: `${c.drift}px`,
            animation: `ppCoinFall ${c.dur}s ${c.delay}s ease-in forwards`,
          }}
        >
          $
        </div>
      ))}

      {/* Card */}
      <div
        className="relative z-10 flex flex-col items-center gap-5 px-8 py-10 rounded-3xl max-w-sm w-full mx-4 text-center overflow-hidden"
        style={{
          background: 'linear-gradient(160deg,#0A100A 0%,#0D1A10 55%,#0A0F10 100%)',
          border: '1.5px solid rgba(250,204,21,0.35)',
          boxShadow: '0 0 80px rgba(250,204,21,0.15), 0 40px 100px rgba(0,0,0,0.9)',
          animation: 'ppCardIn 0.5s cubic-bezier(.16,1,.3,1) forwards',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FACC15] to-transparent" />
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle,rgba(250,204,21,0.10) 0%,transparent 70%)' }} />

        {/* Icon */}
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'radial-gradient(circle,#FACC15 0%,#B8960C 100%)', animation: 'ppPopIn 0.5s 0.15s cubic-bezier(.16,1,.3,1) both, ppRingPulse 2s 0.7s ease-in-out infinite' }}
        >
          <PartyPopper className="w-9 h-9 text-[#0B0F14]" />
        </div>

        {/* Text */}
        <div>
          <p className="text-[#FACC15] text-[11px] font-bold uppercase tracking-widest mb-1">Bonus Credited!</p>
          <h2 className="text-[28px] sm:text-[34px] font-black text-[#FACC15] leading-tight mb-1"
            style={{ animation: 'ppGoldPulse 2s ease-in-out infinite' }}>
            Congratulations! 🎉
          </h2>
          <p className="text-[13px] text-[#94A3B8] leading-relaxed">Your bonus has been added to your account</p>
        </div>

        {/* Amount */}
        <div className="w-full px-6 py-5 rounded-2xl border border-[#FACC15]/30"
          style={{ background: 'rgba(250,204,21,0.07)' }}>
          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Bonus Balance Credited</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-[46px] sm:text-[54px] font-black text-[#FACC15] leading-none tabular-nums"
              style={{ textShadow: '0 0 40px rgba(250,204,21,0.4)' }}>
              {counterVal.toFixed(2)}
            </span>
            <span className="text-[18px] font-bold text-[#FACC15]/80">USDT</span>
          </div>
          <p className="text-[10px] text-[#64748B] mt-2">Non-withdrawable · Used for betting only</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={() => { onClose(); navigate('/'); }}
            className="relative w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-[14px] text-[#071210] overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#00DFA9 0%,#00C49A 100%)' }}
          >
            <Zap className="w-4 h-4 shrink-0" />
            Start Playing →
          </button>
          <button
            onClick={onClose}
            className="text-[11px] text-[#64748B]/60 hover:text-[#94A3B8] transition-colors cursor-pointer"
          >
            Stay on Promotions
          </button>
        </div>
      </div>
    </div>
  );
}

export function PromotionsPage() {
  const { isAuthenticated } = useAuth();
  const { refreshBalance } = useWallet();
  const { toast } = useToast();
  const [active, setActive] = useState<PromoCategory>('All');
  const [promos, setPromos]  = useState<ApiPromotion[]>([]);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [loading, setLoading]   = useState(true);
  const [apiError, setApiError] = useState(false);

  // Congrats overlay state
  const [congratsAmount, setCongratsAmount] = useState(0);
  const [showCongrats, setShowCongrats]     = useState(false);
  // Prevent duplicate refreshes
  const refreshedRef = useRef(false);

  useEffect(() => {
    api.get<ApiPromotion[]>('/promotions')
      .then(data => { setPromos(data); setLoading(false); })
      .catch(() => { setApiError(true); setLoading(false); });
  }, []);

  async function claimPromo(id: number) {
    if (!isAuthenticated) { toast({ title: 'Please sign in to claim promotions' }); return; }
    setClaiming(id);
    try {
      const result = await api.post<{ success: boolean; bonusAmount?: string; claimId?: number }>(
        `/promotions/${id}/claim`, {}
      );
      const now = new Date().toISOString();
      setPromos(prev => prev.map(p => p.id === id ? { ...p, claimed: true, claimedAt: now } : p));

      // Refresh wallet balance
      if (!refreshedRef.current) {
        refreshedRef.current = true;
        await refreshBalance();
        // Allow re-refresh next time
        setTimeout(() => { refreshedRef.current = false; }, 3000);
      }

      // Show congrats overlay if bonus was credited
      const bonus = result?.bonusAmount ? parseFloat(result.bonusAmount) : 0;
      if (bonus > 0) {
        setCongratsAmount(bonus);
        setShowCongrats(true);
      } else {
        toast({ title: 'Promotion claimed!', description: 'Your reward has been applied.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Already claimed or not eligible';
      if (msg.toLowerCase().includes('already')) {
        toast({ title: 'Already claimed', description: 'You have already received this bonus.' });
      } else {
        toast({ title: msg, variant: 'destructive' });
      }
    } finally {
      setClaiming(null);
    }
  }

  const filtered = promos.filter(p => active === 'All' || typeToCategory(p.type) === active);

  return (
    <div className="space-y-4">
      {/* Congratulations overlay */}
      {showCongrats && (
        <CongratsOverlay
          amount={congratsAmount}
          onClose={() => setShowCongrats(false)}
        />
      )}

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
