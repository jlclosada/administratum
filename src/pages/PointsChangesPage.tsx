import { DeltaBadge } from "@/components/home/HomeWidgets";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Input } from "@/components/ui/input";
import { getPointsChanges } from "@/db";
import { pointsDeltaOf, updateModels, updateTarget } from "@/lib/catalogUpdates";
import { factionDisplayName } from "@/lib/factionNames";
import { SEO_POINTS_CHANGES } from "@/lib/seoCopy";
import { cn } from "@/lib/utils";
import type { CatalogUpdate } from "@/types";
import { ArrowDown, ArrowUp, Library, Search, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

interface Change {
  update: CatalogUpdate;
  unit: string;
  faction: string;
  slug: string | null;
  href: string;
  delta: number;
  models: number | null;
}

type Direction = "all" | "up" | "down";

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayLabel = (key: string, long = false) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("es-ES", long ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short" });

function Stat({ label, value, tone, hint }: { label: string; value: string | number; tone?: "up" | "down"; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-black tabular-nums",
          tone === "up" && "text-rose-400",
          tone === "down" && "text-emerald-400",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * "Cambios de puntos": every change detected in the latest Munitorum Field
 * Manual updates, grouped by update day and faction — what went up and what
 * went down, without browsing every army.
 */
export function PointsChangesPage() {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [faction, setFaction] = useState("");
  const [direction, setDirection] = useState<Direction>("all");

  useEffect(() => {
    getPointsChanges().then((rows) => {
      const list = rows.flatMap((u) => {
        const delta = pointsDeltaOf(u);
        if (delta === null) return [];
        return [{ update: u, ...updateTarget(u), delta, models: updateModels(u) }];
      });
      setChanges(list);
      setDay(list[0] ? dayKey(list[0].update.occurredAt) : null);
    });
  }, []);

  const days = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of changes ?? []) counts.set(dayKey(c.update.occurredAt), (counts.get(dayKey(c.update.occurredAt)) ?? 0) + 1);
    return [...counts.entries()];
  }, [changes]);

  const ofDay = useMemo(() => (changes ?? []).filter((c) => day && dayKey(c.update.occurredAt) === day), [changes, day]);
  const factions = useMemo(
    () =>
      [...new Map(ofDay.map((c) => [c.slug ?? c.faction, { key: c.slug ?? c.faction, slug: c.slug, faction: c.faction }])).values()].sort((a, b) =>
        a.faction.localeCompare(b.faction, "es"),
      ),
    [ofDay],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ofDay.filter(
      (c) =>
        (!q || c.unit.toLowerCase().includes(q)) &&
        (!faction || (c.slug ?? c.faction) === faction) &&
        (direction === "all" || (direction === "up" ? c.delta > 0 : c.delta < 0)),
    );
  }, [ofDay, query, faction, direction]);

  const groups = useMemo(() => {
    const map = new Map<string, Change[]>();
    for (const c of shown) map.set(c.slug ?? c.faction, [...(map.get(c.slug ?? c.faction) ?? []), c]);
    return [...map.entries()]
      .map(([key, list]) => ({ key, faction: list[0]!.faction, slug: list[0]!.slug, list: list.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)) }))
      .sort((a, b) => b.list.length - a.list.length);
  }, [shown]);

  const ups = ofDay.filter((c) => c.delta > 0);
  const downs = ofDay.filter((c) => c.delta < 0);
  const maxUp = [...ups].sort((a, b) => b.delta - a.delta)[0];
  const maxDown = [...downs].sort((a, b) => a.delta - b.delta)[0];
  const name = (c: { slug: string | null; faction: string }) => (c.slug ? factionDisplayName(c.slug, c.faction) : c.faction);

  return (
    <PageTransition>
      <Seo {...SEO_POINTS_CHANGES} path="/cambios-puntos" />
      <div className="space-y-6">
        <header className="space-y-5 rounded-3xl border border-border/60 bg-card/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Munitorum Field Manual</p>
              <h1 className="mt-1 font-display text-3xl font-black tracking-tight sm:text-4xl">Cambios de puntos</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Lo que sube y lo que baja en cada actualización de Warhammer 40K, detectado en cuanto Games Workshop la publica.
              </p>
            </div>
            <Link to="/catalogo-puntos" className="flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm transition-colors hover:border-primary/40 hover:text-primary">
              <Library className="h-4 w-4" /> Catálogo completo
            </Link>
          </div>
          {day && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label={`Cambios · ${dayLabel(day)}`} value={ofDay.length} hint={`${factions.length} facciones`} />
              <Stat label="Suben ▲" value={ups.length} tone="up" hint={maxUp ? `Más: ${maxUp.unit} (+${maxUp.delta})` : undefined} />
              <Stat label="Bajan ▼" value={downs.length} tone="down" hint={maxDown ? `Más: ${maxDown.unit} (${maxDown.delta})` : undefined} />
              <Stat label="Mayor cambio" value={maxUp && (!maxDown || maxUp.delta >= -maxDown.delta) ? `+${maxUp.delta}` : maxDown ? `${maxDown.delta}` : "—"} hint={(maxUp && (!maxDown || maxUp.delta >= -maxDown.delta) ? maxUp : maxDown)?.unit} />
            </div>
          )}
        </header>

        {changes === null ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Cargando cambios…" />
          </div>
        ) : changes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-6 py-16 text-center">
            <Target className="mx-auto h-9 w-9 text-muted-foreground/40" />
            <p className="mt-3 font-medium">Todavía no hay cambios de puntos registrados</p>
            <p className="mt-1 text-sm text-muted-foreground">Aparecerán aquí en cuanto se publique la próxima actualización del Munitorum.</p>
          </div>
        ) : (
          <>
            {days.length > 1 && (
              <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Actualizaciones">
                {days.map(([key, count]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDay(key)}
                    aria-pressed={day === key}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      day === key ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {dayLabel(key)} · {count}
                  </button>
                ))}
              </nav>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar unidad" className="pl-9" aria-label="Buscar unidad" />
              </div>
              <select
                value={faction}
                onChange={(e) => setFaction(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm sm:w-64"
                aria-label="Facción"
              >
                <option value="">Todas las facciones</option>
                {factions.map((f) => (
                  <option key={f.key} value={f.key}>
                    {name(f)}
                  </option>
                ))}
              </select>
              <div className="flex rounded-xl border border-border/60 p-0.5">
                {(
                  [
                    ["all", "Todos", null],
                    ["up", "Suben", ArrowUp],
                    ["down", "Bajan", ArrowDown],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDirection(key)}
                    aria-pressed={direction === key}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm",
                      direction === key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {Icon && <Icon className={cn("h-3.5 w-3.5", key === "up" ? "text-rose-400" : "text-emerald-400")} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {groups.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Ningún cambio coincide con los filtros.</p>
            ) : (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                {groups.map((g) => {
                  const up = g.list.filter((c) => c.delta > 0).length;
                  const down = g.list.length - up;
                  return (
                    <section key={g.key} className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
                      <header className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
                        {g.slug ? (
                          <Link to={`/catalogo-puntos/${g.slug}`} className="min-w-0 truncate font-semibold hover:text-primary">
                            {name(g)}
                          </Link>
                        ) : (
                          <span className="min-w-0 truncate font-semibold">{g.faction || "Otras"}</span>
                        )}
                        <span className="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
                          {up > 0 && (
                            <span className="flex items-center gap-0.5 text-rose-400">
                              <ArrowUp className="h-3 w-3" />
                              {up}
                            </span>
                          )}
                          {down > 0 && (
                            <span className="flex items-center gap-0.5 text-emerald-400">
                              <ArrowDown className="h-3 w-3" />
                              {down}
                            </span>
                          )}
                        </span>
                      </header>
                      <ul className="divide-y divide-border/50">
                        {g.list.map((c) => (
                          <li key={c.update.id}>
                            <Link to={c.href} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40">
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium">{c.unit}</span>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {c.update.pointsBefore != null && c.update.pointsAfter != null ? `${c.update.pointsBefore} → ${c.update.pointsAfter} pts` : c.update.description}
                                  {c.models ? ` · ${c.models} ${c.models === 1 ? "miniatura" : "miniaturas"}` : ""}
                                </span>
                              </span>
                              <DeltaBadge update={c.update} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
            {day && <p className="text-center text-xs text-muted-foreground">Actualización detectada el {dayLabel(day, true)}.</p>}
          </>
        )}
      </div>
    </PageTransition>
  );
}
