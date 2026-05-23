import { pgTable, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "deposit",
  "withdrawal",
  "bet_stake",
  "bet_win",
  "bet_refund",
  "commission",
  "adjustment",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
]);

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "approved",
  "rejected",
  "processed",
]);

export const userBalancesTable = pgTable("user_balances", {
  userId:    text("user_id").primaryKey().references(() => usersTable.id),
  available: numeric("available", { precision: 18, scale: 8 }).notNull().default("0"),
  locked:    numeric("locked",    { precision: 18, scale: 8 }).notNull().default("0"),
  currency:  text("currency").notNull().default("USDT"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull().references(() => usersTable.id),
  type:        transactionTypeEnum("type").notNull(),
  amount:      numeric("amount", { precision: 18, scale: 8 }).notNull(),
  currency:    text("currency").notNull().default("USDT"),
  status:      transactionStatusEnum("status").notNull().default("completed"),
  reference:   text("reference"),
  description: text("description"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id:            text("id").primaryKey(),
  userId:        text("user_id").notNull().references(() => usersTable.id),
  amount:        numeric("amount", { precision: 18, scale: 8 }).notNull(),
  walletAddress: text("wallet_address").notNull(),
  currency:      text("currency").notNull().default("USDT"),
  status:        withdrawalStatusEnum("status").notNull().default("pending"),
  note:          text("note"),
  reviewedBy:    text("reviewed_by").references(() => usersTable.id),
  reviewedAt:    timestamp("reviewed_at"),
  transactionId: text("transaction_id").references(() => transactionsTable.id),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

export type UserBalance         = typeof userBalancesTable.$inferSelect;
export type Transaction         = typeof transactionsTable.$inferSelect;
export type InsertTransaction   = typeof transactionsTable.$inferInsert;
export type WithdrawalRequest   = typeof withdrawalRequestsTable.$inferSelect;
export type InsertWithdrawalRequest = typeof withdrawalRequestsTable.$inferInsert;
