import { useMemo } from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { useLiveOdds } from '../hooks/useLiveOdds';

const SPORT_EMOJIS: Record<string, string> = {
  soccer: '⚽', football: '🏈', tennis: '🎾', basketball: '🏀',
  mma: '🥊', boxing: '🥊', cricket: '🏏', rugby: '🏉',
  baseball: '⚾', hockey: '🏒', volleyball: '🏐',
};

function sportEmoji(sport: string): string {
  const key = Object.keys(SPORT_EMOJIS).find(k => sport.toLowerCase().includes(k));
  return key ? SPORT_EMOJIS[key] : '🏆';
}

export function LiveEventsBanner() {
  const { matches, loading } = useLiveOdds();

  const { count, emojis } = useMemo(() => {
    const count = matches.length;
    const seen = new Set<string>();
    const emojis: string[] = [];
    for (const m of matches) {
      const e = sportEmoji(m.sport);
      if (!seen.has(e)) { seen.add(e); emojis.push(e); }
      if (emojis.length >= 3) break;
    }
    return { count, emojis };
  }, [matches]);

  if (loading || count === 0) return null;

  return (
    <Link href="/live">
      <div
        className="group flex items-center gap-3 px-4 py-3 rounded-xl mb-4 cursor-pointer transition-all duration-200 hover:border-[#EF4444]/35"
        style={{
          background: 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.04) 60%, transparent 100%)',
          border: '1px solid rgba(239,68,68,0.18)',
        }}
      >
        {/* Double-pulse dot */}
        <div className="relative shrink-0">
          <span className="block w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
          <span className="block w-2.5 h-2.5 rounded-full bg-[#EF4444] absolute inset-0 animate-ping opacity-50" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[13px] font-bold text-[#F8FAFC] whitespace-nowrap">
            🔴 {count} event{count !== 1 ? 's' : ''} live right now
          </span>
          {emojis.length > 0 && (
            <span className="text-[11px] text-[#94A3B8]/60 whitespace-nowrap">
              {emojis.join(' ')} Don't miss a second
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
