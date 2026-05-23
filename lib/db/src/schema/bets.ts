import { pgTable, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const betStatusEnum = pgEnum("bet_status", ["pending", "won", "lost", "void"]);

export const betsTable = pgTable("bets", {
  id:             text("id").primaryKey(),
  userId:         text("user_id").notNull().references(() => usersTable.id),
  stake:          numeric("stake", { precision: 18, scale: 8 }).notNull(),
  totalOdds:      numeric("total_odds", { precision: 10, scale: 4 }).notNull(),
  potentialReturn:numeric("potential_return", { precision: 18, scale: 8 }).notNull(),
  status:         betStatusEnum("status").notNull().default("pending"),
  currency:       text("currency").notNull().default("USDT"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  settledAt:      timestamp("settled_at"),
});

export const betSelectionsTable = pgTable("bet_selections", {
  id:         text("id").primaryKey(),
  betId:      text("bet_id").notNull().references(() => betsTable.id),
  matchId:    text("match_id").notNull(),
  sport:      text("sport").notNull(),
  homeTeam:   text("home_team").notNull(),
  awayTeam:   text("away_team").notNull(),
  market:     text("market").notNull(),
  selection:  text("selection").notNull(),
  odds:       numeric("odds", { precision: 10, scale: 4 }).notNull(),
  commenceTime: timestamp("commence_time"),
});

export const insertBetSchema = createInsertSchema(betsTable).omit({
  createdAt: true,
  settledAt: true,
});

export const createBetSchema = z.object({
  stake: z.number().positive(),
  selections: z.array(z.object({
    matchId:     z.string(),
    sport:       z.string(),
    homeTeam:    z.string(),
    awayTeam:    z.string(),
    market:      z.string(),
    selection:   z.string(),
    odds:        z.number().positive(),
    commenceTime:z.string().optional(),
  })).min(1),
});

export type Bet          = typeof betsTable.$inferSelect;
export type BetSelection = typeof betSelectionsTable.$inferSelect;
export type InsertBet    = typeof betsTable.$inferInsert;
