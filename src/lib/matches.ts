import type { Match, MatchFormat, MatchInvitee, MatchLevel, VenueType } from "@/types";

export const FORMAT_LABEL: Record<MatchFormat, string> = {
  equilibrado: "Juego equilibrado",
  cruzada: "Cruzada",
  narrativo: "Narrativo",
  patrulla: "Patrulla de combate",
  incursion: "Incursión",
  otro: "Otro formato",
};

export const LEVEL_LABEL: Record<MatchLevel, string> = {
  iniciacion: "Iniciación",
  casual: "Casual",
  intermedio: "Intermedio",
  competitivo: "Competitivo",
};

export const LEVEL_HINT: Record<MatchLevel, string> = {
  iniciacion: "Estoy aprendiendo o enseño a jugar",
  casual: "Para pasarlo bien, sin presión",
  intermedio: "Conozco las reglas y juego a menudo",
  competitivo: "Preparando torneos, listas afinadas",
};

export const VENUE_LABEL: Record<VenueType, string> = {
  tienda: "Tienda",
  club: "Club o asociación",
  casa: "En casa",
  online: "Online",
  otro: "Otro lugar",
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

/** "sáb 12 oct" (and "hoy" / "mañana"). */
export function matchDay(startsOn: string, today = new Date()): string {
  const d = new Date(`${startsOn}T00:00:00`);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
}

/** "18:00", "17:00–21:00", "Flexible · por la tarde". */
export function matchTime(m: Pick<Match, "timeMode" | "startTime" | "endTime" | "timeNote">): string {
  if (m.timeMode === "fixed") {
    const end = hhmm(m.endTime);
    return [hhmm(m.startTime), end].filter(Boolean).join("–");
  }
  const window = [hhmm(m.startTime), hhmm(m.endTime)].filter(Boolean).join("–");
  return ["Horario flexible", window || m.timeNote || null].filter(Boolean).join(" · ");
}

/** Where, as shown on cards: venue + city (online games have no city). */
export function matchPlace(m: Pick<Match, "venueType" | "venueName" | "city">): string {
  if (m.venueType === "online") return m.venueName ? `Online · ${m.venueName}` : "Online";
  return [m.venueType === "casa" ? "En casa" : m.venueName || VENUE_LABEL[m.venueType], m.city].filter(Boolean).join(" · ");
}

/** Free seats: not taken by a player nor held by a pending invitation. */
export function spotsLeft(m: Pick<Match, "maxPlayers" | "playerCount"> & { reservedCount?: number }): number {
  return Math.max(0, m.maxPlayers - m.playerCount - (m.reservedCount ?? 0));
}

/** Stable key for an invitee (dedupe in the picker). */
export function inviteeKey(i: MatchInvitee): string {
  return i.kind === "user" ? `u:${i.profile.id}` : `e:${i.email}`;
}
