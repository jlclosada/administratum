import { ENTRY_STATUS_LABEL, GAME_STATUS_LABEL, PAYMENT_LABEL } from "./labels";
import { toGamePoints } from "./score";
import type { StandingRow } from "./standings";
import type { PlayEntry, PlayEntryPlayer, PlayGame, PlayList, PlayMatch, PlayPayment, PlayRound, PlayTournament } from "./types";

/** What the exports need from a tournament's data (PlayView has all of it). */
export interface ExportData {
  tournament: PlayTournament;
  entries: PlayEntry[];
  players: PlayEntryPlayer[];
  payments: PlayPayment[];
  lists: PlayList[];
  rounds: PlayRound[];
  matches: PlayMatch[];
  games: PlayGame[];
  table: StandingRow[];
}

/** Semicolon-separated with a BOM: what Excel in Spanish opens straight away. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

const playersOf = (d: ExportData, entryId: string) => d.players.filter((p) => p.entryId === entryId).sort((a, b) => a.position - b.position);

export function standingsCsv(d: ExportData): string {
  const teams = d.tournament.teamSize > 1;
  return toCsv([
    ["Posición", teams ? "Equipo" : "Jugador", ...(teams ? ["Jugadores"] : ["Ejército"]), "Puntos", "Victorias", "Empates", "Derrotas", ...(teams ? ["Puntos de partida"] : []), "PV a favor", "PV en contra", "Diferencia PV", "Fuerza de rivales"],
    ...d.table.map((r) => {
      const e = d.entries.find((x) => x.id === r.entryId);
      const ps = playersOf(d, r.entryId);
      return [
        r.rank,
        e?.name,
        teams ? ps.map((p) => `${p.displayName} (${p.faction || "?"})`).join(", ") : ps[0]?.faction,
        r.points,
        r.wins,
        r.draws,
        r.losses,
        ...(teams ? [r.gamePoints] : []),
        r.vpFor,
        r.vpAgainst,
        r.vpFor - r.vpAgainst,
        r.sos,
      ];
    }),
  ]);
}

export function gamesCsv(d: ExportData): string {
  const teams = d.tournament.teamSize > 1;
  const rows: (string | number | null)[][] = [];
  for (const round of [...d.rounds].sort((a, b) => a.number - b.number)) {
    for (const m of d.matches.filter((x) => x.roundId === round.id).sort((a, b) => a.tableNo - b.tableNo)) {
      const ea = d.entries.find((e) => e.id === m.entryA)?.name ?? "";
      const eb = m.entryB ? (d.entries.find((e) => e.id === m.entryB)?.name ?? "") : "BYE";
      const gs = d.games.filter((g) => g.matchId === m.id).sort((a, b) => a.tableNo - b.tableNo);
      if (!gs.length) rows.push([round.number, m.tableNo, ea, "", "", "", "", "", "", eb, "", "", m.entryB ? "Sin cruces" : "Bye"]);
      for (const g of gs) {
        const pa = d.players.find((p) => p.id === g.playerA);
        const pb = d.players.find((p) => p.id === g.playerB);
        const [gpA, gpB] = toGamePoints(g.vpA, g.vpB);
        const started = g.status !== "setup";
        rows.push([
          round.number,
          g.tableNo,
          ea,
          pa?.displayName ?? "",
          pa?.faction ?? "",
          started ? g.vpA : "",
          started ? g.vpB : "",
          pb?.faction ?? "",
          pb?.displayName ?? "",
          eb,
          teams && started ? gpA : "",
          teams && started ? gpB : "",
          GAME_STATUS_LABEL[g.status],
        ]);
      }
    }
  }
  return toCsv([
    ["Ronda", "Mesa", teams ? "Equipo A" : "Inscripción A", "Jugador A", "Ejército A", "PV A", "PV B", "Ejército B", "Jugador B", teams ? "Equipo B" : "Inscripción B", "Puntos partida A", "Puntos partida B", "Estado"],
    ...rows,
  ]);
}

/** For the organiser: entries, payment and lists. */
export function entriesCsv(d: ExportData): string {
  return toCsv([
    ["Inscripción", "Estado", "Pago", "Referencia de pago", "Jugadores", "Listas enviadas", "Fecha"],
    ...d.entries.map((e) => {
      const p = d.payments.find((x) => x.entryId === e.id);
      const ps = playersOf(d, e.id);
      const lists = d.lists.filter((l) => l.entryId === e.id).length;
      return [e.name, ENTRY_STATUS_LABEL[e.status], p ? PAYMENT_LABEL[p.status] : "", p?.reference ?? "", ps.map((x) => `${x.displayName} (${x.faction || "?"})`).join(", "), `${lists}/${ps.length}`, e.createdAt.slice(0, 10)];
    }),
  ]);
}

/** File name from the tournament name: "copa-e2e-clasificacion.csv". */
export function csvName(t: Pick<PlayTournament, "name">, what: string): string {
  const slug = t.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "torneo"}-${what}.csv`;
}

export function downloadCsv(name: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
