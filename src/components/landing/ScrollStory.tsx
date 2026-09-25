import { useMediaQuery } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { Check, Heart, MessageCircle, Trophy } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

// ---------- Mock-ups (pure markup, animated on mount) ----------

function MockFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CollectionMock() {
  const armies = [
    { name: "Mil Hijos", minis: 58, painted: 72 },
    { name: "Adeptus Custodes", minis: 31, painted: 40 },
    { name: "Necrones", minis: 57, painted: 15 },
  ];
  return (
    <MockFrame title="Mi colección">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/40">Miniaturas</p>
          <Counter to={146} className="font-display text-4xl font-black text-white" />
        </div>
        <p className="text-right text-xs text-white/50">
          3 ejércitos
          <br />
          <span className="text-white/80">52% pintado</span>
        </p>
      </div>
      <div className="space-y-4">
        {armies.map((a, i) => (
          <div key={a.name}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-white/90">{a.name}</span>
              <span className="font-mono text-xs text-white/50">{a.minis} minis</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{ width: `${a.painted}%` }}
                transition={{ duration: 1.2, delay: 0.2 + i * 0.15, ease: EASE }}
              />
            </div>
          </div>
        ))}
      </div>
    </MockFrame>
  );
}

function PaintingMock() {
  const steps = [
    { name: "Imprimación", color: "#1c1c1c" },
    { name: "Capa base · Kantor Blue", color: "#0f2a4a" },
    { name: "Lavado · Nuln Oil", color: "#2a2a2a" },
    { name: "Pincel seco · Leadbelcher", color: "#8a8d91" },
    { name: "Perfilado · Retributor", color: "#b8862b" },
  ];
  return (
    <MockFrame title="Proceso de pintura">
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <motion.li
            key={s.name}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.18, duration: 0.5, ease: EASE }}
            className="flex items-center gap-3"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.18, type: "spring", bounce: 0.55 }}
              className="h-7 w-7 shrink-0 rounded-full ring-2 ring-white/20"
              style={{ background: s.color }}
            />
            <span className="flex-1 text-sm text-white/85">{s.name}</span>
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.18, type: "spring" }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-zinc-900"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </motion.span>
          </motion.li>
        ))}
      </ol>
    </MockFrame>
  );
}

function CompetitiveMock() {
  const units = [
    ["Magnus the Red", 455],
    ["Scarab Occult Terminators", 385],
    ["Daemon Prince with Wings", 205],
    ["Mutalith Vortex Beast", 170],
    ["Forgefiend", 150],
  ] as const;
  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/25 bg-[#050807] font-mono shadow-[0_40px_120px_-30px_rgba(16,185,129,0.25)]">
      <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-2.5">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-500/80">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Lista · Talavera
        </span>
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.3, type: "spring", bounce: 0.5 }}
          className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400"
        >
          <Trophy className="h-3 w-3" /> 4V · 1D · 0E
        </motion.span>
      </div>
      <div className="divide-y divide-emerald-500/10">
        {units.map(([name, pts], i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.12 }}
            className="flex justify-between px-4 py-2 text-xs"
          >
            <span className="text-zinc-300">&gt; {name}</span>
            <span className="tabular-nums text-emerald-500/80">{pts} pts</span>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-emerald-500/20 px-4 py-3">
        <span className="text-[10px] uppercase tracking-widest text-emerald-500/60">Total</span>
        <span className="text-sm text-emerald-400">
          <Counter to={2000} /> pts
        </span>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        className="flex items-center justify-between border-t border-emerald-500/10 bg-rose-500/[0.06] px-4 py-2 text-[11px]"
      >
        <span className="text-zinc-400">MFM · Forgefiend</span>
        <span className="rounded border border-rose-500/30 px-1.5 text-rose-400">▲ +15 pts</span>
      </motion.div>
    </div>
  );
}

function CommunityMock() {
  const bubbles = [
    { me: false, text: "¡Brutal ese Magnus! ¿Qué rojo usaste?" },
    { me: true, text: "Mephiston Red y veladuras de Carroburg Crimson 🔥" },
    { me: false, text: "Me lo apunto para mis Mil Hijos" },
  ];
  return (
    <MockFrame title="Comunidad">
      <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-xl">
        <img src="/images/landing-hero.jpg" alt="" className="h-full w-full object-cover" />
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
          transition={{ delay: 0.4, duration: 1.1, times: [0, 0.35, 1] }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Heart className="h-16 w-16 fill-white text-white drop-shadow-[0_4px_18px_rgba(244,63,94,0.9)]" />
        </motion.span>
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white backdrop-blur">
          <Heart className="h-3 w-3 fill-rose-500 text-rose-500" /> <Counter to={128} />
        </span>
      </div>
      <div className="space-y-2">
        {bubbles.map((b, i) => (
          <motion.div
            key={b.text}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.45, type: "spring", stiffness: 400, damping: 28 }}
            className={cn("flex", b.me ? "justify-end" : "justify-start")}
          >
            <span
              className={cn(
                "max-w-[80%] rounded-2xl px-3 py-1.5 text-xs",
                b.me ? "rounded-br-md bg-white text-zinc-900" : "rounded-bl-md bg-white/10 text-white/90",
              )}
            >
              {b.text}
            </span>
          </motion.div>
        ))}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4 }}
          className="flex items-center gap-1.5 pt-1 text-[10px] text-white/40"
        >
          <MessageCircle className="h-3 w-3" /> Chat privado entre amigos
        </motion.p>
      </div>
    </MockFrame>
  );
}

function Counter({ to, className }: { to: number; className?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, { duration: 1.4, ease: EASE, onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [to]);
  return <span className={cn("tabular-nums", className)}>{value.toLocaleString("es-ES")}</span>;
}

// ---------- Chapters ----------

const CHAPTERS = [
  {
    kicker: "Colección",
    title: "Tu colección, catalogada.",
    body: "Juegos, ejércitos y cada miniatura con su estado de pintura, sus puntos y sus fotos. Por fin sabes qué tienes, qué falta y qué queda por pintar.",
    Mock: CollectionMock,
  },
  {
    kicker: "Pintura",
    title: "Del gris plástico al acabado.",
    body: "Registra tu proceso paso a paso, lleva el inventario de pinturas y aprende con las guías que publica la comunidad.",
    Mock: PaintingMock,
  },
  {
    kicker: "Competitivo",
    title: "Listas listas para el torneo.",
    body: "Puntos del Munitorum Field Manual actualizados cada día, con cada subida o bajada señalada. Listas formateadas y resultados de torneo.",
    Mock: CompetitiveMock,
  },
  {
    kicker: "Comunidad",
    title: "Pinta en compañía.",
    body: "Comparte fotos de tus ejércitos, sigue a otros pintores, haz amigos y habla con ellos por chat privado.",
    Mock: CommunityMock,
  },
] as const;

function PinnedStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const railHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(v * CHAPTERS.length))));
  });

  const chapter = CHAPTERS[active]!;

  return (
    <div ref={ref} style={{ height: `${CHAPTERS.length * 100}vh` }} className="relative">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto_1fr_1fr] items-center gap-12 px-8">
          {/* Progress rail */}
          <div className="relative flex h-64 flex-col justify-between">
            <div className="absolute left-[5px] top-0 h-full w-px bg-white/10" />
            <motion.div style={{ height: railHeight }} className="absolute left-[5px] top-0 w-px bg-white" />
            {CHAPTERS.map((c, i) => (
              <div key={c.kicker} className="relative flex items-center gap-3">
                <span
                  className={cn(
                    "h-[11px] w-[11px] rounded-full border transition-all duration-500",
                    i <= active ? "border-white bg-white" : "border-white/30 bg-background",
                    i === active && "scale-125 shadow-[0_0_16px_rgba(255,255,255,0.6)]",
                  )}
                />
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-500",
                    i === active ? "text-white" : "text-white/30",
                  )}
                >
                  {c.kicker}
                </span>
              </div>
            ))}
          </div>

          <div className="min-h-[18rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <p className="mb-4 font-mono text-sm text-white/40">
                  {String(active + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}
                </p>
                <h3 className="font-display text-5xl font-black leading-[0.95] tracking-tight text-white">
                  {chapter.title}
                </h3>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-white/60">{chapter.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 0.92, rotateY: -12 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.96, rotateY: 12 }}
                transition={{ duration: 0.6, ease: EASE }}
                style={{ transformPerspective: 1200 }}
                className="flex w-full justify-center"
              >
                <chapter.Mock />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function StackedStory() {
  return (
    <div className="space-y-24 px-5 py-16 sm:px-8">
      {CHAPTERS.map((c, i) => (
        <StackedChapter key={c.kicker} index={i} />
      ))}
    </div>
  );
}

function StackedChapter({ index }: { index: number }) {
  const c = CHAPTERS[index]!;
  const [visible, setVisible] = useState(false);
  return (
    <motion.section
      onViewportEnter={() => setVisible(true)}
      viewport={{ once: true, margin: "-15%" }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="mx-auto max-w-xl space-y-8"
    >
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-white/40">
          {String(index + 1).padStart(2, "0")} · {c.kicker}
        </p>
        <h3 className="font-display text-4xl font-black leading-[0.95] tracking-tight text-white">{c.title}</h3>
        <p className="mt-4 leading-relaxed text-white/60">{c.body}</p>
      </div>
      <div className="flex justify-center">{visible && <c.Mock />}</div>
    </motion.section>
  );
}

/** Pinned scrollytelling on desktop; stacked, in-view reveals on small screens. */
export function ScrollStory() {
  const wide = useMediaQuery("(min-width: 1024px)");
  return wide ? <PinnedStory /> : <StackedStory />;
}
