import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Auto-collected "needs translation" queue. Every proper-noun name fetched from
// the sports feeds (team / league / country / player) that does NOT yet have a
// Chinese override is captured here, ranked by how often it appears, so an
// operator can translate it once. Resolving a row promotes it to a live
// translation_overrides entry (which shows on the sportsbook within ~20s).
export const translationQueueTable = pgTable(
  "translation_queue",
  {
    id: serial("id").primaryKey(),
    lang: text("lang").notNull(),
    source: text("source").notNull(),
    // team | league | country | player
    category: text("category").notNull(),
    seenCount: integer("seen_count").notNull().default(1),
    // pending | translated | ignored
    status: text("status").notNull().default("pending"),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("translation_queue_lang_source_unique").on(t.lang, t.source)],
);

export const insertTranslationQueueSchema = createInsertSchema(translationQueueTable).omit({
  id: true,
  seenCount: true,
  firstSeen: true,
  lastSeen: true,
});
export type TranslationQueueRow = typeof translationQueueTable.$inferSelect;
export type InsertTranslationQueue = z.infer<typeof insertTranslationQueueSchema>;
