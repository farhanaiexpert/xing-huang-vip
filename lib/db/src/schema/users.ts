import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").unique(),
  walletNetwork: text("wallet_network"),
  email: text("email").unique(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("user"),
  kycStatus: text("kyc_status").notNull().default("pending"),
  country: text("country"),
  isSuspended: boolean("is_suspended").notNull().default(false),
  isTestAccount: boolean("is_test_account").notNull().default(false),
  referralCode: text("referral_code").unique(),
  registrationIp: text("registration_ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
