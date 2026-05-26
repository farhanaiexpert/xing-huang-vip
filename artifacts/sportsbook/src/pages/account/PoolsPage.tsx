import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { Trophy, Target, ExternalLink, ArrowRight, CheckCircle2, Clock, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface ApiPoolEntry {
  entryId: number;
  poolId: number;
  picks: Record<string, string>;
  entryCreatedAt: string;
  poolTitle: string;
  sport: string;
  status: string;
  prizePool: string;
  entryFee: string;
  deadline: string;
  settledAt: string | null;
  correctOutcome: string | null;
}

function getResult(entry: ApiPoolEntry): 'correct' | 'incorrect' | 'pending' {
  if (entry.status !== 'settled' || !entry.correctOutcome) return 'pending';
  const picks = Object.values(entry.picks ?? {});
  return picks.includes(entry.correctOutcome) ? 'correct' : 'incorrect';
}

function fmtDeadline(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d < now) return 'Closed';
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / 86400_000);
  const hrs  = Math.floor((diff % 86400_000) / 3600_000);
  if (days > 0) return `${days}d ${hrs}h`;
  return `${hrs}h`;
}

function fmtPrize(amount: string) {
  const n = parseFloat(amount);
  if (!n) return '—';
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`;
}

export function PoolsPage() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<ApiPoolEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    api.get<ApiPoolEntry[]>('/pools/my-entries')
      .then(data => { setEntries(data); setLoading(false); })
      .catch(() => { setApiError(true); setLoading(false); });
  }, [isAuthenticated]);

  const open     = entries.filter(e => e.status === 'open');
  const settled  = entries.filter(e => e.status === 'settled');
  const correct  = settled.filter(e => getResult(e) === 'correct').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#F8FAFC]">My Pool Entries</h2>
        <Link href="/prediction-pools">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#00DFA9] border border-[#00DFA9]/25 bg-[#00DFA9]/6 hover:bg-[#00DFA9]/12 transition-all cursor-pointer">
            <Trophy className="h-3 w-3" />
            Browse Pools
            <ExternalLink className="h-2.5 w-2.5" />
          </div>
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="h-5 w-5 text-[#00DFA9] animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && apiError && (
        <div className="rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/5 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-[#EF4444]/50 mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-[#F8FAFC]">Could not load your pool entries</p>
          <p className="text-[11px] text-[#64748B] mt-1">Please try again later.</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !apiError && entries.length === 0 && (
        <div className="rounded-2xl border border-[#00DFA9]/15 p-8 text-center"
          style={{ background: 'linear-gradient(135deg, #071A12 0%, #0B0F14 100%)' }}>
          <Trophy className="h-10 w-10 text-[#00DFA9]/30 mx-auto mb-3" />
          <p className="text-[14px] font-bold text-[#F8FAFC] mb-1.5">No pool entries yet</p>
          <p className="text-[12px] text-[#64748B] mb-4 leading-relaxed">
            Join free prediction pools, pick winners,<br />and share real USDT prize pots.
          </p>
          <Link href="/prediction-pools">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}>
              <Target className="h-4 w-4" />
              Browse Open Pools
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>
      )}

      {/* Summary stats */}
      {!loading && !apiError && entries.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Total Entries', value: entries.length, color: '#38BDF8' },
              { label: 'Open',          value: open.length,    color: '#FACC15' },
              { label: 'Correct',       value: correct,        color: '#00DFA9' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3.5 border border-white/[0.07] bg-[#0E1520] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1.5px]"
                  style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <p className="text-[20px] font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-[#64748B] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Open entries */}
          {open.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Active Predictions</p>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
                {open.map((entry, i) => {
                  const pickedValues = Object.values(entry.picks ?? {});
                  return (
                    <div key={entry.entryId} className={cn('flex items-center gap-3 px-4 py-3.5', i > 0 && 'border-t border-white/[0.04]')}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#F8FAFC] line-clamp-1">{entry.poolTitle}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          Sport: <span className="text-[#94A3B8]">{entry.sport}</span>
                          {pickedValues.length > 0 && (
                            <> · Pick: <span className="text-[#00DFA9] font-semibold">{pickedValues.join(', ')}</span></>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <p className="text-[11px] font-bold text-[#FACC15]">{fmtPrize(entry.prizePool)}</p>
                        <div className="flex items-center gap-1 justify-end text-[10px] text-[#64748B]">
                          <Clock className="h-2.5 w-2.5" />
                          {fmtDeadline(entry.deadline)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settled entries */}
          {settled.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">Settled Results</p>
              <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
                {settled.map((entry, i) => {
                  const result = getResult(entry);
                  const pickedValues = Object.values(entry.picks ?? {});
                  return (
                    <div key={entry.entryId} className={cn('flex items-center gap-3 px-4 py-3.5', i > 0 && 'border-t border-white/[0.04]')}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#F8FAFC] line-clamp-1">{entry.poolTitle}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          Your pick: <span className="font-semibold text-[#94A3B8]">{pickedValues.join(', ') || '—'}</span>
                          {result === 'incorrect' && entry.correctOutcome && (
                            <span> · Winner: <span className="text-[#00DFA9] font-semibold">{entry.correctOutcome}</span></span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {result === 'correct' ? (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#00DFA9]/12 text-[#00DFA9] border border-[#00DFA9]/25">
                            <CheckCircle2 className="h-3 w-3" /> Correct!
                          </span>
                        ) : result === 'incorrect' ? (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
                            <XCircle className="h-3 w-3" /> Incorrect
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-[#64748B] border border-white/[0.08]">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
