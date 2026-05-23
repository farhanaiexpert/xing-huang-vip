import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
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
