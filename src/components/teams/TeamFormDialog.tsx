import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTeam, updateTeam } from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import type { Team } from "@/types";
import { ImageIcon, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Create a team, or edit one (`team` given). */
export function TeamFormDialog({ team, onClose, onSaved }: { team?: Team; onClose: () => void; onSaved: (team: Team) => void }) {
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [location, setLocation] = useState(team?.location ?? "");
  const [emblem, setEmblem] = useState<string | null>(team?.emblem ?? null);
  const [banner, setBanner] = useState<string | null>(team?.banner ?? null);
  const [uploading, setUploading] = useState<"emblem" | "banner" | null>(null);
  const [saving, setSaving] = useState(false);

  async function pick(kind: "emblem" | "banner") {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no puede superar los 5 MB.");
        return;
      }
      setUploading(kind);
      const url = await uploadFile(file, "teams");
      if (kind === "emblem") setEmblem(url);
      else setBanner(url);
    } catch {
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    if (name.trim().length < 3) return;
    setSaving(true);
    const dto = { name: name.trim(), description: description.trim(), location: location.trim(), emblem, banner };
    try {
      const saved = team ? await updateTeam(team.id, dto) : await createTeam(dto);
      toast.success(team ? "Equipo actualizado" : "¡Equipo creado! Ahora invita a tus compañeros.");
      onSaved(saved);
    } catch {
      toast.error("No se pudo guardar el equipo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? "Editar equipo" : "Crear un equipo"}</DialogTitle>
          <DialogDescription>
            Solo se entra por invitación: después de crearlo, invita a tus compañeros desde «Miembros».
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => pick("banner")}
            className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50"
          >
            {banner ? <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            <span className="relative flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 backdrop-blur">
              {uploading === "banner" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {banner ? "Cambiar portada" : "Portada (opcional)"}
            </span>
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => pick("emblem")}
              className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50"
              aria-label="Subir emblema"
            >
              {uploading === "emblem" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : emblem ? (
                <img src={emblem} alt="" className="h-full w-full object-cover" />
              ) : (
                <Shield className="h-6 w-6" />
              )}
            </button>
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="team-name">Nombre</Label>
              <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Los Hijos de Prospero" autoFocus />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-location">Ciudad o zona</Label>
            <Input id="team-location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} placeholder="Madrid" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-description">Descripción</Label>
            <Textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Quiénes sois, qué jugáis, a qué torneos vais…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="gradient" onClick={save} disabled={saving || uploading !== null || name.trim().length < 3} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {team ? "Guardar" : "Crear equipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
