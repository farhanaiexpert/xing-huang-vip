import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/apiClient";

interface Txn {
  id: number;
  type: string;
  amount: string;
  status: string;
  notes: string | null;
}

const STORAGE_KEY = "cb_txn_status_map";

function getStored(): Record<number, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function useTransactionNotifications() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const initialized = useRef(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!isAuthenticated) {
      initialized.current = false;
      return;
    }

    async function poll() {
      try {
        const txns = await api.get<Txn[]>("/wallet/transactions");
        const stored = getStored();
        const next: Record<number, string> = {};

        for (const t of txns) {
          next[t.id] = t.status;

          if (!initialized.current) continue;

          const prev = stored[t.id];
          if (prev === "pending" && t.status === "completed") {
            toastRef.current({
              title: "✅ Deposit Approved!",
              description: `$${parseFloat(t.amount).toFixed(2)} USDT has been credited to your account.`,
            });
          } else if (prev === "pending" && t.status === "rejected") {
            toastRef.current({
              title: "Deposit Not Approved",
              description: t.notes
                ? `Reason: ${t.notes}`
                : "Your deposit request was not approved. Contact support if you need help.",
              variant: "destructive",
            });
          }
        }

        initialized.current = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // silent
      }
    }

    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);
}
