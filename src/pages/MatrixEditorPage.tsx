import { FactionPicker } from "@/components/matrix/FactionPicker";
import { useFactions, type FactionOption } from "@/components/matrix/factions";
import { GuestLimit, GuestNotice } from "@/components/matrix/GuestGate";
import { ActionBar, ScoreStep, SummaryStep } from "@/components/matrix/MatrixSteps";
import { ResultStep } from "@/components/matrix/ResultStep";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMatrix, getMatrixById, updateMatrix } from "@/db";
import {
  decodeMatrix,
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
  type Matrix,
  type MatrixPlayer,
  type MatrixSize,
} from "@/lib/matrix";
import { importGuestDraft } from "@/lib/matrixSync";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Cloud,
  CloudOff,
  Grid3x3,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

type Step = "equipos" | "puntuar" | "resumen" | "resultado";
const STEPS: [Step, string][] = [
  ["equipos", "Equipos"],
  ["puntuar", "Puntuar"],
  ["resumen", "Resumen"],
  ["resultado", "Resultado"],
];

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

