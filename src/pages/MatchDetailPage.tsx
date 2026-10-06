import { HostInvitations, InvitationBanner } from "@/components/matches/MatchInvitations";
import { EmptyState } from "@/components/shared/EmptyState";
import { GroupChat } from "@/components/shared/GroupChat";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  cancelMatch,
  COLLECTION_GAME_NAME,
  getFactionCatalog,
  getMatch,
  getMatchAddress,
  getMatchInvitationByToken,
  getMatchInvitations,
  getMatchMessages,
  getMatchPlayers,
  getProfilesByIds,
  joinMatch,
  leaveMatch,
  removeMatchPlayer,
  sendMatchMessage,
  subscribeToChat,
} from "@/db";
import { copyText } from "@/lib/clipboard";
import { formatDistance, haversineKm, savedPlace } from "@/lib/geo";
import { clearPendingInvite, pendingInvite, savePendingInvite } from "@/lib/pendingInvite";
import { FORMAT_LABEL, LEVEL_HINT, LEVEL_LABEL, matchDay, matchPlace, matchTime, spotsLeft, VENUE_LABEL } from "@/lib/matches";
import { useAuthStore, useProfileStore } from "@/stores";
import type { Match, MatchInvitation, MatchPlayer, Profile } from "@/types";
import { ArrowLeft, CalendarDays, Clock, Crown, Dices, Gauge, Link2, Loader2, Lock, LogOut, MapPin, Pencil, Swords, UserMinus, Users, XCircle } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const MatchesMap = lazy(() => import("@/components/matches/MatchesMap").then((m) => ({ default: m.MatchesMap })));

function Fact({ icon: Icon, label, value, hint }: { icon: typeof Clock; label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/60 bg-background/30 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** One open game: details, who plays, join/leave, and the players' chat. */
export function MatchDetailPage() {
  const { matchId = "" } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const openAuth = useAuthStore((s) => s.openAuth);
  const favorite = useProfileStore((s) => s.profile?.favoriteFaction ?? "");
  const [match, setMatch] = useState<Match | null | undefined>(undefined);
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [address, setAddress] = useState<string | null>(null);
  const [factions, setFactions] = useState<string[]>([]);
  const [faction, setFaction] = useState(favorite);
  const [busy, setBusy] = useState(false);
  const [invitations, setInvitations] = useState<MatchInvitation[]>([]);
  const [params] = useSearchParams();
  // Token from the email link (or kept from before signing up).
  const [token] = useState<string | null>(() => {
    const fromUrl = params.get("invitacion");
    const saved = pendingInvite();
    return fromUrl ?? (saved?.matchId === matchId ? saved.token : null);
  });
  const [tokenInvite, setTokenInvite] = useState<{ hostName: string; status: MatchInvitation["status"] } | null>(null);

  const load = useCallback(async () => {
    const [m, p] = await Promise.all([getMatch(matchId), getMatchPlayers(matchId)]);
    setMatch(m);
    setPlayers(p);
    const inv = user ? await getMatchInvitations(matchId) : [];
    setInvitations(inv);
    const invited = inv.flatMap((i) => (i.invitedUser ? [i.invitedUser] : []));
    setProfiles(await getProfilesByIds([...new Set([...(m ? [m.hostId] : []), ...p.map((x) => x.userId), ...invited])]));
    if (user) setAddress(await getMatchAddress(matchId));
  }, [matchId, user]);

  useEffect(() => {
    if (!token) return;
    getMatchInvitationByToken(token).then((t) => {
      if (t && t.matchId === matchId) {
        setTokenInvite({ hostName: t.hostName, status: t.status });
        if (t.status === "pending") savePendingInvite({ matchId, token });
        else clearPendingInvite();
      }
    });
  }, [token, matchId]);

  useEffect(() => {
    load();
    getFactionCatalog(COLLECTION_GAME_NAME).then((f) => setFactions(f.map((x) => x.factionName).sort((a, b) => a.localeCompare(b, "es"))));
  }, [load]);

  const loadChat = useCallback(() => getMatchMessages(matchId), [matchId]);
  const sendChat = useCallback((body: string) => sendMatchMessage(matchId, body), [matchId]);
  const subscribeChat = useCallback((cb: Parameters<typeof subscribeToChat>[3]) => subscribeToChat("match_messages", "match_id", matchId, cb), [matchId]);

  if (match === undefined) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner text="Cargando partida…" />
      </div>
    );
  }
  if (match === null) {
    return (
      <EmptyState
        icon={<Dices className="h-8 w-8 text-muted-foreground" />}
        title="Partida no encontrada"
        description="Puede que el organizador la haya borrado."
        action={{ label: "Buscar partidas", onClick: () => navigate("/partidas") }}
      />
    );
  }

  const m = match;
  const isHost = user?.id === m.hostId;
  const joined = players.some((p) => p.userId === user?.id);
  const left = spotsLeft(m);
  const myInvitation = invitations.find((i) => i.invitedUser === user?.id && i.status === "pending");
  const showTokenBanner = !!token && tokenInvite?.status === "pending" && !joined && !isHost && !myInvitation;
  const past = m.startsOn < new Date().toISOString().slice(0, 10);
  const open = m.status === "open" && !past;
  const here = savedPlace();
  const distance = here && m.lat != null && m.lng != null ? formatDistance(haversineKm(here, { lat: m.lat, lng: m.lng })) : null;
  const host = profiles.get(m.hostId);
  const title = m.title || `${FORMAT_LABEL[m.format]}${m.pointsLimit ? ` a ${m.pointsLimit} puntos` : ""}`;

  async function join() {
    if (!user) {
      openAuth("signup");
      return;
    }
    setBusy(true);
    try {
      await joinMatch(m.id, faction || null);
      toast.success("¡Apuntado! Coordina los detalles en el chat de la partida.");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!confirm("¿Abandonar la partida? Avisaremos al organizador.")) return;
    setBusy(true);
    try {
      await leaveMatch(m.id);
      setAddress(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm("¿Cancelar la partida? Avisaremos a los jugadores apuntados.")) return;
    setBusy(true);
    try {
      await cancelMatch(m.id);
      await load();
      toast.success("Partida cancelada");
    } finally {
      setBusy(false);
    }
  }

  async function kick(userId: string) {
    if (!confirm(`¿Quitar a ${profiles.get(userId)?.displayName ?? "este jugador"} de la partida?`)) return;
    await removeMatchPlayer(m.id, userId).catch(() => toast.error("No se pudo quitar."));
    await load();
  }

  return (
    <PageTransition>
      <Seo
        title={`${title} · ${matchDay(m.startsOn)} en ${m.venueType === "online" ? "online" : m.city || "España"}`}
        description={`Partida de Warhammer 40K: ${FORMAT_LABEL[m.format]}${m.pointsLimit ? ` a ${m.pointsLimit} puntos` : ""}, nivel ${LEVEL_LABEL[m.level].toLowerCase()}, ${matchPlace(m)}. Apúntate en Administratum.`}
        path={`/partidas/${m.id}`}
      />
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to="/partidas" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Partidas
        </Link>

        {m.status === "cancelled" && (
          <p className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="h-4 w-4" /> El organizador ha cancelado esta partida.
          </p>
        )}

        {open && (myInvitation || showTokenBanner) && (
          <InvitationBanner
            hostName={profiles.get(m.hostId)?.displayName ?? tokenInvite?.hostName ?? "Un jugador"}
            invitationId={myInvitation?.id}
            token={myInvitation ? undefined : (token ?? undefined)}
            signedIn={!!user}
            factions={factions}
            defaultFaction={favorite}
            onSignUp={() => openAuth("signup")}
            onDone={(accepted) => {
              setTokenInvite(null);
              if (accepted) navigate(`/partidas/${m.id}`, { replace: true });
              load();
            }}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <header className="space-y-4 rounded-3xl border border-border/60 bg-card/40 p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Partida abierta · {VENUE_LABEL[m.venueType]}</p>
              <h1 className="font-display text-3xl font-black leading-tight tracking-tight">{title}</h1>
              {m.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{m.description}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                <Fact icon={CalendarDays} label="Fecha" value={new Date(`${m.startsOn}T00:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} />
                <Fact icon={Clock} label="Horario" value={matchTime(m)} />
                <Fact icon={MapPin} label="Lugar" value={matchPlace(m)} hint={distance ?? undefined} />
                <Fact icon={Gauge} label="Nivel" value={LEVEL_LABEL[m.level]} hint={LEVEL_HINT[m.level]} />
                <Fact icon={Swords} label="Formato" value={`${FORMAT_LABEL[m.format]}${m.pointsLimit ? ` · ${m.pointsLimit} pts` : ""}`} />
                <Fact icon={Users} label="Plazas" value={`${m.playerCount} de ${m.maxPlayers}`} hint={left ? `${left} ${left === 1 ? "libre" : "libres"}` : "Completa"} />
              </div>
              {(joined || isHost) && m.venueType !== "online" && (
                <p className="flex items-start gap-2 rounded-xl border border-primary/30 bg-brand-soft p-3 text-sm">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>
                    <span className="font-medium">Dirección: </span>
                    {address || "El organizador aún no ha indicado la dirección exacta: pregúntala en el chat."}
                  </span>
                </p>
              )}
            </header>

            {m.lat != null && m.lng != null && (
              <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-card/40" />}>
                <MatchesMap matches={[m]} single className="h-64 w-full overflow-hidden rounded-2xl border border-border/60" />
                {m.venueType === "casa" && <p className="mt-1 text-xs text-muted-foreground">Ubicación aproximada: la dirección exacta solo la ven los jugadores.</p>}
              </Suspense>
            )}

            {(joined || isHost) ? (
              <section className="space-y-3">
                <h2 className="font-semibold">Chat de la partida</h2>
                <GroupChat
                  currentUserId={user?.id}
                  load={loadChat}
                  send={sendChat}
                  subscribe={subscribeChat}
                  emptyText="Saluda y concreta mesa, misión y escenografía."
                  className="h-[420px]"
                />
              </section>
            ) : (
              <p className="flex items-center gap-2 rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" /> Al apuntarte podrás ver la dirección exacta y hablar con los jugadores.
              </p>
            )}
          </div>

          <aside className="space-y-4">
            <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="font-semibold">Jugadores</h2>
              <ul className="space-y-3">
                {players.map((p) => {
                  const prof = profiles.get(p.userId);
                  return (
                    <li key={p.userId} className="flex items-center gap-3">
                      <Link to={`/perfil/${p.userId}`}>
                        <UserAvatar src={prof?.avatarUrl} name={prof?.displayName} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {prof?.displayName ?? "Jugador"}
                          {p.userId === m.hostId && <Crown className="h-3.5 w-3.5 text-primary" aria-label="Organizador" />}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{p.faction || "Ejército por decidir"}</p>
                      </div>
                      {isHost && p.userId !== m.hostId && open && (
                        <button type="button" onClick={() => kick(p.userId)} className="rounded p-1.5 text-muted-foreground hover:text-destructive" aria-label="Quitar jugador">
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
                {Array.from({ length: m.reservedCount ?? 0 }).map((_, i) => (
                  <li key={`reserved-${i}`} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-primary/40 text-primary">
                      <Swords className="h-4 w-4" />
                    </span>
                    Plaza reservada (invitación)
                  </li>
                ))}
                {Array.from({ length: left }).map((_, i) => (
                  <li key={`free-${i}`} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-border">?</span>
                    Plaza libre
                  </li>
                ))}
              </ul>

              {open && !isHost && !joined && !myInvitation && left > 0 && (
                <div className="space-y-2 border-t border-border/50 pt-4">
                  <label htmlFor="join-faction" className="text-xs text-muted-foreground">
                    Tu ejército
                  </label>
                  <select id="join-faction" value={faction} onChange={(e) => setFaction(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="">Aún no lo sé</option>
                    {factions.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <Button variant="gradient" className="w-full gap-2" onClick={join} disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}
                    {user ? "Apuntarme" : "Crea tu cuenta para apuntarte"}
                  </Button>
                </div>
              )}
              {joined && !isHost && open && (
                <Button variant="outline" className="w-full gap-2" onClick={leave} disabled={busy}>
                  <LogOut className="h-4 w-4" /> Abandonar
                </Button>
              )}
              {isHost && open && (
                <div className="flex gap-2 border-t border-border/50 pt-4">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/partidas/${m.id}/editar`)}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button variant="ghost" className="flex-1 gap-2 text-destructive hover:text-destructive" onClick={cancel} disabled={busy}>
                    <XCircle className="h-4 w-4" /> Cancelar
                  </Button>
                </div>
              )}
              {!open && m.status === "open" && <p className="text-xs text-muted-foreground">Esta partida ya se ha jugado.</p>}
            </section>

            {isHost && open && (
              <HostInvitations
                matchId={m.id}
                invitations={invitations}
                profiles={profiles}
                seatsLeft={left}
                exclude={[m.hostId, ...players.map((p) => p.userId), ...invitations.flatMap((i) => (i.invitedUser && i.status === "pending" ? [i.invitedUser] : []))]}
                onChange={load}
              />
            )}

            <Button
              variant="ghost"
              className="w-full gap-2"
              onClick={async () => {
                await copyText(`${window.location.origin}/partidas/${m.id}`);
                toast.success("Enlace copiado");
              }}
            >
              <Link2 className="h-4 w-4" /> Copiar enlace para compartir
            </Button>
            {host && (
              <p className="text-center text-xs text-muted-foreground">
                Organiza <Link to={`/perfil/${m.hostId}`} className="text-foreground hover:text-primary">{host.displayName}</Link>
              </p>
            )}
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}
