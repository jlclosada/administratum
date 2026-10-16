import { Button } from "@/components/ui/button";
import {
  applyConsent,
  CONSENT_NEEDED,
  getConsent,
  HAS_ANALYTICS,
  HAS_MARKETING,
  onOpenConsentSettings,
  saveConsent,
  trackPageView,
} from "@/lib/consent";
import { Cookie } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

function Toggle({ checked, onChange, label, text }: { checked: boolean; onChange: (v: boolean) => void; label: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border/60 p-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{text}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" />
    </label>
  );
}

/**
 * Cookie banner for the optional marketing tags (src/lib/consent.ts). Renders
 * nothing unless one is configured. Accept, reject and configure carry the
 * same weight, and nothing loads before a choice.
 */
export function ConsentBanner() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => CONSENT_NEEDED && !getConsent());
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(() => getConsent()?.analytics ?? false);
  const [marketing, setMarketing] = useState(() => getConsent()?.marketing ?? false);
  const firstPath = useRef(pathname);

  useEffect(() => {
    if (!CONSENT_NEEDED) return;
    applyConsent();
    return onOpenConsentSettings(() => {
      const c = getConsent();
      setAnalytics(c?.analytics ?? false);
      setMarketing(c?.marketing ?? false);
      setConfiguring(true);
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    // The first page view is sent when the pixel loads.
    if (pathname !== firstPath.current) trackPageView();
  }, [pathname]);

  if (!CONSENT_NEEDED || !open) return null;

  const choose = (a: boolean, m: boolean) => {
    saveConsent({ analytics: a, marketing: m });
    setOpen(false);
    setConfiguring(false);
  };

  return (
    <div role="dialog" aria-label="Preferencias de cookies" className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Usamos cookies propias y de terceros para medir las visitas y mostrar anuncios de Administratum en otras webs y redes. Solo se
            activan si las aceptas; puedes cambiar de opinión cuando quieras desde «Configurar cookies», al pie de la página.{" "}
            <Link to="/legal/cookies" className="underline hover:text-foreground">
              Más información
            </Link>
          </p>
        </div>
        {configuring && (
          <div className="space-y-2">
            {HAS_ANALYTICS && (
              <Toggle checked={analytics} onChange={setAnalytics} label="Analítica" text="Google Analytics: qué páginas se visitan y desde dónde llegan las visitas." />
            )}
            {HAS_MARKETING && (
              <Toggle
                checked={marketing}
                onChange={setMarketing}
                label="Publicidad"
                text="Píxel de Meta: medir y mostrar anuncios de Administratum en Facebook e Instagram."
              />
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => choose(false, false)}>
            Rechazar
          </Button>
          {configuring ? (
            <Button variant="outline" onClick={() => choose(analytics, marketing)}>
              Guardar selección
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setConfiguring(true)}>
              Configurar
            </Button>
          )}
          <Button variant="outline" onClick={() => choose(HAS_ANALYTICS, HAS_MARKETING)}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}
