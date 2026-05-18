import { useState } from 'react';
import { Lock, TrendingUp, TrendingDown } from 'lucide-react';
import { useBetSlip } from '../hooks/useBetSlip';
import { useToast } from '../hooks/use-toast';
import { useOddsSimulation, getMovement, getOddsDelta } from '../hooks/useOddsSimulation';
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
}

export function OddsButton({
  matchId, marketId, matchName, leagueName, marketName,
  selectionType, selectionName, odds, isLive = false, className,
}: OddsButtonProps) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { toast } = useToast();
  const { tick, suspendedMarketIds } = useOddsSimulation();
  const [isPulsing, setIsPulsing] = useState(false);

  const selectionId     = `${marketId}-${selectionType}`;
  const isSelected      = hasSelection(selectionId);
  const isSuspended     = suspendedMarketIds.has(marketId);

  // Live odds simulation
  const movement    = isLive ? getMovement(selectionId, tick) : 'stable';
  const delta       = isLive ? getOddsDelta(selectionId, tick) : 0;
  const displayOdds = Math.max(1.01, odds + delta);

  if (!odds) return <div className={cn('h-9 w-[52px] rounded-lg', className)} />;

  // ── Suspended state ────────────────────────────────────────────────────────
  if (isSuspended) {
    return (
      <div className={cn(
        'w-[52px] h-9 flex items-center justify-center rounded-lg select-none',
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
      removeSelection(selectionId);
    } else {
      addSelection({
        id: selectionId, marketId, matchId,
        matchName, leagueName, marketName,
        selectionType, selectionName, odds: displayOdds,
      });
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 280);
      toast({
        description: `${selectionName} @ ${displayOdds.toFixed(2)} added to slip`,
        duration: 2000,
      });
    }
  };

  // Movement colour tokens
  const movBorder = movement === 'up'   ? 'border-[#22C55E]/50'
                  : movement === 'down' ? 'border-[#EF4444]/50'
                  : '';
  const movShadow = movement === 'up'   ? 'shadow-[0_0_8px_rgba(34,197,94,0.25)]'
                  : movement === 'down' ? 'shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                  : '';

  return (
    <button
      onClick={handleClick}
      data-testid={`odds-btn-${matchId}-${selectionType}`}
      className={cn(
        'relative w-[52px] h-9 flex flex-col items-center justify-center rounded-lg select-none overflow-hidden',
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
          movement === 'up'   ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
        )} />
      )}

      {/* Odds value */}
      <span className="text-[13px] font-bold leading-none tabular-nums">
        {displayOdds.toFixed(2)}
      </span>

      {/* Movement indicator */}
      {!isSelected && movement !== 'stable' && (
        <span className={cn(
          'text-[8px] font-bold leading-none flex items-center gap-px mt-0.5',
          movement === 'up' ? 'text-[#22C55E]' : 'text-[#EF4444]'
        )}>
          {movement === 'up'
            ? <TrendingUp  className="h-2 w-2" />
            : <TrendingDown className="h-2 w-2" />}
        </span>
      )}
    </button>
  );
}
