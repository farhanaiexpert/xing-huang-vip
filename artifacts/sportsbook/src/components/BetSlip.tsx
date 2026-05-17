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
    <aside className={cn("w-64 flex-col bg-[#121821] border-l border-[#253241] h-[calc(100vh-3.5rem)] sticky top-14 hidden xl:flex", className)}>
      <div className="flex items-center justify-between p-3 border-b border-[#253241] bg-[#0B0F14]">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-[#00DFA9]" />
          <h2 className="font-semibold text-sm text-[#F8FAFC]">Bet Slip</h2>
          {selections.length > 0 && (
            <span className="bg-[#00DFA9] text-[#0B0F14] text-[10px] font-bold px-1.5 py-0.5 rounded">
              {selections.length}
            </span>
          )}
        </div>
        {selections.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearSlip} className="h-7 w-7 text-[#94A3B8] hover:text-[#EF4444] hover:bg-transparent">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {selections.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-xl bg-[#18212B] flex items-center justify-center mb-3">
            <Receipt className="h-7 w-7 text-[#94A3B8]" />
          </div>
          <p className="text-xs text-[#94A3B8]">Select odds to build your bet slip</p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="p-3">
              {selections.map((selection) => (
                <div key={selection.id} className="bg-[#18212B] rounded-lg p-2.5 border border-[#253241] relative group mb-2">
                  <button 
                    onClick={() => removeSelection(selection.id)}
                    className="absolute right-2 top-2 text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="text-[10px] text-[#94A3B8] mb-1 pr-5 truncate">{selection.matchName}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[#F8FAFC]">{selection.selectionType}</span>
                    <span className="text-sm font-bold text-[#00DFA9]">{selection.odds.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-[#253241] bg-[#0B0F14] space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs items-center">
                <span className="text-[#94A3B8]">Total Odds</span>
                <span className="font-bold text-sm text-[#FACC15]">{totalOdds.toFixed(2)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">$</span>
                <Input
                  type="number"
                  placeholder="Stake"
                  className="pl-7 h-9 bg-[#18212B] border-[#253241] focus-visible:ring-[#00DFA9] text-[#F8FAFC] text-sm rounded-lg"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                />
              </div>
              <div className="flex justify-between text-xs items-center pt-1">
                <span className="text-[#94A3B8]">Est. Return</span>
                <span className="font-bold text-[#00DFA9]">${potentialReturn}</span>
              </div>
            </div>

            <Button 
              className="w-full bg-[#00DFA9] hover:bg-[#00DFA9]/90 text-[#0B0F14] font-bold h-10 text-sm rounded-lg transition-colors disabled:opacity-40"
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