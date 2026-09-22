import { UnitPoints } from "@/components/catalog/UnitPoints";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getFactionCatalog, getUnitCatalog } from "@/db";
import { cn } from "@/lib/utils";
import type { Detachment, FactionCatalogEntry, UnitCatalogEntry } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    Award,
    Bot,
    ChevronDown,
    Crosshair,
    Library,
    Search,
    Shield,
    Sparkles,
    Sword,
    Target,
    Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface FactionSummary {
  slug: string;
  name: string;
  count: number;
  version: string | null;
  image: string | null;
  detachmentCount: number;
}

const CATEGORY_ICON: Record<string, typeof Users> = {
  vehicle: Bot,
  character: Crosshair,
  squad: Users,
};

const CATEGORY_LABEL: Record<string, string> = {
  vehicle: "Vehículos",
  character: "Personajes",
  squad: "Escuadras",
};

function categoryIcon(category: string) {
  return CATEGORY_ICON[category] ?? Sword;
}

function categoryLabel(category: string) {
  return CATEGORY_LABEL[category] ?? "Otros";
}

function joinFactions(
  units: UnitCatalogEntry[],
  factions: FactionCatalogEntry[],
): FactionSummary[] {
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
        image: null,
        detachmentCount: 0,
      });
    }
  }
  for (const faction of factions) {
    const current = map.get(faction.factionSlug);
    if (current) {
      current.image = faction.image;
      current.detachmentCount = faction.detachments.length;
      current.version ??= faction.mfmVersion;
    } else {
      map.set(faction.factionSlug, {
        slug: faction.factionSlug,
        name: faction.factionName,
        count: 0,
        version: faction.mfmVersion,
        image: faction.image,
        detachmentCount: faction.detachments.length,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function PointsCatalogPage() {
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitCatalogEntry[]>([]);
  const [factions, setFactions] = useState<FactionCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([
      getUnitCatalog("Warhammer 40,000"),
      getFactionCatalog("Warhammer 40,000"),
    ])
      .then(([u, f]) => {
        setUnits(u);
        setFactions(f);
      })
      .catch((err) => console.error("Failed to load catalog:", err))
      .finally(() => setLoading(false));
  }, []);

  const factionSummaries = useMemo(() => joinFactions(units, factions), [units, factions]);
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
    if (!q) return factionSummaries;
    return factionSummaries.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.slug.includes(q) ||
        matchingUnits.some((u) => u.factionSlug === f.slug),
    );
  }, [factionSummaries, q, matchingUnits]);

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
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="text-gradient animate-gradient">
              Catálogo de puntos
            </span>
          </h1>
          <p className="text-muted-foreground">
            Biblioteca Munitorum: busca una miniatura o entra en un ejército para
            ver unidades y destacamentos.
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
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence>
              {matchingFactions.map((faction) => (
                <motion.button
                  key={faction.slug}
                  type="button"
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0 },
                  }}
                  layout
                  onClick={() => navigate(`/catalogo-puntos/${faction.slug}`)}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-all hover:border-primary/40 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-muted to-background">
                    {faction.image ? (
                      <img
                        src={faction.image}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Shield className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="font-semibold text-white">{faction.name}</h3>
                      <p className="mt-0.5 text-xs text-white/70">
                        {faction.count} miniaturas
                        {faction.detachmentCount > 0
                          ? ` · ${faction.detachmentCount} destacamentos`
                          : ""}
                        {faction.version ? ` · MFM ${faction.version}` : ""}
                      </p>
                    </div>
                  </div>
                </motion.button>
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

function DetachmentCard({ detachment }: { detachment: Detachment }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition-colors hover:border-primary/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">{detachment.name}</h3>
            {detachment.dp !== null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <Target className="h-3 w-3" />
                {detachment.dp} DP
              </span>
            )}
          </div>
          {detachment.unique && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
              {detachment.unique}
            </p>
          )}
          {detachment.objectives.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {detachment.objectives.map((o) => (
                <span
                  key={o}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {o}
                </span>
              ))}
            </div>
          )}
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1 shrink-0 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && detachment.enhancements.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/60"
          >
            <div className="divide-y divide-border/50">
              {detachment.enhancements.map((e) => (
                <div
                  key={e.name}
                  className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.name}</p>
                    {(e.leaderTo?.length || e.supportTo?.length) && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {e.leaderTo?.length ? `Líder: ${e.leaderTo.join(", ")}` : ""}
                        {e.leaderTo?.length && e.supportTo?.length ? " · " : ""}
                        {e.supportTo?.length ? `Apoyo: ${e.supportTo.join(", ")}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                    +{e.points}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UnitCard({ unit }: { unit: UnitCatalogEntry }) {
  const Icon = categoryIcon(unit.category);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 transition-all hover:border-primary/40 hover:shadow-lg">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-4.5 w-4.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-semibold leading-tight">{unit.name}</p>
            {unit.legends && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Legends
              </Badge>
            )}
          </div>
          {unit.wargear?.length ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unit.wargear.map((w) => `${w.item} +${w.points}`).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
      <UnitPoints unit={unit} className="pl-[46px]" />
    </div>
  );
}

const CATEGORY_FILTERS = ["all", "character", "squad", "vehicle", "other"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

export function PointsCatalogFactionPage() {
  const { factionSlug } = useParams<{ factionSlug: string }>();
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitCatalogEntry[]>([]);
  const [faction, setFaction] = useState<FactionCatalogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [showLegends, setShowLegends] = useState(true);

  useEffect(() => {
    Promise.all([
      getUnitCatalog("Warhammer 40,000"),
      getFactionCatalog("Warhammer 40,000"),
    ])
      .then(([u, f]) => {
        setUnits(u);
        setFaction(f.find((x) => x.factionSlug === factionSlug) ?? null);
      })
      .catch((err) => console.error("Failed to load catalog:", err))
      .finally(() => setLoading(false));
  }, [factionSlug]);

  const armyUnits = useMemo(
    () => units.filter((u) => u.factionSlug === factionSlug),
    [units, factionSlug],
  );
  const factionName = faction?.factionName ?? armyUnits[0]?.factionName ?? factionSlug;
  const version = faction?.mfmVersion ?? armyUnits[0]?.mfmVersion;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of armyUnits) {
      const key = CATEGORY_ICON[u.category] ? u.category : "other";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [armyUnits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return armyUnits.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q)) return false;
      if (!showLegends && u.legends) return false;
      if (category === "all") return true;
      if (category === "other") return !CATEGORY_ICON[u.category];
      return u.category === category;
    });
  }, [armyUnits, query, category, showLegends]);

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

  if (armyUnits.length === 0 && !faction) {
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
      <div className="space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60">
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-muted to-background sm:aspect-[3/1]">
            {faction?.image ? (
              <img
                src={faction.image}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Shield className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
          </div>
          <button
            type="button"
            onClick={() => navigate("/catalogo-puntos")}
            className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {factionName}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {armyUnits.length} miniaturas
              {faction?.detachments.length ? ` · ${faction.detachments.length} destacamentos` : ""}
              {version ? ` · MFM ${version}` : ""}
            </p>
          </div>
        </div>

        {/* Detachments */}
        {faction && faction.detachments.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Destacamentos</h2>
              <Badge variant="secondary">{faction.detachments.length}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {faction.detachments.map((d) => (
                <DetachmentCard key={d.name} detachment={d} />
              ))}
            </div>
          </section>
        )}

        {/* Units */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Unidades</h2>
            <Badge variant="secondary">{armyUnits.length}</Badge>
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

          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_FILTERS.map((c) => {
              const count = c === "all" ? armyUnits.length : categoryCounts[c] ?? 0;
              if (c !== "all" && count === 0) return null;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    category === c
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {c === "all" ? "Todas" : categoryLabel(c)}
                  <span className="ml-1.5 opacity-60">{count}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowLegends((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                showLegends
                  ? "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-destructive",
              )}
            >
              {showLegends ? "Ocultar Legends" : "Legends ocultas"}
            </button>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ninguna miniatura coincide con la búsqueda.
            </p>
          ) : (
            groups.map(([group, list]) => (
              <div key={group} className="space-y-2.5">
                {groups.length > 1 && group !== "Unidades" && (
                  <h3 className="flex items-center gap-2 pt-1 text-sm font-semibold text-muted-foreground">
                    {group}
                    <span className="h-px flex-1 bg-border/60" />
                  </h3>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((unit) => (
                    <UnitCard key={unit.id} unit={unit} />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </PageTransition>
  );
}
