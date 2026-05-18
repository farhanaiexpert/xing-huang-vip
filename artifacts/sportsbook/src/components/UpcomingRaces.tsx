import { useState } from 'react';
import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import { Flag } from 'lucide-react';

// ────────────────────────────────────────────────────────────────
// DATA
// ────────────────────────────────────────────────────────────────
interface Runner {
  horse: string;
  jockey: string;
  odds: number;
  silk: string; // tailwind bg color class
}

interface Race {
  id: string;
  name: string;
  venue: string;
  minutesAway: number;
  runners: Runner[];
}

const RACES: Race[] = [
  {
    id: 'r1',
    name: 'Race 4',
    venue: 'Morioka',
    minutesAway: 6,
    runners: [
      { horse: "Ivy Spinel",     jockey: 'Yu Suzuki',       odds: 2.00, silk: 'bg-blue-500'   },
      { horse: "Bird Has Flown", jockey: 'Shion Sasaki',    odds: 2.50, silk: 'bg-red-500'    },
      { horse: "Kitano Couver",  jockey: 'Ryo Kobayashi',   odds: 6.00, silk: 'bg-yellow-500' },
    ],
  },
  {
    id: 'r2',
    name: 'Race 5',
    venue: 'Stawell',
    minutesAway: 11,
    runners: [
      { horse: "Nothin' Wong Here", jockey: 'Billy Egan',    odds: 1.45,  silk: 'bg-green-500'  },
      { horse: 'Cristaria',         jockey: 'Declan Bates',  odds: 10.00, silk: 'bg-purple-500' },
      { horse: 'Crush Puppy',       jockey: 'Teo Nugent',    odds: 12.00, silk: 'bg-orange-500' },
    ],
  },
  {
    id: 'r3',
    name: 'Race 6',
    venue: 'Port Macquarie',
    minutesAway: 16,
    runners: [
      { horse: "Salma's Star", jockey: 'Mollie Fitzgerald', odds: 3.20, silk: 'bg-pink-500'   },
      { horse: 'The Lupercal', jockey: 'Grace Palmer',      odds: 4.40, silk: 'bg-cyan-500'   },
      { horse: 'Stiorra',      jockey: 'Ben Looker',        odds: 4.80, silk: 'bg-lime-500'   },
    ],
  },
  {
    id: 'r4',
    name: 'Race 7',
    venue: 'Randwick',
    minutesAway: 24,
    runners: [
      { horse: 'Doomben Flyer', jockey: 'James McDonald',   odds: 1.90, silk: 'bg-red-600'    },
      { horse: 'Wild Thunder',  jockey: 'Hugh Bowman',       odds: 3.50, silk: 'bg-blue-600'   },
      { horse: 'Silver Lining', jockey: 'Craig Williams',    odds: 5.50, silk: 'bg-slate-400'  },
    ],
  },
];

// ────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────
export function UpcomingRaces() {
  const { addSelection, hasSelection, removeSelection } = useBetSlip();
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? RACES : RACES.slice(0, 3);

  function handleRunner(race: Race, runner: Runner) {
    const selId = `race_${race.id}_${runner.horse}`;
    if (hasSelection(selId)) {
      removeSelection(selId);
    } else {
      addSelection({
        id:            selId,
        marketId:      `race_${race.id}`,
        matchName:     `${race.name} ${race.venue}`,
        leagueName:    'Horse Racing',
        marketName:    'Win',
        selectionType: 'W',
        selectionName: runner.horse,
        odds:          runner.odds,
      });
    }
  }

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🏇</span>
          <span className="text-[13px] font-bold text-[#F8FAFC] tracking-tight">Upcoming Races</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 bg-[#121821] border border-[#253241] px-1.5 py-0.5 rounded">
            {RACES.length} races
          </span>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors"
        >
          {expanded ? 'Show Less' : 'View All →'}
        </button>
      </div>

      {/* Race grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {visible.map(race => (
          <RaceCard
            key={race.id}
            race={race}
            hasSelection={hasSelection}
            onSelect={(runner) => handleRunner(race, runner)}
          />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// RACE CARD
// ────────────────────────────────────────────────────────────────
function RaceCard({ race, hasSelection, onSelect }: {
  race: Race;
  hasSelection: (id: string) => boolean;
  onSelect: (runner: Runner) => void;
}) {
  return (
    <div className="rounded-xl bg-[#121821] border border-[#253241] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#18212B] border-b border-[#253241]">
        <div>
          <p className="text-[11px] font-bold text-[#F8FAFC] leading-none">{race.name} {race.venue}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
            <span className="text-[9px] font-semibold text-[#22C55E]">{race.minutesAway}m</span>
          </div>
        </div>
        <Flag className="h-3 w-3 text-[#94A3B8]/30" />
      </div>

      {/* Runners */}
      <div className="divide-y divide-[#253241]/50">
        {race.runners.map((runner, i) => {
          const selId   = `race_${race.id}_${runner.horse}`;
          const active  = hasSelection(selId);
          return (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2">
              {/* Silk */}
              <div className={cn('w-5 h-5 rounded-md shrink-0 border-2 border-white/10', runner.silk)} />

              {/* Horse + jockey */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[#F8FAFC] leading-none truncate">{runner.horse}</p>
                <p className="text-[9px] text-[#94A3B8]/60 leading-none mt-0.5 truncate">{runner.jockey}</p>
              </div>

              {/* Odds button */}
              <button
                onClick={() => onSelect(runner)}
                className={cn(
                  'shrink-0 min-w-[44px] h-7 px-2 rounded-lg text-xs font-black tabular-nums border transition-all duration-150',
                  active
                    ? 'bg-[#00DFA9]/15 border-[#00DFA9]/60 text-[#00DFA9]'
                    : 'bg-[#0B1220] border-[#2A3A52] text-[#FACC15] hover:bg-[#FACC15]/10 hover:border-[#FACC15]/40'
                )}
              >
                {runner.odds.toFixed(2)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
