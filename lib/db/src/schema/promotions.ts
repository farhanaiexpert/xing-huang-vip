import { pgTable, serial, integer, numeric, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const promotionsTable = pgTable("promotions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("welcome"),
  bonusAmount: numeric("bonus_amount", { precision: 20, scale: 8 }).notNull().default("0"),
  minDeposit: numeric("min_deposit", { precision: 20, scale: 8 }).notNull().default("0"),
  eligibility: text("eligibility").notNull().default("all"),
  maxClaims: integer("max_claims"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const promotionClaimsTable = pgTable("promotion_claims", {
  id: serial("id").primaryKey(),
  promotionId: integer("promotion_id").notNull().references(() => promotionsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPromotionSchema = createInsertSchema(promotionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Promotion = typeof promotionsTable.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
