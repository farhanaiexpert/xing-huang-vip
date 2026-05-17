import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { FEATURED_CARDS } from '../data/mockData';

export function FeaturedCards() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#F8FAFC] uppercase tracking-wider">Featured Matches</h2>
        <button className="text-xs text-[#38BDF8] hover:underline" data-testid="button-view-all-featured">View All →</button>
      </div>
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex w-max space-x-3">
          {FEATURED_CARDS.map((card) => (
            <div 
              key={card.id}
              className="w-[280px] shrink-0 rounded-xl bg-[#18212B] bg-gradient-to-br from-[#18212B] to-[#121821] p-4 border border-[#253241] hover:border-[#38BDF8]/50 hover:shadow-[0_4px_24px_rgba(56,189,248,0.1)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col group"
            >
              <div className="mb-1">
                {card.title === 'ACCA BOOST' && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/30 text-[10px] font-bold uppercase tracking-wider">
                    {card.title}
                  </span>
                )}
                {card.title === 'EARLY PAYOUT' && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 text-[10px] font-bold uppercase tracking-wider">
                    {card.title}
                  </span>
                )}
                {card.title !== 'ACCA BOOST' && card.title !== 'EARLY PAYOUT' && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#FACC15]/10 text-[#FACC15] border border-[#FACC15]/30 text-[10px] font-bold uppercase tracking-wider">
                    {card.title}
                  </span>
                )}
              </div>
              
              <div className="font-semibold text-sm text-[#F8FAFC] mt-2 mb-2 whitespace-normal leading-snug">
                {card.subtitle}
              </div>
              
              {card.selections && card.selections.length > 0 && (
                <div className="space-y-1.5 mt-1 mb-3">
                  {card.selections.map((sel, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#94A3B8] whitespace-normal leading-tight">
                      <div className="w-3 h-3 rounded-full border border-[#00DFA9]/40 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]"/>
                      </div>
                      {sel}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-auto pt-3 border-t border-[#253241] flex items-end justify-between">
                <div className="flex flex-col">
                  {card.boostLabel && (
                    <span className="text-[10px] font-bold text-[#00DFA9]">{card.boostLabel}</span>
                  )}
                  {card.returnExample && (
                    <span className="text-[10px] text-[#94A3B8]">{card.returnExample}</span>
                  )}
                </div>
                <span className={`text-2xl font-black ${card.title === 'ACCA BOOST' ? 'text-[#00DFA9]' : 'text-[#FACC15]'}`}>
                  {card.odds}
                </span>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
