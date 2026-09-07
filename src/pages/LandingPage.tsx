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
    Sparkles,
    Star,
    Swords,
    Users,
} from "lucide-react";
import { useEffect, useState } from "react";

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

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora" />
        <div className="absolute inset-0 grid-pattern opacity-[0.04]" />
      </div>

      {/* Nav */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient glow-sm">
              <span className="font-display text-lg font-black leading-none text-white">
                A
              </span>
            </div>
            <span className="font-display text-sm font-bold tracking-[0.18em] text-foreground">
              ADMINISTRATUM
            </span>
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
              className="hidden rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 sm:inline-flex"
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
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Tu taller de miniaturas, reinventado
          </div>
          <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Gestiona y comparte tu colección de{" "}
            <span className="text-gradient animate-gradient">wargaming</span>
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
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl sm:w-auto"
            >
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => onEnter("login")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/40 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:border-primary/40 sm:w-auto"
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
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Latest articles */}
      {articles.length > 0 && (
        <section className="relative z-10 mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="mb-6 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Últimas noticias
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {articles.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onEnter("login")}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-all hover:border-primary/40 hover:shadow-xl"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-background">
                  {a.coverImage ? (
                    <img
                      src={a.coverImage}
                      alt={a.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Newspaper className="h-10 w-10 text-primary/25" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 font-semibold text-foreground">
                    {a.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {a.excerpt}
                  </p>
                </div>
              </button>
            ))}
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
                className="group overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-all hover:border-primary/40 hover:shadow-xl"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-background">
                  {g.coverImage ? (
                    <img
                      src={g.coverImage}
                      alt={g.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Palette className="h-10 w-10 text-primary/25" />
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
          <div className="pointer-events-none absolute inset-0 spotlight opacity-70" />
          <Users className="relative mx-auto mb-4 h-10 w-10 text-primary" />
          <h2 className="relative font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Únete a la comunidad de hobbyistas
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
            Empieza a organizar tu colección y comparte tus guías de pintura hoy
            mismo. Es gratis.
          </p>
          <button
            type="button"
            onClick={() => onEnter("signup")}
            className="group relative mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl"
          >
            Empezar ahora
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-8 text-center text-xs text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} Administratum · Gestión de colecciones de
          wargaming.
        </div>
      </footer>
    </div>
  );
}
