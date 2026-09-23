import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parseArmyListExport, type ParsedArmyList } from "@/lib/armyListParser";
import { AlertCircle, CheckCircle2, Swords } from "lucide-react";
import { useMemo, useState } from "react";

export function ArmyListDialog({
  onInsert,
  onClose,
}: {
  onInsert: (data: ParsedArmyList, authorName: string, result: string | null) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [victories, setVictories] = useState("");
  const [defeats, setDefeats] = useState("");
  const [draws, setDraws] = useState("");

  const parsed = useMemo(() => (raw.trim() ? parseArmyListExport(raw) : null), [raw]);
  const showError = raw.trim().length > 0 && !parsed;

  function handleInsert() {
    if (!parsed) return;
    const hasResult = victories.trim() || defeats.trim() || draws.trim();
    const result = hasResult ? `${victories || 0}-${defeats || 0}-${draws || 0}` : null;
    onInsert(parsed, authorName.trim(), result);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" />
          Añadir lista de ejército
        </DialogTitle>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Pega aquí la lista exportada
            </label>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"Talavera (2270 puntos)\n\nMil Hijos\nGrand Coven (3 puntos de destacamento)\n..."}
              rows={8}
              className="w-full resize-none rounded-lg border border-input bg-background/40 px-3 py-2 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {showError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                No se reconoce el formato de la lista. Revisa que hayas copiado el texto completo.
              </p>
            )}
            {parsed && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {parsed.listName} · {parsed.totalPoints} pts ·{" "}
                {parsed.categories.reduce((n, c) => n + c.units.length, 0)} unidades
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Autor de la lista (opcional)
            </label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Nombre del jugador"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Resultado en torneo — V-D-E (opcional)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Input
                  type="number"
                  min={0}
                  value={victories}
                  onChange={(e) => setVictories(e.target.value)}
                  placeholder="0"
                />
                <span className="mt-1 block text-center text-[10px] text-muted-foreground">Victorias</span>
              </div>
              <div>
                <Input
                  type="number"
                  min={0}
                  value={defeats}
                  onChange={(e) => setDefeats(e.target.value)}
                  placeholder="0"
                />
                <span className="mt-1 block text-center text-[10px] text-muted-foreground">Derrotas</span>
              </div>
              <div>
                <Input
                  type="number"
                  min={0}
                  value={draws}
                  onChange={(e) => setDraws(e.target.value)}
                  placeholder="0"
                />
                <span className="mt-1 block text-center text-[10px] text-muted-foreground">Empates</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="gap-2" disabled={!parsed} onClick={handleInsert}>
              <Swords className="h-4 w-4" />
              Insertar lista
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
