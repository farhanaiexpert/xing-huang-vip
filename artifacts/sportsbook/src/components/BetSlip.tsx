import { useBetSlip } from '../hooks/useBetSlip';
import { cn } from '../lib/utils';
import { X, Trash2, Wallet, Target, TrendingUp } from 'lucide-react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useState } from 'react';
import { ConnectWalletModal } from './ConnectWalletModal';

export function BetSlip({ className }: { className?: string }) {
  const {
    selections, betType, setBetType,
    stake, setStake,
    singleStakes, setSingleStake,
    addSelection: _add, removeSelection, clearSlip,
    hasSelection: _has,
    totalOdds, accaReturn, totalSingleReturn,
  } = useBetSlip();
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const hasSelections = selections.length > 0;

  // ── computed ──────────────────────────────────────────────────
  const hasAccaStake  = !!stake && parseFloat(stake) > 0;
  const totalSingleStaked = selections.reduce(
    (s, sel) => s + parseFloat(singleStakes[sel.id] || '0'), 0
  );
  const canPlaceSingle = betType === 'single' && totalSingleStaked > 0;
  const canPlaceAcca   = betType === 'acca'   && hasAccaStake;
  const canPlace = canPlaceSingle || canPlaceAcca;

  return (
    <aside className={cn(
      'w-[260px] shrink-0 flex-col h-[calc(100vh-3.5rem)] sticky top-14 hidden xl:flex',
      'bg-[#0D1117] border-l border-[#253241]',
      className
    )}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#253241] bg-gradient-to-b from-[#121821] to-[#0D1117] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-[#00DFA9]/10 border border-[#00DFA9]/20">
            <Target className="h-3.5 w-3.5 text-[#00DFA9]" />
          </div>
          <span className="text-sm font-semibold text-[#F8FAFC]">Bet Slip</span>
          {hasSelections && (
            <span className="text-[10px] font-bold bg-[#00DFA9] text-[#0B0F14] px-1.5 py-0.5 rounded-full leading-none">
              {selections.length}
            </span>
          )}
        </div>
        {hasSelections && (
          <button
            onClick={clearSlip}
            data-testid="button-clear-betslip"
            className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all duration-150"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      {!hasSelections ? (
        <EmptyState />
      ) : (
        <>
          {/* Single / Acca toggle */}
          <div className="px-3 pt-3 pb-0 shrink-0">
            <div className="flex rounded-lg bg-[#0B0F14] border border-[#253241] p-0.5 gap-0.5">
              {(['single', 'acca'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setBetType(type)}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-all duration-150',
                    betType === type
                      ? 'bg-[#18212B] text-[#F8FAFC] shadow-sm'
                      : 'text-[#94A3B8]/60 hover:text-[#94A3B8]'
                  )}
                >
                  {type === 'single' ? 'Single' : 'Accumulator'}
                </button>
              ))}
            </div>
          </div>

          {betType === 'single' ? (
            <SingleView
              selections={selections}
              singleStakes={singleStakes}
              setSingleStake={setSingleStake}
              removeSelection={removeSelection}
              totalSingleStaked={totalSingleStaked}
              totalSingleReturn={totalSingleReturn}
              canPlace={canPlaceSingle}
              onPlaceBet={() => setIsWalletOpen(true)}
            />
          ) : (
            <AccaView
              selections={selections}
              removeSelection={removeSelection}
              totalOdds={totalOdds}
              stake={stake}
              setStake={setStake}
              accaReturn={accaReturn}
              canPlace={canPlaceAcca}
              onPlaceBet={() => setIsWalletOpen(true)}
            />
          )}
        </>
      )}

      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────
// SINGLE VIEW
// ────────────────────────────────────────────────────────────────
function SingleView({
  selections, singleStakes, setSingleStake, removeSelection,
  totalSingleStaked, totalSingleReturn, canPlace, onPlaceBet,
}: {
  selections: ReturnType<typeof useBetSlip>['selections'];
  singleStakes: Record<string, string>;
  setSingleStake: (id: string, v: string) => void;
  removeSelection: (id: string) => void;
  totalSingleStaked: number;
  totalSingleReturn: number;
  canPlace: boolean;
  onPlaceBet: () => void;
}) {
  return (
    <>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-2">
          {selections.map(sel => {
            const st   = parseFloat(singleStakes[sel.id] || '0');
            const ret  = st > 0 ? (st * sel.odds).toFixed(2) : null;
            return (
              <div key={sel.id} className="rounded-xl bg-gradient-to-br from-[#18212B] to-[#121821] border border-[#253241] hover:border-[#2E3D50] transition-colors p-3">
                {/* top row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#94A3B8] truncate leading-relaxed">{sel.matchName}</p>
                    <p className="text-xs font-semibold text-[#F8FAFC] leading-none mt-0.5">{sel.selectionType}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-base font-black text-[#FACC15] leading-none">{sel.odds.toFixed(2)}</span>
                    <button
                      onClick={() => removeSelection(sel.id)}
                      data-testid={`button-remove-selection-${sel.id}`}
                      className="p-1 rounded text-[#94A3B8]/50 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* stake + return */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] z-10 pointer-events-none">$</span>
                    <Input
                      type="number"
                      placeholder="Stake"
                      className="pl-6 pr-2 h-8 rounded-lg text-xs bg-[#0B0F14] border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-1 focus-visible:ring-[#00DFA9]/50 focus-visible:border-[#00DFA9]/50"
                      value={singleStakes[sel.id] || ''}
                      onChange={e => setSingleStake(sel.id, e.target.value)}
                    />
                  </div>
                  <div className="text-right shrink-0 w-[60px]">
                    <p className="text-[9px] text-[#94A3B8]/60 leading-none mb-0.5">Return</p>
                    <p className={cn('text-xs font-bold leading-none', ret ? 'text-[#22C55E]' : 'text-[#94A3B8]/40')}>
                      {ret ? `$${ret}` : '—'}
                    </p>
                  </div>
                </div>

                {/* bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00DFA9]/15 to-transparent" />
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#253241] bg-gradient-to-b from-[#121821] to-[#0D1117] p-4 space-y-3">
        <div className="rounded-xl bg-[#0B0F14] border border-[#253241] px-3 py-2.5 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[#94A3B8]">Total Stake</span>
            <span className="text-sm font-bold text-[#F8FAFC]">
              {totalSingleStaked > 0 ? `$${totalSingleStaked.toFixed(2)}` : '—'}
            </span>
          </div>
          <div className="h-px bg-[#253241]" />
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[#94A3B8]">Total Return</span>
            <span className={cn('text-sm font-bold', totalSingleReturn > 0 ? 'text-[#22C55E]' : 'text-[#94A3B8]/40')}>
              {totalSingleReturn > 0 ? `$${totalSingleReturn.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>
        <PlaceBetButton canPlace={canPlace} onClick={onPlaceBet} />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// ACCA VIEW
// ────────────────────────────────────────────────────────────────
function AccaView({
  selections, removeSelection, totalOdds, stake, setStake,
  accaReturn, canPlace, onPlaceBet,
}: {
  selections: ReturnType<typeof useBetSlip>['selections'];
  removeSelection: (id: string) => void;
  totalOdds: number;
  stake: string;
  setStake: (v: string) => void;
  accaReturn: number;
  canPlace: boolean;
  onPlaceBet: () => void;
}) {
  return (
    <>
      {/* Bet type label */}
      <div className="px-4 pt-2.5 pb-1 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]/50">
          {selections.length}-Fold Accumulator
        </span>
        <div className="flex-1 h-px bg-[#253241]" />
      </div>

      {/* Selections — compact */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1.5 py-2">
          {selections.map(sel => (
            <div key={sel.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#0B0F14] border border-[#253241] px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#94A3B8] truncate leading-none mb-0.5">{sel.matchName}</p>
                <p className="text-xs font-semibold text-[#F8FAFC] leading-none truncate">{sel.selectionType}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-black text-[#FACC15]">{sel.odds.toFixed(2)}</span>
                <button
                  onClick={() => removeSelection(sel.id)}
                  data-testid={`button-remove-selection-${sel.id}`}
                  className="p-0.5 rounded text-[#94A3B8]/40 hover:text-[#EF4444] transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#253241] bg-gradient-to-b from-[#121821] to-[#0D1117] p-4 space-y-3">
        {/* Combined odds */}
        <div className="rounded-xl bg-[#0B0F14] border border-[#253241] px-3 py-2.5 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[#94A3B8]">Combined Odds</span>
            <span className="text-sm font-bold text-[#FACC15]">{totalOdds.toFixed(2)}</span>
          </div>
          <div className="h-px bg-[#253241]" />
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[#94A3B8]">Est. Return</span>
            <span className={cn('text-sm font-bold transition-colors', accaReturn > 0 ? 'text-[#22C55E]' : 'text-[#94A3B8]/40')}>
              {accaReturn > 0 ? `$${accaReturn.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>

        {/* Stake input */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#94A3B8] z-10 pointer-events-none">$</span>
          <Input
            type="number"
            placeholder="Enter stake…"
            data-testid="input-stake"
            className="pl-7 pr-3 h-10 rounded-lg text-sm bg-[#0B0F14] border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-1 focus-visible:ring-[#00DFA9]/50 focus-visible:border-[#00DFA9]/50 transition-all duration-200"
            value={stake}
            onChange={e => setStake(e.target.value)}
          />
        </div>

        <PlaceBetButton canPlace={canPlace} onClick={onPlaceBet} />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ────────────────────────────────────────────────────────────────
function PlaceBetButton({ canPlace, onClick }: { canPlace: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!canPlace}
      data-testid="button-place-bet"
      className={cn(
        'w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200',
        canPlace
          ? 'bg-[#00DFA9] text-[#0B0F14] hover:shadow-[0_0_28px_rgba(0,223,169,0.55),0_0_60px_rgba(0,223,169,0.2)] hover:scale-[1.02] active:scale-[0.97] cursor-pointer'
          : 'bg-[#1E2A38] text-[#94A3B8]/40 cursor-not-allowed'
      )}
    >
      <Wallet className="h-4 w-4 shrink-0" />
      {canPlace ? 'Connect Wallet to Bet' : 'Enter Stake to Continue'}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 pb-4 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-[#00DFA9]/5 blur-2xl scale-[2]" />
        <div className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#18212B] to-[#121821] border border-[#253241] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.4)]">
          <TrendingUp className="h-8 w-8 text-[#94A3B8]/35" />
        </div>
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0B0F14] border-2 border-[#00DFA9]/50 flex items-center justify-center shadow-[0_0_10px_rgba(0,223,169,0.4)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]" />
        </div>
      </div>

      <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5 leading-tight">Slip is empty</p>
      <p className="text-xs text-[#94A3B8]/70 leading-relaxed max-w-[170px] mb-6">
        Select any odds from the matches to start building your bet
      </p>

      <div className="w-full space-y-2 mb-5">
        {[{ odds: '1.85', w: 20 }, { odds: '3.40', w: 14 }].map((item, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#121821] border border-[#253241]/40 opacity-30">
            <div className="flex flex-col items-start gap-1">
              <div className="h-1.5 rounded-full bg-[#253241]" style={{ width: `${item.w * 4}px` }} />
              <div className="h-1.5 w-10 rounded-full bg-[#253241]/50" />
            </div>
            <div className="h-9 w-12 rounded-lg bg-[#0B0F14] border border-[#253241] flex items-center justify-center text-sm font-bold text-[#FACC15]">
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
