import { FactionAvatar, MatrixGrid, ScoreButtons, ScoreLegend } from "@/components/matrix/MatrixParts";
import { SCORE_SOLID, solidFor } from "@/components/matrix/scoreStyle";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import {
  analyzeMatrix,
  encodeMatrix,
  filledCount,
  playerLabel,
  SCORE_LABEL,
  summaryText,
  type Matrix,
  type Recommendation,
  type Score,
} from "@/lib/matrix";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCopy,
  Grid3x3,
  LifeBuoy,
  Pencil,
  Share2,
  Shield,
  Star,
  Swords,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { FactionOption } from "./factions";

// The scoring and summary steps of a matrix, shared by the matrix tool
// (/competitivo/matrices) and the team matches of a tournament.

const shareUrl = (m: Matrix) => `${SITE_URL}/competitivo/matrices/compartida#${encodeMatrix(m)}`;

/** Sticky bottom bar for the main action, thumb-reachable on phones. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-border/60 bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- 2. Scores

export function ScoreStep({
  matrix,
  factions,
  current,
  setCurrent,
  onChange,
  onDone,
}: {
  matrix: Matrix;
  factions: FactionOption[];
  current: number;
  setCurrent: (i: number) => void;
  onChange: (m: Matrix) => void;
  onDone: () => void;
}) {
  const n = matrix.ours.length;
  const i = Math.min(current, n - 1);
  const me = matrix.ours[i]!;
  const row = matrix.scores[i] ?? [];
  const rowDone = row.every((s) => s !== null);
  const [gridOpen, setGridOpen] = useState(false);

  const setScore = (j: number, s: Score) =>
    onChange({ ...matrix, scores: matrix.scores.map((r, k) => (k === i ? r.map((v, l) => (l === j ? s : v)) : r)) });

  const jumpTo = (row: number, col: number) => {
    setCurrent(row);
    setTimeout(() => document.getElementById(`rival-${col}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
  };

  const grid = (
    <MatrixGrid matrix={matrix} factions={factions} activeRow={i} onCell={jumpTo} />
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4">
        {/* Who is rating: one pill per player of our team */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          {matrix.ours.map((p, k) => {
            const done = (matrix.scores[k] ?? []).every((s) => s !== null);
            return (
              <button
                key={k}
                type="button"
                onClick={() => setCurrent(k)}
                aria-pressed={k === i}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors",
                  k === i ? "border-primary bg-primary/15 text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <FactionAvatar factions={factions} faction={p.faction} className="h-7 w-7" />
                <span className="max-w-[7rem] truncate">{playerLabel(p, k, "ours")}</span>
                {done && <Check className="h-3.5 w-3.5 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-brand-soft p-4">
          <div className="flex items-center gap-3">
            <FactionAvatar factions={factions} faction={me.faction} className="h-14 w-14" />
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                Jugador {i + 1} de {n}
              </p>
              <h2 className="truncate font-display text-xl font-black">{playerLabel(me, i, "ours")}</h2>
              <p className="truncate text-sm text-muted-foreground">{me.faction}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">¿Cómo le va contra cada lista rival? 5 es muy favorable y 1 muy desfavorable.</p>
          <ScoreLegend className="mt-3" />
        </div>

        <button
          type="button"
          onClick={() => setGridOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm font-medium lg:hidden"
          aria-expanded={gridOpen}
        >
          <span className="flex items-center gap-2">
            <Grid3x3 className="h-4 w-4 text-primary" /> Ver matriz completa
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", gridOpen && "rotate-180")} />
        </button>
        {gridOpen && <div className="lg:hidden">{grid}</div>}

        <ol className="space-y-2.5">
          {matrix.theirs.map((rival, j) => {
            const s = row[j] ?? null;
            return (
              <li
                key={j}
                id={`rival-${j}`}
                className={cn("scroll-mt-40 space-y-3 rounded-2xl border bg-card/40 p-3.5 transition-colors", s ? "border-border/60" : "border-dashed border-border")}
              >
                <div className="flex items-center gap-3">
                  <FactionAvatar factions={factions} faction={rival.faction} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{playerLabel(rival, j, "theirs")}</p>
                    <p className="truncate text-xs text-muted-foreground">{rival.faction}</p>
                  </div>
                  {s && <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", SCORE_SOLID[s])}>{SCORE_LABEL[s]}</span>}
                </div>
                <ScoreButtons
                  value={s}
                  onChange={(v) => setScore(j, v)}
                  label={`${playerLabel(me, i, "ours")} contra ${playerLabel(rival, j, "theirs")}`}
                />
              </li>
            );
          })}
        </ol>

        <ActionBar>
          <Button variant="outline" size="lg" className="px-4" disabled={i === 0} onClick={() => setCurrent(i - 1)} aria-label="Jugador anterior">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {i < n - 1 ? (
            <Button variant={rowDone ? "gradient" : "outline"} size="lg" className="flex-1 gap-2 px-4" onClick={() => setCurrent(i + 1)}>
              <span className="truncate">Siguiente: {playerLabel(matrix.ours[i + 1]!, i + 1, "ours")}</span> <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="gradient" size="lg" className="flex-1 gap-2 px-4" onClick={onDone}>
              Ver resumen <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </ActionBar>
      </div>

      <aside className="sticky top-36 hidden space-y-3 rounded-2xl border border-border/60 bg-card/30 p-4 lg:block">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display font-bold">
            <Grid3x3 className="h-4 w-4 text-primary" /> Matriz
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            {filledCount(matrix)}/{n * n} cruces
          </span>
        </div>
        {grid}
        <p className="text-xs text-muted-foreground">Pulsa una casilla para ir a ese cruce.</p>
        <Button variant="outline" className="w-full gap-2" onClick={onDone}>
          Ver resumen <ArrowRight className="h-4 w-4" />
        </Button>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- 3. Summary

const REC_STYLE: Record<Recommendation["kind"], { icon: ReactNode; className: string }> = {
  defender: { icon: <Shield className="h-5 w-5" />, className: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  attack: { icon: <Swords className="h-5 w-5" />, className: "border-primary/30 bg-primary/10 text-primary" },
  danger: { icon: <AlertTriangle className="h-5 w-5" />, className: "border-red-500/30 bg-red-500/10 text-red-300" },
  ace: { icon: <Star className="h-5 w-5" />, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  protect: { icon: <LifeBuoy className="h-5 w-5" />, className: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
};

const TONE = {
  good: "from-emerald-500/25 border-emerald-500/30",
  even: "from-amber-400/20 border-amber-400/30",
  bad: "from-red-500/25 border-red-500/30",
};

export function SummaryStep({
  matrix,
  factions,
  onEdit,
  onResult,
  shareable = true,
}: {
  matrix: Matrix;
  factions: FactionOption[];
  onEdit: () => void;
  /** Shows the "¿Ya habéis jugado?" link to the result step. */
  onResult?: () => void;
  /** Off inside a tournament match: the team's matrix stays in the app. */
  shareable?: boolean;
}) {
  const a = useMemo(() => analyzeMatrix(matrix), [matrix]);
  const n = matrix.ours.length;
  const missing = n * n - filledCount(matrix);
  const min = n;
  const max = n * 5;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  async function share() {
    const url = shareUrl(matrix);
    const title = `Matriz ${matrix.ourTeam || "Mi equipo"} vs ${matrix.rivalTeam || "Rival"}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    await copyText(url);
    toast.success("Enlace copiado: pégalo en el chat de tu equipo.");
  }

  async function copySummary() {
    await copyText(summaryText(matrix, a, shareable ? shareUrl(matrix) : undefined));
    toast.success("Resumen copiado.");
  }

  return (
    <div className="space-y-6">
      {missing > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>
            Faltan {missing} {missing === 1 ? "cruce" : "cruces"} por puntuar; de momento cuentan como igualados (3).{" "}
            <button type="button" onClick={onEdit} className="font-medium underline">
              Completar
            </button>
          </p>
        </div>
      )}

      <section className={cn("rounded-3xl border bg-gradient-to-br to-transparent p-5 sm:p-7", TONE[a.verdict.tone])}>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Veredicto</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">{a.verdict.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {matrix.ourTeam || "Tu equipo"} contra {matrix.rivalTeam || "el rival"}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-4xl font-black tabular-nums">
              {a.average.toFixed(1).replace(".", ",")}
              <span className="text-lg text-muted-foreground">/5</span>
            </p>
            <p className="text-xs text-muted-foreground">media de todos los cruces</p>
          </div>
        </div>
        <div className="mt-5 space-y-2">
          <div className="relative h-3 rounded-full bg-background/60">
            <div
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"
              style={{ left: `${pct(a.worst.total)}%`, right: `${100 - pct(a.best.total)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span>
              Peor caso <strong className="tabular-nums">{a.worst.total}</strong>
            </span>
            <span className="text-muted-foreground">sobre {max} puntos de matriz</span>
            <span>
              Ideal <strong className="tabular-nums">{a.best.total}</strong>
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Recomendaciones</h2>
          <ol className="space-y-2.5">
            {a.recommendations.map((r, k) => (
              <li key={k} className={cn("flex gap-3 rounded-2xl border p-4", REC_STYLE[r.kind].className)}>
                <span className="mt-0.5 shrink-0">{REC_STYLE[r.kind].icon}</span>
                <div>
                  <p className="font-semibold text-foreground">{r.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">Emparejamiento ideal</h2>
          <p className="text-sm text-muted-foreground">
            El reparto de mesas que más suma ({a.best.total}/{max}). En la matriz, las casillas marcadas.
          </p>
          <MatrixGrid matrix={matrix} factions={factions} highlight={a.best.pairs} />
          <ol className="space-y-2">
            {a.best.pairs.map((j, i) => {
              const s = (matrix.scores[i]?.[j] ?? 3) as Score;
              return (
                <li key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/30 p-2">
                  <FactionAvatar factions={factions} faction={matrix.ours[i]!.faction} className="h-8 w-8" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{playerLabel(matrix.ours[i]!, i, "ours")}</span>
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display font-black", SCORE_SOLID[s])}>{s}</span>
                  <span className="min-w-0 flex-1 truncate text-right text-sm">{playerLabel(matrix.theirs[j]!, j, "theirs")}</span>
                  <FactionAvatar factions={factions} faction={matrix.theirs[j]!.faction} className="h-8 w-8" />
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Users className="h-4 w-4 text-primary" /> Tu equipo, jugador a jugador
        </h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {a.players.map((p) => {
            const pl = matrix.ours[p.index]!;
            return (
              <div key={p.index} className="space-y-2.5 rounded-2xl border border-border/60 bg-card/30 p-3.5">
                <div className="flex items-center gap-3">
                  <FactionAvatar factions={factions} faction={pl.faction} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {playerLabel(pl, p.index, "ours")}
                      {p.index === a.defender && <Shield className="ml-1.5 inline h-3.5 w-3.5 text-sky-300" aria-label="Defensor recomendado" />}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{pl.faction}</p>
                  </div>
                  <span className="font-display text-xl font-black tabular-nums">{p.avg.toFixed(1).replace(".", ",")}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background/60">
                  <div className={cn("h-full rounded-full", solidFor(p.avg))} style={{ width: `${(p.avg / 5) * 100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.good} {p.good === 1 ? "cruce bueno" : "cruces buenos"} · {p.bad} {p.bad === 1 ? "malo" : "malos"} · como defensor aguanta un {p.defenderValue}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {onResult && (
      <button
        type="button"
        onClick={onResult}
        className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-brand-soft p-4 text-left transition-colors hover:border-primary/60"
      >
        <Swords className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1">
          <span className="block font-semibold">¿Ya habéis jugado?</span>
          <span className="block text-sm text-muted-foreground">Apunta quién jugó contra quién y el resultado, y mira si la matriz acertó.</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      )}

      <ActionBar>
        <Button variant="outline" size="lg" className="px-4" onClick={onEdit} aria-label="Editar puntuaciones">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="lg" className="flex-1 gap-2 px-3" onClick={copySummary}>
          <ClipboardCopy className="h-4 w-4" /> <span className="truncate">Copiar resumen</span>
        </Button>
        {shareable && (
          <Button variant="gradient" size="lg" className="flex-1 gap-2 px-3" onClick={share}>
          <Share2 className="h-4 w-4" /> Compartir
        </Button>
        )}
      </ActionBar>
    </div>
  );
}
