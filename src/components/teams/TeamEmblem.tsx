import { cn } from "@/lib/utils";
import type { Team } from "@/types";

const SIZES = {
  sm: "h-10 w-10 text-sm rounded-xl",
  md: "h-14 w-14 text-lg rounded-2xl",
  lg: "h-24 w-24 text-3xl rounded-3xl sm:h-28 sm:w-28",
} as const;

/** The team's emblem, or its initials on the brand gradient. */
export function TeamEmblem({ team, size = "md", className }: { team: Pick<Team, "name" | "emblem">; size?: keyof typeof SIZES; className?: string }) {
  const initials = team.name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-border/60 bg-brand-gradient font-display font-black text-brand-foreground",
        SIZES[size],
        className,
      )}
    >
      {team.emblem ? <img src={team.emblem} alt="" className="h-full w-full object-cover" /> : initials || "?"}
    </span>
  );
}
