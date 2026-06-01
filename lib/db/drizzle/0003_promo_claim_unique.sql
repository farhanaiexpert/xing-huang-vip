-- Ensure each user can claim each promotion only once (DB-level guard)
CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_claims_user_promo
  ON promotion_claims (promotion_id, user_id);--> statement-breakpoint

-- Ensure each promo bonus reference is only credited once per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_promo_bonus_ref
  ON transactions (user_id, reference)
  WHERE type = 'bonus' AND reference LIKE 'promo_%';
