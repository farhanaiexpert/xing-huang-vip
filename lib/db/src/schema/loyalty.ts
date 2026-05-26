import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { betsTable } from "./bets";

export const loyaltyPointsTable = pgTable("loyalty_points", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  betId:     integer("bet_id").references(() => betsTable.id, { onDelete: "set null" }),
  points:    numeric("points", { precision: 10, scale: 2 }).notNull(),
  reason:    text("reason").notNull().default("bet_settled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLoyaltyPointSchema = createInsertSchema(loyaltyPointsTable).omit({ id: true, createdAt: true });
export type LoyaltyPoint = typeof loyaltyPointsTable.$inferSelect;
export type InsertLoyaltyPoint = z.infer<typeof insertLoyaltyPointSchema>;
