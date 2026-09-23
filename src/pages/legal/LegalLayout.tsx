import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const LEGAL_LINKS = [
  { to: "/legal/aviso-legal", label: "Aviso legal" },
  { to: "/legal/privacidad", label: "Privacidad" },
  { to: "/legal/cookies", label: "Cookies" },
  { to: "/legal/terminos", label: "Términos de uso" },
];

interface LegalLayoutProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

export function LegalLayout({ title, updatedAt, children }: LegalLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora" />
        <div className="absolute inset-0 grid-pattern opacity-[0.04]" />
      </div>

      <header className="relative z-20 border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center">
            <img src="/images/logo.png" alt="Administratum" className="h-8 w-auto" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Última actualización: {updatedAt}
        </p>

        <div className="mt-8 space-y-8">{children}</div>

        <nav className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-6 text-xs">
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </main>

      <footer className="relative z-10 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-5 py-8 text-center text-xs text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} Administratum
        </div>
      </footer>
    </div>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="pt-1 text-sm font-semibold text-foreground">{children}</h3>
  );
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-primary/60">
      {children}
    </ul>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}
