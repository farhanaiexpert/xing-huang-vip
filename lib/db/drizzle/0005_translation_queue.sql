-- Auto-collected "needs translation" queue. Proper-noun names (team / league /
-- country / player) fetched from the sports feeds that have no Chinese override
-- yet are captured here, ranked by frequency, for an operator to translate once.
-- Resolving a row promotes it into translation_overrides (live within ~20s).
CREATE TABLE IF NOT EXISTS translation_queue (
  id          serial PRIMARY KEY,
  lang        text NOT NULL,
  source      text NOT NULL,
  category    text NOT NULL,
  seen_count  integer NOT NULL DEFAULT 1,
  status      text NOT NULL DEFAULT 'pending',
  first_seen  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- One queue row per (lang, source); ingest upserts key off this constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'translation_queue_lang_source_unique'
  ) THEN
    ALTER TABLE translation_queue
      ADD CONSTRAINT translation_queue_lang_source_unique UNIQUE (lang, source);
  END IF;
END $$;--> statement-breakpoint

-- Hot read path: list pending rows ranked by frequency.
CREATE INDEX IF NOT EXISTS translation_queue_status_seen_idx
  ON translation_queue (status, seen_count DESC);
