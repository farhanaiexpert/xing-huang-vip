import { useState } from 'react';
import { useBetSlip } from '../hooks/useBetSlip';
import { useWallet } from '../hooks/useWallet';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { formatOdds } from '../lib/oddsFormat';
import { BetConfirmationModal, BetConfirmation } from './BetConfirmationModal';
import { ConnectWalletModal } from './ConnectWalletModal';
import { cn } from '../lib/utils';
import { X, Trash2, Target, TrendingUp, Wallet, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Selection } from '../types';

export function BetSlip({ className, forceExpanded, isScrolled: isScrolledProp }: { className?: string; forceExpanded?: boolean; isScrolled?: boolean }) {
  const {
    selections, betType, setBetType,
    stake, setStake,
    singleStakes, setSingleStake,
    removeSelection, clearSlip,
    totalOdds, accaReturn, totalSingleReturn, totalSingleStaked,
  } = useBetSlip();

  const { isConnected } = useWallet();
  const [isWalletOpen,   setIsWalletOpen]   = useState(false);
  const [confirmation,   setConfirmation]   = useState<BetConfirmation | null>(null);
  const isScrolled = !forceExpanded && !!isScrolledProp;
  const [compactExpanded, setCompactExpanded] = useState(false);

  const hasSelections = selections.length > 0;

  // ── Place bet ──────────────────────────────────────────────────
  function handlePlaceBet() {
    if (!isConnected) { setIsWalletOpen(true); return; }

    const stakeNum   = betType === 'acca' ? parseFloat(stake || '0') : totalSingleStaked;
    const payout     = betType === 'acca' ? accaReturn : totalSingleReturn;
    const odds       = betType === 'acca' ? totalOdds  : (stakeNum > 0 ? payout / stakeNum : 1);

    if (stakeNum <= 0) return;

    setConfirmation({
      betId:           `#BET-${Math.floor(Math.random() * 90000 + 10000)}`,
      betType,
      selections:      [...selections],
      stake:           stakeNum,
      totalOdds:       odds,
      estimatedPayout: payout,
      placedAt:        new Date(),
    });
  }

  function handleConfirmationClose() {
    setConfirmation(null);
    clearSlip();
  }

  // ── Bet logic ─────────────────────────────────────────────────
  const accaStakeNum     = parseFloat(stake || '0');
  const canPlaceAcca     = isConnected && betType === 'acca'   && accaStakeNum > 0 && hasSelections;
  const canPlaceSingle   = isConnected && betType === 'single' && totalSingleStaked > 0 && hasSelections;
  const canPlace         = canPlaceAcca || canPlaceSingle;
  const readyToStake     = hasSelections;

  // ── Compact floating card (shown when scrolled) ─────────────────
  if (isScrolled && !forceExpanded) {
    return (
      <>
        <aside className="w-[244px] fixed right-3 top-[4.25rem] hidden xl:flex flex-col z-50 rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)] bg-[#121821]/96 backdrop-blur-xl border border-[#253241]/80 transition-all duration-300">

          {/* Compact header */}
          <div className="flex items-center justify-between px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg flex items-center justify-center overflow-hidden bg-[#00DFA9]/10">
                <img src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/soccer.png" alt="" className="w-4 h-4 object-contain" />
              </div>
              <span className="text-[12px] font-semibold text-[#F8FAFC] tracking-tight">Bet Slip</span>
              {hasSelections && (
                <span className="text-[9px] font-bold bg-[#00DFA9] text-[#0B0F14] px-1.5 py-0.5 rounded-full leading-none tabular-nums">
                  {selections.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasSelections && (
                <button onClick={clearSlip} className="p-1 rounded-lg text-[#94A3B8]/50 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all">
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
              <button onClick={() => setCompactExpanded(p => !p)} className="p-1 rounded-lg text-[#94A3B8]/50 hover:text-[#F8FAFC] hover:bg-[#253241]/50 transition-all">
                {compactExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Compact body */}
          {!hasSelections ? (
            compactExpanded && (
              <div className="px-3.5 pb-3.5 border-t border-[#253241]/50">
                <p className="text-[11px] text-[#94A3B8]/50 text-center pt-3">Pick a selection to start</p>
              </div>
            )
          ) : (
            <div className="border-t border-[#253241]/50">
              {/* Quick stats row */}
              <div className="flex items-center gap-2 px-3.5 py-2">
                <span className="text-[10px] text-[#94A3B8]/60">{selections.length} selection{selections.length !== 1 ? 's' : ''}</span>
                <div className="flex-1 h-px bg-[#253241]/40" />
                {betType === 'acca' && totalOdds > 1 && (
                  <span className="text-[10px] font-bold text-[#00DFA9]">{totalOdds.toFixed(2)}x</span>
                )}
              </div>

              {compactExpanded && (
                <div className="px-3.5 pb-3.5 space-y-2.5">
                  {/* Type toggle */}
                  <div className="flex rounded-xl bg-[#0B0F14]/80 border border-[#253241]/60 p-0.5 gap-0.5">
                    {(['acca', 'single'] as const).map(type => (
                      <button key={type} onClick={() => setBetType(type)}
                        className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all',
                          betType === type ? 'bg-[#18212B] text-[#F8FAFC] shadow-sm' : 'text-[#94A3B8]/50 hover:text-[#94A3B8]'
                        )}>
                        {type === 'single' ? 'Singles' : 'Acca'}
                      </button>
                    ))}
                  </div>

                  {/* Stake */}
                  {betType === 'acca' ? (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#94A3B8]/50 font-medium pointer-events-none">£</span>
                        <Input type="number" placeholder="0.00" value={stake} onChange={e => setStake(e.target.value)}
                          className="pl-6 h-8 text-[12px] bg-[#0B0F14] border-[#253241]/60 text-[#F8FAFC] rounded-xl focus-visible:ring-1 focus-visible:ring-[#00DFA9]/40" />
                      </div>
                      {accaReturn > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-[#94A3B8]/50">Est. Return</span>
                          <span className="text-[11px] font-bold text-[#00DFA9]">£{accaReturn.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    totalSingleStaked > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#94A3B8]/50">Total staked</span>
                        <span className="text-[11px] font-bold text-[#F8FAFC]">£{totalSingleStaked.toFixed(2)}</span>
                      </div>
                    )
                  )}

                  {/* Place bet */}
                  <button onClick={handlePlaceBet} disabled={!canPlace}
                    className={cn('w-full py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200',
                      canPlace
                        ? 'bg-[#00DFA9] text-[#0B0F14] hover:brightness-110 shadow-[0_0_16px_rgba(0,223,169,0.25)]'
                        : 'bg-[#253241]/30 text-[#94A3B8]/30 cursor-not-allowed'
                    )}>
                    {isConnected ? 'Place Bet' : 'Connect Wallet'}
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Modals */}
        {isWalletOpen && <ConnectWalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />}
        {confirmation && <BetConfirmationModal confirmation={confirmation} onClose={handleConfirmationClose} />}
      </>
    );
  }

  return (
    <aside className={cn(
      'w-[260px] shrink-0 flex-col h-[calc(100vh-3.5rem)] fixed right-0 top-14 hidden xl:flex border-t border-[#253241]',
      'bg-[#0D1117] border-l border-[#253241]',
      className
    )}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#253241] bg-gradient-to-b from-[#121821] to-[#0D1117] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden bg-[#00DFA9]/10">
            <img src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/soccer.png" alt="" className="w-5 h-5 object-contain" />
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
              {(['acca', 'single'] as const).map(type => (
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

            {/* Acca warning when only 1 selection */}
            {betType === 'acca' && selections.length === 1 && (
              <div className="mt-2 flex items-start gap-1.5 text-[10px] text-[#FACC15]/80 bg-[#FACC15]/5 border border-[#FACC15]/15 rounded-lg px-2.5 py-2">
                <AlertCircle className="h-3 w-3 shrink-0 mt-px" />
                <span>Add more selections to build an accumulator</span>
              </div>
            )}
          </div>

          {betType === 'single' ? (
            <SingleView
              selections={selections}
              singleStakes={singleStakes}
              setSingleStake={setSingleStake}
              removeSelection={removeSelection}
              totalSingleStaked={totalSingleStaked}
              totalSingleReturn={totalSingleReturn}
              isConnected={isConnected}
              canPlace={canPlaceSingle}
              onConnectWallet={() => setIsWalletOpen(true)}
              onPlaceBet={handlePlaceBet}
            />
          ) : (
            <AccaView
              selections={selections}
              removeSelection={removeSelection}
              totalOdds={totalOdds}
              stake={stake}
              setStake={setStake}
              accaReturn={accaReturn}
              isConnected={isConnected}
              canPlace={canPlaceAcca}
              readyToStake={readyToStake}
              onConnectWallet={() => setIsWalletOpen(true)}
              onPlaceBet={handlePlaceBet}
            />
          )}
        </>
      )}

      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
      <BetConfirmationModal confirmation={confirmation} onClose={handleConfirmationClose} />
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────
// SINGLE VIEW
// ────────────────────────────────────────────────────────────────
function SingleView({
  selections, singleStakes, setSingleStake, removeSelection,
  totalSingleStaked, totalSingleReturn, isConnected, canPlace,
  onConnectWallet, onPlaceBet,
}: {
  selections: Selection[];
  singleStakes: Record<string, string>;
  setSingleStake: (id: string, v: string) => void;
  removeSelection: (id: string) => void;
  totalSingleStaked: number;
  totalSingleReturn: number;
  isConnected: boolean;
  canPlace: boolean;
  onConnectWallet: () => void;
  onPlaceBet: () => void;
}) {
  return (
    <>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-2">
          {selections.map(sel => {
            const st  = parseFloat(singleStakes[sel.id] || '0');
            const ret = st > 0 ? (st * sel.odds).toFixed(2) : null;
            return (
              <SelectionCard
                key={sel.id}
                sel={sel}
                onRemove={() => removeSelection(sel.id)}
                extra={
                  <div className="flex items-center gap-2 mt-2">
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
                    <div className="text-right shrink-0 w-[64px]">
                      <p className="text-[9px] text-[#94A3B8]/60 leading-none mb-0.5">Return</p>
                      <p className={cn('text-xs font-bold leading-none', ret ? 'text-[#22C55E]' : 'text-[#94A3B8]/40')}>
                        {ret ? `$${ret}` : '—'}
                      </p>
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      </ScrollArea>

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
        <ActionButton
          isConnected={isConnected}
          canPlace={canPlace}
          onConnectWallet={onConnectWallet}
          onPlaceBet={onPlaceBet}
          hasStake={totalSingleStaked > 0}
        />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// ACCA VIEW
// ────────────────────────────────────────────────────────────────
function AccaView({
  selections, removeSelection, totalOdds, stake, setStake,
  accaReturn, isConnected, canPlace, readyToStake, onConnectWallet, onPlaceBet,
}: {
  selections: Selection[];
  removeSelection: (id: string) => void;
  totalOdds: number;
  stake: string;
  setStake: (v: string) => void;
  accaReturn: number;
  isConnected: boolean;
  canPlace: boolean;
  readyToStake: boolean;
  onConnectWallet: () => void;
  onPlaceBet: () => void;
}) {
  const stakeNum = parseFloat(stake || '0');
  return (
    <>
      {/* Bet type label */}
      <div className="px-4 pt-2.5 pb-1 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]/50">
          {selections.length > 1 ? `${selections.length}-Fold Accumulator` : 'Single'}
        </span>
        <div className="flex-1 h-px bg-[#253241]" />
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1.5 py-2">
          {selections.map(sel => (
            <SelectionCard key={sel.id} sel={sel} compact onRemove={() => removeSelection(sel.id)} />
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-[#253241] bg-gradient-to-b from-[#121821] to-[#0D1117] p-4 space-y-3">
        {/* Odds + return summary */}
        <div className="rounded-xl bg-[#0B0F14] border border-[#253241] px-3 py-2.5 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[#94A3B8]">Combined Odds</span>
            <span className="text-sm font-bold text-[#FACC15]">
              {selections.length > 1 ? totalOdds.toFixed(2) : selections[0]?.odds.toFixed(2) ?? '—'}
            </span>
          </div>
          <div className="h-px bg-[#253241]" />
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[#94A3B8]">Potential Returns</span>
            <span className={cn('text-sm font-bold transition-colors', accaReturn > 0 ? 'text-[#22C55E]' : 'text-[#94A3B8]/40')}>
              {accaReturn > 0 ? `$${accaReturn.toFixed(2)}` : '—'}
            </span>
          </div>
        </div>

        {/* Stake */}
        <div className="space-y-1.5">
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
          {/* Quick stake presets */}
          <div className="grid grid-cols-4 gap-1">
            {[5, 10, 25, 50].map(amt => (
              <button
                key={amt}
                onClick={() => setStake(String(amt))}
                className={cn(
                  'h-7 rounded-lg text-[11px] font-semibold border transition-all duration-150',
                  stake === String(amt)
                    ? 'bg-[#00DFA9]/10 border-[#00DFA9]/40 text-[#00DFA9]'
                    : 'bg-[#0B0F14] border-[#253241] text-[#94A3B8] hover:border-[#00DFA9]/30 hover:text-[#00DFA9]/80'
                )}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        <ActionButton
          isConnected={isConnected}
          canPlace={canPlace}
          onConnectWallet={onConnectWallet}
          onPlaceBet={onPlaceBet}
          hasStake={stakeNum > 0}
        />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// SELECTION CARD
// ────────────────────────────────────────────────────────────────
function SelectionCard({
  sel, onRemove, compact = false, extra,
}: {
  sel: Selection;
  onRemove: () => void;
  compact?: boolean;
  extra?: React.ReactNode;
}) {
  const { format } = useOddsFormat();
  return (
    <div className={cn(
      'relative rounded-xl border transition-colors group/card',
      compact
        ? 'bg-[#0B0F14] border-[#253241] px-3 py-2 hover:border-[#2E3D50]'
        : 'bg-gradient-to-br from-[#18212B] to-[#121821] border-[#253241] hover:border-[#2E3D50] p-3'
    )}>
      {/* League pill */}
      {sel.leagueName && (
        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]/50 leading-none truncate">
            {sel.leagueName}
          </span>
          {sel.marketName && (
            <>
              <span className="text-[#253241] text-[9px]">·</span>
              <span className="text-[9px] font-medium text-[#94A3B8]/40 leading-none truncate">{sel.marketName}</span>
            </>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[#94A3B8] truncate leading-none mb-0.5">{sel.matchName}</p>
          <p className={cn('font-semibold leading-none', compact ? 'text-xs text-[#F8FAFC]' : 'text-[13px] text-[#F8FAFC]')}>
            {sel.selectionName || sel.selectionType}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('font-black text-[#FACC15] leading-none tabular-nums', compact ? 'text-sm' : 'text-base')}>
            {formatOdds(sel.odds, format)}
          </span>
          <button
            onClick={onRemove}
            data-testid={`button-remove-selection-${sel.id}`}
            className="p-1 rounded text-[#94A3B8]/40 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {extra}

      {/* Bottom glow accent on cards */}
      {!compact && (
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00DFA9]/12 to-transparent" />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// ACTION BUTTON (Place Bet / Connect Wallet / Enter Stake)
// ────────────────────────────────────────────────────────────────
function ActionButton({
  isConnected, canPlace, hasStake, onConnectWallet, onPlaceBet,
}: {
  isConnected: boolean;
  canPlace: boolean;
  hasStake: boolean;
  onConnectWallet: () => void;
  onPlaceBet: () => void;
}) {
  if (!isConnected) {
    return (
      <button
        onClick={onConnectWallet}
        data-testid="button-connect-wallet-slip"
        className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#00DFA9] text-[#0B0F14] hover:shadow-[0_0_28px_rgba(0,223,169,0.55),0_0_60px_rgba(0,223,169,0.2)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 cursor-pointer"
      >
        <Wallet className="h-4 w-4 shrink-0" />
        Connect Wallet to Bet
      </button>
    );
  }

  if (!hasStake) {
    return (
      <button
        disabled
        data-testid="button-place-bet"
        className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#1E2A38] text-[#94A3B8]/40 cursor-not-allowed"
      >
        Enter Stake to Continue
      </button>
    );
  }

  return (
    <button
      onClick={onPlaceBet}
      data-testid="button-place-bet"
      className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#00DFA9] text-[#0B0F14] hover:shadow-[0_0_28px_rgba(0,223,169,0.55),0_0_60px_rgba(0,223,169,0.2)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 cursor-pointer"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      Place Bet {canPlace ? '' : ''}
    </button>
  );
}

// ────────────────────────────────────────────────────────────────
// EMPTY STATE
// ────────────────────────────────────────────────────────────────
function EmptyState() {
  const { isConnected, shortAddress, walletName } = useWallet();
  const [isWalletOpen, setIsWalletOpen] = useState(false);

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

      {/* Wallet status */}
      {isConnected ? (
        <div className="w-full mb-4 flex items-center gap-2 bg-[#00DFA9]/5 border border-[#00DFA9]/15 rounded-lg px-3 py-2.5">
          <span className="w-2 h-2 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.8)] shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider font-medium leading-none">{walletName}</p>
            <p className="text-[11px] font-mono font-semibold text-[#00DFA9] leading-none mt-0.5">{shortAddress}</p>
          </div>
          <CheckCircle2 className="h-3.5 w-3.5 text-[#00DFA9] ml-auto shrink-0" />
        </div>
      ) : (
        <button
          onClick={() => setIsWalletOpen(true)}
          className="w-full mb-4 flex items-center gap-2 bg-[#121821] border border-[#253241] rounded-lg px-3 py-2.5 text-sm font-medium text-[#94A3B8] hover:bg-[#18212B] hover:text-[#F8FAFC] hover:border-[#2E3D50] transition-all"
        >
          <Wallet className="h-4 w-4 text-[#94A3B8]/50 shrink-0" />
          Connect wallet to place bets
        </button>
      )}

      {/* Ghost selection rows */}
      <div className="w-full space-y-2 mb-4">
        {[{ odds: '1.85', w: 20 }, { odds: '3.40', w: 14 }].map((item, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#121821] border border-[#253241]/40 opacity-25">
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

      <ConnectWalletModal open={isWalletOpen} onOpenChange={setIsWalletOpen} />
    </div>
  );
}
