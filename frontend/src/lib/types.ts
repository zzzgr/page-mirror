export interface Site {
  id: string;
  domain: string;
  note: string | null;
  headers?: string;
  created_at: string;
  updated_at: string;
}

export interface PageItem {
  id: string;
  site_id: string;
  site_domain?: string;
  source_url: string;
  selector: string;
  title: string | null;
  share_id: string;
  snapshot_html?: string;
  snapshot_text?: string | null;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicPageData {
  title: string;
  htmlContent: string;
}

export interface AppData {
  route: "home" | "login" | "sites" | "pages" | "settings" | "public";
  error?: string;
  message?: string;
  selectedSiteId?: string | null;
  editingSite?: Site | null;
  editingPage?: PageItem | null;
  sites?: Site[];
  pages?: PageItem[];
  publicPage?: PublicPageData | null;
}

declare global {
  interface Window {
    __APP_DATA__?: AppData | null;
  }
}
