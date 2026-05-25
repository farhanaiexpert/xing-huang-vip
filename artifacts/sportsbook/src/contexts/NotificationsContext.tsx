import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type NotifType =
  | 'deposit_approved'
  | 'deposit_rejected'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'bet_won'
  | 'promo'
  | 'info';

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  link?: string;
}

interface NotificationsCtx {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const Ctx = createContext<NotificationsCtx | null>(null);

const STORAGE_KEY = 'cb_notifs_v1';
const MAX_STORED = 50;

function load(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(items: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_STORED)));
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(load);

  // Sync to localStorage whenever state changes
  useEffect(() => { save(notifications); }, [notifications]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
    const notif: AppNotification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      read: false,
      timestamp: Date.now(),
    };
    setNotifications(prev => [notif, ...prev].slice(0, MAX_STORED));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Ctx.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, clearAll }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
