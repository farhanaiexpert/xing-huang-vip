import { cn } from '../lib/utils';

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-full bg-[#1E2A38]', className)} />
  );
}

function SkeletonOddsBtn() {
  return <div className="h-9 w-[52px] rounded-lg bg-[#1E2A38]" />;
}

function SkeletonRow({ cols = 3 }: { cols?: 2 | 3 }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3 gap-3 border-b border-[#253241]/40 last:border-0">
      {/* Date */}
      <div className="shrink-0 w-[52px] flex flex-col items-center gap-1.5">
        <SkeletonBox className="h-2.5 w-8" />
        <SkeletonBox className="h-2.5 w-10" />
      </div>

      <div className="h-8 w-px bg-[#253241]/60 shrink-0" />

      {/* Teams */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <SkeletonBox className="h-2.5 w-3/4" />
        <SkeletonBox className="h-2.5 w-1/2" />
      </div>

      {/* Odds buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <SkeletonOddsBtn />
        {cols === 3 && <SkeletonOddsBtn />}
        <SkeletonOddsBtn />
      </div>
    </div>
  );
}

export function SkeletonLeague({ rows = 3, cols = 3 }: { rows?: number; cols?: 2 | 3 }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#253241]/60 bg-[#121821] animate-pulse">
      {/* League header */}
      <div className="h-[42px] bg-[#0F1620] border-b border-[#253241] flex items-center px-3.5 gap-2.5">
        <SkeletonBox className="h-4 w-4 rounded-full" />
        <SkeletonBox className="h-3 w-28" />
        <SkeletonBox className="h-4 w-8 rounded-md" />
        <div className="ml-auto">
          <SkeletonBox className="h-2.5 w-10" />
        </div>
      </div>

      {/* Column headers */}
      <div className="h-8 bg-[#0A0E13] border-b border-[#253241]/60 flex items-center px-3.5">
        <SkeletonBox className="h-2 w-10" />
        <div className="ml-auto flex gap-14">
          <SkeletonBox className="h-2 w-3" />
          {cols === 3 && <SkeletonBox className="h-2 w-3" />}
          <SkeletonBox className="h-2 w-3" />
        </div>
      </div>

      {/* Match rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}
