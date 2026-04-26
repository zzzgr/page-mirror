import { getPageWithSiteByShareId } from "../lib/db";
import type { Env } from "../lib/types";
import { renderAppShell } from "../templates/app-shell";

export async function handlePublicPage(request: Request, env: Env) {
  const url = new URL(request.url);
  const shareId = url.pathname.slice(3);
  const page = await getPageWithSiteByShareId(env, shareId);

  if (!page) {
    return new Response("页面不存在", { status: 404 });
  }

  return renderAppShell(page.title || "未命名页面", {
    route: "public",
    publicPage: {
      title: page.title || "未命名页面",
      htmlContent: page.snapshot_html,
    },
  });
}
