-- D1 schema for the online editor and public interaction layer.
-- Apply to staging first, then production after an export bookmark.

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  pub_date TEXT NOT NULL DEFAULT (date('now')),
  updated_date TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  kind TEXT NOT NULL DEFAULT 'thought' CHECK (kind IN ('thought', 'project', 'update')),
  presentation TEXT NOT NULL DEFAULT 'article' CHECK (presentation IN ('article', 'feature')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  kicker TEXT,
  source_path TEXT NOT NULL,
  source_blob_sha TEXT,
  listed INTEGER NOT NULL DEFAULT 1 CHECK (listed IN (0, 1)),
  aliases_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publishing', 'deploying', 'published', 'published_superseded', 'conflict', 'publish_failed')),
  publish_commit_sha TEXT,
  error_code TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS drafts_status_updated_idx ON drafts(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_url TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS comments_slug_status_idx ON comments(slug, status, created_at);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'offline', 'hidden')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  checked_at TEXT
);

CREATE TABLE IF NOT EXISTS media (
  sha256 TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  bytes INTEGER NOT NULL,
  mime TEXT NOT NULL,
  ever_published_at TEXT,
  soft_deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS media_cleanup_idx ON media(ever_published_at, soft_deleted_at);

CREATE TABLE IF NOT EXISTS runtime_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
