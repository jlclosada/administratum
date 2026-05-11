import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

type State =
  | { status: "hidden" }
  | { status: "available"; version: string; update: Update }
  | { status: "downloading"; progress: number }
  | { status: "ready" }
  | { status: "error"; message: string };

export function UpdateNotification() {
  const [state, setState] = useState<State>({ status: "hidden" });

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const update = await check();
        if (update) {
          setState({ status: "available", version: update.version, update });
        }
      } catch {
        // Silently fail on startup check
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleInstall() {
    if (state.status !== "available") return;
    const { update } = state;
    try {
      setState({ status: "downloading", progress: 0 });
      let downloaded = 0;
      let totalLength = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalLength = event.data.contentLength;
          downloaded = 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          const pct =
            totalLength > 0
              ? Math.round((downloaded / totalLength) * 100)
              : 0;
          setState({ status: "downloading", progress: pct });
        } else if (event.event === "Finished") {
          setState({ status: "ready" });
        }
      });
      setState({ status: "ready" });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Error al actualizar",
      });
    }
  }

  const visible = state.status !== "hidden";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2"
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
            {state.status === "available" && (
              <>
                <Download className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">
                  Nueva versión{" "}
                  <span className="font-semibold text-primary">
                    v{state.version}
                  </span>{" "}
                  disponible
                </span>
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleInstall}
                >
                  <Download className="h-3 w-3" />
                  Actualizar
                </Button>
                <button
                  type="button"
                  onClick={() => setState({ status: "hidden" })}
                  className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {state.status === "downloading" && (
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                <span className="text-sm">Descargando...</span>
                <Progress value={state.progress} className="h-1.5 w-24" />
                <span className="text-xs text-muted-foreground">
                  {state.progress}%
                </span>
              </div>
            )}

            {state.status === "ready" && (
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-green-400 shrink-0" />
                <span className="text-sm text-green-400">
                  Lista. Reinicia para aplicar.
                </span>
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => relaunch()}
                >
                  <RefreshCw className="h-3 w-3" />
                  Reiniciar
                </Button>
              </div>
            )}

            {state.status === "error" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-destructive">
                  Error: {state.message}
                </span>
                <button
                  type="button"
                  onClick={() => setState({ status: "hidden" })}
                  className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
