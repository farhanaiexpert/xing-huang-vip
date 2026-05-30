import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import cron from "node-cron";
import { runSettlementWorker } from "./lib/settlementWorker.js";

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
}

runMigrations().then(() => {
  // ── Auto-settlement cron: every 1 minute ──────────────────────────────────
  cron.schedule("*/1 * * * *", () => {
    runSettlementWorker().catch((err) =>
      logger.error({ err }, "Settlement cron: unhandled error"),
    );
  });
  logger.info("Auto-settlement cron started (every 1 minute — dual source: Odds API + API-Football)");

  app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, "CupBett API server started");
  });
});
