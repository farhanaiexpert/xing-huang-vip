import { pgTable, serial, integer, numeric, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const predictionPoolsTable = pgTable("prediction_pools", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sport: text("sport").notNull(),
  eventId: text("event_id"),
  /** The correct outcome string set by admin at settlement time (e.g. "home_win", "draw"). */
  correctOutcome: text("correct_outcome"),
  prizePool: numeric("prize_pool", { precision: 20, scale: 8 }).notNull().default("0"),
  entryFee: numeric("entry_fee", { precision: 20, scale: 8 }).notNull().default("0"),
  status: text("status").notNull().default("open"),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const poolEntriesTable = pgTable("pool_entries", {
  id: serial("id").primaryKey(),
  poolId: integer("pool_id").notNull().references(() => predictionPoolsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  picks: jsonb("picks").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPoolSchema = createInsertSchema(predictionPoolsTable).omit({ id: true, createdAt: true, settledAt: true });
export const insertPoolEntrySchema = createInsertSchema(poolEntriesTable).omit({ id: true, createdAt: true });
export type PredictionPool = typeof predictionPoolsTable.$inferSelect;
export type PoolEntry = typeof poolEntriesTable.$inferSelect;
export type InsertPool = z.infer<typeof insertPoolSchema>;
