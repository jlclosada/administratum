import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  /** Current value (may be fractional for display). */
  value: number;
  /** When provided, the widget is interactive and calls this on click. */
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  readOnly?: boolean;
}

const sizeMap = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-7 w-7" };

/** A 1..5 star rating widget. Read-only by default; interactive with `onRate`. */
export function StarRating({
  value,
  onRate,
  size = "md",
  className,
  readOnly,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const interactive = !!onRate && !readOnly;
  const display = hover || value;

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = display >= i;
        const half = !filled && display >= i - 0.5;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHover(i)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => onRate?.(i)}
            className={cn(
              "relative",
              interactive && "cursor-pointer transition-transform hover:scale-110",
              !interactive && "cursor-default"
            )}
            aria-label={`${i} estrellas`}
          >
            <Star
              className={cn(
                sizeMap[size],
                filled || half
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
