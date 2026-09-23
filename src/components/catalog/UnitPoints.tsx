import { etiquetaTramo, type CatalogUnitLike } from "@/lib/mfm";
import { cn } from "@/lib/utils";

/**
 * Renders every buy-in option (model count, addon) as a column in a divided
 * row — not a chip or a card. Options share one baseline, separated by a
 * hairline, so a unit with several sizes reads like a price list, not a grid
 * of boxes.
 */
export function UnitPoints({
  unit,
  className,
  size = "md",
}: {
  unit: CatalogUnitLike;
  className?: string;
  size?: "sm" | "md";
}) {
  const tiers = unit.pricing || [];
  const multiTier = tiers.length > 1;

  return (
    <div className={cn("space-y-1", className)}>
      {tiers.map((tier, i) => {
        const label = etiquetaTramo(tier.label);
        const regular = tier.costs.filter((c) => !c.addon);
        const addons = tier.costs.filter((c) => c.addon);
        return (
          <div key={`${tier.label}-${i}`} className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1">
            {multiTier && label && (
              <span className="mr-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
            )}
            <div className="flex flex-wrap items-stretch justify-end divide-x divide-border/70 text-right">
              {regular.map((c, ci) => (
                <div key={ci} className={cn("flex flex-col justify-center", size === "sm" ? "px-2 first:pl-0" : "px-2.5 first:pl-0")}>
                  <span className="whitespace-nowrap">
                    <span
                      className={cn(
                        "font-mono font-medium tabular-nums text-foreground",
                        size === "sm" ? "text-sm" : "text-base",
                      )}
                    >
                      {c.points}
                    </span>
                    <span className="ml-1 text-[10px] font-medium text-muted-foreground">pts</span>
                  </span>
                  <span className="whitespace-nowrap text-[10px] leading-tight text-muted-foreground">
                    {c.models} {c.models === 1 ? "modelo" : "modelos"}
                    {c.desc ? ` · ${c.desc}` : ""}
                  </span>
                </div>
              ))}
            </div>
            {addons.length > 0 && (
              <div className="flex flex-wrap justify-end gap-x-2.5 gap-y-0.5">
                {addons.map((c, ci) => (
                  <span key={ci} className="whitespace-nowrap text-xs text-primary">
                    <span className="font-mono tabular-nums">+{c.points}</span> {c.desc ?? ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
