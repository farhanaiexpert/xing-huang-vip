import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import cron from "node-cron";
import { runSettlementWorker } from "./lib/settlementWorker.js";
import { fetchAndCacheOdds, ALL_ODDS_SPORT_KEYS } from "./routes/odds.js";
import { fetchBetsApiUpcoming, fetchPrematchOdds, BETSAPI_SPORT_IDS, BETSAPI_SPORT_MAP, BETSAPI_KEY } from "./lib/betsapi.js";

const PORT = parseInt(process.env.PORT ?? "5000", 10);

async function runMigrations() {
  try {
    await db.execute(sql`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS tx_hash text,
        ADD COLUMN IF NOT EXISTS network text DEFAULT 'TRC-20',
        ADD COLUMN IF NOT EXISTS wallet_address text
    `);
    logger.info("DB migration v1 applied (tx_hash, network, wallet_address)");
  } catch (err) {
    logger.warn({ err }, "Migration v1 skipped (columns may already exist)");
  }

  try {
    await db.execute(sql`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS verification_note text
    `);
    logger.info("DB migration v2 applied (verified, verification_note)");
  } catch (err) {
    logger.warn({ err }, "Migration v2 skipped (columns may already exist)");
  }

  try {
    await db.execute(sql`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS nowpayments_payment_id text,
        ADD COLUMN IF NOT EXISTS nowpayments_status text
    `);
    logger.info("DB migration v3 applied (nowpayments_payment_id, nowpayments_status)");
  } catch (err) {
    logger.warn({ err }, "Migration v3 skipped (columns may already exist)");
  }

  try {
    await db.execute(sql`
      ALTER TABLE bets ADD COLUMN IF NOT EXISTS settled_payout numeric(20,8) NOT NULL DEFAULT '0'
    `);
    logger.info("DB migration v5 applied (bets.settled_payout)");
  } catch (err) {
    logger.warn({ err }, "Migration v5 skipped");
  }

  try {
    await db.execute(sql`
      ALTER TABLE bet_selections
        ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS score_at_placement text
    `);
    logger.info("DB migration v6 applied (bet_selections.is_live, score_at_placement)");
  } catch (err) {
    logger.warn({ err }, "Migration v6 skipped");
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settlement_log (
        id             SERIAL PRIMARY KEY,
        event_id       TEXT NOT NULL,
        event_name     TEXT NOT NULL,
        sport          TEXT NOT NULL DEFAULT '',
        result         TEXT NOT NULL,
        home_team      TEXT DEFAULT '',
        away_team      TEXT DEFAULT '',
        home_score     TEXT DEFAULT '',
        away_score     TEXT DEFAULT '',
        bets_settled   INTEGER NOT NULL DEFAULT 0,
        bets_won       INTEGER NOT NULL DEFAULT 0,
        bets_lost      INTEGER NOT NULL DEFAULT 0,
        bets_voided    INTEGER NOT NULL DEFAULT 0,
        total_payout   NUMERIC(20, 8) NOT NULL DEFAULT 0,
        source         TEXT NOT NULL DEFAULT 'auto',
        settled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("DB migration v4 applied (settlement_log table)");
  } catch (err) {
    logger.warn({ err }, "Migration v4 skipped");
  }

  try {
    await db.execute(sql`
      ALTER TABLE sport_controls
        ADD COLUMN IF NOT EXISTS margin_override numeric(5,2) NOT NULL DEFAULT '0'
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS market_liability (
        id               SERIAL PRIMARY KEY,
        event_id         TEXT NOT NULL,
        event_name       TEXT NOT NULL DEFAULT '',
        sport            TEXT NOT NULL DEFAULT '',
        market_type      TEXT NOT NULL,
        selection        TEXT NOT NULL,
        total_stake      NUMERIC(20,8) NOT NULL DEFAULT 0,
        potential_payout NUMERIC(20,8) NOT NULL DEFAULT 0,
        bet_count        INTEGER NOT NULL DEFAULT 0,
        is_suspended     BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(event_id, market_type, selection)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_limits (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        limit_type     TEXT NOT NULL,
        period         TEXT NOT NULL,
        amount_usdt    NUMERIC(20,8) NOT NULL,
        current_usage  NUMERIC(20,8) NOT NULL DEFAULT 0,
        reset_at       TIMESTAMPTZ NOT NULL,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, limit_type, period)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS self_exclusions (
        id                    SERIAL PRIMARY KEY,
        user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        duration_hours        INTEGER,
        starts_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ends_at               TIMESTAMPTZ,
        is_permanent          BOOLEAN NOT NULL DEFAULT FALSE,
        is_take_a_break       BOOLEAN NOT NULL DEFAULT FALSE,
        reason                TEXT,
        lifted_at             TIMESTAMPTZ,
        lifted_by_admin_id    INTEGER,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      INSERT INTO platform_settings (key, value, description)
      VALUES
        ('global_margin_pct',      '0',    'Global odds margin percentage (0–20). Applied to all outgoing odds.'),
        ('liability_threshold_usdt','5000', 'Auto-suspend a market when open liability exceeds this USDT amount.')
      ON CONFLICT (key) DO NOTHING
    `);
    logger.info("DB migration v7 applied (market_liability, user_limits, self_exclusions, margin_override)");
  } catch (err) {
    logger.warn({ err }, "Migration v7 skipped");
  }

  // v8: add pending limit increase support (deferred 24 h cooling-off for loosening)
  try {
    await db.execute(sql`
      ALTER TABLE user_limits
        ADD COLUMN IF NOT EXISTS pending_amount_usdt  NUMERIC(20,8) NOT NULL DEFAULT '0',
        ADD COLUMN IF NOT EXISTS pending_effective_at  TIMESTAMPTZ
    `);
    logger.info("DB migration v8 applied (user_limits: pending_amount_usdt, pending_effective_at)");
  } catch (err) {
    logger.warn({ err }, "Migration v8 skipped");
  }

  // v9: fix pending_amount_usdt nullability for existing DBs where v8 ran before the NOT NULL fix
  try {
    await db.execute(sql`
      UPDATE user_limits SET pending_amount_usdt = '0' WHERE pending_amount_usdt IS NULL
    `);
    await db.execute(sql`
      ALTER TABLE user_limits
        ALTER COLUMN pending_amount_usdt SET DEFAULT '0',
        ALTER COLUMN pending_amount_usdt SET NOT NULL
    `);
    logger.info("DB migration v9 applied (user_limits.pending_amount_usdt NOT NULL DEFAULT 0)");
  } catch (err) {
    logger.warn({ err }, "Migration v9 skipped");
  }

  // v10: promotions engine — new columns + promotion_requirements table
  try {
    await db.execute(sql`
      ALTER TABLE promotions
        ADD COLUMN IF NOT EXISTS reward_type         TEXT NOT NULL DEFAULT 'flat_bonus',
        ADD COLUMN IF NOT EXISTS pool_amount         NUMERIC(20,8),
        ADD COLUMN IF NOT EXISTS wagering_requirement NUMERIC(5,2) NOT NULL DEFAULT '1',
        ADD COLUMN IF NOT EXISTS banner_color        TEXT NOT NULL DEFAULT '#00DFA9'
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS promotion_requirements (
        id           SERIAL PRIMARY KEY,
        promotion_id INTEGER NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
        task_type    TEXT NOT NULL,
        target_value NUMERIC(20,8) NOT NULL,
        description  TEXT NOT NULL,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("DB migration v10 applied (promotions: reward_type, pool_amount, wagering_requirement, banner_color; promotion_requirements table)");
  } catch (err) {
    logger.warn({ err }, "Migration v10 skipped");
  }

  // v11: wallets.bonus_balance_usdt — non-withdrawable bonus balance
  try {
    await db.execute(sql`
      ALTER TABLE wallets
        ADD COLUMN IF NOT EXISTS bonus_balance_usdt NUMERIC(20,8) NOT NULL DEFAULT '0'
    `);
    logger.info("DB migration v11 applied (wallets.bonus_balance_usdt)");
  } catch (err) {
    logger.warn({ err }, "Migration v11 skipped");
  }

  // v12: unique partial index — one welcome bonus per user
  try {
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_welcome_bonus
        ON transactions (user_id)
        WHERE type = 'bonus' AND reference = 'welcome_bonus'
    `);
    logger.info("DB migration v12 applied (unique index: one welcome bonus per user)");
  } catch (err) {
    logger.warn({ err }, "Migration v12 skipped");
  }

  // v13: users.wallet_network — chain/network name captured on wallet connect
  try {
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_network TEXT
    `);
    logger.info("DB migration v13 applied (users.wallet_network)");
  } catch (err) {
    logger.warn({ err }, "Migration v13 skipped");
  }

  // v14: plisio payment gateway columns on transactions
  try {
    await db.execute(sql`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS plisio_payment_id TEXT,
        ADD COLUMN IF NOT EXISTS plisio_status TEXT
    `);
    logger.info("DB migration v14 applied (transactions.plisio_payment_id, plisio_status)");
  } catch (err) {
    logger.warn({ err }, "Migration v14 skipped");
  }

  // v15: odds_cache — PostgreSQL-backed pre-match odds cache (survives restarts)
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS odds_cache (
        sport_key  TEXT PRIMARY KEY,
        data       JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    logger.info("DB migration v15 applied (odds_cache table)");
  } catch (err) {
    logger.warn({ err }, "Migration v15 skipped");
  }

  // v16: unique index on market_liability — required for ON CONFLICT upsert in bet placement
  // The CREATE TABLE IF NOT EXISTS in v7 included UNIQUE(...) but was a no-op on DBs where
  // the table already existed, so the constraint was never actually created.
  try {
    await db.execute(sql`
      DELETE FROM market_liability ml
      WHERE id NOT IN (
        SELECT MIN(id) FROM market_liability
        GROUP BY event_id, market_type, selection
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_market_liability_conflict
        ON market_liability (event_id, market_type, selection)
    `);
    logger.info("DB migration v16 applied (market_liability unique index for ON CONFLICT upsert)");
  } catch (err) {
    logger.warn({ err }, "Migration v16 skipped");
  }

  // v17: test balance — credit 200,000 USDT to the primary test wallet if not already done.
  // Idempotent: guarded by the 'test_balance_v17' transaction reference.
  try {
    await db.execute(sql`
      DO $$
      DECLARE
        v_user_id INTEGER;
      BEGIN
        SELECT id INTO v_user_id
        FROM users
        WHERE wallet_address = '0x65c5dff769f01246bbfe30ee2b28715a6bac6543'
        LIMIT 1;

        IF v_user_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM transactions
          WHERE user_id = v_user_id AND reference = 'test_balance_v17'
        ) THEN
          UPDATE wallets
            SET balance_usdt = balance_usdt + 200000
          WHERE user_id = v_user_id;

          INSERT INTO transactions (user_id, type, amount, status, reference, notes, verified)
          VALUES (v_user_id, 'credit', '200000.00', 'completed', 'test_balance_v17', 'Test balance credit', true);
        END IF;
      END $$
    `);
    logger.info("DB migration v17 applied (test balance credit for primary test wallet)");
  } catch (err) {
    logger.warn({ err }, "Migration v17 skipped");
  }

  // v18: betsapi_cache — BetsAPI (Bet365) pre-match events cache
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS betsapi_cache (
        cache_key  TEXT PRIMARY KEY,
        data       JSONB NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    logger.info("DB migration v18 applied (betsapi_cache table)");
  } catch (err) {
    logger.warn({ err }, "Migration v18 skipped");
  }
}

runMigrations().then(() => {
  // ── Auto-settlement cron: every 1 minute ──────────────────────────────────
  cron.schedule("*/1 * * * *", () => {
    runSettlementWorker().catch((err) =>
      logger.error({ err }, "Settlement cron: unhandled error"),
    );
  });
  logger.info("Auto-settlement cron started (every 1 minute — dual source: Odds API + API-Football)");

  // ── Odds refresh cron: every 5 min, triggers full batch every 25-35 min ──
  let isOddsRefreshing = false;
  // Start lastOddsRefreshAt at 0 so the startup batch (below) counts as first run
  let lastOddsRefreshAt = 0;
  let nextIntervalMs = (25 + Math.floor(Math.random() * 11)) * 60 * 1000;

  async function runOddsBatch() {
    if (isOddsRefreshing) return;
    isOddsRefreshing = true;
    nextIntervalMs = (25 + Math.floor(Math.random() * 11)) * 60 * 1000;
    logger.info({ sportCount: ALL_ODDS_SPORT_KEYS.length, nextIntervalMin: Math.round(nextIntervalMs / 60000) }, "Odds refresh cron: starting full batch");
    try {
      for (const sportKey of ALL_ODDS_SPORT_KEYS) {
        await fetchAndCacheOdds(sportKey);
        // 300ms gap between requests to avoid rate-limit bursts
        await new Promise(r => setTimeout(r, 300));
      }
      lastOddsRefreshAt = Date.now();
      logger.info({ sportCount: ALL_ODDS_SPORT_KEYS.length }, "Odds refresh cron: batch complete");
    } catch (err) {
      logger.error({ err }, "Odds refresh cron: unhandled error");
    } finally {
      isOddsRefreshing = false;
    }
  }

  cron.schedule("*/5 * * * *", async () => {
    const now = Date.now();
    if (now - lastOddsRefreshAt < nextIntervalMs) return;
    runOddsBatch().catch((err) => logger.error({ err }, "Odds refresh cron: unhandled error"));
  });
  logger.info({ sportCount: ALL_ODDS_SPORT_KEYS.length }, "Odds refresh cron started (every 25-35 minutes — PostgreSQL-backed cache)");

  // ── Warm the cache immediately on startup (non-blocking) ─────────────────
  // This ensures new sport keys get cached right away rather than waiting
  // up to 5 min for the first cron tick.
  setImmediate(() => {
    runOddsBatch().catch((err) => logger.error({ err }, "Startup odds warm: unhandled error"));
  });

  // ── BetsAPI cron: refresh upcoming events every 30 minutes ───────────────
  let isBetsApiRefreshing = false;
  let lastBetsApiRefreshAt = 0;
  const BETSAPI_INTERVAL_MS = 30 * 60 * 1000;

  /**
   * Fetch all pages for every sport (up to 6 pages = 300 events per sport),
   * enrich the top 20 events per sport with real prematch odds from BetsAPI,
   * then upsert into betsapi_cache with a 40-minute TTL.
   *
   * Horse Racing (2) and Greyhounds (4) are fetched for sidebar counts but
   * we skip prematch odds enrichment for them (countOnly).
   */
  async function runBetsApiBatch() {
    if (!BETSAPI_KEY || isBetsApiRefreshing) return;
    isBetsApiRefreshing = true;
    logger.info({ sportCount: BETSAPI_SPORT_IDS.length }, "BetsAPI cron: starting batch");
    try {
      for (const sportId of BETSAPI_SPORT_IDS) {
        const meta = BETSAPI_SPORT_MAP[sportId];
        if (!meta) continue;

        // Paginate: up to 6 pages (300 events) per sport
        const events = await fetchBetsApiUpcoming(sportId);
        if (events.length === 0) {
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        // For non-countOnly sports: enrich ALL events with real prematch odds.
        // Batch in groups of 10 to avoid rate-limit bursts; 200ms between batches.
        if (!meta.countOnly) {
          for (let i = 0; i < events.length; i += 10) {
            const batch = events.slice(i, i + 10);
            await Promise.all(
              batch.map(async (ev) => {
                try {
                  const odds = await fetchPrematchOdds(ev.id, meta.hasDraw);
                  if (odds) ev.prematchOdds = odds;
                } catch { /* leave prematchOdds undefined */ }
              })
            );
            if (i + 10 < events.length) await new Promise(r => setTimeout(r, 200));
          }
        }

        await db.execute(sql`
          INSERT INTO betsapi_cache (cache_key, data, fetched_at, expires_at)
          VALUES (${String(sportId)}, ${JSON.stringify(events)}::jsonb, NOW(), NOW() + INTERVAL '40 minutes')
          ON CONFLICT (cache_key) DO UPDATE SET
            data       = EXCLUDED.data,
            fetched_at = NOW(),
            expires_at = NOW() + INTERVAL '40 minutes'
        `);

        logger.info({ sportId, name: meta.name, count: events.length }, "BetsAPI cron: sport cached");

        // 400ms gap between sports to avoid burst rate-limits
        await new Promise(r => setTimeout(r, 400));
      }
      lastBetsApiRefreshAt = Date.now();
      logger.info({ sportCount: BETSAPI_SPORT_IDS.length }, "BetsAPI cron: batch complete");
    } catch (err) {
      logger.error({ err }, "BetsAPI cron: unhandled error");
    } finally {
      isBetsApiRefreshing = false;
    }
  }

  // BetsAPI cron: poll every 5 min, trigger batch if ≥30 min since last run.
  // Stagger: only fires if Odds API batch completed ≥2 min ago (avoids simultaneous load).
  cron.schedule("*/5 * * * *", async () => {
    const now = Date.now();
    if (now - lastBetsApiRefreshAt < BETSAPI_INTERVAL_MS) return;
    // Stagger: require Odds batch to have finished at least 2 minutes ago
    const oddsBatchAge = now - lastOddsRefreshAt;
    if (isOddsRefreshing || oddsBatchAge < 2 * 60 * 1000) return;
    runBetsApiBatch().catch((err) => logger.error({ err }, "BetsAPI cron: unhandled error"));
  });
  logger.info("BetsAPI cron started (every 30 minutes — staggered 2 min after Odds API batch)");

  // Warm BetsAPI cache on startup — 2-minute delay after Odds API warm starts
  setTimeout(() => {
    runBetsApiBatch().catch((err) => logger.error({ err }, "Startup BetsAPI warm: unhandled error"));
  }, 2 * 60 * 1000);

  app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, "CupBett API server started");
  });
});
