import { useEffect, useState } from "react";
import { api, setTokens } from "@/lib/apiClient";

/**
 * Dev-only instant login as the persistent test account.
 * Visiting /dev-login signs you in (no wallet needed) and drops you on Bet History.
 * The backing endpoint (/api/setup/test-login) only exists outside production.
 */
export default function DevLogin() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { accessToken, refreshToken } = await api.post<{
          accessToken: string;
          refreshToken: string;
        }>("/setup/test-login", {});
        setTokens(accessToken, refreshToken);
        // Full reload so AuthProvider restores the session, then land on Bet History.
        window.location.assign(`${import.meta.env.BASE_URL}account/bets`);
      } catch {
        setError("Test login is only available in development.");
      }
    })();
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00DFA9] border-t-transparent" />
          <p className="text-sm text-white/70">Signing in as test player…</p>
        </>
      )}
    </div>
  );
}
