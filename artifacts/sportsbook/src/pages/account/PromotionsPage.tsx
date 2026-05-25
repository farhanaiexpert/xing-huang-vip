import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Gift, Zap, CalendarCheck, Users, Tv2, Trophy,
  ChevronRight, CheckCircle2, Clock, Info, Copy, Check,
  ExternalLink, Loader2, Star,
} from 'lucide-react';

type PromoCategory = 'All' | 'Welcome' | 'Weekly' | 'Loyalty';

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
}

const DISPLAY_PROMOS = [
  {
    id: 'welcome', category: 'Welcome' as PromoCategory,
    icon: <Gift className="h-5 w-5" />, accent: '#00DFA9',
    tag: 'New Players', tagColor: 'bg-[#00DFA9]/15 text-[#00DFA9]',
    title: '100% Welcome Bonus', subtitle: 'Up to 500 USDT on your first deposit',
    desc: "Make your first deposit and we'll match it 100%, giving you double the funds to explore the markets. Min. deposit 20 USDT. 5× wagering requirement.",
    cta: 'Claim Bonus', ctaAction: 'claim', highlight: true,
  },
  {
    id: 'acca', category: 'Weekly' as PromoCategory,
    icon: <Zap className="h-5 w-5" />, accent: '#FACC15',
    tag: 'Always On', tagColor: 'bg-[#FACC15]/15 text-[#FACC15]',
    title: 'Acca Boost', subtitle: 'Up to +50% on winning accumulators',
    desc: 'Win more on your accumulators. 4 selections: +10% · 5 selections: +20% · 6 selections: +35% · 7+: +50%. Applied automatically to qualifying bets.',
    cta: 'Bet Now', ctaAction: 'bet', highlight: false,
  },
  {
    id: 'friday', category: 'Weekly' as PromoCategory,
    icon: <CalendarCheck className="h-5 w-5" />, accent: '#38BDF8',
    tag: 'Every Friday', tagColor: 'bg-[#38BDF8]/15 text-[#38BDF8]',
    title: 'Free Bet Friday', subtitle: '10 USDT free bet, every single week',
    desc: 'Place at least 25 USDT in total bets Mon–Thu and receive a 10 USDT free bet credited every Friday at 09:00 UTC.',
    cta: 'Learn More', ctaAction: 'info', highlight: false,
  },
  {
    id: 'refer', category: 'Weekly' as PromoCategory,
    icon: <Users className="h-5 w-5" />, accent: '#A78BFA',
    tag: 'Ongoing', tagColor: 'bg-[#A78BFA]/15 text-[#A78BFA]',
    title: 'Refer a Friend', subtitle: '25 USDT for you, 25 USDT for them',
    desc: 'Share your referral link. When your friend signs up and deposits 50 USDT+, you both receive a 25 USDT free bet.',
    cta: 'Share Link', ctaAction: 'share', highlight: false,
  },
  {
    id: 'cashback', category: 'Loyalty' as PromoCategory,
    icon: <Trophy className="h-5 w-5" />, accent: '#F97316',
    tag: 'VIP Only', tagColor: 'bg-[#F97316]/15 text-[#F97316]',
    title: 'Weekly Cashback', subtitle: '5% back on losing bets, every Monday',
    desc: 'VIP members get 5% cashback on their net losses from Mon–Sun, credited every Monday morning.',
    cta: 'Learn More', ctaAction: 'info', highlight: false,
  },
  {
    id: 'liveboost', category: 'Weekly' as PromoCategory,
    icon: <Tv2 className="h-5 w-5" />, accent: '#EC4899',
    tag: 'Live Betting', tagColor: 'bg-[#EC4899]/15 text-[#EC4899]',
    title: 'Live Bet Boost', subtitle: 'Enhanced odds on in-play markets',
    desc: 'Get boosted odds on selected live markets every weekend. Look for the ⚡ icon next to boosted markets.',
    cta: 'View Markets', ctaAction: 'bet', highlight: false,
  },
];

const CATEGORIES: PromoCategory[] = ['All', 'Welcome', 'Weekly', 'Loyalty'];

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

export function PromotionsPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [active, setActive]   = useState<PromoCategory>('All');
  const [copied, setCopied]   = useState(false);
  const [apiPromos, setApiPromos] = useState<ApiPromotion[]>([]);
  const [claiming, setClaiming]   = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);
  const [apiError, setApiError]   = useState(false);

  useEffect(() => {
    api.get<ApiPromotion[]>('/promotions')
      .then(data => { setApiPromos(data); setLoading(false); })
      .catch(() => { setApiError(true); setLoading(false); });
  }, []);

  async function claimPromo(id: number) {
    if (!isAuthenticated) { toast({ title: 'Please sign in to claim promotions' }); return; }
    setClaiming(id);
    try {
      await api.post(`/promotions/${id}/claim`, {});
      setApiPromos(prev => prev.map(p => p.id === id ? { ...p, claimed: true } : p));
      toast({ title: 'Promotion claimed!', description: 'Check your wallet for the bonus.' });
    } catch {
      toast({ title: 'Already claimed or not eligible', variant: 'destructive' });
    } finally {
      setClaiming(null);
    }
  }

  function handleDisplayCta(action: string) {
    if (action === 'share') {
      const code = typeof window !== 'undefined'
        ? (localStorage.getItem('cb_referral_code') ?? 'CUPBETT')
        : 'CUPBETT';
      void navigator.clipboard.writeText(`${window.location.origin}/?ref=${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      toast({ title: 'Referral link copied!' });
    } else {
      toast({ title: 'Opening promotion…' });
    }
  }

  const showApiPromos = !loading && !apiError && apiPromos.length > 0;

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

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 text-[#00DFA9] animate-spin" />
        </div>
      )}

      {/* Live API promotions */}
      {showApiPromos && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-[1.5px] flex-1 bg-[#1E2A38]" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#00DFA9]/60">Live Promotions</span>
            <div className="h-[1.5px] flex-1 bg-[#1E2A38]" />
          </div>
          {apiPromos
            .filter(p => active === 'All' || typeToCategory(p.type) === active)
            .map(promo => {
              const expired = isExpired(promo.expiresAt);
              return (
                <div key={promo.id}
                  className={cn(
                    'relative rounded-2xl border overflow-hidden',
                    promo.claimed ? 'border-[#00DFA9]/20 bg-[#071A12]/50' :
                    expired ? 'border-white/[0.04] bg-[#0E1520] opacity-60' :
                    'border-white/[0.09] bg-[#0E1520]'
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
                          <p className="text-[12px] font-semibold text-[#00DFA9] mb-1">+{promo.bonusAmount} USDT bonus</p>
                        )}
                        <p className="text-[11px] text-[#64748B] leading-relaxed">{promo.description}</p>
                        <p className="text-[10px] text-[#475569] mt-1.5">{fmtExpiry(promo.expiresAt)}</p>
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

      {/* Display / marketing promotions */}
      {!loading && (
        <div className="space-y-3">
          {showApiPromos && (
            <div className="flex items-center gap-2">
              <div className="h-[1.5px] flex-1 bg-[#1E2A38]" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]/60">Standard Offers</span>
              <div className="h-[1.5px] flex-1 bg-[#1E2A38]" />
            </div>
          )}
          {(active === 'All' ? DISPLAY_PROMOS : DISPLAY_PROMOS.filter(p => p.category === active)).map(promo => (
            <div key={promo.id} className={cn(
              'relative rounded-2xl border overflow-hidden',
              promo.highlight
                ? 'border-[#00DFA9]/30 bg-gradient-to-br from-[#071A12] to-[#0B0F14]'
                : 'border-white/[0.07] bg-[#0E1520]'
            )}>
              {promo.highlight && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00DFA9] via-[#38BDF8] to-[#FACC15]" />
              )}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${promo.accent}12`, border: `1px solid ${promo.accent}25`, color: promo.accent }}>
                    {promo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn('px-1.5 py-0.5 rounded-md text-[9px] font-bold', promo.tagColor)}>{promo.tag}</span>
                      <h3 className="text-[14px] font-bold text-[#F8FAFC]">{promo.title}</h3>
                    </div>
                    <p className="text-[12px] font-semibold mb-1.5" style={{ color: promo.accent }}>{promo.subtitle}</p>
                    <p className="text-[11px] text-[#64748B] leading-relaxed">{promo.desc}</p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleDisplayCta(promo.ctaAction)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
                    style={{
                      background: promo.highlight
                        ? `linear-gradient(135deg, ${promo.accent} 0%, ${promo.accent}CC 100%)`
                        : `${promo.accent}18`,
                      color: promo.highlight ? '#0B0F14' : promo.accent,
                      border: promo.highlight ? 'none' : `1px solid ${promo.accent}30`,
                    }}
                  >
                    {promo.ctaAction === 'share' && copied
                      ? <><Check className="h-3 w-3" />Copied!</>
                      : <>{promo.cta}<ChevronRight className="h-3 w-3" /></>
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
