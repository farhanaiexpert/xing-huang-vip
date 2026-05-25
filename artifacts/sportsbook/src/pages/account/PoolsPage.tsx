import { useMemo } from 'react';
import { Link } from 'wouter';
import { Trophy, Target, ExternalLink, ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const LS_KEY_PICKS = 'gobet_predictions_v1';

interface PoolOption { id: string; label: string }
interface PoolInfo {
  id: string;
  question: string;
  sport: string;
  sportEmoji: string;
  accent: string;
  prizePool: string;
  status: 'open' | 'settled';
  winnerOptionId?: string;
  options: PoolOption[];
  closesLabel: string;
}

const ALL_POOLS: PoolInfo[] = [
  {
    id: 'ucl-winner', sport: 'Champions League', sportEmoji: '⭐', accent: '#00DFA9',
    question: 'Who wins UEFA Champions League 2026/27?', prizePool: '2,500 USDT', status: 'open', closesLabel: '3d 14h',
    options: [
      { id: 'mancity', label: 'Man City' }, { id: 'real', label: 'Real Madrid' },
      { id: 'bayern', label: 'Bayern' }, { id: 'arsenal', label: 'Arsenal' }, { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'pl-scorer', sport: 'Premier League', sportEmoji: '⚽', accent: '#38BDF8',
    question: 'Premier League Top Scorer 2026/27?', prizePool: '1,000 USDT', status: 'open', closesLabel: '5d 2h',
    options: [
      { id: 'haaland', label: 'Erling Haaland' }, { id: 'palmer', label: 'Cole Palmer' },
      { id: 'isak', label: 'Alexander Isak' }, { id: 'saka', label: 'Bukayo Saka' }, { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'world-cup', sport: 'FIFA World Cup 2026', sportEmoji: '🏆', accent: '#FACC15',
    question: 'Who wins the 2026 FIFA World Cup?', prizePool: '10,000 USDT', status: 'open', closesLabel: '120d',
    options: [
      { id: 'brazil', label: 'Brazil' }, { id: 'france', label: 'France' },
      { id: 'england', label: 'England' }, { id: 'argentina', label: 'Argentina' },
      { id: 'germany', label: 'Germany' }, { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'nba-mvp', sport: 'NBA 2026/27', sportEmoji: '🏀', accent: '#F97316',
    question: 'NBA MVP Award 2026/27?', prizePool: '3,000 USDT', status: 'open', closesLabel: '28d',
    options: [
      { id: 'jokic', label: 'Nikola Jokić' }, { id: 'luka', label: 'Luka Dončić' },
      { id: 'sga', label: 'Shai Gilgeous-Alexander' }, { id: 'giannis', label: 'Giannis Antetokounmpo' },
    ],
  },
  {
    id: 'wimbledon', sport: 'Wimbledon 2026', sportEmoji: '🎾', accent: '#A78BFA',
    question: "Wimbledon 2026 Men's Singles Champion?", prizePool: '1,500 USDT', status: 'open', closesLabel: '45d',
    options: [
      { id: 'alcaraz', label: 'Carlos Alcaraz' }, { id: 'sinner', label: 'Jannik Sinner' },
      { id: 'djokovic', label: 'Novak Djokovic' }, { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'euros-winner', sport: 'UEFA Euro 2024 — SETTLED', sportEmoji: '🏅', accent: '#00DFA9',
    question: 'Who won UEFA Euro 2024?', prizePool: '5,000 USDT', status: 'settled', winnerOptionId: 'spain', closesLabel: 'Settled',
    options: [
      { id: 'spain', label: 'Spain' }, { id: 'england', label: 'England' },
      { id: 'france', label: 'France' }, { id: 'germany', label: 'Germany' }, { id: 'other', label: 'Other' },
    ],
  },
  {
    id: 'el-final', sport: 'Europa League 2026 — SETTLED', sportEmoji: '🥈', accent: '#F97316',
    question: 'Who won the Europa League Final 2026?', prizePool: '2,000 USDT', status: 'settled', winnerOptionId: 'atalanta', closesLabel: 'Settled',
    options: [
      { id: 'manu', label: 'Man United' }, { id: 'atalanta', label: 'Atalanta' },
      { id: 'roma', label: 'Roma' }, { id: 'other', label: 'Other' },
    ],
  },
];

function getPickResult(pool: PoolInfo, pickedId: string): 'correct' | 'incorrect' | 'pending' {
  if (pool.status === 'open') return 'pending';
  if (!pool.winnerOptionId) return 'pending';
  return pickedId === pool.winnerOptionId ? 'correct' : 'incorrect';
}

export function PoolsPage() {
  const picks = useMemo<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_PICKS) ?? '{}'); }
    catch { return {}; }
  }, []);

  const myEntries = useMemo(() =>
    ALL_POOLS
      .filter(p => picks[p.id])
      .map(p => ({ pool: p, pickedId: picks[p.id], result: getPickResult(p, picks[p.id]) })),
    [picks]
  );

  const openEntries    = myEntries.filter(e => e.pool.status === 'open');
  const settledEntries = myEntries.filter(e => e.pool.status === 'settled');
  const correct        = settledEntries.filter(e => e.result === 'correct').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#F8FAFC]">My Pool Entries</h2>
        <Link href="/prediction-pools">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#00DFA9] border border-[#00DFA9]/25 bg-[#00DFA9]/6 hover:bg-[#00DFA9]/12 transition-all cursor-pointer">
            <Trophy className="h-3 w-3" />
            Browse Pools
            <ExternalLink className="h-2.5 w-2.5" />
          </div>
        </Link>
      </div>

      {myEntries.length === 0 ? (
        <div className="rounded-2xl border border-[#00DFA9]/15 p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #071A12 0%, #0B0F14 100%)' }}>
          <Trophy className="h-10 w-10 text-[#00DFA9]/30 mx-auto mb-3" />
          <p className="text-[14px] font-bold text-[#F8FAFC] mb-1.5">No predictions yet</p>
          <p className="text-[12px] text-[#64748B] mb-4 leading-relaxed">
            Join free prediction pools, pick winners,<br />and share real USDT prize pots.
          </p>
          <Link href="/prediction-pools">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}>
              <Target className="h-4 w-4" />
              Browse Open Pools
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Total Entries', value: myEntries.length,    color: '#38BDF8' },
              { label: 'Open',          value: openEntries.length,  color: '#FACC15' },
              { label: 'Correct',       value: correct,             color: '#00DFA9' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3.5 border border-white/[0.07] bg-[#0E1520] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1.5px]"
                  style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <p className="text-[20px] font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-[#64748B] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Open entries */}
          {openEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Active Predictions</p>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
                {openEntries.map(({ pool, pickedId }, i) => {
                  const option = pool.options.find(o => o.id === pickedId);
                  return (
                    <div key={pool.id} className={cn('flex items-center gap-3 px-4 py-3.5', i > 0 && 'border-t border-white/[0.04]')}>
                      <span className="text-xl shrink-0">{pool.sportEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#F8FAFC] line-clamp-1">{pool.question}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          Pick: <span style={{ color: pool.accent }} className="font-semibold">{option?.label ?? pickedId}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-[11px] font-bold text-[#FACC15]">{pool.prizePool}</p>
                        <div className="flex items-center gap-1 justify-end text-[10px] text-[#64748B]">
                          <Clock className="h-2.5 w-2.5" />
                          {pool.closesLabel}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settled entries */}
          {settledEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Settled Results</p>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
                {settledEntries.map(({ pool, pickedId, result }, i) => {
                  const option = pool.options.find(o => o.id === pickedId);
                  const winner = pool.options.find(o => o.id === pool.winnerOptionId);
                  return (
                    <div key={pool.id} className={cn('flex items-center gap-3 px-4 py-3.5', i > 0 && 'border-t border-white/[0.04]')}>
                      <span className="text-xl shrink-0">{pool.sportEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#F8FAFC] line-clamp-1">{pool.question}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          Your pick: <span className="font-semibold text-[#94A3B8]">{option?.label ?? pickedId}</span>
                          {result === 'incorrect' && winner && (
                            <span className="text-[#64748B]"> · Winner: <span className="text-[#00DFA9] font-semibold">{winner.label}</span></span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {result === 'correct' ? (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#00DFA9]/12 text-[#00DFA9] border border-[#00DFA9]/25">
                            <CheckCircle2 className="h-3 w-3" /> Correct!
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                            <XCircle className="h-3 w-3" /> Incorrect
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
