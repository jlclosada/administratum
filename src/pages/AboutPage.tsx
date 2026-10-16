import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { ABOUT_EN, ABOUT_ES } from "@/lib/aboutCopy";
import { ArrowRight, ChevronDown, Mail } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

/** "Qué es Administratum" (/sobre) and its English summary (/en). */
export function AboutPage({ lang = "es" }: { lang?: "es" | "en" }) {
  const es = lang === "es";
  const c = es ? ABOUT_ES : ABOUT_EN;

  // The English page should read as English to screen readers and translators.
  useEffect(() => {
    if (es) return;
    const prev = document.documentElement.lang;
    document.documentElement.lang = "en";
    return () => {
      document.documentElement.lang = prev;
    };
  }, [es]);

  return (
    <PageTransition>
      <Seo title={c.title} description={c.description} path={es ? "/sobre" : "/en"} />
      <article className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-4 rounded-3xl border border-border/60 bg-card/40 p-6 sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{es ? "Sobre la plataforma" : "About"}</p>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            {es ? "Qué es Administratum" : "Warhammer 40K points, lists and tournaments, in Spanish"}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{c.lead}</p>
          <div className="flex flex-wrap gap-3 pt-2 text-sm">
            <Link to="/catalogo-puntos" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground">
              {es ? "Ver los puntos" : "Browse the points"} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to={es ? "/en" : "/sobre"} hrefLang={es ? "en" : "es"} className="inline-flex items-center rounded-full border border-border/60 px-4 py-2 hover:border-primary/40">
              {es ? "English summary" : "Versión en español"}
            </Link>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold">{es ? "Qué puedes hacer" : "What you can do"}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {c.features.map((f) => (
              <Link key={f.title} to={f.path} className="group rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/40">
                <h3 className="flex items-center justify-between gap-2 font-semibold group-hover:text-primary">
                  {f.title}
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </Link>
            ))}
          </div>
        </section>

        {es ? (
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="font-semibold">Para quién es</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ABOUT_ES.audience}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
              <h2 className="font-semibold">Cómo se mantienen los puntos al día</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ABOUT_ES.howPoints}</p>
            </div>
          </section>
        ) : (
          <p className="rounded-2xl border border-border/60 bg-card/40 p-5 text-sm text-muted-foreground">{ABOUT_EN.note}</p>
        )}

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-bold">{es ? "Preguntas frecuentes" : "FAQ"}</h2>
          <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            {c.faq.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" /> {es ? "Contacto" : "Contact"}:{" "}
          <a href="mailto:hola@administratum.site" className="text-foreground hover:text-primary">
            hola@administratum.site
          </a>
        </p>
      </article>
    </PageTransition>
  );
}
