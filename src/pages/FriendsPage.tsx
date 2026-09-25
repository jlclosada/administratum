import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  acceptFriendRequest,
  getMyFriendships,
  removeFriendship,
  searchProfiles,
  sendFriendRequest,
} from "@/db";
import { useAuthStore, useSocialStore } from "@/stores";
import type { FriendEntry, Profile } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Loader2, MessageCircle, Search, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

function PersonRow({ profile, children }: { profile: Profile; children?: ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <Link to={`/perfil/${profile.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar src={profile.avatarUrl} name={profile.displayName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium group-hover:text-primary">{profile.displayName || "Sin nombre"}</p>
          {(profile.favoriteFaction || profile.location) && (
            <p className="truncate text-xs text-muted-foreground">
              {[profile.favoriteFaction, profile.location].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </motion.div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">
        {title} <span className="text-muted-foreground">· {count}</span>
      </h2>
      <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/30">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </div>
    </section>
  );
}

export function FriendsPage() {
  const myId = useAuthStore((s) => s.user?.id);
  const refreshSocial = useSocialStore((s) => s.refresh);
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getMyFriendships()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  // Debounced people search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchProfiles(q)
        .then((list) => setResults(list.filter((p) => p.id !== myId)))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, myId]);

  async function act(key: string, action: () => Promise<void>, success?: string) {
    setBusy(key);
    try {
      await action();
      setEntries(await getMyFriendships());
      refreshSocial();
      if (success) toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      setBusy(null);
    }
  }

  const incoming = entries.filter((e) => e.friendship.status === "pending" && !e.outgoing);
  const outgoing = entries.filter((e) => e.friendship.status === "pending" && e.outgoing);
  const friends = entries.filter((e) => e.friendship.status === "accepted");
  const relation = new Map(entries.map((e) => [e.other.id, e]));

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Amigos</h1>
          <p className="text-muted-foreground">Conecta con otros pintores y chatea con tus amigos.</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pintores por nombre…"
              className="h-11 w-full rounded-full border border-border/60 bg-card/40 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {searching && <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>
          {query.trim().length >= 2 && !searching && (
            <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/30">
              {results.length === 0 && (
                <p className="p-5 text-center text-sm text-muted-foreground">Nadie con ese nombre.</p>
              )}
              {results.map((p) => {
                const rel = relation.get(p.id);
                return (
                  <PersonRow key={p.id} profile={p}>
                    {!rel ? (
                      <Button
                        size="sm"
                        variant="gradient"
                        className="gap-1.5"
                        disabled={busy === p.id}
                        onClick={() => act(p.id, async () => void (await sendFriendRequest(p.id)), "Solicitud enviada")}
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Añadir
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {rel.friendship.status === "accepted" ? "Amigos" : "Pendiente"}
                      </span>
                    )}
                  </PersonRow>
                );
              })}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="Cargando amigos..." />
          </div>
        ) : (
          <>
            {incoming.length > 0 && (
              <Section title="Solicitudes recibidas" count={incoming.length}>
                {incoming.map(({ friendship, other }) => (
                  <PersonRow key={friendship.id} profile={other}>
                    <Button
                      size="sm"
                      variant="gradient"
                      className="gap-1.5"
                      disabled={busy === friendship.id}
                      onClick={() => act(friendship.id, () => acceptFriendRequest(friendship.id), "¡Ahora sois amigos!")}
                    >
                      <Check className="h-3.5 w-3.5" /> Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === friendship.id}
                      onClick={() => act(friendship.id, () => removeFriendship(friendship.id))}
                      aria-label="Rechazar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </PersonRow>
                ))}
              </Section>
            )}

            <Section title="Amigos" count={friends.length}>
              {friends.length === 0 && (
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Todavía no tienes amigos. Busca pintores arriba.</p>
                </div>
              )}
              {friends.map(({ friendship, other }) => (
                <PersonRow key={friendship.id} profile={other}>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/mensajes/${other.id}`)}>
                    <MessageCircle className="h-3.5 w-3.5" /> Mensaje
                  </Button>
                </PersonRow>
              ))}
            </Section>

            {outgoing.length > 0 && (
              <Section title="Solicitudes enviadas" count={outgoing.length}>
                {outgoing.map(({ friendship, other }) => (
                  <PersonRow key={friendship.id} profile={other}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground"
                      disabled={busy === friendship.id}
                      onClick={() => act(friendship.id, () => removeFriendship(friendship.id), "Solicitud cancelada")}
                    >
                      <Clock className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                  </PersonRow>
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
