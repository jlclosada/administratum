import type { EntryStatus, GameStatus, PaymentStatus, PlayFormat, PlayStatus, PlayTournament } from "./types";

export const FORMAT_LABEL: Record<PlayFormat, string> = { singles: "Individual", doubles: "Parejas", teams: "Equipos" };

export const STATUS_LABEL: Record<PlayStatus, string> = {
  draft: "Borrador",
  open: "Inscripción abierta",
  closed: "Inscripción cerrada",
  in_progress: "En juego",
  finished: "Finalizado",
  cancelled: "Cancelado",
};

export const ENTRY_STATUS_LABEL: Record<EntryStatus, string> = { registered: "Inscrito", waitlist: "Lista de espera", withdrawn: "Retirado" };

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendiente de pago",
  submitted: "Pago por validar",
  paid: "Pagado",
  waived: "Exento",
  rejected: "Pago rechazado",
};

export const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  setup: "Preparando",
  playing: "En juego",
  submitted: "Por confirmar",
  confirmed: "Confirmada",
};

export const PAIRING_LABEL = { swiss: "Suizo", manual: "Manual (la organización empareja)", league: "Liga: todos contra todos por jornadas" };
export const TEAM_PAIRING_LABEL = { wtc: "Formato WTC: defensores y atacantes con matriz", free: "Libre: los capitanes acuerdan los cruces" };
export const SCORING_LABEL = { wtc: "Puntos de partida 20-0 (WTC)", wins: "Partidas ganadas" };

/** "Equipos de 5" / "Parejas" / "Individual" (with "Liga ·" for leagues). */
export function formatSummary(t: Pick<PlayTournament, "format" | "teamSize"> & Partial<Pick<PlayTournament, "pairingSystem">>): string {
  const base = t.format === "teams" ? `Equipos de ${t.teamSize}` : FORMAT_LABEL[t.format];
  return t.pairingSystem === "league" ? `Liga · ${base}` : base;
}

/** Leagues have "jornadas", tournaments "rondas". */
export const roundNoun = (t: Partial<Pick<PlayTournament, "pairingSystem">>, plural = false) =>
  t.pairingSystem === "league" ? (plural ? "Jornadas" : "Jornada") : plural ? "Rondas" : "Ronda";

/** Spots, in the unit people think in: "16 equipos (80 jugadores)". */
export function capacityLabel(t: Pick<PlayTournament, "format" | "teamSize" | "maxEntries">): string {
  if (t.format === "singles") return `${t.maxEntries} jugadores`;
  const unit = t.format === "doubles" ? "parejas" : "equipos";
  return `${t.maxEntries} ${unit} (${t.maxEntries * t.teamSize} jugadores)`;
}

export const entryNoun = (t: Pick<PlayTournament, "format">, plural = false) =>
  t.format === "singles" ? (plural ? "jugadores" : "jugador") : t.format === "doubles" ? (plural ? "parejas" : "pareja") : plural ? "equipos" : "equipo";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function feeLabel(t: Pick<PlayTournament, "entryFee" | "teamSize">): string {
  if (!t.entryFee) return "Gratis";
  return t.teamSize > 1 ? `${money.format(t.entryFee)} por jugador (${money.format(t.entryFee * t.teamSize)} por ${t.teamSize === 2 ? "pareja" : "equipo"})` : money.format(t.entryFee);
}

const dateFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const fmtDate = (iso: string) => dateFmt.format(new Date(`${iso.slice(0, 10)}T12:00:00`));
export const fmtDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export function dateRange(t: Pick<PlayTournament, "startsOn" | "endsOn">): string {
  if (!t.endsOn || t.endsOn === t.startsOn) return fmtDate(t.startsOn);
  return `${fmtDate(t.startsOn)} – ${fmtDate(t.endsOn)}`;
}

/** Registration accepts entries right now (status and deadline). */
export function registrationOpen(t: Pick<PlayTournament, "status" | "registrationDeadline">, now = Date.now()): boolean {
  return t.status === "open" && (!t.registrationDeadline || now < new Date(t.registrationDeadline).getTime());
}

/** Army lists are visible to everyone. */
export function listsVisible(t: Pick<PlayTournament, "status" | "listsPublic" | "listDeadline">, now = Date.now()): boolean {
  return t.listsPublic || t.status === "in_progress" || t.status === "finished" || (!!t.listDeadline && now > new Date(t.listDeadline).getTime());
}

/** Players can still send or change their lists. */
export function listsEditable(t: Pick<PlayTournament, "status" | "listDeadline">, now = Date.now()): boolean {
  return (t.status === "open" || t.status === "closed") && (!t.listDeadline || now <= new Date(t.listDeadline).getTime());
}

export function whereLabel(t: Pick<PlayTournament, "locationType" | "venueName" | "city" | "onlinePlatform">): string {
  if (t.locationType === "online") return `Online${t.onlinePlatform ? ` · ${t.onlinePlatform}` : ""}`;
  return [t.venueName, t.city].filter(Boolean).join(", ") || "Presencial";
}
