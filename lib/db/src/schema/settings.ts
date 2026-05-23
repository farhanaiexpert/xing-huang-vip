import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platformSettingsTable = pgTable("platform_settings", {
  key:       text("key").primaryKey(),
  value:     text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PlatformSetting = typeof platformSettingsTable.$inferSelect;
export type InsertPlatformSetting = typeof platformSettingsTable.$inferInsert;

export const SETTING_DEFAULTS: Record<string, string> = {
  maintenance_mode:  "false",
  accept_new_bets:   "true",
  referral_program:  "true",
  live_odds:         "true",
  min_bet:           "1",
  max_bet:           "1000",
  max_odds:          "500",
  platform_name:     "CupBett",
  support_email:     "",
};
