import type { Profile, ProfileLink } from "@/types";

/** Normalizes a user-typed URL (adds https://); null if it isn't a URL. */
export function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Display text for a link: its label, else the host + path ("instagram.com/user"). */
export function linkLabel(link: ProfileLink): string {
  if (link.label.trim()) return link.label.trim();
  try {
    const url = new URL(link.url);
    return (url.hostname.replace(/^www\./, "") + url.pathname).replace(/\/$/, "");
  } catch {
    return link.url;
  }
}

/** Profile links, falling back to the legacy single `website` field. */
export function profileLinks(profile: Pick<Profile, "links" | "website">): ProfileLink[] {
  if (profile.links.length > 0) return profile.links;
  return profile.website ? [{ label: "", url: profile.website }] : [];
}
