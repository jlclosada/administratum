import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { reloadForNewVersion } from "./lib/chunkReload";
import { initSentry } from "./lib/sentry";
import { inject as injectAnalytics } from "@vercel/analytics";
import "./styles/globals.css";

// Vite reports failed module preloads (typically a stale tab after a new
// deploy) with this event; reloading picks up the current build.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

initSentry();

// Visit counts without cookies or personal data (Vercel Web Analytics), so
// no consent banner is needed for them. Only on the real site: not in local
// dev, Vercel previews or the desktop app.
if (window.location.hostname === "administratum.site") injectAnalytics({ mode: "production" });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
