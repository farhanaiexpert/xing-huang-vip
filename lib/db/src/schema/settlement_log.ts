import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const settlementLogTable = pgTable("settlement_log", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull(),
  eventName: text("event_name").notNull(),
  sport: text("sport").notNull().default(""),
  result: text("result").notNull(),
  homeTeam: text("home_team").default(""),
  awayTeam: text("away_team").default(""),
  homeScore: text("home_score").default(""),
  awayScore: text("away_score").default(""),
  commenceTime: timestamp("commence_time", { withTimezone: true }),
  betsSettled: integer("bets_settled").notNull().default(0),
  betsWon: integer("bets_won").notNull().default(0),
  betsLost: integer("bets_lost").notNull().default(0),
  betsVoided: integer("bets_voided").notNull().default(0),
  totalPayout: numeric("total_payout", { precision: 20, scale: 8 }).notNull().default("0"),
  source: text("source").notNull().default("auto"),
  settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SettlementLog = typeof settlementLogTable.$inferSelect;
