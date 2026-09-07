import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { RichTextRenderer } from "@/components/shared/RichText";
import { StarRating } from "@/components/shared/StarRating";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    deleteGuide,
    getGuideById,
    getMyGuideRating,
    guideRating,
    rateGuide,
} from "@/db";
import { useAuthStore } from "@/stores";
import type { PaintingGuide } from "@/types";
import {
    ArrowLeft,
    Palette,
    Pencil,
    Shield,
    Swords,
    Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function GuideDetailPage() {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [guide, setGuide] = useState<PaintingGuide | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guideId) return;
    Promise.all([getGuideById(guideId), getMyGuideRating(guideId)])
      .then(([g, r]) => {
        setGuide(g);
        setMyRating(r);
      })
      .catch((err) => console.error("Failed to load guide:", err))
      .finally(() => setLoading(false));
  }, [guideId]);

  async function handleRate(rating: number) {
    if (!guideId) return;
    try {
      await rateGuide(guideId, rating);
      setMyRating(rating);
      const updated = await getGuideById(guideId);
      setGuide(updated);
      toast.success("¡Gracias por tu valoración!");
    } catch (err) {
      console.error("Failed to rate guide:", err);
      toast.error("No se pudo registrar tu valoración.");
    }
  }

  async function handleDelete() {
    if (!guide) return;
    if (!confirm("¿Eliminar esta guía? Esta acción no se puede deshacer."))
      return;
    try {
      await deleteGuide(guide.id);
      toast.success("Guía eliminada");
      navigate("/guias");
    } catch (err) {
      console.error("Failed to delete guide:", err);
      toast.error("No se pudo eliminar la guía.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando guía..." />
      </div>
    );
  }

  if (!guide) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-md py-24 text-center">
          <Palette className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h1 className="font-display text-2xl font-bold">Guía no encontrada</h1>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/guias")}
          >
            Volver a las guías
          </Button>
        </div>
      </PageTransition>
    );
  }

  const isOwner = userId === guide.userId;
  const avg = guideRating(guide);

  return (
    <PageTransition>
      <article className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate("/guias")}
          >
            <ArrowLeft className="h-4 w-4" />
            Guías
          </Button>
          {isOwner && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(`/guias/${guide.id}/editar`)}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </div>
          )}
        </div>

        {guide.coverImage && (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <img
              src={guide.coverImage}
              alt={guide.title}
              className="aspect-[21/9] w-full object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {guide.gameName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                <Swords className="h-3 w-3" />
                {guide.gameName}
              </span>
            )}
            {guide.armyName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <Shield className="h-3 w-3" />
                {guide.armyName}
              </span>
            )}
            {guide.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>

          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
            {guide.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>por {guide.authorName}</span>
            <span>·</span>
            <span>{formatDate(guide.createdAt)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <StarRating value={avg} size="sm" readOnly />
              {guide.ratingCount > 0
                ? `${avg.toFixed(1)} (${guide.ratingCount})`
                : "Sin valoraciones"}
            </span>
          </div>

          {guide.summary && (
            <p className="text-lg text-muted-foreground">{guide.summary}</p>
          )}
        </div>

        {/* Paints used */}
        {guide.paints.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Palette className="h-4 w-4 text-primary" />
                Pinturas utilizadas
              </p>
              <div className="flex flex-wrap gap-2">
                {guide.paints.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-xs"
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-white/20"
                      style={{ backgroundColor: p.hex ?? "#888" }}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        <RichTextRenderer content={guide.content} className="pt-2" />

        {/* Image gallery */}
        {guide.images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {guide.images.map((src) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-xl border border-border/60"
              >
                <img
                  src={src}
                  alt="Guía"
                  className="aspect-square w-full object-cover transition-transform hover:scale-105"
                />
              </a>
            ))}
          </div>
        )}

        {/* Rate this guide */}
        {!isOwner && userId && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <p className="text-sm font-semibold">
                {myRating > 0 ? "Tu valoración" : "¿Te ha resultado útil?"}
              </p>
              <StarRating value={myRating} onRate={handleRate} size="lg" />
              <p className="text-xs text-muted-foreground">
                Valora esta guía para ayudar a la comunidad.
              </p>
            </CardContent>
          </Card>
        )}
      </article>
    </PageTransition>
  );
}
