import type { Profile } from "@/types";

export type ProfileField = "avatar" | "name" | "faction" | "bio" | "location";

const FIELDS: { key: ProfileField; label: string; done: (p: Profile) => boolean }[] = [
  { key: "avatar", label: "Foto de perfil", done: (p) => !!p.avatarUrl },
  { key: "name", label: "Nombre", done: (p) => p.displayName.trim().length >= 2 },
  { key: "faction", label: "Facción favorita", done: (p) => !!p.favoriteFaction },
  { key: "bio", label: "Biografía", done: (p) => p.bio.trim().length >= 10 },
  { key: "location", label: "Ubicación", done: (p) => p.location.trim().length > 0 },
];

/** How complete a profile is, and what's left, for the wizard and the home card. */
export function profileCompletion(profile: Profile | null): {
  percent: number;
  missing: { key: ProfileField; label: string }[];
} {
  if (!profile) return { percent: 0, missing: FIELDS.map(({ key, label }) => ({ key, label })) };
  const missing = FIELDS.filter((f) => !f.done(profile)).map(({ key, label }) => ({ key, label }));
  return { percent: Math.round(((FIELDS.length - missing.length) / FIELDS.length) * 100), missing };
}
