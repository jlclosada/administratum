import { UnitPoints } from "@/components/catalog/UnitPoints";
import { DeltaBadge } from "@/components/home/HomeWidgets";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Badge } from "@/components/ui/badge";
import { COLLECTION_GAME_NAME, getFactionCatalog, getFactionUnits, getUnitPointsHistory } from "@/db";
import { factionDisplayName } from "@/lib/factionNames";
import { baseCost, seoUnit, unitSlug } from "@/lib/seoCopy";
import type { CatalogUpdate, FactionCatalogEntry, UnitCatalogEntry } from "@/types";
import { ArrowLeft, Crown, History, Library, Shield, Wrench } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const CATEGORY_LABEL: Record<string, string> = { character: "Personaje", squad: "Escuadra", vehicle: "Vehículo" };
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function Panel({ icon: Icon, title, children }: { icon: typeof Shield; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * One datasheet's points (/catalogo-puntos/:factionSlug/:unitSlug): current
 * cost, wargear, who it can lead and who can lead it, and its points history.
 * The server renders the same content for search engines (api/render.ts).
 */
export function UnitPointsPage() {
  const { factionSlug = "", unitSlug: slugParam = "" } = useParams<{ factionSlug: string; unitSlug: string }>();
  const navigate = useNavigate();
  const [units, setUnits] = useState<UnitCatalogEntry[] | null>(null);
  const [faction, setFaction] = useState<FactionCatalogEntry | null>(null);
  const [history, setHistory] = useState<CatalogUpdate[]>([]);

  useEffect(() => {
    let cancelled = false;
    setUnits(null);
    Promise.all([getFactionUnits(COLLECTION_GAME_NAME, factionSlug), getFactionCatalog(COLLECTION_GAME_NAME)]).then(([u, f]) => {
      if (cancelled) return;
      setUnits(u);
      setFaction(f.find((x) => x.factionSlug === factionSlug) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [factionSlug]);

  const unit = useMemo(() => units?.find((u) => unitSlug(u.name) === slugParam) ?? null, [units, slugParam]);
  const factionName = faction?.factionName ?? unit?.factionName ?? "";

  useEffect(() => {
    if (unit) getUnitPointsHistory(unit.name, factionName).then(setHistory);
    else setHistory([]);
  }, [unit, factionName]);

  if (units === null) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner text="Cargando puntos…" />
      </div>
    );
  }
  if (!unit) {
    return (
      <PageTransition>
        <Seo title="Unidad no encontrada" path={`/catalogo-puntos/${factionSlug}/${slugParam}`} noindex />
        <EmptyState
          icon={<Library className="h-8 w-8 text-muted-foreground" />}
          title="Unidad no encontrada"
          description="Esta unidad no existe en el catálogo de esta facción."
          action={{ label: "Ver la facción", onClick: () => navigate(`/catalogo-puntos/${factionSlug}`) }}
        />
      </PageTransition>
    );
  }

  const display = factionDisplayName(factionSlug, factionName);
  const href = (name: string) => {
    const target = units.find((u) => same(u.name, name));
    return target ? `/catalogo-puntos/${factionSlug}/${unitSlug(target.name)}` : null;
  };
  const ledBy = units.filter((u) => u.leaderTo?.some((n) => same(n, unit.name)));
  const others = units
    .filter((u) => u.name !== unit.name && !u.legends)
    .sort((a, b) => Number(b.category === unit.category) - Number(a.category === unit.category));
  const retired = faction?.mfmVersion && unit.mfmVersion && faction.mfmVersion !== unit.mfmVersion;
  const cost = baseCost(unit.pricing);

  const nameChip = (name: string) => {
    const to = href(name);
    return to ? (
      <Link key={name} to={to} className="rounded-full border border-border/60 px-3 py-1 text-sm transition-colors hover:border-primary/50 hover:text-primary">
        {name}
      </Link>
    ) : (
      <span key={name} className="rounded-full border border-border/40 px-3 py-1 text-sm text-muted-foreground">
        {name}
      </span>
    );
  };

  return (
    <PageTransition>
      <Seo {...seoUnit(unit.name, factionSlug, factionName, cost)} path={`/catalogo-puntos/${factionSlug}/${slugParam}`} />
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to={`/catalogo-puntos/${factionSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {display}
        </Link>

        <header className="relative overflow-hidden rounded-2xl border border-border/60">
          {faction?.image && <img src={faction.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30" />
          <div className="relative p-6 sm:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Puntos · {display}</p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
              <span className="sr-only">Puntos de </span>
              {unit.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{CATEGORY_LABEL[unit.category] ?? "Unidad"}</Badge>
              {unit.legends && <Badge variant="outline" className="text-white">Legends</Badge>}
              {unit.mfmVersion && <span className="text-xs text-white/60">Munitorum Field Manual {unit.mfmVersion}</span>}
            </div>
            {cost && (
              <p className="mt-4 text-white/80">
                Desde <span className="font-display text-2xl font-bold text-white">{cost.points} pts</span> por {cost.models}{" "}
                {cost.models === 1 ? "miniatura" : "miniaturas"}
              </p>
            )}
          </div>
        </header>

        {retired && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            Esta unidad ya no aparece en el Munitorum Field Manual {faction?.mfmVersion}. Se muestran los últimos puntos publicados (
            {unit.mfmVersion}).
          </p>
        )}

        <Panel icon={Library} title="Coste en puntos">
          <UnitPoints unit={unit} />
        </Panel>

        {unit.wargear?.length ? (
          <Panel icon={Wrench} title="Equipo con coste adicional">
            <ul className="divide-y divide-border/50 text-sm">
              {unit.wargear.map((w) => (
                <li key={w.item} className="flex justify-between gap-4 py-2">
                  <span>{w.item}</span>
                  <span className="font-mono tabular-nums text-primary">+{w.points} pts</span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {(unit.leaderTo?.length || ledBy.length || unit.supportTo?.length) && (
          <Panel icon={Crown} title="Líderes y apoyo">
            <div className="space-y-4">
              {unit.leaderTo?.length ? (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Puede liderar a</p>
                  <div className="flex flex-wrap gap-2">{unit.leaderTo.map(nameChip)}</div>
                </div>
              ) : null}
              {ledBy.length ? (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Personajes que pueden liderarla</p>
                  <div className="flex flex-wrap gap-2">{ledBy.map((u) => nameChip(u.name))}</div>
                </div>
              ) : null}
              {unit.supportTo?.length ? (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Puede apoyar a</p>
                  <div className="flex flex-wrap gap-2">{unit.supportTo.map(nameChip)}</div>
                </div>
              ) : null}
            </div>
          </Panel>
        )}

        <Panel icon={History} title="Historial de cambios de puntos">
          {history.length ? (
            <ul className="divide-y divide-border/50 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-4 py-2">
                  <span>
                    <span className="text-muted-foreground">
                      {new Date(h.occurredAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                    </span>{" "}
                    · {h.description}
                  </span>
                  <DeltaBadge update={h} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Sin cambios de puntos registrados desde que seguimos el Munitorum Field Manual.</p>
          )}
        </Panel>

        {others.length > 0 && (
          <Panel icon={Shield} title={`Más unidades de ${display}`}>
            <div className="flex flex-wrap gap-2">{others.slice(0, 40).map((u) => nameChip(u.name))}</div>
            <Link to={`/catalogo-puntos/${factionSlug}`} className="mt-4 inline-block text-sm text-primary hover:underline">
              Todos los puntos de {display}
            </Link>
          </Panel>
        )}
      </div>
    </PageTransition>
  );
}
