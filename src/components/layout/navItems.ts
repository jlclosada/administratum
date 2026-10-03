import {
  Brush,
  ClipboardList,
  Download,
  ImageIcon,
  LayoutDashboard,
  Library,
  MessageCircle,
  Palette,
  Shield,
  Swords,
  Trophy,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";

/** The user's own hobby spaces — in the profile menu and the side rail. */
export const collectionItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/equipos", icon: Shield, label: "Mis Equipos" },
  { to: "/coleccion", icon: Swords, label: "Mi Colección" },
  { to: "/lists", icon: ClipboardList, label: "Mis Listas" },
  { to: "/paints", icon: Palette, label: "Mis Pinturas" },
  { to: "/gallery", icon: ImageIcon, label: "Galería" },
];

// Profile: the user's own collection and progress.
export const profileItems = [
  { to: "/perfil", icon: UserRound, label: "Mi perfil" },
  { to: "/amigos", icon: UserPlus, label: "Amigos" },
  { to: "/mensajes", icon: MessageCircle, label: "Mensajes" },
  ...collectionItems,
];

export function isItemActive(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

/** Public sections a visitor can browse without an account (landing, footers). */
export const exploreLinks = [
  { to: "/catalogo-puntos", icon: Library, label: "Catálogo de puntos" },
  { to: "/competitivo", icon: Trophy, label: "Competitivo" },
  { to: "/comunidad", icon: Users, label: "Comunidad" },
  { to: "/guias", icon: Brush, label: "Guías de pintura" },
  { to: "/descargas", icon: Download, label: "Descargas" },
];
