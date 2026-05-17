import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { FEATURED_CARDS } from '../data/mockData';
import { Zap } from 'lucide-react';

export function FeaturedCards() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-bold text-white uppercase tracking-tight">Featured Matches</h2>
      </div>
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex w-max space-x-3">
          {FEATURED_CARDS.map((card) => (
            <div 
              key={card.id}
              className="w-[260px] shrink-0 rounded bg-[#1B352D] p-3 border border-white/5 hover:border-white/20 transition-colors cursor-pointer flex flex-col"
            >
              <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[#00DFA9] mb-1">
                {card.title} <Zap className="h-3 w-3 ml-1" />
              </div>
              <div className="font-bold text-sm text-white mb-2 whitespace-normal leading-tight">
                {card.subtitle}
              </div>
              
              {card.selections && card.selections.length > 0 && (
                <div className="space-y-1 mb-3">
                  {card.selections.map((sel, idx) => (
                    <div key={idx} className="flex items-start text-xs text-white/80 whitespace-normal leading-tight">
                      <div className="h-3 w-3 rounded-sm border border-[#00DFA9]/50 mr-1.5 mt-0.5 shrink-0 flex items-center justify-center bg-[#00DFA9]/10">
                        <div className="h-1.5 w-1.5 bg-[#00DFA9] rounded-sm"></div>
                      </div>
                      {sel}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-auto pt-2 border-t border-white/10 flex items-end justify-between">
                <div className="flex flex-col">
                  {card.boostLabel && (
                    <span className="text-[10px] font-bold text-[#00DFA9] uppercase mb-0.5">{card.boostLabel}</span>
                  )}
                  {card.returnExample && (
                    <span className="text-[10px] text-white/50">{card.returnExample}</span>
                  )}
                </div>
                <span className="text-xl font-black text-white">{card.odds}</span>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}