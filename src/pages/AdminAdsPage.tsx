import { AdminShell } from "@/components/shared/AdminShell";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAd, deleteAd, getAds, updateAd } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { pickFiles, removeFileByUrl, uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Ad, AdPosition } from "@/types";
import { ExternalLink, Eye, EyeOff, ImageIcon, Loader2, MonitorPlay, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const POSITION_LABEL: Record<AdPosition, string> = {
  left: "Margen izquierdo",
  right: "Margen derecho",
};

const POSITION_HINT: Record<AdPosition, string> = {
  left: "Recomendado 160 × 600 px. Visible en pantallas muy anchas.",
  right: "Recomendado 300 × 250 o 300 × 600 px. Aparece bajo la miniatura del mes.",
};

function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).toString();
  } catch {
    return null;
  }
}

export function AdminAdsPage() {
  const isAdmin = useIsAdmin();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [position, setPosition] = useState<AdPosition>("right");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    getAds(false)
      .then(setAds)
      .finally(() => setLoading(false));
  }, [isAdmin]);

  async function handlePickImage() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploading(true);
      const previous = image;
      setImage(await uploadFile(file, "ads"));
      if (previous) removeFileByUrl(previous).catch(() => {});
    } catch {
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCreate() {
    const link = normalizeUrl(url);
    if (!image) return toast.error("Sube una imagen para el anuncio.");
    if (!link) return toast.error("El enlace no es válido.");
    setSaving(true);
    try {
      const created = await createAd({
        image,
        url: link,
        title: title.trim(),
        position,
        sortOrder: Number(sortOrder) || 0,
      });
      setAds((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setImage(null);
      setUrl("");
      setTitle("");
      setSortOrder("0");
      toast.success("Anuncio publicado");
    } catch {
      toast.error("No se pudo crear el anuncio.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ad: Ad) {
    try {
      const updated = await updateAd(ad.id, { active: !ad.active });
      setAds((prev) => prev.map((a) => (a.id === ad.id ? updated : a)));
    } catch {
      toast.error("No se pudo actualizar el anuncio.");
    }
  }

  async function handleDelete(ad: Ad) {
    try {
      await deleteAd(ad.id);
      setAds((prev) => prev.filter((a) => a.id !== ad.id));
      removeFileByUrl(ad.image).catch(() => {});
      toast.success("Anuncio eliminado");
    } catch {
      toast.error("No se pudo eliminar el anuncio.");
    }
  }

  return (
    <AdminShell title="Publicidad" subtitle="Anuncios en los márgenes laterales de la web">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nuevo anuncio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handlePickImage}
              disabled={uploading}
              className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50",
                position === "left" ? "h-48 w-20" : "h-40 w-40",
              )}
              aria-label="Subir imagen del anuncio"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : image ? (
                <img src={image} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6" />
              )}
            </button>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ad-url">Enlace de destino</Label>
                <Input id="ad-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="tienda.com/oferta" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ad-title">Texto alternativo (opcional)</Label>
                <Input id="ad-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del anunciante" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ad-position">Posición</Label>
                <select
                  id="ad-position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value as AdPosition)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {(Object.keys(POSITION_LABEL) as AdPosition[]).map((p) => (
                    <option key={p} value={p}>
                      {POSITION_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ad-order">Orden</Label>
                <Input id="ad-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                {POSITION_HINT[position]} En móvil los anuncios se muestran en una franja al final de la página.
              </p>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving || uploading} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorPlay className="h-4 w-4" />}
            Publicar anuncio
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="Cargando anuncios..." />
        </div>
      ) : (
        (["right", "left"] as AdPosition[]).map((pos) => {
          const group = ads.filter((a) => a.position === pos);
          return (
            <section key={pos} className="space-y-3">
              <h2 className="text-sm font-semibold">
                {POSITION_LABEL[pos]} <span className="text-muted-foreground">· {group.length}</span>
              </h2>
              {group.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 p-5 text-center text-sm text-muted-foreground">
                  Sin anuncios en esta posición.
                </p>
              ) : (
                <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                  {group.map((ad) => (
                    <div key={ad.id} className={cn("flex items-center gap-4 px-4 py-3", !ad.active && "opacity-50")}>
                      <img src={ad.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ad.title || "Sin título"}</p>
                        <a
                          href={ad.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary"
                        >
                          {ad.url} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        <p className="text-[11px] text-muted-foreground/70">
                          Orden {ad.sortOrder} · {ad.active ? "Activo" : "Pausado"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggle(ad)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label={ad.active ? "Pausar anuncio" : "Activar anuncio"}
                        title={ad.active ? "Pausar" : "Activar"}
                      >
                        {ad.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ad)}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Eliminar anuncio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </AdminShell>
  );
}
