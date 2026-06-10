import crypto from "crypto";
import { logger } from "./logger.js";
import { recordApiCall } from "./apiUsage.js";

const BASE_URL = "https://api.nowpayments.io/v1";

function apiKey(): string {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not set");
  return key;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NowPayment {
  paymentId: string;
  paymentStatus: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  priceCurrency: string;
  orderId: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreatePaymentParams {
  priceAmount: number;
  payCurrency?: string;       // default: "usdttrc20"
  priceCurrency?: string;     // default: "usd"
  orderId?: string;
  orderDescription?: string;
  ipnCallbackUrl?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePayment(d: Record<string, unknown>): NowPayment {
  return {
    paymentId:     String(d.payment_id),
    paymentStatus: String(d.payment_status ?? "waiting"),
    payAddress:    String(d.pay_address ?? ""),
    payAmount:     Number(d.pay_amount ?? 0),
    payCurrency:   String(d.pay_currency ?? "usdttrc20"),
    priceAmount:   Number(d.price_amount ?? 0),
    priceCurrency: String(d.price_currency ?? "usd"),
    orderId:       d.order_id ? String(d.order_id) : null,
    createdAt:     String(d.created_at ?? new Date().toISOString()),
    expiresAt:     d.expiration_estimate_date ? String(d.expiration_estimate_date) : null,
  };
}

async function nowGet<T>(path: string): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}${path}`, {
      headers: { "x-api-key": apiKey(), "Accept": "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
  } catch (e) {
    recordApiCall("nowpayments", false, "network", `GET ${path} → network/timeout`);
    throw e;
  }
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    recordApiCall("nowpayments", false, `HTTP ${resp.status}`, `GET ${path} → HTTP ${resp.status}`);
    throw new Error(`NOWPayments ${path} → HTTP ${resp.status}: ${body}`);
  }
  recordApiCall("nowpayments", true, "ok");
  return resp.json() as Promise<T>;
}

async function nowPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE_URL}${path}`, {
      method:  "POST",
      headers: { "x-api-key": apiKey(), "Content-Type": "application/json", "Accept": "application/json" },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(12_000),
    });
  } catch (e) {
    recordApiCall("nowpayments", false, "network", `POST ${path} → network/timeout`);
    throw e;
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    recordApiCall("nowpayments", false, `HTTP ${resp.status}`, `POST ${path} → HTTP ${resp.status}`);
    throw new Error(`NOWPayments ${path} → HTTP ${resp.status}: ${text}`);
  }
  recordApiCall("nowpayments", true, "ok");
  return resp.json() as Promise<T>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkApiStatus(): Promise<boolean> {
  try {
    const d = await nowGet<{ message: string }>("/status");
    return d.message === "OK";
  } catch {
    return false;
  }
}

export async function createPayment(params: CreatePaymentParams): Promise<NowPayment> {
  const payload: Record<string, unknown> = {
    price_amount:   params.priceAmount,
    price_currency: params.priceCurrency ?? "usd",
    pay_currency:   params.payCurrency   ?? "usdttrc20",
  };
  if (params.orderId)          payload.order_id           = params.orderId;
  if (params.orderDescription) payload.order_description  = params.orderDescription;
  if (params.ipnCallbackUrl)   payload.ipn_callback_url   = params.ipnCallbackUrl;

  const data = await nowPost<Record<string, unknown>>("/payment", payload);
  logger.info({ paymentId: data.payment_id, status: data.payment_status }, "NOWPayments payment created");
  return parsePayment(data);
}

export async function getPaymentStatus(paymentId: string): Promise<NowPayment> {
  const data = await nowGet<Record<string, unknown>>(`/payment/${paymentId}`);
  return parsePayment(data);
}

/** Returns the minimum payment amount in USD for the given pay currency */
export async function getMinimumPaymentAmount(payCurrency: string = "usdttrc20"): Promise<number> {
  try {
    const data = await nowGet<{ min_amount: number; currency_from: string; currency_to: string }>(
      `/min-amount?currency_from=usd&currency_to=${payCurrency}`
    );
    return Number(data.min_amount) || 0;
  } catch {
    return 0;
  }
}

// ── IPN Signature Verification ────────────────────────────────────────────────

/** Sort object keys recursively (NOWPayments requirement for HMAC verification) */
function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [
        k,
        v !== null && typeof v === "object" && !Array.isArray(v)
          ? sortKeys(v as Record<string, unknown>)
          : v,
      ])
  );
}

export function verifyIpnSignature(
  body: Record<string, unknown>,
  signature: string
): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) {
    logger.warn("NOWPAYMENTS_IPN_SECRET not set — skipping IPN verification");
    return false;
  }
  const sorted  = sortKeys(body);
  const message = JSON.stringify(sorted);
  const expected = crypto.createHmac("sha512", secret).update(message).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/** Terminal statuses that mean "payment done, credit wallet" */
export const FINISHED_STATUSES = new Set(["finished", "confirmed"]);
/** Terminal statuses that mean "payment dead" */
export const FAILED_STATUSES   = new Set(["failed", "refunded", "expired"]);
