import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/lib/admin";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

/** Access guard + "back to Administración" header shared by admin sub-pages. */
export function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <PageTransition>
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Acceso restringido</h1>
          <Button variant="outline" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Volver a Administración"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </PageTransition>
  );
}
