import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "banned"]);

export const usersTable = pgTable("users", {
  id:           text("id").primaryKey(),
  username:     text("username").notNull().unique(),
  email:        text("email").unique(),
  passwordHash: text("password_hash"),
  walletAddress:text("wallet_address").unique(),
  role:         userRoleEnum("role").notNull().default("user"),
  status:       userStatusEnum("status").notNull().default("active"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(usersTable).omit({
  passwordHash: true,
});

export const registerSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores"),
  email:    z.email().optional(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  login:    z.string().min(1),
  password: z.string().min(1),
});

export type User         = typeof usersTable.$inferSelect;
export type InsertUser   = typeof usersTable.$inferInsert;
export type PublicUser   = Omit<User, "passwordHash">;
