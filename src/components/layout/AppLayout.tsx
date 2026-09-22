import { getAppConfig } from "@/db";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

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
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      {/* Ambient animated backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="aurora" />
        <div className="absolute inset-0 grid-pattern opacity-[0.04]" />
      </div>

      <Navbar />

      <AnimatePresence>
        {announcement && !dismissed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/60 bg-brand-soft"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
