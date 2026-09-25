import type { Ad } from "@/types";
import { cn } from "@/lib/utils";

function AdLabel() {
  return (
    <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">
      Publicidad
    </span>
  );
}

export function AdSlot({
  ad,
  className,
  compact = false,
}: {
  ad: Ad;
  className?: string;
  /** Fixed height, natural width — keeps tall skyscrapers sane in the mobile strip. */
  compact?: boolean;
}) {
  return (
    <a
      href={ad.url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={cn("group block", className)}
      title={ad.title || undefined}
    >
      <AdLabel />
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/40 transition-[border-color,box-shadow] duration-300 group-hover:border-primary/40 group-hover:shadow-lg">
        <img
          src={ad.image}
          alt={ad.title || "Anuncio"}
          loading="lazy"
          className={cn(
            "block transition-transform duration-500 group-hover:scale-[1.02]",
            compact ? "h-[200px] w-auto max-w-[85vw] object-contain" : "h-auto w-full",
          )}
        />
      </div>
    </a>
  );
}

/** Vertical stack of ads for a desktop side rail. */
export function AdRail({ ads }: { ads: Ad[] }) {
  if (ads.length === 0) return null;
  return (
    <div className="space-y-4">
      {ads.map((ad) => (
        <AdSlot key={ad.id} ad={ad} />
      ))}
    </div>
  );
}

/**
 * Narrow screens have no side margins, so ads collect into one strip after
 * the page content: a horizontal, swipeable row that never pushes the
 * page wider than the viewport.
 */
export function MobileAdStrip({ ads }: { ads: Ad[] }) {
  if (ads.length === 0) return null;
  return (
    <div className="mt-10 border-t border-border/40 pt-4">
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6">
        {ads.map((ad) => (
          <AdSlot key={ad.id} ad={ad} compact className="shrink-0 snap-start" />
        ))}
      </div>
    </div>
  );
}
