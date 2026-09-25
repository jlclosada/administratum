import type { Tournament, TournamentStatus } from "@/types";

export const TOURNAMENT_STATUS: Record<TournamentStatus, { label: string; dot: string; pill: string }> = {
  ongoing: {
    label: "En curso",
    dot: "bg-emerald-500",
    pill: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  upcoming: {
    label: "Próximo",
    dot: "bg-sky-400",
    pill: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  },
  finished: {
    label: "Finalizado",
    dot: "bg-muted-foreground",
    pill: "border-border bg-muted/40 text-muted-foreground",
  },
};

export function parseDay(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateRange(t: Pick<Tournament, "startDate" | "endDate">): string {
  const start = parseDay(t.startDate);
  if (!start) return "Fecha por anunciar";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const end = parseDay(t.endDate);
  if (!end || end.getTime() === start.getTime()) return start.toLocaleDateString("es-ES", opts);
  return `${start.toLocaleDateString("es-ES", { day: "numeric", month: "long" })} – ${end.toLocaleDateString("es-ES", opts)}`;
}

/** Whole days from today until the tournament starts (negative once past). */
export function daysUntil(iso: string | null, now = new Date()): number | null {
  const start = parseDay(iso);
  if (!start) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}

/** "Faltan 12 días" / "Mañana" / "Hoy" — null when not meaningful. */
export function countdownLabel(t: Tournament): string | null {
  if (t.status === "ongoing") return "En juego ahora";
  if (t.status !== "upcoming") return null;
  const days = daysUntil(t.startDate);
  if (days === null || days < 0) return null;
  if (days === 0) return "¡Es hoy!";
  if (days === 1) return "Mañana";
  return `Faltan ${days} días`;
}
