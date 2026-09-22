import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsAdmin } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { AnimatePresence, motion } from "framer-motion";
import {
    BookOpen,
    ChevronDown,
    ClipboardList,
    Home,
    ImageIcon,
    LayoutDashboard,
    Library,
    LogOut,
    Menu,
    Palette,
    Settings,
    ShieldCheck,
    Swords,
    X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const primaryItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/guias", icon: BookOpen, label: "Guías" },
  { to: "/games", icon: Swords, label: "Juegos" },
  { to: "/lists", icon: ClipboardList, label: "Mis Listas" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

const moreItems = [
  { to: "/paints", icon: Palette, label: "Mis Pinturas" },
  { to: "/catalogo-puntos", icon: Library, label: "Catálogo de puntos" },
  { to: "/gallery", icon: ImageIcon, label: "Galería" },
];

const allMobileItems = [...primaryItems, ...moreItems];

function isItemActive(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

export function Navbar() {
  const { user, signOut } = useAuthStore();
  const isAdmin = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    "";

  const moreActive = moreItems.some((i) => isItemActive(location.pathname, i.to));

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex shrink-0 items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient glow-sm">
            <span className="font-display text-lg font-black leading-none text-white">
              A
            </span>
          </div>
          <span className="hidden font-display text-sm font-bold tracking-[0.18em] text-foreground sm:inline">
            ADMINISTRATUM
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {primaryItems.map((item) => {
            const active = isItemActive(location.pathname, item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                {item.label}
              </NavLink>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  moreActive
                    ? "bg-brand-soft text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                Más
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {moreItems.map((item) => (
                <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)}>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isItemActive(location.pathname, "/admin")
                  ? "bg-brand-soft text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex-1 lg:hidden" />

        {/* Profile dropdown (desktop) */}
        <div className="hidden items-center lg:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-accent"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold uppercase text-white">
                  {(displayName || user?.email || "?").charAt(0)}
                </span>
                <span className="max-w-[10rem] truncate text-sm font-medium text-foreground">
                  {displayName || user?.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="block truncate text-foreground">
                  {displayName || "Mi perfil"}
                </span>
                <span className="block truncate text-[11px] font-normal text-muted-foreground/80">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4 text-muted-foreground" />
                Ajustes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/60 lg:hidden"
          >
            <nav className="space-y-1 px-4 py-3">
              {(isAdmin
                ? [...allMobileItems, { to: "/admin", icon: ShieldCheck, label: "Administración" }]
                : allMobileItems
              ).map((item) => {
                const active = isItemActive(location.pathname, item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-soft text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4.5 w-4.5", active && "text-primary")} />
                    {item.label}
                  </NavLink>
                );
              })}

              <div className="my-2 h-px bg-border/70" />

              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/settings");
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-bold uppercase text-white">
                  {(displayName || user?.email || "?").charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {displayName || user?.email}
                </span>
                <Settings className="h-4 w-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Cerrar sesión
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
