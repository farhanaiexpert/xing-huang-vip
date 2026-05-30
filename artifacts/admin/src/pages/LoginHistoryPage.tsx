import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api, LoginHistoryRow } from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Clock, Wallet, User,
  Search, RefreshCw, Copy, Check,
} from "lucide-react";

const PAGE_SIZE = 50;

const NETWORK_COLORS: Record<string, string> = {
  Ethereum:  "bg-[#627EEA]/10 text-[#627EEA] border-[#627EEA]/20",
  BSC:       "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20",
  Polygon:   "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20",
  Avalanche: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
  Optimism:  "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
  Arbitrum:  "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20",
  Base:      "bg-[#0052FF]/10 text-[#60A5FA] border-[#60A5FA]/20",
  Fantom:    "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20",
};
function networkBadge(net: string) {
  return NETWORK_COLORS[net] ?? "bg-white/5 text-[#94A3B8] border-white/10";
}

function kycBadge(kyc: string) {
  if (kyc === "verified" || kyc === "approved") return "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/20";
  if (kyc === "pending") return "bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/20";
  if (kyc === "rejected") return "bg-red-500/10 text-red-400 border-red-500/20";
  return "bg-white/5 text-[#94A3B8] border-white/10";
}

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  function doCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-1.5 group/addr min-w-0">
      <Wallet className="w-3.5 h-3.5 text-[#334155] shrink-0" />
      <span className="font-mono text-[11px] text-[#64748B] break-all" title={address}>
        {address}
      </span>
      <button onClick={doCopy} title="Copy address"
        className="opacity-0 group-hover/addr:opacity-100 shrink-0 text-[#334155] hover:text-[#00DFA9] transition-all">
        {copied ? <Check className="w-3 h-3 text-[#00DFA9]" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

export default function LoginHistoryPage() {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery<{ rows: LoginHistoryRow[]; total: number }>({
    queryKey: ["admin-login-history", page],
    queryFn: () => api.get(`/admin/login-history?page=${page}&limit=${PAGE_SIZE}`),
    refetchInterval: 60_000,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = q
    ? rows.filter(r =>
        (r.walletAddress ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (r.username ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (r.email ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (r.country ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : rows;

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(search);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Login History</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            {total.toLocaleString()} users · sorted by most recent login
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={doSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Wallet, username, email…"
                className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-[#374151] focus:outline-none focus:border-[#00DFA9] w-60 transition-colors"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-white/8 border border-white/10 text-[#94A3B8] rounded-lg text-sm hover:bg-white/12 transition-colors">
              Filter
            </button>
          </form>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 bg-white/5 border border-white/10 text-[#475569] rounded-lg hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="bg-[#0D1117] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#475569] uppercase tracking-wide whitespace-nowrap">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#475569] uppercase tracking-wide whitespace-nowrap">Wallet / Network</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#475569] uppercase tracking-wide whitespace-nowrap">KYC</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#475569] uppercase tracking-wide whitespace-nowrap">Country</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#475569] uppercase tracking-wide whitespace-nowrap">Last Login</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[#475569] uppercase tracking-wide whitespace-nowrap">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/4 animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#334155] text-sm">
                    No login history found
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/users/${row.id}`)}
                    className="border-b border-white/4 hover:bg-white/3 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-[#475569]" />
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm group-hover:text-[#00DFA9] transition-colors">
                            {row.username ?? <span className="text-[#334155] italic">no username</span>}
                          </div>
                          {row.email && (
                            <div className="text-[11px] text-[#475569]">{row.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      {row.walletAddress ? (
                        <div className="space-y-1">
                          <CopyAddress address={row.walletAddress} />
                          {row.walletNetwork && (
                            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border", networkBadge(row.walletNetwork))}>
                              {row.walletNetwork}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#334155] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] border font-medium", kycBadge(row.kycStatus))}>
                        {row.kycStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#64748B]">{row.country ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.lastLogin ? (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#334155] shrink-0" />
                          <span className="text-xs text-[#64748B] whitespace-nowrap">{fmtDate(row.lastLogin)}</span>
                        </div>
                      ) : (
                        <span className="text-[#334155] text-xs">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "font-mono text-xs font-semibold",
                        row.sessionCount > 10 ? "text-[#FACC15]" : row.sessionCount > 0 ? "text-[#94A3B8]" : "text-[#334155]"
                      )}>
                        {row.sessionCount}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-white/6 text-xs text-[#475569]">
          <span>Page {page} of {pages} · {total.toLocaleString()} total users</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">{page}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
