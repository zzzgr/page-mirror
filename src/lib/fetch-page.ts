export function normalizeDomain(input: string) {
  const value = input.trim().toLowerCase();
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function isAllowedUrl(domain: string, sourceUrl: string) {
  const url = new URL(sourceUrl);
  const normalizedDomain = normalizeDomain(domain);
  return url.hostname === normalizedDomain || url.hostname.endsWith(`.${normalizedDomain}`);
}

export function formatHeadersForStorage(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error("请求 Header 格式不正确，请使用 Key: Value");
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key) {
      throw new Error("请求 Header 名不能为空");
    }

    const normalizedKey = key.toLowerCase();
    if (seen.has(normalizedKey)) {
      throw new Error(`请求 Header ${key} 重复`);
    }

    seen.add(normalizedKey);
    normalized.push(`${key}: ${value}`);
  }

  return normalized.join("\n");
}

export function hydrateStoredHeaders(input: string) {
  const value = input.trim();
  if (!value) return "";
  if (value.includes(":")) return value;
  return `Cookie: ${value}`;
}

export function parseStoredHeaders(input: string) {
  const normalized = formatHeadersForStorage(hydrateStoredHeaders(input));
  const headers = new Headers();

  for (const line of normalized.split("\n")) {
    if (!line) continue;
    const separatorIndex = line.indexOf(":");
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    headers.set(key, value);
  }

  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "Mozilla/5.0 (compatible; page-mirror/1.0; +https://workers.dev)");
  }

  return headers;
}

export async function fetchRemotePage(sourceUrl: string, headers: Headers) {
  const response = await fetch(sourceUrl, {
    headers,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`抓取失败，远程站点返回 ${response.status}`);
  }

  return response.text();
}
