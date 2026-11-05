import { FactionPicker } from "@/components/matrix/FactionPicker";
import { useFactions, type FactionOption } from "@/components/matrix/factions";
import { GuestLimit, GuestNotice } from "@/components/matrix/GuestGate";
import { FactionAvatar, MatrixGrid, ScoreButtons, ScoreLegend } from "@/components/matrix/MatrixParts";
import { ResultStep } from "@/components/matrix/ResultStep";
import { SCORE_SOLID, solidFor } from "@/components/matrix/scoreStyle";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMatrix, getMatrixById, updateMatrix } from "@/db";
import { copyText } from "@/lib/clipboard";
import {
  analyzeMatrix,
  decodeMatrix,
  encodeMatrix,
  filledCount,
  hasContent,
  isComplete,
  isSetupComplete,
  loadDraft,
  MATRIX_SIZES,
  newMatrix,
  playerLabel,
  resizeMatrix,
  saveDraft,
  SCORE_LABEL,
  summaryText,
  type Matrix,
  type MatrixPlayer,
  type MatrixSize,
  type Recommendation,
  type Score,
} from "@/lib/matrix";
import { importGuestDraft } from "@/lib/matrixSync";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCopy,
  Cloud,
  CloudOff,
  Grid3x3,
  LifeBuoy,
  Loader2,
  Pencil,
  Share2,
  Shield,
  Star,
  Swords,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

type Step = "equipos" | "puntuar" | "resumen" | "resultado";
const STEPS: [Step, string][] = [
  ["equipos", "Equipos"],
  ["puntuar", "Puntuar"],
  ["resumen", "Resumen"],
  ["resultado", "Resultado"],
];

const shareUrl = (m: Matrix) => `${SITE_URL}/competitivo/matrices/compartida#${encodeMatrix(m)}`;
const firstStep = (m: Matrix): Step => (m.results?.some((r) => r.outcome) ? "resultado" : isComplete(m) ? "resumen" : isSetupComplete(m) ? "puntuar" : "equipos");

type SaveState = "saved" | "saving" | "error";

/**
 * One pairing matrix: set up both teams, rate every matchup 1–5, read the
 * recommendations and record the results. Signed-in users' matrices are
 * saved in their account as they type; a guest gets one unsaved draft.
 * "nueva" creates one and "compartida#…" imports a shared link.
 */
export function MatrixEditorPage() {
  const { matrixId = "" } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const factions = useFactions();
  const user = useAuthStore((s) => s.user);
  const [matrix, setMatrix] = useState<Matrix | null | undefined>(undefined);
  /** A guest's existing draft, when they try to start another one. */
  const [blockedBy, setBlockedBy] = useState<Matrix | null>(null);
  const [step, setStep] = useState<Step>("equipos");
  const [current, setCurrent] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const pending = useRef<Matrix | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const open = (m: Matrix | null) => {
    setMatrix(m);
    if (m) setStep(firstStep(m));
  };

  useEffect(() => {
    let cancelled = false;
    const go = (id: string) => navigate(`/competitivo/matrices/${id}`, { replace: true });
    setBlockedBy(null);
    (async () => {
      if (user) {
        // A matrix built before signing up moves into the account first.
        const imported = await importGuestDraft();
        if (cancelled) return;
        if (imported && imported.from === matrixId) {
          toast.success("Tu matriz se ha guardado en tu cuenta.");
          return go(imported.to.id);
        }
      }
      if (matrixId === "nueva" || matrixId === "compartida") {
        const shared = matrixId === "compartida" ? decodeMatrix(location.hash.slice(1)) : null;
        if (matrixId === "compartida" && !shared) return open(null);
        const n = Number(search.get("n"));
        const fresh = shared ?? newMatrix(MATRIX_SIZES.includes(n as MatrixSize) ? (n as MatrixSize) : 5);
        if (user) {
          try {
            const saved = await createMatrix(fresh);
            if (shared) toast.success("Matriz compartida guardada en tu cuenta.");
            return cancelled ? undefined : go(saved.id);
          } catch (err) {
            toast.error((err as Error).message);
            return open(null);
          }
        }
        const draft = loadDraft();
        if (draft && hasContent(draft)) {
          setMatrix(null);
          return setBlockedBy(draft);
        }
        saveDraft(fresh);
        return go(fresh.id);
      }
      if (user) {
        const m = await getMatrixById(matrixId);
        if (!cancelled) open(m);
      } else {
        const draft = loadDraft();
        open(draft?.id === matrixId ? draft : null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only when the URL or the session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixId, user?.id]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const flush = () => {
    clearTimeout(timer.current);
    const m = pending.current;
    if (!m) return;
    pending.current = null;
    updateMatrix(m)
      .then(() => setSaveState(pending.current ? "saving" : "saved"))
      .catch(() => setSaveState("error"));
  };

  // Save what's left when leaving the page.
  useEffect(() => () => flush(), []);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if ((!user && matrix && hasContent(matrix)) || pending.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [user, matrix]);

  const update = (next: Matrix) => {
    setMatrix(next);
    if (!user) return saveDraft(next);
    pending.current = next;
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  };

  if (blockedBy) {
    return (
      <div className="mx-auto max-w-md py-12">
        <GuestLimit
          secondary={
            <Button asChild variant="outline" size="lg">
              <Link to={`/competitivo/matrices/${blockedBy.id}`}>Seguir con mi matriz</Link>
            </Button>
          }
        />
      </div>
    );
  }
  if (matrix === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (matrix === null) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <Grid3x3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h1 className="font-display text-2xl font-bold">No encontramos esta matriz</h1>
        <p className="text-sm text-muted-foreground">
          {user
            ? "Puede que la hayas borrado o que sea de otra cuenta. Si te la han pasado, pide el enlace de «Compartir»."
            : "Sin cuenta, la matriz solo dura mientras la pestaña está abierta. Inicia sesión para ver las que tengas guardadas."}
        </p>
        <Button asChild variant="gradient">
          <Link to="/competitivo/matrices">Ir a matrices</Link>
        </Button>
      </div>
    );
  }

  const ready = isSetupComplete(matrix);
  const title = [matrix.ourTeam || "Mi equipo", matrix.rivalTeam || "Rival"].join(" vs ");

  return (
    <PageTransition>
      <Seo title={`Matriz ${title}`} path="/competitivo/matrices" noindex />
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center gap-3">
          <Link
            to="/competitivo/matrices"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
            aria-label="Mis matrices"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Matriz {matrix.ours.length} vs {matrix.ours.length}
            </p>
            <h1 className="truncate font-display text-xl font-black tracking-tight sm:text-2xl">{matrix.title || title}</h1>
          </div>
          <SaveBadge state={user ? saveState : "guest"} />
        </div>

        {!user && <GuestNotice />}

        <nav aria-label="Pasos" className="sticky top-16 z-30 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:px-2">
          <ol className="grid grid-cols-4 gap-1 rounded-xl border border-border/60 bg-card/40 p-1">
            {STEPS.map(([key, label], i) => {
              const disabled = key !== "equipos" && !ready;
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setStep(key)}
                    aria-current={step === key ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-xs font-medium transition-colors disabled:opacity-40 sm:px-2 sm:text-sm",
                      step === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="hidden font-mono text-[11px] opacity-70 sm:inline">{i + 1}</span> {label}
                    {key === "puntuar" && ready && (
                      <span className="hidden font-mono text-[10px] opacity-70 lg:inline">
                        {filledCount(matrix)}/{matrix.ours.length ** 2}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {step === "equipos" && <TeamsStep matrix={matrix} factions={factions} onChange={update} onNext={() => setStep("puntuar")} />}
        {step === "puntuar" && (
          <ScoreStep
            matrix={matrix}
            factions={factions}
            current={current}
            setCurrent={setCurrent}
            onChange={update}
            onDone={() => setStep("resumen")}
          />
        )}
        {step === "resumen" && (
          <SummaryStep matrix={matrix} factions={factions} onEdit={() => setStep("puntuar")} onResult={() => setStep("resultado")} />
        )}
        {step === "resultado" && <ResultStep matrix={matrix} factions={factions} canSave={!!user} onChange={update} />}
      </div>
    </PageTransition>
  );
}

function SaveBadge({ state }: { state: SaveState | "guest" }) {
  const map = {
    guest: { icon: <CloudOff className="h-3.5 w-3.5" />, text: "Sin guardar", className: "text-amber-300" },
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: "Guardando…", className: "text-muted-foreground" },
    saved: { icon: <Cloud className="h-3.5 w-3.5" />, text: "Guardada", className: "text-emerald-400" },
    error: { icon: <AlertTriangle className="h-3.5 w-3.5" />, text: "Sin conexión", className: "text-destructive" },
  }[state];
  return (
    <span className={cn("flex shrink-0 items-center gap-1.5 text-xs", map.className)} role="status">
      {map.icon} <span className="hidden sm:inline">{map.text}</span>
    </span>
  );
}

/** Sticky bottom bar for the main action, thumb-reachable on phones. */
function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-border/60 bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- 1. Teams

function TeamsStep({
  matrix,
  factions,
  onChange,
  onNext,
}: {
  matrix: Matrix;
  factions: FactionOption[];
  onChange: (m: Matrix) => void;
  onNext: () => void;
}) {
  const n = matrix.ours.length;
  const missing = [...matrix.ours, ...matrix.theirs].filter((p) => !p.faction).length;
  const setPlayer = (side: "ours" | "theirs", i: number, patch: Partial<MatrixPlayer>) =>
    onChange({ ...matrix, [side]: matrix[side].map((p, k) => (k === i ? { ...p, ...patch } : p)) });

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Torneo o ronda</span>
          <Input
            value={matrix.title}
            onChange={(e) => onChange({ ...matrix, title: e.target.value.slice(0, 120) })}
            placeholder="Ej.: WTC 2026 · Ronda 3"
          />
        </label>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Formato</span>
          <div className="flex flex-wrap gap-2">
            {MATRIX_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => s !== n && onChange(resizeMatrix(matrix, s))}
                aria-pressed={s === n}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  s === n ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {s} vs {s}
                {s === 8 && <span className="ml-1 font-mono text-[10px] opacity-70">WTC</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(["ours", "theirs"] as const).map((side) => (
          <section key={side} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", side === "ours" ? "bg-primary" : "bg-red-500")} />
              <h2 className="font-display text-lg font-bold">{side === "ours" ? "Tu equipo" : "Equipo rival"}</h2>
            </div>
            <Input
              value={side === "ours" ? matrix.ourTeam : matrix.rivalTeam}
              onChange={(e) => onChange({ ...matrix, [side === "ours" ? "ourTeam" : "rivalTeam"]: e.target.value.slice(0, 80) })}
              placeholder={side === "ours" ? "Nombre de tu equipo" : "Nombre del equipo rival"}
              aria-label={side === "ours" ? "Nombre de tu equipo" : "Nombre del equipo rival"}
            />
            <ol className="space-y-2">
              {matrix[side].map((p, i) => (
                <li key={i} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/30 p-2.5">
                  <span
                    className={cn(
                      "mt-3.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]",
                      side === "ours" ? "bg-primary/15 text-primary" : "bg-red-500/15 text-red-300",
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={p.name}
                      onChange={(e) => setPlayer(side, i, { name: e.target.value.slice(0, 60) })}
                      placeholder={playerLabel({ name: "", faction: "" }, i, side)}
                      aria-label={`Nombre del ${side === "ours" ? "jugador" : "rival"} ${i + 1}`}
                      autoComplete="off"
                      className="h-12 rounded-xl"
                    />
                    <FactionPicker
                      factions={factions}
                      value={p.faction}
                      onChange={(faction) => setPlayer(side, i, { faction })}
                      who={playerLabel(p, i, side)}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <ActionBar>
        <p className="flex-1 text-xs text-muted-foreground">
          {missing ? `Falta elegir ${missing} ${missing === 1 ? "ejército" : "ejércitos"}` : "Equipos listos"}
        </p>
        <Button variant="gradient" size="lg" className="gap-2 px-6" disabled={missing > 0} onClick={onNext}>
          Puntuar cruces <ArrowRight className="h-4 w-4" />
        </Button>
      </ActionBar>
    </div>
  );
}

// ---------------------------------------------------------------- 2. Scores

function ScoreStep({
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

function SummaryStep({
  matrix,
  factions,
  onEdit,
  onResult,
}: {
  matrix: Matrix;
  factions: FactionOption[];
  onEdit: () => void;
  onResult: () => void;
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
    await copyText(summaryText(matrix, a, shareUrl(matrix)));
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

      <ActionBar>
        <Button variant="outline" size="lg" className="px-4" onClick={onEdit} aria-label="Editar puntuaciones">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="lg" className="flex-1 gap-2 px-3" onClick={copySummary}>
          <ClipboardCopy className="h-4 w-4" /> <span className="truncate">Copiar resumen</span>
        </Button>
        <Button variant="gradient" size="lg" className="flex-1 gap-2 px-3" onClick={share}>
          <Share2 className="h-4 w-4" /> Compartir
        </Button>
      </ActionBar>
    </div>
  );
}
