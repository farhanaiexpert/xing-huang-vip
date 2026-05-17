import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import { X, Receipt, Trash2, Wallet } from 'lucide-react';
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
          <h2 className="font-semibold text-sm text-[#F8FAFC]">Bet Slip</h2>
          {selections.length > 0 && (
            <span className="bg-[#00DFA9] text-[#0B0F14] text-[10px] font-bold px-2 py-0.5 rounded-full">
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
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
          {/* Decorative ticket icon container */}
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#18212B] to-[#121821] border border-[#253241] flex items-center justify-center">
              <Receipt className="h-7 w-7 text-[#94A3B8]" />
            </div>
            {/* Decorative dots */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#00DFA9]/20 border border-[#00DFA9]/40" />
          </div>
          <p className="text-sm font-semibold text-[#F8FAFC] mb-1">Your bet slip is empty</p>
          <p className="text-xs text-[#94A3B8] leading-relaxed max-w-[160px]">Select odds from any match to start building your bet</p>
          {/* Quick picks hint */}
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]" />
            Tap any odds button to add
          </div>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="p-3">
              {selections.map((selection) => (
                <div key={selection.id} className="bg-[#0B0F14] rounded-lg p-3 border border-[#253241] relative group mb-2">
                  <button 
                    onClick={() => removeSelection(selection.id)}
                    className="absolute right-2 top-2 text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="text-[10px] text-[#94A3B8] mb-1 pr-6 truncate flex items-center gap-1">
                    {selection.matchName}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#F8FAFC] mt-0.5">{selection.selectionType}</span>
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm font-medium z-10">$</span>
                <Input
                  type="number"
                  placeholder="Stake"
                  className="pl-8 pr-3 h-10 bg-[#0B0F14] border-[#253241] focus-visible:ring-1 focus-visible:ring-[#00DFA9]/50 focus-visible:border-[#00DFA9]/60 text-[#F8FAFC] text-sm rounded-lg"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                />
              </div>
              <div className="flex justify-between text-xs items-center pt-1">
                <span className="text-[#94A3B8]">Est. Return</span>
                <span className="font-bold text-sm text-[#22C55E]">${potentialReturn}</span>
              </div>
            </div>

            <Button 
              className="w-full h-11 rounded-xl bg-[#00DFA9] text-[#0B0F14] font-bold text-sm transition-all hover:bg-[#00DFA9]/90 hover:shadow-[0_0_20px_rgba(0,223,169,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
              onClick={() => setIsWalletOpen(true)}
              disabled={!stake || parseFloat(stake) <= 0}
            >
              <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
            </Button>
          </div>
        </>
      )}

      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    </aside>
  );
}
