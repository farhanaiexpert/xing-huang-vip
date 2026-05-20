import { useState, useEffect, useRef } from 'react';
import { Zap, Clock } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { formatOdds } from '../lib/oddsFormat';

interface FlashOdd {
  id: string;
  match: string;
  league: string;
  market: string;
  selectionName: string;
  selectionType: string;
  originalOdds: number;
  boostedOdds: number;
  initialSeconds: number;
  accent: string;
}

const FLASH_DATA: FlashOdd[] = [
  {
    id: 'fo1', match: 'Arsenal vs Chelsea',      league: 'Premier League',
    market: 'Match Result',     selectionName: 'Arsenal Win', selectionType: '1',
    originalOdds: 2.10, boostedOdds: 3.50, initialSeconds: 527, accent: '#00DFA9',
  },
  {
    id: 'fo2', match: 'Man City vs Liverpool',   league: 'Premier League',
    market: 'Both Teams to Score', selectionName: 'Yes', selectionType: '1',
    originalOdds: 1.80, boostedOdds: 2.80, initialSeconds: 202, accent: '#FACC15',
  },
  {
    id: 'fo3', match: 'Real Madrid vs Atlético', league: 'La Liga',
    market: 'Goals',             selectionName: 'Over 2.5',   selectionType: '1',
    originalOdds: 1.65, boostedOdds: 2.40, initialSeconds: 375, accent: '#38BDF8',
  },
  {
    id: 'fo4', match: 'Bayern vs Dortmund',      league: 'Bundesliga',
    market: 'BTTS & Win',        selectionName: 'BTTS + Home', selectionType: '1',
    originalOdds: 3.20, boostedOdds: 5.00, initialSeconds: 105, accent: '#F97316',
  },
  {
    id: 'fo5', match: 'PSG vs Lyon',             league: 'Ligue 1',
    market: 'Correct Score',     selectionName: 'PSG 2-1',    selectionType: '1',
    originalOdds: 8.00, boostedOdds: 14.00, initialSeconds: 570, accent: '#A78BFA',
  },
];

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function FlashOdds() {
  const { addSelection, hasSelection, removeSelection } = useBetSlip();
  const { format } = useOddsFormat();
  const [timers, setTimers] = useState<Record<string, number>>(
    () => Object.fromEntries(FLASH_DATA.map(f => [f.id, f.initialSeconds]))
  );
  const [expired, setExpired] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const next = { ...prev };
        const expiredNow: string[] = [];
        for (const id in next) {
          next[id] = Math.max(0, next[id] - 1);
          if (next[id] === 0) expiredNow.push(id);
        }
        if (expiredNow.length > 0) {
          setExpired(e => {
            const n = { ...e };
            expiredNow.forEach(id => { n[id] = true; });
            return n;
          });
          // Reset expired timers after 3s
          setTimeout(() => {
            setExpired(e => {
              const n = { ...e };
              expiredNow.forEach(id => { delete n[id]; });
              return n;
            });
            setTimers(prev2 => {
              const n2 = { ...prev2 };
              expiredNow.forEach(id => { n2[id] = 300 + Math.floor(Math.random() * 360); });
              return n2;
            });
          }, 3000);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function handleClick(flash: FlashOdd) {
    if (expired[flash.id]) return;
    const sel = {
      id: flash.id,
      marketId: `flash-${flash.id}`,
      matchId: `flash-match-${flash.id}`,
      matchName: flash.match,
      leagueName: flash.league,
      marketName: flash.market,
      selectionType: flash.selectionType,
      selectionName: flash.selectionName,
      odds: flash.boostedOdds,
    };
    if (hasSelection(flash.id)) {
      removeSelection(flash.id);
    } else {
      addSelection(sel);
    }
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FACC15]/10 border border-[#FACC15]/25">
            <Zap className="h-3 w-3 text-[#FACC15]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FACC15]">Flash Odds</span>
          </div>
          <span className="text-[10px] text-[#94A3B8]/40">Boosted prices · limited time</span>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-2">
          {FLASH_DATA.map(flash => {
            const secs = timers[flash.id] ?? flash.initialSeconds;
            const isExpired = expired[flash.id] ?? false;
            const isUrgent = !isExpired && secs < 120;
            const isSelected = hasSelection(flash.id);

            return (
              <button
                key={flash.id}
                onClick={() => handleClick(flash)}
                disabled={isExpired}
                className={cn(
                  'w-[200px] shrink-0 rounded-xl text-left transition-all duration-200 overflow-hidden border',
                  'bg-[#18212B] hover:-translate-y-0.5 active:scale-[0.98]',
                  isSelected
                    ? 'border-current ring-1'
                    : 'border-[#253241] hover:border-opacity-60',
                  isExpired && 'opacity-40 cursor-not-allowed',
                )}
                style={{
                  borderColor: isSelected ? flash.accent : undefined,
                  ...(isSelected ? { boxShadow: `0 0 16px ${flash.accent}30` } : {}),
                }}
              >
                <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${flash.accent}, transparent)` }} />
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]/50 truncate">{flash.league}</span>
                    <div
                      className={cn(
                        'flex items-center gap-1 text-[9px] font-bold tabular-nums shrink-0',
                        isUrgent ? 'text-[#EF4444]' : 'text-[#94A3B8]/40',
                        isUrgent && 'animate-pulse'
                      )}
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {isExpired ? 'EXPIRED' : fmt(secs)}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-[#F8FAFC] leading-snug line-clamp-1">{flash.match}</p>
                    <p className="text-[10px] text-[#94A3B8]/60 mt-0.5 line-clamp-1">{flash.selectionName}</p>
                  </div>

                  <div className="flex items-end justify-between pt-1 border-t border-[#253241]">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        <Zap className="h-2.5 w-2.5" style={{ color: flash.accent }} />
                        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: flash.accent }}>Boost</span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] text-[#94A3B8]/35 line-through tabular-nums">
                        {formatOdds(flash.originalOdds, format)}
                      </span>
                      <span className="text-lg font-black tabular-nums leading-none" style={{ color: flash.accent }}>
                        {formatOdds(flash.boostedOdds, format)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
