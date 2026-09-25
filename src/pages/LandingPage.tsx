import { MagneticButton, Marquee, RevealText } from "@/components/landing/primitives";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { StarRating } from "@/components/shared/StarRating";
import { getArticles, getGuides, guideRating } from "@/db";
import { cn } from "@/lib/utils";
import type { Article, PaintingGuide } from "@/types";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowDown, ArrowRight, Newspaper, Palette } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";

const FACTIONS = [
  "Adeptus Astartes",
  "Mil Hijos",
  "Necrones",
  "Aeldari",
  "Adeptus Custodes",
  "Orkos",
  "Tiránidos",
  "Astra Militarum",
  "Guardia de la Muerte",
  "Tau",
  "Caballeros Grises",
  "Adepta Sororitas",
];

const MANIFESTO =
  "Administratum es el archivo de tu hobby: la colección que llevas años levantando, los esquemas de color que perfeccionaste, las listas con las que ganaste y la gente con la que lo compartes.";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

interface LandingPageProps {
  onEnter: (mode?: "login" | "signup") => void;
}

// ---------- Header ----------

function Header({ onEnter }: LandingPageProps) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 40));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled ? "border-b border-white/10 bg-background/70 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <img src="/images/logo.png" alt="Administratum" className="h-8 w-auto sm:h-9" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEnter("login")}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Iniciar sesión
          </button>
          <MagneticButton
            onClick={() => onEnter("signup")}
            className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-shadow hover:shadow-[0_0_30px_rgba(255,255,255,0.35)] sm:inline-flex"
          >
            Empezar gratis
          </MagneticButton>
        </div>
      </div>
    </header>
  );
}

// ---------- Hero ----------

function Hero({ onEnter }: LandingPageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "25%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.08, reduce ? 1.08 : 1.25]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-35%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  // Cursor "torch": the grimdark backdrop is lit around the pointer.
  const mx = useSpring(useMotionValue(50), { stiffness: 120, damping: 20 });
  const my = useSpring(useMotionValue(40), { stiffness: 120, damping: 20 });
  const torch = useMotionTemplate`radial-gradient(circle at ${mx}% ${my}%, transparent 0%, rgba(5,5,7,0.35) 22%, rgba(5,5,7,0.9) 55%)`;

  function handleMove(e: PointerEvent<HTMLElement>) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  }

  return (
    <section
      ref={ref}
      onPointerMove={handleMove}
      className="relative isolate flex h-[100svh] min-h-[640px] items-center overflow-hidden"
    >
      <motion.div style={{ y: bgY, scale: bgScale }} className="absolute inset-0 -z-20">
        <picture>
          <source media="(max-width: 639px)" srcSet="/images/landing-hero-mobile.jpg" />
          <img src="/images/landing-hero.jpg" alt="" className="h-full w-full object-cover" />
        </picture>
      </motion.div>
      <motion.div aria-hidden style={{ background: torch }} className="absolute inset-0 -z-10" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-transparent to-background" />
      <div aria-hidden className="grain absolute inset-0 -z-10 opacity-[0.07]" />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="mx-auto w-full max-w-6xl px-5 pt-16 sm:px-8"
      >
        <h1 className="font-display text-[clamp(2.75rem,9vw,7.5rem)] font-black leading-[0.9] tracking-[-0.03em] text-white">
          <RevealText lines={["Cada miniatura", "merece su crónica."]} delay={0.2} />
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="mt-7 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg"
        >
          Organiza tu colección, registra cómo pintas, prepara listas con los puntos oficiales y
          compártelo con una comunidad que vive el hobby como tú.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <MagneticButton
            onClick={() => onEnter("signup")}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-zinc-950 transition-shadow hover:shadow-[0_0_50px_rgba(255,255,255,0.4)]"
          >
            Crear cuenta gratis
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </MagneticButton>
          <MagneticButton
            onClick={() => onEnter("login")}
            strength={0.2}
            className="inline-flex items-center justify-center rounded-full border border-white/25 px-7 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-white/5"
          >
            Ya tengo cuenta
          </MagneticButton>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/50"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Desliza</span>
        <span className="relative h-10 w-px overflow-hidden bg-white/20">
          <motion.span
            className="absolute inset-x-0 top-0 h-4 bg-white"
            animate={reduce ? undefined : { y: ["-100%", "250%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
        <ArrowDown className="h-3.5 w-3.5 sr-only" />
      </motion.div>
    </section>
  );
}

// ---------- Manifesto: words light up as the section scrolls past ----------

function ScrubWord({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.15, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {word}&nbsp;
    </motion.span>
  );
}

function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = MANIFESTO.split(" ");
  return (
    <section className="mx-auto max-w-5xl px-5 py-32 sm:px-8 sm:py-48">
      <p
        ref={ref}
        className="font-display text-[clamp(1.75rem,4.2vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-white"
      >
        {reduce
          ? MANIFESTO
          : words.map((w, i) => (
              <ScrubWord
                key={`${w}-${i}`}
                word={w}
                progress={scrollYProgress}
                range={[i / words.length, (i + 1) / words.length]}
              />
            ))}
      </p>
    </section>
  );
}

// ---------- Latest content: draggable carousel ----------

type Slide =
  | { kind: "article"; item: Article }
  | { kind: "guide"; item: PaintingGuide };

function Carousel({ slides, onEnter }: { slides: Slide[]; onEnter: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setLimit(Math.max(0, el.scrollWidth - (el.parentElement?.clientWidth ?? 0)));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [slides.length]);

  return (
    <div className="overflow-hidden">
      <motion.div
        ref={trackRef}
        drag="x"
        dragConstraints={{ left: -limit, right: 0 }}
        dragElastic={0.08}
        className="flex w-max cursor-grab gap-5 px-5 active:cursor-grabbing sm:px-8"
      >
        {slides.map((s, i) => {
          const isArticle = s.kind === "article";
          const cover = s.item.coverImage;
          return (
            <motion.button
              key={`${s.kind}-${s.item.id}`}
              type="button"
              onClick={onEnter}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              whileHover={{ y: -8 }}
              className="group relative h-[420px] w-[300px] shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 text-left sm:w-[340px]"
            >
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                  {isArticle ? <Newspaper className="h-12 w-12 text-white/15" /> : <Palette className="h-12 w-12 text-white/15" />}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                  {isArticle ? `Noticia · ${formatDate(s.item.createdAt)}` : `Guía · por ${s.item.authorName}`}
                </span>
                <h3 className="mt-2 line-clamp-3 font-display text-2xl font-bold leading-tight text-white">
                  {s.item.title}
                </h3>
                {!isArticle && (
                  <div className="mt-3">
                    <StarRating value={guideRating(s.item)} size="sm" readOnly />
                  </div>
                )}
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                  Leer <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

// ---------- Final CTA: circle reveal ----------

function FinalCta({ onEnter }: LandingPageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const radius = useTransform(scrollYProgress, [0, 1], [reduce ? 150 : 8, 150]);
  const clip = useMotionTemplate`circle(${radius}% at 50% 50%)`;
  const textScale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.85, 1]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[90vh] items-center justify-center overflow-hidden px-5">
      <motion.div style={{ clipPath: clip }} className="absolute inset-0 -z-10">
        <img src="/images/landing-hero.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/65" />
      </motion.div>
      <motion.div style={{ scale: textScale }} className="text-center">
        <h2 className="font-display text-[clamp(2.5rem,8vw,6.5rem)] font-black leading-[0.9] tracking-[-0.03em] text-white">
          <RevealText lines={["Tu ejército", "te espera."]} inView />
        </h2>
        <p className="mx-auto mt-6 max-w-md text-white/65">Gratis. Sin tarjeta. Empieza a catalogar en un minuto.</p>
        <MagneticButton
          onClick={() => onEnter("signup")}
          className="group mt-10 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-zinc-950 transition-shadow hover:shadow-[0_0_60px_rgba(255,255,255,0.45)]"
        >
          Crear mi cuenta
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </MagneticButton>
      </motion.div>
    </section>
  );
}

// ---------- Page ----------

export function LandingPage({ onEnter }: LandingPageProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [guides, setGuides] = useState<PaintingGuide[]>([]);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    getArticles(true)
      .then((a) => setArticles(a.slice(0, 5)))
      .catch(() => {});
    getGuides({ sort: "top" })
      .then((g) => setGuides(g.slice(0, 5)))
      .catch(() => {});
  }, []);

  // Interleave news and guides so the carousel mixes both.
  const slides: Slide[] = [];
  for (let i = 0; i < Math.max(articles.length, guides.length); i++) {
    if (articles[i]) slides.push({ kind: "article", item: articles[i]! });
    if (guides[i]) slides.push({ kind: "guide", item: guides[i]! });
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background text-white">
      {/* Page scroll progress */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-white/80"
      />

      <Header onEnter={onEnter} />
      <Hero onEnter={onEnter} />

      <div className="border-y border-white/10 py-6">
        <Marquee
          items={FACTIONS}
          className="font-display text-3xl font-black uppercase tracking-tight text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.35)] sm:text-5xl"
        />
      </div>

      <Manifesto />

      <section aria-label="Qué puedes hacer">
        <ScrollStory />
      </section>

      {slides.length > 0 && (
        <section className="py-24 sm:py-32">
          <div className="mx-auto mb-10 flex max-w-6xl items-end justify-between gap-6 px-5 sm:px-8">
            <h2 className="font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">
              <RevealText lines={["Recién salido", "del archivo."]} inView />
            </h2>
            <p className="hidden max-w-xs text-sm text-white/50 sm:block">
              Noticias del hobby y las guías mejor valoradas por la comunidad. Arrastra para ver más.
            </p>
          </div>
          <Carousel slides={slides} onEnter={() => onEnter("login")} />
        </section>
      )}

      <FinalCta onEnter={onEnter} />

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-white/45 sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} Administratum · Gestión de colecciones de wargaming.</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            <Link to="/legal/aviso-legal" className="transition-colors hover:text-white">Aviso legal</Link>
            <Link to="/legal/privacidad" className="transition-colors hover:text-white">Privacidad</Link>
            <Link to="/legal/cookies" className="transition-colors hover:text-white">Cookies</Link>
            <Link to="/legal/terminos" className="transition-colors hover:text-white">Términos de uso</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
