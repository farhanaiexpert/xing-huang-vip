import { useMemo } from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useOddsData } from '../hooks/useOddsData';

export function LiveEventsBanner() {
  const { allLeagues } = useOddsData();

  const { liveCount, sportSample } = useMemo(() => {
    let count = 0;
    const sports = new Set<string>();
    for (const league of allLeagues) {
      for (const match of league.matches) {
        if (match.isLive) {
          count++;
          if (match.sportId) sports.add(match.sportId);
        }
      }
    }
    const sportList = Array.from(sports).slice(0, 3);
    return { liveCount: count, sportSample: sportList };
  }, [allLeagues]);

  if (liveCount === 0) return null;

  const sportEmojis: Record<string, string> = {
    soccer: '⚽', tennis: '🎾', basketball: '🏀',
    americanfootball: '🏈', mma: '🥊', cricket: '🏏', rugby: '🏉',
  };
  const getEmoji = (id: string) =>
    Object.entries(sportEmojis).find(([k]) => id.includes(k))?.[1] ?? '🏆';

  return (
    <Link href="/live">
      <div className="group flex items-center gap-3 px-4 py-3 rounded-xl mb-4 cursor-pointer transition-all duration-200"
        style={{
          background: 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.04) 60%, transparent 100%)',
          border: '1px solid rgba(239,68,68,0.18)',
        }}
      >
        {/* Pulsing dot */}
        <div className="relative shrink-0">
          <span className="block w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <span className="block w-2.5 h-2.5 rounded-full bg-[#EF4444] absolute inset-0 animate-ping opacity-50" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[13px] font-bold text-[#F8FAFC] whitespace-nowrap">
            🔴 {liveCount} event{liveCount !== 1 ? 's' : ''} live right now
          </span>
          {sportSample.length > 0 && (
            <span className="text-[11px] text-[#94A3B8]/60 whitespace-nowrap">
              {sportSample.map(getEmoji).join(' ')} Don't miss a second
            </span>
          )}
        </div>

        {/* CTA */}
        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-[#EF4444] group-hover:text-[#F87171] shrink-0 transition-colors">
          Watch Live
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}
