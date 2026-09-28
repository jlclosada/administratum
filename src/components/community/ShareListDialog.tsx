import { ResultInputs } from "@/components/shared/ArmyListDialog";
import { ArmyListPasteField } from "@/components/shared/ArmyListPasteField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCommunityList, getTournaments, updateCommunityList } from "@/db";
import { buildResult, type ParsedArmyList } from "@/lib/armyListParser";
import { cn } from "@/lib/utils";
import type { CommunityList, Tournament } from "@/types";
import { Loader2, Save, ScrollText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// Mirrors the community_lists.description check constraint.
const MIN_DESCRIPTION = 20;
const OTHER = "__other__";

function splitResult(result: string | null | undefined) {
  const [victories = "", defeats = "", draws = ""] = (result ?? "").split("-");
  return { victories, defeats, draws };
}

/**
 * Publish a new list, or edit one (`initial`) — only its author reaches the
 * edit mode, and the database enforces the same rule.
 */
export function ShareListDialog({
  initial,
  defaultTournamentId,
  onClose,
  onShared,
}: {
  initial?: CommunityList;
  /** Pre-select a tournament (e.g. when publishing from its page). */
  defaultTournamentId?: string;
  onClose: () => void;
  onShared: (list: CommunityList) => void;
}) {
  const editing = !!initial;
  const [raw, setRaw] = useState("");
  const [pasted, setPasted] = useState<ParsedArmyList | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [faction, setFaction] = useState(initial?.factionName ?? "");
  const [points, setPoints] = useState(initial ? String(initial.totalPoints) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [result, setResult] = useState(splitResult(initial?.result));
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentChoice, setTournamentChoice] = useState<string>(
    initial ? (initial.tournamentId ?? (initial.tournamentName ? OTHER : "")) : (defaultTournamentId ?? ""),
  );
  const [otherTournament, setOtherTournament] = useState(
    initial && !initial.tournamentId ? (initial.tournamentName ?? "") : "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTournaments().then(setTournaments);
  }, []);

  // Pre-fill from the pasted export without overwriting what the user typed.
  const handleParsed = useCallback((list: ParsedArmyList | null) => {
    setPasted(list);
    if (!list) return;
    setTitle((v) => v || list.listName);
    setFaction((v) => v || list.factionName);
    setPoints((v) => v || String(list.totalPoints));
  }, []);

  // Editing keeps the current list unless a new version is pasted.
  const listData = raw.trim() ? pasted : (initial?.listData ?? null);
  const pointsValue = Number.parseInt(points, 10);
  const descLength = description.trim().length;
  const missing = [
    !listData && (editing ? "la lista pegada no es válida" : "pega una lista válida"),
    !title.trim() && "título",
    !faction.trim() && "facción",
    !(pointsValue > 0) && "puntos",
    descLength < MIN_DESCRIPTION && "explicación",
  ].filter(Boolean) as string[];

  function tournamentFields() {
    if (tournamentChoice === OTHER) {
      return { tournamentId: null, tournamentName: otherTournament.trim() || null };
    }
    const t = tournaments.find((x) => x.id === tournamentChoice);
    return { tournamentId: t?.id ?? null, tournamentName: t?.name ?? null };
  }

  async function handleSubmit() {
    if (!listData || missing.length > 0) return;
    setSaving(true);
    const fields = {
      title: title.trim(),
      factionName: faction.trim(),
      totalPoints: pointsValue,
      description: description.trim(),
      detachmentName: listData.detachmentName,
      listData,
      result: buildResult(result.victories, result.defeats, result.draws),
      ...tournamentFields(),
    };
    try {
      const saved = editing ? await updateCommunityList({ id: initial.id, ...fields }) : await createCommunityList(fields);
      toast.success(editing ? "Lista actualizada" : "Lista publicada");
      onShared(saved);
    } catch {
      toast.error(editing ? "No se pudo guardar la lista." : "No se pudo publicar la lista.");
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
            {editing ? "Editar lista" : "Publicar lista"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Pega una versión nueva de la lista solo si quieres sustituirla; si no, se mantiene la actual."
              : "Pega la lista exportada desde la app oficial o NewRecruit (en español o inglés)."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ArmyListPasteField value={raw} onChange={setRaw} onParsed={handleParsed} rows={editing ? 4 : 7} />

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
              <span className={cn("text-xs tabular-nums", descLength >= MIN_DESCRIPTION ? "text-emerald-500" : "text-muted-foreground")}>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="list-tournament">Torneo (opcional)</Label>
              <select
                id="list-tournament"
                value={tournamentChoice}
                onChange={(e) => setTournamentChoice(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Ninguno</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value={OTHER}>Otro torneo…</option>
              </select>
            </div>
            {tournamentChoice === OTHER && (
              <div className="space-y-1.5">
                <Label htmlFor="list-tournament-other">Nombre del torneo</Label>
                <Input id="list-tournament-other" value={otherTournament} onChange={(e) => setOtherTournament(e.target.value)} placeholder="GT de Barcelona" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Resultado — V-D-E (opcional)</Label>
            <ResultInputs {...result} onChange={(field, value) => setResult((r) => ({ ...r, [field]: value }))} />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {missing.length > 0 ? `Falta: ${missing.join(", ")}` : editing ? "Listo para guardar." : "Todo listo para publicar."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="gap-2" disabled={missing.length > 0 || saving} onClick={handleSubmit}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Save className="h-4 w-4" /> : <ScrollText className="h-4 w-4" />}
                {editing ? "Guardar cambios" : "Publicar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
