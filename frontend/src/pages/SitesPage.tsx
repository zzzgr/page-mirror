import { useEffect, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Banner, Button, ConfirmDialog, EmptyState, GlassCard, Input, Label, Modal, Textarea } from "../components/ui";
import { createSite, deleteSite, getSite, listSites, updateSite } from "../lib/api";
import type { AppData, Site } from "../lib/types";

const emptyForm = {
  domain: "",
  headers: "",
  note: "",
};

export function SitesPage({ initialData }: { initialData: AppData }) {
  const [sites, setSites] = useState<Site[]>(initialData.sites || []);
  const [message, setMessage] = useState(initialData.message || "");
  const [error, setError] = useState(initialData.error || "");
  const [submitting, setSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [detailSite, setDetailSite] = useState<Site | null>(null);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirm, setConfirm] = useState<{ open: boolean; siteId: string; deleting: boolean }>({ open: false, siteId: "", deleting: false });

  useEffect(() => {
    if (!initialData.sites) {
      void reloadSites();
    }
  }, []);

  async function reloadSites() {
    try {
      const result = await listSites();
      setSites(result.sites);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载站点失败");
    }
  }

  function openCreateModal() {
    setForm(emptyForm);
    setEditingSiteId(null);
    setModalMode("create");
    setError("");
    setMessage("");
  }

  async function openDetailModal(siteId: string) {
    setError("");
    try {
      const result = await getSite(siteId);
      setDetailSite(result.site);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载站点失败");
    }
  }

  async function openEditModal(siteId: string) {
    setError("");
    setMessage("");
    try {
      const result = await getSite(siteId);
      setForm({
        domain: result.site.domain,
        headers: result.site.headers || "",
        note: result.site.note || "",
      });
      setEditingSiteId(siteId);
      setDetailSite(null);
      setModalMode("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载站点失败");
    }
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (modalMode === "edit" && editingSiteId) {
        const result = await updateSite(editingSiteId, form);
        setSites((current) => current.map((site) => (site.id === result.site.id ? { ...site, ...result.site } : site)));
        setMessage(result.message);
      } else {
        const result = await createSite(form);
        setSites((current) => [result.site, ...current]);
        setMessage(result.message);
      }
      setModalMode(null);
      setEditingSiteId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function doDelete() {
    const { siteId } = confirm;
    setConfirm((c) => ({ ...c, deleting: true }));
    setError("");
    setMessage("");
    try {
      const result = await deleteSite(siteId);
      setMessage(result.message);
      setSites((current) => current.filter((site) => site.id !== siteId));
      if (detailSite?.id === siteId) {
        setDetailSite(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setConfirm({ open: false, siteId: "", deleting: false });
    }
  }

  return (
    <AdminLayout active="sites">
      <div className="toast-stack">
        <Banner message={message} />
        <Banner message={error} tone="error" />
      </div>

      <GlassCard className="table-card">
        <div className="table-header">
          <strong>站点列表 · {sites.length} 个</strong>
          <div className="toolbar-actions-group">
            <Button className="btn-small" onClick={openCreateModal}>新增站点</Button>
          </div>
        </div>

        {sites.length === 0 ? (
          <EmptyState title="还没有站点" description="先添加一个域名，再创建页面快照。" action={<Button onClick={openCreateModal}>创建站点</Button>} />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>域名</th>
                  <th>备注</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td><strong>{site.domain}</strong></td>
                    <td>{site.note || <span className="muted">无备注</span>}</td>
                    <td>{site.created_at}</td>
                    <td>
                      <div className="table-actions">
                        <Button variant="ghost" className="btn-small" onClick={() => void openDetailModal(site.id)}>详情</Button>
                        <Button variant="secondary" className="btn-small" onClick={() => void openEditModal(site.id)}>编辑</Button>
                        <Button variant="danger" className="btn-small" onClick={() => setConfirm({ open: true, siteId: site.id, deleting: false })}>删除</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal open={detailSite !== null && modalMode !== "edit"} title="站点详情" onClose={() => setDetailSite(null)}>
        {detailSite ? (
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">域名</div>
              <div className="detail-value">{detailSite.domain}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">备注</div>
              <div className="detail-value">{detailSite.note || "无备注"}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">请求 Header</div>
              <div className="detail-value">{detailSite.headers ? <pre className="headers-preview">{detailSite.headers}</pre> : "未配置"}</div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={modalMode !== null}
        title={modalMode === "edit" ? "编辑站点" : "新增站点"}
        onClose={() => {
          setModalMode(null);
          setEditingSiteId(null);
          setForm(emptyForm);
        }}
        actions={(
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setModalMode(null);
                setEditingSiteId(null);
                setForm(emptyForm);
              }}
            >
              取消
            </Button>
            <Button onClick={() => void submit()} isLoading={submitting}>
              保存
            </Button>
          </>
        )}
      >
        <div className="stack-md">
          <Label title="域名">
            <Input placeholder="example.com" value={form.domain} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} />
          </Label>
          <Label title="请求 Header" description="每行一个 Header，格式为 Key: Value，可留空。">
            <Textarea
              placeholder={"Cookie: foo=bar\nAuthorization: Bearer xxx"}
              value={form.headers}
              onChange={(event) => setForm((current) => ({ ...current, headers: event.target.value }))}
            />
          </Label>
          <Label title="备注">
            <Input placeholder="例如：论坛主站" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
          </Label>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="确认删除"
        message="确认删除这个站点吗？"
        confirmLabel="删除"
        isLoading={confirm.deleting}
        onConfirm={() => void doDelete()}
        onClose={() => setConfirm({ open: false, siteId: "", deleting: false })}
      />
    </AdminLayout>
  );
}
