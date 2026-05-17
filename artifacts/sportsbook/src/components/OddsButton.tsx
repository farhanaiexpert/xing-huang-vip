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
    return <div className={cn("h-9 w-[52px] rounded-lg", className)} />;
  }

  const handleClick = () => {
    if (isSelected) {
      removeSelection(selectionId);
    } else {
      addSelection({ id: selectionId, matchId, matchName, selectionType, odds });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-[52px] h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-150 select-none",
        isSelected
          ? [
              "bg-[#00DFA9] text-[#0B0F14]",
              "shadow-[0_0_18px_rgba(0,223,169,0.5),0_0_6px_rgba(0,223,169,0.3)]",
              "scale-[1.05]",
              "border border-transparent",
            ].join(" ")
          : [
              "bg-[#0D1117] border border-[#253241]",
              "text-[#FACC15]",
              "hover:bg-[#18212B]",
              "hover:border-[#38BDF8]/50",
              "hover:shadow-[0_0_10px_rgba(56,189,248,0.15)]",
              "hover:scale-[1.03]",
              "hover:text-[#FACC15]",
            ].join(" "),
        className
      )}
    >
      {odds.toFixed(2)}
    </button>
  );
}
