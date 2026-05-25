import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { api, isTokenStored } from "@/lib/api";

interface PendingTotals {
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalPendingAmount: string;
}

const STORAGE_KEY = "cb_admin_last_pending_count";

export function useAdminNotifications(
  onCountChange?: (count: number) => void
) {
  const lastCount = useRef<number | null>(null);
  const initialized = useRef(false);

  const check = useCallback(async () => {
    if (!isTokenStored()) return;
    try {
      const data = await api.get<PendingTotals>(
        "/admin/transactions/pending-totals"
      );
      const total = (data.pendingDeposits ?? 0) + (data.pendingWithdrawals ?? 0);

      onCountChange?.(total);

      if (initialized.current && lastCount.current !== null && total > lastCount.current) {
        const diff = total - lastCount.current;
        toast(`💰 ${diff} new pending transaction${diff > 1 ? "s" : ""}`, {
          description: `$${parseFloat(data.totalPendingAmount ?? "0").toFixed(2)} USDT awaiting approval`,
          action: {
            label: "Review",
            onClick: () => {
              window.location.href = "/admin/transactions";
            },
          },
          duration: 8000,
        });
      }

      lastCount.current = total;
      initialized.current = true;
      sessionStorage.setItem(STORAGE_KEY, String(total));
    } catch {
      // silent — don't disrupt UI on poll failure
    }
  }, [onCountChange]);

  useEffect(() => {
    if (!isTokenStored()) return;

    // Restore last known count so we don't double-notify on page refresh
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) lastCount.current = parseInt(stored, 10);

    check();
    const interval = setInterval(check, 15_000);
    return () => clearInterval(interval);
  }, [check]);
}
