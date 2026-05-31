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
  reference: text("reference"),
  notes: text("notes"),
  txHash: text("tx_hash"),
  network: text("network").default("TRC-20"),
  walletAddress: text("wallet_address"),
  verified: boolean("verified").default(false),
  verificationNote: text("verification_note"),
  nowpaymentsPaymentId: text("nowpayments_payment_id"),
  nowpaymentsStatus: text("nowpayments_status"),
  plisioPaymentId: text("plisio_payment_id"),
  plisioStatus: text("plisio_status"),
  cryptomusUuid: text("cryptomus_uuid"),
  cryptomusStatus: text("cryptomus_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true, createdAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
