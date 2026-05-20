import { useState, useEffect } from 'react';
import { Zap, Clock, TrendingUp, RotateCcw } from 'lucide-react';
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
  profitTotal: string;   // shown when expired
  profitBettors: number; // shown when expired
}

const COOLDOWN_SECS = 30 * 60; // 30 minutes

const FLASH_DATA: FlashOdd[] = [
  {
    id: 'fo1', match: 'Arsenal vs Chelsea',      league: 'Premier League',
    market: 'Match Result',        selectionName: 'Arsenal Win',  selectionType: '1',
    originalOdds: 2.10, boostedOdds: 3.50, initialSeconds: 527,
    accent: '#00DFA9', profitTotal: '$18,420', profitBettors: 3_241,
  },
  {
    id: 'fo2', match: 'Man City vs Liverpool',   league: 'Premier League',
    market: 'Both Teams to Score', selectionName: 'Yes',          selectionType: '1',
    originalOdds: 1.80, boostedOdds: 2.80, initialSeconds: 202,
    accent: '#FACC15', profitTotal: '$9,870',  profitBettors: 2_108,
  },
  {
    id: 'fo3', match: 'Real Madrid vs Atlético', league: 'La Liga',
    market: 'Goals',               selectionName: 'Over 2.5',     selectionType: '1',
    originalOdds: 1.65, boostedOdds: 2.40, initialSeconds: 375,
    accent: '#38BDF8', profitTotal: '$6,150',  profitBettors: 1_587,
  },
  {
    id: 'fo4', match: 'Bayern vs Dortmund',      league: 'Bundesliga',
    market: 'BTTS & Win',          selectionName: 'BTTS + Home',  selectionType: '1',
    originalOdds: 3.20, boostedOdds: 5.00, initialSeconds: 105,
    accent: '#F97316', profitTotal: '$22,500', profitBettors: 4_012,
  },
  {
    id: 'fo5', match: 'PSG vs Lyon',             league: 'Ligue 1',
    market: 'Correct Score',       selectionName: 'PSG 2-1',      selectionType: '1',
    originalOdds: 8.00, boostedOdds: 14.00, initialSeconds: 570,
    accent: '#A78BFA', profitTotal: '$31,800', profitBettors: 5_620,
  },
];

function fmtCountdown(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function FlashOdds() {
  const { addSelection, hasSelection, removeSelection } = useBetSlip();
  const { format } = useOddsFormat();

  // Active countdown timers (seconds left on the boosted offer)
  const [timers, setTimers] = useState<Record<string, number>>(
    () => Object.fromEntries(FLASH_DATA.map(f => [f.id, f.initialSeconds]))
  );
  // Whether offer has expired (waiting for cooldown)
  const [expired, setExpired] = useState<Record<string, boolean>>({});
  // Cooldown timers — seconds until the offer is live again (starts at COOLDOWN_SECS)
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  useEffect(() => {
    const tick = setInterval(() => {
      // ── Tick active offer timers ──────────────────────────
      setTimers(prev => {
        const next = { ...prev };
        const nowExpired: string[] = [];
        for (const id in next) {
          if (next[id] > 0) {
            next[id] -= 1;
            if (next[id] === 0) nowExpired.push(id);
          }
        }
        if (nowExpired.length > 0) {
          setExpired(e => {
            const n = { ...e };
            nowExpired.forEach(id => { n[id] = true; });
            return n;
          });
          setCooldowns(c => {
            const n = { ...c };
            nowExpired.forEach(id => { n[id] = COOLDOWN_SECS; });
            return n;
          });
        }
        return next;
      });

      // ── Tick cooldown timers ──────────────────────────────
      setCooldowns(prev => {
        const next = { ...prev };
        const nowRevived: string[] = [];
        for (const id in next) {
          if (next[id] > 0) {
            next[id] -= 1;
            if (next[id] === 0) nowRevived.push(id);
          }
        }
        if (nowRevived.length > 0) {
          // Bring back to life
          setExpired(e => {
            const n = { ...e };
            nowRevived.forEach(id => { delete n[id]; });
            return n;
          });
          setTimers(t => {
            const n = { ...t };
            nowRevived.forEach(id => { n[id] = 300 + Math.floor(Math.random() * 360); });
            return n;
          });
          nowRevived.forEach(id => { delete next[id]; });
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(tick);
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
    if (hasSelection(flash.id)) removeSelection(flash.id);
    else addSelection(sel);
  }

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FACC15]/10 border border-[#FACC15]/25">
          <Zap className="h-3 w-3 text-[#FACC15]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FACC15]">Flash Odds</span>
        </div>
        <span className="text-[10px] text-[#94A3B8]/40">Boosted prices · limited time</span>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-2">
          {FLASH_DATA.map(flash => {
            const secs       = timers[flash.id]   ?? flash.initialSeconds;
            const cooldown   = cooldowns[flash.id] ?? 0;
            const isExpired  = expired[flash.id]   ?? false;
            const isUrgent   = !isExpired && secs < 120;
            const isSelected = hasSelection(flash.id);

            return (
              <div
                key={flash.id}
                className={cn(
                  'w-[200px] shrink-0 rounded-xl overflow-hidden border transition-all duration-300',
                  isExpired
                    ? 'bg-[#0D1117] border-[#1E2A38] cursor-default'
                    : cn(
                        'bg-[#18212B] border-[#253241] cursor-pointer',
                        'hover:-translate-y-0.5 active:scale-[0.98]',
                        isSelected && 'ring-1',
                      ),
                )}
                style={!isExpired && isSelected ? { borderColor: flash.accent, boxShadow: `0 0 16px ${flash.accent}30` } : undefined}
                onClick={() => !isExpired && handleClick(flash)}
              >
                {/* Top colour bar — grey when expired */}
                <div
                  className="h-[2px] w-full transition-all duration-500"
                  style={{ background: isExpired ? '#1E2A38' : `linear-gradient(90deg, ${flash.accent}, transparent)` }}
                />

                {isExpired ? (
                  /* ── EXPIRED STATE ─────────────────────────────── */
                  <div className="p-3 flex flex-col gap-2.5">
                    {/* Expired badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]/35 truncate">{flash.league}</span>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-[#475569]">
                        <Clock className="h-2.5 w-2.5" />
                        <span>Ended</span>
                      </div>
                    </div>

                    {/* Match name — muted */}
                    <div>
                      <p className="text-[11px] font-bold text-[#475569] leading-snug line-clamp-1">{flash.match}</p>
                      <p className="text-[10px] text-[#364556] mt-0.5 line-clamp-1">{flash.selectionName}</p>
                    </div>

                    {/* Profit callout */}
                    <div className="rounded-lg bg-[#0B1017] border border-[#1E2A38] p-2.5 flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-[#00DFA9]/70 shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-wide text-[#94A3B8]/40">Offer closed</span>
                      </div>
                      <p className="text-[13px] font-black text-[#00DFA9]/80 leading-none">{flash.profitTotal}</p>
                      <p className="text-[10px] text-[#94A3B8]/40 leading-tight">
                        profit made by {flash.profitBettors.toLocaleString()} bettors
                      </p>
                    </div>

                    {/* Cooldown countdown */}
                    <div className="flex items-center gap-1.5 pt-0.5 border-t border-[#1A2330]">
                      <RotateCcw className="h-3 w-3 text-[#475569] shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-[#475569] tabular-nums">
                          Back in {fmtCountdown(cooldown)}
                        </p>
                        <p className="text-[9px] text-[#364556] leading-none mt-0.5">Try next time!</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── ACTIVE STATE ──────────────────────────────── */
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]/50 truncate">{flash.league}</span>
                      <div className={cn(
                        'flex items-center gap-1 text-[9px] font-bold tabular-nums shrink-0',
                        isUrgent ? 'text-[#EF4444] animate-pulse' : 'text-[#94A3B8]/40',
                      )}>
                        <Clock className="h-2.5 w-2.5" />
                        {fmtCountdown(secs)}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-[#F8FAFC] leading-snug line-clamp-1">{flash.match}</p>
                      <p className="text-[10px] text-[#94A3B8]/60 mt-0.5 line-clamp-1">{flash.selectionName}</p>
                    </div>

                    <div className="flex items-end justify-between pt-1 border-t border-[#253241]">
                      <div className="flex items-center gap-0.5">
                        <Zap className="h-2.5 w-2.5" style={{ color: flash.accent }} />
                        <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: flash.accent }}>Boost</span>
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
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
