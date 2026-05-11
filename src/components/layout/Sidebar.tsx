import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAllArmies } from "@/db";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores";
import type { ArmyWithStats } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    ImageIcon,
    LayoutDashboard,
    Settings,
    Shield,
    Swords,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/games", icon: Swords, label: "Juegos" },
  { to: "/lists", icon: ClipboardList, label: "Mis Listas" },
  { to: "/gallery", icon: ImageIcon, label: "Galería" },
  { to: "/settings", icon: Settings, label: "Ajustes" },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapse } = useAppStore();
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

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative flex h-screen flex-col border-r border-border bg-card/50 backdrop-blur-sm"
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="font-display text-sm font-bold tracking-wider text-foreground">
                  WARHAMMER
                </h1>
                <p className="font-display text-[10px] tracking-[0.3em] text-primary">VAULT</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);

              const link = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
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

              if (sidebarCollapsed) {
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
          {!sidebarCollapsed && armies.length > 0 && (
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
                              onClick={() => navigate(armyPath)}
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

          {sidebarCollapsed && armies.length > 0 && (
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

        {/* Collapse toggle */}
        <div className="p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebarCollapse}
            className="w-full"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Version */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pb-4"
            >
              <p className="text-[10px] text-muted-foreground/50">v1.0.0</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </TooltipProvider>
  );
}
