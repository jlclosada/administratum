import { Link } from "react-router-dom";
import { exploreLinks } from "./navItems";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-3 px-4 py-8 text-center text-xs text-muted-foreground lg:flex-row lg:justify-between sm:px-6 sm:text-left lg:px-8">
        <p>© {new Date().getFullYear()} Administratum · Colección, listas y comunidad de Warhammer 40.000.</p>
        <nav aria-label="Explorar" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {exploreLinks.map((l) => (
            <Link key={l.to} to={l.to} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
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
  );
}
