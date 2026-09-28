import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { reloadForNewVersion } from "./lib/chunkReload";
import { initSentry } from "./lib/sentry";
import "./styles/globals.css";

// Vite reports failed module preloads (typically a stale tab after a new
// deploy) with this event; reloading picks up the current build.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

initSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
