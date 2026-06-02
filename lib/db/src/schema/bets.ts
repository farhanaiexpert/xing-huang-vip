import { pgTable, serial, integer, numeric, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const betsTable = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("single"),
  stake: numeric("stake", { precision: 20, scale: 8 }).notNull(),
  totalOdds: numeric("total_odds", { precision: 10, scale: 4 }).notNull(),
  potentialReturn: numeric("potential_return", { precision: 20, scale: 8 }).notNull(),
  status: text("status").notNull().default("open"),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  settledPayout: numeric("settled_payout", { precision: 20, scale: 8 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const betSelectionsTable = pgTable("bet_selections", {
  id: serial("id").primaryKey(),
  betId: integer("bet_id").notNull().references(() => betsTable.id, { onDelete: "cascade" }),
  eventId: text("event_id").notNull(),
  eventName: text("event_name").notNull(),
  sport: text("sport").notNull().default(""),
  marketType: text("market_type").notNull(),
  selection: text("selection").notNull(),
  odds: numeric("odds", { precision: 10, scale: 4 }).notNull(),
  status: text("status").notNull().default("open"),
  isLive: boolean("is_live").notNull().default(false),
  scoreAtPlacement: text("score_at_placement"),
  commenceTime: timestamp("commence_time", { withTimezone: true }).notNull().defaultNow(),
  homeTeam: text("home_team").notNull().default(""),
  awayTeam: text("away_team").notNull().default(""),
  sportKey: text("sport_key").notNull().default(""),
  point: numeric("point", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBetSchema = createInsertSchema(betsTable).omit({
  id: true, createdAt: true, settledAt: true,
});
export const insertBetSelectionSchema = createInsertSchema(betSelectionsTable).omit({
  id: true, createdAt: true,
});
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof betsTable.$inferSelect;
export type BetSelection = typeof betSelectionsTable.$inferSelect;
