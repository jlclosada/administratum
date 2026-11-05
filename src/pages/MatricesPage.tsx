import { useFactions } from "@/components/matrix/factions";
import { MatrixGrid, ScoreLegend } from "@/components/matrix/MatrixParts";
import { SCORE_SOLID } from "@/components/matrix/scoreStyle";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { analyzeMatrix, deleteMatrix, filledCount, loadMatrices, MATRIX_SIZES, type Matrix, type Score } from "@/lib/matrix";
import { MATRIX_COPY } from "@/lib/matrixCopy";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronDown, Grid3x3, Plus, Shield, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// What a finished 5 vs 5 looks like (the example on the page).
const DEMO: Matrix = {
  id: "demo",
  title: "Ejemplo",
  ourTeam: "Tu equipo",
  rivalTeam: "Rival",
  ours: [
    { name: "Ana", faction: "Thousand Sons" },
    { name: "Bruno", faction: "Necrons" },
    { name: "Carla", faction: "Aeldari" },
    { name: "David", faction: "Adeptus Custodes" },
    { name: "Elena", faction: "Orks" },
  ],
  theirs: [
    { name: "Rival 1", faction: "Tyranids" },
    { name: "Rival 2", faction: "Space Wolves" },
    { name: "Rival 3", faction: "Drukhari" },
    { name: "Rival 4", faction: "Death Guard" },
    { name: "Rival 5", faction: "T’au Empire" },
  ],
  scores: [
    [3, 4, 3, 4, 3],
    [5, 2, 3, 2, 4],
    [2, 3, 5, 1, 3],
    [4, 3, 2, 3, 2],
    [1, 2, 4, 3, 5],
  ] as Score[][],
  createdAt: "",
  updatedAt: "",
};

/** Tiny heat map for the saved-matrix cards. */
function MiniGrid({ m }: { m: Matrix }) {
  return (
    <div className="grid w-16 shrink-0 gap-0.5" style={{ gridTemplateColumns: `repeat(${m.ours.length}, minmax(0, 1fr))` }} aria-hidden>
      {m.scores.flat().map((s, k) => (
        <span key={k} className={cn("aspect-square rounded-[2px]", s ? SCORE_SOLID[s] : "bg-border/60")} />
      ))}
    </div>
  );
}

/**
 * /competitivo/matrices: the pairing matrix tool. Starts a matrix, lists the
 * ones saved on this device and explains how matrices work (the same text
 * api/render.ts serves to crawlers).
 */
export function MatricesPage() {
  const navigate = useNavigate();
  const factions = useFactions();
  const [saved, setSaved] = useState(() => loadMatrices());
  const demo = useMemo(() => analyzeMatrix(DEMO), []);
  const c = MATRIX_COPY;
  const start = (n: number) => navigate(`/competitivo/matrices/nueva?n=${n}`);

  return (
    <PageTransition>
      <Seo title={c.title} description={c.description} path="/competitivo/matrices" />
      <div className="mx-auto max-w-6xl space-y-12">
        <header className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/30 px-5 py-8 sm:px-10 sm:py-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <img src="/images/landing-hero.jpg" alt="" className="h-full w-full object-cover opacity-15 grayscale" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          </div>
          <Link to="/competitivo" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Competitivo
          </Link>
          <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
            <Grid3x3 className="h-3.5 w-3.5" /> Torneos por equipos · WTC · ETC
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">Matrices de emparejamientos</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground sm:text-lg">{c.lead}</p>
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">Crea tu matriz:</p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {MATRIX_SIZES.filter((s) => s !== 3).map((s) => (
                <Button key={s} variant={s === 5 ? "gradient" : "outline"} size="lg" className="gap-2 px-5" onClick={() => start(s)}>
                  <Plus className="h-4 w-4" /> {s} vs {s}
                  {s === 8 && <span className="font-mono text-[10px] opacity-70">WTC</span>}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Gratis y sin cuenta. Se guarda en este dispositivo y la puedes compartir con tu equipo.</p>
          </div>
        </header>

        {saved.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold">Tus matrices</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {saved.map((m) => {
                const total = m.ours.length ** 2;
                const done = filledCount(m);
                return (
                  <li key={m.id} className="group relative flex items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40">
                    <MiniGrid m={m} />
                    <Link to={`/competitivo/matrices/${m.id}`} className="min-w-0 flex-1 after:absolute after:inset-0">
                      <p className="truncate font-semibold">
                        {m.ourTeam || "Mi equipo"} vs {m.rivalTeam || "Rival"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.title || `${m.ours.length} vs ${m.ours.length}`} · {new Date(m.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/60">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(done / total) * 100}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {done === total ? "Completa" : `${done} de ${total} cruces`}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm("¿Borrar esta matriz?")) return;
                        deleteMatrix(m.id);
                        setSaved(loadMatrices());
                      }}
                      className="relative z-10 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-destructive"
                      aria-label="Borrar matriz"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="space-y-3 rounded-3xl border border-border/60 bg-card/30 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">Así se ve una matriz</h2>
              <span className="rounded-full border border-border/60 px-2.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">Ejemplo 5 vs 5</span>
            </div>
            <MatrixGrid matrix={DEMO} factions={factions} highlight={demo.best.pairs} />
            <ScoreLegend />
          </div>
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold">Y lo que te dice</h2>
            <ul className="space-y-2.5">
              {demo.recommendations.slice(0, 3).map((r, k) => (
                <li key={k} className="rounded-2xl border border-border/60 bg-card/30 p-4">
                  <p className="flex items-center gap-2 font-semibold">
                    {r.kind === "defender" && <Shield className="h-4 w-4 text-sky-300" />}
                    {r.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              Más el emparejamiento ideal (las casillas marcadas: {demo.best.total} de {DEMO.ours.length * 5}) y el peor caso ({demo.worst.total}).
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-bold">Cómo funcionan los emparejamientos por equipos</h2>
            <ol className="space-y-2">
              {c.howItWorks.map((t, k) => (
                <li key={k} className="flex gap-3 text-muted-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs text-primary">{k + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-bold">Cómo se puntúa cada cruce</h2>
            <ul className="space-y-2">
              {c.scale.map(([n, t]) => (
                <li key={n} className="flex items-center gap-3 text-muted-foreground">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display font-black", SCORE_SOLID[Number(n) as Score])}>{n}</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-bold">Cómo hacer tu matriz</h2>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {c.steps.map((t, k) => (
              <li key={k} className="rounded-2xl border border-border/60 bg-card/30 p-4">
                <span className="font-display text-3xl font-black text-primary/70">{k + 1}</span>
                <p className="mt-2 text-sm text-muted-foreground">{t}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-bold">Preguntas frecuentes</h2>
          <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card/30">
            {c.faq.map(([q, a]) => (
              <details key={q} className="group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="rounded-3xl border border-primary/30 bg-brand-soft p-6 text-center sm:p-8">
          <h2 className="font-display text-2xl font-bold">¿Tienes torneo por equipos?</h2>
          <p className="mt-2 text-muted-foreground">Prepara la matriz con tu equipo en cinco minutos.</p>
          <Button variant="gradient" size="lg" className="mt-5 gap-2" onClick={() => start(5)}>
            <Plus className="h-4 w-4" /> Crear matriz
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
