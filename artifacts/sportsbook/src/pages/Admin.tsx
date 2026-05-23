import { useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { useWallet } from '@/hooks/useWallet';
import {
  useAdminGetUsers,
  useAdminGetBets,
  useAdminUpdateUserStatus,
  getAdminGetUsersQueryKey,
} from '@workspace/api-client-react';
import type { UpdateStatusRequestStatus } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  Users, BarChart2, ArrowLeft, Shield,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AdminTab = 'users' | 'bets';

const STATUS_COLORS: Record<string, string> = {
  active:    'text-[#22C55E] bg-[#22C55E]/8 border-[#22C55E]/20',
  suspended: 'text-[#FACC15] bg-[#FACC15]/8 border-[#FACC15]/20',
  banned:    'text-[#EF4444] bg-[#EF4444]/8 border-[#EF4444]/20',
};

const BET_STATUS_COLORS: Record<string, string> = {
  pending: 'text-[#FACC15] bg-[#FACC15]/8 border-[#FACC15]/20',
  won:     'text-[#22C55E] bg-[#22C55E]/8 border-[#22C55E]/20',
  lost:    'text-[#EF4444] bg-[#EF4444]/8 border-[#EF4444]/20',
  void:    'text-[#94A3B8] bg-[#94A3B8]/8 border-[#94A3B8]/20',
};

export function Admin() {
  const { isConnected, role } = useWallet();
  const [tab, setTab] = useState<AdminTab>('users');

  if (!isConnected || role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-[#EF4444]/50" />
            </div>
            <h2 className="text-lg font-bold text-[#F8FAFC] mb-2">Access Denied</h2>
            <p className="text-sm text-[#94A3B8] mb-6">You must be an admin to view this page.</p>
            <Link href="/">
              <button className="h-10 px-6 rounded-xl bg-[#00DFA9] text-[#0B0F14] text-sm font-bold transition-all hover:brightness-110">
                Go Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white">
      <Header />

      <div className="max-w-5xl w-full mx-auto px-4 py-6">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/60 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#00DFA9]" />
              Admin Panel
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">Manage users and bets</p>
          </div>
        </div>

        <div className="flex gap-1 bg-[#121821] border border-[#253241] rounded-xl p-1 mb-6 w-full sm:w-fit overflow-x-auto">
          {([
            { key: 'users', label: 'Users',    icon: <Users className="h-3.5 w-3.5" /> },
            { key: 'bets',  label: 'All Bets', icon: <BarChart2 className="h-3.5 w-3.5" /> },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap',
                tab === t.key
                  ? 'bg-[#18212B] text-[#F8FAFC] shadow-sm'
                  : 'text-[#94A3B8]/60 hover:text-[#94A3B8]'
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'bets'  && <BetsTab />}

      </div>
    </div>
  );
}

function UsersTab() {
  const { data, isLoading } = useAdminGetUsers();
  const updateStatus = useAdminUpdateUserStatus();
  const queryClient  = useQueryClient();
  const { toast }    = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleStatusChange(userId: string, status: UpdateStatusRequestStatus) {
    try {
      await updateStatus.mutateAsync({ id: userId, data: { status } });
      queryClient.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
      toast({ title: 'Status updated', description: `User set to ${status}` });
    } catch {
      toast({ title: 'Failed', description: 'Could not update status', variant: 'destructive' });
    }
  }

  if (isLoading) return <LoadingState />;

  const users = data?.users ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#F8FAFC]">{users.length} registered users</p>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Users className="h-7 w-7 text-[#94A3B8]/30" />} label="No users yet" />
      ) : users.map(user => (
        <div key={user.id} className="rounded-xl border border-[#253241] bg-[#121821] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-[#00DFA9]">
                {user.username.slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#F8FAFC] truncate">{user.username}</span>
                {user.role === 'admin' && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/20">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#94A3B8]/60 truncate">{user.email ?? 'No email'}</p>
            </div>

            <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-lg border', STATUS_COLORS[user.status] ?? STATUS_COLORS.active)}>
              {user.status}
            </span>

            <button
              onClick={() => setExpanded(prev => prev === user.id ? null : user.id)}
              className="p-1.5 rounded-lg text-[#94A3B8]/50 hover:text-[#F8FAFC] hover:bg-[#253241]/50 transition-all"
            >
              {expanded === user.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {expanded === user.id && (
            <div className="border-t border-[#253241] px-4 py-3 bg-[#0B0F14] space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-[#94A3B8]/50 uppercase tracking-wider">User ID</span>
                  <p className="font-mono text-[#F8FAFC] mt-0.5 text-xs break-all">{user.id}</p>
                </div>
                <div>
                  <span className="text-[#94A3B8]/50 uppercase tracking-wider">Registered</span>
                  <p className="text-[#F8FAFC] mt-0.5">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                {user.walletAddress && (
                  <div className="col-span-2">
                    <span className="text-[#94A3B8]/50 uppercase tracking-wider">Wallet</span>
                    <p className="font-mono text-[#F8FAFC] mt-0.5 break-all">{user.walletAddress}</p>
                  </div>
                )}
              </div>

              {user.role !== 'admin' && (
                <div className="flex gap-2 pt-1">
                  {(['active', 'suspended', 'banned'] as UpdateStatusRequestStatus[]).map(s => (
                    <button
                      key={s}
                      disabled={user.status === s || updateStatus.isPending}
                      onClick={() => handleStatusChange(user.id, s)}
                      className={cn(
                        'flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
                        user.status === s
                          ? cn(STATUS_COLORS[s], 'cursor-default')
                          : 'border-[#253241] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#94A3B8]/40 disabled:opacity-40'
                      )}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BetsTab() {
  const { data, isLoading } = useAdminGetBets();

  if (isLoading) return <LoadingState />;

  const bets = data?.bets ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#F8FAFC]">{data?.total ?? 0} total bets</p>
      </div>

      {bets.length === 0 ? (
        <EmptyState icon={<BarChart2 className="h-7 w-7 text-[#94A3B8]/30" />} label="No bets placed yet" />
      ) : bets.map(bet => {
        const sels = (bet.selections ?? []) as Record<string, unknown>[];
        const first = sels[0];
        const matchName = first
          ? `${first.homeTeam ?? ''} vs ${first.awayTeam ?? ''}`
          : '—';
        return (
          <div key={bet.id} className="rounded-xl border border-[#253241] bg-[#121821] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-[#94A3B8]/50">
                    #{bet.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                    BET_STATUS_COLORS[bet.status] ?? BET_STATUS_COLORS.pending
                  )}>
                    {bet.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#F8FAFC] truncate">{matchName}</p>
                {sels.length > 1 && (
                  <p className="text-[10px] text-[#94A3B8]/50">+{sels.length - 1} more selections</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-[#94A3B8]/50">Stake / Return</p>
                <p className="text-sm font-bold text-[#F8FAFC]">
                  ${parseFloat(bet.stake).toFixed(2)}
                  <span className="text-[#22C55E]"> / ${parseFloat(bet.potentialReturn).toFixed(2)}</span>
                </p>
                <p className="text-[10px] text-[#94A3B8]/40 mt-0.5">
                  {new Date(bet.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="h-6 w-6 text-[#00DFA9] animate-spin" />
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-[#121821] border border-[#253241] flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-sm text-[#94A3B8]/60">{label}</p>
    </div>
  );
}

export default Admin;
