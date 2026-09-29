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
            compact ? "h-[180px] w-auto max-w-[85vw] object-contain sm:h-[220px]" : "h-auto w-full",
          )}
        />
      </div>
    </a>
  );
}

/**
 * Advertising lives in one band above the site footer, never in the side
 * margins: rectangles ("right" ads) in a swipeable row, wide banners ("left"
 * ads) centred below it. Neither can push the page wider than the viewport.
 */
export function AdFooter({ ads }: { ads: Ad[] }) {
  if (ads.length === 0) return null;
  const rectangles = ads.filter((a) => a.position === "right");
  const banners = ads.filter((a) => a.position === "left");
  return (
    <section aria-label="Publicidad" className="border-t border-border/40 bg-card/20">
      <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {rectangles.length > 0 && (
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden">
            {rectangles.map((ad) => (
              <AdSlot key={ad.id} ad={ad} compact className="shrink-0 snap-start" />
            ))}
          </div>
        )}
        {banners.map((ad) => (
          <a
            key={ad.id}
            href={ad.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            title={ad.title || undefined}
            className="group mx-auto block w-fit max-w-full"
          >
            <AdLabel />
            <img
              src={ad.image}
              alt={ad.title || "Anuncio"}
              loading="lazy"
              className="block max-h-[120px] w-auto max-w-full rounded-xl border border-border/50 object-contain transition-colors group-hover:border-primary/40"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
