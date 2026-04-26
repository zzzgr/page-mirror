import { parseHTML } from "linkedom";
import type { PageSnapshot } from "./types";

function sanitizeElement(root: Element) {
  root.querySelectorAll("script, iframe, object, embed, form, input, button, textarea, select").forEach((node) => node.remove());

  root.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name);
        continue;
      }
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    }
  });
}

export function extractSnapshot(rawHtml: string, selector: string, fallbackTitle = ""): PageSnapshot {
  const { document } = parseHTML(rawHtml);
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error("没有匹配到指定的 DOM 选择器");
  }

  sanitizeElement(element);

  const title = fallbackTitle || document.querySelector("title")?.textContent?.trim() || "未命名页面";
  return {
    title,
    html: element.innerHTML || element.outerHTML,
    text: element.textContent?.trim() || "",
  };
}
