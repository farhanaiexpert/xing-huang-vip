import { useState, useEffect } from 'react';
import { Activity, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface BetEntry {
  id: string;
  userId: string;
  amount: number;
  match: string;
  selection: string;
  odds: number;
  sport: string;
  ts: number;
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
  const m      = MATCHES[Math.floor(Math.random() * MATCHES.length)];
  const raw    = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
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

const SIZE_STYLES: Record<BetEntry['size'], { badge: string; amount: string; row: string }> = {
  small:  { badge: '',  amount: 'text-[#94A3B8]',  row: '' },
  medium: { badge: '',  amount: 'text-[#F8FAFC]',  row: '' },
  big:    { badge: 'bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/20', amount: 'text-[#FACC15]', row: 'bg-[#FACC15]/3' },
  whale:  { badge: 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20', amount: 'text-[#EF4444]', row: 'bg-[#EF4444]/3' },
};

const SIZE_LABELS: Record<BetEntry['size'], string> = {
  small:  '',
  medium: '',
  big:    '🔥 BIG',
  whale:  '🐋 WHALE',
};

export function LiveBetFeed() {
  const [bets,   setBets]   = useState<BetEntry[]>(SEED);
  const [newId,  setNewId]  = useState<string | null>(null);
  const [open,   setOpen]   = useState(false);
  const [ticker, setTicker] = useState(0); // for timestamp re-renders

  // New bet slides in every 2.5–6 s (runs regardless of open state)
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
    const id = setInterval(() => setTicker(t => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  // Count unseen bets while closed
  const latestBet = bets[0];

  return (
    <div className="mb-1">
      {/* ── Toggle trigger bar ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200 group',
          open
            ? 'rounded-b-none border-b-0 bg-[#0D1520] border-[#1E2F42]'
            : 'bg-[#0B1018] border-[#1A2535] hover:border-[#00DFA9]/30 hover:bg-[#0D1520]',
        )}
      >
        {/* Left: indicator + label */}
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00DFA9] opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00DFA9]" />
          </span>
          <Activity className="h-3.5 w-3.5 text-[#00DFA9]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#00DFA9]">Live Bet Feed</span>
          <span className="hidden sm:inline text-[10px] text-[#94A3B8]/40">Platform-wide activity</span>

          {/* Preview of latest bet while closed */}
          {!open && latestBet && (
            <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-[#1A2535]">
              <span className="text-sm leading-none">{latestBet.sport}</span>
              <span className="text-[10px] text-[#94A3B8]/50">
                User …{latestBet.userId} bet{' '}
                <span className={cn(
                  'font-bold',
                  latestBet.size === 'whale' ? 'text-[#EF4444]' :
                  latestBet.size === 'big'   ? 'text-[#FACC15]' : 'text-[#F8FAFC]/70',
                )}>
                  {latestBet.amount.toLocaleString()} USDT
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Right: count + chevron */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00DFA9]/8 border border-[#00DFA9]/15">
            <span className="text-[9px] font-bold text-[#00DFA9]/70 uppercase tracking-wider tabular-nums">
              {bets.length} bets
            </span>
          </div>
          <div
            className={cn(
              'w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200',
              open ? 'bg-[#00DFA9]/15 text-[#00DFA9]' : 'bg-[#1A2535] text-[#94A3B8]/50 group-hover:bg-[#00DFA9]/10 group-hover:text-[#00DFA9]/60',
            )}
          >
            {open
              ? <ChevronUp className="h-3 w-3" />
              : <ChevronDown className="h-3 w-3" />
            }
          </div>
        </div>
      </button>

      {/* ── Expandable feed panel ── */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          open ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div
          className="rounded-b-xl border border-t-0 border-[#1E2F42] overflow-hidden"
          style={{ background: '#0B0F14' }}
        >
          {/* Close bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#1A2535]/60" style={{ background: '#0D1520' }}>
            <span className="text-[9px] text-[#94A3B8]/35 uppercase tracking-wider font-bold">
              Showing {bets.length} most recent bets
            </span>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-[9px] text-[#94A3B8]/35 hover:text-[#94A3B8]/70 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
              Close
            </button>
          </div>

          {/* Bet rows */}
          <div className="overflow-y-auto max-h-[420px] scrollbar-thin">
            {bets.map((bet, i) => {
              const st    = SIZE_STYLES[bet.size];
              const label = SIZE_LABELS[bet.size];
              const isNew = bet.id === newId;
              // suppress unused variable warning
              void ticker;
              return (
                <div
                  key={bet.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 border-b border-[#1A2535]/50 transition-all duration-400',
                    isNew && 'bg-[#00DFA9]/5',
                    st.row,
                  )}
                  style={{ opacity: Math.max(0.30, 1 - i * 0.052) }}
                >
                  <span className="text-base shrink-0 w-5 text-center leading-none">{bet.sport}</span>

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
                    <p className="text-[10px] text-[#94A3B8]/50 leading-tight truncate">
                      {bet.match} · <span className="text-[#F8FAFC]/55">{bet.selection}</span> @ <span className="text-[#FACC15]/75 font-bold">{bet.odds}</span>
                    </p>
                  </div>

                  <span className="shrink-0 text-[9px] text-[#94A3B8]/28 tabular-nums whitespace-nowrap">
                    {timeAgo(bet.ts)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
