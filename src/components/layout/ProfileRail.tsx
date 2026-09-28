import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import { useAuthStore, useProfileStore } from "@/stores";
import { motion } from "framer-motion";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { collectionItems, isItemActive } from "./navItems";

const STORAGE_KEY = "profile-rail-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Quiet shortcut panel for the user's own spaces (Dashboard, Colección,
 * Listas, Pinturas, Galería) at the top of the right rail, above the ads.
 * Can be folded down to a single row of icons.
 */
export function ProfileRail() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const name =
    profile?.displayName ||
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    "Mi perfil";

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        // Storage blocked: the choice just won't persist.
      }
      return !c;
    });
  }

  return (
    <nav
      aria-label="Mi espacio"
      className="rounded-2xl border border-border/50 bg-card/30 p-2 backdrop-blur-sm transition-colors hover:border-border/80"
    >
      <div className="flex items-center gap-2 px-1.5 pb-1.5 pt-1">
        <Link to="/perfil" className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 -m-1">
          <UserAvatar src={profile?.avatarUrl} name={name} size="sm" />
          <span className="min-w-0">
            <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
              Mi espacio
            </span>
            <span className="block truncate text-sm font-medium transition-colors group-hover:text-primary">{name}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Mostrar accesos" : "Plegar accesos"}
          title={collapsed ? "Mostrar accesos" : "Plegar accesos"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
        >
          {collapsed ? <ChevronsUpDown className="h-3.5 w-3.5" /> : <ChevronsDownUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {collapsed ? (
        <div className="mt-1 flex justify-between border-t border-border/40 px-1 pt-2">
          {collectionItems.map((item) => {
            const active = isItemActive(pathname, item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-brand-soft text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4", active && "text-primary")} />
              </NavLink>
            );
          })}
        </div>
      ) : (
        <ul className="mt-1 space-y-0.5 border-t border-border/40 pt-1.5">
          {collectionItems.map((item) => {
            const active = isItemActive(pathname, item.to);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active ? "bg-brand-soft text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="profile-rail-active"
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-[opacity,transform] duration-200",
                      active ? "opacity-60" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60",
                    )}
                  />
                </NavLink>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
