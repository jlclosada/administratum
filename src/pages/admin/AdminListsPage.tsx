import { FeaturedListsAdmin } from "@/components/competitive/FeaturedListsAdmin";
import { AdminShell } from "@/components/shared/AdminShell";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { createFeaturedList, deleteCommunityList, getCommunityLists } from "@/db";
import { formatResult } from "@/lib/armyListParser";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { CommunityList } from "@/types";
import { ExternalLink, Heart, MessageCircle, Search, Star, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import type { AdminOutletContext } from "./AdminLayout";

type Tab = "community" | "featured";

export function AdminListsPage() {
  const { overview, refreshOverview } = useOutletContext<AdminOutletContext>();
  const [tab, setTab] = useState<Tab>("community");
  const [lists, setLists] = useState<CommunityList[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getCommunityLists(500)
      .then(setLists)
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter((l) =>
      [l.title, l.factionName, l.authorName, l.tournamentName].some((t) => t?.toLowerCase().includes(q)),
    );
  }, [lists, query]);

  async function handleFeature(l: CommunityList) {
    try {
      await createFeaturedList({
        title: l.title,
        factionName: l.factionName,
        totalPoints: l.totalPoints,
        authorName: l.authorName,
        description: l.description,
        listData: l.listData,
        result: l.result,
        tournamentName: l.tournamentName,
      });
      refreshOverview();
      toast.success(`«${l.title}» añadida a Destacadas`);
    } catch {
      toast.error("No se pudo destacar la lista.");
    }
  }

  async function handleDelete(l: CommunityList) {
    if (!confirm(`¿Eliminar «${l.title}» de ${l.authorName}? No se puede deshacer.`)) return;
    try {
      await deleteCommunityList(l.id);
      setLists((prev) => prev.filter((x) => x.id !== l.id));
      refreshOverview();
      toast.success("Lista eliminada");
    } catch {
      toast.error("No se pudo eliminar la lista.");
    }
  }

  return (
    <AdminShell title="Listas" subtitle="Modera lo que publica la comunidad y elige las destacadas">
      <div className="flex gap-6 border-b border-border/60" role="tablist">
        {(
          [
            ["community", `Publicadas por usuarios · ${lists.length}`, Users],
            ["featured", `Destacadas · ${overview?.featured_lists ?? "…"}`, Star],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm font-semibold transition-colors",
              tab === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "featured" ? (
        <FeaturedListsAdmin />
      ) : loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, facción, autor o torneo…"
              className="h-10 w-full rounded-full border border-border/60 bg-transparent pl-9 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              No hay listas que mostrar.
            </p>
          ) : (
            <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60">
              {visible.map((l) => {
                const result = formatResult(l.result);
                return (
                  <div key={l.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <Link to={`/comunidad/listas/${l.id}`} className="group flex items-center gap-1.5 font-medium hover:underline">
                        <span className="truncate">{l.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {[l.factionName, `${l.totalPoints} pts`, l.tournamentName, result, `por ${l.authorName}`, timeAgo(l.createdAt)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" /> {l.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" /> {l.commentCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFeature(l)}
                        className="flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 font-medium text-foreground hover:border-amber-500/50 hover:text-amber-500"
                      >
                        <Star className="h-3.5 w-3.5" /> Destacar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(l)}
                        aria-label={`Eliminar ${l.title}`}
                        className="rounded-lg p-2 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
