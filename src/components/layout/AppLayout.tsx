import { getAds, getAppConfig } from "@/db";
import { cn } from "@/lib/utils";
import type { Ad } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { AdRail, MobileAdStrip } from "./SideRail";
import { RightRailContext } from "./rightRail";

export function AppLayout() {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [rightRailContent, setRightRailContent] = useState<ReactNode>(null);

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

  const leftAds = ads.filter((a) => a.position === "left");
  const rightAds = ads.filter((a) => a.position === "right");
  const hasLeft = leftAds.length > 0;
  const hasRight = rightAds.length > 0 || rightRailContent != null;

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
        {/* Side margins hold ads (left from 2xl, right from xl); the right
            rail can also carry page content above its ads. Columns only
            exist when they have something to show. */}
        <div
          className={cn(
            "mx-auto grid w-full flex-1 gap-8 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8",
            hasLeft || hasRight ? "max-w-[1760px]" : "max-w-7xl",
            hasLeft && hasRight && "2xl:grid-cols-[160px_minmax(0,1fr)_300px]",
            hasRight && "xl:grid-cols-[minmax(0,1fr)_300px]",
            hasLeft && !hasRight && "2xl:grid-cols-[160px_minmax(0,1fr)]",
          )}
        >
          {hasLeft && (
            <aside className="hidden 2xl:block" aria-label="Publicidad">
              <div className="sticky top-24">
                <AdRail ads={leftAds} />
              </div>
            </aside>
          )}

          <main className="min-w-0">
            <Outlet />
            <div className="xl:hidden">
              <MobileAdStrip ads={ads} />
            </div>
            {hasLeft && (
              <div className="hidden xl:block 2xl:hidden">
                <MobileAdStrip ads={leftAds} />
              </div>
            )}
          </main>

          {hasRight && (
            <aside className="hidden xl:block">
              <div className="sticky top-24 space-y-6">
                {rightRailContent}
                <AdRail ads={rightAds} />
              </div>
            </aside>
          )}
        </div>
      </RightRailContext.Provider>

      <Footer />
    </div>
  );
}
