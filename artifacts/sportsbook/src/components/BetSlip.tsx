import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import { X, Trash2, Wallet, Target, TrendingUp } from 'lucide-react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useState } from 'react';
import { ConnectWalletModal } from './ConnectWalletModal';

export function BetSlip({ className }: { className?: string }) {
  const { selections, stake, setStake, removeSelection, clearSlip } = useBetSlip();
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const totalOdds = selections.reduce((acc, curr) => acc * curr.odds, 1);
  const potentialReturn = (parseFloat(stake || '0') * totalOdds).toFixed(2);
  const hasStake = !!stake && parseFloat(stake) > 0;

  return (
    <aside className={cn(
      "w-[260px] shrink-0 flex-col h-[calc(100vh-3.5rem)] sticky top-14 hidden xl:flex",
      "bg-[#0D1117] border-l border-[#253241]",
      className
    )}>

      {/* Header */}
      <div className="
        flex items-center justify-between
        px-4 py-3
        border-b border-[#253241]
        bg-gradient-to-b from-[#121821] to-[#0D1117]
        shrink-0
      ">
        <div className="flex items-center gap-2.5">
          <div className="
            w-6 h-6 rounded-md flex items-center justify-center
            bg-[#00DFA9]/10 border border-[#00DFA9]/20
          ">
            <Target className="h-3.5 w-3.5 text-[#00DFA9]" />
          </div>
          <span className="text-sm font-semibold text-[#F8FAFC]">Bet Slip</span>
          {selections.length > 0 && (
            <span className="text-[10px] font-bold bg-[#00DFA9] text-[#0B0F14] px-1.5 py-0.5 rounded-full leading-none">
              {selections.length}
            </span>
          )}
        </div>
        {selections.length > 0 && (
          <button
            onClick={clearSlip}
            data-testid="button-clear-betslip"
            className="
              p-1.5 rounded-md
              text-[#94A3B8] hover:text-[#EF4444]
              hover:bg-[#EF4444]/10
              transition-all duration-150
            "
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Body */}
      {selections.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Bet type label */}
          <div className="px-4 pt-3 pb-1 flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]/50">
              Single Bet
            </span>
            <div className="flex-1 h-px bg-[#253241]" />
          </div>

          {/* Selections */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-2 py-2">
              {selections.map((selection) => (
                <div
                  key={selection.id}
                  className="
                    relative rounded-xl overflow-hidden
                    bg-gradient-to-br from-[#18212B] to-[#121821]
                    border border-[#253241]
                    hover:border-[#2E3D50]
                    transition-colors duration-150
                    p-3
                  "
                >
                  <button
                    onClick={() => removeSelection(selection.id)}
                    data-testid={`button-remove-selection-${selection.id}`}
                    className="
                      absolute right-2 top-2
                      p-1 rounded-md
                      text-[#94A3B8]/50 hover:text-[#EF4444]
                      hover:bg-[#EF4444]/10
                      transition-all duration-150
                    "
                  >
                    <X className="h-3 w-3" />
                  </button>

                  <p className="text-[10px] text-[#94A3B8] truncate pr-6 mb-2 leading-relaxed">
                    {selection.matchName}
                  </p>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#F8FAFC] leading-none">
                        {selection.selectionType}
                      </p>
                      <p className="text-[10px] text-[#94A3B8]/60 mt-0.5">Selection</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-[#FACC15] leading-none">
                        {selection.odds.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-[#94A3B8]/60 mt-0.5">Odds</p>
                    </div>
                  </div>

                  {/* Bottom accent */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00DFA9]/20 to-transparent" />
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Summary & CTA */}
          <div className="
            shrink-0 border-t border-[#253241]
            bg-gradient-to-b from-[#121821] to-[#0D1117]
            p-4 space-y-3
          ">
            {/* Odds/return summary */}
            <div className="rounded-xl bg-[#0B0F14] border border-[#253241] px-3 py-2.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#94A3B8]">Total Odds</span>
                <span className="text-sm font-bold text-[#FACC15]">{totalOdds.toFixed(2)}</span>
              </div>
              <div className="h-px bg-[#253241]" />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#94A3B8]">Est. Return</span>
                <span className={cn(
                  "text-sm font-bold transition-colors",
                  hasStake ? "text-[#22C55E]" : "text-[#94A3B8]/50"
                )}>
                  {hasStake ? `$${potentialReturn}` : '—'}
                </span>
              </div>
            </div>

            {/* Stake input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#94A3B8] z-10 pointer-events-none">
                $
              </span>
              <Input
                type="number"
                placeholder="Enter stake..."
                data-testid="input-stake"
                className="
                  pl-7 pr-3 h-10 rounded-lg text-sm
                  bg-[#0B0F14] border-[#253241] text-[#F8FAFC]
                  placeholder:text-[#94A3B8]/40
                  focus-visible:ring-1 focus-visible:ring-[#00DFA9]/50
                  focus-visible:border-[#00DFA9]/50
                  transition-all duration-200
                "
                value={stake}
                onChange={(e) => setStake(e.target.value)}
              />
            </div>

            {/* CTA */}
            <button
              onClick={() => setIsWalletOpen(true)}
              disabled={!hasStake}
              data-testid="button-place-bet"
              className={cn(
                "w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200",
                hasStake
                  ? [
                      "bg-[#00DFA9] text-[#0B0F14]",
                      "hover:shadow-[0_0_28px_rgba(0,223,169,0.55),0_0_60px_rgba(0,223,169,0.2)]",
                      "hover:scale-[1.02] active:scale-[0.97]",
                      "cursor-pointer",
                    ].join(" ")
                  : "bg-[#1E2A38] text-[#94A3B8]/40 cursor-not-allowed"
              )}
            >
              <Wallet className="h-4 w-4 shrink-0" />
              {hasStake ? 'Connect Wallet to Bet' : 'Enter Stake to Continue'}
            </button>
          </div>
        </>
      )}

      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 pb-4 text-center">
      {/* Icon treatment */}
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-[#00DFA9]/5 blur-2xl scale-[2]" />
        <div className="
          relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center
          bg-gradient-to-br from-[#18212B] to-[#121821]
          border border-[#253241]
          shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.4)]
        ">
          <TrendingUp className="h-8 w-8 text-[#94A3B8]/35" />
        </div>
        {/* Accent badge */}
        <div className="
          absolute -top-2 -right-2 w-5 h-5 rounded-full
          bg-[#0B0F14] border-2 border-[#00DFA9]/50
          flex items-center justify-center
          shadow-[0_0_10px_rgba(0,223,169,0.4)]
        ">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]" />
        </div>
      </div>

      <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5 leading-tight">
        Slip is empty
      </p>
      <p className="text-xs text-[#94A3B8]/70 leading-relaxed max-w-[170px] mb-6">
        Select any odds from the matches to start building your bet
      </p>

      {/* Ghost bet cards */}
      <div className="w-full space-y-2 mb-5">
        {[
          { odds: '1.85', label: 'Home Win' },
          { odds: '3.40', label: 'Draw' },
        ].map((item, i) => (
          <div
            key={i}
            className="
              flex items-center justify-between
              px-3 py-2.5 rounded-xl
              bg-[#121821] border border-[#253241]/40
              opacity-30
            "
          >
            <div className="flex flex-col items-start gap-1">
              <div className="h-1.5 w-20 rounded-full bg-[#253241]" />
              <div className="h-1.5 w-12 rounded-full bg-[#253241]/50" />
            </div>
            <div className="
              h-9 w-12 rounded-lg
              bg-[#0B0F14] border border-[#253241]
              flex items-center justify-center
              text-sm font-bold text-[#FACC15]
            ">
              {item.odds}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#94A3B8]/40 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00DFA9] shadow-[0_0_5px_rgba(0,223,169,0.8)]" />
        Click any odds button to add
      </p>
    </div>
  );
}
