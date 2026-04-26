import { useCallback, useEffect, useRef, useState, type MouseEvent, type PropsWithChildren, type ReactNode } from "react";

const THEME_KEY = "page-mirror-theme";

function getSystemTheme(): "dark" | "light" {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function getStoredTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return getSystemTheme();
}

function applyTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const current = getStoredTheme();
    setTheme(current);
    applyTheme(current);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <button className="theme-toggle" onClick={toggle} aria-label={theme === "dark" ? "切换浅色模式" : "切换深色模式"} type="button">
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd"/>
        </svg>
      )}
    </button>
  );
}

export function Shell({ children, publicMode = false }: PropsWithChildren<{ publicMode?: boolean }>) {
  return (
    <div className={publicMode ? "app-shell public-shell" : "app-shell"}>
      {publicMode ? <div className="floating-toggle"><ThemeToggle /></div> : null}
      {children}
    </div>
  );
}

export function Container({ children, wide = false, narrow = false }: PropsWithChildren<{ wide?: boolean; narrow?: boolean }>) {
  const cls = narrow ? "app-container public-container" : wide ? "app-container" : "app-container narrow-container";
  return <div className={cls}>{children}</div>;
}

export function GlassCard({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  return <div className={`panel-card ${className}`.trim()}>{children}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  isLoading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; isLoading?: boolean }) {
  return (
    <button className={`btn btn-${variant} ${className}`.trim()} disabled={props.disabled || isLoading} {...props}>
      {isLoading ? (
        <svg className="btn-spinner" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
          <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : null}
      {children ? <span className={isLoading ? "btn-label-loading" : ""}>{children}</span> : null}
    </button>
  );
}

type ErrorProps = { error?: string };

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & ErrorProps) {
  const { error, ...rest } = props;
  return (
    <div className="field-wrap">
      <input {...rest} className={`input ${error ? "input-error" : ""} ${props.className ?? ""}`.trim()} />
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & ErrorProps) {
  const { error, ...rest } = props;
  return (
    <div className="field-wrap">
      <textarea {...rest} className={`textarea ${error ? "input-error" : ""} ${props.className ?? ""}`.trim()} />
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement> & ErrorProps) {
  const { error, ...rest } = props;
  return (
    <div className="field-wrap">
      <span className={`select-wrap ${props.disabled ? "is-disabled" : ""}`.trim()}>
        <select {...rest} className={`select ${error ? "input-error" : ""} ${props.className ?? ""}`.trim()} />
        <span className="select-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" focusable="false">
            <path d="M4 6.5 8 10.5 12 6.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
        </span>
      </span>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

export function Label({ title, description, children }: PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <label className="label-group">
      <div>
        <div className="label-title">{title}</div>
        {description ? <div className="label-description">{description}</div> : null}
      </div>
      {children}
    </label>
  );
}

export function Banner({ message, tone = "info" }: { message?: string; tone?: "info" | "error" }) {
  const [visibleMessage, setVisibleMessage] = useState(message || "");
  const [phase, setPhase] = useState<"entering" | "visible" | "leaving">("entering");
  const hideTimerRef = useRef<number | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const duration = tone === "error" ? 3600 : 2600;

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
      if (animationTimerRef.current !== null) window.clearTimeout(animationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (animationTimerRef.current !== null) {
      window.clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    if (!message) {
      setPhase("leaving");
      animationTimerRef.current = window.setTimeout(() => setVisibleMessage(""), 180);
      return;
    }

    setVisibleMessage(message);
    setPhase("entering");
    animationTimerRef.current = window.setTimeout(() => setPhase("visible"), 16);
    hideTimerRef.current = window.setTimeout(() => {
      setPhase("leaving");
      animationTimerRef.current = window.setTimeout(() => {
        setVisibleMessage("");
      }, 180);
    }, duration);
  }, [duration, message]);

  if (!visibleMessage) return null;
  return (
    <div className={`banner banner-${phase} ${tone === "error" ? "error" : ""}`.trim()} role={tone === "error" ? "alert" : "status"}>
      <svg className="banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {tone === "error" ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="m8.5 12.5 2.5 2.5 4.5-5" />
          </>
        )}
      </svg>
      <span className="banner-message">{visibleMessage}</span>
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  actions,
  onClose,
  size = "md",
}: PropsWithChildren<{
  open: boolean;
  title: string;
  actions?: ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
}>) {
  if (!open) return null;

  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className={`modal-panel modal-${size}`.trim()} onClick={stopPropagation} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="theme-toggle" onClick={onClose} type="button" aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "确认",
  onConfirm,
  onClose,
  isLoading = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-panel modal-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
        </div>
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
        </div>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>取消</Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

