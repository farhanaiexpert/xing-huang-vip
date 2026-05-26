import { sql } from "drizzle-orm";
import { pgTable, serial, integer, numeric, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  status: text("status").notNull().default("pending"),
  reference: text("reference").default(sql`NULL`),
  notes: text("notes").default(sql`NULL`),
  txHash: text("tx_hash").default(sql`NULL`),
  network: text("network").default("TRC-20"),
  walletAddress: text("wallet_address").default(sql`NULL`),
  verified: boolean("verified").default(false),
  verificationNote: text("verification_note").default(sql`NULL`),
  nowpaymentsPaymentId: text("nowpayments_payment_id").default(sql`NULL`),
  nowpaymentsStatus: text("nowpayments_status").default(sql`NULL`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true, createdAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
