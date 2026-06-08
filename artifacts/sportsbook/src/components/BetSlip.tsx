import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { requestDeposit } from '../lib/depositGate';
import { useBetSlip } from '../hooks/useBetSlip';
import { useWallet } from '../hooks/useWallet';
import { useOddsFormat } from '../hooks/useOddsFormat';
import { useBetHistory } from '../hooks/useBetHistory';
import { formatOdds } from '../lib/oddsFormat';
import { BetConfirmationModal, BetConfirmation } from './BetConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { cn } from '../lib/utils';
import { X, Trash2, Target, TrendingUp, Wallet, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useBetSlipSidebar } from '../contexts/BetSlipSidebarContext';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Selection } from '../types';
import { useToast } from '../hooks/use-toast';
import { ConnectWalletModal } from './ConnectWalletModal';

export function BetSlip({ className, forceExpanded, isScrolled: isScrolledProp }: { className?: string; forceExpanded?: boolean; isScrolled?: boolean }) {
  const {
    selections, betType, setBetType,
    stake, setStake,
    singleStakes, setSingleStake,
    removeSelection, clearSlip,
    totalOdds, accaReturn, totalSingleReturn, totalSingleStaked,
    oddsChanges, acceptOddsChanges,
  } = useBetSlip();

  const { isConnected, balance, bonusBalance, refreshBalance, connect } = useWallet();
  const totalBalance = balance + bonusBalance;
  const { isAuthenticated } = useAuth();
  const { addBet, refresh: refreshBetHistory } = useBetHistory();
  const { toast } = useToast();
  const [isPlacing,       setIsPlacing]      = useState(false);
  const [confirmation,    setConfirmation]   = useState<BetConfirmation | null>(null);
  const [depositOpen,     setDepositOpen]    = useState(false);
  const [driftPending,    setDriftPending]   = useState(false);
  const [removingIds,     setRemovingIds]    = useState<Set<string>>(new Set());
  const [lastAddedId,     setLastAddedId]    = useState<string | null>(null);
  const prevSelectionIdsRef = useRef<string[]>([]);
  const isScrolled = !forceExpanded && !!isScrolledProp;
  const [compactExpanded, setCompactExpanded] = useState(false);
  const { collapsed, toggle: toggleCollapsed } = useBetSlipSidebar();

  const hasSelections = selections.length > 0;

  // ── Place bet ──────────────────────────────────────────────────
  async function handlePlaceBet(skipDriftCheck = false) {
    if (!isAuthenticated) {
      window.dispatchEvent(new Event('openLoginModal'));
      return;
    }

    if (!skipDriftCheck && Object.keys(oddsChanges).length > 0) {
      setDriftPending(true);
      return;
    }

    if (betType === 'acca') {
      // ── Accumulator: single API call with all selections ──
      const stakeNum = parseFloat(stake || '0');
      const payout   = accaReturn;
      const odds     = totalOdds;
      if (stakeNum <= 0 || totalBalance <= 0 || stakeNum > totalBalance) return;

      setIsPlacing(true);
      try {
        const placed_bet = await api.post<{ id: number }>('/bets', {
          type: 'accumulator',
          stake: stakeNum,
          selections: selections.map(s => ({
            eventId:          s.matchId,
            eventName:        s.matchName,
            sportKey:         s.sportKey ?? s.sportId ?? "",
            homeTeam:         s.homeTeam ?? "",
            awayTeam:         s.awayTeam ?? "",
            commenceTime:     s.commenceTime,
            marketType:       s.marketName,
            selection:        s.selectionName,
            odds:             s.odds,
            point:            s.point,
            isLive:           s.isLive ?? false,
            scoreAtPlacement: s.scoreAtPlacement,
          })),
        });

        await Promise.all([refreshBalance(), refreshBetHistory()]);

        const placed: BetConfirmation = {
          betId:           `#BET-${placed_bet.id}`,
          betType,
          selections:      [...selections],
          stake:           stakeNum,
          totalOdds:       odds,
          estimatedPayout: payout,
          placedAt:        new Date(),
        };
        addBet(placed);
        setConfirmation(placed);
      } catch (err) {
        const raw = err instanceof Error ? err.message : 'Could not place bet';
        const isAuthErr = /authorization|unauthorized|401/i.test(raw);
        toast({
          title: 'Bet failed',
          description: isAuthErr ? 'Your session has expired. Please log in again.' : raw,
          variant: 'destructive',
        });
      } finally {
        setIsPlacing(false);
      }
    } else {
      // ── Singles: one independent API call per selection ──
      const validSels = selections.filter(s => parseFloat(singleStakes[s.id] || '0') > 0);
      if (validSels.length === 0 || totalBalance <= 0 || totalSingleStaked > totalBalance) return;

      setIsPlacing(true);
      try {
        const results = await Promise.allSettled(
          validSels.map(s => {
            const selStake = parseFloat(singleStakes[s.id] || '0');
            return api.post<{ id: number }>('/bets', {
              type: 'single',
              stake: selStake,
              selections: [{
                eventId:          s.matchId,
                eventName:        s.matchName,
                sportKey:         s.sportKey ?? s.sportId ?? "",
                homeTeam:         s.homeTeam ?? "",
                awayTeam:         s.awayTeam ?? "",
                commenceTime:     s.commenceTime,
                marketType:       s.marketName,
                selection:        s.selectionName,
                odds:             s.odds,
                point:            s.point,
                isLive:           s.isLive ?? false,
                scoreAtPlacement: s.scoreAtPlacement,
              }],
            });
          }),
        );

        const succeeded: { sel: Selection; betId: number }[] = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') succeeded.push({ sel: validSels[i], betId: r.value.id });
        });
        const failedCount = results.length - succeeded.length;

        if (failedCount > 0) {
          toast({
            title: failedCount === results.length ? 'All bets failed' : `${failedCount} bet${failedCount > 1 ? 's' : ''} failed`,
            description: failedCount === results.length
              ? 'Could not place any bets. Please try again.'
              : `${succeeded.length} of ${results.length} bets placed successfully.`,
            variant: 'destructive',
          });
        }

        if (succeeded.length > 0) {
          await Promise.all([refreshBalance(), refreshBetHistory()]);

          const combinedStake  = succeeded.reduce((acc, { sel }) => acc + parseFloat(singleStakes[sel.id] || '0'), 0);
          const combinedReturn = succeeded.reduce((acc, { sel }) => acc + parseFloat(singleStakes[sel.id] || '0') * sel.odds, 0);

          const placed: BetConfirmation = {
            betId:           succeeded.length === 1 ? `#BET-${succeeded[0].betId}` : `${succeeded.length} Singles`,
            betType:         'single',
            selections:      succeeded.map(({ sel }) => sel),
            stake:           combinedStake,
            totalOdds:       combinedStake > 0 ? combinedReturn / combinedStake : 1,
            estimatedPayout: combinedReturn,
            placedAt:        new Date(),
          };
          addBet(placed);
          setConfirmation(placed);
        }
      } catch (err) {
        const raw = err instanceof Error ? err.message : 'Could not place bet';
        const isAuthErr = /authorization|unauthorized|401/i.test(raw);
        toast({
          title: 'Bet failed',
          description: isAuthErr ? 'Your session has expired. Please log in again.' : raw,
          variant: 'destructive',
        });
      } finally {
        setIsPlacing(false);
      }
    }
  }

  function handleConfirmationClose() {
    setConfirmation(null);
    clearSlip();
  }

  // Animated remove — plays exit animation then removes from context
  function handleRemoveSelection(id: string) {
    setRemovingIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      removeSelection(id);
      setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 230);
  }

  // Track the most-recently-added selection id for auto-focusing its stake input
  useEffect(() => {
    const prevIds = prevSelectionIdsRef.current;
    const currentIds = selections.map(s => s.id);
    const newId = currentIds.find(id => !prevIds.includes(id));
    prevSelectionIdsRef.current = currentIds;
    if (newId) setLastAddedId(newId);
  }, [selections]);

  // ── Bet logic ─────────────────────────────────────────────────
  const accaStakeNum     = parseFloat(stake || '0');
  const canPlaceAcca     = isAuthenticated && betType === 'acca'   && accaStakeNum > 0 && hasSelections && totalBalance > 0 && accaStakeNum <= totalBalance;
  const canPlaceSingle   = isAuthenticated && betType === 'single' && totalSingleStaked > 0 && hasSelections && totalBalance > 0 && totalSingleStaked <= totalBalance;
  const canPlace         = canPlaceAcca || canPlaceSingle;
  const readyToStake     = hasSelections;

  // ── Collapsed strip (user explicitly hid the sidebar) ─────────────
  if (collapsed && !forceExpanded) {
    return (
      <aside className="w-14 shrink-0 flex flex-col items-center py-3 gap-3 h-[calc(100vh-3.5rem)] fixed right-0 top-14 hidden xl:flex border-l border-t border-[#253241] bg-[#0D1117] z-40">
        {/* Expand button */}
        <button
          onClick={toggleCollapsed}
          title="Expand Bet Slip"
          className="p-2 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#18212B] transition-all duration-150"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Icon + count badge */}
        <div className="relative">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#00DFA9]/10 border border-[#00DFA9]/20">
            <img
              src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/soccer.png"
              alt=""
              className="w-5 h-5 object-contain"
            />
          </div>
          {hasSelections && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-[#00DFA9] text-[#0B0F14] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none tabular-nums">
              {selections.length}
            </span>
          )}
        </div>

        {/* Vertical label */}
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#94A3B8]/30 select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Bet Slip
          </span>
        </div>

        {confirmation && <BetConfirmationModal confirmation={confirmation} onClose={handleConfirmationClose} />}
      </aside>
    );
  }

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
                        <Input type="number" placeholder="0.00" value={stake} onChange={e => setStake(e.target.value)}
                          className="pl-3 h-8 text-[12px] bg-[#0B0F14] border-[#253241]/60 text-[#F8FAFC] rounded-xl focus-visible:ring-1 focus-visible:ring-[#00DFA9]/40" />
                      </div>
                      {accaReturn > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-[#94A3B8]/50">Est. Return</span>
                          <span className="text-[11px] font-bold text-[#00DFA9]">{accaReturn.toFixed(2)} USDT</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    totalSingleStaked > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-[#94A3B8]/50">Total staked</span>
                        <span className="text-[11px] font-bold text-[#F8FAFC]">{totalSingleStaked.toFixed(2)} USDT</span>
                      </div>
                    )
                  )}

                  {/* Place bet */}
                  <button onClick={() => handlePlaceBet()} disabled={!canPlace}
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
        {confirmation && <BetConfirmationModal confirmation={confirmation} onClose={handleConfirmationClose} />}
      </>
    );
  }

  return (
    <aside className={cn(
      'relative',
      forceExpanded
        ? 'flex flex-col w-full h-full overflow-hidden'
        : 'w-[260px] shrink-0 flex flex-col h-[calc(100vh-3.5rem)] fixed right-0 top-14 hidden xl:flex border-t border-[#253241] overflow-hidden',
      'bg-[#0D1117] border-l border-[#253241]',
      className
    )}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-0 border-b border-[#253241] bg-gradient-to-b from-[#121821] to-[#0D1117] shrink-0">

        {/* Row 1: title + trash */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center overflow-hidden bg-[#00DFA9]/10">
              <img src="https://media.ourwebprojects.pro/wp-content/uploads/2026/05/soccer.png" alt="" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-sm font-semibold text-[#F8FAFC] leading-none">Bet Slip</span>
            {hasSelections && (
              <span className="text-[10px] font-bold bg-[#00DFA9] text-[#0B0F14] px-1.5 py-0.5 rounded-full leading-none shrink-0">
                {selections.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {hasSelections && (
              <button
                onClick={clearSlip}
                data-testid="button-clear-betslip"
                className="shrink-0 p-1.5 rounded-md text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all duration-150"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            {!forceExpanded && (
              <button
                onClick={toggleCollapsed}
                title="Collapse Bet Slip"
                className="shrink-0 p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#18212B] transition-all duration-150"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: balance + top-up (only when connected) */}
        {isConnected && (
          <div className="flex items-center gap-2 pb-2.5">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-1 min-w-0',
              totalBalance > 0
                ? 'bg-[#00DFA9]/8 border-[#00DFA9]/20 text-[#00DFA9]'
                : 'bg-[#FACC15]/6 border-[#FACC15]/20 text-[#FACC15]'
            )}>
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-bold tabular-nums leading-none block">
                  {totalBalance.toFixed(2)} USDT
                </span>
                {bonusBalance > 0 && (
                  <span className="text-[9px] text-[#FACC15]/70 leading-none block mt-0.5">
                    incl. {bonusBalance.toFixed(2)} bonus
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setDepositOpen(true)}
              className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-[#00DFA9] text-[#0B0F14] px-3 py-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all leading-none"
            >
              <Plus className="h-3 w-3" />
              Top Up
            </button>
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
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
              removeSelection={handleRemoveSelection}
              removingIds={removingIds}
              newSelectionId={lastAddedId}
              totalSingleStaked={totalSingleStaked}
              totalSingleReturn={totalSingleReturn}
              isConnected={isConnected}
              isAuthenticated={isAuthenticated}
              balance={totalBalance}
              canPlace={canPlaceSingle}
              isPlacing={isPlacing}
              onConnectWallet={() => { if (!isAuthenticated) { window.dispatchEvent(new Event('openLoginModal')); } else { setDepositOpen(true); } }}
              onPlaceBet={handlePlaceBet}
            />
          ) : (
            <AccaView
              selections={selections}
              removeSelection={handleRemoveSelection}
              removingIds={removingIds}
              totalOdds={totalOdds}
              stake={stake}
              setStake={setStake}
              accaReturn={accaReturn}
              isConnected={isConnected}
              isAuthenticated={isAuthenticated}
              balance={totalBalance}
              canPlace={canPlaceAcca}
              readyToStake={readyToStake}
              isPlacing={isPlacing}
              onConnectWallet={() => { if (!isAuthenticated) { window.dispatchEvent(new Event('openLoginModal')); } else { setDepositOpen(true); } }}
              onPlaceBet={handlePlaceBet}
            />
          )}
        </>
      )}

      </div>

      {/* ── Odds drift overlay ────────────────────────────────────── */}
      {driftPending && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-[#0D1117]/95 backdrop-blur-sm">
          <div className="p-4 space-y-3">
            <div className="rounded-xl bg-[#FACC15]/8 border border-[#FACC15]/25 p-3.5">
              <div className="flex items-start gap-2.5 mb-3">
                <AlertCircle className="h-4 w-4 text-[#FACC15] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-[#FACC15]">Odds have moved</p>
                  <p className="text-[11px] text-[#94A3B8]/70 mt-0.5 leading-snug">
                    {Object.keys(oddsChanges).length} selection{Object.keys(oddsChanges).length !== 1 ? 's have' : ' has'} changed since you added {Object.keys(oddsChanges).length !== 1 ? 'them' : 'it'}.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(oddsChanges).map(([id, change]) => {
                  const sel = selections.find(s => s.id === id);
                  if (!sel) return null;
                  const isWorse = change.current < change.prev;
                  return (
                    <div key={id} className="flex items-center justify-between text-[11px]">
                      <span className="text-[#94A3B8]/70 truncate flex-1 mr-2">{sel.selectionName}</span>
                      <span className="flex items-center gap-1.5 font-mono shrink-0">
                        <span className="text-[#94A3B8]/50">{change.prev.toFixed(2)}</span>
                        <span className="text-[#94A3B8]/40">→</span>
                        <span className={cn('font-bold', isWorse ? 'text-[#EF4444]' : 'text-[#00DFA9]')}>{change.current.toFixed(2)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDriftPending(false)}
                className="flex-1 h-11 rounded-xl border border-[#253241] text-[13px] font-semibold text-[#94A3B8] hover:bg-[#18212B] hover:text-[#F8FAFC] transition-all duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => { acceptOddsChanges(); setDriftPending(false); handlePlaceBet(true); }}
                className="flex-1 h-11 rounded-xl bg-[#FACC15] text-[#0B0F14] text-[13px] font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept & Place
              </button>
            </div>
          </div>
        </div>
      )}

      <BetConfirmationModal confirmation={confirmation} onClose={handleConfirmationClose} />
      <ConnectWalletModal open={depositOpen} onOpenChange={setDepositOpen} />
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────
// SINGLE VIEW
// ────────────────────────────────────────────────────────────────
function SingleView({
  selections, singleStakes, setSingleStake, removeSelection, removingIds,
  newSelectionId, totalSingleStaked, totalSingleReturn, isConnected, isAuthenticated,
  balance, canPlace, isPlacing, onConnectWallet, onPlaceBet,
}: {
  selections: Selection[];
  singleStakes: Record<string, string>;
  setSingleStake: (id: string, v: string) => void;
  removeSelection: (id: string) => void;
  removingIds: Set<string>;
  newSelectionId?: string | null;
  totalSingleStaked: number;
  totalSingleReturn: number;
  isConnected: boolean;
  isAuthenticated: boolean;
  balance: number;
  canPlace: boolean;
  isPlacing: boolean;
  onConnectWallet: () => void;
  onPlaceBet: () => void;
}) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-focus the stake input for the most recently added selection
  useEffect(() => {
    if (!newSelectionId) return;
    const t = setTimeout(() => { inputRefs.current[newSelectionId]?.focus(); }, 160);
    return () => clearTimeout(t);
  }, [newSelectionId]);

  const totalProfit = totalSingleReturn - totalSingleStaked;

  // Compute why Place Bet is disabled (for the helper hint)
  let disabledHint: string | null = null;
  if (!canPlace) {
    if (!isAuthenticated) disabledHint = 'Log in to place bets';
    else if (totalSingleStaked <= 0) disabledHint = 'Enter a stake for at least one selection';
    else if (balance === 0) disabledHint = 'Insufficient balance — top up to bet';
    else if (totalSingleStaked > balance) disabledHint = `Total stake exceeds your balance (${balance.toFixed(2)} USDT)`;
  }

  return (
    <>
      <ScrollArea className="flex-1 min-h-0 px-3">
        <div className="space-y-2 py-2">
          {selections.map(sel => {
            const st  = parseFloat(singleStakes[sel.id] || '0');
            const ret = st > 0 ? (st * sel.odds).toFixed(2) : null;
            const profit = st > 0 ? (st * (sel.odds - 1)).toFixed(2) : null;
            return (
              <SelectionCard
                key={sel.id}
                sel={sel}
                isRemoving={removingIds.has(sel.id)}
                onRemove={() => removeSelection(sel.id)}
                extra={
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          placeholder="Stake USDT"
                          className="pl-3 pr-2 h-8 rounded-lg text-xs bg-[#0B0F14] border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-1 focus-visible:ring-[#00DFA9]/50 focus-visible:border-[#00DFA9]/50"
                          value={singleStakes[sel.id] || ''}
                          onChange={e => setSingleStake(sel.id, e.target.value)}
                          ref={(el: HTMLInputElement | null) => { inputRefs.current[sel.id] = el; }}
                        />
                      </div>
                      <div className="text-right shrink-0 w-[72px]">
                        <p className="text-[9px] text-[#94A3B8]/60 leading-none mb-0.5">Return · Profit</p>
                        <p className={cn('text-xs font-bold leading-none', ret ? 'text-[#F8FAFC]' : 'text-[#94A3B8]/40')}>
                          {ret ? `${ret} USDT` : '—'}
                        </p>
                        {profit && (
                          <p className="text-[9px] font-semibold text-[#00DFA9] leading-none mt-0.5">+{profit} USDT</p>
                        )}
                      </div>
                    </div>
                    {/* Quick-stake chips — each adds to current value */}
                    <div className="flex gap-1">
                      {[5, 10, 25, 50].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setSingleStake(sel.id, String(parseFloat(singleStakes[sel.id] || '0') + amt))}
                          className="flex-1 h-6 rounded-md text-[10px] font-semibold border bg-[#0B0F14] border-[#253241] text-[#94A3B8] hover:border-[#00DFA9]/30 hover:text-[#00DFA9]/80 transition-all duration-150"
                        >
                          +{amt}
                        </button>
                      ))}
                      <button
                        onClick={() => balance > 0 && setSingleStake(sel.id, balance.toFixed(2))}
                        disabled={balance <= 0}
                        className="flex-1 h-6 rounded-md text-[10px] font-semibold border bg-[#0B0F14] border-[#253241] text-[#94A3B8] hover:border-[#FACC15]/30 hover:text-[#FACC15]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                      >
                        Max
                      </button>
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
              {totalSingleStaked > 0 ? `${totalSingleStaked.toFixed(2)} USDT` : '—'}
            </span>
          </div>
          <div className="h-px bg-[#253241]" />
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[#94A3B8]">Total Return</span>
            <span className={cn('text-sm font-bold', totalSingleReturn > 0 ? 'text-[#F8FAFC]' : 'text-[#94A3B8]/40')}>
              {totalSingleReturn > 0 ? `${totalSingleReturn.toFixed(2)} USDT` : '—'}
            </span>
          </div>
          {totalProfit > 0 && (
            <>
              <div className="h-px bg-[#253241]" />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#94A3B8]">Profit if Win</span>
                <span className="text-sm font-bold text-[#00DFA9]">+{totalProfit.toFixed(2)} USDT</span>
              </div>
            </>
          )}
        </div>
        {isConnected && totalSingleStaked > 0 && balance === 0 && (
          <p className="text-[10px] text-[#EF4444] bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-lg px-2.5 py-1.5 text-center leading-snug">
            Insufficient balance. Please top up your account before placing a bet.
          </p>
        )}
        {isConnected && totalSingleStaked > balance && balance > 0 && (
          <p className="text-[10px] text-[#EF4444] bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-lg px-2.5 py-1.5 text-center leading-snug">
            Stake exceeds available balance ({balance.toFixed(2)} USDT). Please top up.
          </p>
        )}
        <ActionButton
          isConnected={isConnected}
          canPlace={canPlace}
          onConnectWallet={onConnectWallet}
          onPlaceBet={onPlaceBet}
          hasStake={totalSingleStaked > 0}
          isPlacing={isPlacing}
        />
        {disabledHint && (
          <p className="text-[10px] text-[#94A3B8]/50 text-center leading-snug -mt-1">{disabledHint}</p>
        )}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// ACCA VIEW
// ────────────────────────────────────────────────────────────────
function AccaView({
  selections, removeSelection, removingIds, totalOdds, stake, setStake,
  accaReturn, isConnected, isAuthenticated, balance, canPlace, readyToStake,
  isPlacing, onConnectWallet, onPlaceBet,
}: {
  selections: Selection[];
  removeSelection: (id: string) => void;
  removingIds: Set<string>;
  totalOdds: number;
  stake: string;
  setStake: (v: string) => void;
  accaReturn: number;
  isConnected: boolean;
  isAuthenticated: boolean;
  balance: number;
  canPlace: boolean;
  readyToStake: boolean;
  isPlacing: boolean;
  onConnectWallet: () => void;
  onPlaceBet: () => void;
}) {
  const stakeNum = parseFloat(stake || '0');

  // Compute why Place Bet is disabled
  let disabledHint: string | null = null;
  if (!canPlace) {
    if (!isAuthenticated) disabledHint = 'Log in to place bets';
    else if (stakeNum <= 0) disabledHint = 'Enter a stake amount to continue';
    else if (balance === 0) disabledHint = 'Insufficient balance — top up to bet';
    else if (stakeNum > balance) disabledHint = `Stake exceeds your balance (${balance.toFixed(2)} USDT)`;
    else if (selections.length < 2) disabledHint = 'Add at least 2 selections for an accumulator';
  }
  return (
    <>
      {/* Bet type label */}
      <div className="px-4 pt-2.5 pb-1 flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]/50">
          {selections.length > 1 ? `${selections.length}-Fold Accumulator` : 'Single'}
        </span>
        <div className="flex-1 h-px bg-[#253241]" />
      </div>

      <ScrollArea className="flex-1 min-h-0 px-3">
        <div className="space-y-1.5 py-2">
          {selections.map(sel => (
            <SelectionCard key={sel.id} sel={sel} compact isRemoving={removingIds.has(sel.id)} onRemove={() => removeSelection(sel.id)} />
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
            <span className="text-[11px] text-[#94A3B8]">Potential Return</span>
            <span className={cn('text-sm font-bold transition-colors', accaReturn > 0 ? 'text-[#F8FAFC]' : 'text-[#94A3B8]/40')}>
              {accaReturn > 0 ? `${accaReturn.toFixed(2)} USDT` : '—'}
            </span>
          </div>
          {accaReturn > 0 && stakeNum > 0 && (
            <>
              <div className="h-px bg-[#253241]" />
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#94A3B8]">Profit if Win</span>
                <span className="text-sm font-bold text-[#00DFA9]">+{(accaReturn - stakeNum).toFixed(2)} USDT</span>
              </div>
            </>
          )}
        </div>

        {/* Stake */}
        <div className="space-y-1.5">
          <div className="relative">
            <Input
              type="number"
              placeholder="Enter stake (USDT)…"
              data-testid="input-stake"
              className="pl-3 pr-3 h-10 rounded-lg text-sm bg-[#0B0F14] border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-1 focus-visible:ring-[#00DFA9]/50 focus-visible:border-[#00DFA9]/50 transition-all duration-200"
              value={stake}
              onChange={e => setStake(e.target.value)}
            />
          </div>
          {/* Quick stake presets — each adds to current value */}
          <div className="grid grid-cols-5 gap-1">
            {[5, 10, 25, 50].map(amt => (
              <button
                key={amt}
                onClick={() => setStake(String(parseFloat(stake || '0') + amt))}
                className="h-7 rounded-lg text-[11px] font-semibold border bg-[#0B0F14] border-[#253241] text-[#94A3B8] hover:border-[#00DFA9]/30 hover:text-[#00DFA9]/80 transition-all duration-150"
              >
                +{amt}
              </button>
            ))}
            <button
              onClick={() => balance > 0 && setStake(balance.toFixed(2))}
              disabled={balance <= 0}
              className="h-7 rounded-lg text-[11px] font-semibold border bg-[#0B0F14] border-[#253241] text-[#94A3B8] hover:border-[#FACC15]/30 hover:text-[#FACC15]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
            >
              Max
            </button>
          </div>
        </div>

        {isConnected && stakeNum > 0 && balance === 0 && (
          <p className="text-[10px] text-[#EF4444] bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-lg px-2.5 py-1.5 text-center leading-snug">
            Insufficient balance. Please top up your account before placing a bet.
          </p>
        )}
        {isConnected && stakeNum > balance && balance > 0 && (
          <p className="text-[10px] text-[#EF4444] bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-lg px-2.5 py-1.5 text-center leading-snug">
            Stake exceeds available balance ({balance.toFixed(2)} USDT). Please top up.
          </p>
        )}
        <ActionButton
          isConnected={isConnected}
          canPlace={canPlace}
          onConnectWallet={onConnectWallet}
          onPlaceBet={onPlaceBet}
          hasStake={stakeNum > 0}
          isPlacing={isPlacing}
        />
        {disabledHint && (
          <p className="text-[10px] text-[#94A3B8]/50 text-center leading-snug -mt-1">{disabledHint}</p>
        )}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// SELECTION CARD
// ────────────────────────────────────────────────────────────────
function SelectionCard({
  sel, onRemove, compact = false, extra, isRemoving = false,
}: {
  sel: Selection;
  onRemove: () => void;
  compact?: boolean;
  extra?: React.ReactNode;
  isRemoving?: boolean;
}) {
  const { format } = useOddsFormat();
  return (
    <div className={cn(
      'relative rounded-xl border transition-colors group/card w-full max-w-full overflow-hidden',
      isRemoving ? 'slip-sel-exit' : 'slip-sel-enter',
      compact
        ? 'bg-[#0B0F14] border-[#253241] px-3 py-2 hover:border-[#2E3D50]'
        : 'bg-gradient-to-br from-[#18212B] to-[#121821] border-[#253241] hover:border-[#2E3D50] p-3'
    )}>
      {/* Row 1 — league · market */}
      {sel.leagueName && (
        <p className="w-full text-[9px] font-bold uppercase tracking-wider text-[#94A3B8]/50 leading-snug mb-1 break-words [overflow-wrap:anywhere]">
          {sel.leagueName}{sel.marketName ? <span className="font-medium normal-case tracking-normal text-[#94A3B8]/40"> · {sel.marketName}</span> : null}
        </p>
      )}

      {/* Row 2 — match name + live badge + odds/remove pinned right */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0 flex items-start gap-1.5 flex-wrap">
          <p className="text-[11px] text-[#94A3B8] leading-snug break-words [overflow-wrap:anywhere]">
            {sel.matchName}
          </p>
          {sel.isLive && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-[#EF4444]/12 border border-[#EF4444]/25 text-[#EF4444] text-[8px] font-bold uppercase tracking-wider leading-none mt-px">
              <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 self-start">
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

      {/* Row 3 — selection / pick name */}
      <p className={cn(
        'w-full leading-snug break-words [overflow-wrap:anywhere]',
        compact ? 'text-xs font-semibold text-[#F8FAFC]' : 'text-[13px] font-semibold text-[#F8FAFC]'
      )}>
        {sel.selectionName || sel.selectionType}
      </p>

      {/* Row 4 — kickoff timing (only in full card mode) */}
      {!compact && (
        <p className="text-[9px] text-[#94A3B8]/40 mt-0.5 leading-none">
          {sel.isLive
            ? <span className="text-[#EF4444]/70">● In play</span>
            : sel.kickoffTime ?? 'TBC'}
        </p>
      )}

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
  isConnected, canPlace, hasStake, onConnectWallet, onPlaceBet, isPlacing = false,
}: {
  isConnected: boolean;
  canPlace: boolean;
  hasStake: boolean;
  onConnectWallet: () => void;
  onPlaceBet: () => void;
  isPlacing?: boolean;
}) {
  if (isPlacing) {
    return (
      <button
        disabled
        data-testid="button-place-bet"
        className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 bg-[#00DFA9] text-[#0B0F14] cursor-not-allowed opacity-90"
      >
        <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Placing Bet…
      </button>
    );
  }
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
      onClick={canPlace ? onPlaceBet : undefined}
      disabled={!canPlace}
      data-testid="button-place-bet"
      className={cn(
        'w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200',
        canPlace
          ? 'bg-[#00DFA9] text-[#0B0F14] hover:shadow-[0_0_28px_rgba(0,223,169,0.55),0_0_60px_rgba(0,223,169,0.2)] hover:scale-[1.02] active:scale-[0.97] cursor-pointer'
          : 'bg-[#1E2A38] text-[#94A3B8]/40 cursor-not-allowed'
      )}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      Place Bet
    </button>
  );
}

// ────────────────────────────────────────────────────────────────
// EMPTY STATE
// ────────────────────────────────────────────────────────────────
function EmptyState() {
  const { isConnected, shortAddress, walletName } = useWallet();
  const { isAuthenticated } = useAuth();
  const [connectOpen, setConnectOpen] = useState(false);
  const [, navigate] = useLocation();

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
          onClick={() => requestDeposit(isAuthenticated, navigate)}
          className="w-full mb-4 flex items-center gap-2 bg-[#121821] border border-[#253241] rounded-lg px-3 py-2.5 text-sm font-medium text-[#94A3B8] hover:bg-[#18212B] hover:text-[#F8FAFC] hover:border-[#2E3D50] transition-all"
        >
          <Wallet className="h-4 w-4 text-[#94A3B8]/50 shrink-0" />
          Top Up to place bets
        </button>
      )}
      <ConnectWalletModal open={connectOpen} onOpenChange={setConnectOpen} />

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

      <p className="text-[10px] text-[#94A3B8]/40 flex items-center gap-1.5 mb-4">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00DFA9] shadow-[0_0_5px_rgba(0,223,169,0.8)]" />
        Click any odds button to add
      </p>

      {/* Disabled Place Bet — visible when slip is empty so user sees the blocked reason */}
      <div className="w-full">
        <button
          disabled
          className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#1E2A38] text-[#94A3B8]/40 cursor-not-allowed"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Place Bet
        </button>
        <p className="text-[10px] text-[#94A3B8]/40 text-center mt-1.5 leading-snug">
          Add a selection to begin
        </p>
      </div>

    </div>
  );
}
