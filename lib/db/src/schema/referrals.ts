import { pgTable, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralCodesTable = pgTable("referral_codes", {
  code:      text("code").primaryKey(),
  userId:    text("user_id").notNull().unique().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const referralLinksTable = pgTable("referral_links", {
  id:           text("id").primaryKey(),
  referrerId:   text("referrer_id").notNull().references(() => usersTable.id),
  referredId:   text("referred_id").notNull().unique().references(() => usersTable.id),
  code:         text("code").notNull(),
  level:        integer("level").notNull().default(1),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const commissionSettingsTable = pgTable("commission_settings", {
  level:      integer("level").primaryKey(),
  rate:       numeric("rate", { precision: 5, scale: 4 }).notNull(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
  updatedBy:  text("updated_by").references(() => usersTable.id),
});

export const commissionsTable = pgTable("commissions", {
  id:           text("id").primaryKey(),
  earnerId:     text("earner_id").notNull().references(() => usersTable.id),
  sourceUserId: text("source_user_id").notNull().references(() => usersTable.id),
  betId:        text("bet_id").notNull(),
  level:        integer("level").notNull(),
  rate:         numeric("rate", { precision: 5, scale: 4 }).notNull(),
  amount:       numeric("amount", { precision: 18, scale: 8 }).notNull(),
  currency:     text("currency").notNull().default("USDT"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export type ReferralCode = typeof referralCodesTable.$inferSelect;
export type ReferralLink = typeof referralLinksTable.$inferSelect;
export type Commission   = typeof commissionsTable.$inferSelect;
