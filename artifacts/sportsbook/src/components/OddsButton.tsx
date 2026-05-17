import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import { Selection } from '../types';

interface OddsButtonProps {
  matchId: string;
  matchName: string;
  selectionType: string;
  odds: number;
  className?: string;
}

export function OddsButton({ matchId, matchName, selectionType, odds, className }: OddsButtonProps) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const selectionId = `${matchId}-${selectionType}`;
  const isSelected = hasSelection(selectionId);

  const handleClick = () => {
    if (isSelected) {
      removeSelection(selectionId);
    } else {
      addSelection({
        id: selectionId,
        matchId,
        matchName,
        selectionType,
        odds,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center justify-center rounded px-2 py-1.5 min-w-[3.5rem] transition-all duration-200 text-sm font-medium",
        isSelected
          ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(0,223,169,0.3)]"
          : "bg-[#1B352D] text-foreground hover:bg-[#1B352D]/80 border border-transparent hover:border-border",
        className
      )}
    >
      <span className={cn("text-[10px] mb-0.5", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {selectionType}
      </span>
      <span className="font-bold">{odds.toFixed(2)}</span>
    </button>
  );
}
