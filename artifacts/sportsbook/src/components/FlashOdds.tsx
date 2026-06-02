import { useState, useEffect } from 'react';
import { Zap, Clock, TrendingUp, RotateCcw, Flame } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { formatOdds } from '../lib/oddsFormat';

interface FlashOdd {
  id: string;
  match: string;
  league: string;
  sport: string;
  market: string;
  selectionName: string;
  selectionType: string;
  originalOdds: number;
  boostedOdds: number;
  initialSeconds: number;
  cooldownSecs: number;
  accent: string;
  profitTotal: string;
  profitBettors: number;
  hot?: boolean;
}

const FLASH_DATA: FlashOdd[] = [
  {
    id: 'fo1',
    match: 'Arsenal vs Chelsea', league: 'Premier League', sport: '⚽',
    market: 'Match Result', selectionName: 'Arsenal Win', selectionType: '1',
    originalOdds: 2.10, boostedOdds: 3.50, initialSeconds: 527,
    cooldownSecs: 10 * 60,
    accent: '#00DFA9', profitTotal: '18,420 USDT', profitBettors: 3_241, hot: true,
  },
  {
    id: 'fo2',
    match: 'Man City vs Liverpool', league: 'Premier League', sport: '⚽',
    market: 'Both Teams to Score', selectionName: 'Yes', selectionType: '1',
    originalOdds: 1.80, boostedOdds: 2.80, initialSeconds: 202,
    cooldownSecs: 15 * 60,
    accent: '#FACC15', profitTotal: '9,870 USDT', profitBettors: 2_108,
  },
  {
    id: 'fo3',
    match: 'Real Madrid vs Atlético', league: 'La Liga', sport: '⚽',
    market: 'Goals O/U', selectionName: 'Over 2.5', selectionType: '1',
    originalOdds: 1.65, boostedOdds: 2.40, initialSeconds: 375,
    cooldownSecs: 20 * 60,
    accent: '#38BDF8', profitTotal: '6,150 USDT', profitBettors: 1_587,
  },
  {
    id: 'fo4',
    match: 'Bayern vs Dortmund', league: 'Bundesliga', sport: '⚽',
    market: 'BTTS & Win', selectionName: 'BTTS + Home', selectionType: '1',
    originalOdds: 3.20, boostedOdds: 5.00, initialSeconds: 105,
    cooldownSecs: 25 * 60,
    accent: '#F97316', profitTotal: '22,500 USDT', profitBettors: 4_012, hot: true,
  },
  {
    id: 'fo5',
    match: 'PSG vs Lyon', league: 'Ligue 1', sport: '⚽',
    market: 'Correct Score', selectionName: 'PSG 2-1', selectionType: '1',
    originalOdds: 8.00, boostedOdds: 14.00, initialSeconds: 570,
    cooldownSecs: 30 * 60,
    accent: '#A78BFA', profitTotal: '31,800 USDT', profitBettors: 5_620,
  },
  {
    id: 'fo6',
    match: 'Djokovic vs Alcaraz', league: 'ATP Masters Rome', sport: '🎾',
    market: 'Match Winner', selectionName: 'Djokovic', selectionType: '1',
    originalOdds: 2.30, boostedOdds: 4.20, initialSeconds: 433,
    cooldownSecs: 10 * 60,
    accent: '#EF4444', profitTotal: '14,200 USDT', profitBettors: 2_890, hot: true,
  },
  {
    id: 'fo7',
    match: 'Lakers vs Celtics', league: 'NBA Playoffs', sport: '🏀',
    market: 'Spread', selectionName: 'Lakers -3.5', selectionType: '1',
    originalOdds: 1.90, boostedOdds: 3.10, initialSeconds: 318,
    cooldownSecs: 15 * 60,
    accent: '#FACC15', profitTotal: '8,640 USDT', profitBettors: 1_940,
  },
  {
    id: 'fo8',
    match: 'Verstappen – Win Race', league: 'Formula 1', sport: '🏎️',
    market: 'Race Winner', selectionName: 'Verstappen', selectionType: '1',
    originalOdds: 1.55, boostedOdds: 2.60, initialSeconds: 651,
    cooldownSecs: 20 * 60,
    accent: '#38BDF8', profitTotal: '11,350 USDT', profitBettors: 3_102,
  },
];

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtCooldownLabel(secs: number) {
  const mins = Math.round(secs / 60);
  if (mins >= 1) return `${mins} min`;
  return fmtTime(secs);
}

export function FlashOdds() {
  const { hasSelection, removeSelection } = useBetSlip();
  const { format } = useOddsFormat();

  const [timers, setTimers] = useState<Record<string, number>>(
    () => Object.fromEntries(FLASH_DATA.map(f => [f.id, f.initialSeconds]))
  );
  const [expired, setExpired] = useState<Record<string, boolean>>({});
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  useEffect(() => {
    const tick = setInterval(() => {
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
            nowExpired.forEach(id => {
              const flash = FLASH_DATA.find(f => f.id === id);
              n[id] = flash?.cooldownSecs ?? 30 * 60;
            });
            return n;
          });
        }
        return next;
      });

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
          setExpired(e => {
            const n = { ...e };
            nowRevived.forEach(id => { delete n[id]; });
            return n;
          });
          setTimers(t => {
            const n = { ...t };
            nowRevived.forEach(id => { n[id] = 300 + Math.floor(Math.random() * 400); });
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
    if (hasSelection(flash.id)) removeSelection(flash.id);
    // homeTeam, awayTeam, commenceTime required for settlement — unavailable in static promo data.
  }

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FACC15]/10 border border-[#FACC15]/30">
          <Zap className="h-3.5 w-3.5 text-[#FACC15]" fill="#FACC15" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#FACC15]">Flash Odds</span>
        </div>
        <span className="text-[10px] text-[#94A3B8]/40">Boosted prices · limited time only</span>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-2">
          {FLASH_DATA.map(flash => {
            const secs      = timers[flash.id]   ?? flash.initialSeconds;
            const cooldown  = cooldowns[flash.id] ?? 0;
            const isExpired = expired[flash.id]   ?? false;
            const isUrgent  = !isExpired && secs < 90;
            const isSelected = hasSelection(flash.id);
            const boostPct  = Math.round(((flash.boostedOdds - flash.originalOdds) / flash.originalOdds) * 100);

            return (
              <div
                key={flash.id}
                className={cn(
                  'w-[210px] shrink-0 rounded-2xl overflow-hidden border transition-all duration-300 select-none',
                  isExpired
                    ? 'bg-[#0C1118] border-[#1A2535] cursor-default'
                    : cn(
                        'cursor-pointer',
                        isSelected
                          ? 'border-transparent ring-2'
                          : 'border-[#253241] hover:border-opacity-80 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.97]',
                      ),
                )}
                style={
                  isExpired ? undefined :
                  isSelected
                    ? { background: `linear-gradient(145deg, #18212B, #0F1820)`, '--tw-ring-color': flash.accent, boxShadow: `0 0 24px ${flash.accent}40, inset 0 1px 0 ${flash.accent}20`, borderColor: flash.accent } as React.CSSProperties
                    : { background: 'linear-gradient(145deg, #18212B, #111922)', boxShadow: `0 4px 20px rgba(0,0,0,0.4)` }
                }
                onClick={() => !isExpired && handleClick(flash)}
              >
                {/* Coloured top bar */}
                <div
                  className="h-[3px] w-full"
                  style={{
                    background: isExpired
                      ? '#1A2535'
                      : `linear-gradient(90deg, ${flash.accent}, ${flash.accent}60, transparent)`,
                  }}
                />

                {isExpired ? (
                  /* ── EXPIRED STATE ─────────────────────────── */
                  <div className="p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{flash.sport}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#364556] truncate">{flash.league}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-semibold text-[#364556]">
                        <Clock className="h-2.5 w-2.5" />
                        Ended
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-[#364556] leading-snug line-clamp-1">{flash.match}</p>
                      <p className="text-[10px] text-[#283545] mt-0.5">{flash.selectionName}</p>
                    </div>

                    {/* Profit stat box */}
                    <div className="rounded-xl bg-[#0A0F16] border border-[#1A2535] p-2.5">
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="h-3 w-3 text-[#00DFA9]/50 shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-wide text-[#364556]">Offer closed</span>
                      </div>
                      <p className="text-[14px] font-black text-[#00DFA9]/70 leading-none">{flash.profitTotal}</p>
                      <p className="text-[10px] text-[#364556] mt-1 leading-tight">
                        won by {flash.profitBettors.toLocaleString()} bettors
                      </p>
                    </div>

                    {/* Cooldown */}
                    <div className="flex items-center gap-2 pt-0.5 border-t border-[#151F2C]">
                      <RotateCcw className="h-3 w-3 text-[#2D3D50] shrink-0 animate-spin [animation-duration:4s]" />
                      <div>
                        <p className="text-[10px] font-black text-[#2D3D50] tabular-nums leading-none">
                          Back in {fmtCooldownLabel(cooldown)}
                        </p>
                        <p className="text-[9px] text-[#1E2D3D] mt-0.5">Try next time!</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── ACTIVE STATE ──────────────────────────── */
                  <div className="p-3 flex flex-col gap-2.5">
                    {/* League + timer */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{flash.sport}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]/50 truncate">{flash.league}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {flash.hot && !isUrgent && (
                          <Flame className="h-3 w-3 text-[#F97316]" />
                        )}
                        <div className={cn(
                          'flex items-center gap-0.5 text-[10px] font-black tabular-nums',
                          isUrgent ? 'text-[#EF4444] animate-pulse' : 'text-[#94A3B8]/50',
                        )}>
                          <Clock className="h-2.5 w-2.5" />
                          {fmtTime(secs)}
                        </div>
                      </div>
                    </div>

                    {/* Match + selection */}
                    <div>
                      <p className="text-[12px] font-bold text-[#F8FAFC] leading-snug line-clamp-1">{flash.match}</p>
                      <p className="text-[11px] text-[#94A3B8]/70 mt-0.5 line-clamp-1">{flash.market} · {flash.selectionName}</p>
                    </div>

                    {/* Odds display */}
                    <div
                      className="rounded-xl p-2.5 flex items-center justify-between"
                      style={{ background: `${flash.accent}08`, border: `1px solid ${flash.accent}20` }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5" style={{ color: flash.accent }} fill={flash.accent} />
                          <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: flash.accent }}>
                            +{boostPct}% boost
                          </span>
                        </div>
                        <span className="text-[11px] text-[#94A3B8]/35 line-through tabular-nums">
                          {formatOdds(flash.originalOdds, format)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className="text-[28px] font-black tabular-nums leading-none"
                          style={{ color: flash.accent, textShadow: `0 0 20px ${flash.accent}60` }}
                        >
                          {formatOdds(flash.boostedOdds, format)}
                        </span>
                      </div>
                    </div>

                    {/* Tap hint */}
                    <p className="text-[9px] text-center font-medium text-[#94A3B8]/25">
                      {isSelected ? '✓ Added to bet slip' : 'Tap to add to slip'}
                    </p>
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
