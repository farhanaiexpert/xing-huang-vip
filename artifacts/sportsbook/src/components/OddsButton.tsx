import { useState } from 'react';
import { useBetSlip } from '../hooks/useBetSlip';
import { useToast } from '../hooks/use-toast';
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
  className?: string;
}

export function OddsButton({
  matchId, marketId, matchName, leagueName, marketName,
  selectionType, selectionName, odds, className,
}: OddsButtonProps) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { toast } = useToast();
  const [isPulsing, setIsPulsing] = useState(false);

  const selectionId = `${marketId}-${selectionType}`;
  const isSelected  = hasSelection(selectionId);

  if (!odds) {
    return <div className={cn('h-9 w-[52px] rounded-lg', className)} />;
  }

  const handleClick = (e: React.MouseEvent) => {
    // Prevent row-level click from firing
    e.stopPropagation();

    if (isSelected) {
      removeSelection(selectionId);
    } else {
      addSelection({
        id: selectionId, marketId, matchId,
        matchName, leagueName, marketName,
        selectionType, selectionName, odds,
      });

      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 280);

      toast({
        description: `${selectionName} @ ${odds.toFixed(2)} added to slip`,
        duration: 2000,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      data-testid={`odds-btn-${matchId}-${selectionType}`}
      className={cn(
        'w-[52px] h-9 flex items-center justify-center rounded-lg text-sm font-bold select-none',
        'transition-all duration-150',
        isSelected
          ? [
              'bg-[#00DFA9] text-[#0B0F14]',
              'border border-transparent',
              'shadow-[0_0_20px_rgba(0,223,169,0.55),0_0_6px_rgba(0,223,169,0.3)]',
              isPulsing ? 'scale-[1.2]' : 'scale-[1.05]',
            ].join(' ')
          : [
              'bg-[#0D1117] border border-[#253241] text-[#FACC15]',
              'hover:bg-[#18212B] hover:border-[#38BDF8]/40',
              'hover:shadow-[0_0_10px_rgba(56,189,248,0.12)]',
              'hover:scale-[1.04] hover:text-[#FACC15]',
              'active:scale-[0.96]',
            ].join(' '),
        className
      )}
    >
      {odds.toFixed(2)}
    </button>
  );
}
