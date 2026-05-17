import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { FEATURED_CARDS } from '../data/mockData';
import { cn } from '../lib/utils';
import { Zap } from 'lucide-react';

export function FeaturedCards() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-white">Featured Offers</h2>
      </div>
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex w-max space-x-4">
          {FEATURED_CARDS.map((card) => (
            <div 
              key={card.id}
              className={cn(
                "w-72 shrink-0 rounded-xl p-5 border border-border shadow-lg relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors",
                `bg-gradient-to-br ${card.bgGradient}`
              )}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              <div className="relative z-10">
                <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  {card.title}
                </div>
                <div className="font-medium text-white mb-4 whitespace-normal line-clamp-2">
                  {card.subtitle}
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-xs text-white/70">Boosted to</span>
                  <span className="text-2xl font-black text-white">{card.odds}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
