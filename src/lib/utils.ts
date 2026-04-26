export function html(strings: TemplateStringsArray, ...values: unknown[]) {
  return String.raw({ raw: strings }, ...values);
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function fromBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function randomId() {
  return crypto.randomUUID();
}

export function randomToken(bytes = 32) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function nowIso() {
  return new Date().toISOString();
}

export function redirect(location: string, status = 302) {
  return new Response(null, {
    status,
    headers: {
      Location: location,
    },
  });
}

export async function sha256Hex(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export async function readForm(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const values: Record<string, string> = {};

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await request.text());
    for (const [key, value] of params.entries()) {
      values[key] = value.trim();
    }
    return values;
  }

  const form = await request.formData();
  for (const [key, value] of form.entries()) {
    values[key] = typeof value === "string" ? value.trim() : "";
  }
  return values;
}

export function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

export function isMobileFriendlyViewport() {
  return '<meta name="viewport" content="width=device-width, initial-scale=1">';
}
