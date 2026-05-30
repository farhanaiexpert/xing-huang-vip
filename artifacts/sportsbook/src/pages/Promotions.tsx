import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import {
  Gift, Zap, CalendarCheck, Users, Tv2, Trophy,
  ChevronRight, Star, CheckCircle2, Clock, Info, Copy, Check, PartyPopper,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Congrats helpers (coin rain + counter) ───────────────────────────────────
const PROMO_COINS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: 5 + Math.random() * 90,
  delay: Math.random() * 1.4,
  dur: 1.6 + Math.random() * 1.4,
  size: 14 + Math.random() * 20,
  rot: Math.random() * 360,
  drift: (Math.random() - 0.5) * 80,
}));

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

// ─── Types ────────────────────────────────────────────────────────────────────
type PromoCategory = 'All' | 'Welcome' | 'Weekly' | 'Loyalty';

// ─── Promo data ───────────────────────────────────────────────────────────────
const PROMOS = [
  {
    id: 'welcome',
    category: 'Welcome' as PromoCategory,
    icon: <Gift className="h-5 w-5" />,
    accent: '#00DFA9',
    accentBg: 'bg-[#00DFA9]/10',
    accentBorder: 'border-[#00DFA9]/25',
    tag: 'New Players',
    tagColor: 'bg-[#00DFA9]/15 text-[#00DFA9]',
    title: '100% Welcome Bonus',
    subtitle: 'Up to 500 USDT on your first deposit',
    desc: 'Make your first deposit and we\'ll match it 100%, giving you double the funds to explore the markets. Min. deposit 20 USDT. 5× wagering requirement.',
    cta: 'Claim Bonus',
    ctaAction: 'claim',
    expires: null,
    highlight: true,
  },
  {
    id: 'acca',
    category: 'Weekly' as PromoCategory,
    icon: <Zap className="h-5 w-5" />,
    accent: '#FACC15',
    accentBg: 'bg-[#FACC15]/10',
    accentBorder: 'border-[#FACC15]/25',
    tag: 'Always On',
    tagColor: 'bg-[#FACC15]/15 text-[#FACC15]',
    title: 'Acca Boost',
    subtitle: 'Up to +50% on winning accumulators',
    desc: 'Win more on your accumulators. 4 selections: +10% · 5 selections: +20% · 6 selections: +35% · 7+: +50%. Applied automatically to qualifying bets.',
    cta: 'Bet Now',
    ctaAction: 'bet',
    expires: null,
    highlight: false,
  },
  {
    id: 'friday',
    category: 'Weekly' as PromoCategory,
    icon: <CalendarCheck className="h-5 w-5" />,
    accent: '#38BDF8',
    accentBg: 'bg-[#38BDF8]/10',
    accentBorder: 'border-[#38BDF8]/25',
    tag: 'Every Friday',
    tagColor: 'bg-[#38BDF8]/15 text-[#38BDF8]',
    title: 'Free Bet Friday',
    subtitle: '10 USDT free bet, every single week',
    desc: 'Place at least 25 USDT in total bets Mon–Thu and receive a 10 USDT free bet credited to your account every Friday at 09:00 UTC. No opt-in required.',
    cta: 'Learn More',
    ctaAction: 'info',
    expires: 'Resets Monday',
    highlight: false,
  },
  {
    id: 'refer',
    category: 'Weekly' as PromoCategory,
    icon: <Users className="h-5 w-5" />,
    accent: '#A78BFA',
    accentBg: 'bg-[#A78BFA]/10',
    accentBorder: 'border-[#A78BFA]/25',
    tag: 'Ongoing',
    tagColor: 'bg-[#A78BFA]/15 text-[#A78BFA]',
    title: 'Refer a Friend',
    subtitle: '25 USDT for you, 25 USDT for them',
    desc: 'Share your unique referral link. When your friend signs up and deposits 50 USDT+, you both receive a 25 USDT free bet. No limit on referrals.',
    cta: 'Copy Your Link',
    ctaAction: 'refer',
    expires: null,
    highlight: false,
  },
  {
    id: 'inplay',
    category: 'Weekly' as PromoCategory,
    icon: <Tv2 className="h-5 w-5" />,
    accent: '#EF4444',
    accentBg: 'bg-[#EF4444]/10',
    accentBorder: 'border-[#EF4444]/25',
    tag: 'Weekly',
    tagColor: 'bg-[#EF4444]/15 text-[#EF4444]',
    title: 'In-Play Cashback',
    subtitle: '10% back on live bet losses',
    desc: 'Lost on an in-play bet? We\'ll return 10% of your net in-play losses as a free bet credit every Monday, up to a maximum of 50 USDT per week.',
    cta: 'Bet Now',
    ctaAction: 'bet',
    expires: 'Weekly cap: 50 USDT',
    highlight: false,
  },
  {
    id: 'betget',
    category: 'Weekly' as PromoCategory,
    icon: <Trophy className="h-5 w-5" />,
    accent: '#F97316',
    accentBg: 'bg-[#F97316]/10',
    accentBorder: 'border-[#F97316]/25',
    tag: 'Limited',
    tagColor: 'bg-[#F97316]/15 text-[#F97316]',
    title: 'Bet & Get — Premier League',
    subtitle: 'Bet 20 USDT, get a 5 USDT free bet',
    desc: 'Place any 20 USDT+ single on a Premier League match this weekend and receive a 5 USDT free bet instantly. Applies to pre-match bets only at odds of 1.50+.',
    cta: 'Bet Now',
    ctaAction: 'bet',
    expires: 'Ends Sun 23:59 UTC',
    highlight: false,
  },
];

// ─── Loyalty tiers ────────────────────────────────────────────────────────────
const TIERS = [
  {
    name: 'Bronze',
    color: '#CD7F32',
    bg: 'bg-[#CD7F32]/10',
    border: 'border-[#CD7F32]/25',
    pts: '0 – 999 pts',
    multiplier: '1×',
    perks: ['Weekly free bet eligibility', 'Standard withdrawal speed'],
  },
  {
    name: 'Silver',
    color: '#94A3B8',
    bg: 'bg-[#94A3B8]/10',
    border: 'border-[#94A3B8]/25',
    pts: '1,000 – 4,999 pts',
    multiplier: '1.5×',
    perks: ['Priority customer support', 'Boosted acca percentages', 'Faster withdrawals (24 h)'],
  },
  {
    name: 'Gold',
    color: '#FACC15',
    bg: 'bg-[#FACC15]/10',
    border: 'border-[#FACC15]/25',
    pts: '5,000 – 19,999 pts',
    multiplier: '2×',
    perks: ['Dedicated account manager', 'Exclusive Gold promotions', 'Same-day withdrawals'],
  },
  {
    name: 'Platinum',
    color: '#00DFA9',
    bg: 'bg-[#00DFA9]/10',
    border: 'border-[#00DFA9]/25',
    pts: '20,000+ pts',
    multiplier: '3×',
    perks: ['VIP events & hospitality', 'Custom bet limits on request', 'Instant withdrawals', 'Personal odds requests'],
  },
];

const CATEGORIES: PromoCategory[] = ['All', 'Welcome', 'Weekly', 'Loyalty'];

// ─── PromoCard ─────────────────────────────────────────────────────────────────
function PromoCard({
  promo,
  onClaim,
  onBet,
  onInfo,
  onRefer,
}: {
  promo: typeof PROMOS[0];
  onClaim: () => void;
  onBet: () => void;
  onInfo: () => void;
  onRefer: () => void;
}) {
  function handleCta() {
    if (promo.ctaAction === 'claim') onClaim();
    else if (promo.ctaAction === 'bet')   onBet();
    else if (promo.ctaAction === 'info')  onInfo();
    else if (promo.ctaAction === 'refer') onRefer();
  }

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl bg-[#121821] border transition-all duration-200 overflow-hidden',
        'hover:shadow-lg',
        promo.highlight
          ? 'border-[#00DFA9]/40 ring-1 ring-[#00DFA9]/15'
          : 'border-[#253241]',
      )}
      style={promo.highlight ? { boxShadow: '0 0 32px rgba(0,223,169,0.07)' } : undefined}
    >
      <div className="h-0.5 w-full" style={{ background: promo.accent }} />

      {promo.highlight && (
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase"
          style={{ background: `${promo.accent}22`, color: promo.accent, border: `1px solid ${promo.accent}44` }}
        >
          Most Popular
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', promo.accentBg, `border ${promo.accentBorder}`)}
            style={{ color: promo.accent }}
          >
            {promo.icon}
          </div>
          <div className="min-w-0 flex-1">
            <span className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded inline-block mb-1', promo.tagColor)}>
              {promo.tag}
            </span>
            <h3 className="text-sm font-black text-[#F8FAFC] leading-tight">{promo.title}</h3>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: promo.accent }}>{promo.subtitle}</p>
          </div>
        </div>

        <p className="text-[12px] text-[#94A3B8]/70 leading-relaxed flex-1">{promo.desc}</p>

        <div className="flex items-center justify-between gap-3 pt-1">
          {promo.expires ? (
            <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]/40">
              <Clock className="h-3 w-3" />
              {promo.expires}
            </div>
          ) : <div />}
          <button
            onClick={handleCta}
            className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all duration-150 hover:opacity-80 active:scale-95"
            style={{
              background: `${promo.accent}18`,
              color: promo.accent,
              border: `1px solid ${promo.accent}35`,
            }}
          >
            {promo.cta} <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LoyaltySection ────────────────────────────────────────────────────────────
function LoyaltySection({ onJoin }: { onJoin: () => void }) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-2">
        <Star className="h-4 w-4 text-[#FACC15]" />
        <h2 className="text-base font-black text-[#F8FAFC]">Loyalty Programme</h2>
      </div>
      <p className="text-[12px] text-[#94A3B8]/55 mb-6 max-w-xl">
        Earn 1 loyalty point for every 1 USDT wagered. Points unlock higher tiers with better multipliers, faster withdrawals, and exclusive perks — automatically.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TIERS.map((tier) => (
          <div key={tier.name} className={cn('rounded-2xl bg-[#121821] border p-4 space-y-3', tier.border)}>
            <div className="flex items-center gap-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', tier.bg)}>
                <Trophy className="h-4 w-4" style={{ color: tier.color }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: tier.color }}>{tier.name}</p>
                <p className="text-[9px] text-[#94A3B8]/40">{tier.pts}</p>
              </div>
            </div>

            <div className={cn('rounded-lg px-3 py-2 text-center', tier.bg)}>
              <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-widest">Points multiplier</p>
              <p className="text-lg font-black mt-0.5" style={{ color: tier.color }}>{tier.multiplier}</p>
            </div>

            <ul className="space-y-1.5">
              {tier.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-1.5 text-[11px] text-[#94A3B8]/60">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" style={{ color: tier.color }} />
                  {perk}
                </li>
              ))}
            </ul>

            <button
              onClick={onJoin}
              className="w-full text-[11px] font-bold py-1.5 rounded-lg transition-all duration-150 hover:opacity-80 active:scale-95"
              style={{ background: `${tier.color}18`, color: tier.color, border: `1px solid ${tier.color}35` }}
            >
              Join &amp; Start Earning
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function Promotions() {
  const [active, setActive] = useState<PromoCategory>('All');
  const [copied, setCopied] = useState(false);
  const { refreshBalance } = useWallet();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Welcome bonus claim state
  const [claiming, setClaiming] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const counterVal = useCounter(99.99, showCongrats);

  // Check on mount if already claimed
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<{ claimed: boolean }>('/wallet/bonus/welcome/status')
      .then(r => { if (r.claimed) setAlreadyClaimed(true); })
      .catch(() => {});
  }, [isAuthenticated]);

  const visible = active === 'Loyalty' ? [] : (
    active === 'All' ? PROMOS : PROMOS.filter((p) => p.category === active)
  );

  const handleClaim = useCallback(async () => {
    if (!isAuthenticated) {
      window.dispatchEvent(new Event('openLoginModal'));
      return;
    }
    if (alreadyClaimed) return;
    setClaiming(true);
    try {
      await api.post('/wallet/bonus/welcome', {});
      await refreshBalance();
      setAlreadyClaimed(true);
      setShowCongrats(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('already') || msg.includes('409') || msg.includes('ALREADY_CLAIMED')) {
        setAlreadyClaimed(true);
        toast({ title: 'Already claimed', description: 'You have already received your welcome bonus.' });
      } else {
        toast({ title: 'Error', description: msg || 'Failed to claim bonus. Please try again.' });
      }
    } finally {
      setClaiming(false);
    }
  }, [isAuthenticated, alreadyClaimed, refreshBalance, navigate, toast]);

  function handleBet() {
    navigate('/');
  }

  function handleInfo() {
    toast({
      title: 'Free Bet Friday',
      description: 'Bet 25+ USDT Mon–Thu and your 10 USDT free bet lands every Friday at 09:00 UTC automatically.',
    });
  }

  function handleRefer() {
    const link = `https://oddschain.io/ref/${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({
      title: 'Referral link copied!',
      description: 'Share it with friends. You both get 25 USDT when they deposit 50+ USDT.',
    });
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-14 xl:pb-0">
      <Header />

      {/* ── Congrats overlay ────────────────────────────────────────────── */}
      {showCongrats && (
        <>
          <style>{`
            @keyframes coinFall { 0%{transform:translateY(-40px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
            @keyframes congratsPop { 0%{transform:scale(.6);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
          `}</style>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(11,15,20,0.92)', backdropFilter: 'blur(8px)' }}>
            {/* Coin rain */}
            {PROMO_COINS.map(c => (
              <span key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '-40px', fontSize: c.size, animationName: 'coinFall', animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, animationTimingFunction: 'cubic-bezier(.4,0,.6,1)', animationIterationCount: 'infinite', animationFillMode: 'both', transform: `rotate(${c.rot}deg) translateX(${c.drift}px)`, pointerEvents: 'none' }}>🪙</span>
            ))}
            {/* Card */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 rounded-3xl max-w-sm w-full mx-4 text-center"
              style={{ background: 'linear-gradient(145deg,#0D1825,#081018)', border: '1.5px solid rgba(250,204,21,0.35)', boxShadow: '0 0 60px rgba(250,204,21,0.18)', animation: 'congratsPop .5s cubic-bezier(.34,1.56,.64,1) forwards' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FACC15,#F59E0B)', boxShadow: '0 0 30px rgba(250,204,21,0.4)' }}>
                <PartyPopper className="w-8 h-8 text-[#0B0F14]" />
              </div>
              <div>
                <p className="text-[#FACC15] text-xs font-bold uppercase tracking-widest mb-1">Welcome Bonus Unlocked!</p>
                <p className="text-5xl font-black text-white tabular-nums">{counterVal.toFixed(2)} <span className="text-2xl text-[#FACC15]">USDT</span></p>
                <p className="text-[#94A3B8]/70 text-sm mt-2">Added to your bonus balance · non-withdrawable</p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <button onClick={() => { setShowCongrats(false); navigate('/'); }}
                  className="w-full py-3 rounded-xl font-black text-[#0B0F14] text-sm transition-transform hover:scale-[1.02] active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg,#00DFA9,#00C49A)' }}>
                  Start Playing →
                </button>
                <button onClick={() => setShowCongrats(false)} className="text-xs text-[#94A3B8]/50 hover:text-[#94A3B8]/80 transition-colors">
                  Stay on Promotions
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Hero banner */}
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-[#121821] border border-[#253241]">
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(ellipse at 70% 50%, #00DFA9 0%, transparent 65%), radial-gradient(ellipse at 20% 80%, #38BDF8 0%, transparent 55%)' }}
          />
          <div className="relative px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#00DFA9]/15 border border-[#00DFA9]/30 px-3 py-1 rounded-full text-[10px] font-bold text-[#00DFA9] uppercase tracking-widest mb-3">
                <Gift className="h-3 w-3" /> Welcome offer
              </div>
              <h1 className="text-3xl font-black tracking-tight leading-tight">100% Match Bonus</h1>
              <p className="text-[#94A3B8]/70 text-sm mt-1.5 max-w-sm">
                New to CupBett? Your first deposit is matched 100% — up to <span className="text-[#00DFA9] font-bold">500 USDT</span> in bonus funds.
              </p>
              <p className="text-[10px] text-[#94A3B8]/35 mt-3">18+ · T&Cs apply · 5× wagering req. · Min. 20 USDT deposit</p>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming || alreadyClaimed}
              className="shrink-0 flex items-center gap-2 bg-[#00DFA9] hover:bg-[#00DFA9]/90 active:scale-95 text-[#0B0F14] font-black text-sm px-6 py-3 rounded-xl transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {alreadyClaimed ? '✓ Bonus Claimed' : claiming ? 'Claiming…' : 'Claim Now — 120 USDT Free'}
              {!alreadyClaimed && !claiming && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                active === cat
                  ? 'bg-[#00DFA9] text-[#0B0F14] border-[#00DFA9]'
                  : 'bg-[#121821] text-[#94A3B8]/60 border-[#253241] hover:border-[#94A3B8]/30 hover:text-[#94A3B8]',
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Promo grid */}
        {active !== 'Loyalty' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((promo) => (
              <PromoCard
                key={promo.id}
                promo={promo}
                onClaim={handleClaim}
                onBet={handleBet}
                onInfo={handleInfo}
                onRefer={handleRefer}
              />
            ))}
          </div>
        )}

        {/* Loyalty section */}
        {(active === 'All' || active === 'Loyalty') && (
          <LoyaltySection onJoin={handleClaim} />
        )}

        {/* Terms note */}
        <div className="mt-10 flex items-start gap-2 p-4 rounded-xl bg-[#121821] border border-[#253241]">
          <Info className="h-3.5 w-3.5 text-[#94A3B8]/40 mt-0.5 shrink-0" />
          <p className="text-[10px] text-[#94A3B8]/35 leading-relaxed">
            All promotions are subject to CupBett's general{' '}
            <Link href="/terms" className="underline hover:text-[#94A3B8]/60 transition-colors">Terms & Conditions</Link>
            {' '}and individual promotion terms. Bonus funds cannot be withdrawn until wagering requirements are met.
          </p>
        </div>
      </main>
    </div>
  );
}
