import { PageTransition } from "@/components/shared/PageTransition";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { getAdminOverview } from "@/db";
import { useIsAdmin, useIsSuperadmin } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { useAuthStore, useProfileStore } from "@/stores";
import type { AdminOverview } from "@/types";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  LayoutDashboard,
  Library,
  Mail,
  MonitorPlay,
  Newspaper,
  ScrollText,
  Settings2,
  ShieldAlert,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

export interface AdminOutletContext {
  overview: AdminOverview | null;
  refreshOverview: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: (o: AdminOverview) => number;
  /** Badge style: "count" is neutral, "alert" asks for attention. */
  tone?: "count" | "alert";
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "General",
    items: [
      { to: "/admin", label: "Resumen", icon: LayoutDashboard },
      { to: "/admin/usuarios", label: "Usuarios", icon: Users, badge: (o) => o.users },
    ],
  },
  {
    group: "Contenido",
    items: [
      { to: "/admin/articulos", label: "Artículos", icon: Newspaper, badge: (o) => o.drafts, tone: "alert" },
      { to: "/admin/miniatura", label: "Miniatura del mes", icon: Star },
    ],
  },
  {
    group: "Competitivo",
    items: [
      { to: "/admin/torneos", label: "Torneos", icon: Trophy, badge: (o) => o.tournaments_without_rules, tone: "alert" },
      { to: "/admin/listas", label: "Listas", icon: ScrollText, badge: (o) => o.lists },
    ],
  },
  {
    group: "Plataforma",
    items: [
      { to: "/admin/publicidad", label: "Publicidad", icon: MonitorPlay, badge: (o) => o.ads_active },
      { to: "/admin/correos", label: "Correos", icon: Mail },
      { to: "/admin/catalogo", label: "Catálogo y facciones", icon: Library },
      { to: "/admin/ajustes", label: "Ajustes", icon: Settings2 },
    ],
  },
];

function isActive(pathname: string, to: string) {
  return to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);
}

/** Shell of the admin area: access guard, section menu and a shared overview. */
export function AdminLayout() {
  const isAdmin = useIsAdmin();
  const isSuperadmin = useIsSuperadmin();
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  const refreshOverview = useCallback(() => {
    getAdminOverview().then(setOverview);
  }, []);

  useEffect(() => {
    if (isAdmin) refreshOverview();
  }, [isAdmin, refreshOverview]);

  if (!isAdmin) {
    return (
      <PageTransition>
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Acceso restringido</h1>
          <p className="text-sm text-muted-foreground">Este panel solo está disponible para administradores.</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
        </div>
      </PageTransition>
    );
  }

  const name = profile?.displayName || user?.email || "Admin";

  return (
    <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3">
            <UserAvatar src={profile?.avatarUrl} name={name} size="md" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wider", isSuperadmin ? "text-amber-500" : "text-primary")}>
                {isSuperadmin ? "Superadmin" : "Administrador"}
              </p>
            </div>
          </div>

          <nav aria-label="Administración" className="space-y-5">
            {NAV.map((section) => (
              <div key={section.group}>
                <p className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {section.group}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(pathname, item.to);
                    const badge = overview && item.badge ? item.badge(overview) : 0;
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to === "/admin"}
                          className={cn(
                            "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                            active ? "text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="admin-nav"
                              className="absolute inset-0 -z-10 rounded-xl border border-border/70 bg-card"
                              transition={{ type: "spring", stiffness: 500, damping: 40 }}
                            />
                          )}
                          <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge > 0 && (
                            <span
                              className={cn(
                                "min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
                                item.tone === "alert" ? "bg-amber-500/15 text-amber-500" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {badge}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" /> Volver a la web
          </Button>
        </div>
      </aside>

      {/* Mobile / tablet section menu */}
      <nav
        aria-label="Administración"
        className="sticky top-16 z-20 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b border-border/50 bg-background/85 px-4 py-2.5 backdrop-blur-xl [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden"
      >
        {NAV.flatMap((s) => s.items).map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/60 text-muted-foreground",
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <main className="min-w-0">
        <Outlet context={{ overview, refreshOverview } satisfies AdminOutletContext} />
      </main>
    </div>
  );
}
