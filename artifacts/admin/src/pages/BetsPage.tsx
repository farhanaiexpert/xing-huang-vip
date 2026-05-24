import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, AdminBet, AdminUser } from "@/lib/api";
import { fmt, fmtDate, statusBg } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, ColDef } from "@/components/DataTable";

const PAGE_SIZE = 20;

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
                <span className="text-[#38BDF8] font-bold uppercase">{user.username.slice(0, 1)}</span>
              </div>
              <div>
                <div className="text-white font-semibold">{user.username}</div>
                <div className="text-xs text-[#475569]">{user.email}</div>
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

export default function BetsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [userSheet, setUserSheet] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ bets: AdminBet[]; total: number }>({
    queryKey: ["admin-bets", page, status, q],
    queryFn: () => api.get(
      `/admin/bets?page=${page}&limit=${PAGE_SIZE}${status ? `&status=${status}` : ""}${q ? `&search=${encodeURIComponent(q)}` : ""}`
    ),
  });

  const settleMut = useMutation({
    mutationFn: ({ id, betStatus }: { id: number; betStatus: string }) =>
      api.patch(`/admin/bets/${id}`, { status: betStatus }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bets"] }); toast.success("Bet updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const openBets = data?.bets.filter(b => b.status === "open") ?? [];
  const openLiability = openBets.reduce((sum, b) => sum + parseFloat(b.potentialReturn), 0);

  const sel = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00DFA9] transition-colors";

  const cols: ColDef<AdminBet>[] = [
    {
      key: "id",
      label: "ID",
      sortable: true,
      getValue: b => b.id,
      render: b => <span className="text-[#475569] font-mono text-xs">#{b.id}</span>,
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
      render: b => (
        <span className="text-[#64748B] text-xs">{sportLabel(b.sport)}</span>
      ),
    },
    {
      key: "match",
      label: "Match",
      className: "max-w-[160px]",
      render: b => (
        <span className="text-[#64748B] text-xs truncate block max-w-[160px]" title={b.eventName ?? ""}>
          {b.eventName ?? <span className="text-[#334155]">—</span>}
        </span>
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
      render: b => <span className="text-[#FACC15] font-mono text-xs font-semibold">${fmt(b.stake)}</span>,
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
      render: b => <span className="text-[#00DFA9] font-mono text-xs font-semibold">${fmt(b.potentialReturn)}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      getValue: b => b.status,
      render: b => (
        <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium", statusBg(b.status))}>
          {b.status}
        </span>
      ),
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
        ) : null
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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bets</h1>
          <p className="text-sm text-[#475569] mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <form onSubmit={doSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Username…"
                className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] w-44 transition-colors" />
            </div>
            {q && (
              <button type="button" onClick={() => { setQ(""); setSearch(""); setPage(1); }}
                className="p-2 bg-white/5 text-[#475569] rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
            <button type="submit" className="px-3 py-2 bg-white/8 border border-white/10 text-[#94A3B8] rounded-lg text-sm hover:bg-white/12 transition-colors">Search</button>
          </form>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={sel}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="void">Void</option>
          </select>
        </div>
      </div>

      {openBets.length > 0 && (
        <div className="flex items-center gap-3 bg-[#FACC15]/6 border border-[#FACC15]/15 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-[#FACC15] shrink-0" />
          <span className="text-sm text-[#FACC15]">
            <span className="font-semibold">{openBets.length} open bets</span> on this page ·
            potential liability: <span className="font-mono font-semibold">${fmt(String(openLiability))} USDT</span>
          </span>
        </div>
      )}

      <DataTable
        cols={cols}
        rows={data?.bets}
        loading={isLoading}
        rowKey={b => b.id}
        empty="No bets found"
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
