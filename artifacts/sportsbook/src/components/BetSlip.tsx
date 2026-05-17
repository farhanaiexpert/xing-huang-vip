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
    <aside className={cn("w-72 flex-col bg-[#1B352D] border-l border-border h-[calc(100vh-4rem)] sticky top-16 hidden xl:flex", className)}>
      <div className="flex items-center justify-between p-4 border-b border-border bg-black/20">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">Bet Slip</h2>
          {selections.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {selections.length}
            </span>
          )}
        </div>
        {selections.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearSlip} className="h-8 w-8 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selections.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <Receipt className="h-8 w-8 opacity-20" />
          </div>
          <p className="text-sm">Your bet slip is empty. Click on odds to add selections.</p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {selections.map((selection) => (
                <div key={selection.id} className="bg-background rounded-md p-3 border border-border relative group">
                  <button 
                    onClick={() => removeSelection(selection.id)}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="text-xs text-muted-foreground mb-1 pr-6 truncate">{selection.matchName}</div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-sm">{selection.selectionType}</span>
                    <span className="text-primary">{selection.odds.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border bg-black/20 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Odds</span>
                <span className="font-bold">{totalOdds.toFixed(2)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="Enter stake..."
                  className="pl-7 bg-background border-border focus-visible:ring-primary"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                />
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                <span className="font-medium">Est. Return</span>
                <span className="font-bold text-primary">${potentialReturn}</span>
              </div>
            </div>

            <Button 
              className="w-full bg-[#13644B] hover:bg-[#13644B]/90 text-white font-bold h-12"
              onClick={() => setIsWalletOpen(true)}
              disabled={!stake || parseFloat(stake) <= 0}
            >
              Connect Wallet to Place Bet
            </Button>
          </div>
        </>
      )}

      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    </aside>
  );
}
