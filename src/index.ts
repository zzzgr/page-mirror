import { login, logout, requireAdmin, unauthorizedApi, unauthorizedPage, withLoginCookie } from "./lib/auth";
import { ensureBootstrap } from "./lib/bootstrap";
import { prefersJson } from "./lib/http";
import type { Env } from "./lib/types";
import { handleAdminPage, readLoginForm } from "./routes/admin";
import { handlePagesApi } from "./routes/api-pages";
import { handlePublicApi } from "./routes/api-public";
import { handleSettingsApi } from "./routes/api-settings";
import { handleSitesApi } from "./routes/api-sites";
import { handlePublicPage } from "./routes/public";
import { renderAppShell } from "./templates/app-shell";

function handleHomePage() {
  return renderAppShell("Page Mirror", {
    route: "home",
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    await ensureBootstrap(env);
    const url = new URL(request.url);

    if (url.pathname === "/admin/login") {
      if (request.method === "GET") {
        return handleAdminPage(request, env);
      }

      if (request.method === "POST") {
        const password = await readLoginForm(request);
        const session = await login(env, password);
        if (!session) {
          if (prefersJson(request)) {
            return Response.json({ error: "密码错误" }, { status: 401 });
          }
          return new Response(null, {
            status: 302,
            headers: {
              Location: "/admin/login?error=" + encodeURIComponent("密码错误"),
            },
          });
        }

        const response = withLoginCookie(request, env, session.token, session.expiresAt);
        if (prefersJson(request)) {
          response.headers.delete("Location");
          return Response.json(
            { ok: true, redirectTo: "/admin/sites" },
            { headers: { "Set-Cookie": response.headers.get("Set-Cookie") || "" } },
          );
        }
        return response;
      }
    }

    if (url.pathname === "/admin/logout") {
      return logout(request, env);
    }

    if (url.pathname.startsWith("/admin")) {
      if (!(await requireAdmin(request, env))) {
        return unauthorizedPage();
      }
      return handleAdminPage(request, env);
    }

    if (url.pathname.startsWith("/api/admin/")) {
      if (!(await requireAdmin(request, env))) {
        return unauthorizedApi();
      }

      if (url.pathname.startsWith("/api/admin/sites")) {
        return handleSitesApi(request, env);
      }
      if (url.pathname.startsWith("/api/admin/pages")) {
        return handlePagesApi(request, env);
      }
      if (url.pathname.startsWith("/api/admin/settings")) {
        return handleSettingsApi(request, env);
      }
    }

    if (url.pathname.startsWith("/api/public/pages/")) {
      return handlePublicApi(request, env);
    }

    if (url.pathname.startsWith("/p/")) {
      return handlePublicPage(request, env);
    }

    if (url.pathname === "/" || url.pathname === "") {
      return handleHomePage();
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
