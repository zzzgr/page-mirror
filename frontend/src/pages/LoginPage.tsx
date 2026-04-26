import { FormEvent, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Banner, Button, GlassCard, Input, Label } from "../components/ui";
import { login } from "../lib/api";
import type { AppData } from "../lib/types";

export function LoginPage({ initialData }: { initialData: AppData }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialData.error || "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login(password);
      window.location.href = result.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout active="login">
      <div className="login-page">
        <GlassCard className="login-card">
          <div className="toast-stack">
            <Banner message={error} tone="error" />
          </div>
          <div className="form-head">
            <h1>Page Mirror</h1>
            <p>管理员登录</p>
          </div>
          <form className="stack-md" onSubmit={onSubmit}>
            <Label title="管理员密码">
              <Input type="password" placeholder="请输入密码" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </Label>
            <Button className="btn-full" disabled={loading}>{loading ? "登录中..." : "登录"}</Button>
          </form>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
