import { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { SoccerHighlights } from './SoccerHighlights';
import { TennisHighlights } from './TennisHighlights';
import { NBAHighlights } from './NBAHighlights';
import { AllSportsHighlights } from './AllSportsHighlights';
import { useOddsData } from '../hooks/useOddsData';

type Tab = 'soccer' | 'tennis' | 'basketball' | 'more';

const TABS: { id: Tab; emoji: string; label: string }[] = [
  { id: 'soccer',     emoji: '⚽', label: 'Soccer'     },
  { id: 'tennis',     emoji: '🎾', label: 'Tennis'     },
  { id: 'basketball', emoji: '🏀', label: 'Basketball' },
  { id: 'more',       emoji: '🏆', label: 'More'       },
];

export function SportHighlights() {
  const { allLeagues } = useOddsData();
  const [activeTab, setActiveTab] = useState<Tab>('soccer');

  const { hasSoccer, hasTennis, hasBasketball, hasMore } = useMemo(() => {
    let soccer = false, tennis = false, basketball = false, more = false;
    for (const l of allLeagues) {
      const sk = l.sportKey ?? '';
      if (sk.startsWith('soccer_') || l.sportId === 'sp_soccer') soccer = true;
      else if (sk.startsWith('tennis_') || l.sportId === 'sp_tennis') tennis = true;
      else if (sk.startsWith('basketball_') || l.sportId === 'sp_basketball' || l.sportId === 'sp_nba') basketball = true;
      else more = true;
    }
    return { hasSoccer: soccer, hasTennis: tennis, hasBasketball: basketball, hasMore: more };
  }, [allLeagues]);

  const available = TABS.filter(t =>
    (t.id === 'soccer'     && hasSoccer)     ||
    (t.id === 'tennis'     && hasTennis)     ||
    (t.id === 'basketball' && hasBasketball) ||
    (t.id === 'more'       && hasMore)
  );

  if (available.length === 0) return null;

  const current = available.find(t => t.id === activeTab) ? activeTab : available[0].id;

  return (
    <div className="mb-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-xl border border-[#253241] bg-[#0B1018]">
        {available.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[12px] font-bold transition-all duration-150',
              current === tab.id
                ? 'bg-[#253241] text-[#F8FAFC] shadow-sm'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            )}
          >
            <span className="text-sm leading-none">{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content — swap between components */}
      {current === 'soccer'     && <SoccerHighlights />}
      {current === 'tennis'     && <TennisHighlights />}
      {current === 'basketball' && <NBAHighlights />}
      {current === 'more'       && <AllSportsHighlights />}
    </div>
  );
}
