import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { FEATURED_CARDS } from '../data/mockData';
import { Zap, Clock, Target } from 'lucide-react';

type CardType = 'ACCUMULATOR BOOST' | 'EARLY PAYOUT' | 'BOTH TEAMS TO SCORE' | string;

function getCardTheme(title: CardType) {
  if (title === 'ACCUMULATOR BOOST') {
    return {
      color:   '#00DFA9',
      bg:      'rgba(0,223,169,0.08)',
      border:  'rgba(0,223,169,0.25)',
      hoverBorder: 'rgba(0,223,169,0.5)',
      shadow:  'rgba(0,223,169,0.12)',
      oddsColor: '#00DFA9',
      Icon: Zap,
    };
  }
  if (title === 'EARLY PAYOUT') {
    return {
      color:   '#38BDF8',
      bg:      'rgba(56,189,248,0.08)',
      border:  'rgba(56,189,248,0.25)',
      hoverBorder: 'rgba(56,189,248,0.5)',
      shadow:  'rgba(56,189,248,0.12)',
      oddsColor: '#38BDF8',
      Icon: Clock,
    };
  }
  return {
    color:   '#FACC15',
    bg:      'rgba(250,204,21,0.08)',
    border:  'rgba(250,204,21,0.2)',
    hoverBorder: 'rgba(250,204,21,0.45)',
    shadow:  'rgba(250,204,21,0.10)',
    oddsColor: '#FACC15',
    Icon: Target,
  };
}

export function FeaturedCards() {
  return (
    <div className="mb-5">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]/60">Featured</h2>
          <div className="h-px w-8 bg-[#253241]" />
        </div>
        <button
          className="text-[11px] font-medium text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors"
          data-testid="button-view-all-featured"
        >
          View All →
        </button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-2">
          {FEATURED_CARDS.map((card) => {
            const theme = getCardTheme(card.title);
            const { Icon } = theme;
            return (
              <div
                key={card.id}
                className="
                  w-[290px] shrink-0 rounded-xl flex flex-col cursor-pointer
                  bg-[#18212B] border transition-all duration-200
                  hover:-translate-y-0.5
                  group
                "
                style={{
                  borderColor: theme.border,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = theme.hoverBorder;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${theme.shadow}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = theme.border;
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                }}
              >
                {/* Card top arc accent */}
                <svg
                  className="w-full block"
                  viewBox="0 0 290 20"
                  height="20"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id={`arc-${card.id}`}
                      gradientUnits="userSpaceOnUse"
                      x1="0" y1="0" x2="290" y2="0"
                    >
                      <stop offset="0%"   stopColor={theme.color} stopOpacity="0" />
                      <stop offset="18%"  stopColor={theme.color} stopOpacity="1" />
                      <stop offset="82%"  stopColor={theme.color} stopOpacity="1" />
                      <stop offset="100%" stopColor={theme.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,18 Q145,2 290,18"
                    fill="none"
                    stroke={`url(#arc-${card.id})`}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="p-4 flex flex-col flex-1">
                  {/* Badge */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: theme.bg, border: `1px solid ${theme.border}` }}
                    >
                      <Icon className="h-2.5 w-2.5" style={{ color: theme.color }} />
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: theme.color }}
                    >
                      {card.title}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-semibold text-[#F8FAFC] leading-snug mb-3 whitespace-normal">
                    {card.subtitle}
                  </h3>

                  {/* Selections */}
                  {card.selections && card.selections.length > 0 && (
                    <div className="space-y-1.5 mb-4 flex-1">
                      {card.selections.map((sel, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#94A3B8] whitespace-normal leading-tight">
                          <div
                            className="w-3 h-3 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{ border: `1px solid ${theme.color}40` }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.color }} />
                          </div>
                          <span>{sel}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="border-t border-[#253241] pt-3 flex items-end justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      {card.boostLabel && (
                        <span className="text-[10px] font-bold" style={{ color: theme.color }}>
                          {card.boostLabel}
                        </span>
                      )}
                      {card.returnExample && (
                        <span className="text-[10px] text-[#94A3B8]/70 leading-tight">{card.returnExample}</span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-[#94A3B8]/60 mb-0.5 uppercase tracking-wide">Odds</div>
                      <span
                        className="text-2xl font-black leading-none tabular-nums"
                        style={{ color: theme.oddsColor }}
                      >
                        {card.odds}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
