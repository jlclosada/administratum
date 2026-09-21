import { UnitPoints } from "@/components/catalog/UnitPoints";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUnitCatalog } from "@/db";
import type { UnitCatalogEntry } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Library, Search, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface FactionSummary {
  slug: string;
  name: string;
  count: number;
  version: string | null;
}

function groupFactions(units: UnitCatalogEntry[]): FactionSummary[] {
  const map = new Map<string, FactionSummary>();
  for (const unit of units) {
    const current = map.get(unit.factionSlug);
    if (current) {
      current.count += 1;
    } else {
      map.set(unit.factionSlug, {
        slug: unit.factionSlug,
        name: unit.factionName,
        count: 1,
        version: unit.mfmVersion,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function PointsCatalogPage() {
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getUnitCatalog("Warhammer 40,000")
      .then(setUnits)
      .catch((err) => console.error("Failed to load catalog:", err))
      .finally(() => setLoading(false));
  }, []);

  const factions = useMemo(() => groupFactions(units), [units]);
  const q = query.trim().toLowerCase();

  const matchingUnits = useMemo(() => {
    if (!q) return [];
    return units
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.factionName.toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [units, q]);

  const matchingFactions = useMemo(() => {
    if (!q) return factions;
    return factions.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.slug.includes(q) ||
        matchingUnits.some((u) => u.factionSlug === f.slug),
    );
  }, [factions, q, matchingUnits]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando catálogo..." />
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={<Library className="h-8 w-8 text-muted-foreground" />}
          title="Catálogo vacío"
          description="Un administrador debe sincronizar el Munitorum Field Manual desde el panel de administración."
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="text-gradient animate-gradient">
              Catálogo de puntos
            </span>
          </h1>
          <p className="text-muted-foreground">
            Biblioteca Munitorum: busca una miniatura o entra en un ejército para
            ver todos los valores.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar miniatura o ejército…"
            className="pl-10"
            autoFocus
          />
        </div>

        {q && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Miniaturas</h2>
              <Badge variant="secondary">{matchingUnits.length}</Badge>
            </div>
            {matchingUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ninguna miniatura coincide con «{query}».
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60">
                {matchingUnits.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() =>
                      navigate(`/catalogo-puntos/${unit.factionSlug}`)
                    }
                    className="flex w-full flex-col gap-2 border-b border-border/50 px-4 py-3 text-left last:border-0 hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{unit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {unit.factionName}
                        {unit.legends ? " · Legends" : ""}
                      </p>
                    </div>
                    <UnitPoints unit={unit} className="sm:max-w-md sm:text-right" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Ejércitos</h2>
            <Badge variant="secondary">{matchingFactions.length}</Badge>
          </div>
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.03 } },
            }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence>
              {matchingFactions.map((faction) => (
                <motion.div
                  key={faction.slug}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0 },
                  }}
                  layout
                >
                  <Card
                    className="cursor-pointer transition-all hover:border-primary/40 hover:shadow-lg"
                    onClick={() => navigate(`/catalogo-puntos/${faction.slug}`)}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{faction.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {faction.count} miniaturas
                          {faction.version ? ` · MFM ${faction.version}` : ""}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </section>

        <p className="text-[11px] text-muted-foreground">
          Valores del Munitorum Field Manual. No es un producto oficial de
          Games Workshop.
        </p>
      </div>
    </PageTransition>
  );
}

export function PointsCatalogFactionPage() {
  const { factionSlug } = useParams<{ factionSlug: string }>();
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getUnitCatalog("Warhammer 40,000")
      .then(setUnits)
      .catch((err) => console.error("Failed to load catalog:", err))
      .finally(() => setLoading(false));
  }, []);

  const armyUnits = useMemo(
    () => units.filter((u) => u.factionSlug === factionSlug),
    [units, factionSlug],
  );
  const factionName = armyUnits[0]?.factionName ?? factionSlug;
  const version = armyUnits[0]?.mfmVersion;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return armyUnits;
    return armyUnits.filter((u) => u.name.toLowerCase().includes(q));
  }, [armyUnits, query]);

  const groups = useMemo(() => {
    const map = new Map<string, UnitCatalogEntry[]>();
    for (const unit of filtered) {
      const key = unit.groupTitle || "Unidades";
      const list = map.get(key) ?? [];
      list.push(unit);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando ejército..." />
      </div>
    );
  }

  if (armyUnits.length === 0) {
    return (
      <PageTransition>
        <EmptyState
          title="Ejército no encontrado"
          description="Esa facción no está en el catálogo."
          action={{
            label: "Volver al catálogo",
            onClick: () => navigate("/catalogo-puntos"),
          }}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/catalogo-puntos")}
            className="mt-1 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {factionName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {armyUnits.length} miniaturas
              {version ? ` · MFM ${version}` : ""}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar miniatura…"
            className="pl-10"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguna miniatura coincide con la búsqueda.
          </p>
        ) : (
          groups.map(([group, list]) => (
            <section key={group} className="space-y-2">
              {groups.length > 1 && group !== "Unidades" && (
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {group}
                </h2>
              )}
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/60">
                    {list.map((unit) => (
                      <div
                        key={unit.id}
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{unit.name}</p>
                            {unit.legends && (
                              <Badge variant="outline" className="text-[10px]">
                                Legends
                              </Badge>
                            )}
                          </div>
                          {unit.wargear?.length ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {unit.wargear
                                .map((w) => `${w.item} +${w.points}`)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <UnitPoints
                          unit={unit}
                          className="sm:max-w-md sm:shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          ))
        )}
      </div>
    </PageTransition>
  );
}
