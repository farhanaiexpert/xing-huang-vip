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
}

runMigrations().then(() => {
  // ── Auto-settlement cron: every 5 minutes ─────────────────────────────────
  cron.schedule("*/5 * * * *", () => {
    runSettlementWorker().catch((err) =>
      logger.error({ err }, "Settlement cron: unhandled error"),
    );
  });
  logger.info("Auto-settlement cron started (every 5 minutes)");

  app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, "CupBett API server started");
  });
});
