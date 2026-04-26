import { escapeHtml, html } from "../lib/utils";

export function renderAppShell(title: string, appData: unknown) {
  const payload = JSON.stringify(appData)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");

  return new Response(
    html`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <title>${escapeHtml(title)}</title>
    <script>(function(){try{var t=localStorage.getItem("page-mirror-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();window.__APP_DATA__ = ${payload};</script>
    <link rel="stylesheet" href="/assets/index.css">
    <script type="module" src="/assets/app.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
