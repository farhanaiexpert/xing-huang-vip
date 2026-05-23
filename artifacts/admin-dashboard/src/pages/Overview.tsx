import { useAdminGetUsers, useAdminGetBets, useAdminGetCommissionSettings } from "@workspace/api-client-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  icon: React.ReactNode;
}

function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className={`bg-card border rounded-xl p-5 flex flex-col gap-3 ${accent ? "border-primary/30" : "border-card-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className={`text-3xl font-bold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function EmptyIllustration({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
      <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 64 64">
        <rect x="8" y="12" width="48" height="40" rx="4" />
        <line x1="8" y1="22" x2="56" y2="22" />
        <line x1="20" y1="32" x2="44" y2="32" />
        <line x1="20" y1="40" x2="36" y2="40" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function Overview() {
  const { data: usersData, isLoading: loadingUsers } = useAdminGetUsers();
  const { data: betsData, isLoading: loadingBets } = useAdminGetBets();
  const { data: commData, isLoading: loadingComm } = useAdminGetCommissionSettings();

  const users = usersData?.users ?? [];
  const bets = betsData?.bets ?? [];

  const activeBets = bets.filter((b) => b.status === "pending").length;
  const totalStake = bets.reduce((acc, b) => acc + parseFloat(b.stake ?? "0"), 0);

  const level1Rate = commData?.settings?.find((s) => s.level === 1)?.rate;
  const level1Pct = level1Rate != null ? `${(parseFloat(level1Rate) * 100).toFixed(1)}%` : "—";

  const isLoading = loadingUsers || loadingBets || loadingComm;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={usersData?.total ?? 0}
          sub="all registered accounts"
          accent
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active Bets"
          value={activeBets}
          sub="pending settlement"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Wagered"
          value={`$${totalStake.toFixed(2)}`}
          sub="USDT · all time"
          accent
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="L1 Commission"
          value={level1Pct}
          sub="level 1 referral rate"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent Users</h2>
          {users.length === 0 ? (
            <EmptyIllustration message="No users registered yet" />
          ) : (
            <div className="space-y-0.5">
              {users.slice(0, 6).map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm font-medium text-foreground">{u.username}</span>
                    {u.email && <span className="text-xs text-muted-foreground ml-2">{u.email}</span>}
                  </div>
                  <StatusBadge status={u.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-card-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent Bets</h2>
          {bets.length === 0 ? (
            <EmptyIllustration message="No bets placed yet" />
          ) : (
            <div className="space-y-0.5">
              {bets.slice(0, 6).map((b) => {
                const sel0 = (b.selections as unknown as Array<{ homeTeam: string; awayTeam: string }>)?.[0];
                return (
                  <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div>
                      <span className="text-sm font-medium text-foreground">${parseFloat(b.stake).toFixed(2)}</span>
                      {sel0 && (
                        <span className="text-xs text-muted-foreground ml-2 truncate max-w-[140px] inline-block align-middle">
                          {sel0.homeTeam} v {sel0.awayTeam}
                        </span>
                      )}
                    </div>
                    <BetStatusBadge status={b.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-primary/15 text-primary border-primary/20",
    suspended: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    banned: "bg-destructive/15 text-destructive border-destructive/20",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

export function BetStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    won: "bg-primary/15 text-primary border-primary/20",
    lost: "bg-destructive/15 text-destructive border-destructive/20",
    void: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}
