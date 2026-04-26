CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  cookie_ciphertext TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  selector TEXT NOT NULL,
  title TEXT,
  share_id TEXT NOT NULL UNIQUE,
  snapshot_html TEXT NOT NULL,
  snapshot_text TEXT,
  last_fetched_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pages_site_id ON pages(site_id);
CREATE INDEX IF NOT EXISTS idx_pages_share_id ON pages(share_id);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
