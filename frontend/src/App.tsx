import { createContext, useCallback, useEffect, useRef, useState } from "react";
import * as api from "./lib/api";
import type { AppData } from "./lib/types";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { PagesPage } from "./pages/PagesPage";
import { PublicPage } from "./pages/PublicPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SitesPage } from "./pages/SitesPage";

interface NavigationApi {
  navigate: (href: string) => void;
  prefetch: (href: string) => void;
}

export const NavigationContext = createContext<NavigationApi>({
  navigate: () => {},
  prefetch: () => {},
});

const prefetchCache = new Map<string, Promise<AppData>>();

function currentHref(): string {
  return window.location.pathname + window.location.search;
}

async function fetchForRoute(href: string): Promise<AppData> {
  const url = new URL(href, window.location.origin);
  const path = url.pathname;
  if (path === "/admin/sites") {
    const { sites } = await api.listSites();
    return { route: "sites", sites };
  }
  if (path === "/admin/pages") {
    const siteId = url.searchParams.get("siteId") || "";
    const [sitesRes, pagesRes] = await Promise.all([api.listSites(), api.listPages(siteId)]);
    return { route: "pages", sites: sitesRes.sites, pages: pagesRes.pages, selectedSiteId: siteId };
  }
  if (path === "/admin/settings") {
    return { route: "settings" };
  }
  throw new Error("unsupported route");
}

function loadRoute(href: string): Promise<AppData> {
  const cached = prefetchCache.get(href);
  if (cached) {
    prefetchCache.delete(href);
    return cached;
  }
  return fetchForRoute(href);
}

function withTransition(callback: () => void) {
  const startViewTransition = (document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  }).startViewTransition;
  if (typeof startViewTransition === "function") {
    startViewTransition.call(document, callback);
  } else {
    callback();
  }
}

export default function App({ initialData }: { initialData: AppData }) {
  const [data, setData] = useState<AppData>(initialData);
  const navTokenRef = useRef(0);

  const prefetch = useCallback((href: string) => {
    if (prefetchCache.has(href)) return;
    prefetchCache.set(
      href,
      fetchForRoute(href).catch((err) => {
        prefetchCache.delete(href);
        throw err;
      }),
    );
  }, []);

  const navigate = useCallback(async (href: string) => {
    if (currentHref() === href) return;
    const token = ++navTokenRef.current;
    try {
      const next = await loadRoute(href);
      if (token !== navTokenRef.current) return;
      window.history.pushState(null, "", href);
      withTransition(() => setData(next));
    } catch {
      window.location.href = href;
    }
  }, []);

  useEffect(() => {
    function onPop() {
      const href = currentHref();
      const token = ++navTokenRef.current;
      loadRoute(href)
        .then((next) => {
          if (token !== navTokenRef.current) return;
          withTransition(() => setData(next));
        })
        .catch(() => {
          window.location.reload();
        });
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <NavigationContext.Provider value={{ navigate, prefetch }}>
      {renderRoute(data)}
    </NavigationContext.Provider>
  );
}

function renderRoute(data: AppData) {
  if (data.route === "home") return <HomePage />;
  if (data.route === "login") return <LoginPage initialData={data} />;
  if (data.route === "sites") return <SitesPage key="sites" initialData={data} />;
  if (data.route === "pages") return <PagesPage key="pages" initialData={data} />;
  if (data.route === "settings") return <SettingsPage key="settings" initialData={data} />;
  return <PublicPage initialData={data} shareId={typeof window !== "undefined" ? window.location.pathname.slice(3) : undefined} />;
}
