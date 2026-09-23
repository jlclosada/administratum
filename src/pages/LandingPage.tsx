import { StarRating } from "@/components/shared/StarRating";
import { getArticles, getGuides, guideRating } from "@/db";
import type { Article, PaintingGuide } from "@/types";
import { motion } from "framer-motion";
import {
    ArrowRight,
    BookOpen,
    Images,
    Newspaper,
    Palette,
    Shield,
    Star,
    Swords,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Swords,
    title: "Organiza tus ejércitos",
    desc: "Juegos, ejércitos y miniaturas en una jerarquía clara y visual.",
  },
  {
    icon: Palette,
    title: "Registra tu pintura",
    desc: "Guías paso a paso, progreso de pintado e inventario de pinturas.",
  },
  {
    icon: BookOpen,
    title: "Guías de la comunidad",
    desc: "Aprende de tutoriales publicados por otros hobbyistas y comparte los tuyos.",
  },
  {
    icon: Newspaper,
    title: "Noticias y artículos",
    desc: "Mantente al día con novedades, lanzamientos y consejos del hobby.",
  },
  {
    icon: Images,
    title: "Galería y listas",
    desc: "Sube fotos, crea listas de ejército y expórtalas en PDF.",
  },
  {
    icon: Shield,
    title: "Privado y seguro",
    desc: "Tu colección está aislada por usuario y cifrada en la nube.",
  },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface LandingPageProps {
  onEnter: (mode?: "login" | "signup") => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [guides, setGuides] = useState<PaintingGuide[]>([]);

  useEffect(() => {
    getArticles(true)
      .then((a) => setArticles(a.slice(0, 3)))
      .catch(() => {});
    getGuides({ sort: "top" })
      .then((g) => setGuides(g.slice(0, 3)))
      .catch(() => {});
  }, []);

  const [featuredArticle, ...restArticles] = articles;

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-background">
      {/* Backdrop image, blurred + darkened for legibility. `isolate` above
          pins this to its own stacking context so it always stays behind
          the content sections regardless of what else is on the page.
          Capped to one viewport tall (not `inset-0` on the scrollable
          `min-h-screen` parent) so the browser only ever has to scale the
          source image to cover 100vh, not the full page height — letting
          it stretch to the whole page was forcing a much bigger upscale
          than the image's native resolution supports, which read as
          pixelated/zoomed on anything taller than one screen. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-screen overflow-hidden">
        {/* Separate portrait source for narrow viewports — matches a phone's
            own aspect ratio instead of cropping the desktop (landscape)
            photo down to a sliver, so neither image needs resizing to
            "cover" a shape it wasn't composed for. */}
        <picture>
          <source media="(max-width: 639px)" srcSet="/images/landing-hero-mobile.jpg" />
          <img
            src="/images/landing-hero.jpg"
            alt=""
            className="h-full w-full object-cover object-center opacity-40 blur-sm"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/55 to-background" />
        <div className="absolute inset-0 grid-pattern opacity-[0.04]" />
      </div>

      {/* Nav */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center">
            <img src="/images/logo.png" alt="Administratum" className="h-9 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEnter("login")}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => onEnter("signup")}
              className="hidden rounded-lg bg-mono-gradient px-4 py-2 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:brightness-110 sm:inline-flex"
            >
              Empezar gratis
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Gestiona y comparte tu colección de wargaming
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Organiza ejércitos, registra tus procesos de pintura, descubre guías
            de la comunidad y mantente al día con las últimas noticias del hobby.
            Todo en un solo lugar.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => onEnter("signup")}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mono-gradient px-6 py-3.5 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:brightness-110 hover:shadow-xl sm:w-auto"
            >
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => onEnter("login")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/40 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-zinc-400/50 sm:w-auto"
            >
              Ya tengo cuenta
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass-card rounded-2xl p-5"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <f.icon className="h-5 w-5 text-zinc-300" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Latest articles */}
      {featuredArticle && (
        <section className="relative z-10 mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="mb-6 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-zinc-300" />
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Últimas noticias
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Featured article — larger card */}
            <button
              type="button"
              onClick={() => onEnter("login")}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-all hover:border-zinc-400/40 hover:shadow-2xl lg:col-span-2"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-zinc-700/30 to-background sm:aspect-[16/8]">
                {featuredArticle.coverImage ? (
                  <img
                    src={featuredArticle.coverImage}
                    alt={featuredArticle.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Newspaper className="h-12 w-12 text-zinc-500/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  {featuredArticle.tags[0] && (
                    <span className="mb-2 inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                      {featuredArticle.tags[0]}
                    </span>
                  )}
                  <h3 className="line-clamp-2 text-lg font-bold text-white sm:text-xl">
                    {featuredArticle.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-white/70">
                    {featuredArticle.excerpt}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
                    <span>{formatDate(featuredArticle.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 text-white/70 opacity-0 transition-opacity group-hover:opacity-100">
                      Leer más
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Secondary articles */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              {restArticles.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onEnter("login")}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-all hover:border-zinc-400/40 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-zinc-700/30 to-background">
                    {a.coverImage ? (
                      <img
                        src={a.coverImage}
                        alt={a.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Newspaper className="h-8 w-8 text-zinc-500/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="line-clamp-2 text-sm font-semibold text-white">
                        {a.title}
                      </h3>
                      <span className="mt-1 block text-[11px] text-white/50">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top guides */}
      {guides.length > 0 && (
        <section className="relative z-10 mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="mb-6 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Guías destacadas de la comunidad
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {guides.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onEnter("login")}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-all hover:border-zinc-400/40 hover:shadow-xl"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-zinc-700/30 to-background">
                  {g.coverImage ? (
                    <img
                      src={g.coverImage}
                      alt={g.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Palette className="h-10 w-10 text-zinc-500/40" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 font-semibold text-foreground">
                    {g.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      por {g.authorName}
                    </span>
                    <StarRating value={guideRating(g)} size="sm" readOnly />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="glass-card relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 spotlight-mono opacity-70" />
          <Users className="relative mx-auto mb-4 h-10 w-10 text-zinc-300" />
          <h2 className="relative font-display text-2xl font-bold tracking-tight sm:text-3xl">
            ¿Listo para organizar tu hobby?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
            Empieza a organizar tu colección y comparte tus guías de pintura hoy
            mismo. Es gratis.
          </p>
          <button
            type="button"
            onClick={() => onEnter("signup")}
            className="group relative mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-mono-gradient px-7 py-3.5 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:brightness-110 hover:shadow-xl"
          >
            Empezar ahora
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-8 text-center text-xs text-muted-foreground sm:px-8">
          <p>
            © {new Date().getFullYear()} Administratum · Gestión de colecciones de
            wargaming.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            <Link to="/legal/aviso-legal" className="transition-colors hover:text-foreground">
              Aviso legal
            </Link>
            <Link to="/legal/privacidad" className="transition-colors hover:text-foreground">
              Privacidad
            </Link>
            <Link to="/legal/cookies" className="transition-colors hover:text-foreground">
              Cookies
            </Link>
            <Link to="/legal/terminos" className="transition-colors hover:text-foreground">
              Términos de uso
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
