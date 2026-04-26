import { useContext, type PropsWithChildren, type ReactNode } from "react";
import { NavigationContext } from "../App";
import { logout } from "../lib/api";
import { Button, Container, Shell, ThemeToggle } from "./ui";

const navItems = [
  { key: "sites", label: "站点", href: "/admin/sites" },
  { key: "pages", label: "页面", href: "/admin/pages" },
  { key: "settings", label: "设置", href: "/admin/settings" },
] as const;

function AdminLink({
  href,
  className,
  children,
}: PropsWithChildren<{ href: string; className?: string }>) {
  const { navigate, prefetch } = useContext(NavigationContext);
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        navigate(href);
      }}
      onMouseEnter={() => prefetch(href)}
      onFocus={() => prefetch(href)}
    >
      {children}
    </a>
  );
}

export function AdminLayout({
  active,
  title,
  description,
  actions,
  children,
}: PropsWithChildren<{
  active: "sites" | "pages" | "settings" | "login";
  title?: string;
  description?: string;
  actions?: ReactNode;
}>) {
  if (active === "login") {
    return <Shell publicMode>{children}</Shell>;
  }

  return (
    <Shell>
      <Container wide>
        <div className="admin-shell">
          <header className="topbar">
            <AdminLink className="brand" href="/admin/sites">Page Mirror</AdminLink>
            <nav className="top-nav">
              {navItems.map((item) => (
                <AdminLink key={item.key} className={`nav-link ${active === item.key ? "active" : ""}`.trim()} href={item.href}>
                  {item.label}
                </AdminLink>
              ))}
            </nav>
            <div className="header-actions">
              <ThemeToggle />
              <Button variant="danger" className="btn-small logout-btn" onClick={() => void logout()}>退出</Button>
            </div>
          </header>

          <main className="admin-main">
            <div className="page-header">
              <div>
                {title ? <h1 className="page-title">{title}</h1> : null}
                {description ? <p className="page-description">{description}</p> : null}
              </div>
              {actions ? <div className="page-actions">{actions}</div> : null}
            </div>
            {children}
          </main>
        </div>
      </Container>
    </Shell>
  );
}
