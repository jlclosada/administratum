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
import { useAuthStore, useProfileStore, useSocialStore } from "@/stores";
import { AnimatePresence, motion } from "framer-motion";
import {
    Brush,
    ChevronDown,
    ClipboardList,
    Download,
    Home,
    ImageIcon,
    LayoutDashboard,
    Library,
    LogOut,
    Menu,
    MessageCircle,
    Palette,
    Settings,
    ShieldCheck,
    Swords,
    Trophy,
    UserPlus,
    UserRound,
    Users,
    X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

// Primary: content the user comes to browse or reference.
const primaryItems = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/comunidad", icon: Users, label: "Comunidad" },
  { to: "/competitivo", icon: Trophy, label: "Competitivo" },
  { to: "/catalogo-puntos", icon: Library, label: "Catálogo de puntos" },
  { to: "/guias", icon: Brush, label: "Pintura" },
  { to: "/descargas", icon: Download, label: "Descargas" },
];

// Profile: the user's own collection and progress.
const profileItems = [
  { to: "/perfil", icon: UserRound, label: "Mi perfil" },
  { to: "/amigos", icon: UserPlus, label: "Amigos" },
  { to: "/mensajes", icon: MessageCircle, label: "Mensajes" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/games", icon: Swords, label: "Mi Colección" },
  { to: "/lists", icon: ClipboardList, label: "Mis Listas" },
  { to: "/paints", icon: Palette, label: "Mis Pinturas" },
  { to: "/gallery", icon: ImageIcon, label: "Galería" },
];

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <motion.span
      key={count}
      initial={{ scale: 0.4 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", bounce: 0.6, duration: 0.4 }}
      className={cn(
        "flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  );
}

function isItemActive(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

export function Navbar() {
  const { user, signOut } = useAuthStore();
  const avatarUrl = useProfileStore((s) => s.profile?.avatarUrl ?? null);
  const unread = useSocialStore((s) => s.unread);
  const requests = useSocialStore((s) => s.incomingRequests);
  const badgeFor = (to: string) => (to === "/mensajes" ? unread : to === "/amigos" ? requests : 0);
  const isAdmin = useIsAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    "";

  const profileActive = profileItems.some((i) => isItemActive(location.pathname, i.to));

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex shrink-0 items-center"
        >
          <img src="/images/logo.png" alt="Administratum" className="h-9 w-auto" />
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

        <NavLink
          to="/mensajes"
          aria-label={unread > 0 ? `Mensajes (${unread} sin leer)` : "Mensajes"}
          className={({ isActive }) =>
            cn(
              "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              isActive && "bg-brand-soft text-foreground",
            )
          }
        >
          <MessageCircle className="h-5 w-5" />
          <CountBadge count={unread} className="absolute -right-0.5 -top-0.5" />
        </NavLink>

        {/* Profile dropdown (desktop) — groups everything related to the user's own collection */}
        <div className="hidden items-center lg:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-accent",
                  profileActive && "bg-brand-soft"
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-gradient text-xs font-bold uppercase text-white">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (displayName || user?.email || "?").charAt(0)
                  )}
                </span>
                <span className="max-w-[10rem] truncate text-sm font-medium text-foreground">
                  {displayName || user?.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block truncate text-foreground">
                  {displayName || "Mi perfil"}
                </span>
                <span className="block truncate text-[11px] font-normal text-muted-foreground/80">
                  {user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profileItems.map((item) => {
                const active = isItemActive(location.pathname, item.to);
                return (
                  <DropdownMenuItem
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className={active ? "text-foreground" : undefined}
                  >
                    <item.icon className={cn("h-4 w-4 text-muted-foreground", active && "text-primary")} />
                    {item.label}
                    <CountBadge count={badgeFor(item.to)} className="ml-auto" />
                  </DropdownMenuItem>
                );
              })}
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
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Explorar
              </p>
              {primaryItems.map((item) => {
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

              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Mi cuenta
              </p>
              {(isAdmin
                ? [...profileItems, { to: "/admin", icon: ShieldCheck, label: "Administración" }]
                : profileItems
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
                    <CountBadge count={badgeFor(item.to)} className="ml-auto" />
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
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-gradient text-[11px] font-bold uppercase text-white">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (displayName || user?.email || "?").charAt(0)
                  )}
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
