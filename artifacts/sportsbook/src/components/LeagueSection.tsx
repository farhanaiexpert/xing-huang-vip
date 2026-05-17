import { League } from '../types';
import { MatchRow } from './MatchRow';
import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

export function LeagueSection({ league }: { league: League }) {
  if (!league.matches || league.matches.length === 0) return null;

  return (
    <div className="bg-[#1B352D]/50 rounded-lg border border-border overflow-hidden mb-6">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1B352D] border-b border-border">
        <div className="flex items-center gap-2">
          {league.countryCode && (
            <span className="text-lg leading-none" aria-hidden="true">
              {getFlagEmoji(league.countryCode)}
            </span>
          )}
          <h3 className="font-bold text-white">{league.name}</h3>
        </div>
        <Link href={`/league/${league.id}`} className="text-xs text-primary hover:underline flex items-center font-medium">
          View All <ChevronRight className="h-3 w-3 ml-0.5" />
        </Link>
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
