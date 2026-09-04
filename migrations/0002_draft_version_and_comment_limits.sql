-- Optimistic draft locking and privacy-preserving daily comment throttling.

ALTER TABLE drafts ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS drafts_slug_unique_idx ON drafts(slug);

CREATE TABLE IF NOT EXISTS comment_rate_daily (
  day TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  submissions INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, key_hash)
);

CREATE INDEX IF NOT EXISTS comment_rate_daily_day_idx ON comment_rate_daily(day);
