-- 001_init.sql
-- Core schema per PRD §8. Two distinct credential tables (users.password_hash
-- for dashboard sessions, api_keys.key_hash for MCP access) — see PRD §9.

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE api_keys (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash   TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- first few chars, shown in dashboard for identification
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT
);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

CREATE TABLE posts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  slug             TEXT NOT NULL,
  content_md       TEXT NOT NULL DEFAULT '',
  tags             TEXT NOT NULL DEFAULT '[]', -- JSON array, kept simple for MVP
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  meta_title       TEXT,
  meta_description TEXT,
  published_at     TEXT,
  scheduled_at     TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, slug)
);
CREATE INDEX idx_posts_user_status ON posts(user_id, status);

CREATE TABLE analytics_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL DEFAULT 'view',
  referrer    TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_analytics_post ON analytics_events(post_id);

-- Audit log for "why did my agent do that" (PRD §9 auditability). Note:
-- schema_migrations itself is created separately by db/migrate.ts, not here.
CREATE TABLE tool_call_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tool_name  TEXT NOT NULL,
  success    INTEGER NOT NULL,
  error      TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);
