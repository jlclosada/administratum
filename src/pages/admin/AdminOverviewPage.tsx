import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { AdminShell } from "@/components/shared/AdminShell";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { adminListUsers, getCommunityLists, getSharedPhotos } from "@/db";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { AdminUser, CommunityList, SharedPhoto } from "@/types";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Heart,
  Megaphone,
  MonitorPlay,
  Newspaper,
  PenSquare,
  ScrollText,
  Star,
  Trophy,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { AdminOutletContext } from "./AdminLayout";

function Kpi({
  to,
  icon: Icon,
  label,
  value,
  delta,
  hint,
  accent,
  index,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  value: number;
  delta?: number;
  hint?: string;
  accent: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        to={to}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-4 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-border"
      >
        <span className={cn("absolute inset-x-0 top-0 h-0.5", accent)} />
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <Icon className="h-4 w-4" /> {label}
          </span>
          <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="mt-3 font-display text-3xl font-black tabular-nums">
          <AnimatedNumber value={value} />
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {delta !== undefined && (
            <span className={cn("font-semibold", delta > 0 ? "text-emerald-500" : "")}>+{delta} esta semana</span>
          )}
          {hint && <span>{delta !== undefined ? " · " : ""}{hint}</span>}
        </p>
      </Link>
    </motion.div>
  );
}

function Panel({ title, icon: Icon, link, children }: { title: string; icon: LucideIcon; link?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col rounded-2xl border border-border/60 bg-card/30">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h2>
        {link && (
          <Link to={link} className="text-xs text-muted-foreground hover:text-foreground">
            Ver todo →
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

const QUICK_ACTIONS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/articulos/nuevo", label: "Escribir artículo", icon: PenSquare },
  { to: "/admin/torneos", label: "Crear torneo", icon: Trophy },
  { to: "/admin/miniatura", label: "Miniatura del mes", icon: Star },
  { to: "/admin/publicidad", label: "Nuevo anuncio", icon: MonitorPlay },
  { to: "/admin/ajustes", label: "Anuncio global", icon: Megaphone },
  { to: "/admin/usuarios", label: "Gestionar usuarios", icon: Users },
];

export function AdminOverviewPage() {
  const { overview: o } = useOutletContext<AdminOutletContext>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [lists, setLists] = useState<CommunityList[]>([]);
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);

  useEffect(() => {
    adminListUsers()
      .then((u) => setUsers(u.slice(0, 5)))
      .catch(() => {});
    getCommunityLists(5).then(setLists);
    getSharedPhotos(6).then(setPhotos);
  }, []);

  const attention = o
    ? [
        o.tournaments_without_rules > 0 && {
          to: "/admin/torneos",
          text: `${o.tournaments_without_rules} ${o.tournaments_without_rules === 1 ? "torneo activo no tiene" : "torneos activos no tienen"} bases publicadas`,
        },
        o.drafts > 0 && {
          to: "/admin/articulos",
          text: `${o.drafts} ${o.drafts === 1 ? "artículo sigue" : "artículos siguen"} en borrador`,
        },
        o.ads_active === 0 && { to: "/admin/publicidad", text: "No hay anuncios activos en los márgenes" },
      ].filter(Boolean) as { to: string; text: string }[]
    : [];

  return (
    <AdminShell title="Resumen" subtitle="El estado de la plataforma de un vistazo">
      {o && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Kpi index={0} to="/admin/usuarios" icon={Users} label="Usuarios" value={o.users} delta={o.users_7d} hint={`${o.admins} admins`} accent="bg-sky-500" />
          <Kpi index={1} to="/comunidad" icon={Camera} label="Publicaciones" value={o.photos} delta={o.photos_7d} accent="bg-rose-500" />
          <Kpi index={2} to="/admin/listas" icon={ScrollText} label="Listas" value={o.lists} delta={o.lists_7d} hint={`${o.featured_lists} destacadas`} accent="bg-emerald-500" />
          <Kpi index={3} to="/admin/torneos" icon={Trophy} label="Torneos activos" value={o.tournaments_active} hint={`${o.attendees} asistentes apuntados`} accent="bg-amber-500" />
          <Kpi index={4} to="/comunidad" icon={Heart} label="Interacciones (7 días)" value={o.likes_7d + o.comments_7d} hint={`${o.likes_7d} me gusta · ${o.comments_7d} comentarios`} accent="bg-violet-500" />
          <Kpi index={5} to="/admin/articulos" icon={Newspaper} label="Artículos" value={o.articles} hint={`${o.guides} guías de pintura`} accent="bg-zinc-400" />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Requiere atención" icon={AlertTriangle}>
          {attention.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Todo en orden.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {attention.map((a) => (
                <li key={a.text}>
                  <Link to={a.to} className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent/40">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span className="flex-1">{a.text}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Acciones rápidas" icon={PenSquare}>
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="group flex flex-col items-start gap-2 rounded-xl border border-border/60 p-3 text-sm font-medium transition-[border-color,background-color] hover:border-primary/40 hover:bg-primary/5"
              >
                <a.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                {a.label}
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Nuevos usuarios" icon={UserPlus} link="/admin/usuarios">
          <ul className="divide-y divide-border/50">
            {users.map((u) => (
              <li key={u.id}>
                <Link to={`/perfil/${u.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40">
                  <UserAvatar src={u.avatarUrl} name={u.displayName || u.email} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.displayName || "Sin nombre"}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(u.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Últimas listas" icon={ScrollText} link="/admin/listas">
          {lists.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted-foreground">Aún no hay listas publicadas.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {lists.map((l) => (
                <li key={l.id}>
                  <Link to={`/comunidad/listas/${l.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40">
                    <ScrollText className="h-4 w-4 shrink-0 text-emerald-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.factionName} · {l.totalPoints} pts · {l.authorName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(l.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {photos.length > 0 && (
        <Panel title="Últimas publicaciones de la comunidad" icon={Camera} link="/comunidad">
          <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-6">
            {photos.map((p) => (
              <Link key={p.id} to="/comunidad" className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                <img src={p.image} alt={p.title || p.caption} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[10px] text-white">
                  {p.authorName}
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </AdminShell>
  );
}
