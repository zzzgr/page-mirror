import { decryptText } from "../lib/crypto";
import { createPage, deletePage, getPageById, getPageWithSiteById, getSiteById, listPages, updatePage } from "../lib/db";
import { fetchRemotePage, isAllowedUrl, parseStoredHeaders } from "../lib/fetch-page";
import { prefersJson } from "../lib/http";
import { extractSnapshot } from "../lib/parse-page";
import type { Env, PageInput, PageRecord } from "../lib/types";
import { nowIso, randomId, readForm, redirect, toBase64Url } from "../lib/utils";

function redirectToPages(message: string, isError = false, siteId?: string) {
  const params = new URLSearchParams();
  params.set(isError ? "error" : "message", message);
  if (siteId) params.set("siteId", siteId);
  return redirect(`/admin/pages?${params.toString()}`);
}

function createShareId() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(9)));
}

async function parsePageInput(request: Request): Promise<PageInput> {
  if (prefersJson(request)) {
    const payload = (await request.json()) as Partial<PageInput>;
    return {
      siteId: payload.siteId?.trim() || "",
      title: payload.title?.trim() || "",
      sourceUrl: payload.sourceUrl?.trim() || "",
      selector: payload.selector?.trim() || "",
    };
  }

  const values = await readForm(request);
  return {
    siteId: values.siteId || "",
    title: values.title || "",
    sourceUrl: values.sourceUrl || "",
    selector: values.selector || "",
  };
}

async function snapshotPage(env: Env, input: PageInput) {
  const site = await getSiteById(env, input.siteId);
  if (!site) {
    throw new Error("站点不存在");
  }

  if (!isAllowedUrl(site.domain, input.sourceUrl)) {
    throw new Error("页面 URL 不属于所选站点域名");
  }

  let headers = new Headers();

  try {
    headers = parseStoredHeaders(await decryptText(env.COOKIE_ENCRYPTION_KEY, site.cookie_ciphertext));
  } catch {
    throw new Error("站点 Header 配置无效，请重新保存该站点");
  }

  const rawHtml = await fetchRemotePage(input.sourceUrl, headers);
  const snapshot = extractSnapshot(rawHtml, input.selector, input.title);

  return { site, snapshot };
}

export async function handlePagesApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/admin/pages", "") || "/";

  if (request.method === "GET" && path === "/") {
    const siteId = url.searchParams.get("siteId") || undefined;
    const pages = await listPages(env, siteId);
    return Response.json({ pages });
  }

  if (request.method === "POST" && path === "/bulk-create") {
    return handleBulkCreate(request, env);
  }

  if (request.method === "POST" && path === "/bulk-refresh") {
    return handleBulkRefresh(request, env);
  }

  if (request.method === "POST" && path === "/bulk-delete") {
    return handleBulkDelete(request, env);
  }

  const getMatch = path.match(/^\/([^/]+)$/);
  if (request.method === "GET" && getMatch) {
    const page = await getPageWithSiteById(env, getMatch[1]);
    if (!page) {
      return Response.json({ error: "页面不存在" }, { status: 404 });
    }
    return Response.json({ page });
  }

  if (request.method === "POST" && path === "/") {
    try {
      const input = await parsePageInput(request);
      if (!input.siteId || !input.sourceUrl || !input.selector) {
        return prefersJson(request)
          ? Response.json({ error: "站点、URL、选择器不能为空" }, { status: 400 })
          : redirectToPages("站点、URL、选择器不能为空", true);
      }

      const { snapshot } = await snapshotPage(env, input);
      const now = nowIso();
      const page: PageRecord = {
        id: randomId(),
        site_id: input.siteId,
        source_url: input.sourceUrl,
        selector: input.selector,
        title: input.title || snapshot.title,
        share_id: createShareId(),
        snapshot_html: snapshot.html,
        snapshot_text: snapshot.text,
        last_fetched_at: now,
        created_at: now,
        updated_at: now,
      };

      await createPage(env, page);
      const hydrated = await getPageWithSiteById(env, page.id);
      if (prefersJson(request)) {
        return Response.json({ message: "页面已创建并抓取成功", page: hydrated });
      }
      return redirectToPages("页面已创建并抓取成功", false, input.siteId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "页面创建失败";
      return prefersJson(request)
        ? Response.json({ error: message }, { status: 400 })
        : redirectToPages(message, true);
    }
  }

  const updateMatch = path.match(/^\/([^/]+)$/);
  if (request.method === "POST" && updateMatch) {
    const existing = await getPageById(env, updateMatch[1]);
    if (!existing) {
      return prefersJson(request)
        ? Response.json({ error: "页面不存在" }, { status: 404 })
        : redirectToPages("页面不存在", true);
    }

    try {
      const input = await parsePageInput(request);
      if (!input.siteId || !input.sourceUrl || !input.selector) {
        return prefersJson(request)
          ? Response.json({ error: "站点、URL、选择器不能为空" }, { status: 400 })
          : redirectToPages("站点、URL、选择器不能为空", true, existing.site_id);
      }

      const { snapshot } = await snapshotPage(env, input);
      const updated: PageRecord = {
        ...existing,
        site_id: input.siteId,
        source_url: input.sourceUrl,
        selector: input.selector,
        title: input.title || snapshot.title,
        snapshot_html: snapshot.html,
        snapshot_text: snapshot.text,
        last_fetched_at: nowIso(),
        updated_at: nowIso(),
      };

      await updatePage(env, updated);
      const hydrated = await getPageWithSiteById(env, updated.id);
      if (prefersJson(request)) {
        return Response.json({ message: "页面已更新", page: hydrated });
      }
      return redirectToPages("页面已更新", false, input.siteId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "页面更新失败";
      return prefersJson(request)
        ? Response.json({ error: message }, { status: 400 })
        : redirectToPages(message, true, existing.site_id);
    }
  }

  const refreshMatch = path.match(/^\/([^/]+)\/refresh$/);
  if (request.method === "POST" && refreshMatch) {
    const existing = await getPageById(env, refreshMatch[1]);
    if (!existing) {
      return prefersJson(request)
        ? Response.json({ error: "页面不存在" }, { status: 404 })
        : redirectToPages("页面不存在", true);
    }

    try {
      const { snapshot } = await snapshotPage(env, {
        siteId: existing.site_id,
        sourceUrl: existing.source_url,
        selector: existing.selector,
        title: existing.title || "",
      });

      const updated: PageRecord = {
        ...existing,
        title: existing.title || snapshot.title,
        snapshot_html: snapshot.html,
        snapshot_text: snapshot.text,
        last_fetched_at: nowIso(),
        updated_at: nowIso(),
      };

      await updatePage(env, updated);
      const hydrated = await getPageWithSiteById(env, updated.id);
      if (prefersJson(request)) {
        return Response.json({ message: "页面内容已刷新", page: hydrated });
      }
      return redirectToPages("页面内容已刷新", false, existing.site_id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "刷新失败";
      return prefersJson(request)
        ? Response.json({ error: message }, { status: 400 })
        : redirectToPages(message, true, existing.site_id);
    }
  }

  const deleteMatch = path.match(/^\/([^/]+)\/delete$/);
  if (request.method === "POST" && deleteMatch) {
    const existing = await getPageById(env, deleteMatch[1]);
    if (!existing) {
      return prefersJson(request)
        ? Response.json({ error: "页面不存在" }, { status: 404 })
        : redirectToPages("页面不存在", true);
    }

    await deletePage(env, deleteMatch[1]);
    return prefersJson(request)
      ? Response.json({ message: "页面已删除" })
      : redirectToPages("页面已删除", false, existing.site_id);
  }

  return new Response("Not Found", { status: 404 });
}

const BULK_LIMIT = 20;
const BULK_CONCURRENCY = 5;

async function processConcurrent<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function handleBulkCreate(request: Request, env: Env) {
  let payload: { siteId?: unknown; selector?: unknown; urls?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "请求格式无效" }, { status: 400 });
  }

  const siteId = typeof payload.siteId === "string" ? payload.siteId.trim() : "";
  const selector = typeof payload.selector === "string" ? payload.selector.trim() : "";
  const urlsRaw = Array.isArray(payload.urls) ? payload.urls : [];

  if (!siteId || !selector) {
    return Response.json({ error: "站点和选择器不能为空" }, { status: 400 });
  }

  const urls = Array.from(
    new Set(
      urlsRaw
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0),
    ),
  );

  if (urls.length === 0) {
    return Response.json({ error: "请至少填写一个 URL" }, { status: 400 });
  }

  if (urls.length > BULK_LIMIT) {
    return Response.json({ error: `最多一次创建 ${BULK_LIMIT} 个页面` }, { status: 400 });
  }

  type CreateOutcome = { ok: true; page: unknown } | { ok: false; url: string; error: string };
  const outcomes = await processConcurrent<string, CreateOutcome>(urls, BULK_CONCURRENCY, async (sourceUrl) => {
    try {
      const { snapshot } = await snapshotPage(env, { siteId, selector, sourceUrl, title: "" });
      const now = nowIso();
      const page: PageRecord = {
        id: randomId(),
        site_id: siteId,
        source_url: sourceUrl,
        selector,
        title: snapshot.title,
        share_id: createShareId(),
        snapshot_html: snapshot.html,
        snapshot_text: snapshot.text,
        last_fetched_at: now,
        created_at: now,
        updated_at: now,
      };
      await createPage(env, page);
      const hydrated = await getPageWithSiteById(env, page.id);
      return { ok: true, page: hydrated };
    } catch (error) {
      return { ok: false, url: sourceUrl, error: error instanceof Error ? error.message : "抓取失败" };
    }
  });

  const created: unknown[] = [];
  const failed: { url: string; error: string }[] = [];
  for (const outcome of outcomes) {
    if (outcome.ok) created.push(outcome.page);
    else failed.push({ url: outcome.url, error: outcome.error });
  }

  return Response.json({
    message: `已创建 ${created.length} 个页面${failed.length ? `，${failed.length} 个失败` : ""}`,
    created,
    failed,
  });
}

async function handleBulkRefresh(request: Request, env: Env) {
  let payload: { ids?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "请求格式无效" }, { status: 400 });
  }

  const ids = Array.isArray(payload.ids)
    ? payload.ids.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];

  if (ids.length === 0) {
    return Response.json({ error: "请选择需要刷新的页面" }, { status: 400 });
  }

  if (ids.length > BULK_LIMIT) {
    return Response.json({ error: `最多一次刷新 ${BULK_LIMIT} 个页面` }, { status: 400 });
  }

  type RefreshOutcome = { ok: true; page: unknown } | { ok: false; id: string; error: string };
  const outcomes = await processConcurrent<string, RefreshOutcome>(ids, BULK_CONCURRENCY, async (id) => {
    try {
      const existing = await getPageById(env, id);
      if (!existing) {
        return { ok: false, id, error: "页面不存在" };
      }

      const { snapshot } = await snapshotPage(env, {
        siteId: existing.site_id,
        sourceUrl: existing.source_url,
        selector: existing.selector,
        title: existing.title || "",
      });

      const updated: PageRecord = {
        ...existing,
        title: existing.title || snapshot.title,
        snapshot_html: snapshot.html,
        snapshot_text: snapshot.text,
        last_fetched_at: nowIso(),
        updated_at: nowIso(),
      };
      await updatePage(env, updated);
      const hydrated = await getPageWithSiteById(env, updated.id);
      return { ok: true, page: hydrated };
    } catch (error) {
      return { ok: false, id, error: error instanceof Error ? error.message : "刷新失败" };
    }
  });

  const refreshed: unknown[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const outcome of outcomes) {
    if (outcome.ok) refreshed.push(outcome.page);
    else failed.push({ id: outcome.id, error: outcome.error });
  }

  return Response.json({
    message: `已刷新 ${refreshed.length} 个页面${failed.length ? `，${failed.length} 个失败` : ""}`,
    refreshed,
    failed,
  });
}

async function handleBulkDelete(request: Request, env: Env) {
  let payload: { ids?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "请求格式无效" }, { status: 400 });
  }

  const ids = Array.isArray(payload.ids)
    ? payload.ids.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];

  if (ids.length === 0) {
    return Response.json({ error: "请选择需要删除的页面" }, { status: 400 });
  }

  if (ids.length > BULK_LIMIT) {
    return Response.json({ error: `最多一次删除 ${BULK_LIMIT} 个页面` }, { status: 400 });
  }

  type DeleteOutcome = { ok: true; id: string } | { ok: false; id: string; error: string };
  const outcomes = await processConcurrent<string, DeleteOutcome>(ids, BULK_CONCURRENCY, async (id) => {
    try {
      const existing = await getPageById(env, id);
      if (!existing) {
        return { ok: false, id, error: "页面不存在" };
      }
      await deletePage(env, id);
      return { ok: true, id };
    } catch (error) {
      return { ok: false, id, error: error instanceof Error ? error.message : "删除失败" };
    }
  });

  const deletedIds: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const outcome of outcomes) {
    if (outcome.ok) deletedIds.push(outcome.id);
    else failed.push({ id: outcome.id, error: outcome.error });
  }

  return Response.json({
    message: `已删除 ${deletedIds.length} 个页面${failed.length ? `，${failed.length} 个失败` : ""}`,
    deletedIds,
    failed,
  });
}
