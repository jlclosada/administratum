import { parseArmyListExport, type ParsedArmyList } from "@/lib/armyListParser";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
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
    <div className="space-y-2">
      <div className="flex gap-2.5 rounded-lg border border-sky-500/30 bg-sky-500/[0.06] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
        <p>
          <span className="font-semibold text-foreground">Formato Games Workshop.</span> Exporta la lista como texto desde
          la app oficial de Warhammer 40,000 (o desde NewRecruit con el formato de GW) y pégala tal cual, sin editarla.
          Se admite en español o en inglés.
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Talavera (2270 puntos)\n\nMil Hijos\nGrand Coven (3 puntos de destacamento)\n..."}
        rows={rows}
        className="w-full resize-y rounded-lg border border-input bg-background/40 px-3 py-2 font-mono text-xs leading-relaxed placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {showError && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          No se reconoce el formato. Debe ser la exportación de texto de Games Workshop completa, empezando por una
          línea como «Mi lista (2000 puntos)» o «My list (2,000 Points)».
        </p>
      )}
      {parsed && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {parsed.listName} · {parsed.factionName} · {parsed.totalPoints} pts ·{" "}
          {parsed.categories.reduce((n, c) => n + c.units.length, 0)} unidades
        </p>
      )}
    </div>
  );
}
