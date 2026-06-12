import { useEffect, useState, useCallback } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Zap, Clock, ChevronRight } from 'lucide-react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { API_BASE } from '@/lib/apiBase';

interface PriceBoost {
  id: number;
  title: string;
  matchId: string;
  matchName: string;
  leagueName: string;
  marketName: string;
  selectionName: string;
  originalOdds: string;
  boostedOdds: string;
  maxStake: string | null;
  expiresAt: string | null;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string | null;
  sportKey: string;
}

function useCountdown(expiresAt: string | null) {
  const getLeft = useCallback(() => {
    if (!expiresAt) return null;
    const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    if (diff === 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, [expiresAt]);

  const [left, setLeft] = useState(getLeft);
  useEffect(() => {
    const t = setInterval(() => setLeft(getLeft()), 1000);
    return () => clearInterval(t);
  }, [getLeft]);
  return left;
}

function BoostCard({ boost }: { boost: PriceBoost }) {
  const { hasSelection, addSelection, removeSelection } = useBetSlip();
  const countdown = useCountdown(boost.expiresAt);
  const selId     = `boost-${boost.id}`;
  const isSelected = hasSelection(selId);
  const origOdds   = parseFloat(boost.originalOdds);
  const bstOdds    = parseFloat(boost.boostedOdds);
  const uplift     = Math.round(((bstOdds - origOdds) / origOdds) * 100);

  function handleClick() {
    if (isSelected) {
      removeSelection(selId);
      return;
    }

    // Parse home/away from "Team A vs Team B" if not stored explicitly
    const parts = boost.matchName.split(/\s+vs\.?\s+/i);
    const homeTeam = boost.homeTeam || (parts[0] ?? '').trim();
    const awayTeam = boost.awayTeam || (parts[1] ?? '').trim();

    addSelection({
      id:           selId,
      marketId:     `boost-market-${boost.id}`,
      matchId:      boost.matchId || selId,
      matchName:    boost.matchName,
      leagueName:   boost.leagueName || '',
      marketName:   boost.marketName,
      selectionType: 'boost',
      selectionName: boost.selectionName,
      odds:         bstOdds,
      sportKey:     boost.sportKey || 'soccer',
      homeTeam,
      awayTeam,
      commenceTime: boost.commenceTime
        || boost.expiresAt
        || new Date(Date.now() + 3_600_000).toISOString(),
      isBoost:      true,
      originalOdds: origOdds,
    });
    toast.success('Added to bet slip', {
      description: `${boost.selectionName} @ ${bstOdds.toFixed(2)}`,
    });
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'shrink-0 w-[200px] rounded-2xl border p-3 text-left transition-all duration-200 relative overflow-hidden',
        isSelected
          ? 'bg-[#00DFA9]/10 border-[#00DFA9]/40 shadow-[0_0_16px_rgba(0,223,169,0.2)]'
          : 'bg-[#0E1520] border-white/[0.07] hover:border-[#FACC15]/30 hover:bg-[#141C28]'
      )}
    >
      {/* Gold glow top bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FACC15]/80 via-[#FACC15] to-[#FACC15]/80" />

      {/* Top row: BOOST badge + countdown */}
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/20 px-1.5 py-0.5 rounded-full">
          <Zap className="h-2.5 w-2.5" />
          Boosted
        </span>
        {countdown && (
          <span className="flex items-center gap-0.5 text-[9px] text-[#94A3B8]/50">
            <Clock className="h-2.5 w-2.5" />
            {countdown}
          </span>
        )}
      </div>

      {/* Match name */}
      <p className="text-[10px] text-[#94A3B8]/60 truncate mb-0.5">{boost.matchName}</p>

      {/* Selection name */}
      <p className="text-[12px] font-bold text-[#F8FAFC] truncate mb-2">{boost.selectionName}</p>

      {/* Odds row */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#94A3B8]/40 line-through">{origOdds.toFixed(2)}</span>
        <span className={cn(
          'text-[18px] font-black tabular-nums',
          isSelected ? 'text-[#00DFA9]' : 'text-[#FACC15]'
        )}>
          {bstOdds.toFixed(2)}
        </span>
        {uplift > 0 && (
          <span className="ml-auto text-[9px] font-bold text-[#00DFA9] bg-[#00DFA9]/10 px-1 py-0.5 rounded-full">
            +{uplift}%
          </span>
        )}
      </div>

      {/* Max stake note */}
      {boost.maxStake && parseFloat(boost.maxStake) > 0 && (
        <p className="text-[9px] text-[#94A3B8]/40 mt-1.5">
          Max stake {parseFloat(boost.maxStake).toFixed(0)} USDT
        </p>
      )}

      {/* Selected CTA */}
      {isSelected ? (
        <p className="text-[9px] text-[#00DFA9] mt-1.5 font-bold">✓ In your bet slip</p>
      ) : (
        <p className="text-[9px] text-[#94A3B8]/40 mt-1.5 flex items-center gap-0.5">
          Tap to add <ChevronRight className="h-2.5 w-2.5" />
        </p>
      )}
    </button>
  );
}

export function PriceBoostsStrip() {
  const [boosts, setBoosts] = useState<PriceBoost[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/boosts/active`)
      .then(r => r.ok ? r.json() : [])
      .then(setBoosts)
      .catch(() => {});
  }, []);

  if (boosts.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-[#FACC15]" />
          <span className="text-[13px] font-bold text-[#F8FAFC]">Price Boosts</span>
        </div>
        <span className="text-[10px] text-[#94A3B8]/40 ml-0.5">Enhanced odds · limited time</span>
        <span className="ml-auto text-[10px] text-[#FACC15]/60 font-semibold">{boosts.length} live</span>
      </div>
      <ScrollArea className="w-full">
        <div className="flex gap-2.5 w-max pb-3">
          {boosts.map(b => <BoostCard key={b.id} boost={b} />)}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
