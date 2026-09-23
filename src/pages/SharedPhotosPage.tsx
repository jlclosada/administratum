import { LikeButton } from "@/components/shared/LikeButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createSharedPhoto, deleteSharedPhoto, getSharedPhotos, toggleLike } from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import { useAuthStore } from "@/stores";
import type { SharedPhoto } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, Loader2, Plus, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "hace un momento";
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function SharedPhotosPage() {
  const { user } = useAuthStore();
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [lightbox, setLightbox] = useState<SharedPhoto | null>(null);

  useEffect(() => {
    getSharedPhotos()
      .then(setPhotos)
      .catch((err) => console.error("Failed to load shared photos:", err))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleLike(id: string) {
    const wasLiked = photos.find((p) => p.id === id)?.likedByMe ?? false;
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likedByMe: !wasLiked, likeCount: p.likeCount + (wasLiked ? -1 : 1) }
          : p,
      ),
    );
    try {
      await toggleLike("photo", id);
    } catch (err) {
      console.error("Failed to toggle photo like:", err);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, likedByMe: wasLiked, likeCount: p.likeCount + (wasLiked ? 1 : -1) }
            : p,
        ),
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta foto? Esta acción no se puede deshacer.")) return;
    const prev = photos;
    setPhotos((p) => p.filter((x) => x.id !== id));
    setLightbox(null);
    try {
      await deleteSharedPhoto(id);
    } catch (err) {
      console.error("Failed to delete shared photo:", err);
      toast.error("No se pudo eliminar la foto.");
      setPhotos(prev);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando comunidad..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Comunidad
            </h1>
            <p className="text-muted-foreground">
              Fotografías de colecciones compartidas por otros hobbyistas
            </p>
          </div>
          {user && (
            <Button className="gap-2" onClick={() => setShowShare(true)}>
              <Plus className="h-4 w-4" />
              Compartir foto
            </Button>
          )}
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">Aún no hay fotos compartidas</p>
            <p className="text-sm text-muted-foreground">
              Sé el primero en enseñar tu colección a la comunidad.
            </p>
          </div>
        ) : (
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
            <AnimatePresence>
              {photos.map((p) => (
                <motion.button
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  type="button"
                  onClick={() => setLightbox(p)}
                  className="group block w-full overflow-hidden rounded-xl border border-border/60 bg-card/40 text-left"
                >
                  <img src={p.image} alt={p.caption} className="w-full object-cover" loading="lazy" />
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm text-foreground/90">{p.caption || " "}</p>
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs text-muted-foreground">
                        {p.authorName} · {timeAgo(p.createdAt)}
                      </span>
                      <LikeButton
                        liked={!!p.likedByMe}
                        count={p.likeCount}
                        onToggle={() => handleToggleLike(p.id)}
                        disabled={!user}
                        size="sm"
                      />
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {showShare && (
        <SharePhotoDialog
          onClose={() => setShowShare(false)}
          onShared={(photo) => {
            setPhotos((prev) => [photo, ...prev]);
            setShowShare(false);
          }}
        />
      )}

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-0">
          <DialogTitle className="sr-only">{lightbox?.caption || "Foto compartida"}</DialogTitle>
          {lightbox && (
            <div>
              <img src={lightbox.image} alt={lightbox.caption} className="max-h-[70vh] w-full object-contain bg-black" />
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm text-foreground/90">{lightbox.caption}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lightbox.authorName} · {timeAgo(lightbox.createdAt)}
                    {lightbox.armyName ? ` · ${lightbox.armyName}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <LikeButton
                    liked={!!lightbox.likedByMe}
                    count={lightbox.likeCount}
                    onToggle={() => handleToggleLike(lightbox.id)}
                    disabled={!user}
                  />
                  {user?.id === lightbox.userId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(lightbox.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Eliminar foto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

function SharePhotoDialog({
  onClose,
  onShared,
}: {
  onClose: () => void;
  onShared: (photo: SharedPhoto) => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [armyName, setArmyName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handlePick() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploading(true);
      setImage(await uploadFile(file, "shared"));
    } catch (err) {
      console.error("Failed to upload photo:", err);
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleShare() {
    if (!image) return;
    setSaving(true);
    try {
      const created = await createSharedPhoto({
        image,
        caption: caption.trim(),
        armyName: armyName.trim() || null,
      });
      toast.success("Foto compartida con la comunidad");
      onShared(created);
    } catch (err) {
      console.error("Failed to share photo:", err);
      toast.error("No se pudo compartir la foto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Compartir foto</DialogTitle>
        <div className="space-y-4">
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : image ? (
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2">
                <ImageIcon className="h-6 w-6" />
                <span className="text-sm">Elegir foto</span>
              </span>
            )}
          </button>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Escribe una descripción…"
          />
          <Input
            value={armyName}
            onChange={(e) => setArmyName(e.target.value)}
            placeholder="Ejército o facción (opcional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button className="gap-2" disabled={!image || saving} onClick={handleShare}>
              {saving ? "Compartiendo..." : "Compartir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
