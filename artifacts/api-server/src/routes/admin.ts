import { Router } from "express";
import { eq, desc, gte, lte, sql, count, sum, and, or, ilike, like, inArray, isNull, isNotNull } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  db,
  usersTable,
  walletsTable,
  transactionsTable,
  betsTable,
  betSelectionsTable,
  referralsTable,
  commissionsTable,
  promotionsTable,
  promotionClaimsTable,
  promotionRequirementsTable,
  predictionPoolsTable,
  poolEntriesTable,
  adminLogsTable,
  sessionsTable,
  winspinSpinsTable,
  winspinPrizesTable,
  sportControlsTable,
  platformSettingsTable,
  userNotesTable,
  settlementLogTable,
  marketLiabilityTable,
  userLimitsTable,
  selfExclusionsTable,
  riskFlagsTable,
  translationOverridesTable,
  translationQueueTable,
} from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getBetsApiWindowUsage } from "../lib/betsApiRateLimiter.js";
import { markCovered } from "../lib/translationQueue.js";

const router = Router();

// All admin routes require auth + super_admin role
router.use(authenticate, requireAdmin);

// ─── Audit log helper ────────────────────────────────────────────────────────
async function logAdminAction(
  adminId: number,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: Record<string, unknown>,
) {
  await db.insert(adminLogsTable).values({ adminId, action, entityType, entityId, details: details ?? null });
}

// ─── Odds API credit status ───────────────────────────────────────────────────
router.get("/admin/odds-credits", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(platformSettingsTable)
      .where(inArray(platformSettingsTable.key, [
        'odds_credits_remaining',
        'odds_credits_updated_at',
      ]));
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const remaining = map.odds_credits_remaining != null ? Number(map.odds_credits_remaining) : null;
    res.json({
      remaining,
      updatedAt: map.odds_credits_updated_at ?? null,
      status: remaining === null ? 'unknown'
        : remaining < 50  ? 'critical'
        : remaining < 200 ? 'low'
        : remaining < 500 ? 'warning'
        : 'ok',
    });
  } catch {
    res.status(500).json({ error: 'Failed to read odds credits' });
  }
});

// ─── External API status dashboard ────────────────────────────────────────────
router.get("/admin/api-status", async (_req, res): Promise<void> => {
  try {
    const usage = await db.execute(sql`
      SELECT provider, calls, errors, last_status, last_error, last_at
      FROM api_usage_daily WHERE day = CURRENT_DATE
    `);
    const usageMap = new Map<string, { calls: number; errors: number; lastStatus: string | null; lastError: string | null; lastAt: string | null }>();
    for (const r of usage.rows as Array<Record<string, unknown>>) {
      usageMap.set(String(r.provider), {
        calls: Number(r.calls ?? 0),
        errors: Number(r.errors ?? 0),
        lastStatus: r.last_status != null ? String(r.last_status) : null,
        lastError: r.last_error != null ? String(r.last_error) : null,
        lastAt: r.last_at != null ? new Date(r.last_at as string).toISOString() : null,
      });
    }

    const settingRows = await db.select().from(platformSettingsTable)
      .where(inArray(platformSettingsTable.key, [
        'odds_credits_remaining', 'odds_credits_updated_at',
        'odds_api_enabled', 'betsapi_enabled',
      ]));
    const settings = Object.fromEntries(settingRows.map(r => [r.key, r.value]));
    const oddsRemaining = settings.odds_credits_remaining != null ? Number(settings.odds_credits_remaining) : null;
    // A missing key = enabled by default (fail-open). Only 'false' means paused.
    const oddsApiPaused   = settings.odds_api_enabled === 'false';
    const betsApiPaused   = settings.betsapi_enabled  === 'false';

    const betsApiHourly = await getBetsApiWindowUsage();

    const DEFS = [
      { id: "odds_api",     name: "The Odds API",     envKey: "ODDS_API_KEY",        purpose: "Primary match odds & live scores" },
      { id: "betsapi",      name: "BetsAPI (Bet365)", envKey: "BETSAPI_KEY",         purpose: "Live in-play data & Bet365 markets" },
      { id: "nowpayments",  name: "NOWPayments",      envKey: "NOWPAYMENTS_API_KEY", purpose: "Crypto deposit gateway" },
    ] as const;

    const providers = DEFS.map(def => {
      const u = usageMap.get(def.id);
      const configured = !!process.env[def.envKey];
      const callsToday = u?.calls ?? 0;
      const errorsToday = u?.errors ?? 0;
      const lastStatus = u?.lastStatus ?? null;
      const lastError = u?.lastError ?? null;
      const lastAt = u?.lastAt ?? null;
      const ls = (lastStatus ?? "").toLowerCase();

      // Admin pause flag — only betsapi and odds_api are toggleable
      const paused = def.id === "odds_api" ? oddsApiPaused
                   : def.id === "betsapi"  ? betsApiPaused
                   : false;

      let status: "operational" | "degraded" | "throttled" | "down" | "idle" | "paused";
      let headline: string;

      if (paused) {
        status = "paused";
        headline = "Manually paused by admin — no outbound calls until re-enabled. Existing cache continues to serve data.";
      } else if (!configured) {
        status = "down";
        headline = "Not configured — API key is missing.";
      } else if (/401|403|authorize|unauthor|forbidden/.test(ls)) {
        status = "down";
        headline = "Authentication is failing — the key may be invalid or expired.";
      } else if (/429|too_many|quota|volume|exhaust/.test(ls)) {
        status = "throttled";
        headline = "Rate limit / request volume reached — calls are being rejected.";
      } else if (callsToday === 0) {
        status = "idle";
        headline = "Configured and ready — no calls made yet today.";
      } else if (errorsToday > 0 && errorsToday / callsToday >= 0.5) {
        status = "degraded";
        headline = "Many recent calls are failing — provider may be unstable.";
      } else {
        status = "operational";
        headline = "Working normally.";
      }

      let quotaRemaining: number | null = null;
      let quotaUpdatedAt: string | null = null;
      if (def.id === "odds_api") {
        quotaRemaining = oddsRemaining;
        quotaUpdatedAt = settings.odds_credits_updated_at ?? null;
        if (!paused && configured && quotaRemaining !== null) {
          if (quotaRemaining < 50 && status !== "down") {
            status = "throttled";
            headline = `Critically low — only ${quotaRemaining} credits left.`;
          } else if (quotaRemaining < 200 && (status === "operational" || status === "idle")) {
            status = "degraded";
            headline = `Credits running low — ${quotaRemaining} left.`;
          }
        }
      }

      const extra: Record<string, unknown> = {};
      if (def.id === "betsapi") {
        extra.cronDisabled = process.env.BETSAPI_CRON_DISABLED === "1" || process.env.BETSAPI_CRON_DISABLED === "true";
        extra.hourlyLimit = betsApiHourly.limit;
        extra.hourlyUsed = betsApiHourly.used;
        extra.hourlyRemaining = betsApiHourly.remaining;
        extra.hourlyLimitNote = `Hard cap: ${betsApiHourly.limit} requests per 3-hour window, enforced system-wide. ${betsApiHourly.used}/${betsApiHourly.limit} used this window.`;
        extra.windowExhaustedUntil = betsApiHourly.exhaustedUntil;
        if (!paused && configured && betsApiHourly.remaining === 0 && status !== "down") {
          status = "throttled";
          const resumeAt = betsApiHourly.exhaustedUntil
            ? ` Resumes at ${new Date(betsApiHourly.exhaustedUntil).toUTCString()}.`
            : ' Calls paused until the next 3-hour window.';
          headline = `3-hour credit cap reached — ${betsApiHourly.limit}/${betsApiHourly.limit} used.${resumeAt}`;
        }
      }

      return {
        id: def.id,
        name: def.name,
        purpose: def.purpose,
        configured,
        paused,
        status,
        headline,
        callsToday,
        errorsToday,
        lastStatus,
        lastError,
        lastAt,
        quotaRemaining,
        quotaUpdatedAt,
        ...extra,
      };
    });

    res.json({ providers, generatedAt: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: "Failed to read API status" });
  }
});

// ─── Toggle API provider on/off ───────────────────────────────────────────────
router.post("/admin/api-toggle", async (req, res): Promise<void> => {
  const parsed = z.object({
    provider: z.enum(["betsapi", "odds_api"]),
    enabled: z.boolean(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "provider must be 'betsapi' or 'odds_api', enabled must be boolean" });
    return;
  }

  const { provider, enabled } = parsed.data;
  const key = `${provider}_enabled`;
  const description = provider === "betsapi"
    ? "Admin toggle — BetsAPI (Bet365) outbound calls"
    : "Admin toggle — The Odds API outbound calls";

  await db.insert(platformSettingsTable)
    .values({ key, value: String(enabled), description })
    .onConflictDoUpdate({
      target: platformSettingsTable.key,
      set: { value: String(enabled), updatedAt: new Date() },
    });

  await logAdminAction(
    req.user!.userId,
    enabled ? "api_enabled" : "api_paused",
    "api_provider",
    undefined,
    { provider },
  );

  res.json({ provider, enabled });
});

// ─── Stats ───────────────────────────────────────────────────────────────────
router.get("/admin/stats", async (req, res): Promise<void> => {
  // All platform-total stats exclude test accounts (is_test_account = true)
  const [userCount] = await db.select({ count: count() }).from(usersTable)
    .where(eq(usersTable.isTestAccount, false));
  const [betStats] = await db
    .select({ count: count(), volume: sum(betsTable.stake) })
    .from(betsTable)
    .innerJoin(usersTable, and(eq(betsTable.userId, usersTable.id), eq(usersTable.isTestAccount, false)));
  const [pendingDeposits] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .innerJoin(usersTable, and(eq(transactionsTable.userId, usersTable.id), eq(usersTable.isTestAccount, false)))
    .where(and(eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "pending")));
  const [pendingWithdrawals] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .innerJoin(usersTable, and(eq(transactionsTable.userId, usersTable.id), eq(usersTable.isTestAccount, false)))
    .where(and(eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "pending")));
  const [openBets] = await db
    .select({ count: count() })
    .from(betsTable)
    .innerJoin(usersTable, and(eq(betsTable.userId, usersTable.id), eq(usersTable.isTestAccount, false)))
    .where(eq(betsTable.status, "open"));
  const [walletStats] = await db
    .select({ totalBalance: sum(walletsTable.balanceUsdt) })
    .from(walletsTable)
    .innerJoin(usersTable, and(eq(walletsTable.userId, usersTable.id), eq(usersTable.isTestAccount, false)));
  const [commissionStats] = await db
    .select({ total: sum(commissionsTable.amount) })
    .from(commissionsTable)
    .innerJoin(usersTable, and(eq(commissionsTable.userId, usersTable.id), eq(usersTable.isTestAccount, false)))
    .where(eq(commissionsTable.status, "paid"));

  // Gross gaming revenue = total stakes from settled bets − actual payouts (non-test accounts only)
  const revenueRows = await db.execute(sql`
    SELECT
      COALESCE(SUM(b.stake), 0)::text AS total_stakes,
      COALESCE(SUM(COALESCE(b.settled_payout, 0)) FILTER (WHERE b.status IN ('won', 'void')), 0)::text AS total_winnings
    FROM bets b
    JOIN users u ON u.id = b.user_id AND u.is_test_account = false
    WHERE b.status IN ('won', 'lost', 'void')
  `);
  const rev = revenueRows.rows[0] as { total_stakes: string; total_winnings: string };
  const grossRevenue = (Number(rev.total_stakes) - Number(rev.total_winnings)).toFixed(2);

  // ── Today-vs-yesterday deltas (UTC day boundaries, non-test accounts) ──
  // Boundaries are computed once as timestamptz (CROSS JOIN bnd) so comparisons
  // against timestamptz columns are timezone-independent regardless of session TZ.
  const usersDeltaRows = await db.execute(sql`
    WITH bnd AS (
      SELECT (date_trunc('day', now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC' AS today_start,
             (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day') AT TIME ZONE 'UTC' AS yday_start
    )
    SELECT
      COUNT(*) FILTER (WHERE created_at >= bnd.today_start)::int AS today,
      COUNT(*) FILTER (WHERE created_at >= bnd.yday_start AND created_at < bnd.today_start)::int AS yesterday
    FROM users CROSS JOIN bnd
    WHERE is_test_account = false
  `);

  const betsDeltaRows = await db.execute(sql`
    WITH bnd AS (
      SELECT (date_trunc('day', now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC' AS today_start,
             (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day') AT TIME ZONE 'UTC' AS yday_start
    )
    SELECT
      COUNT(*) FILTER (WHERE b.created_at >= bnd.today_start)::int AS cnt_today,
      COUNT(*) FILTER (WHERE b.created_at >= bnd.yday_start AND b.created_at < bnd.today_start)::int AS cnt_yday,
      COALESCE(SUM(b.stake) FILTER (WHERE b.created_at >= bnd.today_start), 0)::text AS vol_today,
      COALESCE(SUM(b.stake) FILTER (WHERE b.created_at >= bnd.yday_start AND b.created_at < bnd.today_start), 0)::text AS vol_yday
    FROM bets b
    JOIN users u ON u.id = b.user_id AND u.is_test_account = false
    CROSS JOIN bnd
  `);

  const ggrDeltaRows = await db.execute(sql`
    WITH bnd AS (
      SELECT (date_trunc('day', now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC' AS today_start,
             (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day') AT TIME ZONE 'UTC' AS yday_start
    )
    SELECT
      (COALESCE(SUM(b.stake) FILTER (WHERE b.settled_at >= bnd.today_start), 0)
       - COALESCE(SUM(COALESCE(b.settled_payout, 0)) FILTER (WHERE b.settled_at >= bnd.today_start AND b.status IN ('won','void')), 0))::text AS ggr_today,
      (COALESCE(SUM(b.stake) FILTER (WHERE b.settled_at >= bnd.yday_start AND b.settled_at < bnd.today_start), 0)
       - COALESCE(SUM(COALESCE(b.settled_payout, 0)) FILTER (WHERE b.settled_at >= bnd.yday_start AND b.settled_at < bnd.today_start AND b.status IN ('won','void')), 0))::text AS ggr_yday
    FROM bets b
    JOIN users u ON u.id = b.user_id AND u.is_test_account = false
    CROSS JOIN bnd
    WHERE b.status IN ('won','lost','void')
  `);

  const commissionsDeltaRows = await db.execute(sql`
    WITH bnd AS (
      SELECT (date_trunc('day', now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC' AS today_start,
             (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day') AT TIME ZONE 'UTC' AS yday_start
    )
    SELECT
      COALESCE(SUM(c.amount) FILTER (WHERE c.created_at >= bnd.today_start), 0)::text AS today,
      COALESCE(SUM(c.amount) FILTER (WHERE c.created_at >= bnd.yday_start AND c.created_at < bnd.today_start), 0)::text AS yesterday
    FROM commissions c
    JOIN users u ON u.id = c.user_id AND u.is_test_account = false
    CROSS JOIN bnd
    WHERE c.status = 'paid'
  `);

  // ── Transaction-flow deltas for the pending/balance KPI cards ──
  // Same stock-value + flow-delta pattern as Total Users: card shows current
  // pending/balance, delta shows today-vs-yesterday request flow / net cash flow.
  const txDeltaRows = await db.execute(sql`
    WITH bnd AS (
      SELECT (date_trunc('day', now() AT TIME ZONE 'UTC')) AT TIME ZONE 'UTC' AS today_start,
             (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day') AT TIME ZONE 'UTC' AS yday_start
    )
    SELECT
      COUNT(*) FILTER (WHERE t.type = 'deposit' AND t.created_at >= bnd.today_start)::int AS dep_today,
      COUNT(*) FILTER (WHERE t.type = 'deposit' AND t.created_at >= bnd.yday_start AND t.created_at < bnd.today_start)::int AS dep_yday,
      COUNT(*) FILTER (WHERE t.type = 'withdrawal' AND t.created_at >= bnd.today_start)::int AS wd_today,
      COUNT(*) FILTER (WHERE t.type = 'withdrawal' AND t.created_at >= bnd.yday_start AND t.created_at < bnd.today_start)::int AS wd_yday,
      (COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'deposit' AND t.status = 'completed' AND t.created_at >= bnd.today_start), 0)
       - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'withdrawal' AND t.status = 'completed' AND t.created_at >= bnd.today_start), 0))::text AS flow_today,
      (COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'deposit' AND t.status = 'completed' AND t.created_at >= bnd.yday_start AND t.created_at < bnd.today_start), 0)
       - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'withdrawal' AND t.status = 'completed' AND t.created_at >= bnd.yday_start AND t.created_at < bnd.today_start), 0))::text AS flow_yday
    FROM transactions t
    JOIN users u ON u.id = t.user_id AND u.is_test_account = false
    CROSS JOIN bnd
  `);

  // ── Attention-strip counts not already returned above (exclude test accounts) ──
  const [kycPendingRow] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(and(eq(usersTable.isTestAccount, false), eq(usersTable.kycStatus, "pending")));
  const riskFlagRows = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt
    FROM risk_flags rf
    JOIN users u ON u.id = rf.user_id AND u.is_test_account = false
    WHERE rf.created_at >= now() - interval '24 hours'
  `);

  const ud = usersDeltaRows.rows[0] as { today: number; yesterday: number };
  const bd = betsDeltaRows.rows[0] as { cnt_today: number; cnt_yday: number; vol_today: string; vol_yday: string };
  const gd = ggrDeltaRows.rows[0] as { ggr_today: string; ggr_yday: string };
  const cd = commissionsDeltaRows.rows[0] as { today: string; yesterday: string };
  const td = txDeltaRows.rows[0] as {
    dep_today: number; dep_yday: number; wd_today: number; wd_yday: number;
    flow_today: string; flow_yday: string;
  };
  const riskFlags = Number((riskFlagRows.rows[0] as { cnt: number }).cnt);

  res.json({
    users: { total: Number(userCount.count) },
    bets: { total: Number(betStats.count), volume: betStats.volume ?? "0", open: Number(openBets.count) },
    transactions: {
      pendingDeposits: Number(pendingDeposits.count),
      pendingWithdrawals: Number(pendingWithdrawals.count),
    },
    platform: {
      totalWalletBalance: walletStats.totalBalance ?? "0",
      totalCommissionsPaid: commissionStats.total ?? "0",
      grossRevenue,
    },
    deltas: {
      newUsers:     { today: Number(ud.today), yesterday: Number(ud.yesterday) },
      bets:         { today: Number(bd.cnt_today), yesterday: Number(bd.cnt_yday) },
      betVolume:    { today: bd.vol_today, yesterday: bd.vol_yday },
      grossRevenue: { today: gd.ggr_today, yesterday: gd.ggr_yday },
      commissions:  { today: cd.today, yesterday: cd.yesterday },
      pendingDeposits:    { today: Number(td.dep_today), yesterday: Number(td.dep_yday) },
      pendingWithdrawals: { today: Number(td.wd_today), yesterday: Number(td.wd_yday) },
      platformBalance:    { today: td.flow_today, yesterday: td.flow_yday },
    },
    attention: {
      kycPending: Number(kycPendingRow.count),
      riskFlags,
    },
  });
});

// ─── Bets chart (last 30 days) ────────────────────────────────────────────────
router.get("/admin/stats/bets-chart", async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'MM-DD') AS day,
      count(*)::int AS count,
      coalesce(sum(stake), 0)::text AS volume
    FROM bets
    WHERE created_at >= now() - interval '30 days'
    GROUP BY date_trunc('day', created_at AT TIME ZONE 'UTC')
    ORDER BY date_trunc('day', created_at AT TIME ZONE 'UTC')
  `);
  res.json(rows.rows);
});

router.get("/admin/stats/users-chart", async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'MM-DD') AS day,
      count(*)::int AS count
    FROM users
    WHERE created_at >= now() - interval '30 days'
    GROUP BY date_trunc('day', created_at AT TIME ZONE 'UTC')
    ORDER BY date_trunc('day', created_at AT TIME ZONE 'UTC')
  `);
  res.json(rows.rows);
});

router.get("/admin/stats/user-growth", async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    WITH days AS (
      SELECT generate_series(
        date_trunc('day', now() AT TIME ZONE 'UTC') - interval '29 days',
        date_trunc('day', now() AT TIME ZONE 'UTC'),
        interval '1 day'
      )::date AS d
    ),
    new_sigs AS (
      SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::int AS cnt
      FROM users
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
    ),
    logins AS (
      SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::int AS cnt
      FROM sessions
      WHERE created_at >= now() - interval '30 days'
      GROUP BY 1
    )
    SELECT
      to_char(days.d, 'MM-DD')                                            AS day,
      COALESCE(new_sigs.cnt, 0)                                           AS "newUsers",
      GREATEST(0, COALESCE(logins.cnt, 0) - COALESCE(new_sigs.cnt, 0))   AS "returningLogins"
    FROM days
    LEFT JOIN new_sigs ON new_sigs.d = days.d
    LEFT JOIN logins   ON logins.d   = days.d
    ORDER BY days.d
  `);
  res.json(rows.rows);
});

router.get("/admin/stats/revenue-chart", async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      to_char(date_trunc('day', b.created_at AT TIME ZONE 'UTC'), 'MM-DD') AS day,
      coalesce(sum(b.stake), 0)::text AS stakes,
      coalesce(sum(COALESCE(b.settled_payout, 0)) FILTER (WHERE b.status IN ('won', 'void')), 0)::text AS payouts
    FROM bets b
    JOIN users u ON u.id = b.user_id AND u.is_test_account = false
    WHERE b.created_at >= now() - interval '30 days'
    GROUP BY date_trunc('day', b.created_at AT TIME ZONE 'UTC')
    ORDER BY date_trunc('day', b.created_at AT TIME ZONE 'UTC')
  `);
  res.json(rows.rows);
});

router.get("/admin/stats/recent-activity", async (req, res): Promise<void> => {
  const logs = await db
    .select({
      id: adminLogsTable.id,
      adminId: adminLogsTable.adminId,
      adminUsername: usersTable.username,
      action: adminLogsTable.action,
      entityType: adminLogsTable.entityType,
      entityId: adminLogsTable.entityId,
      details: adminLogsTable.details,
      createdAt: adminLogsTable.createdAt,
    })
    .from(adminLogsTable)
    .leftJoin(usersTable, eq(usersTable.id, adminLogsTable.adminId))
    .orderBy(desc(adminLogsTable.createdAt))
    .limit(10);
  res.json(logs);
});

// ─── Users ───────────────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  const { search, page = "1", limit = "20", suspended, role } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (search) {
    conditions.push(or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.username, `%${search}%`)));
  }
  if (suspended === "true") conditions.push(eq(usersTable.isSuspended, true));
  if (suspended === "false") conditions.push(eq(usersTable.isSuspended, false));
  if (role === "admins") {
    conditions.push(or(eq(usersTable.role, "admin"), eq(usersTable.role, "super_admin")));
  } else if (role && role !== "all") {
    conditions.push(eq(usersTable.role, role as "user" | "admin" | "super_admin"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
      walletAddress: usersTable.walletAddress,
      walletNetwork: usersTable.walletNetwork,
      role: usersTable.role,
      kycStatus: usersTable.kycStatus,
      country: usersTable.country,
      isSuspended: usersTable.isSuspended,
      referralCode: usersTable.referralCode,
      createdAt: usersTable.createdAt,
      balance: walletsTable.balanceUsdt,
    })
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(where)
    .orderBy(desc(usersTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(usersTable).where(where);

  res.json({ users, total: Number(total.count), page: pageNum, limit: limitNum });
});

const CreateUserBody = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(8),
  role: z.enum(["user", "admin", "super_admin"]).default("user"),
});

router.post("/admin/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { email, username, password, role } = parsed.data;

  if ((role === "admin" || role === "super_admin") && req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: only super admins can create admin accounts" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable)
    .where(or(eq(usersTable.email, email.toLowerCase()), eq(usersTable.username, username)))
    .limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Email or username already in use" }); return; }

  const passwordHash = await bcrypt.hash(password, 12);
  const [newUser] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    username,
    passwordHash,
    role,
  }).returning({ id: usersTable.id, username: usersTable.username, email: usersTable.email });

  await db.insert(walletsTable).values({ userId: newUser.id });
  await logAdminAction(req.user!.userId, "create_user", "user", newUser.id, { username, role });
  res.status(201).json(newUser);
});

// ─── Users summary (status / KYC breakdown + total balance) ───────────────────
// Registered BEFORE /admin/users/:id so "summary" is not parsed as an id.
// Respects the optional email/username `search` filter so the cards scope to the
// current search. Scope matches the table (test accounts NOT excluded).
router.get("/admin/users/summary", async (req, res): Promise<void> => {
  const { search, excludeTest } = req.query as Record<string, string>;
  const searchWhere = search
    ? or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.username, `%${search}%`))
    : undefined;
  // Overview cockpit passes excludeTest=true so production KPIs match /admin/stats.
  const where = excludeTest === "true"
    ? and(eq(usersTable.isTestAccount, false), searchWhere)
    : searchWhere;

  const [row] = await db
    .select({
      total: count(),
      active: sql<number>`COUNT(*) FILTER (WHERE ${usersTable.isSuspended} = false)::int`,
      suspended: sql<number>`COUNT(*) FILTER (WHERE ${usersTable.isSuspended} = true)::int`,
      kycVerified: sql<number>`COUNT(*) FILTER (WHERE ${usersTable.kycStatus} IN ('verified','approved'))::int`,
      kycPending: sql<number>`COUNT(*) FILTER (WHERE ${usersTable.kycStatus} = 'pending')::int`,
      newThisWeek: sql<number>`COUNT(*) FILTER (WHERE ${usersTable.createdAt} >= NOW() - INTERVAL '7 days')::int`,
      totalBalance: sql<string>`COALESCE(SUM(${walletsTable.balanceUsdt}), 0)::text`,
    })
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(where);

  res.json({
    total: Number(row.total),
    active: Number(row.active),
    suspended: Number(row.suspended),
    kycVerified: Number(row.kycVerified),
    kycPending: Number(row.kycPending),
    newThisWeek: Number(row.newThisWeek),
    totalBalance: row.totalBalance ?? "0",
  });
});

router.get("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
      role: usersTable.role,
      kycStatus: usersTable.kycStatus,
      country: usersTable.country,
      isSuspended: usersTable.isSuspended,
      referralCode: usersTable.referralCode,
      createdAt: usersTable.createdAt,
      balance: walletsTable.balanceUsdt,
    })
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

const PatchUserBody = z.object({
  isSuspended: z.boolean().optional(),
  isTestAccount: z.boolean().optional(),
  role: z.string().optional(),
  kycStatus: z.string().optional(),
  balanceAdjustment: z.number().optional(),
  balanceNote: z.string().optional(),
});

router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PatchUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { isSuspended, isTestAccount, role, kycStatus, balanceAdjustment, balanceNote } = parsed.data;

  if (role !== undefined && (role === "admin" || role === "super_admin") && req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: only super admins can assign admin roles" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (isSuspended !== undefined) updates.isSuspended = isSuspended;
  if (isTestAccount !== undefined) updates.isTestAccount = isTestAccount;
  if (role !== undefined) updates.role = role;
  if (kycStatus !== undefined) updates.kycStatus = kycStatus;

  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, id));
  }

  if (balanceAdjustment !== undefined && balanceAdjustment !== 0) {
    const absAmount = Math.abs(balanceAdjustment);
    const type = balanceAdjustment > 0 ? "credit" : "debit";
    await db.insert(transactionsTable).values({
      userId: id,
      type,
      amount: String(absAmount),
      status: "completed",
      notes: balanceNote ?? `Admin ${type}`,
    });
    if (balanceAdjustment > 0) {
      await db.update(walletsTable)
        .set({ balanceUsdt: sql`balance_usdt + ${String(absAmount)}` })
        .where(eq(walletsTable.userId, id));
    } else {
      await db.update(walletsTable)
        .set({ balanceUsdt: sql`GREATEST(0, balance_usdt - ${String(absAmount)})` })
        .where(eq(walletsTable.userId, id));
    }
  }

  await logAdminAction(req.user!.userId, "patch_user", "user", id, parsed.data as Record<string, unknown>);

  const [updated] = await db
    .select({ id: usersTable.id, email: usersTable.email, username: usersTable.username, isSuspended: usersTable.isSuspended, role: usersTable.role, kycStatus: usersTable.kycStatus, balance: walletsTable.balanceUsdt })
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(eq(usersTable.id, id))
    .limit(1);

  res.json(updated);
});

const ResetPasswordBody = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/admin/users/:id/reset-password", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }

  const [user] = await db.select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, id));

  await logAdminAction(req.user!.userId, "reset_password", "user", id, { username: user.username });
  res.json({ success: true });
});

router.get("/admin/users/:id/bets", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const status = String(req.query.status ?? "all");
  const PAGE = 20;

  const where = status === "all"
    ? eq(betsTable.userId, id)
    : and(eq(betsTable.userId, id), eq(betsTable.status, status));

  const [{ total }] = await db.select({ total: count() }).from(betsTable).where(where);

  const bets = await db
    .select()
    .from(betsTable)
    .where(where)
    .orderBy(desc(betsTable.createdAt))
    .limit(PAGE)
    .offset((page - 1) * PAGE);

  const betIds = bets.map(b => b.id);
  const selections = betIds.length > 0
    ? await db.select().from(betSelectionsTable).where(inArray(betSelectionsTable.betId, betIds))
    : [];

  const selMap: Record<number, (typeof selections)> = {};
  for (const s of selections) {
    if (!selMap[s.betId]) selMap[s.betId] = [];
    selMap[s.betId].push(s);
  }

  res.json({ bets: bets.map(b => ({ ...b, selections: selMap[b.id] ?? [] })), total, page, pages: Math.ceil(Number(total) / PAGE) });
});

router.get("/admin/users/:id/transactions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const type = String(req.query.type ?? "all");
  const PAGE = 20;

  const where = type === "all"
    ? eq(transactionsTable.userId, id)
    : and(eq(transactionsTable.userId, id), eq(transactionsTable.type, type));

  const [{ total }] = await db.select({ total: count() }).from(transactionsTable).where(where);
  const txns = await db.select().from(transactionsTable).where(where)
    .orderBy(desc(transactionsTable.createdAt)).limit(PAGE).offset((page - 1) * PAGE);
  res.json({ transactions: txns, total, page, pages: Math.ceil(Number(total) / PAGE) });
});

// ─── Bets ────────────────────────────────────────────────────────────────────
router.get("/admin/bets", async (req, res): Promise<void> => {
  const { status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (status) conditions.push(eq(betsTable.status, status));
  if (search) conditions.push(ilike(usersTable.username, `%${search}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const bets = await db
    .select({
      id: betsTable.id,
      userId: betsTable.userId,
      username: usersTable.username,
      type: betsTable.type,
      stake: betsTable.stake,
      totalOdds: betsTable.totalOdds,
      potentialReturn: betsTable.potentialReturn,
      status: betsTable.status,
      settledAt: betsTable.settledAt,
      createdAt: betsTable.createdAt,
      eventName: sql<string | null>`(SELECT event_name FROM bet_selections WHERE bet_id = ${betsTable.id} LIMIT 1)`,
      sport: sql<string | null>`(SELECT sport FROM bet_selections WHERE bet_id = ${betsTable.id} LIMIT 1)`,
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(usersTable.id, betsTable.userId))
    .where(where)
    .orderBy(desc(betsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db
    .select({ count: count() })
    .from(betsTable)
    .leftJoin(usersTable, eq(usersTable.id, betsTable.userId))
    .where(where);

  res.json({ bets, total: Number(total.count), page: pageNum, limit: limitNum });
});

// ─── Bets summary (status breakdown + total wagered) ──────────────────────────
// Registered BEFORE /admin/bets/:id so "summary" is not parsed as an id.
// Respects the optional username `search` filter but NOT the status filter, so
// the cards always present a full open/won/lost breakdown for the current scope.
router.get("/admin/bets/summary", async (req, res): Promise<void> => {
  const { search } = req.query as Record<string, string>;
  const where = search ? ilike(usersTable.username, `%${search}%`) : undefined;

  const [row] = await db
    .select({
      total: count(),
      open: sql<number>`COUNT(*) FILTER (WHERE ${betsTable.status} = 'open')::int`,
      won: sql<number>`COUNT(*) FILTER (WHERE ${betsTable.status} = 'won')::int`,
      lost: sql<number>`COUNT(*) FILTER (WHERE ${betsTable.status} = 'lost')::int`,
      voided: sql<number>`COUNT(*) FILTER (WHERE ${betsTable.status} = 'void')::int`,
      totalWagered: sql<string>`COALESCE(SUM(${betsTable.stake}), 0)::text`,
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(usersTable.id, betsTable.userId))
    .where(where);

  res.json({
    total: Number(row.total),
    open: Number(row.open),
    won: Number(row.won),
    lost: Number(row.lost),
    void: Number(row.voided),
    totalWagered: row.totalWagered ?? "0",
  });
});

router.get("/admin/bets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  if (!bet) { res.status(404).json({ error: "Bet not found" }); return; }
  const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, id));
  res.json({ ...bet, selections });
});

const PatchBetBody = z.object({
  status: z.enum(["won", "lost", "void"]),
});

router.patch("/admin/bets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PatchBetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  if (!bet) { res.status(404).json({ error: "Bet not found" }); return; }
  if (bet.status !== "open") { res.status(400).json({ error: "Bet is already settled" }); return; }

  const { status } = parsed.data;

  let payout = 0;
  if (status === "won")  payout = parseFloat(bet.potentialReturn);
  if (status === "void") payout = parseFloat(bet.stake);

  await db.update(betsTable)
    .set({ status, settledAt: new Date(), settledPayout: payout.toFixed(8) })
    .where(eq(betsTable.id, id));

  // Credit wallet and write ledger entry for won/void outcomes
  if (payout > 0) {
    const txType = status === "void" ? "refund" : "win";
    const txNote = status === "void"
      ? `Bet #${id} voided — stake refunded`
      : `Bet #${id} won — payout ${payout.toFixed(2)} USDT`;
    await db.insert(transactionsTable).values({
      userId: bet.userId,
      type: txType,
      amount: payout.toFixed(8),
      status: "completed",
      notes: txNote,
    });
    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${payout.toFixed(8)}` })
      .where(eq(walletsTable.userId, bet.userId));
  }

  // Decrement market liability for all selections on this bet
  const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, id));
  for (const sel of selections) {
    const selPayout = parseFloat(sel.odds) * parseFloat(bet.stake);
    await db.execute(sql`
      UPDATE market_liability
      SET
        total_stake      = GREATEST(0, total_stake - ${bet.stake}::numeric),
        potential_payout = GREATEST(0, potential_payout - ${selPayout.toFixed(8)}::numeric),
        bet_count        = GREATEST(0, bet_count - 1)
      WHERE event_id    = ${sel.eventId}
        AND market_type = ${sel.marketType}
        AND selection   = ${sel.selection}
    `);
  }

  // BUG-01 fix: sync individual selection statuses to match the settled bet
  await db.execute(sql`UPDATE bet_selections SET status = ${status} WHERE bet_id = ${id}`);

  await logAdminAction(req.user!.userId, `settle_bet_${status}`, "bet", id, { status, payout });

  const [updated] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  res.json(updated);
});

// ─── Transactions pending totals (aggregate — no page cap) ───────────────────
router.get("/admin/transactions/pending-totals", async (req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(amount::numeric) FILTER (WHERE type = 'deposit' AND status = 'pending'), 0)::text AS deposit_total,
      COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'pending') AS deposit_count,
      COALESCE(SUM(amount::numeric) FILTER (WHERE type = 'withdrawal' AND status = 'pending'), 0)::text AS withdrawal_total,
      COUNT(*) FILTER (WHERE type = 'withdrawal' AND status = 'pending') AS withdrawal_count
    FROM transactions
  `);
  const row = result.rows[0] as {
    deposit_total: string; deposit_count: string;
    withdrawal_total: string; withdrawal_count: string;
  };
  res.json({
    pendingDepositTotal: row.deposit_total,
    pendingDepositCount: Number(row.deposit_count),
    pendingWithdrawalTotal: row.withdrawal_total,
    pendingWithdrawalCount: Number(row.withdrawal_count),
  });
});

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get("/admin/transactions", async (req, res): Promise<void> => {
  const { type, status, gateway, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (type) conditions.push(eq(transactionsTable.type, type));
  if (status) conditions.push(eq(transactionsTable.status, status));
  if (gateway === "nowpayments") conditions.push(isNotNull(transactionsTable.nowpaymentsPaymentId));
  else if (gateway === "cryptomus") conditions.push(isNotNull(transactionsTable.cryptomusUuid));
  else if (gateway === "plisio") conditions.push(isNotNull(transactionsTable.plisioPaymentId));
  else if (gateway === "manual") {
    conditions.push(isNotNull(transactionsTable.txHash));
    conditions.push(isNull(transactionsTable.nowpaymentsPaymentId));
    conditions.push(isNull(transactionsTable.cryptomusUuid));
    conditions.push(isNull(transactionsTable.plisioPaymentId));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const txns = await db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      username: usersTable.username,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      status: transactionsTable.status,
      reference: transactionsTable.reference,
      notes: transactionsTable.notes,
      txHash: transactionsTable.txHash,
      network: transactionsTable.network,
      walletAddress: transactionsTable.walletAddress,
      verified: transactionsTable.verified,
      verificationNote: transactionsTable.verificationNote,
      nowpaymentsPaymentId: transactionsTable.nowpaymentsPaymentId,
      nowpaymentsStatus: transactionsTable.nowpaymentsStatus,
      plisioPaymentId: transactionsTable.plisioPaymentId,
      plisioStatus: transactionsTable.plisioStatus,
      cryptomusUuid: transactionsTable.cryptomusUuid,
      cryptomusStatus: transactionsTable.cryptomusStatus,
      createdAt: transactionsTable.createdAt,
      userBalance: walletsTable.balanceUsdt,
      userBonusBalance: walletsTable.bonusBalanceUsdt,
    })
    .from(transactionsTable)
    .leftJoin(usersTable, eq(usersTable.id, transactionsTable.userId))
    .leftJoin(walletsTable, eq(walletsTable.userId, transactionsTable.userId))
    .where(where)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(transactionsTable).where(where);
  res.json({ transactions: txns, total: Number(total.count), page: pageNum, limit: limitNum });
});

const PatchTransactionBody = z.object({
  status: z.enum(["completed", "rejected"]),
  notes: z.string().optional(),
});

router.patch("/admin/transactions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PatchTransactionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Initial fetch for early 404 / status guard (outside transaction — fast path)
  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!txn) { res.status(404).json({ error: "Transaction not found" }); return; }
  if (txn.status !== "pending") { res.status(400).json({ error: "Transaction is not pending" }); return; }

  const { status, notes } = parsed.data;

  // ── Atomic approval: status update + wallet credit/debit in a single transaction
  // This prevents the status reaching "completed" while the balance update fails,
  // and prevents the TOCTOU race where two concurrent approvals both pass the balance check.
  try {
    await db.transaction(async (tx) => {
      // Re-acquire row lock on the transaction record — prevents double-approval race
      const recheck = await tx.execute(sql`
        SELECT status FROM transactions WHERE id = ${id} FOR UPDATE
      `);
      const recheckRow = recheck.rows[0] as { status: string } | undefined;
      if (!recheckRow || recheckRow.status !== "pending") {
        throw Object.assign(new Error("Transaction is no longer pending"), { code: "NOT_PENDING" });
      }

      // Update status + notes atomically with the wallet operation below
      await tx.update(transactionsTable)
        .set({ status, notes: notes ?? txn.notes })
        .where(eq(transactionsTable.id, id));

      // Deposit approved → credit wallet
      if (status === "completed" && txn.type === "deposit") {
        await tx.update(walletsTable)
          .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
          .where(eq(walletsTable.userId, txn.userId));
      }

      // Withdrawal approved → debit wallet with conditional atomic check.
      // Uses UPDATE...WHERE balance >= amount so it only deducts when funds are
      // sufficient — no silent GREATEST(0,...) clamp, no TOCTOU between SELECT and UPDATE.
      if (status === "completed" && txn.type === "withdrawal") {
        const result = await tx.execute(sql`
          UPDATE wallets
          SET balance_usdt = balance_usdt - ${txn.amount}::numeric
          WHERE user_id   = ${txn.userId}
            AND balance_usdt >= ${txn.amount}::numeric
          RETURNING balance_usdt
        `);
        if (result.rows.length === 0) {
          throw Object.assign(new Error("Insufficient wallet balance to complete withdrawal"), { code: "INSUFFICIENT_BALANCE" });
        }
      }
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      const code = (err as { code?: string }).code;
      if (code === "NOT_PENDING") {
        res.status(409).json({ error: "Transaction was modified concurrently — please refresh and try again" });
        return;
      }
      if (code === "INSUFFICIENT_BALANCE") {
        res.status(400).json({ error: "Insufficient wallet balance to complete withdrawal" });
        return;
      }
    }
    throw err;
  }

  await logAdminAction(req.user!.userId, `${status}_transaction`, "transaction", id, { type: txn.type, amount: txn.amount });

  const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  res.json(updated);
});

// ─── Referrals ───────────────────────────────────────────────────────────────
router.get("/admin/referrals", async (req, res): Promise<void> => {
  const referrals = await db
    .select({
      id: referralsTable.id,
      referrerId: referralsTable.referrerId,
      referrerUsername: usersTable.username,
      referredId: referralsTable.referredId,
      tier: referralsTable.tier,
      createdAt: referralsTable.createdAt,
    })
    .from(referralsTable)
    .leftJoin(usersTable, eq(usersTable.id, referralsTable.referrerId))
    .orderBy(desc(referralsTable.createdAt))
    .limit(500);

  // Fetch referred user info separately to avoid table alias issues
  const referredIds = [...new Set(referrals.map(r => r.referredId))];
  const referredUsers = referredIds.length > 0
    ? await db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, walletAddress: usersTable.walletAddress })
        .from(usersTable)
        .where(inArray(usersTable.id, referredIds))
    : [];
  const referredMap = new Map(referredUsers.map(u => [u.id, u]));

  const referralsWithReferred = referrals.map(r => {
    const ru = referredMap.get(r.referredId);
    const referredUsername = ru?.username ?? ru?.email ?? (ru?.walletAddress ? ru.walletAddress.slice(0, 8) + "…" : null);
    return { ...r, referredUsername };
  });

  const [commTotal] = await db.select({ total: sum(commissionsTable.amount) }).from(commissionsTable);
  const [commPaid] = await db.select({ total: sum(commissionsTable.amount) }).from(commissionsTable).where(eq(commissionsTable.status, "paid"));
  const [commPending] = await db.select({ total: sum(commissionsTable.amount) }).from(commissionsTable).where(eq(commissionsTable.status, "pending"));

  const commByReferrerRows = await db.execute(sql`
    SELECT r.referrer_id AS "referrerId", COALESCE(SUM(c.amount), 0)::text AS total
    FROM commissions c
    JOIN referrals r ON r.id = c.referral_id
    GROUP BY r.referrer_id
  `);
  const commMap = new Map<number, string>(
    (commByReferrerRows.rows as { referrerId: number; total: string }[])
      .map(r => [Number(r.referrerId), r.total])
  );

  const referrerMap = new Map<number, { referrerId: number; referrerUsername: string | null; count: number }>();
  for (const r of referralsWithReferred) {
    const existing = referrerMap.get(r.referrerId);
    if (existing) {
      existing.count++;
    } else {
      referrerMap.set(r.referrerId, { referrerId: r.referrerId, referrerUsername: r.referrerUsername, count: 1 });
    }
  }
  const topReferrersByCommission = Array.from(referrerMap.values())
    .map(r => ({
      referrerId: r.referrerId,
      name: r.referrerUsername ?? `uid:${r.referrerId}`,
      commission: parseFloat(commMap.get(r.referrerId) ?? "0"),
      count: r.count,
    }))
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 10);

  res.json({
    referrals: referralsWithReferred,
    stats: {
      totalReferrals: referrals.length,
      totalCommissions: commTotal.total ?? "0",
      totalPaid: commPaid.total ?? "0",
      totalPending: commPending.total ?? "0",
    },
    topReferrersByCommission,
  });
});

// ── POST /admin/referrals/:referrerId/mark-paid ───────────────────────────────
router.post("/admin/referrals/:referrerId/mark-paid", async (req, res): Promise<void> => {
  const referrerId = parseInt(req.params.referrerId, 10);
  if (isNaN(referrerId)) {
    res.status(400).json({ error: "Invalid referrerId" });
    return;
  }

  await db.transaction(async tx => {
    // Atomic UPDATE…RETURNING: mark as paid and get amounts in one statement,
    // preventing double-credit under concurrent requests.
    const updated = await tx.execute(sql`
      UPDATE commissions
      SET status = 'paid'
      WHERE user_id = ${referrerId} AND status = 'pending'
      RETURNING id, amount
    `);
    const rows = updated.rows as { id: number; amount: string }[];
    if (rows.length === 0) {
      res.json({ updated: 0, total: "0" });
      return;
    }

    const totalAmt = rows.reduce((s, r) => s + parseFloat(r.amount), 0);

    await tx.execute(sql`
      UPDATE wallets SET balance_usdt = balance_usdt + ${totalAmt.toFixed(8)}::numeric
      WHERE user_id = ${referrerId}
    `);

    // Ledger entry — every balance change must have a matching transaction record.
    await tx.insert(transactionsTable).values({
      userId: referrerId,
      type: "referral_commission",
      amount: totalAmt.toFixed(8),
      status: "completed",
      reference: `commissions:${rows.map((r) => r.id).join(",")}`,
      notes: `Referral commission${rows.length !== 1 ? "s" : ""} paid by admin (${rows.length} payment${rows.length !== 1 ? "s" : ""})`,
    });

    res.json({ updated: rows.length, total: totalAmt.toFixed(8) });
  });
});

// ─── Promotions ───────────────────────────────────────────────────────────────
router.get("/admin/promotions", async (req, res): Promise<void> => {
  const promos = await db
    .select({
      id: promotionsTable.id,
      title: promotionsTable.title,
      description: promotionsTable.description,
      type: promotionsTable.type,
      rewardType: promotionsTable.rewardType,
      bonusAmount: promotionsTable.bonusAmount,
      poolAmount: promotionsTable.poolAmount,
      minDeposit: promotionsTable.minDeposit,
      wageringRequirement: promotionsTable.wageringRequirement,
      bannerColor: promotionsTable.bannerColor,
      eligibility: promotionsTable.eligibility,
      maxClaims: promotionsTable.maxClaims,
      isActive: promotionsTable.isActive,
      expiresAt: promotionsTable.expiresAt,
      createdAt: promotionsTable.createdAt,
      claimCount: sql<number>`(SELECT COUNT(*) FROM promotion_claims WHERE promotion_id = ${promotionsTable.id})`,
    })
    .from(promotionsTable)
    .orderBy(desc(promotionsTable.createdAt));

  const allReqs = await db.select().from(promotionRequirementsTable).orderBy(promotionRequirementsTable.sortOrder);
  const reqsByPromo = new Map<number, typeof allReqs>();
  for (const r of allReqs) {
    if (!reqsByPromo.has(r.promotionId)) reqsByPromo.set(r.promotionId, []);
    reqsByPromo.get(r.promotionId)!.push(r);
  }

  res.json(promos.map(p => ({ ...p, requirements: reqsByPromo.get(p.id) ?? [] })));
});

const PromotionBody = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.string().default("welcome"),
  rewardType: z.string().default("flat_bonus"),
  bonusAmount: z.string().optional(),
  poolAmount: z.string().optional(),
  minDeposit: z.string().optional(),
  wageringRequirement: z.string().optional(),
  bannerColor: z.string().optional(),
  eligibility: z.string().default("all"),
  maxClaims: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().optional(),
});

router.post("/admin/promotions", async (req, res): Promise<void> => {
  const parsed = PromotionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [promo] = await db.insert(promotionsTable).values({
    ...parsed.data,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
  }).returning();

  await logAdminAction(req.user!.userId, "create_promotion", "promotion", promo.id, { title: promo.title });
  res.status(201).json(promo);
});

router.patch("/admin/promotions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PromotionBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(promotionsTable)
    .set({ ...parsed.data, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined })
    .where(eq(promotionsTable.id, id))
    .returning();

  await logAdminAction(req.user!.userId, "update_promotion", "promotion", id, parsed.data as Record<string, unknown>);
  res.json(updated);
});

router.delete("/admin/promotions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(promotionsTable).where(eq(promotionsTable.id, id));
  await logAdminAction(req.user!.userId, "delete_promotion", "promotion", id, {});
  res.sendStatus(204);
});

// ─── Promotion Requirements CRUD ──────────────────────────────────────────────
const ReqBody = z.object({
  taskType: z.enum(["place_bets", "min_deposit", "refer_friends", "min_stake_bets", "min_odds_bets"]),
  targetValue: z.string().regex(/^\d+(\.\d+)?$/, "Must be a positive number"),
  description: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

router.get("/admin/promotions/:id/requirements", async (req, res): Promise<void> => {
  const promoId = parseInt(req.params.id);
  const reqs = await db
    .select()
    .from(promotionRequirementsTable)
    .where(eq(promotionRequirementsTable.promotionId, promoId))
    .orderBy(promotionRequirementsTable.sortOrder);
  res.json(reqs);
});

router.post("/admin/promotions/:id/requirements", async (req, res): Promise<void> => {
  const promoId = parseInt(req.params.id);
  const parsed = ReqBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [req2] = await db
    .insert(promotionRequirementsTable)
    .values({ promotionId: promoId, ...parsed.data })
    .returning();

  await logAdminAction(req.user!.userId, "add_promo_requirement", "promotion", promoId, parsed.data as Record<string, unknown>);
  res.status(201).json(req2);
});

router.delete("/admin/promotions/requirements/:reqId", async (req, res): Promise<void> => {
  const reqId = parseInt(req.params.reqId);
  await db.delete(promotionRequirementsTable).where(eq(promotionRequirementsTable.id, reqId));
  await logAdminAction(req.user!.userId, "delete_promo_requirement", "promotion", reqId, {});
  res.sendStatus(204);
});

// Pool-split settlement: distribute poolAmount equally among all claimants
router.post("/admin/promotions/:id/pool-settle", async (req, res): Promise<void> => {
  const promoId = parseInt(req.params.id);

  const [promo] = await db.select().from(promotionsTable).where(eq(promotionsTable.id, promoId));
  if (!promo) { res.status(404).json({ error: "Promotion not found" }); return; }
  if (promo.rewardType !== "pool_split") { res.status(400).json({ error: "Only pool_split promotions can be settled this way" }); return; }

  const pool = parseFloat(promo.poolAmount ?? "0");
  if (pool <= 0) { res.status(400).json({ error: "Pool amount is 0 — set it before settling" }); return; }

  const claims = await db
    .select({ userId: promotionClaimsTable.userId })
    .from(promotionClaimsTable)
    .where(eq(promotionClaimsTable.promotionId, promoId));

  if (claims.length === 0) { res.status(400).json({ error: "No claimants to distribute to" }); return; }

  const share = (pool / claims.length).toFixed(8);

  for (const claim of claims) {
    await db.execute(sql`
      UPDATE wallets SET balance_usdt = balance_usdt + ${share}::numeric WHERE user_id = ${claim.userId}
    `);
    await db.insert(transactionsTable).values({
      userId: claim.userId,
      type: "credit",
      amount: share,
      status: "completed",
      reference: `pool_settle_promo_${promoId}`,
    });
  }

  await logAdminAction(req.user!.userId, "pool_settle", "promotion", promoId, { claimants: claims.length, shareEach: share, totalPool: pool });
  res.json({ settled: true, claimants: claims.length, shareEach: share, totalPool: pool });
});

// ─── Prediction Pools ─────────────────────────────────────────────────────────
router.get("/admin/pools", async (req, res): Promise<void> => {
  const pools = await db
    .select({
      id: predictionPoolsTable.id,
      title: predictionPoolsTable.title,
      sport: predictionPoolsTable.sport,
      prizePool: predictionPoolsTable.prizePool,
      entryFee: predictionPoolsTable.entryFee,
      status: predictionPoolsTable.status,
      deadline: predictionPoolsTable.deadline,
      settledAt: predictionPoolsTable.settledAt,
      createdAt: predictionPoolsTable.createdAt,
      entryCount: sql<number>`(SELECT COUNT(*) FROM pool_entries WHERE pool_id = ${predictionPoolsTable.id})`,
    })
    .from(predictionPoolsTable)
    .orderBy(desc(predictionPoolsTable.createdAt));

  res.json(pools);
});

const PoolBody = z.object({
  title: z.string().min(1),
  sport: z.string().min(1),
  eventId: z.string().optional(),
  prizePool: z.string().default("0"),
  entryFee: z.string().default("0"),
  status: z.string().default("open"),
  deadline: z.string().datetime(),
});

router.post("/admin/pools", async (req, res): Promise<void> => {
  const parsed = PoolBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [pool] = await db.insert(predictionPoolsTable).values({
    ...parsed.data,
    deadline: new Date(parsed.data.deadline),
  }).returning();

  await logAdminAction(req.user!.userId, "create_pool", "pool", pool.id, { title: pool.title });
  res.status(201).json(pool);
});

const PatchPoolBody = PoolBody.partial().extend({ outcome: z.string().optional() });

router.patch("/admin/pools/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PatchPoolBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { outcome, ...poolFields } = parsed.data;

  // Idempotency: reject if pool is already settled
  const [current] = await db
    .select({ status: predictionPoolsTable.status })
    .from(predictionPoolsTable)
    .where(eq(predictionPoolsTable.id, id))
    .limit(1);
  if (!current) { res.status(404).json({ error: "Pool not found" }); return; }
  if (poolFields.status === "settled" && current.status === "settled") {
    res.status(400).json({ error: "Pool is already settled — cannot redistribute prizes" });
    return;
  }

  // Build update — persist correctOutcome in its dedicated column
  const setFields: Record<string, unknown> = { ...poolFields };
  if (poolFields.deadline) setFields.deadline = new Date(poolFields.deadline);
  if (poolFields.status === "settled") {
    setFields.settledAt = new Date();
    if (outcome !== undefined) setFields.correctOutcome = outcome;
  }

  const [updated] = await db
    .update(predictionPoolsTable)
    .set(setFields as Parameters<ReturnType<typeof db.update>["set"]>[0])
    .where(eq(predictionPoolsTable.id, id))
    .returning();

  let settledRecipientCount = 0;
  let totalDistributed = "0";

  if (poolFields.status === "settled" && updated && outcome !== undefined) {
    // Load all entries with their picks
    const entries = await db
      .select({ userId: poolEntriesTable.userId, picks: poolEntriesTable.picks })
      .from(poolEntriesTable)
      .where(eq(poolEntriesTable.poolId, id));

    if (entries.length > 0 && Number(updated.prizePool) > 0) {
      // Evaluate picks against the correct outcome.
      // Picks format: { outcome: string } — winners are entries where picks.outcome matches.
      // Fall back to all entrants when no entries have a matching pick (e.g. empty picks {}).
      const winners = entries.filter((e: { userId: number; picks: unknown }) => {
        const p = e.picks as { outcome?: string } | null;
        return p && typeof p.outcome === "string" && p.outcome === outcome;
      });
      const recipients = winners.length > 0 ? winners : entries;

      const prizePerEntry = Number(updated.prizePool) / recipients.length;
      const prizeStr = prizePerEntry.toFixed(8);
      for (const entry of recipients) {
        await db
          .update(walletsTable)
          .set({ balanceUsdt: sql`balance_usdt + ${prizeStr}` })
          .where(eq(walletsTable.userId, entry.userId));
        await db.insert(transactionsTable).values({
          userId: entry.userId,
          type: "credit",
          amount: prizeStr,
          status: "completed",
          notes: `Pool #${id} settlement — outcome: ${outcome}`,
        });
      }
      settledRecipientCount = recipients.length;
      totalDistributed = Number(updated.prizePool).toFixed(2);
    }
  }

  await logAdminAction(req.user!.userId, "update_pool", "pool", id, {
    status: poolFields.status,
    correctOutcome: outcome ?? null,
    settledRecipientCount,
    totalDistributedUsdt: totalDistributed,
  });
  res.json(updated);
});

router.delete("/admin/pools/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(predictionPoolsTable).where(eq(predictionPoolsTable.id, id));
  await logAdminAction(req.user!.userId, "delete_pool", "pool", id, {});
  res.sendStatus(204);
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get("/admin/audit-logs", async (req, res): Promise<void> => {
  const { page = "1", limit = "50", action, adminId } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (action) conditions.push(like(adminLogsTable.action, `${action}%`));
  if (adminId) conditions.push(eq(adminLogsTable.adminId, parseInt(adminId)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db
    .select({
      id: adminLogsTable.id,
      adminId: adminLogsTable.adminId,
      adminUsername: usersTable.username,
      action: adminLogsTable.action,
      entityType: adminLogsTable.entityType,
      entityId: adminLogsTable.entityId,
      details: adminLogsTable.details,
      createdAt: adminLogsTable.createdAt,
    })
    .from(adminLogsTable)
    .leftJoin(usersTable, eq(usersTable.id, adminLogsTable.adminId))
    .where(where)
    .orderBy(desc(adminLogsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(adminLogsTable).where(where);
  res.json({ logs, total: Number(total.count), page: pageNum, limit: limitNum });
});

// ─── WinSpin Prizes ──────────────────────────────────────────────────────────

router.get("/admin/winspin/prizes", async (_req, res): Promise<void> => {
  const prizes = await db.select().from(winspinPrizesTable).orderBy(winspinPrizesTable.weight);
  res.json(prizes);
});

router.get("/admin/winspin/stats", async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({ totalSpins: count(), totalPaid: sum(winspinSpinsTable.prizeAmount) })
    .from(winspinSpinsTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayRow] = await db
    .select({ spinsToday: count() })
    .from(winspinSpinsTable)
    .where(sql`${winspinSpinsTable.createdAt} >= ${today.toISOString()}`);

  res.json({
    totalSpins: Number(totals?.totalSpins ?? 0),
    totalPaid: totals?.totalPaid ?? "0",
    spinsToday: Number(todayRow?.spinsToday ?? 0),
  });
});

router.post("/admin/winspin/prizes", async (req, res): Promise<void> => {
  const schema = z.object({
    label: z.string().min(1),
    prizeAmount: z.string().optional().default("0"),
    weight: z.number().int().min(1).max(100).default(10),
    color: z.string().default("#00DFA9"),
    maxPerDay: z.number().int().min(1).nullable().optional(),
    isActive: z.boolean().optional().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [prize] = await db.insert(winspinPrizesTable).values(parsed.data).returning();
  await logAdminAction(req.user!.userId, "winspin_prize_created", "winspin_prize", prize.id, { label: prize.label });
  res.status(201).json(prize);
});

router.patch("/admin/winspin/prizes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const schema = z.object({
    label: z.string().min(1).optional(),
    prizeAmount: z.string().optional(),
    weight: z.number().int().min(1).max(100).optional(),
    color: z.string().optional(),
    maxPerDay: z.number().int().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [prize] = await db.update(winspinPrizesTable).set(parsed.data).where(eq(winspinPrizesTable.id, id)).returning();
  if (!prize) { res.status(404).json({ error: "Prize not found" }); return; }
  await logAdminAction(req.user!.userId, "winspin_prize_updated", "winspin_prize", id, parsed.data as Record<string, unknown>);
  res.json(prize);
});

router.delete("/admin/winspin/prizes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(winspinPrizesTable).where(eq(winspinPrizesTable.id, id));
  await logAdminAction(req.user!.userId, "winspin_prize_deleted", "winspin_prize", id);
  res.status(204).end();
});

// ─── Sport / Market Controls ──────────────────────────────────────────────────

router.get("/admin/markets", async (_req, res): Promise<void> => {
  const controls = await db.select().from(sportControlsTable).orderBy(sportControlsTable.leagueName);
  res.json(controls);
});

router.patch("/admin/markets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const schema = z.object({
    isEnabled: z.boolean().optional(),
    isSuspended: z.boolean().optional(),
    oddsMultiplier: z.string().optional(),
    marginOverride: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [control] = await db.update(sportControlsTable).set(parsed.data).where(eq(sportControlsTable.id, id)).returning();
  if (!control) { res.status(404).json({ error: "Market not found" }); return; }
  await logAdminAction(req.user!.userId, "market_updated", "sport_control", id, parsed.data as Record<string, unknown>);
  res.json(control);
});


// ─── Platform Settings ────────────────────────────────────────────────────────

router.get("/admin/settings", async (_req, res): Promise<void> => {
  const settings = await db.select().from(platformSettingsTable).orderBy(platformSettingsTable.key);
  res.json(settings);
});

router.patch("/admin/settings", async (req, res): Promise<void> => {
  const body = req.body as Record<string, string>;
  if (typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ error: "Body must be a key→value object" });
    return;
  }
  const results: unknown[] = [];
  for (const [key, value] of Object.entries(body)) {
    const [row] = await db
      .insert(platformSettingsTable)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: platformSettingsTable.key,
        set: { value: String(value), updatedAt: new Date() },
      })
      .returning();
    if (row) results.push(row);
  }
  await logAdminAction(req.user!.userId, "settings_updated", "platform_settings", 0, body as Record<string, unknown>);
  res.json(results);
});

// ─── Reports ──────────────────────────────────────────────────────────────────

router.get("/admin/reports/revenue-by-sport", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      COALESCE(bs.sport, 'Unknown') AS sport,
      COUNT(DISTINCT b.id)::int     AS bet_count,
      COALESCE(SUM(b.stake), 0)::text                                                          AS total_staked,
      COALESCE(SUM(COALESCE(b.settled_payout, 0)) FILTER (WHERE b.status IN ('won', 'void')), 0)::text   AS total_paid_out,
      COALESCE(SUM(b.stake) - SUM(COALESCE(b.settled_payout, 0)) FILTER (WHERE b.status IN ('won', 'void')), 0)::text AS net_revenue
    FROM bets b
    JOIN users u ON u.id = b.user_id AND u.is_test_account = false
    JOIN bet_selections bs ON bs.bet_id = b.id
    WHERE b.status IN ('won', 'lost', 'void')
    GROUP BY bs.sport
    ORDER BY (SUM(b.stake) - SUM(COALESCE(b.settled_payout, 0)) FILTER (WHERE b.status IN ('won', 'void'))) DESC
  `);
  const mapped = (rows.rows as Array<Record<string, unknown>>).map(r => ({
    sport:       r.sport,
    betCount:    Number(r.bet_count),
    totalStaked: String(r.total_staked),
    totalPaidOut: String(r.total_paid_out),
    netRevenue:  String(r.net_revenue),
  }));
  res.json(mapped);
});

router.get("/admin/reports/top-bettors", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      u.username,
      COUNT(b.id)::int       AS bet_count,
      COALESCE(SUM(b.stake), 0)::text AS total_staked
    FROM bets b
    JOIN users u ON u.id = b.user_id AND u.is_test_account = false
    GROUP BY u.username
    ORDER BY SUM(b.stake) DESC
    LIMIT 20
  `);
  const mapped = (rows.rows as Array<Record<string, unknown>>).map(r => ({
    username:    String(r.username),
    betCount:    Number(r.bet_count),
    totalStaked: String(r.total_staked),
  }));
  res.json(mapped);
});

router.get("/admin/reports/daily-metrics", async (req, res): Promise<void> => {
  const { from, to } = req.query as Record<string, string>;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const fromDate: string | null = from && dateRe.test(from) ? from : null;
  const toDate: string | null   = to   && dateRe.test(to)   ? to   : null;

  const rows = await db.execute(sql`
    WITH days AS (
      SELECT generate_series(
        COALESCE(${fromDate}::date, date_trunc('day', now() AT TIME ZONE 'UTC') - interval '29 days'),
        COALESCE(${toDate}::date,   date_trunc('day', now() AT TIME ZONE 'UTC')),
        interval '1 day'
      ) AS d
    ),
    range_start AS (
      SELECT COALESCE(${fromDate}::date, (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '29 days'))::timestamptz AS ts
    ),
    range_end AS (
      SELECT (COALESCE(${toDate}::date, date_trunc('day', now() AT TIME ZONE 'UTC')) + interval '1 day')::timestamptz AS ts
    ),
    new_users AS (
      SELECT date_trunc('day', u.created_at AT TIME ZONE 'UTC') AS d, COUNT(*)::int AS cnt
      FROM users u, range_start rs, range_end re
      WHERE u.created_at >= rs.ts AND u.created_at < re.ts
        AND u.is_test_account = false
      GROUP BY 1
    ),
    bet_amounts AS (
      SELECT date_trunc('day', b.created_at AT TIME ZONE 'UTC') AS d,
             COALESCE(SUM(b.stake), 0)::text AS total
      FROM bets b
      JOIN users u ON u.id = b.user_id AND u.is_test_account = false,
           range_start rs, range_end re
      WHERE b.created_at >= rs.ts AND b.created_at < re.ts
      GROUP BY 1
    ),
    win_loss AS (
      -- House net = stakes taken in minus payouts made (won + void refunds)
      SELECT date_trunc('day', b.settled_at AT TIME ZONE 'UTC') AS d,
             COALESCE(SUM(b.stake) - SUM(COALESCE(b.settled_payout, 0)), 0)::text AS net
      FROM bets b
      JOIN users u ON u.id = b.user_id AND u.is_test_account = false,
           range_start rs, range_end re
      WHERE b.status IN ('won', 'lost', 'void')
        AND b.settled_at >= rs.ts AND b.settled_at < re.ts
      GROUP BY 1
    ),
    deps AS (
      SELECT date_trunc('day', t.created_at AT TIME ZONE 'UTC') AS d,
             COALESCE(SUM(t.amount), 0)::text AS total
      FROM transactions t
      JOIN users u ON u.id = t.user_id AND u.is_test_account = false,
           range_start rs, range_end re
      WHERE t.type = 'deposit' AND t.status = 'completed'
        AND t.created_at >= rs.ts AND t.created_at < re.ts
      GROUP BY 1
    ),
    wds AS (
      SELECT date_trunc('day', t.created_at AT TIME ZONE 'UTC') AS d,
             COALESCE(SUM(t.amount), 0)::text AS total
      FROM transactions t
      JOIN users u ON u.id = t.user_id AND u.is_test_account = false,
           range_start rs, range_end re
      WHERE t.type = 'withdrawal' AND t.status = 'completed'
        AND t.created_at >= rs.ts AND t.created_at < re.ts
      GROUP BY 1
    )
    SELECT
      to_char(days.d, 'MM-DD') AS day,
      COALESCE(new_users.cnt, 0)          AS "newUsers",
      COALESCE(bet_amounts.total, '0')    AS "betAmount",
      COALESCE(win_loss.net, '0')         AS "winLoss",
      COALESCE(deps.total, '0')           AS deposits,
      COALESCE(wds.total, '0')            AS withdrawals
    FROM days
    LEFT JOIN new_users   ON new_users.d   = days.d
    LEFT JOIN bet_amounts ON bet_amounts.d = days.d
    LEFT JOIN win_loss    ON win_loss.d    = days.d
    LEFT JOIN deps        ON deps.d        = days.d
    LEFT JOIN wds         ON wds.d         = days.d
    ORDER BY days.d
  `);
  res.json(rows.rows);
});

router.get("/admin/reports/daily-pnl", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      to_char(date_trunc('day', b.created_at AT TIME ZONE 'UTC'), 'MM-DD') AS day,
      COALESCE(SUM(b.stake), 0)::text AS stakes,
      COALESCE(SUM(COALESCE(b.settled_payout, 0)) FILTER (WHERE b.status IN ('won', 'void')), 0)::text AS payouts
    FROM bets b
    JOIN users u ON u.id = b.user_id AND u.is_test_account = false
    WHERE b.status IN ('won', 'lost', 'void')
      AND b.created_at >= now() - interval '30 days'
    GROUP BY date_trunc('day', b.created_at AT TIME ZONE 'UTC')
    ORDER BY date_trunc('day', b.created_at AT TIME ZONE 'UTC')
  `);
  res.json(rows.rows);
});

// ─── CSV Exports ──────────────────────────────────────────────────────────────

router.get("/admin/reports/export/bets", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      b.id, u.username, u.email,
      b.stake, b.potential_return, b.status, b.bet_type,
      b.created_at,
      STRING_AGG(bs.event_name || ' — ' || bs.market_name || ' @ ' || bs.odds, ' | ') AS selections
    FROM bets b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN bet_selections bs ON bs.bet_id = b.id
    GROUP BY b.id, u.username, u.email
    ORDER BY b.created_at DESC
    LIMIT 10000
  `);
  const headers = ["id", "username", "email", "stake", "potential_return", "status", "bet_type", "created_at", "selections"];
  const csv = [
    headers.join(","),
    ...(rows.rows as Array<Record<string, unknown>>).map(r =>
      headers.map(h => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="cupbett-bets-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

router.get("/admin/reports/export/transactions", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      t.id, u.username, u.email,
      t.type, t.amount, t.currency, t.status,
      t.reference, t.created_at
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    ORDER BY t.created_at DESC
    LIMIT 10000
  `);
  const headers = ["id", "username", "email", "type", "amount", "currency", "status", "reference", "created_at"];
  const csv = [
    headers.join(","),
    ...(rows.rows as Array<Record<string, unknown>>).map(r =>
      headers.map(h => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="cupbett-transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});


// ─── User Profile: comprehensive stats ───────────────────────────────────────
router.get("/admin/users/:id/profile", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const [user] = await db.select({
    id: usersTable.id, email: usersTable.email, username: usersTable.username,
    walletAddress: usersTable.walletAddress, walletNetwork: usersTable.walletNetwork,
    role: usersTable.role, kycStatus: usersTable.kycStatus, country: usersTable.country,
    isSuspended: usersTable.isSuspended, referralCode: usersTable.referralCode,
    createdAt: usersTable.createdAt, balance: walletsTable.balanceUsdt,
  }).from(usersTable).leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const betStatsRows = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'open')::int AS open,
      COUNT(*) FILTER (WHERE status = 'won')::int AS won,
      COUNT(*) FILTER (WHERE status = 'lost')::int AS lost,
      COUNT(*) FILTER (WHERE status IN ('void','voided','cancelled'))::int AS voided,
      COALESCE(SUM(stake), 0)::text AS total_staked,
      COALESCE(SUM(COALESCE(settled_payout, 0)) FILTER (WHERE status IN ('won', 'void')), 0)::text AS total_returned
    FROM bets WHERE user_id = ${id}
  `);
  const bs = betStatsRows.rows[0] as Record<string, unknown>;
  const totalStaked = parseFloat(String(bs.total_staked));
  const totalReturned = parseFloat(String(bs.total_returned));
  const wonCount = Number(bs.won);
  const settledCount = wonCount + Number(bs.lost) + Number(bs.voided);
  const winRate = settledCount > 0 ? Math.round((wonCount / settledCount) * 100) : 0;
  const lifetimeValue = (totalStaked - totalReturned).toFixed(2);

  const txStatsRows = await db.execute(sql`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0)::text AS total_deposited,
      COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0)::text AS total_withdrawn,
      COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'pending')::int AS pending_deposits,
      COUNT(*) FILTER (WHERE type = 'withdrawal' AND status = 'pending')::int AS pending_withdrawals
    FROM transactions WHERE user_id = ${id}
  `);
  const ts = txStatsRows.rows[0] as Record<string, unknown>;

  const refRows = await db.execute(sql`
    SELECT
      (SELECT u.username FROM referrals r JOIN users u ON u.id = r.referrer_id WHERE r.referred_id = ${id} LIMIT 1) AS referred_by,
      (SELECT COUNT(*)::int FROM referrals WHERE referrer_id = ${id}) AS total_referred,
      COALESCE((SELECT SUM(amount)::text FROM commissions WHERE user_id = ${id}), '0') AS total_commissions
  `);
  const rf = refRows.rows[0] as Record<string, unknown>;

  const wsRows = await db.execute(sql`
    SELECT COUNT(*)::int AS total_spins, COALESCE(SUM(prize_amount), 0)::text AS total_won
    FROM winspin_spins WHERE user_id = ${id}
  `);
  const ws = wsRows.rows[0] as Record<string, unknown>;

  const [{ promoClaims }] = await db.select({ promoClaims: count() })
    .from(promotionClaimsTable).where(eq(promotionClaimsTable.userId, id));

  res.json({
    user: { ...user, balance: user.balance ?? "0" },
    wallet: { balance: String(user.balance ?? "0") },
    stats: {
      bets: {
        total: Number(bs.total), open: Number(bs.open), won: Number(bs.won),
        lost: Number(bs.lost), voided: Number(bs.voided),
        totalStaked: String(bs.total_staked), totalReturned: String(bs.total_returned),
        winRate, lifetimeValue,
      },
      transactions: {
        totalDeposited: String(ts.total_deposited), totalWithdrawn: String(ts.total_withdrawn),
        pendingDeposits: Number(ts.pending_deposits), pendingWithdrawals: Number(ts.pending_withdrawals),
      },
      referrals: {
        referredByUsername: rf.referred_by ? String(rf.referred_by) : null,
        totalReferred: Number(rf.total_referred),
        totalCommissions: String(rf.total_commissions),
      },
      winspin: { totalSpins: Number(ws.total_spins), totalWon: String(ws.total_won) },
      promoClaims: Number(promoClaims),
    },
  });
});

// ─── User Profile: sessions (login history) ───────────────────────────────────
router.get("/admin/users/:id/sessions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const rows = await db.select({
    id: sessionsTable.id,
    createdAt: sessionsTable.createdAt,
    expiresAt: sessionsTable.expiresAt,
  }).from(sessionsTable).where(eq(sessionsTable.userId, id))
    .orderBy(desc(sessionsTable.createdAt)).limit(50);
  const now = new Date();
  res.json(rows.map(r => ({ ...r, isActive: new Date(r.expiresAt) > now })));
});

router.post("/admin/users/:id/invalidate-sessions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, id));
  await logAdminAction(req.user!.userId, "invalidate_sessions", "user", id, {});
  res.json({ success: true });
});

router.delete("/admin/users/:id/sessions/:sessionId", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id);
  const sessionId = parseInt(req.params.sessionId);
  const deleted = await db.delete(sessionsTable)
    .where(and(eq(sessionsTable.id, sessionId), eq(sessionsTable.userId, userId)))
    .returning({ id: sessionsTable.id });
  if (!deleted.length) { res.status(404).json({ error: "Session not found" }); return; }
  await logAdminAction(req.user!.userId, "revoke_session", "user", userId, { sessionId });
  res.json({ success: true });
});

// ─── Login history (platform-wide) ───────────────────────────────────────────
router.get("/admin/login-history", async (req, res): Promise<void> => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * pageSize;

  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.wallet_address   AS "walletAddress",
      u.wallet_network   AS "walletNetwork",
      u.username,
      u.email,
      u.kyc_status       AS "kycStatus",
      u.country,
      MAX(s.created_at)  AS "lastLogin",
      COUNT(s.id)::int   AS "sessionCount"
    FROM users u
    LEFT JOIN sessions s ON s.user_id = u.id
    GROUP BY u.id, u.wallet_address, u.wallet_network, u.username, u.email, u.kyc_status, u.country
    ORDER BY MAX(s.created_at) DESC NULLS LAST
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const totalRows = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM users`);
  const total = Number((totalRows.rows[0] as { cnt: number }).cnt);

  res.json({ rows: rows.rows, total });
});

// ─── User Profile: referral tree ─────────────────────────────────────────────
router.get("/admin/users/:id/referrals", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);

  const referredByRows = await db.execute(sql`
    SELECT u.id, u.username FROM referrals r
    JOIN users u ON u.id = r.referrer_id
    WHERE r.referred_id = ${id} LIMIT 1
  `);
  const referredBy = (referredByRows.rows[0] as { id: number; username: string } | undefined) ?? null;

  const referredRows = await db.execute(sql`
    SELECT
      u.id, u.username, u.created_at AS joined_at,
      COALESCE(SUM(b.stake), 0)::text AS total_staked,
      COALESCE((SELECT SUM(c.amount) FROM commissions c WHERE c.user_id = ${id} AND c.referral_id = r.id), 0)::text AS commissions
    FROM referrals r
    JOIN users u ON u.id = r.referred_id
    LEFT JOIN bets b ON b.user_id = u.id
    WHERE r.referrer_id = ${id}
    GROUP BY u.id, u.username, u.created_at, r.id
    ORDER BY u.created_at DESC
  `);

  const totalCommRows = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0)::text AS total FROM commissions WHERE user_id = ${id}
  `);
  const totalCommissions = String((totalCommRows.rows[0] as Record<string, unknown>).total ?? "0");

  res.json({ referredBy, referred: referredRows.rows, totalCommissions });
});

// ─── User Profile: promotion claims ──────────────────────────────────────────
router.get("/admin/users/:id/promotions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const rows = await db.execute(sql`
    SELECT pc.id, pc.promotion_id, p.title AS promotion_title,
           p.bonus_amount, pc.claimed_at
    FROM promotion_claims pc
    JOIN promotions p ON p.id = pc.promotion_id
    WHERE pc.user_id = ${id}
    ORDER BY pc.claimed_at DESC
  `);
  res.json(rows.rows);
});

// ─── User Profile: winspin history ───────────────────────────────────────────
router.get("/admin/users/:id/winspin", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const rows = await db.select().from(winspinSpinsTable)
    .where(eq(winspinSpinsTable.userId, id))
    .orderBy(desc(winspinSpinsTable.createdAt)).limit(100);
  res.json(rows);
});

// ─── User Profile: notes ─────────────────────────────────────────────────────
router.get("/admin/users/:id/notes", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const rows = await db.execute(sql`
    SELECT n.id, n.note, n.tag, n.created_at,
           a.username AS admin_username
    FROM user_notes n
    JOIN users a ON a.id = n.admin_id
    WHERE n.user_id = ${id}
    ORDER BY n.created_at DESC
  `);
  res.json(rows.rows);
});

router.post("/admin/users/:id/notes", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const schema = z.object({
    note: z.string().min(1).max(1000),
    tag: z.enum(["general", "warning", "vip", "fraud", "support"]).default("general"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [note] = await db.insert(userNotesTable)
    .values({ userId: id, adminId: req.user!.userId, note: parsed.data.note, tag: parsed.data.tag })
    .returning();
  const [admin] = await db.select({ username: usersTable.username })
    .from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);

  await logAdminAction(req.user!.userId, "add_note", "user", id, { tag: parsed.data.tag });
  res.json({ ...note, adminUsername: admin.username });
});

router.delete("/admin/users/:id/notes/:noteId", async (req, res): Promise<void> => {
  const noteId = parseInt(req.params.noteId);
  await db.delete(userNotesTable).where(eq(userNotesTable.id, noteId));
  res.status(204).end();
});


// ─── Batch Settlement ─────────────────────────────────────────────────────────

router.get("/admin/settlement/events", async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      bs.event_id,
      bs.event_name,
      bs.sport,
      COUNT(*) FILTER (WHERE bs.status = 'open')::int  AS open_count,
      COUNT(DISTINCT b.user_id)::int                    AS player_count,
      COALESCE(SUM(b.stake) FILTER (WHERE bs.status = 'open'), 0)::text AS total_staked
    FROM bet_selections bs
    JOIN bets b ON b.id = bs.bet_id
    WHERE bs.status = 'open' AND b.status = 'open'
    GROUP BY bs.event_id, bs.event_name, bs.sport
    HAVING COUNT(*) FILTER (WHERE bs.status = 'open') > 0
    ORDER BY open_count DESC
  `);
  res.json(rows.rows);
});

router.get("/admin/settlement/events/:eventId", async (req, res): Promise<void> => {
  const eventId = req.params.eventId;
  const rows = await db.execute(sql`
    SELECT
      bs.market_type,
      bs.selection,
      COUNT(*)::int                                    AS open_count,
      COUNT(DISTINCT b.user_id)::int                  AS player_count,
      COALESCE(SUM(b.stake), 0)::text                 AS total_staked,
      COALESCE(SUM(b.potential_return), 0)::text      AS total_liability
    FROM bet_selections bs
    JOIN bets b ON b.id = bs.bet_id
    WHERE bs.event_id = ${eventId}
      AND bs.status = 'open'
      AND b.status = 'open'
    GROUP BY bs.market_type, bs.selection
    ORDER BY bs.market_type, bs.selection
  `);

  const meta = await db.execute(sql`
    SELECT event_name, sport FROM bet_selections WHERE event_id = ${eventId} LIMIT 1
  `);

  res.json({
    eventId,
    eventName: (meta.rows[0] as Record<string, unknown>)?.event_name ?? eventId,
    sport: (meta.rows[0] as Record<string, unknown>)?.sport ?? "",
    markets: rows.rows,
  });
});

router.post("/admin/settlement/settle", async (req, res): Promise<void> => {
  const schema = z.object({
    eventId: z.string().min(1),
    outcomes: z.array(z.object({
      marketType: z.string().min(1),
      selection: z.string().min(1),
      result: z.enum(["won", "lost", "void"]),
    })).min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }

  const { eventId, outcomes } = parsed.data;

  let totalSettled = 0, totalWon = 0, totalLost = 0, totalVoided = 0;
  let totalPaidOut = 0;

  await db.transaction(async (tx) => {
    const affectedBetIds = new Set<number>();

    // Step 1: update each matching selection
    for (const { marketType, selection, result } of outcomes) {
      const updated = await tx.execute(sql`
        UPDATE bet_selections
        SET status = ${result}
        WHERE event_id = ${eventId}
          AND market_type = ${marketType}
          AND selection = ${selection}
          AND status = 'open'
        RETURNING bet_id
      `);
      for (const r of updated.rows as Array<{ bet_id: number }>) {
        affectedBetIds.add(r.bet_id);
      }
    }

    if (affectedBetIds.size === 0) return;

    // Step 2: evaluate each affected bet
    for (const betId of affectedBetIds) {
      const [bet] = await tx.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
      if (!bet || bet.status !== "open") continue;

      const allSelections = await tx.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, betId));

      const hasLost = allSelections.some(s => s.status === "lost");
      const hasOpen = allSelections.some(s => s.status === "open");

      // BUG-02 fix: a confirmed lost leg busts an accumulator immediately.
      // Void remaining open legs so we can resolve the bet now.
      if (hasLost && hasOpen) {
        await tx.execute(sql`
          UPDATE bet_selections SET status = 'void'
          WHERE bet_id = ${betId} AND status = 'open'
        `);
        const refreshed = await tx.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, betId));
        allSelections.splice(0, allSelections.length, ...refreshed);
      }

      // Still waiting for other legs (no lost leg yet)
      if (!hasLost && hasOpen) continue;

      const allVoid  = allSelections.every(s => s.status === "void");
      const wonLegs  = allSelections.filter(s => s.status === "won");

      let newStatus: string;
      let payout = 0;

      if (hasLost) {
        newStatus = "lost";
        totalLost++;
      } else if (allVoid) {
        newStatus = "void";
        payout = parseFloat(String(bet.stake));
        totalVoided++;
      } else {
        // won (possibly with some voided legs — recalculate odds from non-void legs only)
        newStatus = "won";
        const adjustedOdds = wonLegs.reduce((acc, s) => acc * parseFloat(String(s.odds)), 1);
        payout = parseFloat(String(bet.stake)) * adjustedOdds;
        totalWon++;
      }

      await tx.update(betsTable).set({ status: newStatus, settledAt: new Date(), settledPayout: String(payout.toFixed(8)) }).where(eq(betsTable.id, betId));
      totalSettled++;

      // Decrement market liability for every selection in this bet
      for (const sel of allSelections) {
        const selPayout = parseFloat(String(sel.odds)) * parseFloat(String(bet.stake));
        await tx.execute(sql`
          UPDATE market_liability
          SET
            total_stake      = GREATEST(0, total_stake - ${String(bet.stake)}::numeric),
            potential_payout = GREATEST(0, potential_payout - ${selPayout.toFixed(8)}::numeric),
            bet_count        = GREATEST(0, bet_count - 1)
          WHERE event_id    = ${sel.eventId}
            AND market_type = ${sel.marketType}
            AND selection   = ${sel.selection}
        `);
      }

      if (payout > 0) {
        totalPaidOut += payout;
        const txType = newStatus === "void" ? "refund" : "win";
        const txNote = newStatus === "void"
          ? `Bet #${betId} voided — stake refunded`
          : `Bet #${betId} won — payout $${payout.toFixed(2)}`;

        await tx.insert(transactionsTable).values({
          userId: bet.userId,
          type: txType,
          amount: String(payout.toFixed(8)),
          status: "completed",
          notes: txNote,
        });

        await tx.execute(sql`
          UPDATE wallets SET balance_usdt = balance_usdt + ${String(payout.toFixed(8))}
          WHERE user_id = ${bet.userId}
        `);
      }
    }
  });

  await logAdminAction(req.user!.userId, "batch_settle", "event", 0, {
    eventId, outcomes: outcomes.length, settled: totalSettled, won: totalWon, lost: totalLost, voided: totalVoided,
  });

  // Write to settlement_log
  if (totalSettled > 0) {
    const eventMeta = await db.execute(sql`
      SELECT event_name, sport FROM bet_selections WHERE event_id = ${eventId} LIMIT 1
    `);
    const meta = (eventMeta.rows[0] as Record<string, string> | undefined) ?? {};
    await db.insert(settlementLogTable).values({
      eventId,
      eventName: meta.event_name ?? eventId,
      sport: meta.sport ?? "",
      result: "manual",
      homeTeam: "",
      awayTeam: "",
      homeScore: "",
      awayScore: "",
      betsSettled: totalSettled,
      betsWon: totalWon,
      betsLost: totalLost,
      betsVoided: totalVoided,
      totalPayout: totalPaidOut.toFixed(8),
      source: "manual",
    });
  }

  res.json({
    settled: totalSettled,
    won: totalWon,
    lost: totalLost,
    voided: totalVoided,
    totalPaidOut: totalPaidOut.toFixed(2),
  });
});

// ── Settlement Log ────────────────────────────────────────────────────────────

router.get("/admin/settlement/log", async (req, res): Promise<void> => {
  const { page = "1", limit = "20", source, sport, dateFrom, dateTo } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (source && source !== "all") conditions.push(eq(settlementLogTable.source, source));
  if (sport && sport !== "all")   conditions.push(eq(settlementLogTable.sport, sport));
  if (dateFrom) conditions.push(gte(settlementLogTable.settledAt, new Date(dateFrom)));
  if (dateTo)   conditions.push(lte(settlementLogTable.settledAt, new Date(dateTo)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, [{ total }]] = await Promise.all([
    db.select().from(settlementLogTable).where(where).orderBy(desc(settlementLogTable.settledAt)).limit(limitNum).offset(offset),
    db.select({ total: count() }).from(settlementLogTable).where(where),
  ]);

  res.json({ logs, total: Number(total), page: pageNum, limit: limitNum });
});

// ── Re-open a settled bet (for admin override / re-settlement) ─────────────────

router.post("/admin/bets/:id/reopen", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid bet id" }); return; }

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  if (!bet) { res.status(404).json({ error: "Bet not found" }); return; }
  if (bet.status === "open") { res.status(400).json({ error: "Bet is already open" }); return; }

  const previousStatus = bet.status;

  await db.transaction(async (tx) => {
    await tx.update(betsTable).set({ status: "open", settledAt: null, settledPayout: "0" }).where(eq(betsTable.id, id));
    await tx.execute(sql`UPDATE bet_selections SET status = 'open' WHERE bet_id = ${id}`);

    // Reverse any payout/refund that was already credited.
    // Use settled_payout (exact amount paid) not potential_return, which can differ
    // for accumulators with void legs (adjusted odds = product of won legs only).
    if (previousStatus === "won") {
      const payout = parseFloat(bet.settledPayout) > 0 ? parseFloat(bet.settledPayout) : parseFloat(String(bet.potentialReturn));
      if (payout > 0) {
        await tx.execute(sql`
          UPDATE wallets SET balance_usdt = GREATEST(0, balance_usdt - ${String(payout.toFixed(8))})
          WHERE user_id = ${bet.userId}
        `);
        await tx.insert(transactionsTable).values({
          userId: bet.userId,
          type: "debit",
          amount: payout.toFixed(8),
          status: "completed",
          notes: `Bet #${id} reopened by admin — payout reversed for re-settlement`,
        });
      }
    } else if (previousStatus === "void") {
      const stake = parseFloat(String(bet.stake));
      if (stake > 0) {
        await tx.execute(sql`
          UPDATE wallets SET balance_usdt = GREATEST(0, balance_usdt - ${String(stake.toFixed(8))})
          WHERE user_id = ${bet.userId}
        `);
        await tx.insert(transactionsTable).values({
          userId: bet.userId,
          type: "debit",
          amount: stake.toFixed(8),
          status: "completed",
          notes: `Bet #${id} reopened by admin — refund reversed for re-settlement`,
        });
      }
    }
  });

  await logAdminAction(req.user!.userId, "reopen_bet", "bet", id, { previousStatus });
  const [updated] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  res.json({ bet: updated, message: `Bet #${id} reopened from status '${previousStatus}'` });
});

// ── All selections for an event (regardless of status) ────────────────────────

router.get("/admin/settlement/events/:eventId/selections", async (req, res): Promise<void> => {
  const eventId = req.params.eventId;
  const rows = await db.execute(sql`
    SELECT DISTINCT market_type, selection
    FROM bet_selections
    WHERE event_id = ${eventId}
    ORDER BY market_type, selection
  `);
  const meta = await db.execute(sql`
    SELECT event_name, sport FROM bet_selections WHERE event_id = ${eventId} LIMIT 1
  `);
  res.json({
    eventId,
    eventName: (meta.rows[0] as Record<string, unknown>)?.event_name ?? eventId,
    sport:     (meta.rows[0] as Record<string, unknown>)?.sport ?? "",
    selections: rows.rows,
  });
});

// ── Settlement override: reopen + re-settle in one atomic operation ────────────

router.post("/admin/settlement/override", async (req, res): Promise<void> => {
  const schema = z.object({
    eventId: z.string().min(1),
    outcomes: z.array(z.object({
      marketType: z.string().min(1),
      selection: z.string().min(1),
      result: z.enum(["won", "lost", "void"]),
    })).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() }); return; }
  const { eventId, outcomes } = parsed.data;

  let totalSettled = 0, totalWon = 0, totalLost = 0, totalVoided = 0, totalPaidOut = 0;

  await db.transaction(async (tx) => {
    // Step 1: Find all non-open bets tied to this event; reverse payouts/refunds
    const settled = await tx.execute(sql`
      SELECT DISTINCT b.id, b.user_id, b.status, b.potential_return, b.settled_payout, b.stake
      FROM bets b
      JOIN bet_selections bs ON bs.bet_id = b.id
      WHERE bs.event_id = ${eventId} AND b.status != 'open'
    `);

    for (const row of settled.rows as { id: number; user_id: number; status: string; potential_return: string; settled_payout: string | null; stake: string }[]) {
      const { id: betId, user_id: userId, status: prevStatus, potential_return: potReturn, settled_payout: settledPayoutStr, stake } = row;

      if (prevStatus === "won") {
        // Use settled_payout (exact amount credited), not potential_return which can
        // be higher than actual payout for accumulators with void legs.
        const payout = parseFloat(String(settledPayoutStr ?? potReturn));
        if (payout > 0) {
          await tx.execute(sql`UPDATE wallets SET balance_usdt = GREATEST(0, balance_usdt - ${payout.toFixed(8)}) WHERE user_id = ${userId}`);
          await tx.insert(transactionsTable).values({ userId, type: "debit", amount: payout.toFixed(8), status: "completed", notes: `Bet #${betId} override — prior payout reversed` });
        }
      } else if (prevStatus === "void") {
        const refund = parseFloat(String(stake));
        if (refund > 0) {
          await tx.execute(sql`UPDATE wallets SET balance_usdt = GREATEST(0, balance_usdt - ${refund.toFixed(8)}) WHERE user_id = ${userId}`);
          await tx.insert(transactionsTable).values({ userId, type: "debit", amount: refund.toFixed(8), status: "completed", notes: `Bet #${betId} override — prior void refund reversed` });
        }
      }
      await tx.update(betsTable).set({ status: "open", settledAt: null, settledPayout: "0" }).where(eq(betsTable.id, betId));
    }

    // Step 2: Reset ALL bet_selections for this event to 'open'
    await tx.execute(sql`UPDATE bet_selections SET status = 'open' WHERE event_id = ${eventId}`);

    // Step 3: Apply new outcomes
    const affectedBetIds = new Set<number>();
    for (const { marketType, selection, result } of outcomes) {
      const updated = await tx.execute(sql`
        UPDATE bet_selections
        SET status = ${result}
        WHERE event_id = ${eventId} AND market_type = ${marketType} AND selection = ${selection} AND status = 'open'
        RETURNING bet_id
      `);
      for (const r of updated.rows as { bet_id: number }[]) affectedBetIds.add(r.bet_id);
    }

    // Step 4: Evaluate bets — only resolve if all legs settled
    for (const betId of affectedBetIds) {
      const [bet] = await tx.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
      if (!bet || bet.status !== "open") continue;
      const allSelections = await tx.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, betId));
      if (allSelections.some(s => s.status === "open")) continue;

      const hasLost = allSelections.some(s => s.status === "lost");
      const allVoid  = allSelections.every(s => s.status === "void");
      const wonLegs  = allSelections.filter(s => s.status === "won");

      let newStatus: string;
      let payout = 0;
      if (hasLost) { newStatus = "lost"; totalLost++; }
      else if (allVoid) { newStatus = "void"; payout = parseFloat(String(bet.stake)); totalVoided++; }
      else {
        newStatus = "won";
        const adjustedOdds = wonLegs.reduce((acc, s) => acc * parseFloat(String(s.odds)), 1);
        payout = parseFloat(String(bet.stake)) * adjustedOdds;
        totalWon++;
      }

      await tx.update(betsTable).set({ status: newStatus, settledAt: new Date(), settledPayout: String(payout.toFixed(8)) }).where(eq(betsTable.id, betId));
      totalSettled++;

      // Decrement market liability for every selection in this bet
      for (const sel of allSelections) {
        const selPayout = parseFloat(String(sel.odds)) * parseFloat(String(bet.stake));
        await tx.execute(sql`
          UPDATE market_liability
          SET
            total_stake      = GREATEST(0, total_stake - ${String(bet.stake)}::numeric),
            potential_payout = GREATEST(0, potential_payout - ${selPayout.toFixed(8)}::numeric),
            bet_count        = GREATEST(0, bet_count - 1)
          WHERE event_id    = ${sel.eventId}
            AND market_type = ${sel.marketType}
            AND selection   = ${sel.selection}
        `);
      }

      if (payout > 0) {
        totalPaidOut += payout;
        const txType = newStatus === "void" ? "refund" : "win";
        await tx.insert(transactionsTable).values({
          userId: bet.userId,
          type: txType,
          amount: payout.toFixed(8),
          status: "completed",
          notes: newStatus === "void" ? `Bet #${betId} override-voided — stake refunded` : `Bet #${betId} override-won — payout $${payout.toFixed(2)}`,
        });
        await tx.execute(sql`UPDATE wallets SET balance_usdt = balance_usdt + ${payout.toFixed(8)} WHERE user_id = ${bet.userId}`);
      }
    }
  });

  await logAdminAction(req.user!.userId, "override_settle", "event", 0, {
    eventId, outcomes: outcomes.length, settled: totalSettled, won: totalWon, lost: totalLost, voided: totalVoided,
  });

  // Write settlement_log with source = 'manual_override'
  if (totalSettled > 0) {
    const eventMeta = await db.execute(sql`SELECT event_name, sport FROM bet_selections WHERE event_id = ${eventId} LIMIT 1`);
    const meta = (eventMeta.rows[0] as Record<string, string> | undefined) ?? {};
    await db.insert(settlementLogTable).values({
      eventId,
      eventName: meta.event_name ?? eventId,
      sport: meta.sport ?? "",
      result: "manual",
      homeTeam: "",
      awayTeam: "",
      homeScore: "",
      awayScore: "",
      betsSettled: totalSettled,
      betsWon: totalWon,
      betsLost: totalLost,
      betsVoided: totalVoided,
      totalPayout: totalPaidOut.toFixed(8),
      source: "manual_override",
    });
  }

  res.json({ settled: totalSettled, won: totalWon, lost: totalLost, voided: totalVoided, totalPaidOut: totalPaidOut.toFixed(2) });
});

// ─── Liability Monitor ────────────────────────────────────────────────────────

// ── GET /admin/reports/book-balance ── Book balance: open stakes vs payouts vs settled ──
router.get("/admin/reports/book-balance", async (_req, res): Promise<void> => {
  const [openResult, settledResult, platformResult] = await Promise.all([
    // Open bets: grouped by sport — non-test accounts only
    db.execute(sql`
      SELECT
        COALESCE(
          (SELECT bs2.sport FROM bet_selections bs2 WHERE bs2.bet_id = b.id ORDER BY bs2.id LIMIT 1),
          'Unknown'
        )                                                   AS sport,
        COUNT(b.id)::int                                    AS open_bets,
        SUM(b.stake)::numeric                               AS total_staked,
        SUM(b.potential_return)::numeric                    AS potential_payout
      FROM bets b
      JOIN users u ON u.id = b.user_id AND u.is_test_account = false
      WHERE b.status = 'open'
      GROUP BY 1
      ORDER BY total_staked DESC
    `),
    // Settled bets: grouped by sport — non-test accounts only
    db.execute(sql`
      SELECT
        COALESCE(
          (SELECT bs2.sport FROM bet_selections bs2 WHERE bs2.bet_id = b.id ORDER BY bs2.id LIMIT 1),
          'Unknown'
        )                                                             AS sport,
        COUNT(b.id) FILTER (WHERE b.status = 'won')::int            AS bets_won,
        COUNT(b.id) FILTER (WHERE b.status = 'lost')::int           AS bets_lost,
        COUNT(b.id) FILTER (WHERE b.status = 'void')::int           AS bets_voided,
        SUM(b.stake)::numeric                                        AS total_staked,
        COALESCE(SUM(b.settled_payout), 0)::numeric                 AS total_paid_out
      FROM bets b
      JOIN users u ON u.id = b.user_id AND u.is_test_account = false
      WHERE b.status IN ('won', 'lost', 'void')
      GROUP BY 1
      ORDER BY total_staked DESC
    `),
    // Platform totals — non-test accounts only
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE b.status = 'open')::int                   AS open_bets,
        COUNT(*) FILTER (WHERE b.status IN ('won','lost','void'))::int   AS settled_bets,
        COALESCE(SUM(b.stake), 0)::numeric                               AS lifetime_staked,
        COALESCE(SUM(b.settled_payout) FILTER (WHERE b.status IN ('won','void')), 0)::numeric AS lifetime_paid_out
      FROM bets b
      JOIN users u ON u.id = b.user_id AND u.is_test_account = false
    `),
  ]);

  const platform = platformResult.rows[0] as {
    open_bets: number; settled_bets: number; lifetime_staked: string; lifetime_paid_out: string;
  };

  res.json({
    platform: {
      openBets: platform.open_bets,
      settledBets: platform.settled_bets,
      lifetimeStaked: parseFloat(platform.lifetime_staked ?? "0"),
      lifetimePaidOut: parseFloat(platform.lifetime_paid_out ?? "0"),
      houseEdge: parseFloat(platform.lifetime_staked ?? "0") - parseFloat(platform.lifetime_paid_out ?? "0"),
    },
    openBySport:    openResult.rows,
    settledBySport: settledResult.rows,
  });
});

// ── GET /admin/reports/ledger-reconciliation ─────────────────────────────────
// Per-user ledger balance vs wallet balance, flagging any discrepancy > 0.01 USDT.
// Credits counted: deposit, win, refund, bonus, credit (status=completed only)
// Debits counted:  bet, debit, bet_stake, withdrawal      (status=completed only)
// Pending transactions are excluded — they have not yet affected the wallet.
router.get("/admin/reports/ledger-reconciliation", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      u.id                                                                                       AS user_id,
      u.username,
      u.email,
      u.is_test_account,
      w.balance_usdt::float                                                                      AS wallet_balance,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.type IN ('deposit','win','refund','bonus','credit') AND t.status = 'completed'
      ), 0)::float                                                                               AS total_inflow,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.type IN ('bet','debit','bet_stake','withdrawal') AND t.status = 'completed'
      ), 0)::float                                                                               AS total_outflow,
      (COALESCE(SUM(t.amount) FILTER (
          WHERE t.type IN ('deposit','win','refund','bonus','credit') AND t.status = 'completed'
        ), 0)
       - COALESCE(SUM(t.amount) FILTER (
          WHERE t.type IN ('bet','debit','bet_stake','withdrawal') AND t.status = 'completed'
        ), 0))::float                                                                            AS ledger_balance,
      (w.balance_usdt
       - (COALESCE(SUM(t.amount) FILTER (
            WHERE t.type IN ('deposit','win','refund','bonus','credit') AND t.status = 'completed'
          ), 0)
          - COALESCE(SUM(t.amount) FILTER (
            WHERE t.type IN ('bet','debit','bet_stake','withdrawal') AND t.status = 'completed'
          ), 0)))::float                                                                         AS delta,
      COUNT(t.id) FILTER (WHERE t.type = 'deposit' AND t.status = 'pending')::int               AS pending_deposits,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'deposit' AND t.status = 'pending'), 0)::float AS pending_deposit_amount
    FROM users u
    JOIN wallets w ON w.user_id = u.id
    LEFT JOIN transactions t ON t.user_id = u.id
    GROUP BY u.id, u.username, u.email, u.is_test_account, w.balance_usdt
    ORDER BY u.is_test_account ASC, ABS(
      w.balance_usdt
      - (COALESCE(SUM(t.amount) FILTER (
            WHERE t.type IN ('deposit','win','refund','bonus','credit') AND t.status = 'completed'
          ), 0)
         - COALESCE(SUM(t.amount) FILTER (
            WHERE t.type IN ('bet','debit','bet_stake','withdrawal') AND t.status = 'completed'
          ), 0))
    ) DESC
  `);

  type RecRow = {
    user_id: number; username: string; email: string; is_test_account: boolean;
    wallet_balance: number; total_inflow: number; total_outflow: number;
    ledger_balance: number; delta: number;
    pending_deposits: number; pending_deposit_amount: number;
  };

  const allUsers = (rows.rows as RecRow[]).map(r => ({
    userId:               r.user_id,
    username:             r.username,
    email:                r.email,
    isTestAccount:        r.is_test_account,
    walletBalance:        r.wallet_balance,
    totalInflow:          r.total_inflow,
    totalOutflow:         r.total_outflow,
    ledgerBalance:        r.ledger_balance,
    delta:                r.delta,
    discrepancy:          Math.abs(r.delta) > 0.01,
    pendingDeposits:      r.pending_deposits,
    pendingDepositAmount: r.pending_deposit_amount,
  }));

  const prodUsers = allUsers.filter(u => !u.isTestAccount);

  const summary = {
    totalUsers:        allUsers.length,
    productionUsers:   prodUsers.length,
    testUsers:         allUsers.length - prodUsers.length,
    usersWithMismatch: allUsers.filter(u => u.discrepancy).length,
    prodUsersWithMismatch: prodUsers.filter(u => u.discrepancy).length,
    totalWalletFunds:  allUsers.reduce((s, u) => s + u.walletBalance, 0),
    prodWalletFunds:   prodUsers.reduce((s, u) => s + u.walletBalance, 0),
    totalLedgerFunds:  allUsers.reduce((s, u) => s + u.ledgerBalance, 0),
    prodLedgerFunds:   prodUsers.reduce((s, u) => s + u.ledgerBalance, 0),
    totalDelta:        allUsers.reduce((s, u) => s + u.delta, 0),
    prodDelta:         prodUsers.reduce((s, u) => s + u.delta, 0),
  };

  res.json({ summary, users: allUsers });
});

router.get("/admin/liability", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(marketLiabilityTable)
    .orderBy(desc(marketLiabilityTable.potentialPayout));
  res.json(rows);
});

router.patch("/admin/liability/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const schema = z.object({ isSuspended: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [row] = await db
    .update(marketLiabilityTable)
    .set({ isSuspended: parsed.data.isSuspended })
    .where(eq(marketLiabilityTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Market not found" }); return; }

  await logAdminAction(req.user!.userId, "liability_updated", "market_liability", id, parsed.data as Record<string, unknown>);
  res.json(row);
});

// ─── Responsible Gambling Admin ───────────────────────────────────────────────

router.get("/admin/rg/players", async (_req, res): Promise<void> => {
  const now = new Date();

  // Players with active exclusions
  const exclusions = await db.execute(sql`
    SELECT
      u.id   AS user_id,
      u.username,
      u.email,
      se.id,
      se.is_permanent,
      se.is_take_a_break,
      se.ends_at,
      se.reason,
      se.lifted_at,
      se.created_at
    FROM self_exclusions se
    JOIN users u ON u.id = se.user_id
    WHERE se.lifted_at IS NULL
      AND (se.is_permanent = TRUE OR se.ends_at > ${now})
    ORDER BY se.created_at DESC
  `);

  // Players with any limits
  const limits = await db.execute(sql`
    SELECT
      ul.id,
      ul.user_id,
      ul.limit_type,
      ul.period,
      ul.amount_usdt,
      ul.current_usage,
      ul.reset_at
    FROM user_limits ul
    ORDER BY ul.user_id
  `);

  // Merge into player records
  type ExcRow = {
    user_id: number; username: string; email: string;
    id: number; is_permanent: boolean; is_take_a_break: boolean;
    ends_at: string | null; reason: string | null; lifted_at: string | null; created_at: string;
  };
  type LimRow = {
    id: number; user_id: number; limit_type: string; period: string;
    amount_usdt: string; current_usage: string; reset_at: string;
  };

  const playerMap = new Map<number, {
    userId: number; username: string; email: string;
    exclusion: object | null; limits: object[];
  }>();

  for (const row of (exclusions.rows as ExcRow[])) {
    playerMap.set(row.user_id, {
      userId: row.user_id,
      username: row.username,
      email: row.email,
      exclusion: {
        id: row.id,
        isPermanent: row.is_permanent,
        isTakeABreak: row.is_take_a_break,
        endsAt: row.ends_at,
        reason: row.reason,
        liftedAt: row.lifted_at,
        createdAt: row.created_at,
      },
      limits: [],
    });
  }

  for (const row of (limits.rows as LimRow[])) {
    if (!playerMap.has(row.user_id)) {
      // fetch user info
      const [user] = await db.select({ username: usersTable.username, email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, row.user_id)).limit(1);
      if (user) {
        playerMap.set(row.user_id, {
          userId: row.user_id,
          username: user.username ?? "",
          email: user.email ?? "",
          exclusion: null,
          limits: [],
        });
      }
    }
    const player = playerMap.get(row.user_id);
    if (player) {
      player.limits.push({
        id: row.id,
        limitType: row.limit_type,
        period: row.period,
        amountUsdt: row.amount_usdt,
        currentUsage: row.current_usage,
        resetAt: row.reset_at,
      });
    }
  }

  res.json([...playerMap.values()]);
});

// ── POST /admin/rg/exclusions ── Admin-initiated exclusion for any user ────────
router.post("/admin/rg/exclusions", async (req, res): Promise<void> => {
  const schema = z.object({
    userId: z.number().int().positive(),
    durationHours: z.number().int().positive().optional(),
    isPermanent: z.boolean().default(false),
    reason: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }

  const { userId, durationHours, isPermanent, reason } = parsed.data;
  if (!isPermanent && !durationHours) { res.status(400).json({ error: "Provide durationHours or set isPermanent=true" }); return; }

  const [existing] = await db.select().from(selfExclusionsTable)
    .where(and(eq(selfExclusionsTable.userId, userId), isNull(selfExclusionsTable.liftedAt)))
    .limit(1);
  if (existing) { res.status(409).json({ error: "User already has an active exclusion" }); return; }

  const endsAt = isPermanent ? null : new Date(Date.now() + durationHours! * 3600 * 1000);
  const [excl] = await db.insert(selfExclusionsTable).values({
    userId,
    isPermanent,
    isTakeABreak: false,
    endsAt,
    reason: reason ?? "Admin-initiated exclusion",
  }).returning();
  await logAdminAction(req.user!.userId, "exclusion_created", "self_exclusions", excl.id, { userId, isPermanent, durationHours });
  res.status(201).json(excl);
});

router.patch("/admin/rg/exclusions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const schema = z.object({
    action: z.enum(["lift", "extend"]),
    extendHours: z.number().int().positive().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [excl] = await db.select().from(selfExclusionsTable)
    .where(eq(selfExclusionsTable.id, id)).limit(1);
  if (!excl) { res.status(404).json({ error: "Exclusion not found" }); return; }

  if (parsed.data.action === "lift") {
    const [updated] = await db.update(selfExclusionsTable)
      .set({ liftedAt: new Date(), liftedByAdminId: req.user!.userId })
      .where(eq(selfExclusionsTable.id, id))
      .returning();
    await logAdminAction(req.user!.userId, "exclusion_lifted", "self_exclusions", id, {});
    res.json(updated);
    return;
  }

  if (parsed.data.action === "extend" && parsed.data.extendHours) {
    const currentEndsAt = excl.endsAt ?? new Date();
    const newEndsAt = new Date(currentEndsAt.getTime() + parsed.data.extendHours * 3600 * 1000);
    const [updated] = await db.update(selfExclusionsTable)
      .set({ endsAt: newEndsAt })
      .where(eq(selfExclusionsTable.id, id))
      .returning();
    await logAdminAction(req.user!.userId, "exclusion_extended", "self_exclusions", id, { extendHours: parsed.data.extendHours });
    res.json(updated);
    return;
  }

  res.status(400).json({ error: "Invalid action" });
});

// ─── Risk flags ───────────────────────────────────────────────────────────────
router.get("/admin/users/:id/risk-flags", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string);
  if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const flags = await db.select().from(riskFlagsTable)
    .where(eq(riskFlagsTable.userId, userId))
    .orderBy(desc(riskFlagsTable.createdAt));

  res.json(flags);
});

router.delete("/admin/users/:id/risk-flags/:flagId", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id as string);
  const flagId = parseInt(req.params.flagId as string);
  if (isNaN(userId) || isNaN(flagId)) { res.status(400).json({ error: "Invalid ID" }); return; }

  await db.delete(riskFlagsTable)
    .where(and(eq(riskFlagsTable.id, flagId), eq(riskFlagsTable.userId, userId)));
  await logAdminAction(req.user!.userId, "risk_flag_dismissed", "risk_flags", flagId, { userId });
  res.status(204).end();
});

// ─── Manual translation overrides ─────────────────────────────────────────────
// Database-backed EN→ZH overrides that take priority over the static dictionaries
// and apply on the live site without a rebuild.

const DEFAULT_OVERRIDE_LANG = "zh-CN";

// Postgres unique_violation (SQLSTATE 23505) — surfaces when two operators
// create/rename to the same (lang, source) concurrently, slipping past the
// pre-check. Translate it into a clean 409 instead of a 500.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23505";
}

const translationBodySchema = z.object({
  source: z.string().trim().min(1, "English text is required").max(500, "English text is too long"),
  target: z.string().trim().min(1, "Chinese text is required").max(500, "Chinese text is too long"),
  lang: z.string().trim().min(1).max(20).optional(),
});

// List with search + pagination
router.get("/admin/translations", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const lang = typeof req.query.lang === "string" && req.query.lang.trim() ? req.query.lang.trim() : DEFAULT_OVERRIDE_LANG;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "50")) || 50));

  const conditions = [eq(translationOverridesTable.lang, lang)];
  if (search) {
    conditions.push(
      or(
        ilike(translationOverridesTable.source, `%${search}%`),
        ilike(translationOverridesTable.target, `%${search}%`),
      )!,
    );
  }
  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(translationOverridesTable)
    .where(where);

  const rows = await db
    .select()
    .from(translationOverridesTable)
    .where(where)
    .orderBy(desc(translationOverridesTable.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  res.json({ rows, total: Number(total), page, pageSize });
});

// Create
router.post("/admin/translations", async (req, res): Promise<void> => {
  const parsed = translationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const lang = parsed.data.lang?.trim() || DEFAULT_OVERRIDE_LANG;
  const source = parsed.data.source.trim();
  const target = parsed.data.target.trim();

  const existing = await db
    .select({ id: translationOverridesTable.id })
    .from(translationOverridesTable)
    .where(and(eq(translationOverridesTable.lang, lang), eq(translationOverridesTable.source, source)))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "An override for this exact English text already exists" });
    return;
  }

  try {
    const [row] = await db
      .insert(translationOverridesTable)
      .values({ lang, source, target })
      .returning();
    await logAdminAction(req.user!.userId, "create_translation", "translation_override", row.id, { lang, source, target });
    res.status(201).json(row);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "An override for this exact English text already exists" });
      return;
    }
    throw err;
  }
});

// Bulk create / upsert — paste-to-bulk from the admin panel.
// Body: { items: [{ source, target }], overwrite?: boolean, lang? }
// Returns a per-batch summary: { created, updated, skipped, invalid }.
const bulkTranslationSchema = z.object({
  items: z
    .array(
      z.object({
        source: z.string(),
        target: z.string(),
      }),
    )
    .min(1, "No translations to import")
    .max(2000, "Too many rows in one import (max 2000)"),
  overwrite: z.boolean().optional(),
  lang: z.string().trim().min(1).max(20).optional(),
});

router.post("/admin/translations/bulk", async (req, res): Promise<void> => {
  const parsed = bulkTranslationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const lang = parsed.data.lang?.trim() || DEFAULT_OVERRIDE_LANG;
  const overwrite = parsed.data.overwrite ?? false;

  // Normalise + validate each row; drop blanks/over-length, then de-dupe by
  // source keeping the LAST occurrence (matches the client-side preview).
  let invalid = 0;
  const bySource = new Map<string, string>();
  for (const raw of parsed.data.items) {
    const source = raw.source.trim();
    const target = raw.target.trim();
    if (!source || !target || source.length > 500 || target.length > 500) {
      invalid++;
      continue;
    }
    bySource.set(source, target);
  }

  const deduped = [...bySource.entries()].map(([source, target]) => ({ source, target }));
  if (deduped.length === 0) {
    res.status(400).json({ error: "No valid translations to import", created: 0, updated: 0, skipped: 0, invalid });
    return;
  }

  const summary = await db.transaction(async (tx) => {
    const sources = deduped.map((d) => d.source);
    const existingRows = await tx
      .select({ source: translationOverridesTable.source })
      .from(translationOverridesTable)
      .where(and(eq(translationOverridesTable.lang, lang), inArray(translationOverridesTable.source, sources)));
    const existing = new Set(existingRows.map((r) => r.source));

    const toInsert = deduped.filter((d) => !existing.has(d.source));
    const toUpdate = overwrite ? deduped.filter((d) => existing.has(d.source)) : [];
    const skipped = overwrite ? 0 : deduped.filter((d) => existing.has(d.source)).length;

    // Count actual rows affected (not intended) so the summary stays accurate
    // even if a concurrent import races on the same source keys.
    let created = 0;
    if (toInsert.length > 0) {
      const inserted = await tx
        .insert(translationOverridesTable)
        .values(toInsert.map((d) => ({ lang, source: d.source, target: d.target })))
        .onConflictDoNothing()
        .returning({ id: translationOverridesTable.id });
      created = inserted.length;
    }
    let updated = 0;
    for (const d of toUpdate) {
      const res = await tx
        .update(translationOverridesTable)
        .set({ target: d.target })
        .where(and(eq(translationOverridesTable.lang, lang), eq(translationOverridesTable.source, d.source)))
        .returning({ id: translationOverridesTable.id });
      updated += res.length;
    }

    return { created, updated, skipped };
  });

  await logAdminAction(req.user!.userId, "bulk_translation", "translation_override", undefined, {
    lang,
    overwrite,
    ...summary,
    invalid,
    received: parsed.data.items.length,
  });

  res.json({ ...summary, invalid });
});

// Update
router.patch("/admin/translations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = translationBodySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const updates: Record<string, string> = {};
  if (parsed.data.source != null) updates.source = parsed.data.source.trim();
  if (parsed.data.target != null) updates.target = parsed.data.target.trim();
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  try {
    const [row] = await db
      .update(translationOverridesTable)
      .set(updates)
      .where(eq(translationOverridesTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    await logAdminAction(req.user!.userId, "update_translation", "translation_override", id, updates);
    res.json(row);
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "An override for this exact English text already exists" });
      return;
    }
    throw err;
  }
});

// Delete
router.delete("/admin/translations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .delete(translationOverridesTable)
    .where(eq(translationOverridesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await logAdminAction(req.user!.userId, "delete_translation", "translation_override", id, { source: row.source });
  res.status(204).end();
});

// ─── Translation queue ("Needs translation") ─────────────────────────────────
// Auto-collected proper-noun names off the live feeds that have no Chinese
// override yet (see lib/translationQueue.ts). Operators translate them here;
// resolving a row creates the live override and marks the queue row translated.

// List with status filter + search + sort + pagination, plus status counts.
router.get("/admin/translation-queue", async (req, res): Promise<void> => {
  const lang = typeof req.query.lang === "string" && req.query.lang.trim() ? req.query.lang.trim() : DEFAULT_OVERRIDE_LANG;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status.trim() : "pending";
  const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const sort = req.query.sort === "recent" ? "recent" : "frequency";
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "50")) || 50));

  const conditions = [eq(translationQueueTable.lang, lang)];
  if (status === "pending" || status === "translated" || status === "ignored") {
    conditions.push(eq(translationQueueTable.status, status));
  }
  if (category === "team" || category === "league" || category === "country" || category === "player") {
    conditions.push(eq(translationQueueTable.category, category));
  }
  if (search) {
    conditions.push(ilike(translationQueueTable.source, `%${search}%`));
  }
  const where = and(...conditions);

  const [{ total }] = await db
    .select({ total: count() })
    .from(translationQueueTable)
    .where(where);

  const orderBy =
    sort === "recent"
      ? [desc(translationQueueTable.lastSeen)]
      : [desc(translationQueueTable.seenCount), desc(translationQueueTable.lastSeen)];

  const rows = await db
    .select()
    .from(translationQueueTable)
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // Per-status counts (for the tab badges) scoped to the current language.
  const countRows = await db
    .select({ status: translationQueueTable.status, c: count() })
    .from(translationQueueTable)
    .where(eq(translationQueueTable.lang, lang))
    .groupBy(translationQueueTable.status);
  const counts = { pending: 0, translated: 0, ignored: 0 };
  for (const r of countRows) {
    if (r.status in counts) counts[r.status as keyof typeof counts] = Number(r.c);
  }

  res.json({ rows, total: Number(total), page, pageSize, counts });
});

const resolveQueueSchema = z.object({
  target: z.string().trim().min(1, "Chinese text is required").max(500, "Chinese text is too long"),
});

// Resolve: create the live override + mark the queue row translated (atomic).
router.post("/admin/translation-queue/:id/resolve", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = resolveQueueSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const target = parsed.data.target.trim();

  const [queueRow] = await db
    .select()
    .from(translationQueueTable)
    .where(eq(translationQueueTable.id, id))
    .limit(1);
  if (!queueRow) { res.status(404).json({ error: "Not found" }); return; }

  try {
    const override = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(translationOverridesTable)
        .values({ lang: queueRow.lang, source: queueRow.source, target })
        .returning();
      await tx
        .update(translationQueueTable)
        .set({ status: "translated", lastSeen: sql`NOW()` })
        .where(eq(translationQueueTable.id, id));
      return row;
    });
    // Prime the covered-set cache so this name does not re-surface during the
    // 60s cache window before the next refresh.
    markCovered(queueRow.source);
    await logAdminAction(req.user!.userId, "resolve_translation_queue", "translation_override", override.id, {
      lang: queueRow.lang,
      source: queueRow.source,
      target,
      queueId: id,
    });
    res.status(201).json({ override, queueId: id });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // An override for this source already exists — still mark the queue row
      // translated so it stops surfacing, then report the conflict.
      await db
        .update(translationQueueTable)
        .set({ status: "translated", lastSeen: sql`NOW()` })
        .where(eq(translationQueueTable.id, id));
      markCovered(queueRow.source);
      res.status(409).json({ error: "An override for this exact English text already exists", queueId: id });
      return;
    }
    throw err;
  }
});

// Ignore a single queue row (won't surface in the pending tab).
router.post("/admin/translation-queue/:id/ignore", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [row] = await db
    .update(translationQueueTable)
    .set({ status: "ignored", lastSeen: sql`NOW()` })
    .where(eq(translationQueueTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  await logAdminAction(req.user!.userId, "ignore_translation_queue", "translation_queue", id, { source: row.source });
  res.json(row);
});

const bulkIgnoreSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, "No rows selected").max(2000, "Too many rows"),
});

// Bulk-ignore selected queue rows.
router.post("/admin/translation-queue/bulk-ignore", async (req, res): Promise<void> => {
  const parsed = bulkIgnoreSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const updated = await db
    .update(translationQueueTable)
    .set({ status: "ignored", lastSeen: sql`NOW()` })
    .where(inArray(translationQueueTable.id, parsed.data.ids))
    .returning({ id: translationQueueTable.id });
  await logAdminAction(req.user!.userId, "bulk_ignore_translation_queue", "translation_queue", undefined, {
    requested: parsed.data.ids.length,
    ignored: updated.length,
  });
  res.json({ ignored: updated.length });
});

const bulkResolveSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        target: z.string().trim().min(1, "Chinese text is required").max(500, "Chinese text is too long"),
      }),
    )
    .min(1, "No rows to save")
    .max(2000, "Too many rows"),
});

// Bulk-resolve: create live overrides + mark queue rows translated for many rows
// at once. Each row is handled independently (its own transaction) so one
// conflict can't roll back the rest — mirrors the single-row resolve semantics.
router.post("/admin/translation-queue/bulk-resolve", async (req, res): Promise<void> => {
  const parsed = bulkResolveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  // Dedupe by id (last target wins) so a repeated id can't double-insert.
  const byId = new Map<number, string>();
  for (const it of parsed.data.items) byId.set(it.id, it.target.trim());

  let saved = 0;
  let existed = 0;
  let notFound = 0;

  for (const [id, target] of byId) {
    const [queueRow] = await db
      .select()
      .from(translationQueueTable)
      .where(eq(translationQueueTable.id, id))
      .limit(1);
    if (!queueRow) {
      notFound++;
      continue;
    }
    try {
      await db.transaction(async (tx) => {
        await tx
          .insert(translationOverridesTable)
          .values({ lang: queueRow.lang, source: queueRow.source, target });
        await tx
          .update(translationQueueTable)
          .set({ status: "translated", lastSeen: sql`NOW()` })
          .where(eq(translationQueueTable.id, id));
      });
      markCovered(queueRow.source);
      saved++;
    } catch (err) {
      if (isUniqueViolation(err)) {
        // An override for this source already exists — still mark the queue row
        // translated so it stops surfacing, and count it as already-existing.
        await db
          .update(translationQueueTable)
          .set({ status: "translated", lastSeen: sql`NOW()` })
          .where(eq(translationQueueTable.id, id));
        markCovered(queueRow.source);
        existed++;
        continue;
      }
      throw err;
    }
  }

  await logAdminAction(req.user!.userId, "bulk_resolve_translation_queue", "translation_queue", undefined, {
    requested: byId.size,
    saved,
    existed,
    notFound,
  });
  res.json({ saved, existed, notFound });
});

export default router;
