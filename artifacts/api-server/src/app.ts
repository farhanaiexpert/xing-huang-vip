import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import apiRouter from "./routes/index.js";

const app = express();

// Trust the first hop of the reverse proxy (Replit's proxy / nginx / load balancer)
// so that express-rate-limit reads the real client IP from X-Forwarded-For
// instead of treating every request as coming from the proxy's IP.
app.set("trust proxy", 1);

// ── HTTP security headers (Helmet) ─────────────────────────────────────────
// Sets X-Content-Type-Options, X-Frame-Options, X-XSS-Protection,
// Strict-Transport-Security, Referrer-Policy, and more.
// crossOriginResourcePolicy: false — our API is consumed cross-origin by the
// sportsbook / admin frontends, so we must not block cross-origin reads.
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false, // API-only server; no HTML to protect
  }),
);

// ── Rate limiters ──────────────────────────────────────────────────────────────
// Auth endpoints: 20 attempts per 15-minute window per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts — please try again in 15 minutes" },
});

// Wallet endpoints: 30 requests per minute per IP (flood / API-cost protection)
const walletLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many wallet requests — please slow down" },
});

// General API: 200 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down" },
});

// ── CORS ───────────────────────────────────────────────────────────────────────
// Production: restrict to ALLOWED_ORIGINS env var (comma-separated).
// Development / unset: allow all origins so the dev preview works out of the box.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header = same-origin, server-to-server, or native mobile — allow.
      if (!origin) return callback(null, true);
      // In development or when no allowlist is configured, allow everything.
      if (process.env.NODE_ENV !== "production" || ALLOWED_ORIGINS.length === 0) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(express.json());

const BASE = process.env.BASE_PATH ?? "/api";

// ── Apply rate limiters before routing ────────────────────────────────────────
app.use(`${BASE}/auth/login`, authLimiter);
app.use(`${BASE}/auth/register`, authLimiter);
app.use(`${BASE}/auth/wallet-auth`, authLimiter);
app.use(`${BASE}/auth/refresh`, authLimiter);
app.use(`${BASE}/wallet`, walletLimiter);
app.use(BASE, generalLimiter);

// Public health-check — must be registered BEFORE apiRouter because the
// admin catch-all (router.use(authenticate, requireAdmin)) would 401 it otherwise.
app.get(`${BASE}/health`, (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.get(`${BASE}/healthz`, (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(BASE, apiRouter);

export default app;
