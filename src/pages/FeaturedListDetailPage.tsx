import { ArmyListCard } from "@/components/shared/ArmyListNode";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { getFeaturedListById } from "@/db";
import { formatResult } from "@/lib/armyListParser";
import type { FeaturedList } from "@/types";
import { ArrowLeft, ScrollText, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function FeaturedListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<FeaturedList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listId) return;
    getFeaturedListById(listId)
      .then(setList)
      .finally(() => setLoading(false));
  }, [listId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando lista..." />
      </div>
    );
  }

  if (!list) {
    return (
      <EmptyState
        icon={<ScrollText className="h-8 w-8" />}
        title="Lista no encontrada"
        description="Puede que se haya eliminado o que el enlace no sea correcto."
        action={{ label: "Volver a Competitivo", onClick: () => navigate("/competitivo") }}
      />
    );
  }

  const result = formatResult(list.result);

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/competitivo")}>
          <ArrowLeft className="h-4 w-4" />
          Competitivo
        </Button>

        <header className="overflow-hidden rounded-2xl border border-border/60">
          {list.coverImage && (
            <div className="relative aspect-[3/1] overflow-hidden">
              <img src={list.coverImage} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            </div>
          )}
          <div className="space-y-2 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {list.factionName && <span>{list.factionName}</span>}
              {list.totalPoints != null && <span>· {list.totalPoints} pts</span>}
              {list.tournamentName && (
                <span className="flex items-center gap-1">
                  · <Trophy className="h-3 w-3" /> {list.tournamentName}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{list.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              {list.authorName && (
                <span className="text-sm text-muted-foreground">por {list.authorName}</span>
              )}
              {result && (
                <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-xs text-amber-500">
                  <Trophy className="h-3 w-3" />
                  {result}
                </span>
              )}
            </div>
            {list.description && (
              <p className="whitespace-pre-line pt-1 text-sm leading-relaxed text-muted-foreground">
                {list.description}
              </p>
            )}
          </div>
        </header>

        {list.listData ? (
          <ArmyListCard data={list.listData} authorName={list.authorName} result={list.result} />
        ) : (
          <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Esta lista se publicó sin el listado de unidades.
          </p>
        )}
      </div>
    </PageTransition>
  );
}
