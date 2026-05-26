import { pgTable, serial, numeric, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const priceBoostsTable = pgTable("price_boosts", {
  id:            serial("id").primaryKey(),
  title:         text("title").notNull(),
  matchId:       text("match_id").notNull(),
  matchName:     text("match_name").notNull(),
  leagueName:    text("league_name").notNull().default(""),
  marketName:    text("market_name").notNull(),
  selectionName: text("selection_name").notNull(),
  originalOdds:  numeric("original_odds",  { precision: 10, scale: 4 }).notNull(),
  boostedOdds:   numeric("boosted_odds",   { precision: 10, scale: 4 }).notNull(),
  maxStake:      numeric("max_stake",      { precision: 20, scale: 8 }).notNull().default("0"),
  isActive:      boolean("is_active").notNull().default(true),
  expiresAt:     timestamp("expires_at",   { withTimezone: true }),
  createdAt:     timestamp("created_at",   { withTimezone: true }).notNull().defaultNow(),
  createdBy:     integer("created_by"),
});

export const insertPriceBoostSchema = createInsertSchema(priceBoostsTable).omit({ id: true, createdAt: true });
export type PriceBoost = typeof priceBoostsTable.$inferSelect;
export type InsertPriceBoost = z.infer<typeof insertPriceBoostSchema>;
