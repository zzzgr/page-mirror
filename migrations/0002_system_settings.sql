CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  admin_password_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO system_settings (id, admin_password_hash, updated_at)
VALUES (
  'system',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  '2026-04-24T00:00:00.000Z'
);
