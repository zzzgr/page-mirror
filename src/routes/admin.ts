import { listPages, listSites } from "../lib/db";
import type { Env } from "../lib/types";
import { readForm, redirect } from "../lib/utils";
import { renderAppShell } from "../templates/app-shell";

export async function handleAdminPage(request: Request, env: Env) {
  const url = new URL(request.url);

  if (url.pathname === "/admin") {
    return redirect("/admin/sites");
  }

  if (url.pathname === "/admin/login" && request.method === "GET") {
    return renderAppShell("登录", {
      route: "login",
      error: url.searchParams.get("error") ?? undefined,
    });
  }

  if (url.pathname === "/admin/sites") {
    const sites = await listSites(env);

    return renderAppShell("站点", {
      route: "sites",
      sites,
      message: url.searchParams.get("message") ?? undefined,
      error: url.searchParams.get("error") ?? undefined,
    });
  }

  if (url.pathname === "/admin/pages") {
    const selectedSiteId = url.searchParams.get("siteId");
    const [sites, pages] = await Promise.all([
      listSites(env),
      listPages(env, selectedSiteId || undefined),
    ]);

    return renderAppShell("页面", {
      route: "pages",
      sites,
      pages,
      selectedSiteId,
      message: url.searchParams.get("message") ?? undefined,
      error: url.searchParams.get("error") ?? undefined,
    });
  }

  if (url.pathname === "/admin/settings") {
    return renderAppShell("设置", {
      route: "settings",
      message: url.searchParams.get("message") ?? undefined,
      error: url.searchParams.get("error") ?? undefined,
    });
  }

  return new Response("Not Found", { status: 404 });
}

export async function readLoginForm(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await request.json()) as { password?: string };
    return payload.password?.trim() || "";
  }

  const values = await readForm(request);
  return values.password || "";
}
