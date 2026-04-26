import type { Env } from "./types";

// 这些 SQL 必须与 migrations/*.sql 保持一致 —— 修改任一处时记得同步。
// 全部使用 IF NOT EXISTS / OR IGNORE,可重复执行。
const MIGRATION_STATEMENTS: string[] = [
  // 0001_init.sql
  `CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    cookie_ciphertext TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pages (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pages_site_id ON pages(site_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pages_share_id ON pages(share_id)`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    session_token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at)`,
  // 0002_system_settings.sql
  `CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    admin_password_hash TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `INSERT OR IGNORE INTO system_settings (id, admin_password_hash, updated_at)
   VALUES ('system', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', '2026-04-24T00:00:00.000Z')`,
];

let bootstrapPromise: Promise<void> | null = null;

async function runBootstrap(env: Env): Promise<void> {
  try {
    await env.DB.prepare("SELECT 1 FROM system_settings LIMIT 1").first();
    return;
  } catch {
    // 表不存在,继续走迁移
  }

  for (const sql of MIGRATION_STATEMENTS) {
    await env.DB.prepare(sql).run();
  }
}

export function ensureBootstrap(env: Env): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap(env).catch((err) => {
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}
