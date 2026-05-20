import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';
import { Trophy, Users, Target, Clock, CheckCircle2, ChevronRight, Star, TrendingUp, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PoolOption { id: string; label: string; votes: number; }
interface Pool {
  id: string; category: Category; sport: string; sportEmoji: string;
  question: string; options: PoolOption[]; totalPicks: number;
  closesLabel: string; closesUrgent: boolean;
  accent: string; prizePool: string; status: 'open' | 'settled';
  winnerOptionId?: string;
}
type Category = 'All' | 'Football' | 'Basketball' | 'Tennis' | 'Special' | 'Settled';

// ─── Data ─────────────────────────────────────────────────────────────────────
const POOLS: Pool[] = [
  {
    id: 'ucl-winner', category: 'Football', sport: 'Champions League', sportEmoji: '⭐',
    question: 'Who wins UEFA Champions League 2025/26?',
    options: [
      { id: 'mancity',  label: 'Man City',    votes: 2860 },
      { id: 'real',     label: 'Real Madrid', votes: 2352 },
      { id: 'bayern',   label: 'Bayern',      votes: 1512 },
      { id: 'arsenal',  label: 'Arsenal',     votes: 1008 },
      { id: 'other',    label: 'Other',       votes: 672  },
    ],
    totalPicks: 8404, closesLabel: '3d 14h', closesUrgent: false,
    accent: '#00DFA9', prizePool: '$2,500', status: 'open',
  },
  {
    id: 'pl-scorer', category: 'Football', sport: 'Premier League', sportEmoji: '⚽',
    question: 'Premier League Top Scorer 2025/26?',
    options: [
      { id: 'haaland', label: 'Erling Haaland',    votes: 2395 },
      { id: 'palmer',  label: 'Cole Palmer',       votes: 1283 },
      { id: 'isak',    label: 'Alexander Isak',    votes: 1050 },
      { id: 'saka',    label: 'Bukayo Saka',       votes: 700  },
      { id: 'other',   label: 'Other',             votes: 409  },
    ],
    totalPicks: 5837, closesLabel: '5d 2h', closesUrgent: false,
    accent: '#38BDF8', prizePool: '$1,000', status: 'open',
  },
  {
    id: 'world-cup', category: 'Football', sport: 'FIFA World Cup 2026', sportEmoji: '🏆',
    question: 'Who wins the 2026 FIFA World Cup?',
    options: [
      { id: 'brazil',    label: 'Brazil',    votes: 6011 },
      { id: 'france',    label: 'France',    votes: 5083 },
      { id: 'england',   label: 'England',   votes: 4161 },
      { id: 'argentina', label: 'Argentina', votes: 3931 },
      { id: 'germany',   label: 'Germany',   votes: 2774 },
      { id: 'other',     label: 'Other',     votes: 1158 },
    ],
    totalPicks: 23118, closesLabel: '120d', closesUrgent: false,
    accent: '#FACC15', prizePool: '$10,000', status: 'open',
  },
  {
    id: 'nba-mvp', category: 'Basketball', sport: 'NBA 2025/26', sportEmoji: '🏀',
    question: 'NBA MVP Award 2025/26?',
    options: [
      { id: 'jokic',   label: 'Nikola Jokić',             votes: 3951 },
      { id: 'luka',    label: 'Luka Dončić',              votes: 3277 },
      { id: 'sga',     label: 'Shai Gilgeous-Alexander',  votes: 2377 },
      { id: 'giannis', label: 'Giannis Antetokounmpo',    votes: 1696 },
    ],
    totalPicks: 11301, closesLabel: '28d', closesUrgent: false,
    accent: '#F97316', prizePool: '$3,000', status: 'open',
  },
  {
    id: 'wimbledon', category: 'Tennis', sport: 'Wimbledon 2026', sportEmoji: '🎾',
    question: "Wimbledon 2026 Men's Singles Champion?",
    options: [
      { id: 'alcaraz',  label: 'Carlos Alcaraz',   votes: 2327 },
      { id: 'sinner',   label: 'Jannik Sinner',    votes: 1715 },
      { id: 'djokovic', label: 'Novak Djokovic',   votes: 1350 },
      { id: 'other',    label: 'Other',            votes: 735  },
    ],
    totalPicks: 6127, closesLabel: '45d', closesUrgent: false,
    accent: '#A78BFA', prizePool: '$1,500', status: 'open',
  },
  {
    id: 'euros-winner', category: 'Special', sport: 'Euro 2024 — SETTLED', sportEmoji: '🏅',
    question: 'Who won UEFA Euro 2024?',
    options: [
      { id: 'spain',   label: 'Spain',   votes: 8041 },
      { id: 'england', label: 'England', votes: 7213 },
      { id: 'france',  label: 'France',  votes: 4108 },
      { id: 'germany', label: 'Germany', votes: 3309 },
      { id: 'other',   label: 'Other',   votes: 1811 },
    ],
    totalPicks: 24482, closesLabel: 'Settled', closesUrgent: false,
    accent: '#00DFA9', prizePool: '$5,000', status: 'settled', winnerOptionId: 'spain',
  },
  {
    id: 'el-final', category: 'Settled', sport: 'Europa League — SETTLED', sportEmoji: '🥈',
    question: 'Who won the Europa League Final 2024/25?',
    options: [
      { id: 'manu',  label: 'Man United', votes: 5201 },
      { id: 'atalanta', label: 'Atalanta', votes: 4320 },
      { id: 'roma',  label: 'Roma',       votes: 2108 },
      { id: 'other', label: 'Other',      votes: 980  },
    ],
    totalPicks: 12609, closesLabel: 'Settled', closesUrgent: false,
    accent: '#F97316', prizePool: '$2,000', status: 'settled', winnerOptionId: 'atalanta',
  },
];

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const LEADERBOARD = [
  { rank: 1, name: 'CryptoKing88',  correct: 12, total: 14, winnings: '$1,250', badge: '🥇' },
  { rank: 2, name: 'BetWizard',     correct: 11, total: 14, winnings: '$840',   badge: '🥈' },
  { rank: 3, name: 'OddsHacker',    correct: 10, total: 13, winnings: '$620',   badge: '🥉' },
  { rank: 4, name: 'SharpeValue',   correct: 10, total: 14, winnings: '$420',   badge: null },
  { rank: 5, name: 'LuckyStreak7',  correct: 9,  total: 14, winnings: '$310',   badge: null },
  { rank: 6, name: 'TipsterPro',    correct: 9,  total: 13, winnings: '$290',   badge: null },
  { rank: 7, name: 'GreenArrow',    correct: 8,  total: 12, winnings: '$210',   badge: null },
  { rank: 8, name: 'BullsEye99',    correct: 8,  total: 14, winnings: '$180',   badge: null },
];

const CATEGORIES: Category[] = ['All', 'Football', 'Basketball', 'Tennis', 'Special', 'Settled'];
const LS_KEY = 'gobet_predictions_v1';

// ─── PoolCard ─────────────────────────────────────────────────────────────────
function PoolCard({ pool, userPick, onPick }: {
  pool: Pool;
  userPick: string | null;
  onPick: (poolId: string, optionId: string) => void;
}) {
  const totalVotes = pool.options.reduce((s, o) => s + o.votes, 0) + (userPick ? 1 : 0);

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl bg-[#121821] border transition-all duration-200 overflow-hidden',
        pool.status === 'settled' ? 'border-[#253241] opacity-80' : 'border-[#253241] hover:border-opacity-70',
      )}
      style={pool.status === 'open' ? { boxShadow: `0 0 0 1px ${pool.accent}12 inset` } : undefined}
    >
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${pool.accent}, transparent 70%)` }} />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">{pool.sportEmoji}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/45">{pool.sport}</span>
              {pool.status === 'settled' && (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#94A3B8]/10 text-[#94A3B8]/50">Settled</span>
              )}
            </div>
            <h3 className="text-sm font-black text-[#F8FAFC] leading-snug">{pool.question}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black" style={{ color: pool.accent }}>{pool.prizePool}</p>
            <p className="text-[9px] text-[#94A3B8]/40">prize pool</p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2 flex-1">
          {pool.options.map(option => {
            const myVotes = option.votes + (userPick === option.id ? 1 : 0);
            const pct = totalVotes > 0 ? Math.round((myVotes / totalVotes) * 100) : 0;
            const isPicked = userPick === option.id;
            const isWinner = pool.status === 'settled' && pool.winnerOptionId === option.id;
            const isWrongPick = pool.status === 'settled' && isPicked && !isWinner;

            return (
              <button
                key={option.id}
                onClick={() => pool.status === 'open' && onPick(pool.id, option.id)}
                disabled={pool.status === 'settled'}
                className={cn(
                  'w-full relative rounded-lg overflow-hidden transition-all duration-200 text-left',
                  pool.status === 'open' ? 'cursor-pointer hover:opacity-90 active:scale-[0.99]' : 'cursor-default',
                  isPicked ? 'ring-1' : '',
                )}
                style={isPicked ? { ringColor: pool.accent } : undefined}
              >
                {/* Vote fill bar */}
                <div
                  className="absolute inset-0 rounded-lg transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: isWinner
                      ? `${pool.accent}25`
                      : isPicked
                        ? `${pool.accent}18`
                        : 'rgba(37,50,65,0.5)',
                  }}
                />
                <div
                  className={cn(
                    'relative flex items-center justify-between px-3 py-2 border rounded-lg transition-all duration-200',
                    isPicked ? 'border-current' : isWinner ? 'border-current' : 'border-transparent',
                    isWrongPick ? 'opacity-50' : '',
                  )}
                  style={{
                    borderColor: isWinner ? pool.accent : isPicked ? pool.accent : 'transparent',
                    background: isWinner || isPicked ? 'transparent' : 'rgba(18,24,33,0.8)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {(isPicked || isWinner) && (
                      <CheckCircle2
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isWinner ? pool.accent : pool.accent }}
                      />
                    )}
                    <span className={cn(
                      'text-[12px] font-semibold truncate',
                      isWinner ? 'font-black' : '',
                    )}
                      style={{ color: isWinner ? pool.accent : isPicked ? pool.accent : '#F8FAFC' }}
                    >
                      {option.label}
                      {isWinner && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest opacity-70">Winner</span>}
                    </span>
                  </div>
                  <span className="text-[11px] font-black tabular-nums shrink-0 ml-2"
                    style={{ color: isWinner ? pool.accent : isPicked ? pool.accent : '#94A3B8' }}
                  >
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-[#253241]">
          <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]/40">
            <Users className="h-3 w-3" />
            <span>{pool.totalPicks.toLocaleString()} picks</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]" style={{
            color: pool.closesUrgent ? '#EF4444' : '#94A3B8',
            opacity: pool.status === 'settled' ? 0.4 : pool.closesUrgent ? 1 : 0.4,
          }}>
            <Clock className="h-3 w-3" />
            <span>{pool.status === 'settled' ? 'Closed' : `Closes in ${pool.closesLabel}`}</span>
          </div>
        </div>

        {userPick && pool.status === 'open' && (
          <div
            className="rounded-lg px-3 py-1.5 text-[10px] font-semibold flex items-center gap-1.5"
            style={{ background: `${pool.accent}12`, color: pool.accent, border: `1px solid ${pool.accent}25` }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Your pick is in! Results announced when the event closes.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function PredictionPools() {
  const [active, setActive] = useState<Category>('All');
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}'); }
    catch { return {}; }
  });
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(picks));
  }, [picks]);

  function handlePick(poolId: string, optionId: string) {
    setPicks(prev => {
      if (prev[poolId] === optionId) return prev;
      const pool = POOLS.find(p => p.id === poolId);
      const option = pool?.options.find(o => o.id === optionId);
      toast({
        title: 'Prediction locked in! 🎯',
        description: `You picked "${option?.label}" for "${pool?.question}"`,
      });
      return { ...prev, [poolId]: optionId };
    });
  }

  const totalUserPicks = Object.keys(picks).length;
  const totalPrizePool = POOLS
    .filter(p => p.status === 'open')
    .reduce((s, p) => s + parseFloat(p.prizePool.replace('$', '').replace(',', '')), 0);

  const visible = active === 'All'
    ? POOLS.filter(p => p.status === 'open')
    : active === 'Settled'
      ? POOLS.filter(p => p.status === 'settled')
      : POOLS.filter(p => p.category === active && p.status === 'open');

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-14 xl:pb-0">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-[#121821] border border-[#253241]">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 75% 40%, #00DFA9 0%, transparent 60%), radial-gradient(ellipse at 15% 80%, #38BDF8 0%, transparent 55%)' }}
          />
          <div className="relative px-8 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-[#00DFA9]/15 border border-[#00DFA9]/30 px-3 py-1 rounded-full text-[10px] font-bold text-[#00DFA9] uppercase tracking-widest mb-3">
                  <Target className="h-3 w-3" /> Free to Play
                </div>
                <h1 className="text-3xl font-black tracking-tight">Prediction Pools</h1>
                <p className="text-[#94A3B8]/70 text-sm mt-1.5 max-w-sm">
                  Pick winners, beat the community, and claim your share of the prize pool — no stake required.
                </p>
              </div>
              <div className="flex gap-5 sm:gap-8 shrink-0">
                <div className="text-center">
                  <p className="text-2xl font-black text-[#00DFA9]">${totalPrizePool.toLocaleString()}</p>
                  <p className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider mt-0.5">Total prizes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-[#F8FAFC]">{POOLS.filter(p => p.status === 'open').length}</p>
                  <p className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider mt-0.5">Open pools</p>
                </div>
                {totalUserPicks > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-black text-[#FACC15]">{totalUserPicks}</p>
                    <p className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider mt-0.5">Your picks</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats strip */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: <Users className="h-3.5 w-3.5" />, label: 'Community picks', value: '84,290+' },
                { icon: <Trophy className="h-3.5 w-3.5" />, label: 'Winners paid out', value: '1,204' },
                { icon: <Star className="h-3.5 w-3.5" />, label: 'Accuracy record', value: '78%' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3 rounded-xl bg-[#0B0F14]/60 border border-[#253241] px-4 py-3">
                  <span className="text-[#00DFA9]">{s.icon}</span>
                  <div>
                    <p className="text-sm font-black text-[#F8FAFC]">{s.value}</p>
                    <p className="text-[10px] text-[#94A3B8]/50">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {CATEGORIES.map(cat => (
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

        {/* Pool grid */}
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map(pool => (
              <PoolCard
                key={pool.id}
                pool={pool}
                userPick={picks[pool.id] ?? null}
                onPick={handlePick}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#253241]/50 flex items-center justify-center">
              <Target className="h-6 w-6 text-[#94A3B8]/30" />
            </div>
            <p className="text-sm text-[#94A3B8]/50">No pools in this category right now</p>
          </div>
        )}

        {/* Leaderboard */}
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="h-4 w-4 text-[#F97316]" />
            <h2 className="text-base font-black text-[#F8FAFC]">Top Predictors</h2>
            <span className="text-[10px] text-[#94A3B8]/40 ml-1">· All-time leaderboard</span>
          </div>

          <div className="rounded-2xl bg-[#121821] border border-[#253241] overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_80px_80px_90px] gap-0 px-4 py-2.5 border-b border-[#253241]">
              {['#', 'Player', 'Correct', 'Total', 'Winnings'].map(h => (
                <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/35">{h}</span>
              ))}
            </div>
            {LEADERBOARD.map((entry, i) => {
              const accuracy = Math.round((entry.correct / entry.total) * 100);
              return (
                <div
                  key={entry.rank}
                  className={cn(
                    'grid grid-cols-[40px_1fr_80px_80px_90px] items-center gap-0 px-4 py-3 transition-colors',
                    i < LEADERBOARD.length - 1 ? 'border-b border-[#253241]/50' : '',
                    i < 3 ? 'bg-[#00DFA9]/[0.02]' : 'hover:bg-[#253241]/20',
                  )}
                >
                  <span className="text-sm font-black">
                    {entry.badge ?? <span className="text-[12px] font-bold text-[#94A3B8]/50">{entry.rank}</span>}
                  </span>
                  <span className="text-sm font-semibold text-[#F8FAFC] truncate pr-2">{entry.name}</span>
                  <span className="text-sm font-bold text-[#00DFA9]">{entry.correct}</span>
                  <div>
                    <span className="text-sm font-semibold text-[#94A3B8]/70">{entry.total}</span>
                    <span className="ml-1.5 text-[10px] text-[#94A3B8]/35">{accuracy}%</span>
                  </div>
                  <span className="text-sm font-black text-[#FACC15]">{entry.winnings}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-10 rounded-2xl bg-[#121821] border border-[#253241] p-6">
          <h3 className="text-sm font-black text-[#F8FAFC] mb-4">How Prediction Pools Work</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '01', title: 'Pick your winner', desc: 'Select one outcome in any open pool. No stake or wallet needed — completely free to enter.', color: '#00DFA9' },
              { step: '02', title: 'Watch the odds move', desc: 'See how the community votes shift as the event approaches. The vote bars update in real time.', color: '#38BDF8' },
              { step: '03', title: 'Claim your prize', desc: 'Correct predictions share the prize pool proportionally. Winners are paid out within 24 h.', color: '#FACC15' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5"
                  style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                  {s.step}
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#F8FAFC]">{s.title}</p>
                  <p className="text-[11px] text-[#94A3B8]/55 leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
