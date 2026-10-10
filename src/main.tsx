import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/literata/400.css";
import "@fontsource/literata/400-italic.css";
import "@fontsource/literata/600.css";
import "@fontsource/nunito/500.css";
import "@fontsource/nunito/700.css";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";
import { App } from "./App";
import { reloadForUpdate } from "./components/ErrorBoundary";
import { showToast } from "./components/Toast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// A file from an earlier release is gone: load the new release once.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForUpdate()) event.preventDefault();
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // The first install takes control quietly. A later one means a new release is ready:
  // say so and let the person choose when to reload, so nothing is interrupted mid-sentence.
  let controlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!controlled) {
      controlled = true;
      return;
    }
    showToast("A new version of Leaves is ready.", { label: "Reload", run: () => location.reload() }, 30_000);
  });
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // An installed app can stay open for days; look for a new release when it comes back into view.
        let last = Date.now();
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState !== "visible" || Date.now() - last < 30 * 60_000) return;
          last = Date.now();
          void reg.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
  });
}
