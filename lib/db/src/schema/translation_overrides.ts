import { pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Database-backed manual translation overrides. These take priority over the
// static dictionaries (custom.ts / zh.ts / zh-CN.json) baked into each app, so
// an operator can add or fix a phrase from the admin UI and have it appear on
// the live site without a rebuild/redeploy.
export const translationOverridesTable = pgTable(
  "translation_overrides",
  {
    id: serial("id").primaryKey(),
    lang: text("lang").notNull(),
    source: text("source").notNull(),
    target: text("target").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("translation_overrides_lang_source_unique").on(t.lang, t.source)],
);

export const insertTranslationOverrideSchema = createInsertSchema(translationOverridesTable).omit({
  id: true,
  updatedAt: true,
  createdAt: true,
});
export type TranslationOverride = typeof translationOverridesTable.$inferSelect;
export type InsertTranslationOverride = z.infer<typeof insertTranslationOverrideSchema>;
