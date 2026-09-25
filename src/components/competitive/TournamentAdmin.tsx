import { RichTextEditor } from "@/components/shared/RichText";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTournament, deleteTournament, updateTournament } from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { RichContent, Tournament, TournamentStatus } from "@/types";
import { ExternalLink, ImageIcon, Loader2, Pencil, Save, Trash2, Trophy, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { TOURNAMENT_STATUS } from "./status";

const STATUS_LABEL = Object.fromEntries(
  Object.entries(TOURNAMENT_STATUS).map(([k, v]) => [k, v.label]),
) as Record<TournamentStatus, string>;

interface Form {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  link: string;
  description: string;
  image: string | null;
  rules: RichContent;
  pointsLimit: string;
  maxPlayers: string;
  entryFee: string;
}

const EMPTY: Form = {
  name: "",
  location: "",
  startDate: "",
  endDate: "",
  status: "upcoming",
  link: "",
  description: "",
  image: null,
  rules: null,
  pointsLimit: "",
  maxPlayers: "",
  entryFee: "",
};

function toForm(t: Tournament): Form {
  return {
    name: t.name,
    location: t.location ?? "",
    startDate: t.startDate ?? "",
    endDate: t.endDate ?? "",
    status: t.status,
    link: t.externalLink ?? "",
    description: t.description,
    image: t.coverImage,
    rules: t.rules ?? null,
    pointsLimit: t.pointsLimit?.toString() ?? "",
    maxPlayers: t.maxPlayers?.toString() ?? "",
    entryFee: t.entryFee ?? "",
  };
}

const optionalInt = (v: string) => (v.trim() ? Number.parseInt(v, 10) || null : null);

/** Create, edit and delete tournaments, including their rules ("bases"). */
export function TournamentAdmin({
  tournaments,
  onChange,
}: {
  tournaments: Tournament[];
  onChange: (next: Tournament[]) => void;
}) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The rich-text editor only reads its initial value, so it is remounted
  // whenever the form is loaded with another tournament or reset.
  const [editorKey, setEditorKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  function reset() {
    setForm(EMPTY);
    setEditingId(null);
    setEditorKey((k) => k + 1);
  }

  function startEdit(t: Tournament) {
    setForm(toForm(t));
    setEditingId(t.id);
    setEditorKey((k) => k + 1);
    document.getElementById("tournament-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handlePickImage() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploading(true);
      set("image", await uploadFile(file, "tournaments"));
    } catch {
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const dto = {
      name: form.name.trim(),
      location: form.location.trim() || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      status: form.status,
      externalLink: form.link.trim() || null,
      description: form.description.trim(),
      coverImage: form.image,
      rules: form.rules,
      pointsLimit: optionalInt(form.pointsLimit),
      maxPlayers: optionalInt(form.maxPlayers),
      entryFee: form.entryFee.trim() || null,
    };
    try {
      if (editingId) {
        const updated = await updateTournament({ id: editingId, ...dto });
        onChange(tournaments.map((t) => (t.id === editingId ? updated : t)));
        toast.success("Torneo actualizado");
      } else {
        const created = await createTournament(dto);
        onChange([created, ...tournaments]);
        toast.success("Torneo creado");
      }
      reset();
    } catch {
      toast.error("No se pudo guardar el torneo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: Tournament) {
    if (!confirm(`¿Eliminar el torneo «${t.name}»?`)) return;
    try {
      await deleteTournament(t.id);
      onChange(tournaments.filter((x) => x.id !== t.id));
      if (editingId === t.id) reset();
      toast.success("Torneo eliminado");
    } catch {
      toast.error("No se pudo eliminar el torneo.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Torneos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {tournaments.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border/60">
            {tournaments.map((t, i) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-3",
                  i !== 0 && "border-t border-t-border/50",
                  editingId === t.id && "bg-primary/5",
                )}
              >
                <Link to={`/competitivo/torneos/${t.id}`} className="group min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium group-hover:text-primary">{t.name}</p>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    <span className="shrink-0 text-[11px] text-muted-foreground">{STATUS_LABEL[t.status]}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {[t.location, t.startDate, t.rules ? "con bases" : "sin bases"].filter(Boolean).join(" · ")}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={`Editar ${t.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Eliminar ${t.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div id="tournament-form" className="scroll-mt-24 space-y-4 rounded-xl border border-dashed border-border/70 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{editingId ? `Editando «${form.name || "torneo"}»` : "Nuevo torneo"}</p>
            {editingId && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={reset}>
                <X className="h-3.5 w-3.5" /> Cancelar edición
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={handlePickImage}
              disabled={uploading}
              className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50 sm:w-36"
              aria-label="Imagen de portada"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : form.image ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs">
                  <ImageIcon className="h-5 w-5" /> Portada
                </span>
              )}
            </button>
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nombre del torneo" className="sm:col-span-2" />
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Lugar" />
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as TournamentStatus)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                aria-label="Estado"
              >
                {(Object.keys(STATUS_LABEL) as TournamentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Inicio</Label>
                <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fin (opcional)</Label>
                <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Input type="number" min={0} value={form.pointsLimit} onChange={(e) => set("pointsLimit", e.target.value)} placeholder="Puntos (p. ej. 2000)" />
            <Input type="number" min={0} value={form.maxPlayers} onChange={(e) => set("maxPlayers", e.target.value)} placeholder="Plazas" />
            <Input value={form.entryFee} onChange={(e) => set("entryFee", e.target.value)} placeholder="Inscripción (p. ej. 20 €)" />
          </div>
          <Input value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="Enlace de inscripción o información (opcional)" />
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Resumen breve que aparece en el listado…"
            rows={2}
          />

          <div className="space-y-1.5">
            <Label>Bases del torneo</Label>
            <p className="text-xs text-muted-foreground">
              Formato, misiones, horarios, premios, pintura obligatoria, desempates… Admite encabezados, listas e imágenes.
            </p>
            <RichTextEditor
              key={editorKey}
              value={form.rules}
              onChange={(json) => set("rules", json)}
              placeholder="Escribe las bases del torneo…"
              uploadFolder="tournaments"
            />
          </div>

          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
            {editingId ? "Guardar cambios" : "Crear torneo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
