/** Public production origin — used for canonical URLs and share metadata. */
export const SITE_URL = "https://administratum.site";
export const SITE_NAME = "Administratum";

export const DEFAULT_TITLE = "Administratum · Colección, pintura y listas de Warhammer 40,000";
export const DEFAULT_DESCRIPTION =
  "Gestiona tu colección de miniaturas y su progreso de pintura, crea listas con los puntos oficiales siempre al día, sigue torneos y comparte con la comunidad. Gratis.";

/** Plain one-line description for meta tags, cut at a word near `max`. */
export function metaDescription(text: string | null | undefined, max = 155): string | undefined {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : max).trimEnd()}…`;
}
