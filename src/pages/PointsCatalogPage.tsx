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
    Users,
} from "lucide-react";
import type { ReactNode } from "react";
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

const CATEGORY_ACCENT: Record<string, string> = {
  vehicle: "border-l-amber-500/70",
  character: "border-l-sky-500/70",
  squad: "border-l-emerald-500/70",
};

function categoryLabel(category: string) {
  return CATEGORY_LABEL[category] ?? "Otros";
}

function categoryAccent(category: string) {
  return CATEGORY_ACCENT[category] ?? "border-l-violet-500/70";
}

/**
 * Terminal-readout chrome for the catalog's list sections — same panel
 * language as the home page's transmission log, dark + monospace + a
 * status dot. Body rows stay in the regular sans/foreground colors so the
 * data itself (what people are here to read) is never harder to scan.
 */
function ConsolePanel({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-emerald-500/20 bg-[#050807]">
      <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse-glow" />
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-emerald-500/80">
          {label}
        </span>
        {count !== undefined && (
          <span className="ml-auto font-mono text-[11px] tabular-nums text-emerald-500/50">
            {String(count).padStart(3, "0")}
          </span>
        )}
      </div>
      {children}
    </div>
  );
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
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Catálogo de puntos
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
              <ConsolePanel label="Búsqueda // resultados" count={matchingUnits.length}>
                {matchingUnits.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() =>
                      navigate(`/catalogo-puntos/${unit.factionSlug}`)
                    }
                    className={cn(
                      "flex w-full flex-col gap-2 border-b border-b-emerald-500/10 border-l-2 px-4 py-3 text-left last:border-b-0 hover:bg-emerald-500/[0.05] sm:flex-row sm:items-center sm:justify-between",
                      categoryAccent(unit.category),
                    )}
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
              </ConsolePanel>
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

function DetachmentRow({ detachment }: { detachment: Detachment }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-500/[0.05]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-foreground">{detachment.name}</h3>
            {detachment.dp !== null && (
              <span className="font-mono text-xs font-medium tabular-nums text-primary">
                {detachment.dp} DP
              </span>
            )}
          </div>
          {detachment.unique && (
            <p className="mt-0.5 text-xs text-muted-foreground">{detachment.unique}</p>
          )}
          {detachment.objectives.length > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {detachment.objectives.join(" · ")}
            </p>
          )}
        </div>
        {detachment.enhancements.length > 0 && (
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 shrink-0 text-muted-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        )}
      </button>
      <AnimatePresence>
        {open && detachment.enhancements.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-emerald-500/10 bg-black/30"
          >
            <div className="divide-y divide-emerald-500/10">
              {detachment.enhancements.map((e) => (
                <div
                  key={e.name}
                  className="flex items-center justify-between gap-3 px-4 py-2 pl-6 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate">{e.name}</p>
                    {(e.leaderTo?.length || e.supportTo?.length) && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {e.leaderTo?.length ? `Líder: ${e.leaderTo.join(", ")}` : ""}
                        {e.leaderTo?.length && e.supportTo?.length ? " · " : ""}
                        {e.supportTo?.length ? `Apoyo: ${e.supportTo.join(", ")}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-foreground">
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

function UnitRow({ unit }: { unit: UnitCatalogEntry }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-l-2 border-t border-t-emerald-500/10 px-4 py-3 transition-colors first:border-t-0 hover:bg-emerald-500/[0.05] sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        categoryAccent(unit.category),
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium leading-tight">{unit.name}</p>
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
      <UnitPoints unit={unit} />
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
      <div className="space-y-6">
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
            <ConsolePanel label="Munitorum // destacamentos" count={faction.detachments.length}>
              <div className="divide-y divide-emerald-500/10">
                {faction.detachments.map((d) => (
                  <DetachmentRow key={d.name} detachment={d} />
                ))}
              </div>
            </ConsolePanel>
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
            <ConsolePanel label="Munitorum // unidades" count={filtered.length}>
              {groups.map(([group, list], gi) => (
                <div key={group} className={cn(gi !== 0 && "border-t border-emerald-500/10")}>
                  {groups.length > 1 && group !== "Unidades" && (
                    <p className="border-b border-emerald-500/10 bg-emerald-500/[0.03] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-500/60">
                      {group}
                    </p>
                  )}
                  <div>
                    {list.map((unit) => (
                      <UnitRow key={unit.id} unit={unit} />
                    ))}
                  </div>
                </div>
              ))}
            </ConsolePanel>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
