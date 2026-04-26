import { getPageByShareId } from "../lib/db";
import type { Env } from "../lib/types";

export async function handlePublicApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const shareId = url.pathname.replace("/api/public/pages/", "");
  const page = await getPageByShareId(env, shareId);

  if (!page) {
    return Response.json({ error: "页面不存在" }, { status: 404 });
  }

  return Response.json({
    page: {
      title: page.title || "未命名页面",
      htmlContent: page.snapshot_html,
    },
  });
}
