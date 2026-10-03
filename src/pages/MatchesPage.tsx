import { MatchCard } from "@/components/matches/MatchCard";
import { PlacePicker } from "@/components/matches/PlacePicker";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { getMyMatches, getProfilesByIds, searchMatches } from "@/db";
import { savedPlace, savePlace, type Place } from "@/lib/geo";
import { LEVEL_LABEL, VENUE_LABEL } from "@/lib/matches";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import type { Match, MatchLevel, Profile, VenueType } from "@/types";
import { Dices, List, Loader2, Map as MapIcon, Plus } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Leaflet only loads when the map is opened.
const MatchesMap = lazy(() => import("@/components/matches/MatchesMap").then((m) => ({ default: m.MatchesMap })));

const RADII = [10, 25, 50, 100, 250] as const;
type When = "all" | "today" | "week" | "weekend";
const WHEN_LABEL: Record<When, string> = { all: "Cualquier día", today: "Hoy", week: "Próximos 7 días", weekend: "Este fin de semana" };

function inWindow(startsOn: string, when: When): boolean {
  if (when === "all") return true;
  const d = new Date(`${startsOn}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (when === "today") return days === 0;
  if (when === "week") return days <= 7;
  // Weekend: the coming Saturday and Sunday (or today, if it is one).
  const untilSaturday = (6 - today.getDay() + 7) % 7;
  return d.getDay() % 6 === 0 && days <= untilSaturday + 1;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Find a game: open games near a place (or anywhere), filtered by day,
 * level and venue, as a list or on a map. Public; joining needs an account.
 */
export function MatchesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const openAuth = useAuthStore((s) => s.openAuth);
  const [place, setPlace] = useState<Place | null>(() => savedPlace());
  const [radius, setRadius] = useState<number | null>(50);
  const [includeOnline, setIncludeOnline] = useState(true);
  const [when, setWhen] = useState<When>("all");
  const [level, setLevel] = useState<MatchLevel | null>(null);
  const [venue, setVenue] = useState<VenueType | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [tab, setTab] = useState<"near" | "mine">("near");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [mine, setMine] = useState<Match[]>([]);
  const [hosts, setHosts] = useState<Map<string, Profile>>(new Map());

  useEffect(() => {
    savePlace(place);
    setMatches(null);
    searchMatches({ lat: place?.lat, lng: place?.lng, radiusKm: place ? radius : null, includeOnline }).then(setMatches);
  }, [place, radius, includeOnline]);

  useEffect(() => {
    if (user) getMyMatches().then(setMine);
  }, [user]);

  const shown = useMemo(
    () =>
      (tab === "mine" ? mine : (matches ?? [])).filter(
        (m) => inWindow(m.startsOn, when) && (!level || m.level === level) && (!venue || m.venueType === venue),
      ),
    [tab, mine, matches, when, level, venue],
  );

  useEffect(() => {
    const missing = [...new Set(shown.map((m) => m.hostId))].filter((id) => !hosts.has(id));
    if (missing.length) getProfilesByIds(missing).then((p) => setHosts((prev) => new Map([...prev, ...p])));
  }, [shown, hosts]);

  const mineIds = new Set(mine.map((m) => m.id));
  const publish = () => (user ? navigate("/partidas/nueva") : openAuth("signup"));

  return (
    <PageTransition>
      <Seo
        title="Partidas de Warhammer 40K cerca de ti"
        description="Encuentra rivales para jugar a Warhammer 40.000 cerca de ti: partidas abiertas en tiendas, clubes, en casa u online, con fecha, nivel y ejército. Publica la tuya gratis."
        path="/partidas"
      />
      <div className="space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 p-6 sm:p-8">
          <img src="/images/landing-hero.jpg" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="relative max-w-2xl space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Buscador de partidas</p>
            <h1 className="font-display text-3xl font-black leading-tight tracking-tight sm:text-4xl">Encuentra rival para tu próxima partida</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Partidas abiertas cerca de ti, en tiendas, clubes, en casa u online. Apúntate a la que te encaje o publica la tuya.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <PlacePicker value={place} onChange={setPlace} placeholder="¿Dónde quieres jugar? Ciudad o dirección" className="flex-1" />
              <Button variant="gradient" className="h-10 gap-2" onClick={publish}>
                <Plus className="h-4 w-4" /> Publicar partida
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          {user && (
            <div className="mr-2 flex rounded-xl border border-border/60 p-0.5">
              {(
                [
                  ["near", "Buscar"],
                  ["mine", `Mis partidas${mine.length ? ` (${mine.length})` : ""}`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", tab === key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {tab === "near" && place && (
            <select
              value={radius ?? ""}
              onChange={(e) => setRadius(e.target.value ? Number(e.target.value) : null)}
              className="h-9 rounded-full border border-border/60 bg-transparent px-3 text-xs"
              aria-label="Distancia"
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  A menos de {r} km
                </option>
              ))}
              <option value="">Cualquier distancia</option>
            </select>
          )}
          <select
            value={when}
            onChange={(e) => setWhen(e.target.value as When)}
            className="h-9 rounded-full border border-border/60 bg-transparent px-3 text-xs"
            aria-label="Cuándo"
          >
            {(Object.keys(WHEN_LABEL) as When[]).map((w) => (
              <option key={w} value={w}>
                {WHEN_LABEL[w]}
              </option>
            ))}
          </select>
          <div className="ml-auto flex rounded-xl border border-border/60 p-0.5">
            {(
              [
                ["list", List, "Lista"],
                ["map", MapIcon, "Mapa"],
              ] as const
            ).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm", view === key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
                aria-pressed={view === key}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!level} onClick={() => setLevel(null)}>
            Todos los niveles
          </Chip>
          {(Object.keys(LEVEL_LABEL) as MatchLevel[]).map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(level === l ? null : l)}>
              {LEVEL_LABEL[l]}
            </Chip>
          ))}
          <span className="mx-1 w-px shrink-0 bg-border/60" />
          {(Object.keys(VENUE_LABEL) as VenueType[]).map((v) => (
            <Chip key={v} active={venue === v} onClick={() => setVenue(venue === v ? null : v)}>
              {VENUE_LABEL[v]}
            </Chip>
          ))}
          {tab === "near" && (
            <Chip active={!includeOnline} onClick={() => setIncludeOnline((v) => !v)}>
              Sin online
            </Chip>
          )}
        </div>

        {tab === "near" && matches === null ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : view === "map" ? (
          <Suspense fallback={<div className="h-[480px] animate-pulse rounded-2xl bg-card/40" />}>
            <MatchesMap matches={shown} center={place} />
            {shown.some((m) => m.venueType === "online") && (
              <p className="mt-2 text-xs text-muted-foreground">Las partidas online no aparecen en el mapa: míralas en la vista de lista.</p>
            )}
          </Suspense>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-6 py-16 text-center">
            <Dices className="mx-auto h-9 w-9 text-muted-foreground/40" />
            <p className="mt-3 font-medium">{tab === "mine" ? "No tienes partidas próximas" : "No hay partidas con estos filtros"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "mine" ? "Apúntate a una o publica la tuya." : place ? "Prueba a ampliar la distancia o publica la primera de tu zona." : "Sé el primero en publicar una partida."}
            </p>
            <Button variant="gradient" className="mt-4 gap-2" onClick={publish}>
              <Plus className="h-4 w-4" /> Publicar partida
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {shown.map((m) => (
              <MatchCard key={m.id} match={m} host={hosts.get(m.hostId)} joined={mineIds.has(m.id) && m.hostId !== user?.id} />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
