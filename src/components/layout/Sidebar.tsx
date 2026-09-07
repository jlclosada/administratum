import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAllArmies } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { useAppStore, useAuthStore } from "@/stores";
import type { ArmyWithStats } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Palette,
  Settings,
  Shield,
  ShieldCheck,
  Swords
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/guias", icon: BookOpen, label: "Guías de pintura" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/games", icon: Swords, label: "Juegos" },
  { to: "/paints", icon: Palette, label: "Mis Pinturas" },
  { to: "/lists", icon: ClipboardList, label: "Mis Listas" },
  { to: "/gallery", icon: ImageIcon, label: "Galería" },
  { to: "/settings", icon: Settings, label: "Ajustes" },
];

interface SidebarProps {
  /** "mobile" renders inside a drawer: always expanded, no collapse toggle. */
  variant?: "desktop" | "mobile";
  /** Called after any navigation action (used to close the mobile drawer). */
  onNavigate?: () => void;
}

export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebarCollapse } = useAppStore();
  const isMobile = variant === "mobile";
  const collapsed = isMobile ? false : sidebarCollapsed;
  const { user, signOut } = useAuthStore();
  const isAdmin = useIsAdmin();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    "";
  const location = useLocation();
  const navigate = useNavigate();
  const [armies, setArmies] = useState<(ArmyWithStats & { gameName: string })[]>([]);
  const [armiesExpanded, setArmiesExpanded] = useState(false);

  const loadArmies = useCallback(async () => {
    try {
      const data = await getAllArmies();
      setArmies(data);
    } catch (err) {
      console.error("Failed to load armies:", err);
    }
  }, []);

  useEffect(() => {
    loadArmies();
  }, [loadArmies, location.pathname]);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      onNavigate?.();
    },
    [navigate, onNavigate]
  );

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: isMobile ? 264 : collapsed ? 72 : 240 }}
        transition={{ duration: isMobile ? 0 : 0.2, ease: "easeInOut" }}
        className="relative flex h-screen flex-col border-r border-border/70 bg-card/40 backdrop-blur-xl"
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4">
          <Tooltip>
            <TooltipTrigger asChild>
            </TooltipTrigger>
            <TooltipContent side="right">Administratum · v1.1.0</TooltipContent>
          </Tooltip>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="font-display text-sm font-bold tracking-[0.18em] text-foreground">
                  ADMINISTRATUM
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating collapse toggle (desktop only) */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            className="absolute -right-3 top-[52px] z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-all hover:border-primary/40 hover:text-foreground hover:shadow-lg"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="space-y-1 px-3 py-4">
            {(isAdmin
              ? [...navItems, { to: "/admin", icon: ShieldCheck, label: "Administración" }]
              : navItems
            ).map((item) => {
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);

              const link = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onNavigate?.()}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-brand-soft text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-gradient" />
                  )}
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive && "text-primary"
                    )}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })}
          </nav>

          {/* Mis Ejércitos */}
          {!collapsed && armies.length > 0 && (
            <>
              <Separator className="mx-3" />
              <div className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => setArmiesExpanded(!armiesExpanded)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 shrink-0" />
                    <span>Mis Ejércitos</span>
                  </div>
                  <motion.div
                    animate={{ rotate: armiesExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {armiesExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 space-y-0.5 pl-2">
                        {armies.map((army) => {
                          const armyPath = `/games/${army.gameId}/armies/${army.id}`;
                          const isArmyActive = location.pathname === armyPath;
                          return (
                            <button
                              key={army.id}
                              type="button"
                              onClick={() => go(armyPath)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-all text-left",
                                isArmyActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              )}
                            >
                              <div
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: army.colorPrimary ?? "#8b5cf6" }}
                              />
                              <span className="truncate flex-1">{army.name}</span>
                              <span className="text-[10px] text-muted-foreground/70 shrink-0">
                                {army.completionPercentage}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {collapsed && armies.length > 0 && (
            <>
              <Separator className="mx-3" />
              <div className="px-3 py-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSidebarCollapse();
                        setArmiesExpanded(true);
                      }}
                      className="flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
                    >
                      <Shield className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Mis Ejércitos</TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </ScrollArea>

        <Separator />

        {/* Account */}
        <div className="space-y-1.5 p-3">
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => go("/settings")}
                    className="flex w-full items-center justify-center rounded-lg py-1.5 transition-all hover:bg-accent"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold uppercase text-white">
                      {(displayName || user?.email || "?").charAt(0)}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Mi perfil</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate?.();
                      signOut();
                    }}
                    className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Cerrar sesión</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              {/* Profile — opens settings */}
              <button
                type="button"
                onClick={() => go("/settings")}
                className="group flex w-full items-center gap-2.5 rounded-xl border border-border/60 bg-card/40 p-2 text-left transition-all hover:border-primary/40 hover:bg-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-sm font-bold uppercase text-white">
                  {(displayName || user?.email || "?").charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {displayName || "Mi perfil"}
                  </span>
                  <span
                    className="block truncate text-xs text-muted-foreground"
                    title={user?.email ?? undefined}
                  >
                    {user?.email}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
              {/* Logout — distinct action */}
              <button
                type="button"
                onClick={() => {
                  onNavigate?.();
                  signOut();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
