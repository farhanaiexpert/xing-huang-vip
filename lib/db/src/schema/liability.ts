import { pgTable, serial, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketLiabilityTable = pgTable("market_liability", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull(),
  eventName: text("event_name").notNull(),
  sport: text("sport").notNull().default(""),
  marketType: text("market_type").notNull(),
  selection: text("selection").notNull(),
  totalStake: numeric("total_stake", { precision: 20, scale: 8 }).notNull().default("0"),
  potentialPayout: numeric("potential_payout", { precision: 20, scale: 8 }).notNull().default("0"),
  betCount: integer("bet_count").notNull().default(0),
  isSuspended: boolean("is_suspended").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMarketLiabilitySchema = createInsertSchema(marketLiabilityTable).omit({ id: true, updatedAt: true });
export type MarketLiability = typeof marketLiabilityTable.$inferSelect;
export type InsertMarketLiability = z.infer<typeof insertMarketLiabilitySchema>;
