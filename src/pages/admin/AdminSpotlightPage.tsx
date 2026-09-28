import { AdminShell } from "@/components/shared/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createMiniatureSpotlight, deleteMiniatureSpotlight, getMiniatureSpotlightHistory } from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import { timeAgo } from "@/lib/time";
import type { MiniatureSpotlight } from "@/types";
import { History, ImageIcon, Loader2, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const EMPTY = { title: "", faction: "", painter: "", description: "", image: null as string | null };

export function AdminSpotlightPage() {
  const [history, setHistory] = useState<MiniatureSpotlight[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMiniatureSpotlightHistory().then(setHistory);
  }, []);

  const current = history[0];

  async function handlePickImage() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploading(true);
      const image = await uploadFile(file, "spotlight");
      setForm((f) => ({ ...f, image }));
    } catch {
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handlePublish() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const created = await createMiniatureSpotlight({
        title: form.title.trim(),
        factionName: form.faction.trim() || null,
        painterName: form.painter.trim() || null,
        description: form.description.trim(),
        image: form.image,
      });
      setHistory((h) => [created, ...h]);
      setForm(EMPTY);
      toast.success("Miniatura del mes publicada");
    } catch {
      toast.error("No se pudo publicar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: MiniatureSpotlight) {
    if (!confirm(`¿Eliminar «${s.title}» del historial?`)) return;
    try {
      await deleteMiniatureSpotlight(s.id);
      setHistory((h) => h.filter((x) => x.id !== s.id));
      toast.success("Eliminada");
    } catch {
      toast.error("No se pudo eliminar.");
    }
  }

  return (
    <AdminShell title="Miniatura del mes" subtitle="El hueco destacado del margen derecho de Inicio">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card/30 p-5">
          <h2 className="font-semibold">Publicar una nueva</h2>
          <p className="text-sm text-muted-foreground">Sustituye a la actual en la web; el historial se conserva.</p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handlePickImage}
              disabled={uploading}
              className="flex aspect-[4/5] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50 sm:w-40"
              aria-label="Imagen"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : form.image ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs">
                  <ImageIcon className="h-6 w-6" /> Foto
                </span>
              )}
            </button>
            <div className="flex-1 space-y-2">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nombre de la miniatura" />
              <Input value={form.faction} onChange={(e) => setForm({ ...form, faction: e.target.value })} placeholder="Facción (opcional)" />
              <Input value={form.painter} onChange={(e) => setForm({ ...form, painter: e.target.value })} placeholder="Pintada por (opcional)" />
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Técnica, esquema de color…"
                rows={3}
              />
            </div>
          </div>
          <Button onClick={handlePublish} disabled={saving || !form.title.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
            Publicar como miniatura del mes
          </Button>
        </section>

        <aside className="space-y-3">
          {current && (
            <div className="overflow-hidden rounded-2xl border border-amber-500/40 bg-card/40">
              <div className="relative aspect-[4/5] bg-muted">
                {current.image && <img src={current.image} alt="" className="h-full w-full object-cover" />}
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  <Star className="h-3 w-3 fill-current" /> En portada
                </span>
              </div>
              <div className="p-3">
                <p className="font-semibold">{current.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[current.factionName, current.painterName].filter(Boolean).join(" · ") || "Sin detalles"}
                </p>
              </div>
            </div>
          )}
          {history.length > 1 && (
            <div className="rounded-2xl border border-border/60 bg-card/30">
              <h3 className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm font-semibold">
                <History className="h-4 w-4" /> Historial
              </h3>
              <ul className="divide-y divide-border/50">
                {history.slice(1).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {s.image && <img src={s.image} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(s.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Eliminar ${s.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
