import { deleteAllSessions, updateAdminPasswordHash } from "../lib/db";
import { prefersJson } from "../lib/http";
import type { Env } from "../lib/types";
import { nowIso, readForm, sha256Hex } from "../lib/utils";

async function readPasswordPayload(request: Request) {
  if (prefersJson(request)) {
    const payload = (await request.json()) as { password?: string; confirmPassword?: string };
    return {
      password: payload.password?.trim() || "",
      confirmPassword: payload.confirmPassword?.trim() || "",
    };
  }

  const values = await readForm(request);
  return {
    password: values.password || "",
    confirmPassword: values.confirmPassword || "",
  };
}

export async function handleSettingsApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/admin/settings", "") || "/";

  if (request.method === "POST" && path === "/password") {
    const { password, confirmPassword } = await readPasswordPayload(request);

    if (!password) {
      return Response.json({ error: "新密码不能为空" }, { status: 400 });
    }

    if (password.length < 4) {
      return Response.json({ error: "新密码至少 4 位" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return Response.json({ error: "两次输入的密码不一致" }, { status: 400 });
    }

    await updateAdminPasswordHash(env, await sha256Hex(password), nowIso());
    await deleteAllSessions(env);
    return Response.json({ message: "密码已更新，请重新登录" });
  }

  return new Response("Not Found", { status: 404 });
}
