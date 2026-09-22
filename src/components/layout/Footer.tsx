import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <p>© {new Date().getFullYear()} Administratum · Gestión de colecciones de wargaming.</p>
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
  );
}
