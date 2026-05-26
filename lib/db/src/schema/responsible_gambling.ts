import { pgTable, serial, integer, numeric, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userLimitsTable = pgTable("user_limits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  limitType: text("limit_type").notNull(),
  period: text("period").notNull(),
  amountUsdt: numeric("amount_usdt", { precision: 20, scale: 8 }).notNull(),
  currentUsage: numeric("current_usage", { precision: 20, scale: 8 }).notNull().default("0"),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const selfExclusionsTable = pgTable("self_exclusions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  durationHours: integer("duration_hours"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isPermanent: boolean("is_permanent").notNull().default(false),
  isTakeABreak: boolean("is_take_a_break").notNull().default(false),
  reason: text("reason"),
  liftedAt: timestamp("lifted_at", { withTimezone: true }),
  liftedByAdminId: integer("lifted_by_admin_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserLimitSchema = createInsertSchema(userLimitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSelfExclusionSchema = createInsertSchema(selfExclusionsTable).omit({ id: true, createdAt: true });
export type UserLimit = typeof userLimitsTable.$inferSelect;
export type SelfExclusion = typeof selfExclusionsTable.$inferSelect;
export type InsertUserLimit = z.infer<typeof insertUserLimitSchema>;
export type InsertSelfExclusion = z.infer<typeof insertSelfExclusionSchema>;
