import { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { useBetSlip } from '../hooks/useBetSlip';
import { useToast } from '../hooks/use-toast';
import { useOddsSimulation, getMovement, getOddsDelta } from '../hooks/useOddsSimulation';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { formatOdds } from '../lib/oddsFormat';
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

  // Flash the number whenever displayOdds actually changes
  useEffect(() => {
    if (!isLive) return undefined;
    const prev = prevOddsRef.current;
    if (prev !== null && prev !== displayOdds) {
      const dir = displayOdds > prev ? 'up' : 'down';
      setFlashDir(dir);
      const t = setTimeout(() => setFlashDir(null), 700);
      return () => clearTimeout(t);
    }
    prevOddsRef.current = displayOdds;
    return undefined;
  }, [displayOdds, isLive]);

  // Sync ref after flash resolves
  useEffect(() => {
    prevOddsRef.current = displayOdds;
  }, [displayOdds]);

  if (!odds) return <div className={cn('h-9 w-[52px] rounded-lg', className)} />;

  // ── Suspended state ──────────────────────────────────────────────────────────
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
        'relative w-[52px] h-9 flex flex-col items-center justify-center rounded-lg select-none overflow-hidden',
        isLive ? 'gap-[1px] pt-0.5 pb-0.5' : '',
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

      {/* Sparkline — live matches only, hidden when selected */}
      {isLive && !isSelected && (
        <OddsSparkline selectionId={selectionId} tick={tick} baseOdds={odds} />
      )}
    </button>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function OddsSparkline({ selectionId, tick, baseOdds }: {
  selectionId: string;
  tick: number;
  baseOdds: number;
}) {
  const POINTS = 5;
  const pts: number[] = [];
  for (let i = POINTS - 1; i >= 0; i--) {
    const t = Math.max(0, tick - i);
    pts.push(Math.max(1.01, baseOdds + getOddsDelta(selectionId, t)));
  }

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 0.001;

  const W = 32, H = 7;
  const coordStr = pts
    .map((p, i) => {
      const x = (i / (POINTS - 1)) * W;
      const y = H - ((p - min) / range) * (H - 1);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const last  = pts[POINTS - 1];
  const first = pts[0];
  const color = last > first ? '#22C55E' : last < first ? '#EF4444' : '#475569';

  return (
    <svg width={W} height={H} className="opacity-55 shrink-0">
      <polyline
        points={coordStr}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End-point dot */}
      <circle
        cx={(((POINTS - 1) / (POINTS - 1)) * W).toFixed(1)}
        cy={(H - ((last - min) / range) * (H - 1)).toFixed(1)}
        r="1.5"
        fill={color}
      />
    </svg>
  );
}
