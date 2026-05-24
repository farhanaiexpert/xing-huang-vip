import { pgTable, serial, integer, numeric, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const winspinSpinsTable = pgTable("winspin_spins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  prizeAmount: numeric("prize_amount", { precision: 20, scale: 8 }).notNull().default("0"),
  prizeLabel: text("prize_label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWinspinSpinSchema = createInsertSchema(winspinSpinsTable).omit({ id: true, createdAt: true });
export type WinspinSpin = typeof winspinSpinsTable.$inferSelect;
export type InsertWinspinSpin = z.infer<typeof insertWinspinSpinSchema>;

export const winspinPrizesTable = pgTable("winspin_prizes", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  prizeAmount: numeric("prize_amount", { precision: 20, scale: 8 }).notNull().default("0"),
  weight: integer("weight").notNull().default(10),
  color: text("color").notNull().default("#00DFA9"),
  isActive: boolean("is_active").notNull().default(true),
  maxPerDay: integer("max_per_day"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWinspinPrizeSchema = createInsertSchema(winspinPrizesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type WinspinPrize = typeof winspinPrizesTable.$inferSelect;
export type InsertWinspinPrize = z.infer<typeof insertWinspinPrizeSchema>;
