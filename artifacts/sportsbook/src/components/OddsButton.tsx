import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';

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

  if (!odds) {
    return <div className={cn("h-9 rounded-lg", className)} />;
  }

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
        "flex items-center justify-center rounded-lg h-9 transition-all duration-150 text-sm font-bold",
        isSelected
          ? "bg-[#00DFA9] text-[#0B0F14] shadow-[0_0_12px_rgba(0,223,169,0.35)] border-transparent"
          : "bg-[#0B0F14] text-[#FACC15] border border-[#253241] hover:bg-[#121821] hover:border-[#38BDF8]/60",
        className
      )}
    >
      {odds.toFixed(2)}
    </button>
  );
}