import type { Score } from "@/lib/matrix";

/** Red → green, one colour per score (solid, for chips and heat-map cells). */
export const SCORE_SOLID: Record<Score, string> = {
  1: "bg-red-500 text-white",
  2: "bg-orange-500 text-white",
  3: "bg-amber-400 text-zinc-950",
  4: "bg-lime-500 text-zinc-950",
  5: "bg-emerald-500 text-white",
};

/** Same scale, subtle (unselected buttons). */
export const SCORE_SOFT: Record<Score, string> = {
  1: "border-red-500/40 text-red-300",
  2: "border-orange-500/40 text-orange-300",
  3: "border-amber-400/40 text-amber-200",
  4: "border-lime-500/40 text-lime-300",
  5: "border-emerald-500/40 text-emerald-300",
};

export const SCORES: Score[] = [1, 2, 3, 4, 5];

/** Colour for an average (1–5), e.g. a row's mean. */
export const solidFor = (value: number) => SCORE_SOLID[Math.min(5, Math.max(1, Math.round(value))) as Score];
