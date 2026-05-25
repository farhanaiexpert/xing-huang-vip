import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const PORT = parseInt(process.env.PORT ?? "5000", 10);

async function runMigrations() {
  try {
    await db.execute(sql`
      ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS tx_hash text,
        ADD COLUMN IF NOT EXISTS network text DEFAULT 'TRC-20',
        ADD COLUMN IF NOT EXISTS wallet_address text
    `);
    logger.info("DB migrations applied");
  } catch (err) {
    logger.warn({ err }, "Migration step skipped (columns may already exist)");
  }
}

runMigrations().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, "CupBett API server started");
  });
});
