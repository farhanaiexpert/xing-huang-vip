import { League } from '../types';
import { MatchRow } from './MatchRow';
import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

export function LeagueSection({ league }: { league: League }) {
  if (!league.matches || league.matches.length === 0) return null;

  const isFootball = league.sportId === 'soccer';

  return (
    <div className="bg-[#18212B] overflow-hidden mb-3 border border-[#253241] rounded-xl">
      <div className="flex items-center justify-between px-3 py-2 bg-[#121821]">
        <div className="flex items-center gap-2">
          {league.countryCode && (
            <span className="text-sm leading-none" aria-hidden="true">
              {getFlagEmoji(league.countryCode)}
            </span>
          )}
          <h3 className="font-semibold text-[#F8FAFC] text-sm">{league.name}</h3>
        </div>
        <Link href={`/league/${league.id}`} className="text-xs text-[#38BDF8] hover:underline flex items-center">
          View All <ChevronRight className="h-3 w-3 ml-0.5" />
        </Link>
      </div>
      
      {/* Column Headers */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0B0F14] border-b border-[#253241]">
        <div className="flex-1"></div>
        <div className="flex items-center gap-1.5 w-[168px] shrink-0 justify-end">
          {isFootball ? (
            <>
              <div className="w-[52px] text-center text-[10px] text-[#94A3B8]">1</div>
              <div className="w-[52px] text-center text-[10px] text-[#94A3B8]">X</div>
              <div className="w-[52px] text-center text-[10px] text-[#94A3B8]">2</div>
            </>
          ) : (
            <>
              <div className="w-[52px] text-center text-[10px] text-[#94A3B8]">1</div>
              <div className="w-[52px] text-center text-[10px] text-[#94A3B8]">2</div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        {league.matches.map((match) => (
          <MatchRow key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  if (countryCode === 'EU') return '🇪🇺';
  if (countryCode === 'GB') return '🇬🇧';
  if (countryCode === 'US') return '🇺🇸';
  if (countryCode === 'ES') return '🇪🇸';
  if (countryCode === 'IT') return '🇮🇹';
  if (countryCode === 'GL') return '🌍'; // Global/Esports
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}