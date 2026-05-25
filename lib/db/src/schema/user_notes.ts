import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userNotesTable = pgTable("user_notes", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  adminId:   integer("admin_id").notNull().references(() => usersTable.id),
  note:      text("note").notNull(),
  tag:       text("tag").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserNote = typeof userNotesTable.$inferSelect;
