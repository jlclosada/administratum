import { getFactionCatalog } from "@/db";
import { factionDisplayName, FACTION_ES } from "@/lib/factionNames";
import { useEffect, useState } from "react";

export interface FactionOption {
  /** English catalog name, stored in the matrix ("Thousand Sons"). */
  name: string;
  /** "Mil Hijos (Thousand Sons)". */
  label: string;
  /** Spanish name when it differs ("Mil Hijos"). */
  es: string | null;
  image: string | null;
}

export type FactionGroup = "Imperio" | "Caos" | "Xenos" | "Otros";
export const FACTION_GROUPS: FactionGroup[] = ["Imperio", "Caos", "Xenos", "Otros"];

const CHAOS = ["chaos daemons", "chaos knights", "chaos space marines", "chaos titan legions", "death guard", "emperor's children", "thousand sons", "world eaters"];
const XENOS = ["aeldari", "drukhari", "genestealer cults", "leagues of votann", "necrons", "orks", "t'au empire", "tyranids"];
const IMPERIUM = [
  "adepta sororitas", "adeptus custodes", "adeptus mechanicus", "astra militarum", "black templars", "blood angels", "dark angels",
  "deathwatch", "grey knights", "imperial agents", "imperial knights", "space marines", "space wolves", "titan legions",
];

export function factionGroup(name: string): FactionGroup {
  const n = norm(name);
  return IMPERIUM.includes(n) ? "Imperio" : CHAOS.includes(n) ? "Caos" : XENOS.includes(n) ? "Xenos" : "Otros";
}

// Used until the catalog loads, or if it can't be reached.
const FALLBACK = [
  "Adepta Sororitas", "Adeptus Custodes", "Adeptus Mechanicus", "Aeldari", "Astra Militarum", "Black Templars",
  "Blood Angels", "Chaos Daemons", "Chaos Knights", "Chaos Space Marines", "Dark Angels", "Death Guard", "Deathwatch",
  "Drukhari", "Emperor’s Children", "Genestealer Cults", "Grey Knights", "Imperial Agents", "Imperial Knights",
  "Leagues of Votann", "Necrons", "Orks", "Space Marines", "Space Wolves", "T’au Empire", "Thousand Sons", "Tyranids",
  "World Eaters",
].map((name) => ({ name, label: name, es: null, image: null }));

// The catalog writes "T’au Empire"; shared links or typing may use "T'au".
function norm(s: string): string {
  return s.replace(/[’']/g, "'").toLowerCase();
}

let cache: FactionOption[] | null = null;
let inflight: ReturnType<typeof getFactionCatalog> | null = null;
/** Detachment names per faction (catalog name), from the same request. */
let detachmentCache: Map<string, string[]> | null = null;

/** Warhammer 40K factions for the army selects, with their artwork. */
export function useFactions(): FactionOption[] {
  const [list, setList] = useState<FactionOption[]>(cache ?? FALLBACK);
  useEffect(() => {
    if (cache) return;
    // Many pickers mount at once: share one request.
    inflight ??= getFactionCatalog("Warhammer 40,000");
    inflight.then((rows) => {
      if (!rows.length) return;
      detachmentCache = new Map(rows.map((f) => [norm(f.factionName), (f.detachments ?? []).map((d) => d.name).filter(Boolean)]));
      cache = rows
        .map((f) => {
          const es = FACTION_ES[f.factionSlug];
          return { name: f.factionName, label: factionDisplayName(f.factionSlug, f.factionName), es: es && es !== f.factionName ? es : null, image: f.image };
        })
        .sort((a, b) => a.label.localeCompare(b.label, "es"));
      setList(cache);
    });
  }, []);
  return list;
}

export const findFaction = (list: FactionOption[], name: string) => list.find((f) => norm(f.name) === norm(name)) ?? null;
export const factionImage = (list: FactionOption[], name: string) => findFaction(list, name)?.image ?? null;

/** The faction's detachments (from the points catalog), once loaded. */
export function useDetachments(faction: string): string[] {
  useFactions();
  return (faction && detachmentCache?.get(norm(faction))) || [];
}
