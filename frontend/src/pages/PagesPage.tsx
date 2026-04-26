import { useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "../components/AdminLayout";
import { Banner, Button, ConfirmDialog, EmptyState, GlassCard, Input, Label, Modal, Select, Textarea } from "../components/ui";
import {
  bulkCreatePages,
  bulkDeletePages,
  bulkRefreshPages,
  createPage,
  deletePage,
  getPage,
  listPages,
  listSites,
  refreshPage,
  updatePage,
} from "../lib/api";
import type { AppData, PageItem, Site } from "../lib/types";

const emptyForm = {
  siteId: "",
  title: "",
  sourceUrl: "",
  selector: "",
};

const BULK_LIMIT = 20;
const emptyBulkForm = { siteId: "", selector: "", urls: "" };

type BulkFailure =
  | { kind: "create"; items: { url: string; error: string }[] }
  | { kind: "refresh" | "delete"; items: { id: string; label: string; error: string }[] };

export function PagesPage({ initialData }: { initialData: AppData }) {
  const [sites, setSites] = useState<Site[]>(initialData.sites || []);
  const [pages, setPages] = useState<PageItem[]>(initialData.pages || []);
  const [selectedSiteId, setSelectedSiteId] = useState(initialData.selectedSiteId || "");
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [detailPage, setDetailPage] = useState<PageItem | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [message, setMessage] = useState(initialData.message || "");
  const [error, setError] = useState(initialData.error || "");
  const [submitting, setSubmitting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; pageId: string; deleting: boolean }>({ open: false, pageId: "", deleting: false });
  const [form, setForm] = useState({
    siteId: initialData.selectedSiteId || "",
    title: "",
    sourceUrl: "",
    selector: "",
  });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(emptyBulkForm);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{ open: boolean; deleting: boolean }>({ open: false, deleting: false });
  const [bulkFailure, setBulkFailure] = useState<BulkFailure | null>(null);

  useEffect(() => {
    if (!initialData.sites) {
      void reloadSites();
    }
    if (!initialData.pages) {
      void reloadPages(initialData.selectedSiteId || undefined);
    }
  }, []);

  useEffect(() => {
    setSelectedPageIds((current) => current.filter((id) => pages.some((page) => page.id === id)));
  }, [pages]);

  async function reloadSites() {
    const result = await listSites();
    setSites(result.sites);
  }

  async function reloadPages(siteId?: string) {
    try {
      const result = await listPages(siteId || undefined);
      setPages(result.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }

  const selectedPages = useMemo(() => pages.filter((page) => selectedPageIds.includes(page.id)), [pages, selectedPageIds]);
  const allSelected = pages.length > 0 && selectedPageIds.length === pages.length;
  const hasSelectedPages = selectedPageIds.length > 0;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = hasSelectedPages && !allSelected;
  }, [allSelected, hasSelectedPages]);

  function siteName(page: PageItem) {
    return page.site_domain || sites.find((site) => site.id === page.site_id)?.domain || "-";
  }

  function togglePageSelection(pageId: string, checked: boolean) {
    setSelectedPageIds((current) => {
      if (checked) return current.includes(pageId) ? current : [...current, pageId];
      return current.filter((id) => id !== pageId);
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedPageIds(checked ? pages.map((page) => page.id) : []);
  }

  async function copySelectedPages() {
    if (!selectedPages.length) return;
    setMessage("");
    setError("");

    try {
      const text = selectedPages
        .map((page) => `${page.title || "未命名页面"}\n${window.location.origin}/p/${page.share_id}`)
        .join("\n\n");
      await navigator.clipboard.writeText(text);
      setMessage(`已复制 ${selectedPages.length} 条分享内容`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "复制失败");
    }
  }

  async function copyBulkFailures() {
    if (!bulkFailure) return;
    const lines = bulkFailure.kind === "create"
      ? bulkFailure.items.map((item) => item.url)
      : bulkFailure.items.map((item) => item.label);
    if (lines.length === 0) return;
    setMessage("");
    setError("");
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setMessage(`已复制 ${lines.length} 条失败链接`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "复制失败");
    }
  }

  function openCreateModal() {
    setForm({ ...emptyForm, siteId: selectedSiteId || "" });
    setEditingPageId(null);
    setModalMode("create");
    setError("");
    setMessage("");
  }

  async function openDetailModal(pageId: string) {
    setError("");
    try {
      const result = await getPage(pageId);
      setDetailPage(result.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载页面失败");
    }
  }

  async function openEditModal(pageId: string) {
    setError("");
    setMessage("");
    try {
      const result = await getPage(pageId);
      setForm({
        siteId: result.page.site_id,
        title: result.page.title || "",
        sourceUrl: result.page.source_url,
        selector: result.page.selector,
      });
      setEditingPageId(pageId);
      setDetailPage(null);
      setModalMode("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载页面失败");
    }
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      if (modalMode === "edit" && editingPageId) {
        const result = await updatePage(editingPageId, form);
        setPages((current) => current.map((page) => (page.id === result.page.id ? result.page : page)));
        setMessage(result.message);
      } else {
        const result = await createPage(form);
        setPages((current) => [result.page, ...current]);
        setMessage(result.message);
      }
      setModalMode(null);
      setEditingPageId(null);
      setForm({ ...emptyForm, siteId: selectedSiteId || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function doDelete() {
    const { pageId } = confirm;
    setConfirm((c) => ({ ...c, deleting: true }));
    setError("");
    setMessage("");
    try {
      const result = await deletePage(pageId);
      setMessage(result.message);
      setPages((current) => current.filter((page) => page.id !== pageId));
      if (detailPage?.id === pageId) {
        setDetailPage(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setConfirm({ open: false, pageId: "", deleting: false });
    }
  }

  async function doRefresh(id: string) {
    setError("");
    setMessage("");
    setRefreshingId(id);
    try {
      const result = await refreshPage(id);
      setMessage(result.message);
      setPages((current) => current.map((page) => (page.id === result.page.id ? result.page : page)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "刷新失败");
    } finally {
      setRefreshingId(null);
    }
  }

  async function onChangeSiteFilter(siteId: string) {
    setSelectedSiteId(siteId);
    setForm((current) => ({ ...current, siteId }));
    await reloadPages(siteId || undefined);
  }

  const parsedBulkUrls = useMemo(
    () =>
      Array.from(
        new Set(
          bulkForm.urls
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0),
        ),
      ),
    [bulkForm.urls],
  );

  function openBulkModal() {
    setBulkForm({ siteId: selectedSiteId || "", selector: "", urls: "" });
    setBulkOpen(true);
    setError("");
    setMessage("");
    setBulkFailure(null);
  }

  function closeBulkModal() {
    setBulkOpen(false);
    setBulkForm(emptyBulkForm);
  }

  async function submitBulkCreate() {
    if (!bulkForm.siteId || !bulkForm.selector || parsedBulkUrls.length === 0) return;
    if (parsedBulkUrls.length > BULK_LIMIT) {
      setError(`最多一次创建 ${BULK_LIMIT} 个页面`);
      return;
    }
    setBulkSubmitting(true);
    setError("");
    setMessage("");
    setBulkFailure(null);
    try {
      const result = await bulkCreatePages({
        siteId: bulkForm.siteId,
        selector: bulkForm.selector.trim(),
        urls: parsedBulkUrls,
      });
      if (result.created.length > 0) {
        setPages((current) => [...result.created, ...current]);
      }
      setMessage(result.message);
      if (result.failed.length > 0) {
        setBulkFailure({ kind: "create", items: result.failed });
      }
      if (result.created.length > 0) {
        closeBulkModal();
      } else {
        setBulkForm((current) => ({
          ...current,
          urls: result.failed.map((item) => item.url).join("\n"),
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "批量创建失败");
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function doBulkRefresh() {
    if (!hasSelectedPages) return;
    if (selectedPageIds.length > BULK_LIMIT) {
      setError(`最多一次刷新 ${BULK_LIMIT} 个页面`);
      return;
    }
    setBulkRefreshing(true);
    setError("");
    setMessage("");
    setBulkFailure(null);
    try {
      const result = await bulkRefreshPages(selectedPageIds);
      if (result.refreshed.length > 0) {
        const refreshedById = new Map(result.refreshed.map((page) => [page.id, page]));
        setPages((current) => current.map((page) => refreshedById.get(page.id) ?? page));
      }
      setMessage(result.message);
      if (result.failed.length > 0) {
        const items = result.failed.map((failure) => {
          const page = pages.find((p) => p.id === failure.id);
          return {
            id: failure.id,
            label: page?.title || page?.source_url || failure.id,
            error: failure.error,
          };
        });
        setBulkFailure({ kind: "refresh", items });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "批量刷新失败");
    } finally {
      setBulkRefreshing(false);
    }
  }

  async function doBulkDelete() {
    if (!hasSelectedPages) return;
    if (selectedPageIds.length > BULK_LIMIT) {
      setError(`最多一次删除 ${BULK_LIMIT} 个页面`);
      setBulkDeleteConfirm({ open: false, deleting: false });
      return;
    }
    setBulkDeleteConfirm((current) => ({ ...current, deleting: true }));
    setError("");
    setMessage("");
    setBulkFailure(null);
    try {
      const result = await bulkDeletePages(selectedPageIds);
      const deletedSet = new Set(result.deletedIds);
      if (deletedSet.size > 0) {
        setPages((current) => current.filter((page) => !deletedSet.has(page.id)));
        setSelectedPageIds((current) => current.filter((id) => !deletedSet.has(id)));
      }
      setMessage(result.message);
      if (result.failed.length > 0) {
        const items = result.failed.map((failure) => {
          const page = pages.find((p) => p.id === failure.id);
          return {
            id: failure.id,
            label: page?.title || page?.source_url || failure.id,
            error: failure.error,
          };
        });
        setBulkFailure({ kind: "delete", items });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "批量删除失败");
    } finally {
      setBulkDeleteConfirm({ open: false, deleting: false });
    }
  }

  return (
    <AdminLayout active="pages">
      <div className="toast-stack">
        <Banner message={message} />
        <Banner message={error} tone="error" />
      </div>

      {bulkFailure ? (
        <GlassCard className="bulk-failure-panel">
          <div className="bulk-failure-header">
            <strong>
              {bulkFailure.kind === "create" ? "批量创建" : bulkFailure.kind === "refresh" ? "批量刷新" : "批量删除"}部分失败 · {bulkFailure.items.length} 项
            </strong>
            <div className="toolbar-actions-group">
              <Button variant="secondary" className="btn-small" onClick={() => void copyBulkFailures()}>复制 {bulkFailure.items.length}</Button>
              <Button variant="ghost" className="btn-small" onClick={() => setBulkFailure(null)}>关闭</Button>
            </div>
          </div>
          <ul className="bulk-failure-list">
            {bulkFailure.kind === "create"
              ? bulkFailure.items.map((item) => (
                  <li key={item.url}>
                    <span className="bulk-failure-label" title={item.url}>{item.url}</span>
                    <span className="bulk-failure-error">{item.error}</span>
                  </li>
                ))
              : bulkFailure.items.map((item) => (
                  <li key={item.id}>
                    <span className="bulk-failure-label" title={item.label}>{item.label}</span>
                    <span className="bulk-failure-error">{item.error}</span>
                  </li>
                ))}
          </ul>
        </GlassCard>
      ) : null}

      <GlassCard className="table-card">
        <div className="table-header">
          <strong>页面列表 · {pages.length} 个{hasSelectedPages ? `（已选 ${selectedPageIds.length}）` : ""}</strong>
          <div className="toolbar-actions-group">
            <Select value={selectedSiteId} onChange={(event) => void onChangeSiteFilter(event.target.value)}>
              <option value="">全部站点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.domain}</option>
              ))}
            </Select>
            {hasSelectedPages ? (
              <>
                <Button variant="secondary" className="btn-small" onClick={() => void copySelectedPages()}>复制 {selectedPageIds.length}</Button>
                <Button variant="secondary" className="btn-small" onClick={() => void doBulkRefresh()} isLoading={bulkRefreshing}>刷新 {selectedPageIds.length}</Button>
                <Button variant="danger" className="btn-small" onClick={() => setBulkDeleteConfirm({ open: true, deleting: false })}>删除 {selectedPageIds.length}</Button>
              </>
            ) : null}
            <Button variant="secondary" className="btn-small" onClick={openBulkModal}>批量新增</Button>
            <Button className="btn-small" onClick={openCreateModal}>新增页面</Button>
          </div>
        </div>

        {pages.length === 0 ? (
          <EmptyState title="还没有页面" description="选择站点、填写 URL 和选择器后开始抓取。" action={<Button onClick={openCreateModal}>创建页面</Button>} />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="checkbox-column">
                    <input
                      ref={selectAllRef}
                      className="table-checkbox"
                      type="checkbox"
                      aria-label="全选当前页面"
                      checked={allSelected}
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                    />
                  </th>
                  <th>标题</th>
                  <th>站点</th>
                  <th>源 URL</th>
                  <th>选择器</th>
                  <th>最近抓取</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id}>
                    <td className="checkbox-column">
                      <input
                        className="table-checkbox"
                        type="checkbox"
                        aria-label={`选择页面 ${page.title || page.share_id}`}
                        checked={selectedPageIds.includes(page.id)}
                        onChange={(event) => togglePageSelection(page.id, event.target.checked)}
                      />
                    </td>
                    <td>
                      <strong>{page.title || "未命名页面"}</strong>
                      <div className="cell-subtitle">{page.share_id}</div>
                    </td>
                    <td>{siteName(page)}</td>
                    <td className="break-all" title={page.source_url}>{page.source_url}</td>
                    <td><span className="code-inline">{page.selector}</span></td>
                    <td>{page.last_fetched_at || <span className="muted">未抓取</span>}</td>
                    <td>
                      <div className="table-actions">
                        <a className="btn btn-secondary btn-small" href={`/p/${page.share_id}`} target="_blank" rel="noreferrer">分享</a>
                        <Button variant="ghost" className="btn-small" onClick={() => void openDetailModal(page.id)}>详情</Button>
                        <Button variant="secondary" className="btn-small" onClick={() => void openEditModal(page.id)}>编辑</Button>
                        <Button variant="ghost" className="btn-small" onClick={() => void doRefresh(page.id)} isLoading={refreshingId === page.id}>刷新</Button>
                        <Button variant="danger" className="btn-small" onClick={() => setConfirm({ open: true, pageId: page.id, deleting: false })}>删除</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal open={detailPage !== null && modalMode !== "edit"} title="页面详情" onClose={() => setDetailPage(null)} size="lg">
        {detailPage ? (
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">标题</div>
              <div className="detail-value">{detailPage.title || "未命名页面"}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">站点</div>
              <div className="detail-value">{siteName(detailPage)}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">源 URL</div>
              <div className="detail-value">{detailPage.source_url}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">DOM 选择器</div>
              <div className="detail-value"><span className="code-inline">{detailPage.selector}</span></div>
            </div>
            <div className="detail-item">
              <div className="detail-label">分享页</div>
              <div className="detail-value"><a className="inline-link" href={`/p/${detailPage.share_id}`} target="_blank" rel="noreferrer">/p/{detailPage.share_id}</a></div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={modalMode !== null}
        title={modalMode === "edit" ? "编辑页面" : "新增页面"}
        onClose={() => {
          setModalMode(null);
          setEditingPageId(null);
          setForm({ ...emptyForm, siteId: selectedSiteId || "" });
        }}
        size="lg"
        actions={(
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setModalMode(null);
                setEditingPageId(null);
                setForm({ ...emptyForm, siteId: selectedSiteId || "" });
              }}
            >
              取消
            </Button>
            <Button onClick={() => void submit()} isLoading={submitting}>
              {modalMode === "edit" ? "保存并刷新" : "创建并抓取"}
            </Button>
          </>
        )}
      >
        <div className="stack-md">
          <Label title="所属站点">
            <Select value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value }))}>
              <option value="">请选择站点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.domain}</option>
              ))}
            </Select>
          </Label>
          <Label title="标题">
            <Input placeholder="可选，留空则使用抓取标题" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </Label>
          <Label title="帖子 URL">
            <Input type="url" placeholder="https://example.com/post/123" value={form.sourceUrl} onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} />
          </Label>
          <Label title="DOM 选择器">
            <Input placeholder="article, .content, #main" value={form.selector} onChange={(event) => setForm((current) => ({ ...current, selector: event.target.value }))} />
          </Label>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        title="确认删除"
        message="确认删除这个页面吗？"
        confirmLabel="删除"
        isLoading={confirm.deleting}
        onConfirm={() => void doDelete()}
        onClose={() => setConfirm({ open: false, pageId: "", deleting: false })}
      />

      <Modal
        open={bulkOpen}
        title="批量新增页面"
        size="lg"
        onClose={closeBulkModal}
        actions={(
          <>
            <Button variant="ghost" type="button" onClick={closeBulkModal}>取消</Button>
            <Button
              onClick={() => void submitBulkCreate()}
              isLoading={bulkSubmitting}
              disabled={!bulkForm.siteId || !bulkForm.selector.trim() || parsedBulkUrls.length === 0 || parsedBulkUrls.length > BULK_LIMIT}
            >
              {parsedBulkUrls.length > 0 ? `创建 ${parsedBulkUrls.length} 个` : "创建"}
            </Button>
          </>
        )}
      >
        <div className="stack-md">
          <Label title="所属站点" description="所有 URL 共用一个站点">
            <Select value={bulkForm.siteId} onChange={(event) => setBulkForm((current) => ({ ...current, siteId: event.target.value }))}>
              <option value="">请选择站点</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.domain}</option>
              ))}
            </Select>
          </Label>
          <Label title="DOM 选择器" description="所有页面共用此选择器">
            <Input placeholder="article, .content, #main" value={bulkForm.selector} onChange={(event) => setBulkForm((current) => ({ ...current, selector: event.target.value }))} />
          </Label>
          <Label title="URL 列表" description={`每行一个 URL，最多 ${BULK_LIMIT} 个（当前 ${parsedBulkUrls.length}/${BULK_LIMIT}${parsedBulkUrls.length > BULK_LIMIT ? "，已超出" : ""}）`}>
            <Textarea
              placeholder={"https://example.com/post/1\nhttps://example.com/post/2"}
              rows={10}
              value={bulkForm.urls}
              onChange={(event) => setBulkForm((current) => ({ ...current, urls: event.target.value }))}
            />
          </Label>
        </div>
      </Modal>

      <ConfirmDialog
        open={bulkDeleteConfirm.open}
        title="批量删除"
        message={`确认删除选中的 ${selectedPageIds.length} 个页面吗？`}
        confirmLabel="删除"
        isLoading={bulkDeleteConfirm.deleting}
        onConfirm={() => void doBulkDelete()}
        onClose={() => setBulkDeleteConfirm({ open: false, deleting: false })}
      />
    </AdminLayout>
  );
}
