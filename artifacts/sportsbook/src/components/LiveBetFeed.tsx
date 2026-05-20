import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface BetEntry {
  id: string;
  userId: string;
  amount: number;
  match: string;
  selection: string;
  odds: number;
  sport: string;
  ts: number; // ms since epoch
  size: 'small' | 'medium' | 'big' | 'whale';
}

const MATCHES = [
  { match: 'Arsenal vs Chelsea',        sel: 'Arsenal Win',       odds: 3.50, sport: '⚽' },
  { match: 'Man City vs Liverpool',     sel: 'Over 2.5 Goals',    odds: 1.82, sport: '⚽' },
  { match: 'Real Madrid vs Atlético',   sel: 'Real Madrid Win',   odds: 2.10, sport: '⚽' },
  { match: 'Bayern vs Dortmund',        sel: 'BTTS Yes',          odds: 1.72, sport: '⚽' },
  { match: 'PSG vs Lyon',               sel: 'PSG Win',           odds: 1.55, sport: '⚽' },
  { match: 'Barcelona vs Sevilla',      sel: 'Barcelona -1',      odds: 1.95, sport: '⚽' },
  { match: 'Djokovic vs Alcaraz',       sel: 'Djokovic Win',      odds: 2.30, sport: '🎾' },
  { match: 'Sinner vs Medvedev',        sel: 'Sinner Win',        odds: 1.65, sport: '🎾' },
  { match: 'Lakers vs Celtics',         sel: 'Lakers -3.5',       odds: 1.91, sport: '🏀' },
  { match: 'Warriors vs Heat',          sel: 'Over 218.5 Pts',    odds: 1.88, sport: '🏀' },
  { match: 'Nuggets vs Knicks',         sel: 'Nuggets Win',       odds: 2.05, sport: '🏀' },
  { match: 'Verstappen – Race Win',     sel: 'Verstappen',        odds: 2.60, sport: '🏎️' },
  { match: 'Man Utd vs Newcastle',      sel: 'Draw',              odds: 3.40, sport: '⚽' },
  { match: 'Inter vs AC Milan',         sel: 'Inter Win',         odds: 2.20, sport: '⚽' },
  { match: 'Juventus vs Roma',          sel: 'Juventus Win',      odds: 1.80, sport: '⚽' },
  { match: 'Tottenham vs Aston Villa',  sel: 'Both Teams Score',  odds: 1.75, sport: '⚽' },
];

const AMOUNTS = [
  15, 25, 50, 75, 100, 150, 200, 250, 300, 400,
  500, 600, 750, 1000, 1250, 1500, 2000, 3000, 5000, 10000,
];

function sizeOf(amount: number): BetEntry['size'] {
  if (amount >= 5000) return 'whale';
  if (amount >= 1000) return 'big';
  if (amount >= 300)  return 'medium';
  return 'small';
}

function randomBet(): BetEntry {
  const m   = MATCHES[Math.floor(Math.random() * MATCHES.length)];
  const raw = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
  // Skew toward smaller amounts, occasionally big
  const amount = Math.random() < 0.12 ? raw * (2 + Math.floor(Math.random() * 3)) : raw;
  return {
    id:        Math.random().toString(36).slice(2, 10),
    userId:    String(Math.floor(1000 + Math.random() * 9000)),
    amount,
    match:     m.match,
    selection: m.sel,
    odds:      m.odds,
    sport:     m.sport,
    ts:        Date.now(),
    size:      sizeOf(amount),
  };
}

const SEED: BetEntry[] = Array.from({ length: 12 }, (_, i) => ({
  ...randomBet(),
  ts: Date.now() - (i + 1) * 18_000,
}));

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

const SIZE_STYLES: Record<BetEntry['size'], { badge: string; amount: string; ring: string }> = {
  small:  { badge: '',                                        amount: 'text-[#94A3B8]',   ring: '' },
  medium: { badge: '',                                        amount: 'text-[#F8FAFC]',   ring: '' },
  big:    { badge: 'bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/20', amount: 'text-[#FACC15]',   ring: 'ring-1 ring-[#FACC15]/15' },
  whale:  { badge: 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20', amount: 'text-[#EF4444]',   ring: 'ring-1 ring-[#EF4444]/20' },
};

const SIZE_LABELS: Record<BetEntry['size'], string> = {
  small:  '',
  medium: '',
  big:    '🔥 BIG',
  whale:  '🐋 WHALE',
};

export function LiveBetFeed() {
  const [bets, setBets] = useState<BetEntry[]>(SEED);
  const [newId, setNewId] = useState<string | null>(null);
  const [, forceTime] = useState(0);

  // New bet slides in every 2.5–6 s
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function tick() {
      const bet = randomBet();
      setBets(prev => [bet, ...prev.slice(0, 14)]);
      setNewId(bet.id);
      setTimeout(() => setNewId(null), 600);
      timeout = setTimeout(tick, 2500 + Math.random() * 3500);
    }
    timeout = setTimeout(tick, 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Refresh timestamps every 15 s
  useEffect(() => {
    const id = setInterval(() => forceTime(t => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden border border-[#1E2A38]"
      style={{ background: '#0B0F14' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-[#1A2535]"
        style={{ background: 'linear-gradient(90deg, #0D1520, #0B0F14)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00DFA9] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00DFA9]" />
            </span>
            <Activity className="h-3.5 w-3.5 text-[#00DFA9]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#00DFA9]">Live Bet Feed</span>
          </div>
          <span className="text-[10px] text-[#94A3B8]/40">Platform-wide activity</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#00DFA9]/8 border border-[#00DFA9]/15">
          <span className="text-[9px] font-bold text-[#00DFA9]/70 uppercase tracking-wider">
            {bets.length} recent
          </span>
        </div>
      </div>

      {/* Bet list */}
      <div className="overflow-hidden">
        {bets.map((bet, i) => {
          const st = SIZE_STYLES[bet.size];
          const label = SIZE_LABELS[bet.size];
          const isNew = bet.id === newId;
          return (
            <div
              key={bet.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2 border-b border-[#1A2535]/60 transition-all duration-500',
                isNew && 'bg-[#00DFA9]/5',
                i === 0 && !isNew && 'bg-transparent',
                st.ring,
              )}
              style={{
                transform: isNew ? 'translateY(0)' : undefined,
                opacity: isNew ? 1 : Math.max(0.35, 1 - i * 0.055),
              }}
            >
              {/* Sport emoji */}
              <span className="text-base shrink-0 w-5 text-center leading-none">{bet.sport}</span>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-[#94A3B8]">
                    User <span className="text-[#CBD5E1] font-bold">…{bet.userId}</span>
                  </span>
                  <span className="text-[10px] text-[#94A3B8]/40">bet</span>
                  <span className={cn('text-[12px] font-black tabular-nums', st.amount)}>
                    {bet.amount.toLocaleString()} USDT
                  </span>
                  {label && (
                    <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded', st.badge)}>
                      {label}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#94A3B8]/55 leading-tight truncate">
                  {bet.match} · <span className="text-[#F8FAFC]/60">{bet.selection}</span> @ <span className="text-[#FACC15]/80 font-bold">{bet.odds}</span>
                </p>
              </div>

              {/* Timestamp */}
              <span className="shrink-0 text-[9px] text-[#94A3B8]/30 tabular-nums whitespace-nowrap">
                {timeAgo(bet.ts)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
