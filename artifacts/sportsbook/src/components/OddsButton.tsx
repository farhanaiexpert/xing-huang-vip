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
    return <div className={cn("h-8 rounded", className)} />;
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
        "flex items-center justify-center rounded h-8 transition-all duration-200 text-sm font-bold",
        isSelected
          ? "bg-[#00DFA9] text-[#111111] shadow-[0_0_8px_rgba(0,223,169,0.4)] border-transparent"
          : "bg-[#1B352D] text-[#F59E0B] border border-white/10 hover:bg-[#1B352D]/80 hover:border-white/20",
        className
      )}
    >
      {odds.toFixed(2)}
    </button>
  );
}