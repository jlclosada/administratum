import { Button } from "@/components/ui/button";
import {
  analyzeMatrix,
  emptyResults,
  OUTCOME_LABEL,
  playerLabel,
  resultStats,
  SCORE_LABEL,
  type GameResult,
  type Matrix,
  type Outcome,
} from "@/lib/matrix";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { Check, Lock, Sparkles, Trophy, X } from "lucide-react";
import { useMemo } from "react";
import type { FactionOption } from "./factions";
import { FactionAvatar } from "./MatrixParts";
import { SCORE_SOLID } from "./scoreStyle";

const OUTCOMES: Outcome[] = ["win", "draw", "loss"];
const OUTCOME_STYLE: Record<Outcome, { on: string; off: string }> = {
  win: { on: "bg-emerald-500 text-white border-transparent", off: "border-emerald-500/40 text-emerald-300" },
  draw: { on: "bg-amber-400 text-zinc-950 border-transparent", off: "border-amber-400/40 text-amber-200" },
  loss: { on: "bg-red-500 text-white border-transparent", off: "border-red-500/40 text-red-300" },
};
const TEAM_LABEL: Record<Outcome, string> = { win: "Victoria del equipo", draw: "Empate", loss: "Derrota del equipo" };
const TEAM_TONE: Record<Outcome, string> = {
  win: "from-emerald-500/25 border-emerald-500/30",
  draw: "from-amber-400/20 border-amber-400/30",
  loss: "from-red-500/25 border-red-500/30",
};

const toPoints = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(999, Math.max(0, n)) : null;
};

/**
 * After the round: who actually played whom, the result of each game and the
 * team score, compared with what the matrix predicted. Needs an account.
 */
export function ResultStep({
  matrix,
  factions,
  canSave,
  onChange,
}: {
  matrix: Matrix;
  factions: FactionOption[];
  canSave: boolean;
  onChange: (m: Matrix) => void;
}) {
  const openAuth = useAuthStore((s) => s.openAuth);
  const ideal = useMemo(() => analyzeMatrix(matrix).best.pairs, [matrix]);
  const n = matrix.ours.length;
  const results = matrix.results ?? emptyResults(n);
  const stats = resultStats(matrix);

  if (!canSave) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-3xl border border-border/60 bg-card/40 p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Lock className="h-6 w-6" />
        </span>
        <h2 className="font-display text-xl font-bold">Guarda el resultado de la partida</h2>
        <p className="text-sm text-muted-foreground">
          Con una cuenta gratuita apuntas quién jugó contra quién y cómo acabó cada mesa, ves si la matriz acertó y guardas todas tus matrices para los
          próximos torneos.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="gradient" size="lg" onClick={() => openAuth("signup")}>
            Crear cuenta gratis
          </Button>
          <Button variant="outline" size="lg" onClick={() => openAuth("login")}>
            Ya tengo cuenta
          </Button>
        </div>
      </div>
    );
  }

  const set = (next: GameResult[]) => onChange({ ...matrix, results: next });
  const patch = (i: number, p: Partial<GameResult>) => set(results.map((r, k) => (k === i ? { ...r, ...p } : r)));
  // Each rival plays one table: picking one already taken swaps the two.
  const pickRival = (i: number, j: number) =>
    set(
      results.map((r, k) => {
        if (k === i) return { ...r, rival: r.rival === j ? null : j };
        if (r.rival === j) return { ...r, rival: results[i]!.rival };
        return r;
      }),
    );

  return (
    <div className="space-y-6">
      {stats.played > 0 && stats.team ? (
        <section className={cn("rounded-3xl border bg-gradient-to-br to-transparent p-5 sm:p-7", TEAM_TONE[stats.team])}>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Resultado · {stats.played} de {n} mesas
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
                {stats.team === "win" && <Trophy className="h-7 w-7 text-emerald-300" />}
                {TEAM_LABEL[stats.team]}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.wins} {stats.wins === 1 ? "victoria" : "victorias"} · {stats.draws} {stats.draws === 1 ? "empate" : "empates"} · {stats.losses}{" "}
                {stats.losses === 1 ? "derrota" : "derrotas"}
              </p>
            </div>
            {stats.points && (
              <p className="font-display text-4xl font-black tabular-nums">
                {stats.points.ours}
                <span className="mx-1 text-muted-foreground">–</span>
                {stats.points.theirs}
              </p>
            )}
          </div>
          {stats.called > 0 && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-background/40 px-3 py-2 text-sm">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              La matriz acertó {stats.right} de {stats.called} {stats.called === 1 ? "cruce claro" : "cruces claros"} (los puntuados 1–2 o 4–5).
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-border/60 bg-card/40 p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold">¿Cómo fue la ronda?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige contra quién jugó cada uno y el resultado. Los puntos son opcionales (por ejemplo, de 0 a 20 como en el WTC).
          </p>
        </section>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => set(results.map((r, i) => ({ ...r, rival: ideal[i] ?? null })))}>
          Rellenar con el emparejamiento ideal
        </Button>
      </div>

      <ol className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {matrix.ours.map((p, i) => {
          const r = results[i]!;
          const predicted = r.rival === null ? null : (matrix.scores[i]?.[r.rival] ?? null);
          const clear = predicted !== null && predicted !== 3 && r.outcome !== null;
          const hit = clear && ((predicted! >= 4 && r.outcome === "win") || (predicted! <= 2 && r.outcome === "loss"));
          return (
            <li key={i} className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-3.5">
              <div className="flex items-center gap-3">
                <FactionAvatar factions={factions} faction={p.faction} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{playerLabel(p, i, "ours")}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.faction}</p>
                </div>
                {predicted !== null && (
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", SCORE_SOLID[predicted])} title={SCORE_LABEL[predicted]}>
                    Matriz: {predicted}
                  </span>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Jugó contra</p>
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {matrix.theirs.map((rv, j) => {
                    const active = r.rival === j;
                    const taken = !active && results.some((o, k) => k !== i && o.rival === j);
                    return (
                      <button
                        key={j}
                        type="button"
                        onClick={() => pickRival(i, j)}
                        aria-pressed={active}
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition-colors",
                          active ? "border-primary bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
                          taken && "opacity-45",
                        )}
                      >
                        <FactionAvatar factions={factions} faction={rv.faction} className="h-6 w-6" />
                        <span className="max-w-[6rem] truncate">{playerLabel(rv, j, "theirs")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={`Resultado de ${playerLabel(p, i, "ours")}`}>
                {OUTCOMES.map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={r.outcome === o}
                    onClick={() => patch(i, { outcome: r.outcome === o ? null : o })}
                    className={cn(
                      "h-11 rounded-xl border text-sm font-semibold transition-all active:scale-95",
                      r.outcome === o ? OUTCOME_STYLE[o].on : cn("bg-background/40", OUTCOME_STYLE[o].off),
                    )}
                  >
                    {OUTCOME_LABEL[o]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Puntos</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={r.ours ?? ""}
                  onChange={(e) => patch(i, { ours: toPoints(e.target.value) })}
                  aria-label="Puntos de tu jugador"
                  placeholder="–"
                  className="h-9 w-16 rounded-lg border border-input bg-background/60 text-center text-sm tabular-nums"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={r.theirs ?? ""}
                  onChange={(e) => patch(i, { theirs: toPoints(e.target.value) })}
                  aria-label="Puntos del rival"
                  placeholder="–"
                  className="h-9 w-16 rounded-lg border border-input bg-background/60 text-center text-sm tabular-nums"
                />
                {clear && (
                  <span className={cn("ml-auto flex items-center gap-1 text-xs", hit ? "text-emerald-400" : "text-red-300")}>
                    {hit ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {hit ? "Acertó" : "Falló"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
