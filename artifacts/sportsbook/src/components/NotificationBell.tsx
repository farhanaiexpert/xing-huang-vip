import { useRef, useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Bell, CheckCheck, Trash2, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, type AppNotification, type NotifType } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60)       return 'just now';
  if (secs < 3600)     return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400)    return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function notifMeta(type: NotifType): { icon: React.ReactNode; accent: string; bg: string } {
  switch (type) {
    case 'deposit_approved':
      return {
        icon: <ArrowDownLeft className="w-3.5 h-3.5" />,
        accent: '#00DFA9',
        bg: 'rgba(0,223,169,0.12)',
      };
    case 'deposit_rejected':
      return {
        icon: <ArrowDownLeft className="w-3.5 h-3.5" />,
        accent: '#EF4444',
        bg: 'rgba(239,68,68,0.12)',
      };
    case 'withdrawal_approved':
      return {
        icon: <ArrowUpRight className="w-3.5 h-3.5" />,
        accent: '#00DFA9',
        bg: 'rgba(0,223,169,0.12)',
      };
    case 'withdrawal_rejected':
      return {
        icon: <ArrowUpRight className="w-3.5 h-3.5" />,
        accent: '#EF4444',
        bg: 'rgba(239,68,68,0.12)',
      };
    case 'bet_won':
      return {
        icon: <span className="text-[10px]">🏆</span>,
        accent: '#FACC15',
        bg: 'rgba(250,204,21,0.12)',
      };
    case 'promo':
      return {
        icon: <span className="text-[10px]">🎁</span>,
        accent: '#38BDF8',
        bg: 'rgba(56,189,248,0.12)',
      };
    default:
      return {
        icon: <Bell className="w-3.5 h-3.5" />,
        accent: '#94A3B8',
        bg: 'rgba(148,163,184,0.10)',
      };
  }
}

function NotifItem({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const { icon, accent, bg } = notifMeta(n.type);

  const content = (
    <div
      onClick={() => onRead(n.id)}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer group',
        n.read ? 'hover:bg-white/[0.03]' : 'hover:bg-white/[0.05]'
      )}
    >
      {/* Icon bubble */}
      <div
        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
        style={{ background: bg, color: accent }}
      >
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-[12px] font-semibold leading-snug', n.read ? 'text-[#94A3B8]' : 'text-[#F8FAFC]')}>
            {n.title}
          </p>
          {!n.read && (
            <span className="shrink-0 w-1.5 h-1.5 rounded-full mt-1" style={{ background: accent }} />
          )}
        </div>
        <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">{n.message}</p>
        <p className="text-[10px] text-[#475569] mt-1">{timeAgo(n.timestamp)}</p>
      </div>
    </div>
  );

  if (n.link) {
    return <Link href={n.link}>{content}</Link>;
  }
  return content;
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggle() {
    setOpen(v => !v);
  }

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        aria-label="Notifications"
        onClick={toggle}
        className="relative p-2 rounded-lg text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-all duration-150"
      >
        <Bell className={cn('h-4 w-4 transition-colors', hasUnread && 'text-[#F8FAFC]')} />

        {/* Blinking dot badge */}
        {hasUnread && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: '#00DFA9' }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ background: '#00DFA9' }}
            />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-80 rounded-2xl overflow-hidden z-50"
          style={{
            background: '#0D1117',
            border: '1px solid rgba(37,50,65,0.9)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.75)',
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#253241]">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-[#00DFA9]" />
              <p className="text-[13px] font-bold text-[#F8FAFC]">Notifications</p>
              {hasUnread && (
                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#00DFA9] text-[#0B0F14] text-[9px] font-black">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasUnread && (
                <button
                  onClick={markAllRead}
                  title="Mark all read"
                  className="p-1.5 rounded-lg text-[#475569] hover:text-[#94A3B8] hover:bg-white/[0.05] transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all"
                  className="p-1.5 rounded-lg text-[#475569] hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-[#475569] hover:text-[#94A3B8] hover:bg-white/[0.05] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[#253241]/60">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
                <div className="w-12 h-12 rounded-full bg-[#253241]/50 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-[#94A3B8]/30" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-[#94A3B8]/50">No notifications yet</p>
                  <p className="text-[11px] text-[#475569] mt-1 leading-snug">
                    Deposit approvals, withdrawals &amp;<br />bet results will appear here
                  </p>
                </div>
              </div>
            ) : (
              notifications.map(n => (
                <NotifItem
                  key={n.id}
                  n={n}
                  onRead={id => { markRead(id); }}
                />
              ))
            )}
          </div>

          {/* Footer: only shown when logged out */}
          {!isAuthenticated && (
            <div className="px-4 py-3 border-t border-[#253241] bg-[#0B0F14]/50">
              <p className="text-[11px] text-[#475569] text-center">Sign in to receive real-time notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
