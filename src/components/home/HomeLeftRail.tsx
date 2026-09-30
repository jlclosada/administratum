import { collectionItems, exploreLinks, isItemActive } from "@/components/layout/navItems";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { getProfileStats } from "@/db";
import { profileCompletion } from "@/lib/profileCompletion";
import { cn } from "@/lib/utils";
import { useAuthStore, useProfileStore, useSocialStore } from "@/stores";
import type { ProfileStats } from "@/types";
import { MessageCircle, UserPlus, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="space-y-0.5">
      <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">{title}</p>
      {children}
    </nav>
  );
}

function RailLink({ to, icon: Icon, label, badge }: { to: string; icon: LucideIcon; label: string; badge?: number }) {
  const { pathname } = useLocation();
  const active = isItemActive(pathname, to);
  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        active ? "bg-brand-soft text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </NavLink>
  );
}

/** Home page left rail: who you are and where you can go. */
export function HomeLeftRail({ children }: { children?: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const unread = useSocialStore((s) => s.unread);
  const requests = useSocialStore((s) => s.incomingRequests);
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (user?.id) getProfileStats(user.id).then(setStats).catch(() => {});
  }, [user?.id]);

  const name =
    profile?.displayName ||
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    "Tu perfil";
  const subtitle = [profile?.favoriteFaction, profile?.location].filter(Boolean).join(" · ");
  const completion = profile ? profileCompletion(profile) : null;

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <div className="h-16 bg-[url('/email/hero.jpg')] bg-cover bg-center" aria-hidden="true" />
        <div className="-mt-8 px-4 pb-4">
          <Link to="/perfil" className="group block">
            <span className="inline-block rounded-full bg-background p-1">
              <UserAvatar src={profile?.avatarUrl} name={name} size="lg" />
            </span>
            <p className="mt-1 truncate font-display text-base font-bold group-hover:text-primary">{name}</p>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </Link>
          <dl className="mt-3 grid grid-cols-4 gap-1 border-t border-border/50 pt-3 text-center">
            {(
              [
                ["Amigos", stats?.friends],
                ["Fotos", stats?.photos],
                ["Listas", stats?.lists],
                ["Guías", stats?.guides],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dd className="font-display text-sm font-bold tabular-nums">{value ?? "–"}</dd>
                <dt className="text-[10px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          {completion && completion.percent < 100 && (
            <Link
              to="/settings"
              className="mt-3 block rounded-xl border border-primary/30 bg-brand-soft px-3 py-2.5 transition-colors hover:border-primary/60"
            >
              <span className="flex items-center justify-between text-xs">
                <span className="font-medium">Completa tu perfil</span>
                <span className="font-mono tabular-nums text-primary">{completion.percent}%</span>
              </span>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-brand-gradient" style={{ width: `${completion.percent}%` }} />
              </span>
              <span className="mt-1.5 block truncate text-[11px] text-muted-foreground">
                Falta: {completion.missing.map((m) => m.label.toLowerCase()).join(", ")}
              </span>
            </Link>
          )}
        </div>
      </section>

      <RailSection title="Mi espacio">
        {collectionItems.map((item) => (
          <RailLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
        ))}
      </RailSection>

      <RailSection title="Social">
        <RailLink to="/perfil" icon={UserRound} label="Mi perfil" />
        <RailLink to="/amigos" icon={UserPlus} label="Amigos" badge={requests} />
        <RailLink to="/mensajes" icon={MessageCircle} label="Mensajes" badge={unread} />
      </RailSection>

      <RailSection title="Explorar">
        {exploreLinks.map((l) => (
          <RailLink key={l.to} to={l.to} icon={l.icon} label={l.label} />
        ))}
      </RailSection>

      {children}
    </div>
  );
}
