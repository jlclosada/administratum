import { AdminShell } from "@/components/shared/AdminShell";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAppConfig, updateAppConfig } from "@/db";
import { cn } from "@/lib/utils";
import type { AppConfig } from "@/types";
import { Loader2, Megaphone, Save, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4 text-left transition-colors hover:border-primary/30"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-emerald-500" : "bg-muted")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function AdminSettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAppConfig().then(setConfig);
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await updateAppConfig(config);
      toast.success("Ajustes guardados");
    } catch {
      toast.error("No se pudo guardar. Revisa tus permisos de administrador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Ajustes"
      subtitle="Anuncio global y acceso a la plataforma"
      actions={
        <Button onClick={handleSave} disabled={saving || !config} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      }
    >
      {!config ? (
        <LoadingSpinner />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-border/60 bg-card/30 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Megaphone className="h-4 w-4 text-primary" /> Anuncio global
            </h2>
            <p className="text-sm text-muted-foreground">
              Banner en la parte superior de la web para todos los usuarios (mantenimiento, novedades…).
            </p>
            <div className="space-y-2">
              <Label htmlFor="announcement">Mensaje</Label>
              <Textarea
                id="announcement"
                value={config.announcement}
                onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
                placeholder="Ej.: nueva actualización disponible…"
                rows={3}
              />
            </div>
            <Toggle
              checked={config.announcementEnabled}
              onChange={(v) => setConfig({ ...config, announcementEnabled: v })}
              label="Mostrar anuncio"
              description="Activa el banner para todos los usuarios."
            />
            {config.announcementEnabled && config.announcement.trim() && (
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-brand-soft px-4 py-2.5 text-sm">
                <Megaphone className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">{config.announcement}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Vista previa</span>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-border/60 bg-card/30 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <UserPlus className="h-4 w-4 text-primary" /> Acceso
            </h2>
            <Toggle
              checked={config.signupsEnabled}
              onChange={(v) => setConfig({ ...config, signupsEnabled: v })}
              label="Permitir nuevos registros"
              description="Si se desactiva, se oculta el formulario de registro en la pantalla de acceso."
            />
          </section>
        </div>
      )}
    </AdminShell>
  );
}
