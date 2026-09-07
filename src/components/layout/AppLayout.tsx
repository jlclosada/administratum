import { ScrollArea } from "@/components/ui/scroll-area";
import { getAppConfig } from "@/db";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    getAppConfig()
      .then((cfg) => {
        if (cfg.announcementEnabled && cfg.announcement.trim()) {
          setAnnouncement(cfg.announcement.trim());
        }
      })
      .catch(() => {});
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll while the mobile drawer is open.
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileMenuOpen]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Ambient animated backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora" />
        <div className="absolute inset-0 grid-pattern opacity-[0.04]" />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="fixed inset-y-0 left-0 z-50 shadow-2xl lg:hidden"
            >
              <Sidebar variant="mobile" onNavigate={() => setMobileMenuOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar with burger */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-card/40 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menú"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-sm font-bold tracking-[0.18em] text-foreground">
            ADMINISTRATUM
          </h1>
        </div>

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
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
