import { pgTable, serial, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sportControlsTable = pgTable("sport_controls", {
  id: serial("id").primaryKey(),
  sportKey: text("sport_key").notNull().unique(),
  leagueName: text("league_name").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  isSuspended: boolean("is_suspended").notNull().default(false),
  oddsMultiplier: numeric("odds_multiplier", { precision: 10, scale: 4 }).notNull().default("1.0000"),
  marginOverride: numeric("margin_override", { precision: 5, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSportControlSchema = createInsertSchema(sportControlsTable).omit({ id: true, updatedAt: true });
export type SportControl = typeof sportControlsTable.$inferSelect;
export type InsertSportControl = z.infer<typeof insertSportControlSchema>;
