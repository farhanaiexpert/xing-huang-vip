-- Database-backed manual EN→ZH translation overrides, editable from the admin UI.
-- These take priority over the static dictionaries baked into each app, so an
-- operator can add or fix a phrase and have it appear on the live site without
-- a rebuild/redeploy.
CREATE TABLE IF NOT EXISTS translation_overrides (
  id          serial PRIMARY KEY,
  lang        text NOT NULL,
  source      text NOT NULL,
  target      text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- One override per (lang, source); upserts key off this constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'translation_overrides_lang_source_unique'
  ) THEN
    ALTER TABLE translation_overrides
      ADD CONSTRAINT translation_overrides_lang_source_unique UNIQUE (lang, source);
  END IF;
END $$;
