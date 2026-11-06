import { useFactions } from "@/components/matrix/factions";
import { FactionAvatar } from "@/components/matrix/MatrixParts";
import { SCORE_SOLID } from "@/components/matrix/scoreStyle";
import { Button } from "@/components/ui/button";
import { getMatchMatrix, getPairingPicks, resetPairing, setMatchGames, submitPairingPick } from "@/db";
import type { Score } from "@/lib/matrix";
import type { PlayEntry, PlayMatch, Side } from "@/lib/play/types";
import { suggest, wtcState, type PairingPick, type PickKind } from "@/lib/play/wtc";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { Check, EyeOff, Loader2, RotateCcw, Shield, Sparkles, Swords } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { PlayView } from "./usePlayData";

const PHASE_LABEL: Record<PickKind, string> = { defender: "Defensores", attackers: "Atacantes", choice: "Elección de los defensores" };
const PHASE_HELP: Record<PickKind, string> = {
  defender: "Elige en secreto a tu defensor.",
  attackers: "Elige en secreto dos atacantes para el defensor rival.",
  choice: "Tu defensor elige contra cuál de los dos atacantes rivales juega. El otro vuelve a la reserva.",
};

/**
 * The WTC pairing of a team match, step by step and in secret: each captain
 * picks; nothing is shown to the other team until both have picked. Our
 * matrix suggests every pick. When it's done the games are created.
 */
export function WtcPairing({ view, match, mine, onDone }: { view: PlayView; match: PlayMatch; mine: PlayEntry | null; onDone: () => void }) {
  const t = view.tournament;
  const user = useAuthStore((s) => s.user);
  const factions = useFactions();
  const [picks, setPicks] = useState<PairingPick[] | null>(null);
  const [scores, setScores] = useState<Record<string, Record<string, Score>>>({});
  const [selection, setSelection] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const creating = useRef(false);

  const side: Side | null = mine?.id === match.entryA ? "a" : mine?.id === match.entryB ? "b" : null;
  const other: Side = side === "b" ? "a" : "b";
  const captain = !!user && !!mine && mine.captainId === user.id;
  const organizer = view.isOrganizer;
  const name = (id: string) => view.playerById.get(id)?.displayName ?? "?";
  const rosterA = view.playersOf(match.entryA).map((p) => p.id);
  const rosterB = view.playersOf(match.entryB!).map((p) => p.id);

  const load = useCallback(() => getPairingPicks(match.id).then(setPicks), [match.id]);
  useEffect(() => {
    load();
    if (mine) getMatchMatrix(match.id, mine.id).then((d) => setScores((d as { scores?: Record<string, Record<string, Score>> } | null)?.scores ?? {}));
  }, [load, match.id, mine]);

  const state = useMemo(() => (picks ? wtcState(rosterA, rosterB, match.entryA, match.entryB!, picks) : null), [picks, rosterA.join(), rosterB.join(), match]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live-ish: the other team's picks show up within seconds.
  useEffect(() => {
    if (!state || state.phase === "done") return;
    const id = setInterval(() => document.visibilityState === "visible" && load(), 3000);
    return () => clearInterval(id);
  }, [state, load]);

  useEffect(() => setSelection([]), [state?.step, state?.phase]);

  // Done: team A's captain (or the organiser) creates the games once.
  useEffect(() => {
    if (!state || state.phase !== "done" || creating.current) return;
    const mayCreate = organizer || (!!user && [match.entryA, match.entryB].some((e) => e && view.entryById.get(e)?.captainId === user.id));
    if (!mayCreate) return;
    creating.current = true;
    const first = (match.tableNo - 1) * t.teamSize + 1;
    setMatchGames(
      match.id,
      state.games.map((g, i) => ({ ...g, table: first + i })),
    )
      .then(() => {
        toast.success("Cruces completos: ya están las partidas.");
        onDone();
      })
      .catch(() => {
        creating.current = false;
        onDone();
      });
  }, [state, organizer, user, view, match, t.teamSize, onDone]);

  if (!state) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const score = (m: string, o: string) => scores[m]?.[o] ?? 3;
  const hint = side && state.phase !== "done" ? suggest(state, side, score, name) : null;
  const myTurn = captain && side && state.phase !== "done" && state.waiting[side];
  const options =
    !side || state.phase === "done"
      ? []
      : state.phase === "defender"
        ? state.pool[side]
        : state.phase === "attackers"
          ? state.pool[side].filter((p) => p !== state.defenders[side])
          : (state.attackers[other] ?? []);
  const need = state.phase === "attackers" ? 2 : 1;
  const optionScore = (id: string): number | null => {
    if (!side) return null;
    if (state.phase === "attackers") return state.defenders[other] ? score(id, state.defenders[other]!) : null;
    if (state.phase === "choice") return state.defenders[side] ? score(state.defenders[side]!, id) : null;
    const row = state.pool[other].map((o) => score(id, o)).sort((x, y) => x - y);
    return row[Math.min(1, row.length - 1)] ?? null;
  };

  async function submit() {
    if (!state || state.phase === "done") return;
    setBusy(true);
    try {
      await submitPairingPick(match.id, state.step, state.phase, selection);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
      load();
    } finally {
      setBusy(false);
    }
  }

  const teamName = (s: Side) => view.entryById.get(s === "a" ? match.entryA : match.entryB!)?.name ?? "";

  return (
    <div className="space-y-4 rounded-3xl border border-primary/30 bg-card/40 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Emparejamiento WTC</p>
          <h3 className="font-display text-xl font-bold">
            {state.phase === "done" ? "Cruces completos" : `Paso ${state.step + 1} · ${PHASE_LABEL[state.phase]}`}
            {state.final && state.phase !== "done" && <span className="ml-2 text-xs font-normal text-muted-foreground">(último paso)</span>}
          </h3>
          {state.phase !== "done" && <p className="text-sm text-muted-foreground">{PHASE_HELP[state.phase]}</p>}
        </div>
        {organizer && (picks?.length ?? 0) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => window.confirm("¿Reiniciar el emparejamiento de este enfrentamiento?") && resetPairing(match.id).then(load)}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </Button>
        )}
      </div>

      {state.phase !== "done" && (
        <div className="grid grid-cols-2 gap-2">
          {(["a", "b"] as Side[]).map((s) => (
            <div key={s} className={cn("rounded-xl border p-2.5 text-sm", state.waiting[s] ? "border-border/60" : "border-emerald-500/40 bg-emerald-500/10")}>
              <p className="truncate font-medium">{teamName(s)}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {state.waiting[s] ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Eligiendo…
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 text-emerald-300" /> Ha elegido
                    {s !== side && <EyeOff className="ml-1 h-3 w-3" />}
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {(state.defenders.a || state.attackers.a) && (
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {(["a", "b"] as Side[]).map((s) => (
            <div key={s} className="rounded-xl bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">{teamName(s)}</p>
              {state.defenders[s] && (
                <p className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-sky-300" /> Defiende <strong>{name(state.defenders[s]!)}</strong>
                </p>
              )}
              {state.attackers[s] && (
                <p className="flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5 text-primary" /> Ataca con <strong>{state.attackers[s]!.map(name).join(" y ")}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {myTurn && (
        <div className="space-y-3">
          {hint && (
            <button
              type="button"
              onClick={() => setSelection(hint.players)}
              className="flex w-full items-start gap-2 rounded-xl border border-primary/30 bg-brand-soft p-3 text-left text-sm"
            >
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong>Tu matriz sugiere:</strong> {hint.why} <span className="text-primary underline">Usar</span>
              </span>
            </button>
          )}
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((id) => {
              const p = view.playerById.get(id);
              const on = selection.includes(id);
              const s = optionScore(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelection(on ? selection.filter((x) => x !== id) : need === 1 ? [id] : [...selection, id].slice(-need))}
                    aria-pressed={on}
                    className={cn("flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors", on ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40")}
                  >
                    <FactionAvatar factions={factions} faction={p?.faction ?? ""} className="h-10 w-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p?.displayName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p?.faction}</span>
                    </span>
                    {s !== null && Object.keys(scores).length > 0 && (
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display font-black", SCORE_SOLID[s as Score])} title="Según tu matriz">
                        {s}
                      </span>
                    )}
                    {on && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <Button variant="gradient" size="lg" className="w-full gap-2" disabled={busy || selection.length !== need} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />} Confirmar en secreto
          </Button>
        </div>
      )}
      {captain && side && state.phase !== "done" && !state.waiting[side] && (
        <p className="text-center text-sm text-muted-foreground">Elección guardada. Se revelará cuando {teamName(other)} elija.</p>
      )}
      {!captain && state.phase !== "done" && side && <p className="text-center text-sm text-muted-foreground">Tu capitán está eligiendo.</p>}

      {state.games.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Cruces fijados</p>
          <ul className="space-y-1">
            {state.games.map((g) => (
              <li key={`${g.a}-${g.b}`} className="flex items-center justify-between gap-2 rounded-lg bg-background/40 px-3 py-2 text-sm">
                <span className="truncate">{name(g.a)}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="truncate text-right">{name(g.b)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {state.phase === "done" && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Creando las partidas…
        </p>
      )}
    </div>
  );
}
