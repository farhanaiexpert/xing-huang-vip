import { pgTable, serial, integer, numeric, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  referredId: integer("referred_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  tier: integer("tier").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  referrerReferredUniq: unique("referrals_referrer_referred_uniq").on(table.referrerId, table.referredId),
}));

export const commissionsTable = pgTable("commissions", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").notNull().references(() => referralsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  status: text("status").notNull().default("pending"),
  tier: integer("tier").notNull().default(1),
  sourceTransactionId: integer("source_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  referralSourceUniq: unique("commissions_referral_source_uniq").on(table.referralId, table.sourceTransactionId),
}));

export const insertReferralSchema = createInsertSchema(referralsTable).omit({ id: true, createdAt: true });
export const insertCommissionSchema = createInsertSchema(commissionsTable).omit({ id: true, createdAt: true });
export type Referral = typeof referralsTable.$inferSelect;
export type Commission = typeof commissionsTable.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
