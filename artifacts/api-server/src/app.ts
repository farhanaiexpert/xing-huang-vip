import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
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
    // CSP intentionally disabled: this service also serves the web3 sportsbook /
    // admin frontends, whose wallet connectors (WalletConnect/Reown, injected
    // providers) rely on inline/eval and many third-party origins. A strict CSP
    // breaks those flows, matching how the static sites were previously served
    // (nginx/Vercel applied no CSP either).
    contentSecurityPolicy: false,
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

// ── Diagnostic endpoint (safe — no secrets exposed) ───────────────────────────
app.get(`${BASE}/debug/database`, async (_req, res): Promise<void> => {
  try {
    const dbInfo = await db.execute(sql`
      SELECT
        current_database()          AS db_name,
        current_user                AS db_user,
        (SELECT COUNT(*) FROM users)::int                                        AS total_users,
        (SELECT COUNT(*) FROM users WHERE role IN ('admin','super_admin'))::int  AS total_admins,
        (SELECT COUNT(*) FROM sessions)::int                                     AS total_sessions,
        (SELECT COUNT(*) FROM bets)::int                                         AS total_bets,
        (SELECT COUNT(*) FROM transactions)::int                                 AS total_transactions,
        (SELECT string_agg(email, ', ' ORDER BY id)
           FROM users WHERE role IN ('admin','super_admin'))                     AS admin_emails,
        (SELECT string_agg(table_name, ', ' ORDER BY table_name)
           FROM information_schema.tables
           WHERE table_schema = 'public')                                        AS tables_present
    `);
    const row = dbInfo.rows[0] as Record<string, unknown>;
    res.json({
      connection: "ok",
      database:   row.db_name,
      dbUser:     row.db_user,
      jwtSecret:  process.env.JWT_SECRET ? "set" : "MISSING — login will fail with 500",
      nodeEnv:    process.env.NODE_ENV ?? "not set",
      users: {
        total:  row.total_users,
        admins: row.total_admins,
      },
      adminEmails: row.admin_emails ?? "none",
      sessions:     row.total_sessions,
      bets:         row.total_bets,
      transactions: row.total_transactions,
      migrations:   "ok — " + (row.tables_present as string).split(", ").length + " tables",
    });
  } catch (err) {
    res.status(500).json({ connection: "error", message: String(err) });
  }
});

// ── One-time admin bootstrap (only active when ADMIN_INIT_TOKEN env var is set) ─
// Visit GET /api/init-admin?token=<ADMIN_INIT_TOKEN> to create/reset the admin
// account. Remove ADMIN_INIT_TOKEN from Render env vars once done.
app.get(`${BASE}/init-admin`, async (req, res): Promise<void> => {
  const initToken = process.env.ADMIN_INIT_TOKEN;
  if (!initToken || req.query.token !== initToken) {
    res.status(403).json({ error: "Forbidden — set ADMIN_INIT_TOKEN env var and pass ?token=<value>" });
    return;
  }
  const ADMIN_EMAIL    = "admin@xinghuang.vip";
  const ADMIN_PASSWORD = "XingAdmin2026!";
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await db.select({ id: usersTable.id })
    .from(usersTable).where(eq(usersTable.email, ADMIN_EMAIL)).limit(1);
  if (existing.length > 0) {
    await db.update(usersTable)
      .set({ passwordHash: hash, role: "super_admin", username: "superadmin" })
      .where(eq(usersTable.email, ADMIN_EMAIL));
  } else {
    await db.insert(usersTable).values({
      email: ADMIN_EMAIL, passwordHash: hash, role: "super_admin",
      referralCode: "ADMIN0001", username: "superadmin",
    });
  }
  logger.info("Admin bootstrap: admin@xinghuang.vip created/updated");
  res.json({ ok: true, message: "Admin account ready. Email: admin@xinghuang.vip — use the password you configured." });
});

app.use(BASE, apiRouter);

// Unknown API routes return JSON (not the Express default plain-text 404), so
// clients always get a consistent shape. Scoped to BASE so it never catches
// frontend routes handled by the SPA fallback below.
app.use(BASE, (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Serve built frontends (single-service production deploy) ──────────────────
// In production we run ONE service: this server also serves the built sportsbook
// (at /) and admin (at /admin) static files. The frontends are built WITHOUT
// VITE_API_BASE_URL, so they call this same origin at /api — no CORS needed.
// The static files only exist after `pnpm --filter @workspace/<app> run build`,
// so each block is guarded and simply skipped when its build is absent (e.g. dev).
const here = path.dirname(fileURLToPath(import.meta.url));
const sportsbookDist = path.resolve(here, "../../sportsbook/dist/public");
const adminDist = path.resolve(here, "../../admin/dist/public");
const hasAdmin = existsSync(path.join(adminDist, "index.html"));
const hasSportsbook = existsSync(path.join(sportsbookDist, "index.html"));

if (hasAdmin) {
  app.use("/admin", express.static(adminDist));
}
if (hasSportsbook) {
  app.use(express.static(sportsbookDist));
}

// SPA fallback — any non-API GET returns the matching index.html so client-side
// routing and page refreshes work. API paths fall through to the JSON 404 handler.
if (hasAdmin || hasSportsbook) {
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path === BASE || req.path.startsWith(`${BASE}/`)) return next();
    if (hasAdmin && (req.path === "/admin" || req.path.startsWith("/admin/"))) {
      return res.sendFile(path.join(adminDist, "index.html"));
    }
    if (hasSportsbook) {
      return res.sendFile(path.join(sportsbookDist, "index.html"));
    }
    return next();
  });
  logger.info({ hasSportsbook, hasAdmin }, "Static frontend serving enabled");
}

export default app;
