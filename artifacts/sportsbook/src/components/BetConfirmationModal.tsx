import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Selection } from '../types';
import { CheckCircle2, Copy, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

interface BetConfirmation {
  betId: string;
  betType: 'single' | 'acca';
  selections: Selection[];
  stake: number;
  totalOdds: number;
  estimatedPayout: number;
  placedAt: Date;
}

interface BetConfirmationModalProps {
  confirmation: BetConfirmation | null;
  onClose: () => void;
}

export function BetConfirmationModal({ confirmation, onClose }: BetConfirmationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!confirmation) return null;

  const { betId, betType, selections, stake, totalOdds, estimatedPayout, placedAt } = confirmation;
  const profit = estimatedPayout - stake;

  function handleCopyId() {
    navigator.clipboard.writeText(betId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={!!confirmation} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-[#0D1117] border border-[#253241] shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
        <DialogTitle className="sr-only">Bet Placed Successfully</DialogTitle>

        {/* Top accent */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#00DFA9] via-[#00DFA9]/80 to-transparent" />

        {/* Success header */}
        <div className="flex flex-col items-center pt-8 pb-5 px-6 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-[#00DFA9]/15 blur-xl scale-[1.8]" />
            <div className="relative w-16 h-16 rounded-full bg-[#00DFA9]/10 border-2 border-[#00DFA9]/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,223,169,0.3)]">
              <CheckCircle2 className="h-8 w-8 text-[#00DFA9]" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-[#F8FAFC] mb-1">Bet Placed!</h2>
          <p className="text-sm text-[#94A3B8]">
            Your {betType === 'acca' ? 'accumulator' : 'single'} bet has been confirmed
          </p>

          {/* Bet ID */}
          <button
            onClick={handleCopyId}
            className="mt-3 flex items-center gap-1.5 text-xs font-mono text-[#94A3B8]/70 hover:text-[#00DFA9] transition-colors group"
          >
            <span>{betId}</span>
            {copied
              ? <span className="text-[#00DFA9] text-[10px] font-sans font-medium">Copied!</span>
              : <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" />
            }
          </button>

          <p className="text-[10px] text-[#94A3B8]/40 mt-1">
            {placedAt.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Bet type badge */}
        <div className="px-6 mb-3">
          <span className={cn(
            'inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full',
            betType === 'acca'
              ? 'bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20'
              : 'bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/20'
          )}>
            {betType === 'acca' ? `${selections.length}-Fold Accumulator` : 'Single Bet'}
          </span>
        </div>

        {/* Selections */}
        <div className="px-6 space-y-1.5 mb-4 max-h-[180px] overflow-y-auto">
          {selections.map(sel => (
            <div
              key={sel.id}
              className="flex items-center justify-between gap-2 bg-[#121821] border border-[#253241] rounded-lg px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                {sel.leagueName && (
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 leading-none mb-0.5">
                    {sel.leagueName}
                  </p>
                )}
                <p className="text-[11px] font-medium text-[#94A3B8] truncate leading-none mb-0.5">
                  {sel.matchName}
                </p>
                <p className="text-xs font-semibold text-[#F8FAFC] leading-none">
                  {sel.selectionName || sel.selectionType}
                </p>
              </div>
              <span className="text-sm font-black text-[#FACC15] tabular-nums shrink-0">
                {sel.odds.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Summary grid */}
        <div className="mx-6 mb-6 rounded-xl bg-[#121821] border border-[#253241] overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-[#253241]">
            <SummaryCell label="Stake" value={`$${stake.toFixed(2)}`} />
            <SummaryCell label="Total Odds" value={totalOdds.toFixed(2)} highlight />
            <SummaryCell label="Est. Return" value={`$${estimatedPayout.toFixed(2)}`} />
          </div>
          <div className="border-t border-[#253241] px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] text-[#94A3B8]">Potential Profit</span>
            <span className="text-sm font-bold text-[#22C55E]">+${profit.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            disabled
            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-[#121821] border border-[#253241] text-sm font-medium text-[#94A3B8]/50 cursor-not-allowed"
          >
            <ExternalLink className="h-4 w-4" />
            View My Bets
            <span className="text-[9px] bg-[#253241] text-[#94A3B8]/40 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ml-1">Soon</span>
          </button>
          <button
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-[#00DFA9] text-[#0B0F14] text-sm font-bold flex items-center justify-center gap-1.5 hover:shadow-[0_0_24px_rgba(0,223,169,0.4)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-150"
          >
            Done
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center py-3 px-2 gap-0.5">
      <span className="text-[10px] text-[#94A3B8]/60 uppercase tracking-wider font-medium">{label}</span>
      <span className={cn(
        'text-sm font-bold tabular-nums leading-none',
        highlight ? 'text-[#FACC15]' : 'text-[#F8FAFC]'
      )}>
        {value}
      </span>
    </div>
  );
}

export type { BetConfirmation };
