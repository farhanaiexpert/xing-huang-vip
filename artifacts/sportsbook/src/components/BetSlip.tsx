import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import { X, Receipt, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useState } from 'react';
import { ConnectWalletModal } from './ConnectWalletModal';

export function BetSlip({ className }: { className?: string }) {
  const { selections, stake, setStake, removeSelection, clearSlip } = useBetSlip();
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);
  const potentialReturn = (parseFloat(stake || '0') * totalOdds).toFixed(2);

  return (
    <aside className={cn("w-64 flex-col bg-[#1B352D] border-l border-[#111111] h-[calc(100vh-3rem)] sticky top-12 hidden xl:flex", className)}>
      <div className="flex items-center justify-between p-3 border-b border-[#111111] bg-black/10">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-[#00DFA9]" />
          <h2 className="font-bold text-base text-white">Bet Slip</h2>
          {selections.length > 0 && (
            <span className="bg-[#00DFA9] text-[#111111] text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
              {selections.length}
            </span>
          )}
        </div>
        {selections.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearSlip} className="h-7 w-7 text-white/50 hover:text-white">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {selections.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-white/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <Receipt className="h-5 w-5 opacity-50" />
          </div>
          <p className="text-xs">Your bet slip is empty. Click on odds to add selections.</p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1 bg-black/5">
            <div className="p-2 space-y-2">
              {selections.map((selection) => (
                <div key={selection.id} className="bg-[#111111] rounded p-2 border border-white/5 relative group">
                  <button 
                    onClick={() => removeSelection(selection.id)}
                    className="absolute right-1.5 top-1.5 text-white/30 hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="text-[10px] text-white/60 mb-0.5 pr-6 truncate">{selection.matchName}</div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-xs text-white">{selection.selectionType}</span>
                    <span className="text-sm text-[#00DFA9]">{selection.odds.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-[#111111] bg-gradient-to-b from-transparent to-black/20 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Total Odds</span>
                <span className="font-bold text-white">{totalOdds.toFixed(2)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <Input
                  type="number"
                  placeholder="Stake"
                  className="pl-6 h-8 bg-[#111111] border-transparent focus-visible:ring-[#00DFA9] text-white text-sm"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                />
              </div>
              <div className="flex justify-between text-xs pt-1.5">
                <span className="font-medium text-white/80">Est. Return</span>
                <span className="font-bold text-[#00DFA9]">${potentialReturn}</span>
              </div>
            </div>

            <Button 
              className="w-full bg-[#13644B] hover:bg-[#13644B]/90 text-white font-bold h-10 text-sm"
              onClick={() => setIsWalletOpen(true)}
              disabled={!stake || parseFloat(stake) <= 0}
            >
              Place Bet
            </Button>
          </div>
        </>
      )}

      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    </aside>
  );
}