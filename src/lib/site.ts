/** Public production origin — used for canonical URLs and share metadata. */
export const SITE_URL = "https://administratum.site";
export const SITE_NAME = "Administratum";

/** Landing page of every auth email link and of the Google sign-in return. */
export const CONFIRM_PATH = "/auth/confirmar";

export const DEFAULT_TITLE = "Administratum · Warhammer 40K en español: puntos, listas, torneos y comunidad";
export const DEFAULT_DESCRIPTION =
  "Puntos de Warhammer 40K actualizados cada día, listas de ejército, torneos en España, guías de pintura y tu colección de miniaturas en un solo lugar. Gratis y en español.";

/** Plain one-line description for meta tags, cut at a word near `max`. */
export function metaDescription(text: string | null | undefined, max = 155): string | undefined {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : max).trimEnd()}…`;
}
