import { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';

// ─── Seed data ────────────────────────────────────────────────────────────────

interface Winner {
  user: string;
  amount: string;
  event: string;
}

const SEED_WINNERS: Winner[] = [
  { user: '3841', amount: '€4,280', event: 'Man City vs Liverpool'      },
  { user: '7219', amount: '£890',   event: 'Barcelona vs Real Madrid'   },
  { user: '5533', amount: '€1,540', event: 'Arsenal vs Chelsea'         },
  { user: '2091', amount: '€230',   event: 'Juventus vs Inter'          },
  { user: '9902', amount: '$3,100', event: 'Lakers vs Celtics'          },
  { user: '6614', amount: '€640',   event: 'PSG vs Marseille'           },
  { user: '1188', amount: '£1,980', event: 'Liverpool vs Man Utd'       },
  { user: '4457', amount: '€520',   event: 'Atletico vs Sevilla'        },
  { user: '8823', amount: '€7,400', event: 'Bayern vs Dortmund'        },
  { user: '3309', amount: '$480',   event: 'Warriors vs Heat'           },
  { user: '7742', amount: '£2,650', event: 'Tottenham vs Arsenal'       },
  { user: '5591', amount: '€310',   event: 'Real Madrid vs Barcelona'   },
  { user: '2234', amount: '€890',   event: 'AC Milan vs Roma'           },
  { user: '6678', amount: '$1,240', event: 'Bulls vs Knicks'            },
  { user: '9145', amount: '£5,320', event: 'Chelsea vs Man City'        },
  { user: '3367', amount: '€2,010', event: 'Lazio vs Napoli'            },
  { user: '8812', amount: '$670',   event: 'Spurs vs Phoenix Suns'      },
  { user: '1053', amount: '€3,750', event: 'Dortmund vs Leipzig'        },
  { user: '4490', amount: '£420',   event: 'West Ham vs Newcastle'      },
  { user: '7731', amount: '€1,160', event: 'Lyon vs Monaco'             },
];

// New "live" winners appear every 12–22 seconds
const NEW_WINNER_INTERVAL_MS = 15_000;

const RANDOM_EVENTS = [
  'Man City vs Arsenal', 'Real Madrid vs Atletico', 'Bayern vs Leverkusen',
  'Inter vs AC Milan', 'PSG vs Lyon', 'Liverpool vs Chelsea',
  'Barcelona vs Valencia', 'Juventus vs Roma',
];

function randomWinner(): Winner {
  const user = String(Math.floor(1000 + Math.random() * 9000));
  const amount = `€${(Math.floor(Math.random() * 9800) + 200).toLocaleString()}`;
  const event  = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
  return { user, amount, event };
}

function buildLabel(w: Winner) {
  return `User …${w.user} won ${w.amount} on ${w.event}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SEPARATOR = '  ·  ';

export function WinnersTicker() {
  const [winners, setWinners] = useState<Winner[]>(SEED_WINNERS);

  // Periodically prepend a new winner to keep it feeling live
  useEffect(() => {
    const id = setInterval(() => {
      setWinners(prev => [randomWinner(), ...prev.slice(0, 29)]);
    }, NEW_WINNER_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Build a single joined string so the marquee content is one line
  const tickerText = winners.map(buildLabel).join(SEPARATOR);

  // Duplicate content so the loop is seamless
  const content = tickerText + SEPARATOR + tickerText;

  // Keyframe animation duration scales with content length (px per second)
  const PX_PER_SEC = 60;
  const approxWidth = tickerText.length * 7; // rough char width estimate
  const duration = Math.max(30, approxWidth / PX_PER_SEC);

  return (
    <div
      className="relative flex items-center overflow-hidden border-b border-[#253241]/60"
      style={{ backgroundColor: '#0D1219', height: 30 }}
    >
      {/* Keyframe style injected inline */}
      <style>{`
        @keyframes oddschain-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .oddschain-ticker-track {
          animation: oddschain-ticker ${duration}s linear infinite;
          will-change: transform;
        }
        .oddschain-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Label pill */}
      <div
        className="shrink-0 z-10 flex items-center gap-1.5 px-3 h-full border-r border-[#253241]/80"
        style={{ backgroundColor: '#0D1219' }}
      >
        <Trophy className="h-3 w-3 text-[#FACC15]" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#FACC15]/80 whitespace-nowrap">
          Winners
        </span>
      </div>

      {/* Left fade */}
      <div
        className="absolute left-[72px] top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #0D1219, transparent)' }}
      />

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden h-full relative">
        <div className="oddschain-ticker-track flex items-center h-full whitespace-nowrap">
          {/* Duplicated content for seamless loop */}
          <TickerItems text={content} winners={winners} />
        </div>
      </div>

      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to left, #0D1219, transparent)' }}
      />
    </div>
  );
}

// ─── Sub-component: renders the ticker items with coloured amounts ─────────────

function TickerItems({ text, winners }: { text: string; winners: Winner[] }) {
  // We need to render spans so the amount is coloured differently.
  // Build an array of segments: (label, winner|null)
  const segments: { label: string; winner: Winner | null }[] = [];
  const pool = [...winners, ...winners]; // doubled for seamless loop

  pool.forEach((w, i) => {
    if (i > 0) segments.push({ label: SEPARATOR, winner: null });
    // Split the label around the amount so we can colour it
    const full  = buildLabel(w);
    const amIdx = full.indexOf(w.amount);
    const before = full.slice(0, amIdx);
    const after  = full.slice(amIdx + w.amount.length);
    segments.push({ label: before,   winner: null });
    segments.push({ label: w.amount, winner: w     }); // coloured
    segments.push({ label: after,    winner: null });
  });

  return (
    <>
      {segments.map((seg, i) => (
        <span
          key={i}
          className={
            seg.winner
              ? 'font-bold text-[#00DFA9] text-[11px]'
              : 'text-[11px] text-[#94A3B8]/60'
          }
        >
          {seg.label}
        </span>
      ))}
    </>
  );
}
