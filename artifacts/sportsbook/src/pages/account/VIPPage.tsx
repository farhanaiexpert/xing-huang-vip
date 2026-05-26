import { useEffect, useState } from 'react';
import { Crown, Star, TrendingUp, Award, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tier {
  name: string;
  min: number;
  max: number;
  color: string;
  emoji: string;
}

interface LoyaltySummary {
  totalPoints: number;
  tier: Tier;
  nextTier: Tier | null;
  progressToNext: number;
  recentHistory: { id: number; points: string; reason: string; createdAt: string }[];
  tiers: Tier[];
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  monthlyPoints: number;
  tier: Tier;
}

const PERKS: Record<string, string[]> = {
  Bronze:   ['Access to all markets', 'Standard withdrawal speed'],
  Silver:   ['1 free WinSpin per week', 'Priority support tag'],
  Gold:     ['3 free WinSpins per week', '1.05× acca odds boost', 'Faster withdrawals'],
  Platinum: ['Daily WinSpin', '1.08× acca odds boost', 'Dedicated support', 'Early access to features'],
  Diamond:  ['Unlimited WinSpins', '1.10× acca odds boost', '3% monthly cashback', 'VIP account manager', 'Exclusive promotions'],
};

function TierCard({ tier, isActive, points }: { tier: Tier; isActive: boolean; points: number }) {
  const unlocked = points >= tier.min;
  return (
    <div className={cn(
      'rounded-xl border p-3 transition-all',
      isActive
        ? 'border-2 bg-gradient-to-br from-[#141C28] to-[#0E1520]'
        : unlocked
          ? 'border-white/[0.08] bg-[#0E1520]/60'
          : 'border-white/[0.04] bg-[#0B0F14]/60 opacity-50'
    )}
      style={{ borderColor: isActive ? tier.color : undefined }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{tier.emoji}</span>
        <span className="font-bold text-[13px]" style={{ color: isActive ? tier.color : '#94A3B8' }}>
          {tier.name}
        </span>
        {isActive && (
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: `${tier.color}20`, color: tier.color }}>
            Current
          </span>
        )}
      </div>
      <p className="text-[10px] text-[#94A3B8]/50 mb-2">{tier.min.toLocaleString()} pts{tier.max < Infinity ? ` – ${tier.max.toLocaleString()} pts` : '+'}</p>
      <ul className="space-y-1">
        {PERKS[tier.name]?.map(p => (
          <li key={p} className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]/70">
            <Star className="h-2.5 w-2.5 shrink-0" style={{ color: unlocked ? tier.color : '#334155' }} />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VIPPage() {
  const [summary, setSummary]         = useState<LoyaltySummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cb_token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch('/api/loyalty/summary', { headers }).then(r => r.ok ? r.json() : null),
      fetch('/api/loyalty/leaderboard', { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([s, l]) => {
      setSummary(s);
      setLeaderboard(l);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-7 h-7 border-2 border-[#00DFA9]/30 border-t-[#00DFA9] rounded-full animate-spin" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-16 text-[#94A3B8]/50">
        <Crown className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Could not load VIP data. Make sure you are signed in.</p>
      </div>
    );
  }

  const { totalPoints, tier, nextTier, progressToNext, recentHistory, tiers } = summary;

  return (
    <div className="space-y-5">
      {/* Hero tier card */}
      <div className="rounded-2xl border p-5 relative overflow-hidden"
        style={{ borderColor: `${tier.color}40`, background: `linear-gradient(135deg, ${tier.color}08, #0E1520)` }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10"
          style={{ background: tier.color }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{tier.emoji}</span>
            <div>
              <p className="text-[11px] text-[#94A3B8]/50 uppercase tracking-widest">Your Tier</p>
              <p className="text-[22px] font-black" style={{ color: tier.color }}>{tier.name}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11px] text-[#94A3B8]/50">Total Points</p>
              <p className="text-[24px] font-black text-[#F8FAFC] tabular-nums">
                {totalPoints.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {nextTier && (
            <div>
              <div className="flex justify-between text-[10px] text-[#94A3B8]/50 mb-1">
                <span>{tier.name}</span>
                <span>{nextTier.name} — {nextTier.min.toLocaleString()} pts</span>
              </div>
              <div className="h-2 rounded-full bg-[#1E2A38] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, progressToNext)}%`, background: tier.color }}
                />
              </div>
              <p className="text-[10px] text-[#94A3B8]/40 mt-1">
                {Math.max(0, nextTier.min - totalPoints).toLocaleString(undefined, { maximumFractionDigits: 0 })} pts to {nextTier.name}
              </p>
            </div>
          )}
          {!nextTier && (
            <p className="text-[11px] font-semibold" style={{ color: tier.color }}>
              👑 You have reached the highest tier!
            </p>
          )}
        </div>
      </div>

      {/* How points work */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0E1520] px-4 py-3 flex items-center gap-3">
        <TrendingUp className="h-4 w-4 text-[#00DFA9] shrink-0" />
        <p className="text-[11px] text-[#94A3B8]/70">
          Earn <span className="text-[#F8FAFC] font-semibold">1 point per USDT staked</span> on singles,{' '}
          <span className="text-[#FACC15] font-semibold">2× on accas</span>. Points are awarded when your bet settles.
        </p>
      </div>

      {/* All tiers grid */}
      <div>
        <p className="text-[12px] font-bold text-[#F8FAFC] mb-2.5 flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-[#FACC15]" />
          All Tiers & Perks
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {tiers.map(t => (
            <TierCard key={t.name} tier={t} isActive={t.name === tier.name} points={totalPoints} />
          ))}
        </div>
      </div>

      {/* Leaderboard + Recent activity side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Monthly leaderboard */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0E1520] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-[#FACC15]" />
            <span className="text-[12px] font-bold text-[#F8FAFC]">Monthly Leaderboard</span>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-[11px] text-[#94A3B8]/40 text-center py-8">No data yet this month</p>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {leaderboard.map(entry => (
                <div key={entry.rank} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={cn(
                    'w-5 text-center text-[11px] font-black',
                    entry.rank === 1 ? 'text-[#FACC15]' :
                    entry.rank === 2 ? 'text-[#94A3B8]' :
                    entry.rank === 3 ? 'text-[#CD7F32]' : 'text-[#334155]'
                  )}>#{entry.rank}</span>
                  <span className="text-[11px] font-semibold text-[#F8FAFC] flex-1 truncate">{entry.username}</span>
                  <span className="text-[9px]">{entry.tier.emoji}</span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: entry.tier.color }}>
                    {entry.monthlyPoints.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent points history */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0E1520] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-[#00DFA9]" />
            <span className="text-[12px] font-bold text-[#F8FAFC]">Recent Points</span>
          </div>
          {recentHistory.length === 0 ? (
            <p className="text-[11px] text-[#94A3B8]/40 text-center py-8">Place and settle bets to earn points</p>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {recentHistory.map(h => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1">
                    <p className="text-[11px] text-[#94A3B8]/60 capitalize">{h.reason.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-[#334155]">
                      {new Date(h.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="text-[12px] font-bold text-[#00DFA9] tabular-nums">
                    +{parseFloat(h.points).toFixed(1)} pts
                  </span>
                  <ChevronRight className="h-3 w-3 text-[#334155]" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
