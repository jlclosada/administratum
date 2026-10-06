import { MatchInvitePicker } from "@/components/matches/MatchInvitePicker";
import { PlacePicker } from "@/components/matches/PlacePicker";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COLLECTION_GAME_NAME, createMatch, getFactionCatalog, getMatch, getMatchAddress, inviteToMatch, sendMatchInviteEmails, updateMatch } from "@/db";
import type { Place } from "@/lib/geo";
import { FORMAT_LABEL, LEVEL_HINT, LEVEL_LABEL, VENUE_LABEL } from "@/lib/matches";
import { cn } from "@/lib/utils";
import { useAuthStore, useProfileStore } from "@/stores";
import type { CreateMatchDTO, MatchFormat, MatchInvitee, MatchLevel, VenueType } from "@/types";
import { ArrowLeft, Building2, Globe, Home, Loader2, MapPin, Store, Swords, Users } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const VENUE_ICON: Record<VenueType, typeof Store> = { tienda: Store, club: Building2, casa: Home, online: Globe, otro: MapPin };
const VENUE_NAME: Record<VenueType, { label: string; placeholder: string }> = {
  tienda: { label: "Nombre de la tienda", placeholder: "Dungeon Marvels, Games Workshop Madrid…" },
  club: { label: "Nombre del club", placeholder: "Club La Letanía del Oso" },
  casa: { label: "Referencia (opcional)", placeholder: "Mesa preparada, tengo escenografía…" },
  online: { label: "Plataforma", placeholder: "Tabletop Simulator, Discord…" },
  otro: { label: "Lugar", placeholder: "Centro cívico, asociación…" },
};
const POINTS = [500, 1000, 1500, 2000, 3000];
const today = () => new Date().toISOString().slice(0, 10);

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Publish (or edit) an open game: what, where, when, army and level. */
export function MatchFormPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const myId = useAuthStore((s) => s.user?.id);
  const favorite = useProfileStore((s) => s.profile?.favoriteFaction ?? null);
  const [loading, setLoading] = useState(!!matchId);
  const [saving, setSaving] = useState(false);
  const [factions, setFactions] = useState<string[]>([]);

  const [format, setFormat] = useState<MatchFormat>("equilibrado");
  const [points, setPoints] = useState<number | null>(2000);
  const [faction, setFaction] = useState<string>(favorite ?? "");
  const [level, setLevel] = useState<MatchLevel>("casual");
  const [venueType, setVenueType] = useState<VenueType>("tienda");
  const [venueName, setVenueName] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(today());
  const [timeMode, setTimeMode] = useState<"fixed" | "flexible">("fixed");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [invitees, setInvitees] = useState<MatchInvitee[]>([]);

  useEffect(() => {
    getFactionCatalog(COLLECTION_GAME_NAME).then((f) => setFactions(f.map((x) => x.factionName).sort((a, b) => a.localeCompare(b, "es"))));
  }, []);

  useEffect(() => {
    if (!matchId) return;
    Promise.all([getMatch(matchId), getMatchAddress(matchId)]).then(([m, addr]) => {
      if (!m || m.hostId !== myId) {
        navigate(`/partidas/${matchId}`, { replace: true });
        return;
      }
      setFormat(m.format);
      setPoints(m.pointsLimit);
      setFaction(m.hostFaction ?? "");
      setLevel(m.level);
      setVenueType(m.venueType);
      setVenueName(m.venueName);
      setPlace(m.lat != null && m.lng != null ? { label: m.city || "Ubicación guardada", city: m.city, lat: m.lat, lng: m.lng } : null);
      setAddress(addr ?? "");
      setDate(m.startsOn);
      setTimeMode(m.timeMode);
      setStartTime(m.startTime?.slice(0, 5) ?? "");
      setEndTime(m.endTime?.slice(0, 5) ?? "");
      setTimeNote(m.timeNote);
      setMaxPlayers(m.maxPlayers);
      setTitle(m.title);
      setDescription(m.description);
      setLoading(false);
    });
  }, [matchId, myId, navigate]);

  const online = venueType === "online";
  const valid = !!date && date >= today() && (online || !!place) && (timeMode === "flexible" || !!startTime);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    const dto: CreateMatchDTO = {
      title: title.trim(),
      description: description.trim(),
      format,
      pointsLimit: points,
      hostFaction: faction || null,
      level,
      venueType,
      venueName: venueName.trim(),
      city: online ? "" : (place?.city || place?.label.split(",")[0] || "").trim(),
      lat: online ? null : (place?.lat ?? null),
      lng: online ? null : (place?.lng ?? null),
      startsOn: date,
      timeMode,
      startTime: startTime || null,
      endTime: endTime || null,
      timeNote: timeMode === "flexible" ? timeNote.trim() : "",
      maxPlayers,
      address: online ? "" : address,
    };
    try {
      const saved = matchId ? await updateMatch(matchId, dto) : await createMatch(dto);
      if (!matchId && invitees.length > 0) {
        // Seats for the agreed opponents, then the emails (best effort).
        const failed: string[] = [];
        for (const i of invitees) {
          await inviteToMatch(saved.id, i).catch((err: Error) => failed.push(`${i.kind === "user" ? i.profile.displayName : i.email}: ${err.message}`));
        }
        const emailed = await sendMatchInviteEmails(saved.id).catch(() => 0);
        if (failed.length) toast.warning(`No se pudo invitar a ${failed.join("; ")}`);
        toast.success(
          `¡Partida publicada! ${invitees.length - failed.length} ${invitees.length - failed.length === 1 ? "invitación enviada" : "invitaciones enviadas"}${emailed ? " por correo" : ""}.`,
        );
      } else {
        toast.success(matchId ? "Partida actualizada" : "¡Partida publicada! Te avisaremos cuando alguien se apunte.");
      }
      navigate(`/partidas/${saved.id}`);
    } catch {
      toast.error("No se pudo guardar la partida. Revisa los datos.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <PageTransition>
      <Seo title={matchId ? "Editar partida" : "Publicar partida"} path="/partidas/nueva" noindex />
      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
        <Link to={matchId ? `/partidas/${matchId}` : "/partidas"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {matchId ? "Volver a la partida" : "Partidas"}
        </Link>
        <header>
          <h1 className="font-display text-3xl font-black tracking-tight">{matchId ? "Editar partida" : "Publicar una partida"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Los jugadores cercanos la verán en el buscador y podrán apuntarse hasta completar las plazas.</p>
        </header>

        {/* Where */}
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="font-semibold">¿Dónde?</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(Object.keys(VENUE_LABEL) as VenueType[]).map((v) => {
              const Icon = VENUE_ICON[v];
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVenueType(v)}
                  aria-pressed={venueType === v}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors",
                    venueType === v ? "border-primary/60 bg-brand-soft text-foreground" : "border-border/60 text-muted-foreground hover:border-primary/30",
                  )}
                >
                  <Icon className={cn("h-5 w-5", venueType === v && "text-primary")} />
                  {VENUE_LABEL[v]}
                </button>
              );
            })}
          </div>
          <Field label={VENUE_NAME[venueType].label} htmlFor="m-venue">
            <Input id="m-venue" value={venueName} onChange={(e) => setVenueName(e.target.value)} maxLength={120} placeholder={VENUE_NAME[venueType].placeholder} />
          </Field>
          {!online && (
            <>
              <Field
                label="Ubicación"
                htmlFor="m-place"
                hint={
                  venueType === "casa"
                    ? "Para partidas en casa solo se publica la zona aproximada (~1 km), nunca tu dirección."
                    : "Sirve para que la encuentren los jugadores cercanos."
                }
              >
                <PlacePicker id="m-place" value={place} onChange={setPlace} />
              </Field>
              <Field label="Dirección exacta (opcional)" htmlFor="m-address" hint="Solo la verán los jugadores apuntados.">
                <Input id="m-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} placeholder="Calle, número, piso…" />
              </Field>
            </>
          )}
        </section>

        {/* When */}
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="font-semibold">¿Cuándo?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha" htmlFor="m-date">
              <Input id="m-date" type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Horario">
              <div className="flex rounded-xl border border-border/60 p-0.5">
                {(
                  [
                    ["fixed", "Hora cerrada"],
                    ["flexible", "Flexible"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTimeMode(key)}
                    className={cn("flex-1 rounded-lg px-3 py-1.5 text-sm", timeMode === key ? "bg-accent font-medium text-foreground" : "text-muted-foreground")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={timeMode === "fixed" ? "Empieza" : "Desde (opcional)"} htmlFor="m-start">
              <Input id="m-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required={timeMode === "fixed"} />
            </Field>
            <Field label="Hasta (opcional)" htmlFor="m-end">
              <Input id="m-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
            {timeMode === "flexible" && (
              <Field label="Nota" htmlFor="m-note">
                <Input id="m-note" value={timeNote} onChange={(e) => setTimeNote(e.target.value)} maxLength={80} placeholder="Por la tarde, a convenir…" />
              </Field>
            )}
          </div>
        </section>

        {/* Game */}
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-5">
          <h2 className="font-semibold">La partida</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Formato" htmlFor="m-format">
              <select id="m-format" value={format} onChange={(e) => setFormat(e.target.value as MatchFormat)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                {(Object.keys(FORMAT_LABEL) as MatchFormat[]).map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABEL[f]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tu ejército" htmlFor="m-faction">
              <select id="m-faction" value={faction} onChange={(e) => setFaction(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">Aún no lo sé</option>
                {factions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Puntos">
            <div className="flex flex-wrap items-center gap-2">
              {POINTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPoints(p)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    points === p ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
              <Input
                type="number"
                min={0}
                max={10000}
                step={50}
                value={points ?? ""}
                onChange={(e) => setPoints(e.target.value ? Number(e.target.value) : null)}
                className="w-28"
                aria-label="Otros puntos"
              />
            </div>
          </Field>
          <Field label="Tu nivel">
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(LEVEL_LABEL) as MatchLevel[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  aria-pressed={level === l}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    level === l ? "border-primary/60 bg-brand-soft" : "border-border/60 hover:border-primary/30",
                  )}
                >
                  <span className="block text-sm font-medium">{LEVEL_LABEL[l]}</span>
                  <span className="block text-xs text-muted-foreground">{LEVEL_HINT[l]}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Jugadores" htmlFor="m-players" hint="Contándote a ti: 2 para un 1 contra 1, 4 para un 2 contra 2.">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <select id="m-players" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                {[2, 3, 4, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} jugadores
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Título (opcional)" htmlFor="m-title">
            <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Busco rival para probar lista de torneo" />
          </Field>
          <Field label="Detalles (opcional)" htmlFor="m-desc">
            <Textarea
              id="m-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Misión, escenografía, si traes mesa, lo que buscas en un rival…"
            />
          </Field>
        </section>

        {!matchId && (
          <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-5">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Swords className="h-4 w-4 text-primary" /> ¿Ya tienes rival? (opcional)
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Invita a quien ya has quedado: búscalo por nombre o escribe su correo si aún no está en Administratum. Le reservamos la
                plaza y le enviamos la invitación.
              </p>
            </div>
            <MatchInvitePicker value={invitees} onChange={setInvitees} max={maxPlayers - 1} exclude={myId ? [myId] : []} disabled={saving} />
          </section>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="gradient" size="lg" disabled={!valid || saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {matchId ? "Guardar cambios" : "Publicar partida"}
          </Button>
          {!valid && <p className="text-xs text-muted-foreground">{!online && !place ? "Indica la ubicación." : "Revisa la fecha y la hora."}</p>}
        </div>
      </form>
    </PageTransition>
  );
}
