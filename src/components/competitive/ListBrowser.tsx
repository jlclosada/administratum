import { CommunityListCard } from "@/components/community/CommunityListCard";
import { cn } from "@/lib/utils";
import type { CommunityList, Profile } from "@/types";
import { motion } from "framer-motion";
import { ScrollText, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  applyListFilters,
  SIZE_LABEL,
  SORT_LABEL,
  type ListFilters,
  type ListSize,
  type ListSort,
} from "./listFilters";

const SELECT =
  "h-9 rounded-full border border-border/60 bg-background/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Search + filters + sort over the community's lists. Filters live in the
 * URL (?q=&faccion=&torneo=&puntos=&orden=) so a search can be shared.
 */
export function ListBrowser({
  lists,
  authors,
  loading,
}: {
  lists: CommunityList[];
  authors: Map<string, Profile>;
  loading: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const filters: ListFilters = {
    q: params.get("q") ?? "",
    faction: params.get("faccion") ?? "",
    tournament: params.get("torneo") ?? "",
    size: (params.get("puntos") as ListSize) || "all",
    sort: (params.get("orden") as ListSort) || "recent",
  };

  function update(patch: Partial<ListFilters>) {
    const next = { ...filters, ...patch };
    const p = new URLSearchParams();
    if (next.q) p.set("q", next.q);
    if (next.faction) p.set("faccion", next.faction);
    if (next.tournament) p.set("torneo", next.tournament);
    if (next.size !== "all") p.set("puntos", next.size);
    if (next.sort !== "recent") p.set("orden", next.sort);
    setParams(p, { replace: true, preventScrollReset: true });
  }

  const factions = useMemo(() => [...new Set(lists.map((l) => l.factionName))].sort(), [lists]);
  const tournaments = useMemo(
    () => [...new Set(lists.map((l) => l.tournamentName).filter(Boolean) as string[])].sort(),
    [lists],
  );
  const visible = useMemo(
    () => applyListFilters(lists, filters, (l) => authors.get(l.userId)?.displayName ?? l.authorName),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters is derived from params
    [lists, authors, params],
  );
  const active = !!(filters.q || filters.faction || filters.tournament || filters.size !== "all");

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-border/60 bg-card/30 p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Buscar listas por nombre, facción, torneo o autor…"
            aria-label="Buscar listas"
            className="h-11 w-full rounded-full border border-border/60 bg-background/60 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <select value={filters.faction} onChange={(e) => update({ faction: e.target.value })} className={SELECT} aria-label="Facción">
            <option value="">Todas las facciones</option>
            {factions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select value={filters.tournament} onChange={(e) => update({ tournament: e.target.value })} className={SELECT} aria-label="Torneo">
            <option value="">Todos los torneos</option>
            {tournaments.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={filters.size} onChange={(e) => update({ size: e.target.value as ListSize })} className={SELECT} aria-label="Puntos">
            {(Object.keys(SIZE_LABEL) as ListSize[]).map((s) => (
              <option key={s} value={s}>
                {SIZE_LABEL[s]}
              </option>
            ))}
          </select>
          {active && (
            <button
              type="button"
              onClick={() => update({ q: "", faction: "", tournament: "", size: "all" })}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Ordenar">
          {(Object.keys(SORT_LABEL) as ListSort[]).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={filters.sort === s}
              onClick={() => update({ sort: s })}
              className={cn(
                "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                filters.sort === s ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filters.sort === s && (
                <motion.span
                  layoutId="list-sort"
                  className="absolute inset-0 -z-10 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              {SORT_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {loading ? "Cargando listas…" : `${visible.length} ${visible.length === 1 ? "lista" : "listas"}`}
      </p>

      {!loading && visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <ScrollText className="h-8 w-8 text-muted-foreground/40" />
          <p className="font-medium">{active ? "Ninguna lista coincide" : "Aún no hay listas publicadas"}</p>
          <p className="text-sm text-muted-foreground">
            {active ? "Prueba con otros filtros." : "Publica la primera y explica cómo la juegas."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {visible.map((l, i) => (
            <CommunityListCard key={l.id} list={l} author={authors.get(l.userId)} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
