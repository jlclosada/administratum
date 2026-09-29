import { getAds, getAppConfig } from "@/db";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import type { Ad } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { JoinRail } from "./JoinRail";
import { ProfileRail } from "./ProfileRail";
import { AdFooter } from "./SideRail";
import { RightRailContext } from "./rightRail";

export function AppLayout() {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [rightRailContent, setRightRailContent] = useState<ReactNode>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    getAds().then(setAds);
  }, []);

  useEffect(() => {
    getAppConfig()
      .then((cfg) => {
        if (cfg.announcementEnabled && cfg.announcement.trim()) {
          setAnnouncement(cfg.announcement.trim());
        }
      })
      .catch(() => {});
  }, []);

  const signedIn = useAuthStore((s) => !!s.user);
  // The admin area has its own side menu and no ads.
  const inAdmin = pathname.startsWith("/admin");
  // The signed-in home is a three-column social feed with its own margins.
  const isHome = signedIn && pathname === "/";
  // Elsewhere the right rail carries "Mi espacio" (or, for guests, the
  // invitation to join) plus optional page content.
  const hasRight = !inAdmin && !isHome;

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

      <RightRailContext.Provider value={setRightRailContent}>
        <div
          className={cn(
            "mx-auto grid w-full flex-1 gap-8 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8",
            inAdmin ? "max-w-7xl" : "max-w-[1440px]",
            hasRight && "xl:grid-cols-[minmax(0,1fr)_300px]",
            isHome && "sm:py-6",
          )}
        >
          <main className="min-w-0">
            <Outlet />
          </main>

          {hasRight && (
            <aside className="hidden xl:block">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-6 overflow-y-auto overscroll-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {signedIn ? <ProfileRail /> : <JoinRail />}
                {rightRailContent}
              </div>
            </aside>
          )}
        </div>
      </RightRailContext.Provider>

      {!inAdmin && <AdFooter ads={ads} />}
      <Footer />
    </div>
  );
}
