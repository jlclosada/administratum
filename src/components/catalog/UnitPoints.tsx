import { etiquetaTramo, type CatalogUnitLike } from "@/lib/mfm";
import { cn } from "@/lib/utils";

/**
 * Every buy-in option (model count, addon) for a unit rendered as its own
 * chip with the points total as the big, bold number — the previous version
 * joined several options into one line of small text, which made it hard to
 * tell them apart at a glance.
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
    <div className={cn("space-y-1.5", className)}>
      {tiers.map((tier, i) => {
        const label = etiquetaTramo(tier.label);
        const regular = tier.costs.filter((c) => !c.addon);
        const addons = tier.costs.filter((c) => c.addon);
        return (
          <div key={`${tier.label}-${i}`}>
            {multiTier && label && (
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {regular.map((c, ci) => (
                <div
                  key={ci}
                  className={cn(
                    "rounded-lg border border-border/70 bg-muted/50 text-center",
                    size === "sm" ? "min-w-[52px] px-2 py-1" : "min-w-[64px] px-2.5 py-1.5",
                  )}
                >
                  <p
                    className={cn(
                      "font-bold leading-none tabular-nums text-foreground",
                      size === "sm" ? "text-sm" : "text-base",
                    )}
                  >
                    {c.points}
                  </p>
                  <p className="mt-0.5 whitespace-nowrap text-[9px] leading-none text-muted-foreground">
                    {c.models} {c.models === 1 ? "modelo" : "modelos"}
                    {c.desc ? ` · ${c.desc}` : ""}
                  </p>
                </div>
              ))}
              {addons.map((c, ci) => (
                <span
                  key={ci}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                >
                  +{c.points}
                  {c.desc ? ` ${c.desc}` : ""}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
