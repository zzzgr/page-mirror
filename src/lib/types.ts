export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  COOKIE_ENCRYPTION_KEY: string;
  SESSION_COOKIE_NAME?: string;
}

export interface SiteRecord {
  id: string;
  domain: string;
  cookie_ciphertext: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteListItem {
  id: string;
  domain: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageRecord {
  id: string;
  site_id: string;
  source_url: string;
  selector: string;
  title: string | null;
  share_id: string;
  snapshot_html: string;
  snapshot_text: string | null;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageListItem {
  id: string;
  site_id: string;
  site_domain?: string;
  source_url: string;
  selector: string;
  title: string | null;
  share_id: string;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  session_token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface SystemSettingsRecord {
  id: string;
  admin_password_hash: string;
  updated_at: string;
}

export interface PageSnapshot {
  title: string;
  html: string;
  text: string;
}

export interface SiteInput {
  domain: string;
  headers: string;
  note: string;
}

export interface SiteView extends SiteListItem {
  headers?: string;
}

export interface PageView extends PageRecord {
  site_domain?: string;
}

export interface PageInput {
  siteId: string;
  sourceUrl: string;
  selector: string;
  title: string;
}
