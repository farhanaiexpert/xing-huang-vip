CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY NOT NULL,
        "email" text NOT NULL,
        "username" text NOT NULL,
        "password_hash" text NOT NULL,
        "role" text DEFAULT 'user' NOT NULL,
        "kyc_status" text DEFAULT 'pending' NOT NULL,
        "country" text,
        "is_suspended" boolean DEFAULT false NOT NULL,
        "referral_code" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "balance_usdt" numeric(20, 8) DEFAULT '0' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "type" text NOT NULL,
        "amount" numeric(20, 8) NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "reference" text,
        "notes" text,
        "tx_hash" text,
        "network" text DEFAULT 'TRC-20',
        "wallet_address" text,
        "verified" boolean DEFAULT false,
        "verification_note" text,
        "nowpayments_payment_id" text,
        "nowpayments_status" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bets" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "type" text DEFAULT 'single' NOT NULL,
        "stake" numeric(20, 8) NOT NULL,
        "total_odds" numeric(10, 4) NOT NULL,
        "potential_return" numeric(20, 8) NOT NULL,
        "status" text DEFAULT 'open' NOT NULL,
        "settled_at" timestamp with time zone,
        "settled_payout" numeric(20, 8) DEFAULT '0' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bet_selections" (
        "id" serial PRIMARY KEY NOT NULL,
        "bet_id" integer NOT NULL,
        "event_id" text NOT NULL,
        "event_name" text NOT NULL,
        "sport" text DEFAULT '' NOT NULL,
        "market_type" text NOT NULL,
        "selection" text NOT NULL,
        "odds" numeric(10, 4) NOT NULL,
        "status" text DEFAULT 'open' NOT NULL,
        "is_live" boolean DEFAULT false NOT NULL,
        "score_at_placement" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commissions" (
        "id" serial PRIMARY KEY NOT NULL,
        "referral_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "amount" numeric(20, 8) NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "source_transaction_id" integer,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referrals" (
        "id" serial PRIMARY KEY NOT NULL,
        "referrer_id" integer NOT NULL,
        "referred_id" integer NOT NULL,
        "tier" integer DEFAULT 1 NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_unique" UNIQUE("referred_id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotion_claims" (
        "id" serial PRIMARY KEY NOT NULL,
        "promotion_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotions" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "type" text DEFAULT 'welcome' NOT NULL,
        "bonus_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
        "min_deposit" numeric(20, 8) DEFAULT '0' NOT NULL,
        "eligibility" text DEFAULT 'all' NOT NULL,
        "max_claims" integer,
        "is_active" boolean DEFAULT true NOT NULL,
        "expires_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pool_entries" (
        "id" serial PRIMARY KEY NOT NULL,
        "pool_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "picks" jsonb DEFAULT '{}'::jsonb NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prediction_pools" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "sport" text NOT NULL,
        "event_id" text,
        "correct_outcome" text,
        "prize_pool" numeric(20, 8) DEFAULT '0' NOT NULL,
        "entry_fee" numeric(20, 8) DEFAULT '0' NOT NULL,
        "status" text DEFAULT 'open' NOT NULL,
        "deadline" timestamp with time zone NOT NULL,
        "settled_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "winspin_prizes" (
        "id" serial PRIMARY KEY NOT NULL,
        "label" text NOT NULL,
        "prize_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
        "weight" integer DEFAULT 10 NOT NULL,
        "color" text DEFAULT '#00DFA9' NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "max_per_day" integer,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "winspin_spins" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "prize_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
        "prize_label" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "refresh_token" text NOT NULL,
        "expires_at" timestamp with time zone NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_refresh_token_unique" UNIQUE("refresh_token");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "admin_id" integer NOT NULL,
        "action" text NOT NULL,
        "entity_type" text,
        "entity_id" integer,
        "details" jsonb,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sport_controls" (
        "id" serial PRIMARY KEY NOT NULL,
        "sport_key" text NOT NULL,
        "league_name" text NOT NULL,
        "is_enabled" boolean DEFAULT true NOT NULL,
        "is_suspended" boolean DEFAULT false NOT NULL,
        "odds_multiplier" numeric(10, 4) DEFAULT '1.0000' NOT NULL,
        "margin_override" numeric(5, 2) DEFAULT '0' NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sport_controls" ADD CONSTRAINT "sport_controls_sport_key_unique" UNIQUE("sport_key");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "key" text NOT NULL,
        "value" text NOT NULL,
        "description" text,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_key_unique" UNIQUE("key");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_notes" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "admin_id" integer NOT NULL,
        "note" text NOT NULL,
        "tag" text DEFAULT 'general' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settlement_log" (
        "id" serial PRIMARY KEY NOT NULL,
        "event_id" text NOT NULL,
        "event_name" text NOT NULL,
        "sport" text DEFAULT '' NOT NULL,
        "result" text NOT NULL,
        "home_team" text DEFAULT '',
        "away_team" text DEFAULT '',
        "home_score" text DEFAULT '',
        "away_score" text DEFAULT '',
        "bets_settled" integer DEFAULT 0 NOT NULL,
        "bets_won" integer DEFAULT 0 NOT NULL,
        "bets_lost" integer DEFAULT 0 NOT NULL,
        "bets_voided" integer DEFAULT 0 NOT NULL,
        "total_payout" numeric(20, 8) DEFAULT '0' NOT NULL,
        "source" text DEFAULT 'auto' NOT NULL,
        "settled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market_liability" (
        "id" serial PRIMARY KEY NOT NULL,
        "event_id" text NOT NULL,
        "event_name" text NOT NULL,
        "sport" text DEFAULT '' NOT NULL,
        "market_type" text NOT NULL,
        "selection" text NOT NULL,
        "total_stake" numeric(20, 8) DEFAULT '0' NOT NULL,
        "potential_payout" numeric(20, 8) DEFAULT '0' NOT NULL,
        "bet_count" integer DEFAULT 0 NOT NULL,
        "is_suspended" boolean DEFAULT false NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "self_exclusions" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "duration_hours" integer,
        "starts_at" timestamp with time zone DEFAULT now() NOT NULL,
        "ends_at" timestamp with time zone,
        "is_permanent" boolean DEFAULT false NOT NULL,
        "is_take_a_break" boolean DEFAULT false NOT NULL,
        "reason" text,
        "lifted_at" timestamp with time zone,
        "lifted_by_admin_id" integer,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_limits" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "limit_type" text NOT NULL,
        "period" text NOT NULL,
        "amount_usdt" numeric(20, 8) NOT NULL,
        "current_usage" numeric(20, 8) DEFAULT '0' NOT NULL,
        "reset_at" timestamp with time zone NOT NULL,
        "pending_amount_usdt" numeric(20, 8) DEFAULT '0' NOT NULL,
        "pending_effective_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_boosts" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "match_id" text NOT NULL,
        "match_name" text NOT NULL,
        "league_name" text DEFAULT '' NOT NULL,
        "market_name" text NOT NULL,
        "selection_name" text NOT NULL,
        "original_odds" numeric(10, 4) NOT NULL,
        "boosted_odds" numeric(10, 4) NOT NULL,
        "max_stake" numeric(20, 8) DEFAULT '0' NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "expires_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "loyalty_points" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "bet_id" integer,
        "points" numeric(10, 2) NOT NULL,
        "reason" text DEFAULT 'bet_settled' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bets" ADD COLUMN IF NOT EXISTS "settled_payout" numeric(20, 8);
--> statement-breakpoint
ALTER TABLE "bet_selections" ADD COLUMN IF NOT EXISTS "is_live" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "bet_selections" ADD COLUMN IF NOT EXISTS "score_at_placement" text;
--> statement-breakpoint
ALTER TABLE "sport_controls" ADD COLUMN IF NOT EXISTS "margin_override" numeric(5, 2);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bet_selections" ADD CONSTRAINT "bet_selections_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "commissions" ADD CONSTRAINT "commissions_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "promotion_claims" ADD CONSTRAINT "promotion_claims_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "promotion_claims" ADD CONSTRAINT "promotion_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pool_entries" ADD CONSTRAINT "pool_entries_pool_id_prediction_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."prediction_pools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pool_entries" ADD CONSTRAINT "pool_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "winspin_spins" ADD CONSTRAINT "winspin_spins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "self_exclusions" ADD CONSTRAINT "self_exclusions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user_limits" ADD CONSTRAINT "user_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
