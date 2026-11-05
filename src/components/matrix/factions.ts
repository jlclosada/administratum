import { getFactionCatalog } from "@/db";
import { factionDisplayName } from "@/lib/factionNames";
import { useEffect, useState } from "react";

export interface FactionOption {
  /** English catalog name, stored in the matrix ("Thousand Sons"). */
  name: string;
  /** "Mil Hijos (Thousand Sons)". */
  label: string;
  image: string | null;
}

// Used until the catalog loads, or if it can't be reached.
const FALLBACK = [
  "Adepta Sororitas", "Adeptus Custodes", "Adeptus Mechanicus", "Aeldari", "Astra Militarum", "Black Templars",
  "Blood Angels", "Chaos Daemons", "Chaos Knights", "Chaos Space Marines", "Dark Angels", "Death Guard", "Deathwatch",
  "Drukhari", "Emperor’s Children", "Genestealer Cults", "Grey Knights", "Imperial Agents", "Imperial Knights",
  "Leagues of Votann", "Necrons", "Orks", "Space Marines", "Space Wolves", "T’au Empire", "Thousand Sons", "Tyranids",
  "World Eaters",
].map((name) => ({ name, label: name, image: null }));

let cache: FactionOption[] | null = null;

/** Warhammer 40K factions for the army selects, with their artwork. */
export function useFactions(): FactionOption[] {
  const [list, setList] = useState<FactionOption[]>(cache ?? FALLBACK);
  useEffect(() => {
    if (cache) return;
    getFactionCatalog("Warhammer 40,000").then((rows) => {
      if (!rows.length) return;
      cache = rows
        .map((f) => ({ name: f.factionName, label: factionDisplayName(f.factionSlug, f.factionName), image: f.image }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"));
      setList(cache);
    });
  }, []);
  return list;
}

// The catalog writes "T’au Empire"; shared links or typing may use "T'au".
const norm = (s: string) => s.replace(/[’']/g, "'").toLowerCase();

export const factionImage = (list: FactionOption[], name: string) => list.find((f) => norm(f.name) === norm(name))?.image ?? null;
