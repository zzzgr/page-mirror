import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import type { AppData } from "./lib/types";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("缺少根节点");
}

const initialData = (window.__APP_DATA__ || { route: "home" }) as AppData;
createRoot(rootElement).render(
  <StrictMode>
    <App initialData={initialData} />
  </StrictMode>,
);
