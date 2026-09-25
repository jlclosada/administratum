import { parseArmyListExport, type ParsedArmyList } from "@/lib/armyListParser";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo } from "react";

/**
 * Textarea for a pasted army-list export with a live parse status line.
 * Reports the parsed list (or null) to the parent on every change.
 */
export function ArmyListPasteField({
  value,
  onChange,
  onParsed,
  rows = 8,
}: {
  value: string;
  onChange: (raw: string) => void;
  onParsed: (list: ParsedArmyList | null) => void;
  rows?: number;
}) {
  const parsed = useMemo(() => (value.trim() ? parseArmyListExport(value) : null), [value]);
  const showError = value.trim().length > 0 && !parsed;

  useEffect(() => {
    onParsed(parsed);
  }, [parsed, onParsed]);

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Talavera (2270 puntos)\n\nMil Hijos\nGrand Coven (3 puntos de destacamento)\n..."}
        rows={rows}
        className="w-full resize-y rounded-lg border border-input bg-background/40 px-3 py-2 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          {parsed.listName} · {parsed.factionName} · {parsed.totalPoints} pts ·{" "}
          {parsed.categories.reduce((n, c) => n + c.units.length, 0)} unidades
        </p>
      )}
    </div>
  );
}
