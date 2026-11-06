import { useFactions } from "@/components/matrix/factions";
import { FactionAvatar } from "@/components/matrix/MatrixParts";
import { ScoreStep, SummaryStep } from "@/components/matrix/MatrixSteps";
import { ListView } from "@/components/play/PlayBits";
import { usePlayData, type PlayView } from "@/components/play/usePlayData";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { getMatchMatrix, saveMatchMatrix, setMatchGames } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { analyzeMatrix, newMatrix, type Matrix, type Score } from "@/lib/matrix";
import { GAME_STATUS_LABEL, listsVisible } from "@/lib/play/labels";
import { matchResult } from "@/lib/play/standings";
import { toGamePoints } from "@/lib/play/score";
import type { PlayEntry, PlayEntryPlayer, PlayMatch } from "@/lib/play/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { ArrowLeft, ChevronDown, Grid3x3, Loader2, Lock, Shield, Swords } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

/**
 * One pairing of a round. Singles go straight to their game. Team matches
 * show both rosters and lists, each team's secret matrix, the cross-pairing
 * of players (set by the captains) and every game with its live score.
 */
export function MatchPage() {
  const { tournamentId, matchId } = useParams();
  const { view, reload } = usePlayData(tournamentId);
  const navigate = useNavigate();
  const match = view?.matches.find((m) => m.id === matchId);
  const singleGame = view && match && view.tournament.teamSize === 1 ? view.games.find((g) => g.matchId === match.id) : undefined;

  useEffect(() => {
    if (singleGame) navigate(`/torneos/${tournamentId}/juegos/${singleGame.id}`, { replace: true });
  }, [singleGame, tournamentId, navigate]);

  if (view === undefined || singleGame) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!view || !match || !match.entryB) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Enfrentamiento no encontrado</h1>
        <Button asChild variant="gradient">
          <Link to={`/torneos/${tournamentId}`}>Volver al torneo</Link>
        </Button>
      </div>
    );
  }
  return <TeamMatch view={view} match={match} reload={reload} />;
}

function TeamMatch({ view, match, reload }: { view: PlayView; match: PlayMatch; reload: () => void }) {
  const t = view.tournament;
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const a = view.entryById.get(match.entryA)!;
  const b = view.entryById.get(match.entryB!)!;
  const round = view.rounds.find((r) => r.id === match.roundId);
  const games = view.games.filter((g) => g.matchId === match.id).sort((x, y) => x.tableNo - y.tableNo);
  const r = matchResult(t, match, view.games);
  const isMember = (e: PlayEntry) => !!user && (e.captainId === user.id || view.playersOf(e.id).some((p) => p.userId === user.id));
  const mySide = isMember(a) ? a : isMember(b) ? b : null;
  const organizer = view.isOrganizer || isAdmin;
  const isCaptain = !!user && (a.captainId === user.id || b.captainId === user.id);
  const canPair = (organizer || isCaptain) && games.every((g) => g.status === "setup");
  const [editingPairs, setEditingPairs] = useState(false);

  return (
    <PageTransition>
      <Seo title={`${a.name} vs ${b.name} · ${t.name}`} path={`/torneos/${t.id}/partidas/${match.id}`} noindex />
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to={`/torneos/${t.id}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {t.name}
        </Link>

        <header className="rounded-3xl border border-border/60 bg-card/40 p-5 sm:p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            Ronda {round?.number} · Enfrentamiento {match.tableNo}
            {round?.deployment ? ` · ${round.deployment}` : ""}
          </p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <h1 className={cn("truncate text-right font-display text-xl font-black sm:text-3xl", r.outcomeA === "win" && "text-emerald-300")}>{a.name}</h1>
            <span className="rounded-2xl bg-background/60 px-3 py-2 font-display text-2xl font-black tabular-nums sm:text-4xl">
              {r.scoreA} – {r.scoreB}
            </span>
            <h1 className={cn("truncate font-display text-xl font-black sm:text-3xl", r.outcomeA === "loss" && "text-emerald-300")}>{b.name}</h1>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t.scoring === "wtc" ? "Puntos de partida (20-0 por mesa)" : "Partidas ganadas"} · {r.confirmedGames}/{r.totalGames} confirmadas
            {r.final && " · Resultado final"}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Roster view={view} entry={a} />
          <Roster view={view} entry={b} />
        </div>

        {mySide && <SecretMatrix view={view} match={match} mine={mySide} />}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <Swords className="h-4 w-4 text-primary" /> Partidas
            </h2>
            {canPair && games.length > 0 && !editingPairs && (
              <Button size="sm" variant="outline" onClick={() => setEditingPairs(true)}>
                Cambiar cruces
              </Button>
            )}
          </div>
          {(games.length === 0 || editingPairs) &&
            (canPair ? (
              <PairingForm view={view} match={match} mine={mySide} onDone={() => (setEditingPairs(false), reload())} />
            ) : (
              <p className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                Los capitanes aún no han fijado los cruces de esta ronda.
              </p>
            ))}
          {games.length > 0 && !editingPairs && (
            <ul className="space-y-2">
              {games.map((g) => {
                const pa = g.playerA ? view.playerById.get(g.playerA) : undefined;
                const pb = g.playerB ? view.playerById.get(g.playerB) : undefined;
                const [gpA, gpB] = toGamePoints(g.vpA, g.vpB);
                return (
                  <li key={g.id}>
                    <Link
                      to={`/torneos/${t.id}/juegos/${g.id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/40"
                    >
                      <PlayerCell player={pa} align="right" />
                      <span className="flex flex-col items-center">
                        <span className="rounded-lg bg-background/60 px-2.5 py-1 font-display text-lg font-black tabular-nums">
                          {g.status === "setup" ? "vs" : `${g.vpA} – ${g.vpB}`}
                        </span>
                        <span className={cn("mt-1 text-[10px] font-semibold uppercase tracking-wider", g.status === "confirmed" ? "text-emerald-300" : "text-muted-foreground")}>
                          M{g.tableNo} · {GAME_STATUS_LABEL[g.status]}
                          {t.scoring === "wtc" && g.status !== "setup" ? ` · ${gpA}-${gpB}` : ""}
                        </span>
                      </span>
                      <PlayerCell player={pb} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PageTransition>
  );
}

function PlayerCell({ player, align }: { player?: PlayEntryPlayer; align?: "right" }) {
  const factions = useFactions();
  return (
    <span className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <FactionAvatar factions={factions} faction={player?.faction ?? ""} className="h-9 w-9" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{player?.displayName ?? "—"}</span>
        <span className="block truncate text-xs text-muted-foreground">{player?.faction || "Sin ejército"}</span>
      </span>
    </span>
  );
}

function Roster({ view, entry }: { view: PlayView; entry: PlayEntry }) {
  const factions = useFactions();
  const [open, setOpen] = useState<string | null>(null);
  const showLists = listsVisible(view.tournament) || view.isOrganizer;
  const lists = new Map(view.lists.map((l) => [l.entryPlayerId, l]));
  return (
    <section className="space-y-2 rounded-2xl border border-border/60 bg-card/30 p-3">
      <h2 className="px-1 font-semibold">{entry.name}</h2>
      {view.playersOf(entry.id).map((p) => {
        const list = lists.get(p.id);
        return (
          <div key={p.id}>
            <button
              type="button"
              disabled={!list || !showLists}
              onClick={() => setOpen(open === p.id ? null : p.id)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-accent disabled:hover:bg-transparent"
            >
              <FactionAvatar factions={factions} faction={list?.faction || p.faction} className="h-9 w-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {list?.faction || p.faction || "Sin ejército"}
                  {list?.detachment ? ` · ${list.detachment}` : ""}
                </span>
              </span>
              {list && showLists && <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open === p.id && "rotate-180")} />}
            </button>
            {open === p.id && list && <ListView text={list.listText} author={p.displayName} />}
          </div>
        );
      })}
    </section>
  );
}

/** Stored per player id, so a roster change doesn't scramble the scores. */
interface StoredMatrix {
  scores: Record<string, Record<string, Score>>;
}

function buildMatrix(view: PlayView, mine: PlayEntry, theirs: PlayEntry, stored: StoredMatrix | null): Matrix {
  const ours = view.playersOf(mine.id);
  const rivals = view.playersOf(theirs.id);
  const size = Math.max(ours.length, rivals.length, 3);
  const m = newMatrix(Math.min(8, size) as 3, `match-${mine.id}`);
  m.ourTeam = mine.name;
  m.rivalTeam = theirs.name;
  const pad = <T,>(list: T[], make: (i: number) => T) => Array.from({ length: m.ours.length }, (_, i) => list[i] ?? make(i));
  m.ours = pad(
    ours.map((p) => ({ name: p.displayName, faction: p.faction })),
    (i) => ({ name: `Hueco ${i + 1}`, faction: "" }),
  );
  m.theirs = pad(
    rivals.map((p) => ({ name: p.displayName, faction: p.faction })),
    (i) => ({ name: `Hueco ${i + 1}`, faction: "" }),
  );
  m.scores = m.ours.map((_, i) => m.theirs.map((_, j) => stored?.scores[ours[i]?.id ?? ""]?.[rivals[j]?.id ?? ""] ?? null));
  return m;
}

function toStored(view: PlayView, mine: PlayEntry, theirs: PlayEntry, m: Matrix): StoredMatrix {
  const ours = view.playersOf(mine.id);
  const rivals = view.playersOf(theirs.id);
  const scores: StoredMatrix["scores"] = {};
  ours.forEach((p, i) => {
    scores[p.id] = {};
    rivals.forEach((q, j) => {
      const s = m.scores[i]?.[j];
      if (s) scores[p.id]![q.id] = s;
    });
  });
  return { scores };
}

/** This team's matrix for the match: only its players can see it. */
function SecretMatrix({ view, match, mine }: { view: PlayView; match: PlayMatch; mine: PlayEntry }) {
  const factions = useFactions();
  const theirs = view.entryById.get(mine.id === match.entryA ? match.entryB! : match.entryA)!;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"puntuar" | "resumen">("puntuar");
  const [current, setCurrent] = useState(0);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open || matrix) return;
    getMatchMatrix(match.id, mine.id).then((data) => setMatrix(buildMatrix(view, mine, theirs, (data as StoredMatrix | null) ?? null)));
  }, [open, matrix, match.id, mine, theirs, view]);

  const update = (next: Matrix) => {
    setMatrix(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveMatchMatrix(match.id, mine.id, toStored(view, mine, theirs, next)).catch(() => toast.error("No se pudo guardar la matriz."));
    }, 600);
  };

  return (
    <section className="space-y-4 rounded-3xl border border-primary/30 bg-brand-soft p-4 sm:p-6">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 text-left" aria-expanded={open}>
        <Grid3x3 className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1">
          <span className="block font-display text-lg font-bold">Matriz de {mine.name}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Secreta: solo la ve tu equipo, ni el rival ni la organización.
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open &&
        (!matrix ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-card/40 p-1">
              {(["puntuar", "resumen"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={cn("rounded-lg py-2 text-sm font-medium", step === s ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {s === "puntuar" ? "Puntuar cruces" : "Recomendaciones"}
                </button>
              ))}
            </div>
            {step === "puntuar" ? (
              <ScoreStep matrix={matrix} factions={factions} current={current} setCurrent={setCurrent} onChange={update} onDone={() => setStep("resumen")} />
            ) : (
              <SummaryStep matrix={matrix} factions={factions} onEdit={() => setStep("puntuar")} shareable={false} />
            )}
          </>
        ))}
    </section>
  );
}

/** Captains (or the organiser) set who plays whom, table by table. */
function PairingForm({ view, match, mine, onDone }: { view: PlayView; match: PlayMatch; mine: PlayEntry | null; onDone: () => void }) {
  const t = view.tournament;
  const a = view.playersOf(match.entryA);
  const b = view.playersOf(match.entryB!);
  const existing = view.games.filter((g) => g.matchId === match.id);
  const n = Math.min(a.length, b.length);
  const firstTable = (match.tableNo - 1) * t.teamSize + 1;
  const [rows, setRows] = useState(() =>
    Array.from({ length: n }, (_, i) => ({
      a: existing[i]?.playerA ?? a[i]?.id ?? "",
      b: existing[i]?.playerB ?? b[i]?.id ?? "",
      table: existing[i]?.tableNo ?? firstTable + i,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [ideal, setIdeal] = useState<string[] | null>(null);

  // Our matrix's ideal line-up, to fill the form in one tap.
  useEffect(() => {
    if (!mine) return;
    const theirs = mine.id === match.entryA ? match.entryB! : match.entryA;
    getMatchMatrix(match.id, mine.id).then((data) => {
      if (!data) return;
      const m = buildMatrix(view, mine, view.entryById.get(theirs)!, data as StoredMatrix);
      const pairs = analyzeMatrix(m).best.pairs;
      const ours = view.playersOf(mine.id);
      const rivals = view.playersOf(theirs);
      setIdeal(ours.map((p, i) => `${p.id}|${rivals[pairs[i] ?? -1]?.id ?? ""}`));
    });
  }, [mine, match, view]);

  const dupA = new Set(rows.map((r) => r.a)).size < rows.length;
  const dupB = new Set(rows.map((r) => r.b)).size < rows.length;

  function applyIdeal() {
    if (!ideal || !mine) return;
    const mineIsA = mine.id === match.entryA;
    setRows(
      ideal.map((pair, i) => {
        const [ours, theirs] = pair.split("|");
        return { a: mineIsA ? ours! : theirs!, b: mineIsA ? theirs! : ours!, table: firstTable + i };
      }),
    );
  }

  async function save() {
    setBusy(true);
    try {
      await setMatchGames(match.id, rows);
      toast.success("Cruces fijados: ya podéis empezar las partidas.");
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      {t.teamPairing === "wtc" && (
        <details className="rounded-xl bg-background/40 p-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <Shield className="h-4 w-4 text-primary" /> Cómo se hacen los cruces (WTC)
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Cada equipo elige en secreto un defensor y se revelan a la vez.</li>
            <li>Cada equipo ofrece en secreto dos atacantes al defensor rival.</li>
            <li>Cada defensor elige contra cuál de los dos juega; el rechazado vuelve a la reserva.</li>
            <li>Se repite con los que quedan hasta completar las mesas. Después, apuntad aquí el resultado.</li>
          </ol>
        </details>
      )}
      {ideal && (
        <Button variant="outline" size="sm" onClick={applyIdeal}>
          Rellenar con el ideal de nuestra matriz
        </Button>
      )}
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="grid grid-cols-[3rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <input
              type="number"
              min={1}
              value={row.table}
              onChange={(e) => setRows(rows.map((r, k) => (k === i ? { ...r, table: Number(e.target.value) || 1 } : r)))}
              aria-label={`Mesa del cruce ${i + 1}`}
              className="h-10 rounded-lg border border-input bg-background/60 text-center text-sm tabular-nums"
            />
            <select value={row.a} onChange={(e) => setRows(rows.map((r, k) => (k === i ? { ...r, a: e.target.value } : r)))} className="h-10 min-w-0 rounded-lg border border-input bg-background/60 px-2 text-sm">
              {a.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} · {p.faction || "?"}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">vs</span>
            <select value={row.b} onChange={(e) => setRows(rows.map((r, k) => (k === i ? { ...r, b: e.target.value } : r)))} className="h-10 min-w-0 rounded-lg border border-input bg-background/60 px-2 text-sm">
              {b.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} · {p.faction || "?"}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      {(dupA || dupB) && <p className="text-sm text-amber-200">Cada jugador solo puede jugar una partida.</p>}
      {n < t.teamSize && <p className="text-xs text-muted-foreground">Algún equipo no tiene la plantilla completa: solo se crean {n} partidas.</p>}
      <Button variant="gradient" size="lg" className="w-full gap-2" disabled={busy || dupA || dupB || n === 0} onClick={save}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Fijar cruces
      </Button>
    </div>
  );
}
