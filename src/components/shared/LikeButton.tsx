import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export function LikeButton({
  liked,
  count,
  onToggle,
  disabled,
  size = "md",
  className,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={disabled}
      aria-pressed={liked}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-[color,background-color,border-color,transform] active:scale-95 disabled:pointer-events-none disabled:opacity-50",
        liked
          ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
          : "border-border/60 text-muted-foreground hover:border-rose-500/30 hover:text-rose-500",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        className,
      )}
    >
      <motion.span
        key={liked ? "liked" : "unliked"}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.5 }}
        className="flex"
      >
        <Heart className={cn("h-3.5 w-3.5", liked && "fill-current", size === "sm" && "h-3 w-3")} />
      </motion.span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
