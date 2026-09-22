const VEHICLE_RE =
  /tank|rhino|razorback|land raider|predator|vindicator|whirlwind|impulsor|gladiator|repulsor|dreadnought|knight|titan|vehicle|flyer|aircraft|drop pod|stormraven|stormtalon|stormhawk|chimera|leman|baneblade|wave serpent|falcon|fire prism|night spinner|raider|ravager|venom|hammerhead|devilfish|piranha|sun shark|tiger shark|monolith|night scythe|doom scythe|ghost ark|doomsday ark|tesseract|canoptek spyder|trukk|battlewagon|gunwagon|kill rig|deffkilla|blitza|warbikers|stompa|bloat-drone|plagueburst|myphitic|foetid|heldrake|maulerfiend|forgefiend|defiler|helbrute|venomcrawler|chaos land|sicaran|spartan|kratos|mastodon|falchion|typhon|cerberus|thunderhawk|fire raptor|xiphon|storm eagle|caestus|kharybdis|dunerider|skorpius|onager|ironstrider|sydonian|knight|armiger|war dog|despoiler|rampager|abominant|tyrant|atropos|castigator|valiant|errant|paladin|warden|crusader|gallant|preceptor|canis rex/i;

export function unitCategory(unit) {
  if (VEHICLE_RE.test(unit.name || '')) return 'vehicle';
  const maxModels = Math.max(
    0,
    ...(unit.pricing || []).flatMap((t) =>
      (t.costs || []).filter((c) => !c.addon).map((c) => Number(c.models) || 0),
    ),
  );
  if (maxModels > 1) return 'squad';
  return 'character';
}

export function flattenCatalog(scraped) {
  const units = [];
  for (const faction of scraped.factions || []) {
    for (const unit of faction.units || []) {
      const costs = (unit.pricing || []).flatMap((t) => t.costs || []).filter((c) => !c.addon);
      units.push({
        gameName: 'Warhammer 40,000',
        factionSlug: faction.slug,
        factionName: faction.name,
        name: unit.name,
        category: unitCategory(unit),
        groupTitle: unit.groupTitle ?? null,
        pricing: unit.pricing || [],
        wargear: unit.wargear || [],
        leaderTo: unit.leaderTo || [],
        supportTo: unit.supportTo || [],
        legends: /legends/i.test(unit.groupTitle || ''),
        defaultQuantity: costs[0]?.models || 1,
        mfmVersion: scraped.version || faction.version || null,
      });
    }
  }
  return units;
}

export function catalogKey(unit) {
  return `${unit.gameName}\0${unit.factionSlug}\0${unit.name}`;
}

/** Faction-level rows (art + detachments) — parallel to flattenCatalog's units. */
export function flattenFactions(scraped) {
  return (scraped.factions || []).map((faction) => ({
    gameName: 'Warhammer 40,000',
    factionSlug: faction.slug,
    factionName: faction.name,
    image: faction.image || null,
    parentFaction: faction.parent || null,
    detachments: faction.detachments || [],
    mfmVersion: scraped.version || faction.version || null,
  }));
}

export function factionKey(faction) {
  return `${faction.gameName}\0${faction.factionSlug}`;
}

export function dedupeCatalog(units) {
  const map = new Map();
  for (const unit of units) {
    const key = catalogKey(unit);
    if (!map.has(key)) map.set(key, unit);
  }
  return [...map.values()];
}
