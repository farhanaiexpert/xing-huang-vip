import { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { useBetSlip } from '../hooks/useBetSlip';
import { toast } from 'sonner';
import { useOddsSimulation, getMovement, getOddsDelta } from '../hooks/useOddsSimulation';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { formatOdds } from '../lib/oddsFormat';
import { playOddsAdd, playOddsRemove } from '../lib/oddsSound';
import { cn } from '../lib/utils';

interface OddsButtonProps {
  matchId: string;
  marketId: string;
  matchName: string;
  leagueName: string;
  marketName: string;
  selectionType: string;
  selectionName: string;
  odds: number;
  isLive?: boolean;
  className?: string;
  /** Full Odds API sport key, e.g. "soccer_epl" — used for settlement */
  sportKey?: string;
  /** Internal sport category (legacy, prefer sportKey) */
  sportId?: string;
  /** Formatted kickoff label, e.g. "Today, 20:00" — display only */
  kickoffTime?: string;
  /** ISO 8601 match start — sent to API for settlement timing */
  commenceTime?: string;
  /** Home team name — sent to API for settlement */
  homeTeam?: string;
  /** Away team name — sent to API for settlement */
  awayTeam?: string;
}

export function OddsButton({
  matchId, marketId, matchName, leagueName, marketName,
  selectionType, selectionName, odds, isLive = false, className,
  sportKey, sportId, kickoffTime, commenceTime, homeTeam, awayTeam,
}: OddsButtonProps) {
  const { addSelection, removeSelection, hasSelection, updateSelectionOdds } = useBetSlip();
  const { tick, suspendedMarketIds } = useOddsSimulation();
  const [isPulsing,  setIsPulsing]  = useState(false);
  const [flashDir,   setFlashDir]   = useState<'up' | 'down' | null>(null);
  const prevOddsRef = useRef<number | null>(null);
  const { format } = useOddsFormat();

  const selectionId  = `${marketId}-${selectionType}`;
  const isSelected   = hasSelection(selectionId);
  const isSuspended  = suspendedMarketIds.has(marketId);

  // Live odds simulation
  const movement    = isLive ? getMovement(selectionId, tick) : 'stable';
  const delta       = isLive ? getOddsDelta(selectionId, tick) : 0;
  const displayOdds = Math.max(1.01, odds + delta);

  // Flash the number whenever displayOdds actually changes;
  // also notify useBetSlip so it can detect drift for in-slip selections.
  useEffect(() => {
    if (!isLive) return undefined;
    const prev = prevOddsRef.current;
    if (prev !== null && prev !== displayOdds) {
      const dir = displayOdds > prev ? 'up' : 'down';
      setFlashDir(dir);
      const t = setTimeout(() => setFlashDir(null), 700);
      if (isSelected) updateSelectionOdds(selectionId, displayOdds);
      return () => clearTimeout(t);
    }
    prevOddsRef.current = displayOdds;
    return undefined;
  }, [displayOdds, isLive, isSelected, selectionId, updateSelectionOdds]);

  // Sync ref after flash resolves
  useEffect(() => {
    prevOddsRef.current = displayOdds;
  }, [displayOdds]);

  if (!odds) return <div className={cn('h-11 sm:h-9 w-[52px] rounded-lg', className)} />;

  // ── Suspended state ──────────────────────────────────────────────────────────
  if (isSuspended) {
    return (
      <div className={cn(
        'w-[52px] h-11 sm:h-9 flex items-center justify-center rounded-lg select-none',
        'bg-[#1A2030] border border-[#253241]/50 text-[#94A3B8]/20',
        className
      )}>
        <Lock className="h-3.5 w-3.5" />
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected) {
      playOddsRemove();
      removeSelection(selectionId);
    } else {
      playOddsAdd();
      addSelection({
        id: selectionId, marketId, matchId,
        matchName, leagueName, marketName,
        selectionType, selectionName, odds: displayOdds,
        sportKey,
        sportId,
        kickoffTime: isLive ? undefined : kickoffTime,
        commenceTime: isLive ? undefined : commenceTime,
        homeTeam,
        awayTeam,
      });
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 280);
      toast(`${selectionName} @ ${displayOdds.toFixed(2)} added to slip`, { duration: 2000 });
    }
  };

  // Movement colour tokens (for border / shadow on stable state)
  const movBorder = movement === 'up'   ? 'border-[#22C55E]/50'
                  : movement === 'down' ? 'border-[#EF4444]/50'
                  : '';
  const movShadow = movement === 'up'   ? 'shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                  : movement === 'down' ? 'shadow-[0_0_8px_rgba(239,68,68,0.25)]'
                  : '';

  // Flash animation style applied to the odds number span
  const flashStyle: React.CSSProperties = flashDir
    ? { animation: `${flashDir === 'up' ? 'oddsFlashUp' : 'oddsFlashDown'} 0.65s ease-out forwards` }
    : {};

  return (
    <button
      onClick={handleClick}
      data-testid={`odds-btn-${matchId}-${selectionType}`}
      className={cn(
        'relative w-[52px] h-11 sm:h-9 flex flex-col items-center justify-center rounded-lg select-none overflow-hidden',
        'transition-all duration-200',
        isSelected
          ? [
              'bg-[#00DFA9] text-[#0B0F14] border border-transparent',
              'shadow-[0_0_20px_rgba(0,223,169,0.55),0_0_6px_rgba(0,223,169,0.3)]',
              isPulsing ? 'scale-[1.18]' : 'scale-[1.05]',
            ].join(' ')
          : [
              'bg-[#0B1220] text-[#FACC15]',
              'border',
              movement !== 'stable' ? `${movBorder} ${movShadow}` : 'border-[#2A3A52]',
              'hover:bg-[#18212B] hover:border-[#38BDF8]/40',
              'hover:shadow-[0_0_10px_rgba(56,189,248,0.12)]',
              'hover:scale-[1.04]',
              'active:scale-[0.96]',
            ].join(' '),
        className
      )}
    >
      {/* Movement flash bar at top of button */}
      {!isSelected && movement !== 'stable' && (
        <div className={cn(
          'absolute top-0 left-0 right-0 h-[2px] rounded-t',
          movement === 'up' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
        )} />
      )}

      {/* Odds value — animated flash on change */}
      <span
        style={isSelected ? undefined : flashStyle}
        className={cn(
          'font-bold leading-none tabular-nums',
          format === 'decimal' ? 'text-[13px]' : 'text-[11px]',
          isSelected && 'text-[#0B0F14]',
        )}
      >
        {formatOdds(displayOdds, format)}
      </span>

      {/* Tiny movement arrow below number (only when NOT flashing) */}
      {!isSelected && movement !== 'stable' && !flashDir && (
        <span className={cn(
          'text-[7px] font-bold leading-none mt-0.5',
          movement === 'up' ? 'text-[#22C55E]' : 'text-[#EF4444]'
        )}>
          {movement === 'up' ? '▲' : '▼'}
        </span>
      )}
    </button>
  );
}
