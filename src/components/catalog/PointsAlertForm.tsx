import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { BellRing, Check, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

/**
 * "Avísame de los cambios de puntos" for visitors without an account:
 * double opt-in (api/email.ts → subscribe / confirm). Signed-in users already
 * get the alert through their account, so they don't see it.
 */
export function PointsAlertForm({ source, className }: { source: string; className?: string }) {
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot, hidden from people
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (user) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", email, consent, source, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar la suscripción.");
      setState("sent");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className={cn("flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm", className)}>
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        <p>
          <span className="font-medium">Revisa tu correo.</span> Te hemos enviado un enlace para confirmar la suscripción (mira también en
          spam).
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn("space-y-3 rounded-2xl border border-primary/30 bg-brand-soft p-4 sm:p-5", className)}>
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold">Recibe los cambios de puntos en tu correo</p>
          <p className="text-sm text-muted-foreground">Te avisamos en cuanto Games Workshop actualice los puntos: qué sube y qué baja. Gratis y sin cuenta.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          autoComplete="email"
          aria-label="Tu correo"
          className="bg-background/60"
        />
        <Button type="submit" variant="gradient" className="shrink-0 gap-2" disabled={state === "sending" || !consent || !email}>
          {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
          Avisarme
        </Button>
      </div>
      {/* Bots fill every field; people never see this one. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden="true" />
      <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[hsl(var(--primary))]" />
        <span>
          Acepto recibir por correo los avisos de cambios de puntos y novedades de Administratum. Puedo darme de baja en cualquier momento (
          <Link to="/legal/privacidad" className="underline hover:text-foreground">
            privacidad
          </Link>
          ).
        </span>
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
