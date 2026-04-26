import { cleanupExpiredSessions, createSession, deleteSessionByHash, getSessionByHash, getSystemSettings } from "./db";
import type { Env } from "./types";
import { nowIso, randomId, randomToken, redirect, sha256Hex } from "./utils";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getCookieName(env: Env) {
  return env.SESSION_COOKIE_NAME || "page_mirror_session";
}

function parseCookies(request: Request) {
  const header = request.headers.get("Cookie") || "";
  return Object.fromEntries(
    header
      .split(/;\s*/)
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function cookieSecurity(request: Request) {
  return new URL(request.url).protocol === "https:" ? "; Secure" : "";
}

function sessionCookie(request: Request, env: Env, token: string, expiresAt: Date) {
  return `${getCookieName(env)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${cookieSecurity(request)}; Expires=${expiresAt.toUTCString()}`;
}

function clearCookie(request: Request, env: Env) {
  return `${getCookieName(env)}=; Path=/; HttpOnly; SameSite=Lax${cookieSecurity(request)}; Max-Age=0`;
}

export async function login(env: Env, password: string) {
  const settings = await getSystemSettings(env);
  if (!settings) {
    throw new Error("系统设置不存在");
  }

  const passwordHash = await sha256Hex(password);
  if (passwordHash !== settings.admin_password_hash) {
    return null;
  }

  const token = randomToken();
  const hash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await cleanupExpiredSessions(env, now.toISOString());
  await createSession(env, {
    id: randomId(),
    session_token_hash: hash,
    expires_at: expiresAt.toISOString(),
    created_at: nowIso(),
  });

  return {
    token,
    expiresAt,
  };
}

export async function requireAdmin(request: Request, env: Env) {
  const token = parseCookies(request)[getCookieName(env)];
  if (!token) return false;

  const hash = await sha256Hex(token);
  const session = await getSessionByHash(env, hash);
  if (!session) return false;

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await deleteSessionByHash(env, hash);
    return false;
  }

  return true;
}

export function withLoginCookie(request: Request, env: Env, token: string, expiresAt: Date, location = "/admin/sites") {
  const response = redirect(location);
  response.headers.set("Set-Cookie", sessionCookie(request, env, token, expiresAt));
  return response;
}

export async function logout(request: Request, env: Env) {
  const token = parseCookies(request)[getCookieName(env)];
  if (token) {
    const hash = await sha256Hex(token);
    await deleteSessionByHash(env, hash);
  }

  const response = redirect("/admin/login");
  response.headers.set("Set-Cookie", clearCookie(request, env));
  return response;
}

export function unauthorizedPage() {
  return redirect("/admin/login");
}

export function unauthorizedApi() {
  return Response.json({ error: "未登录或会话已失效" }, { status: 401 });
}
