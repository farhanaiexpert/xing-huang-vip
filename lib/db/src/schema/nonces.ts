import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const noncesTable = pgTable("nonces", {
  walletAddress: text("wallet_address").primaryKey(),
  nonce: text("nonce").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type Nonce = typeof noncesTable.$inferSelect;
