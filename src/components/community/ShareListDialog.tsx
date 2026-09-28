import { ResultInputs } from "@/components/shared/ArmyListDialog";
import { ArmyListPasteField } from "@/components/shared/ArmyListPasteField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCommunityList } from "@/db";
import { buildResult, type ParsedArmyList } from "@/lib/armyListParser";
import { cn } from "@/lib/utils";
import type { CommunityList } from "@/types";
import { Loader2, ScrollText } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

// Mirrors the community_lists.description check constraint.
const MIN_DESCRIPTION = 20;

export function ShareListDialog({
  onClose,
  onShared,
}: {
  onClose: () => void;
  onShared: (list: CommunityList) => void;
}) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedArmyList | null>(null);
  const [title, setTitle] = useState("");
  const [faction, setFaction] = useState("");
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState({ victories: "", defeats: "", draws: "" });
  const [saving, setSaving] = useState(false);

  // Pre-fill from the pasted export without overwriting what the user typed.
  const handleParsed = useCallback((list: ParsedArmyList | null) => {
    setParsed(list);
    if (!list) return;
    setTitle((v) => v || list.listName);
    setFaction((v) => v || list.factionName);
    setPoints((v) => v || String(list.totalPoints));
  }, []);

  const pointsValue = Number.parseInt(points, 10);
  const descLength = description.trim().length;
  const missing = [
    !parsed && "pega una lista válida",
    !title.trim() && "título",
    !faction.trim() && "facción",
    !(pointsValue > 0) && "puntos",
    descLength < MIN_DESCRIPTION && "explicación",
  ].filter(Boolean) as string[];

  async function handleShare() {
    if (!parsed || missing.length > 0) return;
    setSaving(true);
    try {
      const created = await createCommunityList({
        title: title.trim(),
        factionName: faction.trim(),
        totalPoints: pointsValue,
        description: description.trim(),
        detachmentName: parsed.detachmentName,
        listData: parsed,
        result: buildResult(result.victories, result.defeats, result.draws),
      });
      toast.success("Lista compartida con la comunidad");
      onShared(created);
    } catch {
      toast.error("No se pudo compartir la lista.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            Compartir lista
          </DialogTitle>
          <DialogDescription>
            Pega la lista exportada desde la app oficial o NewRecruit (en español o inglés).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ArmyListPasteField value={raw} onChange={setRaw} onParsed={handleParsed} rows={7} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="list-title">Título *</Label>
              <Input id="list-title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="Magnus y doble Terminators" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="list-faction">Facción *</Label>
              <Input id="list-faction" value={faction} onChange={(e) => setFaction(e.target.value)} placeholder="Mil Hijos" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="list-points">Puntos *</Label>
              <Input id="list-points" type="number" min={1} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="2000" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="list-description">Explica tu lista *</Label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  descLength >= MIN_DESCRIPTION ? "text-emerald-500" : "text-muted-foreground",
                )}
              >
                {descLength < MIN_DESCRIPTION ? `mín. ${MIN_DESCRIPTION} caracteres · ${descLength}` : `${descLength} caracteres`}
              </span>
            </div>
            <Textarea
              id="list-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Plan de juego, sinergias clave, contra qué funciona bien, qué cambiarías…"
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Resultado en torneo — V-D-E (opcional)</Label>
            <ResultInputs {...result} onChange={(field, value) => setResult((r) => ({ ...r, [field]: value }))} />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {missing.length > 0 ? `Falta: ${missing.join(", ")}` : "Todo listo para publicar."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="gap-2" disabled={missing.length > 0 || saving} onClick={handleShare}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScrollText className="h-4 w-4" />}
                Compartir
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
