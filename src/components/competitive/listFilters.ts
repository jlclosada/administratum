import type { CommunityList } from "@/types";

export type ListSort = "recent" | "top" | "discussed" | "results";
export type ListSize = "all" | "incursion" | "strike" | "onslaught";

export interface ListFilters {
  q: string;
  faction: string;
  tournament: string;
  size: ListSize;
  sort: ListSort;
}

export const SIZE_LABEL: Record<ListSize, string> = {
  all: "Todos los puntos",
  incursion: "≤ 1000",
  strike: "1001 – 2000",
  onslaught: "> 2000",
};

export const SORT_LABEL: Record<ListSort, string> = {
  recent: "Más recientes",
  top: "Mejor valoradas",
  discussed: "Más comentadas",
  results: "Mejor resultado",
};

/** Win rate from "V-D-E" (draws count half); null without a valid result. */
export function winRate(result: string | null | undefined): number | null {
  if (!result) return null;
  const parts = result.split("-").map((n) => Number(n.trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [v, d, e] = parts as [number, number, number];
  const games = v + d + e;
  return games > 0 ? (v + e / 2) / games : null;
}

function inSize(points: number, size: ListSize): boolean {
  if (size === "incursion") return points <= 1000;
  if (size === "strike") return points > 1000 && points <= 2000;
  if (size === "onslaught") return points > 2000;
  return true;
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function applyListFilters(
  lists: CommunityList[],
  f: ListFilters,
  authorName: (l: CommunityList) => string,
): CommunityList[] {
  const q = norm(f.q.trim());
  const filtered = lists.filter((l) => {
    if (f.faction && l.factionName !== f.faction) return false;
    if (f.tournament && l.tournamentName !== f.tournament) return false;
    if (!inSize(l.totalPoints, f.size)) return false;
    if (!q) return true;
    return [l.title, l.factionName, l.detachmentName, l.tournamentName, authorName(l)]
      .filter(Boolean)
      .some((t) => norm(t!).includes(q));
  });
  const byDate = (a: CommunityList, b: CommunityList) => b.createdAt.localeCompare(a.createdAt);
  const sorters: Record<ListSort, (a: CommunityList, b: CommunityList) => number> = {
    recent: byDate,
    top: (a, b) => b.likeCount - a.likeCount || byDate(a, b),
    discussed: (a, b) => b.commentCount - a.commentCount || byDate(a, b),
    // Lists without a result go last.
    results: (a, b) => (winRate(b.result) ?? -1) - (winRate(a.result) ?? -1) || byDate(a, b),
  };
  return [...filtered].sort(sorters[f.sort]);
}
