import { FormEvent, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Banner, Button, GlassCard, Input, Label } from "../components/ui";
import { logout, updateAdminPassword } from "../lib/api";
import type { AppData } from "../lib/types";

export function SettingsPage({ initialData }: { initialData: AppData }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(initialData.message || "");
  const [error, setError] = useState(initialData.error || "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const result = await updateAdminPassword({ password, confirmPassword });
      setMessage(result.message);
      await logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout active="settings">
      <div className="toast-stack">
        <Banner message={message} />
        <Banner message={error} tone="error" />
      </div>

      <GlassCard className="settings-card">
        <div className="form-head">
          <h2>修改管理员密码</h2>
        </div>
        <form className="stack-md" onSubmit={onSubmit}>
          <Label title="新密码">
            <Input type="password" placeholder="请输入新密码" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </Label>
          <Label title="确认新密码">
            <Input type="password" placeholder="请再次输入新密码" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </Label>
          <div className="toolbar-end">
            <Button type="submit" isLoading={submitting}>保存密码</Button>
          </div>
        </form>
      </GlassCard>
    </AdminLayout>
  );
}
