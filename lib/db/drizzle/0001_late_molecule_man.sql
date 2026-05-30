-- Wallet auth Phase 1: wallet_address on users, nullable email/username/password_hash, nonces table

CREATE TABLE "nonces" (
  "wallet_address" text PRIMARY KEY NOT NULL,
  "nonce"          text NOT NULL,
  "expires_at"     timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "wallet_address" text;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address");
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
