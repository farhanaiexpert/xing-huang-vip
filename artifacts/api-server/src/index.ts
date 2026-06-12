import "./env.js"; // must be first — loads .env before any module reads process.env
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import cron from "node-cron";
import { runSettlementWorker } from "./lib/settlementWorker.js";
import { fetchAndCacheOdds, getDbCacheRemainingMs, ALL_ODDS_SPORT_KEYS } from "./routes/odds.js";
import { fetchBetsApiUpcoming, fetchPrematchData, BETSAPI_SPORT_IDS, BETSAPI_SPORT_MAP, BETSAPI_KEY } from "./lib/betsapi.js";

// ── Global process error handlers ─────────────────────────────────────────────
// Must be registered before any async work so nothing slips through unnoticed.
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — shutting down");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

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

  // v19: backfill settled_payout NULL → '0' for historical bets settled before
  // migration v5 added the column (those rows received no default at the time).
  try {
    await db.execute(sql`
      UPDATE bets SET settled_payout = '0' WHERE settled_payout IS NULL
    `);
    logger.info("DB migration v19 applied (backfill settled_payout NULL → 0)");
  } catch (err) {
    logger.warn({ err }, "Migration v19 skipped");
  }

  // v21: unique partial index on transactions.tx_hash — prevents double-credit from
  // concurrent duplicate submissions (TOCTOU race between SELECT check and INSERT).
  // Partial (WHERE tx_hash IS NOT NULL) so NOWPayments / Cryptomus rows (null tx_hash) are unaffected.
  try {
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_tx_hash
        ON transactions (tx_hash)
        WHERE tx_hash IS NOT NULL
    `);
    logger.info("DB migration v21 applied (unique partial index on transactions.tx_hash)");
  } catch (err) {
    logger.warn({ err }, "Migration v21 skipped");
  }

  // v20: repair bets 14 and 16 — incorrectly marked 'won' by a previous buggy
  // settlement run; all their selections are 'void' so the correct outcome is
  // void (stake refunded).  Idempotent: guarded by checking current status.
  try {
    await db.execute(sql`
      DO $$
      DECLARE
        v_user_id INTEGER;
        v_stake   NUMERIC;
        v_bet_id  INTEGER;
      BEGIN
        FOR v_bet_id IN SELECT unnest(ARRAY[14, 16]) LOOP
          SELECT user_id, stake INTO v_user_id, v_stake
            FROM bets WHERE id = v_bet_id AND status = 'won' AND settled_payout = '0';

          IF FOUND THEN
            -- Correct the bet status
            UPDATE bets
               SET status = 'void', settled_payout = v_stake
             WHERE id = v_bet_id;

            -- Refund transaction (idempotent: skip if already exists)
            IF NOT EXISTS (
              SELECT 1 FROM transactions
               WHERE user_id = v_user_id
                 AND notes = 'Bet #' || v_bet_id || ' corrected void — stake refunded'
            ) THEN
              INSERT INTO transactions (user_id, type, amount, status, notes)
              VALUES (v_user_id, 'refund', v_stake, 'completed',
                      'Bet #' || v_bet_id || ' corrected void — stake refunded');

              UPDATE wallets
                 SET balance_usdt = balance_usdt + v_stake
               WHERE user_id = v_user_id;
            END IF;
          END IF;
        END LOOP;
      END $$
    `);
    logger.info("DB migration v20 applied (repair bets 14 and 16 — void + stake refunded)");
  } catch (err) {
    logger.warn({ err }, "Migration v20 skipped");
  }

  // v22: promo-claim idempotency — DB-level guards so concurrent/duplicate claim
  // attempts can never double-credit a user's bonus balance.
  try {
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_claims_user_promo
        ON promotion_claims (promotion_id, user_id)
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_promo_bonus_ref
        ON transactions (user_id, reference)
        WHERE type = 'bonus' AND reference LIKE 'promo_%'
    `);
    logger.info("DB migration v22 applied (promo claim unique indexes)");
  } catch (err) {
    logger.warn({ err }, "Migration v22 skipped");
  }

  try {
    await db.execute(sql`
      ALTER TABLE bet_selections
        ADD COLUMN IF NOT EXISTS commence_time  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS home_team      TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS away_team      TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS sport_key      TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS point          NUMERIC(10, 4)
    `);
    logger.info("DB migration v23 applied (bet_selections: commence_time, home_team, away_team, sport_key, point)");
  } catch (err) {
    logger.warn({ err }, "Migration v23 skipped");
  }

  try {
    // Backfill existing NULL commence_time rows with created_at as a proxy
    await db.execute(sql`
      UPDATE bet_selections SET commence_time = created_at WHERE commence_time IS NULL
    `);
    // Now apply NOT NULL + DEFAULT NOW() constraint
    await db.execute(sql`
      ALTER TABLE bet_selections
        ALTER COLUMN commence_time SET DEFAULT NOW(),
        ALTER COLUMN commence_time SET NOT NULL
    `);
    logger.info("DB migration v24 applied (bet_selections.commence_time NOT NULL DEFAULT NOW(), backfilled from created_at)");
  } catch (err) {
    logger.warn({ err }, "Migration v24 skipped");
  }

  try {
    await db.execute(sql`
      ALTER TABLE settlement_log ADD COLUMN IF NOT EXISTS commence_time TIMESTAMPTZ
    `);
    logger.info("DB migration v25 applied (settlement_log.commence_time)");
  } catch (err) {
    logger.warn({ err }, "Migration v25 skipped");
  }

  // v26: commissions.tier — track which tier (1/2/3) each commission belongs to
  try {
    await db.execute(sql`
      ALTER TABLE commissions ADD COLUMN IF NOT EXISTS tier integer NOT NULL DEFAULT 1
    `);
    logger.info("DB migration v26 applied (commissions.tier)");
  } catch (err) {
    logger.warn({ err }, "Migration v26 skipped");
  }

  // v27: referrals — replace per-user unique on referred_id with composite unique
  //       on (referrer_id, referred_id) to allow multi-tier rows per referred user;
  //       also add commissions idempotency index.
  try {
    await db.execute(sql`
      ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referred_id_unique
    `);
    await db.execute(sql`
      DROP INDEX IF EXISTS referrals_referred_id_unique
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS referrals_referrer_referred_uniq
        ON referrals (referrer_id, referred_id)
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS commissions_referral_source_uniq
        ON commissions (referral_id, source_transaction_id)
        WHERE source_transaction_id IS NOT NULL
    `);
    logger.info("DB migration v27 applied (referrals composite unique + commissions idempotency index)");
  } catch (err) {
    logger.warn({ err }, "Migration v27 skipped");
  }

  // v28: performance indexes on high-traffic columns.
  // Every authenticated request hits sessions(user_id); every bet page hits
  // bets(user_id) and transactions(user_id); settlement cron hits bets(status)
  // and bet_selections(event_id). Without these, queries do full table scans.
  try {
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_bets_user_id          ON bets          (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_bets_status            ON bets          (status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_bets_created_at        ON bets          (created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON transactions  (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transactions_status    ON transactions  (status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_bet_selections_bet_id  ON bet_selections (bet_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_bet_selections_event_id ON bet_selections (event_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id       ON sessions      (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_commissions_user_id    ON commissions   (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_commissions_status     ON commissions   (status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_settlement_log_event_id ON settlement_log (event_id)`);
    logger.info("DB migration v28 applied (performance indexes on user_id, status, created_at, event_id)");
  } catch (err) {
    logger.warn({ err }, "Migration v28 skipped");
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS risk_flags (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type         TEXT NOT NULL,
        detail       TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_risk_flags_user_id      ON risk_flags (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_risk_flags_user_type     ON risk_flags (user_id, type)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_risk_flags_created_at    ON risk_flags (created_at)`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip TEXT`);
    await db.execute(sql`
      INSERT INTO platform_settings (key, value, description)
      VALUES
        ('max_win_per_day',             '10000', 'Maximum winnable USDT per user per day (0 = disabled)'),
        ('bet_velocity_limit',          '20',    'Maximum bets per user in the velocity window before flagging'),
        ('bet_velocity_window_minutes', '5',     'Sliding window in minutes for bet velocity check')
      ON CONFLICT (key) DO NOTHING
    `);
    logger.info("DB migration v29 applied (risk_flags table + users.registration_ip + risk platform_settings seed)");
  } catch (err) {
    logger.warn({ err }, "Migration v29 skipped");
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_usage_daily (
        id          SERIAL PRIMARY KEY,
        provider    TEXT NOT NULL,
        day         DATE NOT NULL,
        calls       INTEGER NOT NULL DEFAULT 0,
        errors      INTEGER NOT NULL DEFAULT 0,
        last_status TEXT,
        last_error  TEXT,
        last_at     TIMESTAMPTZ
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_daily_provider_day ON api_usage_daily (provider, day)`);
    logger.info("DB migration v30 applied (api_usage_daily table)");
  } catch (err) {
    logger.warn({ err }, "Migration v30 skipped");
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_usage_hourly (
        provider TEXT        NOT NULL,
        hour     TIMESTAMPTZ NOT NULL,
        calls    INTEGER     NOT NULL DEFAULT 0,
        PRIMARY KEY (provider, hour)
      )
    `);
    logger.info("DB migration v31 applied (api_usage_hourly table — BetsAPI hourly credit cap)");
  } catch (err) {
    logger.warn({ err }, "Migration v31 skipped");
  }

  try {
    await db.execute(sql`
      ALTER TABLE price_boosts
        ADD COLUMN IF NOT EXISTS home_team     TEXT        NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS away_team     TEXT        NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS commence_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS sport_key     TEXT        NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS usage_count   INTEGER     NOT NULL DEFAULT 0
    `);
    logger.info("DB migration v32 applied (price_boosts: home_team, away_team, commence_time, sport_key, usage_count)");
  } catch (err) {
    logger.warn({ err }, "Migration v32 skipped");
  }
}

runMigrations().then(() => {
  // ── Auto-settlement cron: every 5 minutes (reduced from 1 min to save score-check credits)
  cron.schedule("*/5 * * * *", () => {
    runSettlementWorker().catch((err) =>
      logger.error({ err }, "Settlement cron: unhandled error"),
    );
  });
  logger.info("Auto-settlement cron started (every 5 minutes — Odds API, ID-first matching)");

  // ── Odds refresh cron: every 5 min check, batch fires every 55-65 min ───
  // Optimisations (June 2026):
  //  1. Skip sports whose DB cache still has >20 min of life (avoids redundant calls).
  //  2. Empty sports (0 events) with no recent bets → extend 6h TTL without API call.
  //  3. Active-sport TTL lowered to 60 min; batch interval 55-65 min matches.
  //  4. Single EU region + totals for all sports (spreads where supported) — free extra data.
  let isOddsRefreshing = false;
  let lastOddsRefreshAt = 0;
  let nextIntervalMs = (55 + Math.floor(Math.random() * 11)) * 60 * 1000; // 55-65 min

  /** Returns the event count of the current odds_cache row for a sport (-1 = no row). */
  async function getOddsCachedEventCount(sportKey: string): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT jsonb_array_length(data) AS cnt FROM odds_cache WHERE sport_key = ${sportKey}
      `);
      return result.rows.length > 0 ? Number(result.rows[0].cnt) : -1;
    } catch { return -1; }
  }

  /** True if any bet_selection exists for this sport in the last 7 days. */
  async function sportHasRecentBets(sportKey: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT 1 FROM bet_selections
        WHERE sport_key = ${sportKey}
          AND created_at > NOW() - INTERVAL '7 days'
        LIMIT 1
      `);
      return result.rows.length > 0;
    } catch { return true; } // fail-open: assume bets exist on DB error
  }

  async function runOddsBatch() {
    if (isOddsRefreshing) return;
    isOddsRefreshing = true;
    nextIntervalMs = (55 + Math.floor(Math.random() * 11)) * 60 * 1000;
    logger.info({ sportCount: ALL_ODDS_SPORT_KEYS.length, nextIntervalMin: Math.round(nextIntervalMs / 60000) }, "Odds refresh cron: starting batch");
    let fetched = 0, skipped = 0, empty = 0, quotaHalt = false;
    try {
      for (const sportKey of ALL_ODDS_SPORT_KEYS) {
        // Skip if the existing cache entry still has >20 min remaining.
        const remainingMs = await getDbCacheRemainingMs(sportKey);
        if (remainingMs > 20 * 60 * 1000) { skipped++; continue; }

        // Skip off-season sports: if the last cached result was empty AND no user
        // has bet on this sport in the last 7 days, extend the empty TTL by 6h
        // without spending an API credit.
        const cachedCount = await getOddsCachedEventCount(sportKey);
        if (cachedCount === 0) {
          const hasBets = await sportHasRecentBets(sportKey);
          if (!hasBets) {
            await db.execute(sql`
              UPDATE odds_cache SET expires_at = NOW() + INTERVAL '6 hours'
              WHERE sport_key = ${sportKey}
            `);
            skipped++;
            continue;
          }
        }

        const count = await fetchAndCacheOdds(sportKey);

        // -1 means the Odds API returned 429 (quota exhausted).
        // Stop the batch immediately — don't burn any remaining credits.
        // Existing DB cache keeps serving stale-but-present odds until quota resets.
        if (count === -1) {
          quotaHalt = true;
          nextIntervalMs = 15 * 60 * 1000; // 15-min cooldown before retrying
          logger.error({ fetched, skipped, empty, cooldownMin: 15 }, "Odds cron: 429 quota exhausted — batch halted, 15-min cooldown");
          break;
        }

        if (count === 0) empty++; else fetched++;

        // 300ms gap between requests to avoid rate-limit bursts
        await new Promise(r => setTimeout(r, 300));
      }
      lastOddsRefreshAt = Date.now();
      if (!quotaHalt) {
        logger.info({ fetched, skipped, empty }, "Odds refresh cron: batch complete");
      }
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
  logger.info({ sportCount: ALL_ODDS_SPORT_KEYS.length }, "Odds refresh cron started (every 55-65 minutes — totals for all sports, 1h active TTL, 6h empty TTL, smart skip)");

  // ── Warm the cache immediately on startup (non-blocking) ─────────────────
  setImmediate(() => {
    runOddsBatch().catch((err) => logger.error({ err }, "Startup odds warm: unhandled error"));
  });

  // ── BetsAPI cron: refresh upcoming events every 60 minutes ───────────────
  // Optimisations vs old 30 min cycle:
  //  1. Check betsapi_cache TTL before fetching each sport — skip if still fresh (>15 min).
  //  2. Empty sports cached with 4-hour TTL instead of being skipped silently.
  //  3. Prematch odds enrichment reduced from top-50 to top-20 events per sport.
  //  4. Interval doubled from 30 → 60 min.
  let isBetsApiRefreshing = false;
  let lastBetsApiRefreshAt = 0;
  const BETSAPI_INTERVAL_MS = 30 * 60 * 1000; // 30 min — 2 batches/hr for fresher odds

  // How long cached events persist in the DB as a fallback (Option A: 12h).
  // Decoupled from refresh frequency — we still re-fetch every ~60 min via the
  // age-based skip guard below, but if a refresh cycle fails the data survives
  // for 12 h instead of disappearing after 70 min.
  const BETSAPI_DATA_TTL = '12 hours';

  /** Returns milliseconds since a betsapi_cache entry was last fetched (Infinity = missing). */
  async function getBetsApiCacheAgeMs(cacheKey: string): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT EXTRACT(EPOCH FROM (NOW() - fetched_at)) * 1000 AS age_ms
        FROM betsapi_cache WHERE cache_key = ${cacheKey}
      `);
      if (result.rows.length > 0) return Math.max(0, Number(result.rows[0].age_ms));
      return Infinity;
    } catch { return Infinity; }
  }

  async function runBetsApiBatch() {
    if (!BETSAPI_KEY || isBetsApiRefreshing) return;
    isBetsApiRefreshing = true;
    logger.info({ sportCount: BETSAPI_SPORT_IDS.length }, "BetsAPI cron: starting batch");
    let fetched = 0, skipped = 0, empty = 0;
    try {
      for (const sportId of BETSAPI_SPORT_IDS) {
        const meta = BETSAPI_SPORT_MAP[sportId];
        if (!meta) continue;

        // Skip if this sport was fetched less than 25 min ago.
        // Uses fetched_at age (not expires_at) so the refresh frequency is
        // independent of the 12-hour data-persistence TTL.
        const age = await getBetsApiCacheAgeMs(String(sportId));
        if (age < 25 * 60 * 1000) { skipped++; continue; }

        const events = await fetchBetsApiUpcoming(sportId);

        if (events === null) {
          // Recoverable error (401/403 bad token, or 429 / out of request volume) —
          // Reschedule retry in 15 min but DO NOT overwrite the existing cached events.
          // This ensures stale-but-real match data keeps showing until a successful
          // fetch brings in fresh events (credits restored / key fixed).
          // If no row exists yet, insert with [] so the row is created for future retries.
          await db.execute(sql`
            INSERT INTO betsapi_cache (cache_key, data, fetched_at, expires_at)
            VALUES (${String(sportId)}, '[]'::jsonb, NOW(), NOW() + INTERVAL '15 minutes')
            ON CONFLICT (cache_key) DO UPDATE SET
              expires_at = NOW() + INTERVAL '15 minutes'
          `);
          empty++;
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        if (events.length === 0) {
          // Option B: API returned empty list (off-season / no fixtures scheduled).
          // DO NOT overwrite existing cached events with []. Instead, keep whatever
          // data is already there and only extend the TTL. Only write [] when no
          // row exists yet (first-time insert). This prevents "matches disappeared"
          // when BetsAPI temporarily has nothing scheduled for a sport.
          await db.execute(sql`
            INSERT INTO betsapi_cache (cache_key, data, fetched_at, expires_at)
            VALUES (${String(sportId)}, '[]'::jsonb, NOW(), NOW() + INTERVAL '4 hours')
            ON CONFLICT (cache_key) DO UPDATE SET
              data       = CASE
                             WHEN jsonb_array_length(betsapi_cache.data) > 0
                             THEN betsapi_cache.data
                             ELSE '[]'::jsonb
                           END,
              fetched_at = NOW(),
              expires_at = NOW() + INTERVAL '4 hours'
          `);
          empty++;
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        // Enrich top 30 events with real prematch odds + rich market flags.
        // Uses fetchPrematchData which parses ALL market types from the same API call — no extra credits.
        if (!meta.countOnly) {
          const toEnrich = events.slice(0, 30);
          for (let i = 0; i < toEnrich.length; i += 10) {
            const batch = toEnrich.slice(i, i + 10);
            await Promise.all(
              batch.map(async (ev) => {
                try {
                  const { odds, richMarkets } = await fetchPrematchData(ev.id, meta.hasDraw);
                  if (odds) ev.prematchOdds = odds;
                  if (richMarkets.marketScore > 0) ev.richMarkets = richMarkets;
                } catch { /* leave prematchOdds/richMarkets undefined — frontend uses fallback */ }
              })
            );
            if (i + 10 < toEnrich.length) await new Promise(r => setTimeout(r, 200));
          }
        }

        await db.execute(sql`
          INSERT INTO betsapi_cache (cache_key, data, fetched_at, expires_at)
          VALUES (${String(sportId)}, ${JSON.stringify(events)}::jsonb, NOW(), NOW() + INTERVAL '${sql.raw(BETSAPI_DATA_TTL)}')
          ON CONFLICT (cache_key) DO UPDATE SET
            data       = EXCLUDED.data,
            fetched_at = NOW(),
            expires_at = NOW() + INTERVAL '${sql.raw(BETSAPI_DATA_TTL)}'
        `);

        logger.info({ sportId, name: meta.name, count: events.length }, "BetsAPI cron: sport cached");
        fetched++;

        // 400ms gap between sports to avoid burst rate-limits
        await new Promise(r => setTimeout(r, 400));
      }
      lastBetsApiRefreshAt = Date.now();
      logger.info({ fetched, skipped, empty }, "BetsAPI cron: batch complete");
    } catch (err) {
      logger.error({ err }, "BetsAPI cron: unhandled error");
    } finally {
      isBetsApiRefreshing = false;
    }
  }

  // BetsAPI cron: poll every 5 min, trigger batch if ≥60 min since last run.
  // Stagger: only fires if Odds API batch completed ≥2 min ago.
  // NOTE: gated behind BETSAPI_CRON_DISABLED to conserve limited trial request
  // volume while validating Bet365 market coverage. Set BETSAPI_CRON_DISABLED=1
  // to disable both the periodic batch and the startup warm.
  if (process.env.BETSAPI_CRON_DISABLED === "1") {
    logger.warn("BetsAPI cron DISABLED (BETSAPI_CRON_DISABLED=1) — no automatic upcoming/prematch fetches");
  } else {
    cron.schedule("*/5 * * * *", async () => {
      const now = Date.now();
      if (now - lastBetsApiRefreshAt < BETSAPI_INTERVAL_MS) return;
      const oddsBatchAge = now - lastOddsRefreshAt;
      if (isOddsRefreshing || oddsBatchAge < 2 * 60 * 1000) return;
      runBetsApiBatch().catch((err) => logger.error({ err }, "BetsAPI cron: unhandled error"));
    });
    logger.info("BetsAPI cron started (every 30 minutes — age-based skip, 12h data TTL, top-30 enrichment, empty preserves existing)");

    // Warm BetsAPI cache on startup — 2-minute delay after Odds API warm starts
    setTimeout(() => {
      runBetsApiBatch().catch((err) => logger.error({ err }, "Startup BetsAPI warm: unhandled error"));
    }, 2 * 60 * 1000);
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, "Xing Huang API server started");
  });

  // ── Graceful shutdown on SIGTERM / SIGINT ──────────────────────────────────
  // Stops accepting new connections, waits up to 10 s for in-flight requests
  // to finish, then exits cleanly. Prevents mid-transaction kills on deploys.
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutdown signal received — draining connections");
    server.close(() => {
      logger.info("HTTP server closed — process exiting");
      process.exit(0);
    });
    // Force-exit if connections don't drain within 10 seconds
    setTimeout(() => {
      logger.warn("Forced exit after 10 s shutdown timeout");
      process.exit(1);
    }, 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
});
