import { tramosUnidad, type CatalogUnitLike } from "@/lib/mfm";
import { cn } from "@/lib/utils";

export function UnitPoints({
  unit,
  className,
}: {
  unit: CatalogUnitLike;
  className?: string;
}) {
  const tramos = tramosUnidad(unit);
  const varios = tramos.length > 1;

  return (
    <div
      className={cn(
        varios ? "grid gap-1.5 sm:grid-cols-2" : "flex flex-col gap-0.5",
        className,
      )}
    >
      {tramos.map((tramo, i) => (
        <div
          key={`${tramo.etiqueta || "base"}-${i}`}
          className={cn(
            "rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5",
            !varios && "border-transparent bg-transparent px-0 py-0",
          )}
        >
          <p className="text-sm font-semibold tabular-nums leading-tight">
            {tramo.costes.join(" · ")}
          </p>
          {tramo.etiqueta && (
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {tramo.etiqueta}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
