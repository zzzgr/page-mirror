import { decryptText, encryptText } from "../lib/crypto";
import { countPagesForSite, createSite, deleteSite, getSiteById, listSites, updateSite } from "../lib/db";
import { formatHeadersForStorage, hydrateStoredHeaders, normalizeDomain } from "../lib/fetch-page";
import { prefersJson } from "../lib/http";
import type { Env, SiteInput, SiteListItem, SiteRecord, SiteView } from "../lib/types";
import { nowIso, randomId, readForm, redirect } from "../lib/utils";

function redirectToSites(message: string, isError = false) {
  return redirect(`/admin/sites?${isError ? "error" : "message"}=${encodeURIComponent(message)}`);
}

async function parseSiteInput(request: Request): Promise<SiteInput> {
  if (prefersJson(request)) {
    const payload = (await request.json()) as Partial<SiteInput>;
    return {
      domain: payload.domain?.trim() || "",
      headers: payload.headers || "",
      note: payload.note?.trim() || "",
    };
  }

  const values = await readForm(request);
  return {
    domain: values.domain || "",
    headers: values.headers || "",
    note: values.note || "",
  };
}

function toSiteListItem(site: SiteListItem): SiteListItem {
  return {
    id: site.id,
    domain: site.domain,
    note: site.note,
    created_at: site.created_at,
    updated_at: site.updated_at,
  };
}

async function toSiteView(env: Env, site: SiteRecord): Promise<SiteView> {
  let headers = "";

  try {
    headers = hydrateStoredHeaders(await decryptText(env.COOKIE_ENCRYPTION_KEY, site.cookie_ciphertext));
  } catch {
    headers = "";
  }

  return {
    id: site.id,
    domain: site.domain,
    note: site.note,
    created_at: site.created_at,
    updated_at: site.updated_at,
    headers,
  };
}

function toSiteListItems(sites: SiteListItem[]) {
  return sites.map(toSiteListItem);
}

function validateSiteDomain(domain: string, request: Request) {
  if (domain) return null;

  return prefersJson(request)
    ? Response.json({ error: "域名不能为空" }, { status: 400 })
    : redirectToSites("域名不能为空", true);
}

function parseSiteHeaders(input: string, request: Request) {
  try {
    return formatHeadersForStorage(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求 Header 无效";
    return prefersJson(request)
      ? Response.json({ error: message }, { status: 400 })
      : redirectToSites(message, true);
  }
}

export async function handleSitesApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/admin/sites", "") || "/";

  if (request.method === "GET" && path === "/") {
    const sites = await listSites(env);
    return Response.json({ sites: toSiteListItems(sites) });
  }

  const getMatch = path.match(/^\/([^/]+)$/);
  if (request.method === "GET" && getMatch) {
    const site = await getSiteById(env, getMatch[1]);
    if (!site) {
      return Response.json({ error: "站点不存在" }, { status: 404 });
    }
    return Response.json({ site: await toSiteView(env, site) });
  }

  if (request.method === "POST" && path === "/") {
    const input = await parseSiteInput(request);
    const domain = normalizeDomain(input.domain);
    const domainError = validateSiteDomain(domain, request);
    if (domainError) return domainError;

    const normalizedHeaders = parseSiteHeaders(input.headers, request);
    if (normalizedHeaders instanceof Response) return normalizedHeaders;

    const now = nowIso();
    const site: SiteRecord = {
      id: randomId(),
      domain,
      cookie_ciphertext: await encryptText(env.COOKIE_ENCRYPTION_KEY, normalizedHeaders),
      note: input.note,
      created_at: now,
      updated_at: now,
    };

    await createSite(env, site);
    if (prefersJson(request)) {
      return Response.json({ message: "站点已创建", site: toSiteListItem(site) });
    }
    return redirectToSites("站点已创建");
  }

  const updateMatch = path.match(/^\/([^/]+)$/);
  if (request.method === "POST" && updateMatch) {
    const site = await getSiteById(env, updateMatch[1]);
    if (!site) {
      return prefersJson(request)
        ? Response.json({ error: "站点不存在" }, { status: 404 })
        : redirectToSites("站点不存在", true);
    }

    const input = await parseSiteInput(request);
    const domain = normalizeDomain(input.domain);
    const domainError = validateSiteDomain(domain, request);
    if (domainError) return domainError;

    const normalizedHeaders = parseSiteHeaders(input.headers, request);
    if (normalizedHeaders instanceof Response) return normalizedHeaders;

    const updated: SiteRecord = {
      ...site,
      domain,
      cookie_ciphertext: await encryptText(env.COOKIE_ENCRYPTION_KEY, normalizedHeaders),
      note: input.note,
      updated_at: nowIso(),
    };

    await updateSite(env, updated);
    if (prefersJson(request)) {
      return Response.json({ message: "站点已更新", site: toSiteListItem(updated) });
    }
    return redirectToSites("站点已更新");
  }

  const deleteMatch = path.match(/^\/([^/]+)\/delete$/);
  if (request.method === "POST" && deleteMatch) {
    const siteId = deleteMatch[1];
    const pageCount = await countPagesForSite(env, siteId);
    if (pageCount > 0) {
      return prefersJson(request)
        ? Response.json({ error: "请先删除该站点下的页面" }, { status: 400 })
        : redirectToSites("请先删除该站点下的页面", true);
    }

    await deleteSite(env, siteId);
    return prefersJson(request)
      ? Response.json({ message: "站点已删除" })
      : redirectToSites("站点已删除");
  }

  return new Response("Not Found", { status: 404 });
}
