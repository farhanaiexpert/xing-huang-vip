import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { RefreshCw, AlertTriangle, KeyRound, Clock, PauseCircle } from "lucide-react";

type ApiStatus = "operational" | "degraded" | "throttled" | "down" | "idle";

interface ProviderStatus {
  id: string;
  name: string;
  purpose: string;
  configured: boolean;
  status: ApiStatus;
  headline: string;
  callsToday: number;
  errorsToday: number;
  lastStatus: string | null;
  lastError: string | null;
  lastAt: string | null;
  quotaRemaining: number | null;
  quotaUpdatedAt: string | null;
  cronDisabled?: boolean;
  hourlyLimitNote?: string;
}

interface ApiStatusResponse {
  providers: ProviderStatus[];
  generatedAt: string;
}

const STATUS_META: Record<ApiStatus, { label: string; dot: string; text: string; ring: string }> = {
  operational: { label: "Working",      dot: "bg-[#00DFA9]",   text: "text-[#00DFA9]",   ring: "border-[#00DFA9]/30 bg-[#00DFA9]/[0.04]" },
  idle:        { label: "Idle",         dot: "bg-[#64748B]",   text: "text-[#94A3B8]",   ring: "border-white/8" },
  degraded:    { label: "Degraded",     dot: "bg-[#FACC15]",   text: "text-[#FACC15]",   ring: "border-[#FACC15]/30 bg-[#FACC15]/[0.04]" },
  throttled:   { label: "Rate-limited", dot: "bg-orange-400",  text: "text-orange-300",  ring: "border-orange-400/30 bg-orange-400/[0.05]" },
  down:        { label: "Down",         dot: "bg-red-500",     text: "text-red-400",     ring: "border-red-500/30 bg-red-500/[0.05]" },
};

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatPill({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2">
      <div className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold tracking-tight ${tone ?? "text-white"}`}>{value}</div>
    </div>
  );
}

function ProviderCard({ p }: { p: ProviderStatus }) {
  const meta = STATUS_META[p.status];
  return (
    <div className={`rounded-xl border p-5 transition-colors ${meta.ring}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-base font-semibold text-white">{p.name}</div>
          <div className="text-xs text-[#64748B] mt-0.5">{p.purpose}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
        </div>
      </div>

      <p className="text-sm text-[#CBD5E1] mb-4 leading-snug">{p.headline}</p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatPill label="Calls today" value={p.callsToday.toLocaleString()} />
        <StatPill label="Errors today" value={p.errorsToday.toLocaleString()} tone={p.errorsToday > 0 ? "text-red-400" : "text-white"} />
        {p.quotaRemaining !== null ? (
          <StatPill
            label="Credits left"
            value={p.quotaRemaining.toLocaleString()}
            tone={p.quotaRemaining < 50 ? "text-red-400" : p.quotaRemaining < 200 ? "text-[#FACC15]" : "text-[#00DFA9]"}
          />
        ) : (
          <StatPill label="API key" value={p.configured ? "Set" : "Missing"} tone={p.configured ? "text-[#00DFA9]" : "text-red-400"} />
        )}
      </div>

      {p.cronDisabled && (
        <div className="flex items-center gap-2 text-xs text-[#FACC15] bg-[#FACC15]/[0.06] border border-[#FACC15]/20 rounded-lg px-3 py-2 mb-2">
          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Auto-fetch is paused (background cron disabled to conserve quota).</span>
        </div>
      )}
      {p.hourlyLimitNote && (
        <div className="text-[11px] text-[#64748B] mb-2">{p.hourlyLimitNote}</div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#64748B] pt-2 border-t border-white/8">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" /> Last call {relTime(p.lastAt)}
        </span>
        {p.lastStatus && <span>Last result: <span className="text-[#94A3B8]">{p.lastStatus}</span></span>}
        {!p.configured && (
          <span className="inline-flex items-center gap-1 text-red-400">
            <KeyRound className="w-3 h-3" /> Key not set
          </span>
        )}
      </div>

      {p.lastError && p.status !== "operational" && (
        <div className="flex items-start gap-2 text-[11px] text-red-400/90 bg-red-500/[0.05] border border-red-500/15 rounded-lg px-3 py-2 mt-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="break-all">{p.lastError}</span>
        </div>
      )}
    </div>
  );
}

export default function ApiStatusPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-api-status"],
    queryFn: () => api.get<ApiStatusResponse>("/admin/api-status"),
    refetchInterval: 20_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">API Status</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Health of the external data &amp; payment providers — what's working, what's near its limit, and how much was used today.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#94A3B8] hover:text-white bg-[#0D1117] border border-white/8 hover:border-white/12 rounded-lg px-3 py-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#64748B]">
        {(Object.keys(STATUS_META) as ApiStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label}
          </span>
        ))}
      </div>

      {isError && (
        <div className="text-red-400 bg-red-500/8 border border-red-500/20 rounded-xl p-4 text-sm">
          Failed to load API status. Try refreshing.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-[#0D1117] border border-white/8 rounded-xl p-5 animate-pulse h-44">
              <div className="h-4 bg-white/5 rounded w-40 mb-3" />
              <div className="h-3 bg-white/5 rounded w-56 mb-6" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-12 bg-white/5 rounded" />
                <div className="h-12 bg-white/5 rounded" />
                <div className="h-12 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data?.providers.map((p) => <ProviderCard key={p.id} p={p} />)}
        </div>
      )}

      {data && (
        <p className="text-[11px] text-[#475569]">
          Updated {relTime(data.generatedAt)} · auto-refreshes every 20s
        </p>
      )}
    </div>
  );
}
