import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminBet, AdminUser } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Search, AlertTriangle, X, Flame,
  Receipt, Activity, Trophy, XCircle, Coins, Inbox, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, ColDef } from "@/components/DataTable";

const PAGE_SIZE = 20;

// Risk thresholds (USDT) used to surface high-value / high-liability bets.
const LARGE_STAKE = 500;
const HIGH_LIABILITY = 5000;

interface BetsSummary {
  total: number;
  open: number;
  won: number;
  lost: number;
  void: number;
  totalWagered: string;
}

interface BetSelection {
  id: number;
  eventName: string;
  sport: string;
  marketType: string;
  selection: string;
  odds: string;
  status: string;
  isLive: boolean;
  homeTeam: string;
  awayTeam: string;
  point: string | null;
  commenceTime: string;
}

function sportLabel(sport: string | null): string {
  if (!sport) return "—";
  const base = sport.split("_")[0].toLowerCase();
  const MAP: Record<string, string> = {
    soccer: "Soccer", americanfootball: "Football", basketball: "Basketball",
    baseball: "Baseball", icehockey: "Ice Hockey", tennis: "Tennis",
    mma: "MMA", cricket: "Cricket", rugbyunion: "Rugby", rugbleague: "Rugby",
    golf: "Golf", boxing: "Boxing", volleyball: "Volleyball",
  };
  return MAP[base] ?? sport;
}

function isHighRisk(b: AdminBet): boolean {
  return (
    parseFloat(b.stake) >= LARGE_STAKE ||
    (b.status === "open" && parseFloat(b.potentialReturn) >= HIGH_LIABILITY)
  );
}

function StatusBadge({ status }: { status: string }) {
  const dot =
    status === "won" ? "bg-[#00DFA9]"
    : status === "lost" ? "bg-red-400"
    : status === "open" ? "bg-[#38BDF8]"
    : "bg-[#94A3B8]";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border font-semibold capitalize",
      statusBg(status),
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot, status === "open" && "animate-pulse")} />
      {status}
    </span>
  );
}

function SummaryCard({
  label, value, sub, icon: Icon, accent, loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0D1117] p-4 hover:border-white/15 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#64748B] font-medium">{label}</span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}1a`, color: accent }}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      {loading ? (
        <div className="h-7 w-20 bg-white/5 rounded animate-pulse mt-2.5" />
      ) : (
        <div className="text-2xl font-bold text-white mt-2 tabular-nums tracking-tight">{value}</div>
      )}
      {sub && <div className="text-[11px] text-[#475569] mt-0.5">{sub}</div>}
    </div>
  );
}

function UserSheet({ username, onClose }: { username: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["bet-user-lookup", username],
    queryFn: () => api.get(`/admin/users?search=${encodeURIComponent(username)}&limit=1`),
  });
  const user = data?.users?.[0];

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-[360px] max-w-full bg-[#0B0F14] border-l border-white/8">
        <SheetHeader className="pb-4 border-b border-white/8">
          <SheetTitle className="text-white text-base">User Details</SheetTitle>
        </SheetHeader>
        {isLoading ? (
          <div className="mt-5 space-y-3 animate-pulse">
            {[80, 60, 70].map((w, i) => (
              <div key={i} className="h-4 bg-white/5 rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : !user ? (
          <div className="mt-8 text-center text-[#475569] text-sm">User not found</div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#38BDF8]/10 flex items-center justify-center">
                <span className="text-[#38BDF8] font-bold uppercase">{(user.username ?? user.walletAddress ?? "?").slice(0, 1)}</span>
              </div>
              <div>
                <div className="text-white font-semibold">{user.username ?? user.walletAddress ?? "—"}</div>
                <div className="text-xs text-[#475569]">{user.email ?? "—"}</div>
              </div>
            </div>
            <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
              {([
                ["User ID", `#${user.id}`],
                ["Role", user.role],
                ["KYC", user.kycStatus],
                ["Country", user.country ?? "—"],
                ["Balance", user.balance !== null ? `$${fmt(user.balance)} USDT` : "—"],
                ["Joined", fmtDate(user.createdAt)],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm px-4 py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-[#64748B]">{label}</span>
                  <span className="text-white font-mono text-xs">{value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm px-4 py-2.5">
                <span className="text-[#64748B]">Status</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs border", statusBg(user.isSuspended ? "rejected" : "active"))}>
                  {user.isSuspended ? "Suspended" : "Active"}
                </span>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function BetDetailSheet({
  bet, onClose, onUser, onSettle, settling,
}: {
  bet: AdminBet;
  onClose: () => void;
  onUser: (username: string) => void;
  onSettle: (id: number, status: string) => void;
  settling: boolean;
}) {
  const { data, isLoading } = useQuery<{ selections: BetSelection[] }>({
    queryKey: ["admin-bet-detail", bet.id],
    queryFn: () => api.get(`/admin/bets/${bet.id}`),
  });
  const selections = data?.selections ?? [];

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-[420px] max-w-full bg-[#0B0F14] border-l border-white/8 overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-white/8">
          <SheetTitle className="text-white text-base flex items-center gap-2">
            <span className="font-mono text-[#475569]">#{bet.id}</span>
            <StatusBadge status={bet.status} />
            {isHighRisk(bet) && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#FACC15]">
                <Flame className="w-3.5 h-3.5" /> High value
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
            <div className="flex justify-between text-sm px-4 py-2.5 border-b border-white/5">
              <span className="text-[#64748B]">User</span>
              <button
                onClick={() => bet.username && onUser(bet.username)}
                disabled={!bet.username}
                className="text-[#38BDF8] font-medium hover:underline disabled:text-[#475569] disabled:no-underline text-xs"
              >
                {bet.username ?? `uid:${bet.userId}`}
              </button>
            </div>
            {([
              ["Type", <span className="capitalize">{bet.type}</span>],
              ["Stake", <span className="text-[#FACC15] font-semibold">${fmt(bet.stake)} USDT</span>],
              ["Total odds", `${fmt(bet.totalOdds, 3)}×`],
              ["Potential return", <span className="text-[#00DFA9] font-semibold">${fmt(bet.potentialReturn)} USDT</span>],
              ["Placed", fmtDate(bet.createdAt)],
            ] as [string, React.ReactNode][]).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm px-4 py-2.5 border-b border-white/5 last:border-0">
                <span className="text-[#64748B]">{label}</span>
                <span className="text-white font-mono text-xs">{value}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs text-[#64748B] font-medium mb-2 uppercase tracking-wider">
              Selections {selections.length > 0 && `(${selections.length})`}
            </div>
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[0, 1].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
              </div>
            ) : selections.length === 0 ? (
              <div className="text-sm text-[#475569] py-4 text-center border border-white/8 rounded-xl">
                No selections recorded
              </div>
            ) : (
              <div className="space-y-2">
                {selections.map(s => (
                  <div key={s.id} className="bg-[#0D1117] border border-white/8 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white text-sm font-medium truncate">{s.eventName}</span>
                      <span className="text-white font-mono text-xs shrink-0">{fmt(s.odds, 3)}×</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[#94A3B8] text-xs">
                        {s.marketType} · <span className="text-[#38BDF8]">{s.selection}</span>
                        {s.point != null && <span className="text-[#64748B]"> ({s.point})</span>}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {s.isLive && <span className="text-[10px] text-red-400 font-semibold">● LIVE</span>}
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] border capitalize", statusBg(s.status))}>{s.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {bet.status === "open" && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button disabled={settling} onClick={() => onSettle(bet.id, "won")}
                className="px-3 py-2 rounded-lg text-sm bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors font-medium disabled:opacity-50">Won</button>
              <button disabled={settling} onClick={() => onSettle(bet.id, "lost")}
                className="px-3 py-2 rounded-lg text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium disabled:opacity-50">Lost</button>
              <button disabled={settling} onClick={() => onSettle(bet.id, "void")}
                className="px-3 py-2 rounded-lg text-sm bg-white/5 text-[#94A3B8] hover:bg-white/10 transition-colors disabled:opacity-50">Void</button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "void", label: "Void" },
];

export default function BetsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [userSheet, setUserSheet] = useState<string | null>(null);
  const [betSheet, setBetSheet] = useState<AdminBet | null>(null);

  const { data, isLoading } = useQuery<{ bets: AdminBet[]; total: number }>({
    queryKey: ["admin-bets", page, status, q],
    queryFn: () => api.get(
      `/admin/bets?page=${page}&limit=${PAGE_SIZE}${status ? `&status=${status}` : ""}${q ? `&search=${encodeURIComponent(q)}` : ""}`
    ),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<BetsSummary>({
    queryKey: ["admin-bets-summary", q],
    queryFn: () => api.get(`/admin/bets/summary${q ? `?search=${encodeURIComponent(q)}` : ""}`),
  });

  const settleMut = useMutation({
    mutationFn: ({ id, betStatus }: { id: number; betStatus: string }) =>
      api.patch(`/admin/bets/${id}`, { status: betStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bets"] });
      qc.invalidateQueries({ queryKey: ["admin-bets-summary"] });
      toast.success("Bet updated");
      setBetSheet(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const highRiskOnPage = data?.bets.filter(b => b.status === "open" && isHighRisk(b)) ?? [];

  const cols: ColDef<AdminBet>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      getValue: b => b.id,
      render: b => (
        <button
          onClick={e => { e.stopPropagation(); setBetSheet(b); }}
          className="text-[#94A3B8] font-mono text-xs hover:text-[#00DFA9] hover:underline transition-colors"
        >
          #{b.id}
        </button>
      ),
    },
    {
      key: "user",
      label: "User",
      render: b => (
        <button
          onClick={e => { e.stopPropagation(); if (b.username) setUserSheet(b.username); }}
          disabled={!b.username}
          className="text-[#38BDF8] text-sm font-medium hover:text-white hover:underline transition-colors disabled:text-[#475569] disabled:no-underline"
        >
          {b.username ?? `uid:${b.userId}`}
        </button>
      ),
    },
    {
      key: "sport",
      label: "Sport",
      sortable: true,
      getValue: b => b.sport ?? "",
      render: b => <span className="text-[#64748B] text-xs">{sportLabel(b.sport)}</span>,
    },
    {
      key: "match",
      label: "Match",
      className: "max-w-[180px]",
      render: b => (
        b.eventName ? (
          <button
            onClick={e => { e.stopPropagation(); setBetSheet(b); }}
            className="text-[#94A3B8] text-xs truncate block max-w-[180px] text-left hover:text-white hover:underline transition-colors"
            title={b.eventName}
          >
            {b.eventName}
          </button>
        ) : <span className="text-[#334155] text-xs">—</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      getValue: b => b.type,
      render: b => <span className="text-[#64748B] capitalize text-xs">{b.type}</span>,
    },
    {
      key: "stake",
      label: "Stake",
      sortable: true,
      getValue: b => parseFloat(b.stake),
      render: b => (
        <span className="inline-flex items-center gap-1 text-[#FACC15] font-mono text-xs font-semibold">
          {parseFloat(b.stake) >= LARGE_STAKE && <Flame className="w-3 h-3" />}
          ${fmt(b.stake)}
        </span>
      ),
    },
    {
      key: "odds",
      label: "Odds",
      sortable: true,
      getValue: b => parseFloat(b.totalOdds),
      render: b => <span className="text-white font-mono text-xs">{fmt(b.totalOdds, 3)}×</span>,
    },
    {
      key: "potential",
      label: "Potential",
      sortable: true,
      getValue: b => parseFloat(b.potentialReturn),
      render: b => (
        <span className={cn(
          "font-mono text-xs font-semibold",
          b.status === "open" && parseFloat(b.potentialReturn) >= HIGH_LIABILITY ? "text-[#FACC15]" : "text-[#00DFA9]",
        )}>
          ${fmt(b.potentialReturn)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      getValue: b => b.status,
      render: b => <StatusBadge status={b.status} />,
    },
    {
      key: "date",
      label: "Placed",
      sortable: true,
      getValue: b => b.createdAt,
      render: b => <span className="text-[#475569] text-xs whitespace-nowrap">{fmtDate(b.createdAt)}</span>,
    },
    {
      key: "settle",
      label: "Settle",
      render: b => (
        b.status === "open" ? (
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => settleMut.mutate({ id: b.id, betStatus: "won" })}
              className="px-2 py-1 rounded text-xs bg-[#00DFA9]/10 text-[#00DFA9] hover:bg-[#00DFA9]/20 transition-colors font-medium">Won</button>
            <button onClick={() => settleMut.mutate({ id: b.id, betStatus: "lost" })}
              className="px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-medium">Lost</button>
            <button onClick={() => settleMut.mutate({ id: b.id, betStatus: "void" })}
              className="px-2 py-1 rounded text-xs bg-white/5 text-[#64748B] hover:bg-white/10 transition-colors">Void</button>
          </div>
        ) : <span className="text-[#334155] text-xs">—</span>
      ),
    },
  ];

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(search);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {userSheet && <UserSheet username={userSheet} onClose={() => setUserSheet(null)} />}
      {betSheet && (
        <BetDetailSheet
          bet={betSheet}
          onClose={() => setBetSheet(null)}
          onUser={u => { setBetSheet(null); setUserSheet(u); }}
          onSettle={(id, s) => settleMut.mutate({ id, betStatus: s })}
          settling={settleMut.isPending}
        />
      )}

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bets</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            Monitor activity, manage settlements, and flag high-value wagers.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard label="Total Bets" value={fmt(summary?.total ?? 0, 0)} icon={Receipt} accent="#94A3B8" loading={summaryLoading}
          sub={q ? "matching search" : "all-time"} />
        <SummaryCard label="Active Bets" value={fmt(summary?.open ?? 0, 0)} icon={Activity} accent="#38BDF8" loading={summaryLoading}
          sub="awaiting settlement" />
        <SummaryCard label="Won Bets" value={fmt(summary?.won ?? 0, 0)} icon={Trophy} accent="#00DFA9" loading={summaryLoading}
          sub="settled winners" />
        <SummaryCard label="Lost Bets" value={fmt(summary?.lost ?? 0, 0)} icon={XCircle} accent="#F87171" loading={summaryLoading}
          sub="settled losses" />
        <SummaryCard label="Total Wagered" value={`$${fmt(summary?.totalWagered ?? 0, 0)}`} icon={Coins} accent="#FACC15" loading={summaryLoading}
          sub="USDT staked" />
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-[#0D1117] border border-white/8 rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                status === t.value ? "bg-[#00DFA9]/15 text-[#00DFA9]" : "text-[#64748B] hover:text-[#94A3B8]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form onSubmit={doSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username…"
              className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] w-48 transition-colors" />
          </div>
          {q && (
            <button type="button" onClick={() => { setQ(""); setSearch(""); setPage(1); }}
              className="p-2 bg-white/5 text-[#475569] rounded-lg hover:bg-white/10 transition-colors" title="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="submit" className="px-3 py-2 bg-white/8 border border-white/10 text-[#94A3B8] rounded-lg text-sm hover:bg-white/12 transition-colors">Search</button>
        </form>
      </div>

      {highRiskOnPage.length > 0 && (
        <div className="flex items-center gap-3 bg-[#FACC15]/6 border border-[#FACC15]/15 rounded-xl px-4 py-3">
          <ShieldAlert className="w-4 h-4 text-[#FACC15] shrink-0" />
          <span className="text-sm text-[#FACC15]">
            <span className="font-semibold">{highRiskOnPage.length} high-value open {highRiskOnPage.length === 1 ? "bet" : "bets"}</span> on this page ·
            liability ${fmt(String(highRiskOnPage.reduce((s, b) => s + parseFloat(b.potentialReturn), 0)))} USDT — review before settlement.
          </span>
        </div>
      )}

      <DataTable
        cols={cols}
        rows={data?.bets}
        loading={isLoading}
        rowKey={b => b.id}
        onRowClick={b => setBetSheet(b)}
        rowClassName={b => isHighRisk(b) ? "bg-[#FACC15]/[0.035] hover:bg-[#FACC15]/[0.06] border-l-2 border-l-[#FACC15]/50" : ""}
        maxHeight="calc(100vh - 360px)"
        empty={
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-[#334155]" />
            </span>
            <div className="text-[#64748B] text-sm">No bets found</div>
            {(q || status) && (
              <button onClick={() => { setQ(""); setSearch(""); setStatus(""); setPage(1); }}
                className="text-xs text-[#38BDF8] hover:underline">Clear filters</button>
            )}
          </div>
        }
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs">Page {page} of {pages} · {total.toLocaleString()} bets total</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs px-2">{page}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
}
