CREATE TABLE "promotion_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"promotion_id" integer NOT NULL,
	"task_type" text NOT NULL,
	"target_value" numeric(20, 8) NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nonces" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "reference" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "notes" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "tx_hash" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "wallet_address" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "verification_note" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "nowpayments_payment_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "nowpayments_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bet_selections" ALTER COLUMN "score_at_placement" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bets" ALTER COLUMN "settled_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bets" ALTER COLUMN "settled_payout" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "bets" ALTER COLUMN "settled_payout" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ALTER COLUMN "bonus_amount" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "promotions" ALTER COLUMN "bonus_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ALTER COLUMN "min_deposit" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "promotions" ALTER COLUMN "min_deposit" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ALTER COLUMN "max_claims" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "promotions" ALTER COLUMN "expires_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sport_controls" ALTER COLUMN "margin_override" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "sport_controls" ALTER COLUMN "margin_override" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "self_exclusions" ALTER COLUMN "duration_hours" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "self_exclusions" ALTER COLUMN "ends_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "self_exclusions" ALTER COLUMN "reason" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "self_exclusions" ALTER COLUMN "lifted_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "self_exclusions" ALTER COLUMN "lifted_by_admin_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_limits" ALTER COLUMN "pending_amount_usdt" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "user_limits" ALTER COLUMN "pending_amount_usdt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_limits" ALTER COLUMN "pending_effective_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "price_boosts" ALTER COLUMN "max_stake" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "price_boosts" ALTER COLUMN "max_stake" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "price_boosts" ALTER COLUMN "expires_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "price_boosts" ALTER COLUMN "created_by" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "wallet_address" text;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "bonus_balance_usdt" numeric(20, 8) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "reward_type" text DEFAULT 'flat_bonus' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "pool_amount" numeric(20, 8);--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "wagering_requirement" numeric(5, 2) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "banner_color" text DEFAULT '#00DFA9' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotion_requirements" ADD CONSTRAINT "promotion_requirements_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address");