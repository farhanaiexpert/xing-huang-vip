import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { FEATURED_CARDS } from '../data/mockData';

export function FeaturedCards() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">Featured Matches</h2>
      </div>
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex w-max space-x-3">
          {FEATURED_CARDS.map((card) => (
            <div 
              key={card.id}
              className="w-[280px] shrink-0 rounded-xl bg-[#18212B] p-4 border border-[#253241] hover:border-[#38BDF8]/40 hover:shadow-md transition-all cursor-pointer flex flex-col group"
            >
              <div className="mb-1">
                <span className="inline-block px-2 py-0.5 rounded-full bg-[#00DFA9]/10 text-[#00DFA9] text-[10px] font-bold uppercase">
                  {card.title}
                </span>
              </div>
              
              <div className="font-semibold text-sm text-[#F8FAFC] mb-2 whitespace-normal leading-tight mt-1">
                {card.subtitle}
              </div>
              
              {card.selections && card.selections.length > 0 && (
                <div className="space-y-1 mb-3">
                  {card.selections.map((sel, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-[#94A3B8] whitespace-normal leading-tight">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]/60 shrink-0"></div>
                      {sel}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-auto pt-3 border-t border-[#253241] flex items-end justify-between">
                <div className="flex flex-col">
                  {card.boostLabel && (
                    <span className="text-[10px] font-semibold text-[#00DFA9]">{card.boostLabel}</span>
                  )}
                  {card.returnExample && (
                    <span className="text-[10px] text-[#94A3B8]">{card.returnExample}</span>
                  )}
                </div>
                <span className="text-2xl font-black text-[#FACC15]">{card.odds}</span>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}