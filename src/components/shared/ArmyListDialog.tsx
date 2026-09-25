import { ArmyListPasteField } from "@/components/shared/ArmyListPasteField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildResult, type ParsedArmyList } from "@/lib/armyListParser";
import { Swords } from "lucide-react";
import { useState } from "react";

export function ResultInputs({
  victories,
  defeats,
  draws,
  onChange,
}: {
  victories: string;
  defeats: string;
  draws: string;
  onChange: (field: "victories" | "defeats" | "draws", value: string) => void;
}) {
  const fields = [
    { key: "victories", label: "Victorias", value: victories },
    { key: "defeats", label: "Derrotas", value: defeats },
    { key: "draws", label: "Empates", value: draws },
  ] as const;
  return (
    <div className="grid grid-cols-3 gap-2">
      {fields.map((f) => (
        <div key={f.key}>
          <Input
            type="number"
            min={0}
            value={f.value}
            onChange={(e) => onChange(f.key, e.target.value)}
            placeholder="0"
          />
          <span className="mt-1 block text-center text-[10px] text-muted-foreground">{f.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ArmyListDialog({
  onInsert,
  onClose,
}: {
  onInsert: (data: ParsedArmyList, authorName: string, result: string | null) => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedArmyList | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [result, setResult] = useState({ victories: "", defeats: "", draws: "" });

  function handleInsert() {
    if (!parsed) return;
    onInsert(parsed, authorName.trim(), buildResult(result.victories, result.defeats, result.draws));
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
            <ArmyListPasteField value={raw} onChange={setRaw} onParsed={setParsed} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Autor de la lista (opcional)
            </label>
            <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Nombre del jugador" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Resultado en torneo — V-D-E (opcional)
            </label>
            <ResultInputs
              {...result}
              onChange={(field, value) => setResult((r) => ({ ...r, [field]: value }))}
            />
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
