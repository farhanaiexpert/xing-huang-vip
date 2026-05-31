import crypto from "crypto";
import { logger } from "./logger.js";

const BASE_URL = "https://api.cryptomus.com/v1";

// ── Credentials ───────────────────────────────────────────────────────────────

function credentials(): { apiKey: string; merchantId: string } {
  const apiKey     = process.env.CRYPTOMUS_API_KEY;
  const merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
  if (!apiKey || !merchantId) {
    throw new Error("CRYPTOMUS_API_KEY or CRYPTOMUS_MERCHANT_ID is not set");
  }
  return { apiKey, merchantId };
}

export function cryptomusConfigured(): boolean {
  return !!(process.env.CRYPTOMUS_API_KEY && process.env.CRYPTOMUS_MERCHANT_ID);
}

// ── Signature helpers ──────────────────────────────────────────────────────────

/**
 * Build the Cryptomus sign:
 *   HMAC-MD5( base64( JSON.stringify(keySorted body) ), apiKey )
 *
 * Keys are sorted alphabetically before serialising — mirrors the Cryptomus
 * PHP reference (ksort → json_encode → base64_encode → hash_hmac('md5',...)).
 */
function buildSign(body: Record<string, unknown>, apiKey: string): string {
  const sorted  = Object.fromEntries(Object.keys(body).sort().map(k => [k, body[k]]));
  const encoded = Buffer.from(JSON.stringify(sorted)).toString("base64");
  return crypto.createHmac("md5", apiKey).update(encoded).digest("hex");
}

/** Verify an inbound webhook body — same algo, strip the `sign` field first */
export function verifyWebhookSignature(
  body: Record<string, unknown>,
  receivedSign: string
): boolean {
  const { sign: _sign, ...rest } = body;
  try {
    const { apiKey } = credentials();
    const expected = buildSign(rest, apiKey);
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(receivedSign, "hex")
    );
  } catch {
    return false;
  }
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function cryptomusPost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const { apiKey, merchantId } = credentials();
  const sign = buildSign(body, apiKey);

  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      merchant: merchantId,
      sign,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  const json = (await resp.json()) as { state?: number; message?: string; result?: unknown; errors?: unknown };

  if (!resp.ok || json.state !== 0) {
    const msg = json.message ?? JSON.stringify(json.errors ?? "unknown error");
    throw new Error(`Cryptomus ${path} → HTTP ${resp.status}: ${msg}`);
  }

  return json.result as T;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type CryptomusNetwork = "TRON" | "ETH";

export interface CryptomusPayment {
  uuid: string;
  orderId: string;
  amount: string;
  currency: string;
  network: string;
  address: string | null;
  paymentStatus: string;
  status: string;
  url: string;
  expiredAt: number | null;
}

// ── Normalise raw API response ─────────────────────────────────────────────────

function parsePayment(d: Record<string, unknown>): CryptomusPayment {
  return {
    uuid:          String(d.uuid          ?? ""),
    orderId:       String(d.order_id      ?? ""),
    amount:        String(d.amount        ?? "0"),
    currency:      String(d.currency      ?? "USDT"),
    network:       String(d.network       ?? ""),
    address:       d.address ? String(d.address) : null,
    paymentStatus: String(d.payment_status ?? d.status ?? "check"),
    status:        String(d.status        ?? "check"),
    url:           String(d.url           ?? ""),
    expiredAt:     d.expired_at != null ? Number(d.expired_at) : null,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function createPayment(params: {
  amount: number;
  network: CryptomusNetwork;
  orderId: string;
  callbackUrl?: string;
}): Promise<CryptomusPayment> {
  const body: Record<string, unknown> = {
    amount:   params.amount.toFixed(2),
    currency: "USDT",
    network:  params.network,
    order_id: params.orderId,
    is_payment_multiple: false,
    lifetime: 900, // 15-minute window
  };
  if (params.callbackUrl) body.url_callback = params.callbackUrl;

  const data = await cryptomusPost<Record<string, unknown>>("/payment", body);
  logger.info({ uuid: data.uuid, orderId: params.orderId, network: params.network }, "Cryptomus payment created");
  return parsePayment(data);
}

export async function getPaymentStatus(uuid: string): Promise<CryptomusPayment> {
  const data = await cryptomusPost<Record<string, unknown>>("/payment/info", { uuid });
  return parsePayment(data);
}

// ── Terminal status sets ───────────────────────────────────────────────────────

/** Statuses that mean "payment received — credit the wallet" */
export const FINISHED_STATUSES = new Set(["paid", "paid_over"]);

/**
 * Statuses that mean "payment will never complete — reject"
 * `wrong_amount_waiting` → user sent wrong amount and the window has now expired
 */
export const FAILED_STATUSES   = new Set(["fail", "wrong_amount", "wrong_amount_waiting", "cancel", "system_fail"]);
