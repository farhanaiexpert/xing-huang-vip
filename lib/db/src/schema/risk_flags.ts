import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const riskFlagsTable = pgTable("risk_flags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // REFERRAL_DUPLICATE | BET_VELOCITY | MAX_WIN_CAP
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRiskFlagSchema = createInsertSchema(riskFlagsTable).omit({ id: true, createdAt: true });
export type RiskFlag = typeof riskFlagsTable.$inferSelect;
export type InsertRiskFlag = z.infer<typeof insertRiskFlagSchema>;
