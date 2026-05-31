import crypto from "crypto";
import { logger } from "./logger.js";

const BASE_URL = "https://plisio.net/api/v1";

function apiKey(): string {
  const key = process.env.PLISIO_API_KEY;
  if (!key) throw new Error("PLISIO_API_KEY is not set");
  return key;
}

function ipnSecret(): string {
  const s = process.env.PLISIO_IPN_SECRET;
  if (!s) throw new Error("PLISIO_IPN_SECRET is not set");
  return s;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PlisioInvoice {
  txnId: string;
  invoiceUrl: string;
  walletHash: string;
  pendingAmount: string;
  amount: string;
  currency: string;
  sourceCurrency: string;
  expirationTime: number | null;
}

export interface PlisioOperation {
  txnId: string;
  status: string;
  amount: string;
  currency: string;
}

export type PlisioCurrency = "USDTTRC20" | "USDTERC20" | "BTC" | "ETH" | "LTC" | "BNB" | "XRP";

export const ALLOWED_PLISIO_CURRENCIES: PlisioCurrency[] = ["USDTTRC20", "USDTERC20", "BTC", "ETH", "LTC", "BNB", "XRP"];

// ── Terminal statuses ──────────────────────────────────────────────────────────
export const PLISIO_FINISHED_STATUSES = new Set(["completed"]);
export const PLISIO_FAILED_STATUSES   = new Set(["cancelled", "error", "expired"]);

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function plisioGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ api_key: apiKey(), ...params }).toString();
  const resp = await fetch(`${BASE_URL}${path}?${qs}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await resp.json() as Record<string, unknown>;
  if (!resp.ok || body.status === "error") {
    const msg = (body.data as Record<string, unknown> | null)?.message ?? body.status ?? "unknown";
    throw new Error(`Plisio ${path} → HTTP ${resp.status}: ${msg}`);
  }
  return body as T;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function createInvoice(params: {
  amount: number;
  currency: PlisioCurrency;
  orderNumber: string;
  orderName: string;
  callbackUrl?: string;
}): Promise<PlisioInvoice> {
  const queryParams: Record<string, string> = {
    currency:        params.currency,
    order_number:    params.orderNumber,
    order_name:      params.orderName,
    amount:          params.amount.toString(),
    source_currency: "USD",
    secret_key:      ipnSecret(),
  };
  if (params.callbackUrl) queryParams.callback_url = params.callbackUrl;

  const resp = await plisioGet<{ status: string; data: Record<string, unknown> }>("/invoices/new", queryParams);
  const d = resp.data;

  logger.info({ txnId: d.txn_id, currency: params.currency }, "Plisio invoice created");

  return {
    txnId:          String(d.txn_id ?? ""),
    invoiceUrl:     String(d.invoice_url ?? ""),
    walletHash:     String(d.wallet_hash ?? ""),
    pendingAmount:  String(d.pending_amount ?? "0"),
    amount:         String(d.amount ?? params.amount),
    currency:       String(d.currency ?? params.currency),
    sourceCurrency: String(d.source_currency ?? "USD"),
    expirationTime: d.expiration_time != null ? Number(d.expiration_time) : null,
  };
}

export async function getOperationStatus(txnId: string): Promise<PlisioOperation> {
  const resp = await plisioGet<{ status: string; data: Record<string, unknown> }>(`/operations/${txnId}`);
  const d = resp.data;
  return {
    txnId:    String(d.txn_id ?? txnId),
    status:   String(d.status ?? "pending"),
    amount:   String(d.amount ?? "0"),
    currency: String(d.currency ?? ""),
  };
}

// ── IPN Signature Verification ─────────────────────────────────────────────────

/** Sort object keys alphabetically (shallow) for Plisio HMAC-SHA1 verification */
function sortedJson(obj: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
  );
  return JSON.stringify(sorted);
}

/**
 * Verify a Plisio IPN callback.
 * Plisio sends the body as JSON; the `verify_hash` field is HMAC-SHA1 of
 * the JSON-encoded body (sorted keys, without verify_hash) using the secret_key.
 */
export function verifyPlisioWebhook(body: Record<string, unknown>): boolean {
  const secret = process.env.PLISIO_IPN_SECRET;
  if (!secret) {
    logger.warn("PLISIO_IPN_SECRET not set — skipping IPN verification");
    return false;
  }

  const receivedHash = body.verify_hash;
  if (!receivedHash || typeof receivedHash !== "string") {
    logger.warn("Plisio IPN missing verify_hash");
    return false;
  }

  const { verify_hash: _vh, ...rest } = body;
  const message  = sortedJson(rest as Record<string, unknown>);
  const expected = crypto.createHmac("sha1", secret).update(message).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(receivedHash, "hex"),
    );
  } catch {
    return false;
  }
}
