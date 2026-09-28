import { ClipboardList, ImageIcon, LayoutDashboard, MessageCircle, Palette, Swords, UserPlus, UserRound } from "lucide-react";

/** The user's own hobby spaces — in the profile menu and the side rail. */
export const collectionItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/games", icon: Swords, label: "Mi Colección" },
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
