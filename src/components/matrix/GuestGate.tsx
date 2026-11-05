import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { CloudOff, Save, UserPlus } from "lucide-react";
import type { ReactNode } from "react";

/** In the editor for guests: this matrix isn't saved. */
export function GuestNotice({ className }: { className?: string }) {
  const openAuth = useAuthStore((s) => s.openAuth);
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 sm:flex-row sm:items-center", className)}>
      <CloudOff className="hidden h-5 w-5 shrink-0 text-amber-300 sm:block" />
      <p className="flex-1 text-sm">
        <strong className="text-foreground">Sin cuenta, esta matriz no se guarda:</strong>{" "}
        <span className="text-muted-foreground">se pierde al cerrar la pestaña. Regístrate gratis para guardarla junto con los resultados.</span>
      </p>
      <Button variant="gradient" size="sm" className="shrink-0 gap-1.5" onClick={() => openAuth("signup")}>
        <Save className="h-3.5 w-3.5" /> Guardar mi matriz
      </Button>
    </div>
  );
}

/** A guest who already has a matrix and tries to start another. */
export function GuestLimit({ secondary }: { secondary?: ReactNode }) {
  const openAuth = useAuthStore((s) => s.openAuth);
  return (
    <div className="space-y-4 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <UserPlus className="h-6 w-6" />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-display text-xl font-bold">Sin cuenta, una matriz cada vez</h2>
        <p className="text-sm text-muted-foreground">
          Crea tu cuenta gratis para guardar todas las matrices que quieras y los resultados de cada partida. La que ya tienes se guarda
          automáticamente.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="gradient" size="lg" onClick={() => openAuth("signup")}>
          Crear cuenta gratis
        </Button>
        {secondary}
      </div>
    </div>
  );
}
