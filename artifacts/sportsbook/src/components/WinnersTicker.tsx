import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Winner {
  user: string;
  amount: string;
  event: string;
}

const SEED_WINNERS: Winner[] = [
  { user: '3841', amount: '€4,280', event: 'Man City vs Liverpool'    },
  { user: '7219', amount: '£890',   event: 'Barcelona vs Real Madrid' },
  { user: '5533', amount: '€1,540', event: 'Arsenal vs Chelsea'       },
  { user: '2091', amount: '€230',   event: 'Juventus vs Inter'        },
  { user: '9902', amount: '$3,100', event: 'Lakers vs Celtics'        },
  { user: '6614', amount: '€640',   event: 'PSG vs Marseille'         },
  { user: '1188', amount: '£1,980', event: 'Liverpool vs Man Utd'     },
  { user: '4457', amount: '€520',   event: 'Atletico vs Sevilla'      },
  { user: '8823', amount: '€7,400', event: 'Bayern vs Dortmund'       },
  { user: '3309', amount: '$480',   event: 'Warriors vs Heat'         },
  { user: '7742', amount: '£2,650', event: 'Tottenham vs Arsenal'     },
  { user: '5591', amount: '€310',   event: 'Real Madrid vs Barcelona' },
  { user: '2234', amount: '€890',   event: 'AC Milan vs Roma'         },
  { user: '6678', amount: '$1,240', event: 'Bulls vs Knicks'          },
  { user: '9145', amount: '£5,320', event: 'Chelsea vs Man City'      },
  { user: '3367', amount: '€2,010', event: 'Lazio vs Napoli'          },
  { user: '1053', amount: '€3,750', event: 'Dortmund vs Leipzig'      },
  { user: '4490', amount: '£420',   event: 'West Ham vs Newcastle'    },
  { user: '7731', amount: '€1,160', event: 'Lyon vs Monaco'           },
  { user: '8812', amount: '$670',   event: 'LA Lakers vs Boston'      },
];

const RANDOM_EVENTS = [
  'Man City vs Arsenal', 'Real Madrid vs Atletico', 'Bayern vs Leverkusen',
  'Inter vs AC Milan', 'PSG vs Lyon', 'Liverpool vs Chelsea',
  'Barcelona vs Valencia', 'Juventus vs Roma', 'Napoli vs Lazio',
  'Dortmund vs Stuttgart', 'Everton vs Brentford', 'Sevilla vs Athletic',
];

function randomWinner(): Winner {
  const user   = String(Math.floor(1000 + Math.random() * 9000));
  const raw    = Math.floor(Math.random() * 9800) + 120;
  const symbol = ['€', '£', '$'][Math.floor(Math.random() * 3)];
  const amount = `${symbol}${raw.toLocaleString()}`;
  const event  = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
  return { user, amount, event };
}

// ─── Winner pill ──────────────────────────────────────────────────────────────

function WinnerPill({ winner }: { winner: Winner }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {/* Trophy dot */}
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#FACC15]/15 shrink-0">
        <Trophy className="h-2.5 w-2.5 text-[#FACC15]" />
      </span>

      {/* User ID */}
      <span className="text-[11px] font-medium text-[#94A3B8]">
        User&nbsp;<span className="font-semibold text-[#CBD5E1]">…{winner.user}</span>
      </span>

      {/* "won" */}
      <span className="text-[10px] text-[#94A3B8]/50">won</span>

      {/* Amount — highlighted */}
      <span className="text-[12px] font-bold text-[#00DFA9]">
        {winner.amount}
      </span>

      {/* "on" */}
      <span className="text-[10px] text-[#94A3B8]/50">on</span>

      {/* Match */}
      <span className="text-[11px] font-semibold text-[#F8FAFC]/80">
        {winner.event}
      </span>
    </span>
  );
}

// ─── Main ticker ──────────────────────────────────────────────────────────────

export function WinnersTicker() {
  const [winners, setWinners] = useState<Winner[]>(SEED_WINNERS);

  // Prepend a new winner every 15 s to keep it feeling live
  useEffect(() => {
    const id = setInterval(() => {
      setWinners(prev => [randomWinner(), ...prev.slice(0, 29)]);
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  // Duration: ~340px per winner pill + separator, 85px/s scroll speed
  const PILL_PX   = 340; // approx width per pill + separator
  const SPEED     = 85;  // px per second — slightly faster
  const duration  = Math.max(30, (winners.length * PILL_PX) / SPEED);

  return (
    <div
      className="relative flex items-center overflow-hidden border-b border-[#253241]/70"
      style={{ backgroundColor: '#080C11', height: 38 }}
    >
      <style>{`
        @keyframes winners-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .winners-track {
          animation: winners-scroll ${duration}s linear infinite;
          will-change: transform;
        }
        .winners-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* ── WINNERS label ─────────────────────────────────────────── */}
      <div
        className="shrink-0 z-10 flex items-center gap-2 pl-3 pr-4 h-full border-r border-[#253241]/80"
        style={{ backgroundColor: '#080C11' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FACC15] opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FACC15]" />
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#FACC15] whitespace-nowrap">
            WINNERS
          </span>
        </div>
      </div>

      {/* Left fade */}
      <div
        className="absolute z-10 top-0 bottom-0 w-6 pointer-events-none"
        style={{ left: 110, background: 'linear-gradient(to right, #080C11, transparent)' }}
      />

      {/* ── Scrolling track ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden h-full">
        <div className="winners-track flex items-center h-full">
          {/* Duplicated for seamless loop */}
          {[...winners, ...winners].map((w, i) => (
            <span key={i} className="inline-flex items-center">
              <WinnerPill winner={w} />
              {/* Separator between entries */}
              <span
                className="inline-block mx-5 text-[#253241] select-none"
                aria-hidden="true"
              >
                ◆
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to left, #080C11, transparent)' }}
      />
    </div>
  );
}
