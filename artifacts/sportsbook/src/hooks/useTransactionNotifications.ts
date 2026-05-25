import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationsContext";
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
  const { addNotification } = useNotifications();
  const initialized = useRef(false);
  const addRef = useRef(addNotification);
  addRef.current = addNotification;
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
          const amt = `$${parseFloat(t.amount).toFixed(2)} USDT`;

          if (t.type === "deposit") {
            if (prev === "pending" && t.status === "completed") {
              addRef.current({
                type: "deposit_approved",
                title: "Deposit Approved ✅",
                message: `${amt} has been credited to your account.`,
                link: "/account/wallet",
              });
              toastRef.current({
                title: "✅ Deposit Approved!",
                description: `${amt} has been credited to your account.`,
              });
            } else if (prev === "pending" && t.status === "rejected") {
              addRef.current({
                type: "deposit_rejected",
                title: "Deposit Not Approved",
                message: t.notes
                  ? `Reason: ${t.notes}`
                  : "Your deposit request was not approved. Contact support.",
                link: "/account/wallet",
              });
              toastRef.current({
                title: "Deposit Not Approved",
                description: t.notes
                  ? `Reason: ${t.notes}`
                  : "Contact support if you need help.",
                variant: "destructive",
              });
            }
          } else if (t.type === "withdrawal") {
            if (prev === "pending" && t.status === "completed") {
              addRef.current({
                type: "withdrawal_approved",
                title: "Withdrawal Processed ✅",
                message: `${amt} has been sent to your wallet.`,
                link: "/account/wallet",
              });
              toastRef.current({
                title: "✅ Withdrawal Processed!",
                description: `${amt} has been sent to your wallet.`,
              });
            } else if (prev === "pending" && t.status === "rejected") {
              addRef.current({
                type: "withdrawal_rejected",
                title: "Withdrawal Rejected",
                message: t.notes ?? "Your withdrawal was not processed.",
                link: "/account/wallet",
              });
              toastRef.current({
                title: "Withdrawal Rejected",
                description: t.notes ?? "Your withdrawal was not processed.",
                variant: "destructive",
              });
            }
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
