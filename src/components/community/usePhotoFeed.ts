import { deleteSharedPhoto, getProfilesByIds, setPhotoSaved, toggleLike } from "@/db";
import type { Profile, SharedPhoto } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Shared-photo list state with author profiles (avatar + current name),
 * optimistic likes and deletion — used by Comunidad and profile pages.
 */
export function usePhotoFeed(load: () => Promise<SharedPhoto[]>) {
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then(async (list) => {
        if (cancelled) return;
        setPhotos(list);
        const profiles = await getProfilesByIds(list.map((p) => p.userId));
        if (!cancelled) setAuthors(profiles);
      })
      .catch((err) => console.error("Failed to load photos:", err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [load]);

  const toggle = useCallback(async (photo: SharedPhoto) => {
    const wasLiked = !!photo.likedByMe;
    const apply = (liked: boolean) =>
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id
            ? { ...p, likedByMe: liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) }
            : p,
        ),
      );
    apply(!wasLiked);
    try {
      await toggleLike("photo", photo.id);
    } catch {
      apply(wasLiked);
      toast.error("No se pudo actualizar el me gusta.");
    }
  }, []);

  const toggleSave = useCallback(async (photo: SharedPhoto) => {
    const next = !photo.savedByMe;
    const apply = (saved: boolean) =>
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, savedByMe: saved } : p)));
    apply(next);
    try {
      await setPhotoSaved(photo.id, next);
      toast.success(next ? "Guardado en tu perfil" : "Eliminado de guardados");
    } catch {
      apply(!next);
      toast.error("No se pudo guardar la publicación.");
    }
  }, []);

  /** Keeps a post's comment count in sync with what the viewer loaded/posted. */
  const setCommentCount = useCallback((photoId: string, count: number) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId && p.commentCount !== count ? { ...p, commentCount: count } : p)),
    );
  }, []);

  const remove = useCallback(async (photo: SharedPhoto) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    try {
      await deleteSharedPhoto(photo.id);
      toast.success("Foto eliminada");
    } catch {
      setPhotos((prev) =>
        [...prev, photo].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
      toast.error("No se pudo eliminar la foto.");
    }
  }, []);

  const prepend = useCallback((photo: SharedPhoto, author: Profile | null) => {
    setPhotos((prev) => [photo, ...prev]);
    if (author) setAuthors((prev) => new Map(prev).set(author.id, author));
  }, []);

  return { photos, authors, loading, toggle, toggleSave, setCommentCount, remove, prepend };
}
