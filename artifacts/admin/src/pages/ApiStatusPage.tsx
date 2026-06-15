import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, KeyRound, Clock, PauseCircle, PlayCircle, Power } from "lucide-react";
import { useState } from "react";

type ApiStatus = "operational" | "degraded" | "throttled" | "down" | "idle" | "paused";

interface ProviderStatus {
  id: string;
  name: string;
  purpose: string;
  configured: boolean;
  paused: boolean;
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

const STATUS_META: Record<ApiStatus, { label: string; dot: string; dotAnim?: string; text: string; ring: string }> = {
  operational: { label: "Working",      dot: "bg-[#00DFA9]", dotAnim: "animate-pulse", text: "text-[#00DFA9]",  ring: "border-[#00DFA9]/30 bg-[#00DFA9]/[0.04]" },
  idle:        { label: "Idle",         dot: "bg-[#64748B]",                           text: "text-[#94A3B8]",  ring: "border-white/8" },
  degraded:    { label: "Degraded",     dot: "bg-[#FACC15]", dotAnim: "animate-pulse", text: "text-[#FACC15]",  ring: "border-[#FACC15]/30 bg-[#FACC15]/[0.04]" },
  throttled:   { label: "Rate-limited", dot: "bg-orange-400",dotAnim: "animate-pulse", text: "text-orange-300", ring: "border-orange-400/30 bg-orange-400/[0.05]" },
  down:        { label: "Down",         dot: "bg-red-500",   dotAnim: "animate-pulse", text: "text-red-400",    ring: "border-red-500/30 bg-red-500/[0.05]" },
  paused:      { label: "Paused",       dot: "bg-[#64748B]",                           text: "text-[#94A3B8]",  ring: "border-[#64748B]/30 bg-[#64748B]/[0.04]" },
};

const TOGGLEABLE = new Set(["betsapi", "odds_api"]);

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

function ProviderCard({
  p,
  onToggle,
  toggling,
}: {
  p: ProviderStatus;
  onToggle?: (enable: boolean) => void;
  toggling?: boolean;
}) {
  const meta = STATUS_META[p.status];
  const canToggle = TOGGLEABLE.has(p.id) && !!onToggle;

  return (
    <div className={`rounded-xl border p-5 transition-all duration-300 ${meta.ring}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-base font-semibold text-white">{p.name}</div>
          <div className="text-xs text-[#64748B] mt-0.5">{p.purpose}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Pause / Resume toggle — only for betsapi and odds_api */}
          {canToggle && (
            <button
              onClick={() => {
                // p.paused=false (running) → want to pause  → send enabled:false = onToggle(false)
                // p.paused=true  (paused)  → want to resume → send enabled:true  = onToggle(true)
                onToggle(p.paused);
              }}
              disabled={toggling}
              title={p.paused ? "Resume API calls" : "Pause API calls"}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border transition-all disabled:opacity-50 cursor-pointer
                ${p.paused
                  ? "bg-[#00DFA9]/[0.08] border-[#00DFA9]/30 text-[#00DFA9] hover:bg-[#00DFA9]/15"
                  : "bg-white/[0.04] border-white/10 text-[#94A3B8] hover:text-[#FACC15] hover:border-[#FACC15]/30 hover:bg-[#FACC15]/[0.06]"
                }`}
            >
              {toggling ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : p.paused ? (
                <><PlayCircle className="w-3.5 h-3.5" /> Resume</>
              ) : (
                <><Power className="w-3.5 h-3.5" /> Pause</>
              )}
            </button>
          )}
          {/* Status badge */}
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1">
            <span className={`w-2 h-2 rounded-full ${meta.dot} ${meta.dotAnim ?? ""}`} />
            <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
          </div>
        </div>
      </div>

      {/* Headline */}
      <p className="text-sm text-[#CBD5E1] mb-4 leading-snug">{p.headline}</p>

      {/* Stats */}
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

      {/* Paused notice */}
      {p.paused && (
        <div className="flex items-center gap-2 text-xs text-[#94A3B8] bg-[#64748B]/[0.08] border border-[#64748B]/25 rounded-lg px-3 py-2 mb-2">
          <PauseCircle className="w-3.5 h-3.5 shrink-0 text-[#FACC15]" />
          <span>
            <span className="font-semibold text-[#FACC15]">Paused by admin</span> — background cron and new fetches are
            blocked. Existing cache data is still served to users.
          </span>
        </div>
      )}

      {/* Env-var cron disabled notice (only when not admin-paused) */}
      {!p.paused && p.cronDisabled && (
        <div className="flex items-center gap-2 text-xs text-[#FACC15] bg-[#FACC15]/[0.06] border border-[#FACC15]/20 rounded-lg px-3 py-2 mb-2">
          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Auto-fetch is paused (background cron disabled to conserve quota).</span>
        </div>
      )}

      {p.hourlyLimitNote && !p.paused && (
        <div className="text-[11px] text-[#64748B] mb-2">{p.hourlyLimitNote}</div>
      )}

      {/* Footer meta */}
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

      {/* Last error */}
      {p.lastError && p.status !== "operational" && !p.paused && (
        <div className="flex items-start gap-2 text-[11px] text-red-400/90 bg-red-500/[0.05] border border-red-500/15 rounded-lg px-3 py-2 mt-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="break-all">{p.lastError}</span>
        </div>
      )}
    </div>
  );
}

export default function ApiStatusPage() {
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-api-status"],
    queryFn: () => api.get<ApiStatusResponse>("/admin/api-status"),
    refetchInterval: 20_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ provider, enabled }: { provider: string; enabled: boolean }) =>
      api.post<{ provider: string; enabled: boolean }>("/admin/api-toggle", { provider, enabled }),

    onMutate: async ({ provider, enabled }) => {
      setTogglingId(provider);
      // Cancel any in-flight refetch so it doesn't overwrite the optimistic value
      await queryClient.cancelQueries({ queryKey: ["admin-api-status"] });
      const previous = queryClient.getQueryData<ApiStatusResponse>(["admin-api-status"]);

      // Optimistically flip the card
      queryClient.setQueryData<ApiStatusResponse>(["admin-api-status"], (old) => {
        if (!old) return old;
        return {
          ...old,
          providers: old.providers.map((p) => {
            if (p.id !== provider) return p;
            const nowPaused = !enabled;
            return {
              ...p,
              paused: nowPaused,
              status: (nowPaused ? "paused" : p.configured ? "idle" : "down") as ApiStatus,
              headline: nowPaused
                ? "Manually paused by admin — no outbound calls until re-enabled. Existing cache continues to serve data."
                : "Re-enabled — will resume on the next cron tick (within 5 min).",
            };
          }),
        };
      });

      return { previous };
    },

    onSuccess: (_data, { provider, enabled }) => {
      const label = provider === "betsapi" ? "BetsAPI" : "The Odds API";
      if (enabled) {
        toast.success(`${label} resumed — cron will restart within 5 min`);
      } else {
        toast.success(`${label} paused — no outbound calls until you resume`);
      }
    },

    onError: (err: Error, _vars, context) => {
      // Roll back optimistic update
      if (context?.previous) {
        queryClient.setQueryData(["admin-api-status"], context.previous);
      }
      toast.error(`Failed to toggle: ${err.message}`);
    },

    onSettled: () => {
      setTogglingId(null);
      // Refresh from server to confirm final state
      queryClient.invalidateQueries({ queryKey: ["admin-api-status"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">API Status</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Health of the external data &amp; payment providers. Use{" "}
            <span className="text-[#FACC15] font-medium">Pause</span> to stop all outbound calls for a provider
            without deleting its key — existing cached data keeps serving users normally.
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

      {/* Legend */}
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
          {data?.providers.map((p) => (
            <ProviderCard
              key={p.id}
              p={p}
              onToggle={
                TOGGLEABLE.has(p.id)
                  ? (enable) => toggleMutation.mutate({ provider: p.id, enabled: enable })
                  : undefined
              }
              toggling={togglingId === p.id}
            />
          ))}
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
