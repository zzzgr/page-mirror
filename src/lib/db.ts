import type { D1Result } from "@cloudflare/workers-types";
import type { Env, PageListItem, PageRecord, SessionRecord, SiteListItem, SiteRecord, SystemSettingsRecord } from "./types";

async function first<T>(result: D1Result<T>) {
  return result.results[0] ?? null;
}

export async function listSites(env: Env) {
  const result = await env.DB.prepare(
    "SELECT id, domain, note, created_at, updated_at FROM sites ORDER BY created_at DESC",
  ).all<SiteListItem>();
  return result.results;
}

export async function getSiteById(env: Env, id: string) {
  const result = await env.DB.prepare("SELECT * FROM sites WHERE id = ?").bind(id).all<SiteRecord>();
  return first(result);
}

export async function getPageWithSiteById(env: Env, id: string) {
  const result = await env.DB.prepare(
    `SELECT pages.*, sites.domain AS site_domain
     FROM pages
     JOIN sites ON sites.id = pages.site_id
     WHERE pages.id = ?`,
  ).bind(id).all<PageRecord & { site_domain: string }>();
  return first(result);
}

export async function getPageWithSiteByShareId(env: Env, shareId: string) {
  const result = await env.DB.prepare(
    `SELECT pages.*, sites.domain AS site_domain
     FROM pages
     JOIN sites ON sites.id = pages.site_id
     WHERE pages.share_id = ?`,
  ).bind(shareId).all<PageRecord & { site_domain: string }>();
  return first(result);
}

export async function createSite(env: Env, site: SiteRecord) {
  await env.DB.prepare(
    "INSERT INTO sites (id, domain, cookie_ciphertext, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(site.id, site.domain, site.cookie_ciphertext, site.note, site.created_at, site.updated_at)
    .run();
}

export async function updateSite(env: Env, site: SiteRecord) {
  await env.DB.prepare(
    "UPDATE sites SET domain = ?, cookie_ciphertext = ?, note = ?, updated_at = ? WHERE id = ?",
  )
    .bind(site.domain, site.cookie_ciphertext, site.note, site.updated_at, site.id)
    .run();
}

export async function deleteSite(env: Env, id: string) {
  await env.DB.prepare("DELETE FROM sites WHERE id = ?").bind(id).run();
}

export async function listPages(env: Env, siteId?: string) {
  const columns = `
    pages.id, pages.site_id, sites.domain AS site_domain, pages.source_url, pages.selector,
    pages.title, pages.share_id, pages.last_fetched_at, pages.created_at, pages.updated_at
  `;
  const statement = siteId
    ? env.DB.prepare(
        `SELECT ${columns}
         FROM pages
         JOIN sites ON sites.id = pages.site_id
         WHERE pages.site_id = ?
         ORDER BY pages.updated_at DESC`,
      ).bind(siteId)
    : env.DB.prepare(
        `SELECT ${columns}
         FROM pages
         JOIN sites ON sites.id = pages.site_id
         ORDER BY pages.updated_at DESC`,
      );

  const result = await statement.all<PageListItem>();
  return result.results;
}

export async function getPageById(env: Env, id: string) {
  const result = await env.DB.prepare("SELECT * FROM pages WHERE id = ?").bind(id).all<PageRecord>();
  return first(result);
}

export async function getPageByShareId(env: Env, shareId: string) {
  const result = await env.DB.prepare("SELECT * FROM pages WHERE share_id = ?").bind(shareId).all<PageRecord>();
  return first(result);
}

export async function createPage(env: Env, page: PageRecord) {
  await env.DB.prepare(
    `INSERT INTO pages (
      id, site_id, source_url, selector, title, share_id, snapshot_html, snapshot_text,
      last_fetched_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      page.id,
      page.site_id,
      page.source_url,
      page.selector,
      page.title,
      page.share_id,
      page.snapshot_html,
      page.snapshot_text,
      page.last_fetched_at,
      page.created_at,
      page.updated_at,
    )
    .run();
}

export async function updatePage(env: Env, page: PageRecord) {
  await env.DB.prepare(
    `UPDATE pages SET
      site_id = ?, source_url = ?, selector = ?, title = ?, snapshot_html = ?, snapshot_text = ?,
      last_fetched_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      page.site_id,
      page.source_url,
      page.selector,
      page.title,
      page.snapshot_html,
      page.snapshot_text,
      page.last_fetched_at,
      page.updated_at,
      page.id,
    )
    .run();
}

export async function deletePage(env: Env, id: string) {
  await env.DB.prepare("DELETE FROM pages WHERE id = ?").bind(id).run();
}

export async function createSession(env: Env, session: SessionRecord) {
  await env.DB.prepare(
    "INSERT INTO admin_sessions (id, session_token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(session.id, session.session_token_hash, session.expires_at, session.created_at)
    .run();
}

export async function getSessionByHash(env: Env, hash: string) {
  const result = await env.DB.prepare("SELECT * FROM admin_sessions WHERE session_token_hash = ?")
    .bind(hash)
    .all<SessionRecord>();
  return first(result);
}

export async function deleteSessionByHash(env: Env, hash: string) {
  await env.DB.prepare("DELETE FROM admin_sessions WHERE session_token_hash = ?").bind(hash).run();
}

export async function cleanupExpiredSessions(env: Env, now: string) {
  await env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(now).run();
}

export async function countPagesForSite(env: Env, siteId: string) {
  const result = await env.DB.prepare("SELECT COUNT(*) AS count FROM pages WHERE site_id = ?").bind(siteId).all<{ count: number }>();
  return Number(result.results[0]?.count ?? 0);
}

export async function getSystemSettings(env: Env) {
  const result = await env.DB.prepare("SELECT * FROM system_settings WHERE id = 'system'").all<SystemSettingsRecord>();
  return first(result);
}

export async function updateAdminPasswordHash(env: Env, adminPasswordHash: string, updatedAt: string) {
  await env.DB.prepare("UPDATE system_settings SET admin_password_hash = ?, updated_at = ? WHERE id = 'system'")
    .bind(adminPasswordHash, updatedAt)
    .run();
}

export async function deleteAllSessions(env: Env) {
  await env.DB.prepare("DELETE FROM admin_sessions").run();
}
