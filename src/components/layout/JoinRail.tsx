import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores";
import { Check } from "lucide-react";

const PERKS = [
  "Tu colección y su progreso de pintura",
  "Listas con los puntos oficiales al día",
  "Comenta, guarda y comparte con la comunidad",
];

/** Guests' counterpart to "Mi espacio": a quiet invitation to join. */
export function JoinRail() {
  const openAuth = useAuthStore((s) => s.openAuth);
  return (
    <aside className="overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="relative px-4 pb-4 pt-5">
        <img
          src="/images/loading-icon.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 opacity-[0.12]"
        />
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">Únete gratis</p>
        <h2 className="mt-1 font-display text-lg font-bold leading-tight">Todo tu hobby, en un solo lugar</h2>
        <ul className="mt-3 space-y-1.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex gap-2 text-[13px] leading-snug text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {perk}
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-2">
          <Button variant="gradient" size="sm" onClick={() => openAuth("signup")}>
            Crear cuenta gratis
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openAuth("login")}>
            Ya tengo cuenta
          </Button>
        </div>
      </div>
    </aside>
  );
}
