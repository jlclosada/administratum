import { ScrollArea } from "@/components/ui/scroll-area";
import { getAppConfig } from "@/db";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getAppConfig()
      .then((cfg) => {
        if (cfg.announcementEnabled && cfg.announcement.trim()) {
          setAnnouncement(cfg.announcement.trim());
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Ambient animated backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora" />
        <div className="absolute inset-0 grid-pattern opacity-[0.04]" />
      </div>
      <Sidebar />
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <AnimatePresence>
          {announcement && !dismissed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden border-b border-border/60 bg-brand-soft"
            >
              <div className="flex items-center gap-3 px-6 py-2.5 lg:px-8">
                <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                <p className="flex-1 text-sm text-foreground">{announcement}</p>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Cerrar anuncio"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <ScrollArea className="flex-1">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
