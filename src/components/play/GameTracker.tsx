import { useDetachments, useFactions } from "@/components/matrix/factions";
import { FactionAvatar } from "@/components/matrix/MatrixParts";
import { ListView } from "@/components/play/PlayBits";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { GAME_STATUS_LABEL } from "@/lib/play/labels";
import {
  CAPS,
  DEPLOYMENTS,
  DISPOSITION_HELP,
  DISPOSITION_LABEL,
  DISPOSITIONS,
  dispositionsFromList,
  LAYOUTS,
  primaryMission,
  SECONDARIES,
  TWISTS,
  type Disposition,
} from "@/lib/play/missions";
import { parseArmyListExport } from "@/lib/armyListParser";
import { END_OF_BATTLE, gameScore, normalizeRounds, normalizeSetup, toGamePoints } from "@/lib/play/score";
import type { BattleRound, GameSetup, GameStatus, Side, SideRound, SideSetup } from "@/lib/play/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Cloud, Dices, Loader2, Minus, Plus, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Local {
  setup: GameSetup;
  rounds: BattleRound[];
}
interface Dirty {
  a: boolean;
  b: boolean;
  shared: boolean;
}
const SHARED: (keyof GameSetup)[] = ["deployment", "layout", "twist", "attacker", "firstTurn"];
const clean = (): Dirty => ({ a: false, b: false, shared: false });

/** The server copy, with the parts this device changed laid on top. */
function merge(server: Local, mine: Local, dirty: Dirty): Local {
  const setup: GameSetup = { ...server.setup };
  if (dirty.a) setup.a = mine.setup.a;
  if (dirty.b) setup.b = mine.setup.b;
  if (dirty.shared) for (const k of SHARED) (setup as unknown as Record<string, unknown>)[k] = mine.setup[k];
  const rounds = server.rounds.map((r, i) => ({ a: dirty.a ? mine.rounds[i]!.a : r.a, b: dirty.b ? mine.rounds[i]!.b : r.b }));
  return { setup, rounds };
}

const fromGame = (g: { setup: Partial<GameSetup>; rounds: BattleRound[] }): Local => ({ setup: normalizeSetup(g.setup), rounds: normalizeRounds(g.rounds) });

type Tab = "preparacion" | "rondas" | "resultado";

export interface TrackerSide {
  name: string;
  faction: string;
  /** Their army list (official app export), if they submitted one. */
  listText?: string;
  listDetachment?: string;
}

export interface TrackerGame {
  id: string;
  status: GameStatus;
  setup: Partial<GameSetup>;
  rounds: BattleRound[];
  confirmedA: boolean;
  confirmedB: boolean;
  /** Shown under the score: "M3", "Partida amistosa"… */
  label: string;
}

export interface GameTrackerProps {
  game: TrackerGame;
  sides: Record<Side, TrackerSide>;
  /** Who can edit each side (already false once the game is final for them). */
  can: Record<Side, boolean>;
  /** The organiser: confirms for both players. */
  confirmsForBoth?: boolean;
  /** Team events: show the 20-0 game points. */
  gamePoints?: boolean;
  back: { to: string; label: string };
  seo: { title: string; path: string };
  /** Deployment and layout fixed by the organiser for the round. */
  defaults?: { deployment: string; layout: string };
  /** After "Resultado confirmado…". */
  confirmedNote: string;
  load: () => Promise<{ setup: Partial<GameSetup>; rounds: BattleRound[]; status: GameStatus } | null>;
  save: (patch: { setup: GameSetup; rounds: BattleRound[]; vpA: number; vpB: number; status?: GameStatus }) => Promise<void>;
  /** Marks the game as finished (before confirming). */
  submit: () => Promise<void>;
  confirm: () => Promise<GameStatus>;
  onChanged: () => void;
}

/**
 * A game of Warhammer 40,000 (11th edition) scored turn by turn like the
 * official app: setup (detachments, Force Dispositions and the primaries they
 * give, deployment, layout, twist), primary and secondary VP each battle
 * round with the matched play caps, and both players confirming the result.
 * Used by tournament games and friendly games.
 */
export function GameTracker({ game, sides, can, confirmsForBoth = false, gamePoints = false, back, seo, defaults, confirmedNote, load, save, submit, confirm, onChanged }: GameTrackerProps) {
  const canA = can.a;
  const canB = can.b;
  const organizer = confirmsForBoth;
  const [local, setLocal] = useState<Local>(() => fromGame(game));
  const [tab, setTab] = useState<Tab>(game.status === "setup" ? "preparacion" : game.status === "playing" ? "rondas" : "resultado");
  const [br, setBr] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const latest = useRef(local);
  const dirty = useRef<Dirty>(clean());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Changes from the other phone (Realtime) merge with what's being typed here.
  useEffect(() => {
    setLocal((cur) => {
      const next = merge(fromGame(game), cur, dirty.current);
      latest.current = next;
      return next;
    });
  }, [game]);

  // Default the deployment and layout to the round's, when the organiser fixed them.
  useEffect(() => {
    if (!defaults || game.status !== "setup" || (!defaults.deployment && !defaults.layout)) return;
    if (local.setup.deployment || local.setup.layout) return;
    change((l) => ({ ...l, setup: { ...l.setup, deployment: defaults.deployment, layout: defaults.layout } }), "shared");
    // Once, when the game opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  async function flush() {
    clearTimeout(timer.current);
    const parts = dirty.current;
    if (!parts.a && !parts.b && !parts.shared) return;
    dirty.current = clean();
    try {
      const server = await load();
      if (!server) throw new Error("La partida ya no existe.");
      const merged = merge(fromGame(server), latest.current, parts);
      const s = gameScore(merged);
      const scored = s.a.primary + s.a.secondary + s.b.primary + s.b.secondary > 0;
      await save({
        setup: merged.setup,
        rounds: merged.rounds,
        vpA: s.a.total,
        vpB: s.b.total,
        ...(server.status === "setup" && scored ? { status: "playing" as const } : {}),
      });
      setSaveState("saved");
    } catch (err) {
      dirty.current = { a: dirty.current.a || parts.a, b: dirty.current.b || parts.b, shared: dirty.current.shared || parts.shared };
      setSaveState("error");
      toast.error((err as Error).message);
    }
  }

  // Save at once when leaving the page or when the phone puts the app in the
  // background (closing the tab doesn't wait for the debounce).
  useEffect(() => {
    const now = () => void flush();
    const onHide = () => document.visibilityState === "hidden" && now();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", now);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", now);
      now();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function change(fn: (l: Local) => Local, part: keyof Dirty) {
    const next = fn(latest.current);
    latest.current = next;
    setLocal(next);
    dirty.current[part] = true;
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }

  const setSide = (side: Side, patch: Partial<SideSetup>) => change((l) => ({ ...l, setup: { ...l.setup, [side]: { ...l.setup[side], ...patch } } }), side);
  const setShared = (patch: Partial<GameSetup>) => change((l) => ({ ...l, setup: { ...l.setup, ...patch } }), "shared");
  const setRound = (side: Side, i: number, patch: Partial<SideRound>) =>
    change((l) => ({ ...l, rounds: l.rounds.map((r, k) => (k === i ? { ...r, [side]: { ...r[side], ...patch } } : r)) }), side);

  const score = useMemo(() => gameScore(local), [local]);
  const [gpA, gpB] = toGamePoints(score.a.total, score.b.total);
  const primaries: Record<Side, string | null> = {
    a: primaryMission(local.setup.a.disposition, local.setup.b.disposition),
    b: primaryMission(local.setup.b.disposition, local.setup.a.disposition),
  };

  async function finish() {
    await flush();
    try {
      if (game.status === "setup" || game.status === "playing") await submit();
      const status = await confirm();
      toast.success(status === "confirmed" ? "Resultado confirmado." : "Enviado: falta que el rival lo confirme.");
      onChanged();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const iConfirmed = (canA && game.confirmedA) || (canB && game.confirmedB);

  return (
    <PageTransition>
      <Seo title={seo.title} path={seo.path} noindex />
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link to={back.to} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
          </Link>
          {(canA || canB) && (
            <span className={cn("flex items-center gap-1.5 text-xs", saveState === "error" ? "text-destructive" : "text-muted-foreground")} role="status">
              {saveState === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saveState === "error" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
              {saveState === "saving" ? "Guardando…" : saveState === "error" ? "Sin guardar" : "Guardado"}
            </span>
          )}
        </div>

        {/* Scoreboard */}
        <header className="sticky top-16 z-30 -mx-4 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <SideTitle side={sides.a} align="right" mine={canA && !organizer} />
            <div className="text-center">
              <p className="font-display text-3xl font-black tabular-nums sm:text-4xl">
                {score.a.total}
                <span className="mx-1 text-muted-foreground">–</span>
                {score.b.total}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {game.label} · {GAME_STATUS_LABEL[game.status]}
                {gamePoints ? ` · ${gpA}-${gpB}` : ""}
              </p>
            </div>
            <SideTitle side={sides.b} mine={canB && !organizer} />
          </div>
        </header>

        <nav className="grid grid-cols-3 gap-1 rounded-xl border border-border/60 bg-card/40 p-1" aria-label="Partida">
          {(
            [
              ["preparacion", "Preparación"],
              ["rondas", "Rondas"],
              ["resultado", "Resultado"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn("rounded-lg py-2 text-sm font-medium transition-colors", tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "preparacion" && (
          <div className="space-y-4">
            {(["a", "b"] as Side[]).map((side) => (
              <SideSetupCard
                key={side}
                side={side}
                info={sides[side]}
                setup={local.setup[side]}
                primary={primaries[side]}
                editable={can[side]}
                onChange={(patch) => setSide(side, patch)}
              />
            ))}
            <SharedSetup setup={local.setup} sides={sides} editable={canA || canB} onChange={setShared} />
            <Button variant="gradient" size="lg" className="w-full" onClick={() => setTab("rondas")}>
              Empezar a puntuar
            </Button>
          </div>
        )}

        {tab === "rondas" && (
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-1 rounded-xl border border-border/60 bg-card/40 p-1">
              {Array.from({ length: CAPS.battleRounds + 1 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBr(i)}
                  className={cn("rounded-lg py-2 text-xs font-semibold sm:text-sm", br === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {i === END_OF_BATTLE ? "Final" : `R${i + 1}`}
                  <span className="block font-mono text-[10px] font-normal opacity-70">
                    {score.a.perRound[i]!.primary + score.a.perRound[i]!.secondary}·{score.b.perRound[i]!.primary + score.b.perRound[i]!.secondary}
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(["a", "b"] as Side[]).map((side) => (
                <RoundPanel
                  key={side}
                  index={br}
                  name={sides[side].name}
                  setup={local.setup[side]}
                  primary={primaries[side]}
                  value={local.rounds[br]![side]}
                  counted={score[side].perRound[br]!}
                  editable={can[side]}
                  onChange={(patch) => setRound(side, br, patch)}
                />
              ))}
            </div>
            {br < END_OF_BATTLE && (
              <Button variant="outline" size="lg" className="w-full" onClick={() => setBr(br + 1)}>
                {br + 1 < CAPS.battleRounds ? `Siguiente: ronda ${br + 2}` : "Puntos al final de la batalla"}
              </Button>
            )}
            {br === END_OF_BATTLE && (
              <Button variant="gradient" size="lg" className="w-full" onClick={() => setTab("resultado")}>
                Ver resultado
              </Button>
            )}
          </div>
        )}

        {tab === "resultado" && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-card/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left font-normal" />
                    <th className="p-3 text-center font-normal">{sides.a.name}</th>
                    <th className="p-3 text-center font-normal">{sides.b.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(
                    [
                      ["Misión principal", score.a.primary, score.b.primary, `máx. ${CAPS.primaryTotal}`],
                      ["Secundarias", score.a.secondary, score.b.secondary, `máx. ${CAPS.secondaryTotal}`],
                      ["Ejército pintado", score.a.battleReady, score.b.battleReady, `${CAPS.battleReady}`],
                    ] as [string, number, number, string][]
                  ).map(([label, x, y, cap]) => (
                    <tr key={label}>
                      <td className="p-3">
                        {label} <span className="text-xs text-muted-foreground">({cap})</span>
                      </td>
                      <td className="p-3 text-center tabular-nums">{x}</td>
                      <td className="p-3 text-center tabular-nums">{y}</td>
                    </tr>
                  ))}
                  <tr className="bg-card/40 font-display text-lg font-black">
                    <td className="p-3">Total</td>
                    <td className={cn("p-3 text-center tabular-nums", score.a.total > score.b.total && "text-emerald-300")}>{score.a.total}</td>
                    <td className={cn("p-3 text-center tabular-nums", score.b.total > score.a.total && "text-emerald-300")}>{score.b.total}</td>
                  </tr>
                  {gamePoints && (
                    <tr>
                      <td className="p-3">Puntos de partida (20-0)</td>
                      <td className="p-3 text-center font-semibold tabular-nums">{gpA}</td>
                      <td className="p-3 text-center font-semibold tabular-nums">{gpB}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="flex items-center justify-center gap-2 text-center font-display text-xl font-bold">
              <Trophy className="h-5 w-5 text-primary" />
              {score.a.total === score.b.total ? "Empate" : `Gana ${(score.a.total > score.b.total ? sides.a : sides.b).name}`}
            </p>

            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {(["a", "b"] as Side[]).map((side) => {
                const ok = side === "a" ? game.confirmedA : game.confirmedB;
                return (
                  <span key={side} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1", ok ? "bg-emerald-500/15 text-emerald-300" : "bg-background/60 text-muted-foreground")}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {sides[side].name} {ok ? "ha confirmado" : "sin confirmar"}
                  </span>
                );
              })}
            </div>

            {game.status === "confirmed" ? (
              <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm">Resultado confirmado por los dos jugadores. {confirmedNote}</p>
            ) : (canA || canB) && !iConfirmed ? (
              <Button variant="gradient" size="lg" className="w-full" onClick={finish}>
                {organizer && !(canA && !canB) ? "Confirmar resultado (organización)" : game.status === "submitted" ? "Confirmar resultado" : "Terminar partida y confirmar"}
              </Button>
            ) : iConfirmed ? (
              <p className="text-center text-sm text-muted-foreground">Has confirmado. Falta que lo confirme tu rival.</p>
            ) : null}
            <p className="text-center text-xs text-muted-foreground">Si alguien cambia la puntuación después de confirmar, hay que volver a confirmarla.</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function SideTitle({ side, align, mine }: { side: TrackerSide; align?: "right"; mine?: boolean }) {
  const factions = useFactions();
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <FactionAvatar factions={factions} faction={side.faction} className="h-10 w-10" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {side.name}
          {mine && <span className="ml-1 text-[10px] text-primary">(tú)</span>}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{side.faction || "Sin ejército"}</p>
      </div>
    </div>
  );
}

function Chips<T extends string>({ value, options, onChange, disabled }: { value: T | null; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
            value === o.value ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SideSetupCard({
  side,
  info,
  setup,
  primary,
  editable,
  onChange,
}: {
  side: Side;
  info: TrackerSide;
  setup: SideSetup;
  primary: string | null;
  editable: boolean;
  onChange: (patch: Partial<SideSetup>) => void;
}) {
  const detachments = useDetachments(info.faction);
  const [showList, setShowList] = useState(false);
  const options = [...new Set([...(info.listDetachment ? [info.listDetachment] : []), ...(setup.detachment ? [setup.detachment] : []), ...detachments])];
  // The dispositions the list allows (the app export lists them).
  const allowed = useMemo(() => (info.listText ? dispositionsFromList(parseArmyListExport(info.listText)?.notes) : []), [info.listText]);

  // The detachment from the submitted list, the first time.
  useEffect(() => {
    if (editable && !setup.detachment && info.listDetachment) onChange({ detachment: info.listDetachment });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.listDetachment]);

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">
          <span className="mr-1.5 font-mono text-xs text-muted-foreground">{side.toUpperCase()}</span>
          {info.name}
        </h2>
        {!editable && <span className="text-[11px] text-muted-foreground">Lo rellena este jugador</span>}
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Destacamento</span>
        <select
          value={setup.detachment}
          disabled={!editable}
          onChange={(e) => onChange({ detachment: e.target.value })}
          className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm disabled:opacity-70"
        >
          <option value="">Elige destacamento…</option>
          {options.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Force Disposition</span>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-5">
          {DISPOSITIONS.map((d) => (
            <button
              key={d}
              type="button"
              disabled={!editable}
              onClick={() => onChange({ disposition: d as Disposition })}
              aria-pressed={setup.disposition === d}
              className={cn(
                "rounded-xl border p-2 text-left transition-colors disabled:opacity-70 sm:text-center",
                setup.disposition === d ? "border-primary bg-primary/15" : allowed.includes(d) ? "border-emerald-500/40 hover:border-primary/40" : "border-border/60 hover:border-primary/40",
                allowed.length > 0 && !allowed.includes(d) && setup.disposition !== d && "opacity-50",
              )}
            >
              <span className="block text-xs font-semibold">{DISPOSITION_LABEL[d]}</span>
              <span className="block text-[10px] text-muted-foreground">{allowed.includes(d) ? "En tu lista" : DISPOSITION_HELP[d]}</span>
            </button>
          ))}
        </div>
      </div>
      <p className={cn("rounded-xl p-3 text-sm", primary ? "bg-primary/10" : "bg-background/40 text-muted-foreground")}>
        Misión principal: <strong className="text-foreground">{primary ?? "se decide al revelar las dos Force Dispositions"}</strong>
      </p>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Secundarias</span>
        <Chips
          value={setup.secondaryMode}
          disabled={!editable}
          onChange={(secondaryMode) => onChange({ secondaryMode, fixed: secondaryMode === "fixed" ? setup.fixed : [] })}
          options={[
            { value: "tactical", label: "Tácticas (se roban cada turno)" },
            { value: "fixed", label: "Fijas" },
          ]}
        />
        {setup.secondaryMode === "fixed" && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Elige dos (máx. {CAPS.fixedCard} PV cada una):</p>
            <Chips
              value={null}
              disabled={!editable}
              onChange={(card) =>
                onChange({ fixed: setup.fixed.includes(card) ? setup.fixed.filter((c) => c !== card) : [...setup.fixed, card].slice(-2) })
              }
              options={SECONDARIES.filter((s) => s.fixed).map((s) => ({
                value: s.name,
                label: (
                  <span className="flex items-center gap-1">
                    {setup.fixed.includes(s.name) && <Check className="h-3 w-3" />}
                    {s.name}
                  </span>
                ),
              }))}
            />
          </div>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" disabled={!editable} checked={setup.battleReady} onChange={(e) => onChange({ battleReady: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
        Ejército pintado (Battle Ready, +{CAPS.battleReady} PV)
      </label>
      {info.listText && (
        <div>
          <button type="button" onClick={() => setShowList(!showList)} className="flex items-center gap-1 text-xs font-medium text-primary">
            Ver lista <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showList && "rotate-180")} />
          </button>
          {showList && (
            <div className="mt-2">
              <ListView text={info.listText} author={info.name} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function SharedSetup({
  setup,
  sides,
  editable,
  onChange,
}: {
  setup: GameSetup;
  sides: Record<Side, TrackerSide>;
  editable: boolean;
  onChange: (patch: Partial<GameSetup>) => void;
}) {
  const sideOptions = (["a", "b"] as Side[]).map((s) => ({ value: s, label: sides[s].name }));
  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <h2 className="font-display text-lg font-bold">Campo de batalla</h2>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Despliegue</span>
        <div className="flex gap-2">
          <select
            value={setup.deployment}
            disabled={!editable}
            onChange={(e) => onChange({ deployment: e.target.value })}
            className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background/60 px-3 text-sm disabled:opacity-70"
          >
            <option value="">Sin elegir</option>
            {DEPLOYMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11"
            disabled={!editable}
            onClick={() => onChange({ deployment: DEPLOYMENTS[Math.floor(Math.random() * DEPLOYMENTS.length)]! })}
            aria-label="Sacar un despliegue al azar"
            title="Sacar al azar"
          >
            <Dices className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Layout de escenografía</span>
        <Chips value={setup.layout || null} disabled={!editable} onChange={(layout) => onChange({ layout })} options={LAYOUTS.map((l) => ({ value: l, label: `Layout ${l}` }))} />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Giro (Twist, opcional)</span>
        <select value={setup.twist} disabled={!editable} onChange={(e) => onChange({ twist: e.target.value })} className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm disabled:opacity-70">
          <option value="">Sin giro</option>
          {TWISTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Atacante</span>
          <Chips value={setup.attacker} disabled={!editable} onChange={(attacker) => onChange({ attacker })} options={sideOptions} />
          <p className="text-[11px] text-muted-foreground">El defensor despliega primero.</p>
        </div>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Primer turno</span>
          <Chips value={setup.firstTurn} disabled={!editable} onChange={(firstTurn) => onChange({ firstTurn })} options={sideOptions} />
        </div>
      </div>
    </section>
  );
}

function VpStepper({ value, onChange, editable, label }: { value: number; onChange: (n: number) => void; editable: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size="icon" className="h-10 w-10" disabled={!editable || value <= 0} onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Restar 1 a ${label}`}>
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        disabled={!editable}
        onChange={(e) => onChange(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
        aria-label={label}
        className="h-10 w-14 rounded-xl border border-input bg-background/60 text-center font-display text-lg font-black tabular-nums disabled:opacity-80"
      />
      <Button type="button" variant="outline" size="icon" className="h-10 w-10" disabled={!editable} onClick={() => onChange(value + 1)} aria-label={`Sumar 1 a ${label}`}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RoundPanel({
  index,
  name,
  setup,
  primary,
  value,
  counted,
  editable,
  onChange,
}: {
  index: number;
  name: string;
  setup: SideSetup;
  primary: string | null;
  value: SideRound;
  counted: { primary: number; secondary: number };
  editable: boolean;
  onChange: (patch: Partial<SideRound>) => void;
}) {
  const end = index === END_OF_BATTLE;
  const [adding, setAdding] = useState("");
  const fixedRows = setup.secondaryMode === "fixed" ? setup.fixed : [];
  const rows = [
    ...fixedRows.map((card) => ({ card, vp: value.secondaries.find((s) => s.card === card)?.vp ?? 0, fixed: true })),
    ...value.secondaries.filter((s) => !fixedRows.includes(s.card)).map((s) => ({ ...s, fixed: false })),
  ];
  const setCard = (card: string, vp: number) => {
    const others = value.secondaries.filter((s) => s.card !== card);
    onChange({ secondaries: vp > 0 || !fixedRows.includes(card) ? [...others, { card, vp }] : others });
  };
  const rawSecondary = value.secondaries.reduce((a, s) => a + s.vp, 0);

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate font-display text-lg font-bold">{name}</h3>
        <span className="font-display text-2xl font-black tabular-nums">{counted.primary + counted.secondary}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="block text-sm font-medium">{end ? "Primaria al final de la batalla" : "Misión principal"}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {primary ?? (setup.disposition ? "Falta la Force Disposition del rival" : "Elige tu Force Disposition en Preparación")}
            </span>
          </span>
          <VpStepper value={value.primary} onChange={(primary) => onChange({ primary })} editable={editable} label={`PV de la misión principal de ${name}`} />
        </div>
        {!end && value.primary > CAPS.primaryPerRound && <p className="text-[11px] text-amber-300">Solo cuentan {CAPS.primaryPerRound} PV por ronda.</p>}
      </div>
      {!end && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Secundarias</span>
          {rows.length === 0 && <p className="text-xs text-muted-foreground">{setup.secondaryMode === "fixed" ? "Elige tus dos secundarias fijas en Preparación." : "Añade las cartas que puntúes esta ronda."}</p>}
          {rows.map((r) => (
            <div key={r.card} className="flex items-center justify-between gap-2 rounded-xl bg-background/40 p-2">
              <span className="min-w-0 truncate text-xs font-medium">
                {r.card}
                {r.fixed && <span className="ml-1 text-[10px] text-muted-foreground">fija</span>}
              </span>
              <div className="flex items-center gap-1">
                <VpStepper value={r.vp} onChange={(vp) => setCard(r.card, vp)} editable={editable} label={`PV de ${r.card}`} />
                {!r.fixed && editable && (
                  <button type="button" onClick={() => onChange({ secondaries: value.secondaries.filter((s) => s.card !== r.card) })} className="rounded-lg p-2 text-muted-foreground hover:text-destructive" aria-label={`Quitar ${r.card}`}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {editable && (
            <select
              value={adding}
              onChange={(e) => {
                if (e.target.value) setCard(e.target.value, 0);
                setAdding("");
              }}
              className="h-10 w-full rounded-xl border border-dashed border-border bg-background/40 px-3 text-sm"
              aria-label="Añadir secundaria"
            >
              <option value="">+ Añadir secundaria…</option>
              {SECONDARIES.filter((s) => !rows.some((r) => r.card === s.name)).map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          {rawSecondary > counted.secondary && <p className="text-[11px] text-amber-300">Cuentan {counted.secondary}: máximo {CAPS.secondaryPerRound} PV de secundarias por ronda.</p>}
        </div>
      )}
    </section>
  );
}
