import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Star, Loader2, ExternalLink, Trophy } from 'lucide-react';

interface Spin {
  id: number;
  prizeAmount: string;
  prizeLabel: string;
  createdAt: string;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function prizeColor(label: string, amount: string) {
  const amt = parseFloat(amount);
  if (amt === 0) return '#64748B';
  if (amt >= 50)  return '#FACC15';
  if (amt >= 10)  return '#00DFA9';
  return '#38BDF8';
}

export function WinSpinHistoryPage() {
  const { isAuthenticated } = useAuth();
  const [spins, setSpins] = useState<Spin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get<Spin[]>('/winspin/history')
      .then(data => setSpins(data))
      .catch(() => setSpins([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const totalWon = spins.reduce((s, sp) => s + parseFloat(sp.prizeAmount), 0);
  const bestSpin = spins.reduce((best, sp) => {
    const a = parseFloat(sp.prizeAmount);
    return a > (best ? parseFloat(best.prizeAmount) : 0) ? sp : best;
  }, null as Spin | null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#F8FAFC]">WinSpin History</h2>
        <Link href="/winspin">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#FACC15] border border-[#FACC15]/25 bg-[#FACC15]/6 hover:bg-[#FACC15]/12 transition-all cursor-pointer">
            <Star className="h-3 w-3" />
            Spin Now
            <ExternalLink className="h-2.5 w-2.5" />
          </div>
        </Link>
      </div>

      {/* Summary */}
      {!loading && spins.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Spins', value: spins.length.toString(), color: '#38BDF8', suffix: '' },
            { label: 'Total Won',   value: `${totalWon.toFixed(2)}`, color: '#00DFA9', suffix: ' USDT' },
            { label: 'Best Prize',  value: bestSpin ? `${parseFloat(bestSpin.prizeAmount).toFixed(2)}` : '0.00', color: '#FACC15', suffix: ' USDT' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3.5 border border-white/[0.07] bg-[#0E1520] overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-[1.5px]"
                style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
              <p className="text-[18px] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#64748B] mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* History table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-[#FACC15] animate-spin" />
        </div>
      ) : spins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-full bg-[#FACC15]/8 border border-[#FACC15]/20 flex items-center justify-center">
            <Star className="h-7 w-7 text-[#FACC15]/40" />
          </div>
          <div className="text-center">
            <p className="text-[14px] text-[#94A3B8]/50">No spins yet</p>
            <p className="text-[12px] text-[#94A3B8]/30 mt-1">Try your luck on WinSpin</p>
          </div>
          <Link href="/winspin">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #FACC15 0%, #F59E0B 100%)' }}>
              <Star className="h-4 w-4" />
              Go to WinSpin
            </div>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-[#0A0F16]">
            <Star className="h-3 w-3 text-[#FACC15]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">{spins.length} spin{spins.length !== 1 ? 's' : ''}</p>
          </div>
          {spins.map((sp, i) => {
            const color = prizeColor(sp.prizeLabel, sp.prizeAmount);
            const amt   = parseFloat(sp.prizeAmount);
            return (
              <div key={sp.id} className={cn(
                'flex items-center gap-3 px-4 py-3.5',
                i > 0 && 'border-t border-white/[0.04]'
              )}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
                  {amt > 0
                    ? <Trophy className="h-3.5 w-3.5" style={{ color }} />
                    : <Star   className="h-3.5 w-3.5 text-[#64748B]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#F8FAFC]">{sp.prizeLabel}</p>
                  <p className="text-[10px] text-[#64748B]">{fmtDate(sp.createdAt)}</p>
                </div>
                <p className="text-[14px] font-black shrink-0" style={{ color }}>
                  {amt > 0 ? `+${amt.toFixed(2)} USDT` : 'No prize'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
