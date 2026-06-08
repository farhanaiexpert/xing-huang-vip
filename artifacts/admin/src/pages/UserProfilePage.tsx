import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api, UserProfileStats, BetWithSelections, UserSession,
  UserReferralTree, UserPromoClaim, UserSpinRecord, UserNote, AdminTransaction,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, User, Ban, CheckCircle, KeyRound, DollarSign, Eye, EyeOff,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RefreshCw,
  MessageSquare, Trash2, Shield, Zap, Gift, Users, Clock, TrendingUp,
  AlertTriangle, Star, Flag, Headphones, Info, CheckCheck, Wallet, Copy, Check,
  ShieldCheck, ShieldX, RotateCcw, Network, ShieldAlert, X,
} from "lucide-react";

const inp = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] transition-colors";

const TAG_STYLES: Record<string, { label: string; color: string; icon: React.ComponentType<{className?: string}> }> = {
  general: { label: "General",  color: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20", icon: Info },
  warning: { label: "Warning",  color: "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20", icon: AlertTriangle },
  vip:     { label: "VIP",      color: "bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/20", icon: Star },
  fraud:   { label: "Fraud",    color: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20", icon: Flag },
  support: { label: "Support",  color: "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20", icon: Headphones },
};

function StatCard({ label, value, sub, accent = "#94A3B8" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#111827] border border-white/8 rounded-xl p-4">
      <p className="text-xs text-[#475569] mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-[11px] text-[#334155] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Bets Tab ────────────────────────────────────────────────────────────────
function BetsTab({ userId }: { userId: number }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<{ bets: BetWithSelections[]; total: number; pages: number }>({
    queryKey: ["profile-bets", userId, page, status],
    queryFn: () => api.get(`/admin/users/${userId}/bets?page=${page}&status=${status}`),
  });

  const settleMut = useMutation({
    mutationFn: ({ id, result }: { id: number; result: string }) =>
      api.patch(`/admin/bets/${id}/settle`, { status: result }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile-bets", userId] }); toast.success("Bet settled"); },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle(id: number) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  const statusFilters = ["all", "open", "won", "lost", "void"];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {statusFilters.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={cn("px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors",
              status === s ? "bg-[#00DFA9] text-[#0B0F14]" : "bg-white/5 text-[#94A3B8] hover:bg-white/10")}>
            {s}
          </button>
        ))}
        {data && <span className="ml-auto text-xs text-[#475569] self-center">{data.total} bets</span>}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-[#475569] text-sm">Loading…</div>
      ) : !data?.bets.length ? (
        <div className="text-center py-8 text-[#475569] text-sm">No bets found</div>
      ) : (
        <div className="space-y-2">
          {data.bets.map(b => (
            <div key={b.id} className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/2 transition-colors"
                onClick={() => toggle(b.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[#475569]">#{b.id}</span>
                    <span className="text-xs text-[#475569] uppercase tracking-wide">{b.type}</span>
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full border font-medium capitalize", statusBg(b.status))}>{b.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#475569]">Stake: <span className="text-[#FACC15] font-mono font-semibold">${fmt(b.stake)}</span></span>
                    <span className="text-[#475569]">Odds: <span className="text-white">{Number(b.totalOdds).toFixed(2)}x</span></span>
                    <span className="text-[#475569]">Return: <span className="text-[#00DFA9] font-mono">${fmt(b.potentialReturn)}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[#334155]">{fmtDate(b.createdAt)}</span>
                  {b.status === "open" && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      {["won","lost","void"].map(r => (
                        <button key={r} onClick={() => settleMut.mutate({ id: b.id, result: r })}
                          disabled={settleMut.isPending}
                          className={cn("px-2 py-0.5 rounded text-[11px] font-semibold transition-colors capitalize",
                            r === "won"  ? "bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20" :
                            r === "lost" ? "bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20" :
                            "bg-white/5 text-[#475569] hover:bg-white/10")}>
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                  {expanded.has(b.id) ? <ChevronUp className="w-3.5 h-3.5 text-[#475569]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#475569]" />}
                </div>
              </div>
              {expanded.has(b.id) && b.selections.length > 0 && (
                <div className="border-t border-white/5 px-4 py-3 space-y-2">
                  {b.selections.map(sel => (
                    <div key={sel.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{sel.eventName}</p>
                        <p className="text-[#475569]">{sel.marketName} · <span className="text-[#38BDF8]">{sel.outcomeName}</span></p>
                        {sel.sport && <p className="text-[#334155]">{sel.sport}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[#FACC15] font-mono font-semibold">{Number(sel.odds).toFixed(2)}x</p>
                        {sel.result && (
                          <span className={cn("text-[11px] font-semibold capitalize",
                            sel.result === "won" ? "text-[#00DFA9]" : sel.result === "lost" ? "text-[#EF4444]" : "text-[#475569]")}>
                            {sel.result}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#475569] pt-1">
          <span>Page {page} of {data.pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded hover:bg-white/5 disabled:opacity-25 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
              className="p-1.5 rounded hover:bg-white/5 disabled:opacity-25 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Transactions Tab ────────────────────────────────────────────────────────
function TransactionsTab({ userId }: { userId: number }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [type, setType] = useState("all");

  const { data, isLoading } = useQuery<{ transactions: AdminTransaction[]; total: number; pages: number }>({
    queryKey: ["profile-txns", userId, page, type],
    queryFn: () => api.get(`/admin/users/${userId}/transactions?page=${page}&type=${type}`),
  });

  const settleMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/admin/transactions/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile-txns", userId] }); toast.success("Transaction updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const isCredit = (t: AdminTransaction) => ["deposit", "credit", "win", "bet_win", "refund"].includes(t.type);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {["all", "deposit", "withdrawal", "credit", "debit"].map(f => (
          <button key={f} onClick={() => { setType(f); setPage(1); }}
            className={cn("px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors",
              type === f ? "bg-[#00DFA9] text-[#0B0F14]" : "bg-white/5 text-[#94A3B8] hover:bg-white/10")}>
            {f}
          </button>
        ))}
        {data && <span className="ml-auto text-xs text-[#475569] self-center">{data.total} records</span>}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-[#475569] text-sm">Loading…</div>
      ) : !data?.transactions.length ? (
        <div className="text-center py-8 text-[#475569] text-sm">No transactions found</div>
      ) : (
        <div className="space-y-2">
          {data.transactions.map(t => (
            <div key={t.id} className="bg-[#0D1117] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-[#475569]">#{t.id}</span>
                  <span className="text-xs capitalize text-[#94A3B8]">{t.type.replace(/_/g, " ")}</span>
                  <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full border font-medium capitalize", statusBg(t.status))}>{t.status}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={cn("font-mono font-semibold text-sm", isCredit(t) ? "text-[#00DFA9]" : "text-[#EF4444]")}>
                    {isCredit(t) ? "+" : "-"}${fmt(t.amount)} USDT
                  </span>
                  {t.reference && <span className="text-[#334155] font-mono">{t.reference}</span>}
                  <span className="text-[#334155]">{fmtDate(t.createdAt)}</span>
                </div>
              </div>
              {t.status === "pending" && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => settleMut.mutate({ id: t.id, status: "completed" })}
                    disabled={settleMut.isPending}
                    className="px-2.5 py-1 bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 rounded-lg text-xs font-semibold transition-colors">
                    Approve
                  </button>
                  <button onClick={() => settleMut.mutate({ id: t.id, status: "rejected" })}
                    disabled={settleMut.isPending}
                    className="px-2.5 py-1 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 rounded-lg text-xs font-semibold transition-colors">
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#475569] pt-1">
          <span>Page {page} of {data.pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded hover:bg-white/5 disabled:opacity-25 transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
              className="p-1.5 rounded hover:bg-white/5 disabled:opacity-25 transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sessions Tab ────────────────────────────────────────────────────────────
function SessionsTab({ userId }: { userId: number }) {
  const qc = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery<UserSession[]>({
    queryKey: ["profile-sessions", userId],
    queryFn: () => api.get(`/admin/users/${userId}/sessions`),
  });

  const invalidateMut = useMutation({
    mutationFn: () => api.post(`/admin/users/${userId}/invalidate-sessions`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile-sessions", userId] }); toast.success("All sessions invalidated — user will be logged out"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (sessionId: number) => api.delete(`/admin/users/${userId}/sessions/${sessionId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile-sessions", userId] }); toast.success("Session revoked"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = sessions.filter(s => s.isActive).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#94A3B8]">{sessions.length} sessions · <span className="text-[#00DFA9]">{active} active</span></p>
        <button onClick={() => invalidateMut.mutate()} disabled={invalidateMut.isPending || active === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          {invalidateMut.isPending ? "Invalidating…" : "Revoke All"}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-[#475569] text-sm">Loading…</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-[#475569] text-sm">No sessions found</div>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="bg-[#0D1117] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className={cn("w-2 h-2 rounded-full shrink-0 mt-0.5", s.isActive ? "bg-[#00DFA9]" : "bg-[#334155]")} />
              <div className="flex-1 min-w-0 text-xs">
                <div className="flex items-center gap-2">
                  <span className={cn("px-1.5 py-0.5 rounded text-[11px] font-semibold", s.isActive ? "bg-[#00DFA9]/10 text-[#00DFA9]" : "bg-white/5 text-[#475569]")}>
                    {s.isActive ? "Active" : "Expired"}
                  </span>
                  <span className="text-[#475569] font-mono">#{s.id}</span>
                </div>
                <div className="flex gap-4 mt-1 text-[#334155]">
                  <span>Login: <span className="text-[#475569]">{fmtDate(s.createdAt)}</span></span>
                  <span>Expires: <span className="text-[#475569]">{fmtDate(s.expiresAt)}</span></span>
                </div>
              </div>
              {s.isActive && (
                <button
                  onClick={() => revokeMut.mutate(s.id)}
                  disabled={revokeMut.isPending}
                  title="Force disconnect this session"
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-[#EF4444]/8 text-[#EF4444] hover:bg-[#EF4444]/20 rounded-lg text-[11px] font-semibold disabled:opacity-40 transition-colors border border-[#EF4444]/15">
                  <Trash2 className="w-3 h-3" />
                  Disconnect
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Referrals Tab ───────────────────────────────────────────────────────────
function ReferralsTab({ userId }: { userId: number }) {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<UserReferralTree>({
    queryKey: ["profile-referrals", userId],
    queryFn: () => api.get(`/admin/users/${userId}/referrals`),
  });

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8 text-[#475569] text-sm">Loading…</div>
      ) : (
        <>
          <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4">
            <p className="text-xs text-[#475569] mb-2 uppercase tracking-wide">Referred by</p>
            {data?.referredBy ? (
              <button onClick={() => navigate(`/users/${data.referredBy!.id}`)}
                className="flex items-center gap-2 text-sm text-[#38BDF8] hover:text-white transition-colors">
                <User className="w-4 h-4" /> {data.referredBy.username}
              </button>
            ) : (
              <p className="text-sm text-[#475569]">Organic signup (no referrer)</p>
            )}
          </div>

          <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                Players referred <span className="text-[#475569] font-normal">({data?.referred.length ?? 0})</span>
              </p>
              <p className="text-xs text-[#475569]">
                Total commissions: <span className="text-[#00DFA9] font-mono font-semibold">${fmt(data?.totalCommissions ?? "0")}</span>
              </p>
            </div>
            {!data?.referred.length ? (
              <div className="py-8 text-center text-[#475569] text-sm">No referrals yet</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[#475569] uppercase tracking-wide">
                    <th className="text-left px-4 py-2">Player</th>
                    <th className="text-right px-4 py-2">Joined</th>
                    <th className="text-right px-4 py-2">Volume</th>
                    <th className="text-right px-4 py-2">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.referred.map((r: { id: number; username: string; joinedAt: string; totalStaked: string; commissions: string }) => (
                    <tr key={r.id} className="hover:bg-white/2 transition-colors cursor-pointer"
                      onClick={() => navigate(`/users/${r.id}`)}>
                      <td className="px-4 py-2.5 text-[#38BDF8] hover:text-white">{r.username}</td>
                      <td className="px-4 py-2.5 text-right text-[#475569]">{fmtDate(r.joinedAt)}</td>
                      <td className="px-4 py-2.5 text-right text-[#94A3B8] font-mono">${fmt(r.totalStaked)}</td>
                      <td className="px-4 py-2.5 text-right text-[#00DFA9] font-mono">${fmt(r.commissions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Bonuses Tab ─────────────────────────────────────────────────────────────
function BonusesTab({ userId }: { userId: number }) {
  const { data: claims = [], isLoading } = useQuery<UserPromoClaim[]>({
    queryKey: ["profile-promos", userId],
    queryFn: () => api.get(`/admin/users/${userId}/promotions`),
  });

  return isLoading ? (
    <div className="text-center py-8 text-[#475569] text-sm">Loading…</div>
  ) : claims.length === 0 ? (
    <div className="text-center py-8 text-[#475569] text-sm">No promotions claimed yet</div>
  ) : (
    <div className="space-y-2">
      {claims.map(c => (
        <div key={c.id} className="bg-[#0D1117] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
          <Gift className="w-4 h-4 text-[#A855F7] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">{c.promotionTitle}</p>
            <p className="text-xs text-[#475569] mt-0.5">{fmtDate(c.claimedAt)}</p>
          </div>
          <span className="text-[#00DFA9] font-mono font-semibold text-sm shrink-0">+${fmt(c.bonusAmount)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── WinSpin Tab ─────────────────────────────────────────────────────────────
function WinSpinTab({ userId }: { userId: number }) {
  const { data: spins = [], isLoading } = useQuery<UserSpinRecord[]>({
    queryKey: ["profile-winspin", userId],
    queryFn: () => api.get(`/admin/users/${userId}/winspin`),
  });

  const totalWon = spins.reduce((acc, s) => acc + parseFloat(s.prizeAmount), 0);

  return (
    <div className="space-y-3">
      {spins.length > 0 && (
        <div className="flex gap-4 text-sm text-[#94A3B8]">
          <span>{spins.length} spins</span>
          <span>Total won: <span className="text-[#00DFA9] font-mono font-semibold">${totalWon.toFixed(2)} USDT</span></span>
        </div>
      )}
      {isLoading ? (
        <div className="text-center py-8 text-[#475569] text-sm">Loading…</div>
      ) : spins.length === 0 ? (
        <div className="text-center py-8 text-[#475569] text-sm">No spins yet</div>
      ) : (
        <div className="space-y-2">
          {spins.map(s => (
            <div key={s.id} className="bg-[#0D1117] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
              <Zap className="w-4 h-4 text-[#FACC15] shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{s.prizeLabel}</p>
                <p className="text-xs text-[#475569] mt-0.5">{fmtDate(s.createdAt)}</p>
              </div>
              <span className={cn("font-mono font-semibold text-sm shrink-0",
                parseFloat(s.prizeAmount) > 0 ? "text-[#00DFA9]" : "text-[#475569]")}>
                {parseFloat(s.prizeAmount) > 0 ? `+$${fmt(s.prizeAmount)}` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notes Tab ───────────────────────────────────────────────────────────────
function NotesTab({ userId }: { userId: number }) {
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [noteTag, setNoteTag] = useState("general");

  const { data: notes = [], isLoading } = useQuery<UserNote[]>({
    queryKey: ["profile-notes", userId],
    queryFn: () => api.get(`/admin/users/${userId}/notes`),
  });

  const addMut = useMutation({
    mutationFn: () => api.post(`/admin/users/${userId}/notes`, { note: noteText, tag: noteTag }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile-notes", userId] }); setNoteText(""); toast.success("Note added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (noteId: number) => api.delete(`/admin/users/${userId}/notes/${noteId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile-notes", userId] }); toast.success("Note deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="bg-[#0D1117] border border-white/8 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">Add Note</p>
        <textarea className={cn(inp, "resize-none h-20")} placeholder="Internal note visible only to admins…"
          value={noteText} onChange={e => setNoteText(e.target.value)} />
        <div className="flex gap-2 items-center">
          <select className={cn(inp, "w-40")} value={noteTag} onChange={e => setNoteTag(e.target.value)}>
            {Object.entries(TAG_STYLES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button onClick={() => { if (noteText.trim()) addMut.mutate(); }} disabled={!noteText.trim() || addMut.isPending}
            className="flex-1 py-2 bg-[#00DFA9] text-[#0B0F14] rounded-lg text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all">
            {addMut.isPending ? "Saving…" : "Save Note"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-[#475569] text-sm">Loading…</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-6 text-[#475569] text-sm">No notes yet</div>
      ) : (
        <div className="space-y-2">
          {notes.map(n => {
            const tagStyle = TAG_STYLES[n.tag] ?? TAG_STYLES.general;
            const TagIcon = tagStyle.icon;
            return (
              <div key={n.id} className="bg-[#0D1117] border border-white/8 rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border", tagStyle.color)}>
                      <TagIcon className="w-3 h-3" />{tagStyle.label}
                    </span>
                    <span className="text-xs text-[#475569]">by {n.adminUsername} · {fmtDate(n.createdAt)}</span>
                  </div>
                  <button onClick={() => deleteMut.mutate(n.id)} disabled={deleteMut.isPending}
                    className="text-[#334155] hover:text-[#EF4444] transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{n.note}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Risk Flags Tab ──────────────────────────────────────────────────────────
interface RiskFlag { id: number; type: string; detail: string | null; createdAt: string; }

const FLAG_CFG: Record<string, { label: string; color: string }> = {
  REFERRAL_DUPLICATE: { label: "Referral Farming",   color: "#FACC15" },
  BET_VELOCITY:       { label: "Bet Velocity",        color: "#F97316" },
  MAX_WIN_CAP:        { label: "Max Win Cap Hit",      color: "#EF4444" },
};

function RiskFlagsTab({ userId }: { userId: number }) {
  const qc = useQueryClient();
  const { data: flags = [], isLoading } = useQuery<RiskFlag[]>({
    queryKey: ["risk-flags", userId],
    queryFn: () => api.get(`/admin/users/${userId}/risk-flags`),
  });

  const dismissMut = useMutation({
    mutationFn: (flagId: number) => api.delete(`/admin/users/${userId}/risk-flags/${flagId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["risk-flags", userId] });
      toast.success("Flag dismissed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-8 text-center text-[#475569] text-sm">Loading…</div>;

  if (!flags.length) {
    return (
      <div className="py-10 text-center">
        <ShieldCheck className="w-8 h-8 text-[#00DFA9] mx-auto mb-2 opacity-50" />
        <p className="text-sm text-[#475569]">No risk flags — this account looks clean.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#475569] mb-3">{flags.length} flag{flags.length !== 1 ? "s" : ""} · click ✕ to dismiss</p>
      {flags.map(flag => {
        const cfg = FLAG_CFG[flag.type] ?? { label: flag.type, color: "#64748B" };
        return (
          <div key={flag.id}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border"
            style={{ borderColor: `${cfg.color}30`, background: `${cfg.color}08` }}>
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" style={{ color: cfg.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="text-[10px] text-[#334155]">{fmtDate(flag.createdAt)}</span>
              </div>
              <p className="text-xs text-[#94A3B8]">{flag.detail ?? "—"}</p>
            </div>
            <button
              onClick={() => dismissMut.mutate(flag.id)}
              disabled={dismissMut.isPending}
              title="Dismiss flag"
              className="p-1 rounded text-[#475569] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Profile Page ───────────────────────────────────────────────────────
const TABS = [
  { id: "bets",         label: "Bets",         icon: TrendingUp  },
  { id: "transactions", label: "Transactions",  icon: DollarSign  },
  { id: "bonuses",      label: "Bonuses",       icon: Gift        },
  { id: "winspin",      label: "WinSpin",       icon: Zap         },
  { id: "referrals",    label: "Referrals",     icon: Users       },
  { id: "sessions",     label: "Sessions",      icon: Clock       },
  { id: "notes",        label: "Notes",         icon: MessageSquare },
  { id: "risk",         label: "Risk Flags",    icon: ShieldAlert },
];

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id ?? "0");
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("bets");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [showAdj, setShowAdj] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  const { data: profile, isLoading } = useQuery<UserProfileStats>({
    queryKey: ["user-profile", userId],
    queryFn: () => api.get(`/admin/users/${userId}/profile`),
    enabled: !!userId && !isNaN(userId),
  });

  const [copiedWallet, setCopiedWallet] = useState(false);
  function copyWallet(addr: string) {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  }

  const suspendMut = useMutation({
    mutationFn: (suspend: boolean) => api.patch(`/admin/users/${userId}`, { isSuspended: suspend }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user-profile", userId] }); toast.success("User status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const kycMut = useMutation({
    mutationFn: (kycStatus: string) => api.patch(`/admin/users/${userId}`, { kycStatus }),
    onSuccess: (_d, kycStatus) => {
      qc.invalidateQueries({ queryKey: ["user-profile", userId] });
      toast.success(`KYC status set to "${kycStatus}"`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const balMut = useMutation({
    mutationFn: () => api.patch(`/admin/users/${userId}`, { balanceAdjustment: parseFloat(adjAmount), balanceNote: adjNote || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user-profile", userId] }); toast.success("Balance adjusted"); setAdjAmount(""); setAdjNote(""); setShowAdj(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pwMut = useMutation({
    mutationFn: () => api.post(`/admin/users/${userId}/reset-password`, { newPassword: newPw }),
    onSuccess: () => { toast.success("Password reset — all sessions invalidated"); setNewPw(""); setConfirmPw(""); setShowPwForm(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#475569] text-sm">
        Loading player profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-[#475569] text-sm">Player not found</p>
        <button onClick={() => navigate("/users")} className="text-xs text-[#38BDF8] hover:text-white transition-colors">
          ← Back to Users
        </button>
      </div>
    );
  }

  const { user, stats } = profile;
  const isSuspended = user.isSuspended;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">
      {/* Back */}
      <button onClick={() => navigate("/users")}
        className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Users
      </button>

      {/* Hero card */}
      <div className="bg-[#111827] border border-white/8 rounded-2xl p-5">
        <div className="flex items-start gap-4 flex-wrap">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-[#38BDF8]/10 flex items-center justify-center shrink-0">
            <span className="text-[#38BDF8] text-2xl font-bold uppercase">{(user.username ?? user.walletAddress ?? "?").slice(0, 1)}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-white">{user.username ?? <span className="text-[#475569] italic text-base">no username</span>}</h1>
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-semibold",
                isSuspended ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20" : "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20")}>
                {isSuspended ? "Suspended" : "Active"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] border bg-white/5 text-[#94A3B8] border-white/10 capitalize">
                {user.role.replace(/_/g, " ")}
              </span>
              {/* KYC badge */}
              <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-semibold",
                user.kycStatus === "verified" || user.kycStatus === "approved"
                  ? "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20"
                  : user.kycStatus === "rejected"
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20")}>
                KYC: {user.kycStatus}
              </span>
            </div>
            {user.email && <p className="text-sm text-[#64748B] mb-2">{user.email}</p>}
            {/* Wallet address row */}
            {user.walletAddress && (
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-3.5 h-3.5 text-[#334155] shrink-0" />
                <span className="font-mono text-xs text-[#64748B]">{user.walletAddress}</span>
                <button onClick={() => copyWallet(user.walletAddress!)}
                  className="text-[#334155] hover:text-[#00DFA9] transition-colors" title="Copy address">
                  {copiedWallet ? <Check className="w-3 h-3 text-[#00DFA9]" /> : <Copy className="w-3 h-3" />}
                </button>
                {user.walletNetwork && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] text-[10px] font-medium border border-[#38BDF8]/20">
                    <Network className="w-2.5 h-2.5" /> {user.walletNetwork}
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-4 text-xs text-[#475569] flex-wrap">
              <span>uid: <span className="text-[#94A3B8] font-mono">#{user.id}</span></span>
              <span>Joined: <span className="text-[#94A3B8]">{fmtDate(user.createdAt)}</span></span>
              {user.referralCode && <span>Ref code: <span className="text-[#94A3B8] font-mono">{user.referralCode}</span></span>}
              {user.country && <span>Country: <span className="text-[#94A3B8]">{user.country}</span></span>}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 flex-wrap shrink-0">
            {/* KYC controls */}
            <div className="flex items-center gap-1 bg-white/3 border border-white/8 rounded-lg px-2 py-1">
              <span className="text-[10px] text-[#475569] mr-1">KYC</span>
              <button
                onClick={() => kycMut.mutate("verified")}
                disabled={kycMut.isPending || user.kycStatus === "verified"}
                title="Approve KYC"
                className="p-1 rounded text-[#00DFA9] hover:bg-[#00DFA9]/10 disabled:opacity-30 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => kycMut.mutate("rejected")}
                disabled={kycMut.isPending || user.kycStatus === "rejected"}
                title="Reject KYC"
                className="p-1 rounded text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors">
                <ShieldX className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => kycMut.mutate("pending")}
                disabled={kycMut.isPending || user.kycStatus === "pending"}
                title="Reset KYC to pending"
                className="p-1 rounded text-[#FACC15] hover:bg-[#FACC15]/10 disabled:opacity-30 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={() => setShowAdj(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FACC15]/10 text-[#FACC15] hover:bg-[#FACC15]/20 rounded-lg text-xs font-semibold transition-colors">
              <DollarSign className="w-3.5 h-3.5" /> Adjust Balance
            </button>
            <button onClick={() => setShowPwForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-[#94A3B8] hover:bg-white/10 rounded-lg text-xs font-semibold transition-colors">
              <KeyRound className="w-3.5 h-3.5" /> Reset Password
            </button>
            <button onClick={() => suspendMut.mutate(!isSuspended)} disabled={suspendMut.isPending}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                isSuspended
                  ? "bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20"
                  : "bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20")}>
              {isSuspended ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              {suspendMut.isPending ? "Updating…" : isSuspended ? "Unsuspend" : "Suspend"}
            </button>
          </div>
        </div>

        {/* Balance adjustment form */}
        {showAdj && (
          <div className="mt-4 pt-4 border-t border-white/8 flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-36">
              <label className="block text-xs text-[#475569] mb-1">Amount (positive = credit, negative = debit)</label>
              <input className={inp} type="number" step="0.01" placeholder="e.g. 100 or -50"
                value={adjAmount} onChange={e => setAdjAmount(e.target.value)} />
            </div>
            <div className="flex-1 min-w-36">
              <label className="block text-xs text-[#475569] mb-1">Reason (optional)</label>
              <input className={inp} placeholder="Admin note…" value={adjNote} onChange={e => setAdjNote(e.target.value)} />
            </div>
            <button onClick={() => { if (adjAmount) balMut.mutate(); }} disabled={!adjAmount || balMut.isPending}
              className="px-4 py-2 bg-[#FACC15] text-[#0B0F14] rounded-lg text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all">
              {balMut.isPending ? "Applying…" : "Apply"}
            </button>
          </div>
        )}

        {/* Reset password form */}
        {showPwForm && (
          <div className="mt-4 pt-4 border-t border-white/8 flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-[#475569] mb-1">New password</label>
              <div className="relative">
                <input className={cn(inp, "pr-9")} type={showPw ? "text" : "password"}
                  value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-white transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-[#475569] mb-1">Confirm password</label>
              <input className={inp} type={showPw ? "text" : "password"}
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password" />
            </div>
            <button onClick={() => {
              if (newPw.length < 8) { toast.error("Min 8 characters"); return; }
              if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
              pwMut.mutate();
            }} disabled={!newPw || !confirmPw || pwMut.isPending}
              className="px-4 py-2 bg-[#38BDF8] text-[#0B0F14] rounded-lg text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all">
              {pwMut.isPending ? "Resetting…" : "Reset & Logout"}
            </button>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Wallet Balance" value={`$${fmt(profile.wallet.balance)}`} sub="USDT" accent="#00DFA9" />
        <StatCard label="Total Bets" value={String(stats.bets.total)}
          sub={`${stats.bets.open} open · ${stats.bets.won} won · ${stats.bets.lost} lost`} accent="#38BDF8" />
        <StatCard label="Win Rate" value={`${stats.bets.winRate}%`}
          sub={`$${fmt(stats.bets.totalStaked)} staked`} accent="#FACC15" />
        <StatCard
          label="House Value"
          value={`$${fmt(stats.bets.lifetimeValue)}`}
          sub="Net profit from player"
          accent={parseFloat(stats.bets.lifetimeValue) >= 0 ? "#00DFA9" : "#EF4444"}
        />
        <StatCard label="Total Deposited" value={`$${fmt(stats.transactions.totalDeposited)}`}
          sub={`${stats.transactions.pendingDeposits} pending`} accent="#A855F7" />
        <StatCard label="Total Withdrawn" value={`$${fmt(stats.transactions.totalWithdrawn)}`}
          sub={`${stats.transactions.pendingWithdrawals} pending`} accent="#F97316" />
        <StatCard label="Referrals" value={String(stats.referrals.totalReferred)}
          sub={stats.referrals.referredByUsername ? `via ${stats.referrals.referredByUsername}` : "Organic signup"} accent="#38BDF8" />
        <StatCard label="WinSpin" value={String(stats.winspin.totalSpins)}
          sub={`$${fmt(stats.winspin.totalWon)} won`} accent="#FACC15" />
      </div>

      {/* Tabs */}
      <div className="bg-[#111827] border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex overflow-x-auto border-b border-white/8 scrollbar-none">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button key={tabId} onClick={() => setActiveTab(tabId)}
              className={cn("flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px",
                activeTab === tabId
                  ? "text-[#00DFA9] border-[#00DFA9]"
                  : "text-[#475569] border-transparent hover:text-[#94A3B8]")}>
              <Icon className="w-3.5 h-3.5" />
              {label}
              {tabId === "notes" && <Shield className="w-3 h-3 text-[#334155]" />}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeTab === "bets"         && <BetsTab         userId={userId} />}
          {activeTab === "transactions" && <TransactionsTab userId={userId} />}
          {activeTab === "bonuses"      && <BonusesTab      userId={userId} />}
          {activeTab === "winspin"      && <WinSpinTab      userId={userId} />}
          {activeTab === "referrals"    && <ReferralsTab    userId={userId} />}
          {activeTab === "sessions"     && <SessionsTab     userId={userId} />}
          {activeTab === "notes"        && <NotesTab        userId={userId} />}
          {activeTab === "risk"         && <RiskFlagsTab    userId={userId} />}
        </div>
      </div>
    </div>
  );
}
