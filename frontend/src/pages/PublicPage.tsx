import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { Banner, Container, Shell } from "../components/ui";
import { getPublicPage } from "../lib/api";
import type { AppData, PublicPageData } from "../lib/types";

type LightboxImage = { src: string; alt: string };

type LightboxState =
  | { open: false }
  | { open: true; images: LightboxImage[]; index: number };

const SWIPE_THRESHOLD = 50;

export function PublicPage({ initialData, shareId }: { initialData: AppData; shareId?: string }) {
  const [page, setPage] = useState<PublicPageData | null>(initialData.publicPage || null);
  const [error, setError] = useState(initialData.error || "");
  const [lightbox, setLightbox] = useState<LightboxState>({ open: false });
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!page && shareId) {
      void getPublicPage(shareId)
        .then((result) => setPage(result.page))
        .catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
    }
  }, [page, shareId]);

  const title = useMemo(() => page?.title || "阅读页", [page]);

  const openLightboxFromTarget = useCallback((target: HTMLImageElement) => {
    const root = contentRef.current;
    if (!root) return;
    const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
    if (imgs.length === 0) return;
    const idx = imgs.indexOf(target);
    if (idx < 0) return;
    setLightbox({
      open: true,
      images: imgs.map((img) => ({ src: img.currentSrc || img.src, alt: img.alt })),
      index: idx,
    });
  }, []);

  function handleContentClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.tagName !== "IMG") return;
    event.preventDefault();
    openLightboxFromTarget(target as HTMLImageElement);
  }

  const closeLightbox = useCallback(() => {
    setLightbox({ open: false });
  }, []);

  const gotoIndex = useCallback((next: number) => {
    setLightbox((current) => {
      if (!current.open) return current;
      if (next < 0 || next >= current.images.length) return current;
      return { ...current, index: next };
    });
  }, []);

  return (
    <Shell publicMode>
      <Container narrow>
        <div className="public-wrap">
          <div className="toast-stack">
            <Banner message={error} tone="error" />
          </div>
          {page ? (
            <article className="public-article">
              <header className="public-header">
                <h1 className="public-title">{title}</h1>
              </header>
              <div
                ref={contentRef}
                className="public-content prose-mirror"
                onClick={handleContentClick}
                dangerouslySetInnerHTML={{ __html: page.htmlContent }}
              />
            </article>
          ) : (
            <div className="public-loading">正在加载内容...</div>
          )}
        </div>
      </Container>
      {lightbox.open ? (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={closeLightbox}
          onIndexChange={gotoIndex}
        />
      ) : null}
    </Shell>
  );
}

function ImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveRef = useRef<Element | null>(null);
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  const current = images[index];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else if (event.key === "ArrowRight" && index < images.length - 1) onIndexChange(index + 1);
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, images.length, onClose, onIndexChange]);

  useEffect(() => {
    previousActiveRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    return () => {
      const previous = previousActiveRef.current;
      if (previous instanceof HTMLElement) previous.focus?.();
    };
  }, []);

  useEffect(() => {
    [images[index - 1], images[index + 1]].forEach((target) => {
      if (!target) return;
      const img = new Image();
      img.src = target.src;
    });
  }, [index, images]);

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const dx = event.changedTouches[0].clientX - touchStartX.current;
    const dy = event.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx > 0 && hasPrev) onIndexChange(index - 1);
    else if (dx < 0 && hasNext) onIndexChange(index + 1);
  }

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <a
        className="lightbox-action"
        href={current.src}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        aria-label="在新标签打开原图"
        title="原图"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
        </svg>
      </a>
      <button ref={closeButtonRef} className="lightbox-close" type="button" aria-label="关闭" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      {hasPrev ? (
        <button
          className="lightbox-nav lightbox-prev"
          type="button"
          aria-label="上一张"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index - 1);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      ) : null}
      {hasNext ? (
        <button
          className="lightbox-nav lightbox-next"
          type="button"
          aria-label="下一张"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index + 1);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      ) : null}
      <img
        key={current.src}
        className="lightbox-image"
        src={current.src}
        alt={current.alt}
        draggable={false}
      />
      {images.length > 1 ? (
        <div className="lightbox-counter">{index + 1} / {images.length}</div>
      ) : null}
    </div>
  );
}
