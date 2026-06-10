import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { SportName } from './SportName';
import { Selection } from '../types';
import { Copy, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { Link } from 'wouter';

export interface BetConfirmation {
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
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-[#0D1117] border border-[#253241] shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
        <DialogTitle className="sr-only">Bet Placed Successfully</DialogTitle>

        {/* Top accent bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#00DFA9] via-[#00DFA9]/70 to-transparent" />

        {/* Success header */}
        <div className="flex flex-col items-center pt-7 pb-4 px-6 text-center">

          {/* Animated SVG checkmark */}
          <div className="relative mb-4" style={{ animation: 'checkPop 0.5s cubic-bezier(0.22,1,0.36,1) forwards' }}>
            <div className="absolute inset-0 rounded-full bg-[#00DFA9]/15 blur-2xl scale-[2]" />
            <svg
              width="72" height="72" viewBox="0 0 72 72"
              fill="none" className="relative"
            >
              {/* Glowing circle */}
              <circle
                cx="36" cy="36" r="26"
                stroke="#00DFA9" strokeWidth="2.5" strokeLinecap="round"
                fill="rgba(0,223,169,0.07)"
                strokeDasharray="166"
                style={{ animation: 'checkCircleDraw 0.5s ease-out 0.05s forwards', strokeDashoffset: 166 }}
              />
              {/* Tick mark */}
              <path
                d="M24 36.5L32.5 45L48 28"
                stroke="#00DFA9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="48"
                style={{ animation: 'checkTickDraw 0.35s ease-out 0.4s forwards', strokeDashoffset: 48 }}
              />
            </svg>
          </div>

          <h2 className="text-[22px] font-black text-[#F8FAFC] mb-1 tracking-tight">Bet Placed!</h2>
          <p className="text-sm text-[#94A3B8]">
            Your {betType === 'acca'
              ? `${selections.length}-fold accumulator`
              : 'single'} bet is confirmed
          </p>

          {/* Bet ID chip */}
          <button
            onClick={handleCopyId}
            className={cn(
              'mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-150',
              'bg-[#121821] border border-[#253241] hover:border-[#00DFA9]/40 group',
              copied && 'border-[#00DFA9]/40 bg-[#00DFA9]/5'
            )}
          >
            <span className={cn('transition-colors', copied ? 'text-[#00DFA9]' : 'text-[#94A3B8]/70 group-hover:text-[#00DFA9]')}>
              {betId}
            </span>
            {copied
              ? <span className="text-[#00DFA9] text-[10px] font-sans font-semibold">Copied!</span>
              : <Copy className="h-3 w-3 text-[#94A3B8]/40 group-hover:text-[#00DFA9]/70 transition-colors" />
            }
          </button>

          <p className="text-[10px] text-[#94A3B8]/40 mt-1.5">
            {placedAt.toLocaleString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Bet type badge */}
        <div className="px-5 mb-3">
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
        <div className="px-5 space-y-1.5 mb-4 max-h-[160px] overflow-y-auto">
          {selections.map(sel => (
            <div
              key={sel.id}
              className="flex items-center justify-between gap-2 bg-[#121821] border border-[#253241] rounded-lg px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                {sel.leagueName && (
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]/50 leading-none mb-0.5">
                    <SportName name={sel.leagueName} />
                  </p>
                )}
                <p className="text-[11px] font-medium text-[#94A3B8] truncate leading-none mb-0.5">
                  {sel.matchName}
                </p>
                <p className="text-xs font-semibold text-[#F8FAFC] leading-none">
                  {sel.selectionName || sel.selectionType}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[9px] text-[#94A3B8]/40 leading-none mb-0.5 uppercase tracking-wider">Odds</p>
                <span className="text-sm font-black text-[#FACC15] tabular-nums">
                  {sel.odds.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary grid */}
        <div className="mx-5 mb-5 rounded-xl bg-[#0B0F14] border border-[#253241] overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-[#253241]">
            <SummaryCell label="Stake"      value={`${stake.toFixed(2)} USDT`} />
            <SummaryCell label="Total Odds" value={totalOdds.toFixed(2)}   highlight />
            <SummaryCell label="Est. Return" value={`${estimatedPayout.toFixed(2)} USDT`} />
          </div>
          <div className="border-t border-[#253241] px-4 py-2.5 flex items-center justify-between bg-[#22C55E]/5">
            <span className="text-[11px] font-medium text-[#94A3B8]">Potential Profit</span>
            <span className="text-sm font-black text-[#22C55E]">+{profit.toFixed(2)} USDT</span>
          </div>
        </div>

        {/* What happens next */}
        {(() => {
          const isAnyLive = selections.some(s => s.isLive);
          const kt = selections[0]?.kickoffTime;
          const timingLine = isAnyLive
            ? 'Match is in play — settlement expected within minutes of final whistle'
            : kt
              ? `Kicks off ${kt} — we'll settle as soon as the match ends`
              : 'Bet settles automatically once the match is over';
          return (
            <div className="mx-5 mb-4 rounded-xl bg-[#0B0F14] border border-[#253241]/60 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]/50 mb-2">What happens next</p>
              <div className="space-y-1.5 text-[11px] text-[#94A3B8]/70 leading-snug">
                <p className="flex items-start gap-1.5"><span className="text-[#00DFA9] shrink-0">✓</span> Your stake has been reserved and bet is confirmed</p>
                <p className="flex items-start gap-1.5"><span className={`shrink-0 ${isAnyLive ? 'text-[#EF4444]' : 'text-[#FACC15]'}`}>⏱</span> {timingLine}</p>
                <p className="flex items-start gap-1.5"><span className="text-[#00DFA9] shrink-0">✓</span> Winnings credited instantly to your wallet on settlement</p>
              </div>
            </div>
          );
        })()}

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <Link href="/bet-history" onClick={onClose}>
            <button className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-[#121821] border border-[#253241] text-sm font-medium text-[#94A3B8] hover:bg-[#18212B] hover:text-[#F8FAFC] hover:border-[#2E3D50] transition-all duration-150">
              View Bet History
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-[#00DFA9] text-[#0B0F14] text-sm font-black flex items-center justify-center gap-1.5 hover:shadow-[0_0_28px_rgba(0,223,169,0.5)] hover:scale-[1.015] active:scale-[0.98] transition-all duration-150"
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
