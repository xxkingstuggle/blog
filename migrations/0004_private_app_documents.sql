-- Private app document storage. Existing drafts/comments are untouched.
CREATE TABLE IF NOT EXISTS app_documents (
  owner TEXT NOT NULL,
  app_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  content_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (owner, app_id, doc_key),
  CHECK (revision >= 1)
);
CREATE TABLE IF NOT EXISTS app_document_history (
  owner TEXT NOT NULL,
  app_id TEXT NOT NULL,
  doc_key TEXT NOT NULL,
  revision INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (owner, app_id, doc_key, revision)
);
CREATE INDEX IF NOT EXISTS app_history_recent
  ON app_document_history(owner, app_id, doc_key, revision DESC);
