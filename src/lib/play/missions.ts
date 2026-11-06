/**
 * Warhammer 40,000 11th edition matched play: the Chapter Approved 2026-27
 * Mission Deck. Card names are the official English ones (as printed and as
 * players call them); labels and help are in Spanish.
 *
 * Each player secretly picks a Force Disposition card; their primary mission
 * is the one on their card under the opponent's disposition symbol, so the
 * two players usually play different primaries.
 */

export const DISPOSITIONS = ["take_and_hold", "purge_the_foe", "disruption", "reconnaissance", "priority_assets"] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

export const DISPOSITION_LABEL: Record<Disposition, string> = {
  take_and_hold: "Take and Hold",
  purge_the_foe: "Purge the Foe",
  disruption: "Disruption",
  reconnaissance: "Reconnaissance",
  priority_assets: "Priority Assets",
};

export const DISPOSITION_HELP: Record<Disposition, string> = {
  take_and_hold: "Tomar y mantener objetivos",
  purge_the_foe: "Destruir al enemigo",
  disruption: "Sabotear y negar terreno",
  reconnaissance: "Explorar y posicionarse",
  priority_assets: "Activos prioritarios",
};

/** PRIMARY[mine][theirs]: my primary mission card. */
export const PRIMARY: Record<Disposition, Record<Disposition, string>> = {
  take_and_hold: {
    take_and_hold: "Battlefield Dominance",
    purge_the_foe: "Immovable Object",
    disruption: "Determined Acquisition",
    reconnaissance: "Purge and Secure",
    priority_assets: "Inescapable Dominion",
  },
  purge_the_foe: {
    take_and_hold: "Unstoppable Force",
    purge_the_foe: "Meatgrinder",
    disruption: "Punishment",
    reconnaissance: "Consecrate",
    priority_assets: "Destroyer's Wrath",
  },
  disruption: {
    take_and_hold: "Death Trap",
    purge_the_foe: "Delaying Action",
    disruption: "Outmanoeuvre",
    reconnaissance: "Smoke and Mirrors",
    priority_assets: "Locate and Deny",
  },
  reconnaissance: {
    take_and_hold: "Reconnaissance Sweep",
    purge_the_foe: "Triangulation",
    disruption: "Surveil the Foe",
    reconnaissance: "Gather Intel",
    priority_assets: "Search and Scour",
  },
  priority_assets: {
    take_and_hold: "Secure Asset",
    purge_the_foe: "Vital Link",
    disruption: "Extract Relic",
    reconnaissance: "Vanguard Operation",
    priority_assets: "Sabotage",
  },
};

export function primaryMission(mine: Disposition | null | undefined, theirs: Disposition | null | undefined): string | null {
  return mine && theirs ? PRIMARY[mine][theirs] : null;
}

export interface SecondaryCard {
  name: string;
  /** Can be taken as a Fixed mission (the rest are Tactical only). */
  fixed: boolean;
}

export const SECONDARIES: SecondaryCard[] = [
  { name: "A Grievous Blow", fixed: true },
  { name: "A Tempting Target", fixed: false },
  { name: "Assassination", fixed: true },
  { name: "Beacon", fixed: false },
  { name: "Behind Enemy Lines", fixed: false },
  { name: "Bring it Down", fixed: true },
  { name: "Burden of Trust", fixed: false },
  { name: "Centre Ground", fixed: false },
  { name: "Cleanse", fixed: false },
  { name: "Defend Stronghold", fixed: false },
  { name: "Display of Might", fixed: false },
  { name: "Engage on All Fronts", fixed: true },
  { name: "Forward Position", fixed: false },
  { name: "No Prisoners", fixed: false },
  { name: "Outflank", fixed: false },
  { name: "Overwhelming Force", fixed: false },
  { name: "Plunder", fixed: false },
  { name: "Secure No Man's Land", fixed: false },
];

export const DEPLOYMENTS = ["Tipping Point", "Sweeping Engagement", "Search and Destroy", "Hammer and Anvil", "Dawn of War", "Crucible of Battle"];

/** Recommended terrain layouts for each pair of dispositions (GW app). */
export const LAYOUTS = ["A", "B", "C"];

export const TWISTS = ["Nowhere to Hide", "Mirrored World", "Scrambled Communications", "Martial Pride", "Ruinscape", "Night Fighting"];

/** Matched play limits (Chapter Approved 2026-27). */
export const CAPS = {
  battleRounds: 5,
  primaryPerRound: 15,
  primaryTotal: 45,
  secondaryPerRound: 15,
  secondaryTotal: 45,
  fixedCard: 20,
  battleReady: 10,
  total: 100,
};

/**
 * The Force Dispositions an army can use, from the "Force Dispositions: …"
 * line of the official app's export (each detachment brings one).
 */
export function dispositionsFromList(notes: string[] | undefined): Disposition[] {
  const line = notes?.find((n) => /^force dispositions?\s*:/i.test(n.trim()));
  if (!line) return [];
  const names = line.split(":").slice(1).join(":").split(",").map((n) => n.trim().toLowerCase());
  return DISPOSITIONS.filter((d) => names.includes(DISPOSITION_LABEL[d].toLowerCase()));
}
