ALTER TABLE "users" ADD COLUMN "wallet_network" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "plisio_payment_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "plisio_status" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "cryptomus_uuid" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "cryptomus_status" text;