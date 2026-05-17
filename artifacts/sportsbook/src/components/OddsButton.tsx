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
        "flex items-center justify-center rounded-lg h-9 transition-all duration-150 text-sm",
        isSelected
          ? "bg-[#00DFA9] text-[#0B0F14] font-bold shadow-[0_0_16px_rgba(0,223,169,0.45)] border-transparent scale-[1.04]"
          : "bg-[#0B0F14] text-[#FACC15] font-bold border border-[#253241] hover:bg-[#121821] hover:text-[#FACC15] hover:border-[#38BDF8]/50 hover:scale-[1.02] hover:shadow-[0_0_8px_rgba(56,189,248,0.15)]",
        className
      )}
    >
      {odds.toFixed(2)}
    </button>
  );
}
