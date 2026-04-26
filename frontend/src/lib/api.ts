import type { PageItem, PublicPageData, Site } from "./types";

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
    credentials: "same-origin",
  });

  if (response.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("未登录");
  }

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

export function login(password: string) {
  return request<{ ok: true; redirectTo: string }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

export function logout() {
  return fetch("/admin/logout", { credentials: "same-origin" }).then(() => {
    window.location.href = "/admin/login";
  });
}

export function listSites() {
  return request<{ sites: Site[] }>("/api/admin/sites");
}

export function getSite(id: string) {
  return request<{ site: Site }>(`/api/admin/sites/${id}`);
}

export function createSite(payload: { domain: string; headers: string; note: string }) {
  return request<{ site: Site; message: string }>("/api/admin/sites", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSite(id: string, payload: { domain: string; headers: string; note: string }) {
  return request<{ site: Site; message: string }>(`/api/admin/sites/${id}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteSite(id: string) {
  return request<{ message: string }>(`/api/admin/sites/${id}/delete`, { method: "POST" });
}

export function listPages(siteId?: string) {
  const url = new URL("/api/admin/pages", window.location.origin);
  if (siteId) url.searchParams.set("siteId", siteId);
  return request<{ pages: PageItem[] }>(url);
}

export function getPage(id: string) {
  return request<{ page: PageItem }>(`/api/admin/pages/${id}`);
}

export function createPage(payload: { siteId: string; title: string; sourceUrl: string; selector: string }) {
  return request<{ page: PageItem; message: string }>("/api/admin/pages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePage(id: string, payload: { siteId: string; title: string; sourceUrl: string; selector: string }) {
  return request<{ page: PageItem; message: string }>(`/api/admin/pages/${id}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function refreshPage(id: string) {
  return request<{ page: PageItem; message: string }>(`/api/admin/pages/${id}/refresh`, { method: "POST" });
}

export function deletePage(id: string) {
  return request<{ message: string }>(`/api/admin/pages/${id}/delete`, { method: "POST" });
}

export function bulkCreatePages(payload: { siteId: string; selector: string; urls: string[] }) {
  return request<{
    message: string;
    created: PageItem[];
    failed: { url: string; error: string }[];
  }>("/api/admin/pages/bulk-create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function bulkRefreshPages(ids: string[]) {
  return request<{
    message: string;
    refreshed: PageItem[];
    failed: { id: string; error: string }[];
  }>("/api/admin/pages/bulk-refresh", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function bulkDeletePages(ids: string[]) {
  return request<{
    message: string;
    deletedIds: string[];
    failed: { id: string; error: string }[];
  }>("/api/admin/pages/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function updateAdminPassword(payload: { password: string; confirmPassword: string }) {
  return request<{ message: string }>("/api/admin/settings/password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPublicPage(shareId: string) {
  return request<{ page: PublicPageData }>(`/api/public/pages/${shareId}`);
}
