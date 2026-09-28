import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { getMyFriendships, searchProfiles, sendFriendRequest } from "@/db";
import { useAuthStore, useSocialStore } from "@/stores";
import type { FriendEntry, Profile } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Loader2, Search, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

/**
 * Search other users by name, with a link to each profile and an
 * "Añadir" button that respects any existing friendship.
 */
export function UserSearch({
  placeholder = "Buscar usuarios por nombre…",
  entries,
  onFriendshipChange,
}: {
  placeholder?: string;
  /** The caller's friendships, when it already has them; fetched otherwise. */
  entries?: FriendEntry[];
  onFriendshipChange?: () => void;
}) {
  const myId = useAuthStore((s) => s.user?.id);
  const refreshSocial = useSocialStore((s) => s.refresh);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [ownEntries, setOwnEntries] = useState<FriendEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const relations = useMemo(
    () => new Map((entries ?? ownEntries).map((e) => [e.other.id, e])),
    [entries, ownEntries],
  );

  useEffect(() => {
    if (!myId || entries) return;
    getMyFriendships().then(setOwnEntries);
  }, [myId, entries]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
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

  async function handleAdd(profile: Profile) {
    setBusy(profile.id);
    try {
      await sendFriendRequest(profile.id);
      if (!entries) setOwnEntries(await getMyFriendships());
      refreshSocial();
      onFriendshipChange?.();
      toast.success(`Solicitud enviada a ${profile.displayName || "este usuario"}`);
    } catch {
      toast.error("No se pudo enviar la solicitud.");
    } finally {
      setBusy(null);
    }
  }

  const active = query.trim().length >= 2;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar usuarios"
          className="h-11 w-full rounded-full border border-border/60 bg-card/40 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {searching && (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {active && !searching && (
        <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/30">
          {results.length === 0 && <p className="p-5 text-center text-sm text-muted-foreground">Ningún usuario con ese nombre.</p>}
          <AnimatePresence initial={false}>
            {results.map((p) => {
              const rel = relations.get(p.id);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <Link to={`/perfil/${p.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
                    <UserAvatar src={p.avatarUrl} name={p.displayName} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-primary">{p.displayName || "Sin nombre"}</p>
                      {(p.favoriteFaction || p.location) && (
                        <p className="truncate text-xs text-muted-foreground">
                          {[p.favoriteFaction, p.location].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </Link>
                  {myId &&
                    (!rel ? (
                      <Button size="sm" variant="gradient" className="gap-1.5" disabled={busy === p.id} onClick={() => handleAdd(p)}>
                        {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                        Añadir
                      </Button>
                    ) : rel.friendship.status === "accepted" ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <Check className="h-3.5 w-3.5" /> Amigos
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Pendiente
                      </span>
                    ))}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
