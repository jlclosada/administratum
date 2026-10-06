import { AdminShell } from "@/components/shared/AdminShell";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ToggleRow } from "@/components/shared/ToggleRow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppConfig, getArticles, getEmailAudienceCount, getEmailCampaigns, getEmailContacts, updateAppConfig } from "@/db";
import { emailApi } from "@/lib/emailApi";
import { cn } from "@/lib/utils";
import type { AppConfig, EmailCampaign, EmailContact } from "@/types";
import {
  BellRing,
  History,
  Loader2,
  Mail,
  Megaphone,
  Monitor,
  Newspaper,
  Play,
  Save,
  Send,
  Smartphone,
  Sparkles,
  TrendingUp,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AddContactsForm, EmailContactsPanel } from "./EmailContactsPanel";

type TemplateKey = "presentacion" | "destacado" | "novedades" | "recordatorio" | "noticia";
type FeatureKey = "puntos" | "torneos" | "listas" | "comunidad" | "guias" | "coleccion";

const TEMPLATES: { key: TemplateKey; label: string; description: string; icon: LucideIcon }[] = [
  { key: "presentacion", label: "Presentación", description: "Todo lo que ofrece Administratum, sección a sección.", icon: Sparkles },
  { key: "destacado", label: "Característica destacada", description: "Una función concreta, con contenido real de la web.", icon: Star },
  { key: "novedades", label: "Resumen de novedades", description: "Puntos, torneos, listas, noticias y fotos recientes.", icon: Newspaper },
  { key: "recordatorio", label: "Te echamos de menos", description: "El mismo resumen, para quien lleva tiempo sin entrar.", icon: BellRing },
  { key: "noticia", label: "Nueva noticia", description: "Avisa de una noticia publicada, con su portada y enlace.", icon: Megaphone },
];

const FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "puntos", label: "Puntos" },
  { key: "torneos", label: "Torneos" },
  { key: "listas", label: "Listas" },
  { key: "comunidad", label: "Comunidad" },
  { key: "guias", label: "Guías" },
  { key: "coleccion", label: "Colección" },
];

const KIND_LABEL: Record<EmailCampaign["kind"], string> = {
  manual: "Campaña",
  automatic: "Automático",
  test: "Prueba",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function AdminEmailPage() {
  const [template, setTemplate] = useState<TemplateKey>("presentacion");
  const [feature, setFeature] = useState<FeatureKey>("puntos");
  const [articles, setArticles] = useState<{ id: string; title: string }[]>([]);
  const [articleId, setArticleId] = useState("");
  const [subject, setSubject] = useState("");
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const [audienceType, setAudienceType] = useState<"all" | "inactive" | "contacts">("contacts");
  const [contacts, setContacts] = useState<EmailContact[] | null>(null);
  const external = audienceType === "contacts";
  const [inactiveDays, setInactiveDays] = useState(14);
  const [counts, setCounts] = useState<{ all: number | null; inactive: number | null }>({ all: null, inactive: null });

  const [busy, setBusy] = useState<"test" | "send" | "reminders" | "points" | "points-preview" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [campaigns, setCampaigns] = useState<EmailCampaign[] | null>(null);

  const loadCampaigns = useCallback(() => getEmailCampaigns().then(setCampaigns), []);
  const loadContacts = useCallback(
    () =>
      getEmailContacts()
        .then(setContacts)
        .catch(() => setContacts([])),
    [],
  );

  useEffect(() => {
    getAppConfig().then(setConfig);
    loadCampaigns();
    loadContacts();
    getArticles(true).then((list) => {
      setArticles(list.map((x) => ({ id: x.id, title: x.title })));
      if (list[0]) setArticleId(list[0].id);
    });
    getEmailAudienceCount(null)
      .then((all) => setCounts((c) => ({ ...c, all })))
      .catch(() => setCounts((c) => ({ ...c, all: null })));
  }, [loadCampaigns, loadContacts]);

  useEffect(() => {
    const t = setTimeout(() => {
      getEmailAudienceCount(inactiveDays)
        .then((inactive) => setCounts((c) => ({ ...c, inactive })))
        .catch(() => setCounts((c) => ({ ...c, inactive: null })));
    }, 300);
    return () => clearTimeout(t);
  }, [inactiveDays]);

  // Preview follows the chosen template (subject edits apply on send).
  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    emailApi<{ subject: string; html: string }>({ action: "preview", template, feature, external, articleId: articleId || undefined })
      .then((p) => !cancelled && setPreview(p))
      .catch((err: Error) => !cancelled && setPreviewError(err.message))
      .finally(() => !cancelled && setPreviewLoading(false));
    return () => {
      cancelled = true;
    };
  }, [template, feature, external, articleId]);

  const contactCount = contacts ? contacts.filter((c) => c.status === "activo").length : null;
  const recipients = external ? contactCount : audienceType === "all" ? counts.all : counts.inactive;
  const recipientNoun = external ? (recipients === 1 ? "contacto" : "contactos") : recipients === 1 ? "usuario" : "usuarios";

  function chooseAudience(type: typeof audienceType) {
    setAudienceType(type);
    // The reminder only makes sense for people who have an account.
    if (type === "contacts" && template === "recordatorio") setTemplate("presentacion");
  }
  const payload = {
    template,
    feature,
    articleId: template === "noticia" ? articleId || undefined : undefined,
    subject: subject.trim() || undefined,
    audience: { type: audienceType, days: inactiveDays },
    external,
  };

  async function sendTest() {
    setBusy("test");
    try {
      await emailApi({ action: "test", ...payload });
      toast.success("Te hemos enviado una prueba. Revisa tu correo.");
      loadCampaigns();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function sendCampaign() {
    setConfirmOpen(false);
    setBusy("send");
    try {
      const r = await emailApi<{
        sent: number;
        recipients: number;
        already: number;
        remaining: number;
        failed: number;
        limited: boolean;
      }>({ action: "send", ...payload });
      const noun = external ? "contactos" : "usuarios";
      if (r.sent === 0 && r.already > 0 && !r.failed) {
        toast.info(`Todos los ${noun} ya habían recibido esta campaña.`);
      } else if (r.limited) {
        toast.warning(
          `Enviados ${r.sent}; quedan ${r.remaining} por el límite diario. Mañana vuelve a enviar la misma campaña (mismo asunto) y solo les llegará a ellos.`,
        );
      } else if (r.failed) {
        toast.warning(`Enviados ${r.sent}, fallaron ${r.failed}. Revisa el historial.`);
      } else {
        toast.success(
          `Campaña enviada a ${r.sent} ${noun}.${r.already ? ` ${r.already} ya la habían recibido y se han omitido.` : ""}`,
        );
      }
      loadCampaigns();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runReminders() {
    setBusy("reminders");
    try {
      const r = await emailApi<{ sent?: number; recipients?: number; skipped?: string }>({ action: "run-reminders" });
      toast.success(r.recipients ? `Recordatorios enviados: ${r.sent} de ${r.recipients}.` : "No hay usuarios inactivos pendientes.");
      loadCampaigns();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function togglePointsEmail(enabled: boolean) {
    if (!config) return;
    const next = { ...config, pointsEmailEnabled: enabled };
    setConfig(next);
    try {
      await updateAppConfig(next);
      toast.success(enabled ? "Aviso de cambios de puntos activado" : "Aviso de cambios de puntos desactivado");
    } catch {
      setConfig(config);
      toast.error("No se pudo guardar.");
    }
  }

  async function previewPoints() {
    setBusy("points-preview");
    try {
      setPreview(await emailApi<{ subject: string; html: string }>({ action: "preview-points" }));
      setPreviewError(null);
      document.getElementById("email-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runPoints() {
    setBusy("points");
    try {
      const r = await emailApi<{ sent?: number; digests?: number; skipped?: string }>({ action: "run-points" });
      toast.success(r.sent ? `Aviso de puntos enviado a ${r.sent} usuarios.` : "No hay avisos de puntos pendientes de enviar.");
      loadCampaigns();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function saveConfig() {
    if (!config) return;
    setSavingConfig(true);
    try {
      await updateAppConfig(config);
      toast.success("Recordatorio automático guardado");
    } catch {
      toast.error("No se pudo guardar.");
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <AdminShell title="Correos" subtitle="Campañas por correo y recordatorios automáticos para los usuarios">
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ---------- Compose ---------- */}
        <section className="space-y-5 rounded-2xl border border-border/60 bg-card/30 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Mail className="h-4 w-4 text-primary" /> Nueva campaña
          </h2>

          <div className="space-y-2">
            <Label>Plantilla</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTemplate(t.key)}
                  disabled={external && t.key === "recordatorio"}
                  title={external && t.key === "recordatorio" ? "Solo para usuarios registrados" : undefined}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    template === t.key
                      ? "border-primary/60 bg-brand-soft"
                      : "border-border/60 hover:border-primary/30 hover:bg-accent/40",
                  )}
                >
                  <t.icon className={cn("mt-0.5 h-4 w-4 shrink-0", template === t.key ? "text-primary" : "text-muted-foreground")} />
                  <span>
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {template === "noticia" && (
            <div className="space-y-2">
              <Label htmlFor="email-article">Noticia</Label>
              <select
                id="email-article"
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {articles.length === 0 && <option value="">No hay noticias publicadas</option>}
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Al publicar una noticia también puedes avisar directamente desde el editor. Nadie recibe dos veces la misma.
              </p>
            </div>
          )}

          {template === "destacado" && (
            <div className="space-y-2">
              <Label>Característica</Label>
              <div className="flex flex-wrap gap-2">
                {FEATURES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFeature(f.key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      feature === f.key
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email-subject">Asunto</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={preview?.subject ?? "Asunto por defecto de la plantilla"}
              maxLength={140}
            />
            <p className="text-xs text-muted-foreground">Déjalo vacío para usar el asunto de la plantilla.</p>
          </div>

          <div className="space-y-2">
            <Label>Destinatarios</Label>
            <div className="space-y-2">
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm",
                  external ? "border-primary/60 bg-brand-soft" : "border-border/60",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <input type="radio" checked={external} onChange={() => chooseAudience("contacts")} className="accent-[hsl(var(--primary))]" />
                  <span>
                    Direcciones sin cuenta (contactos externos)
                    <span className="block text-xs text-muted-foreground">
                      Personas que aún no se han registrado y aceptaron recibir correos
                    </span>
                  </span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">{contactCount ?? "—"}</span>
              </label>
              {external && (
                <div className="space-y-3 rounded-xl border border-primary/30 bg-background/40 p-4">
                  <p className="text-sm font-medium">Añadir destinatarios</p>
                  <AddContactsForm onAdded={loadContacts} />
                  {contacts && contacts.length > 0 && (
                    <a href="#contactos-externos" className="block text-xs text-primary hover:underline">
                      Ver los {contacts.length} contactos guardados
                    </a>
                  )}
                </div>
              )}
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-sm",
                  audienceType === "all" ? "border-primary/60 bg-brand-soft" : "border-border/60",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <input type="radio" checked={audienceType === "all"} onChange={() => chooseAudience("all")} className="accent-[hsl(var(--primary))]" />
                  Todos los que aceptan correos
                </span>
                <span className="font-mono text-xs text-muted-foreground">{counts.all ?? "—"}</span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm",
                  audienceType === "inactive" ? "border-primary/60 bg-brand-soft" : "border-border/60",
                )}
              >
                <span className="flex flex-wrap items-center gap-2.5">
                  <input type="radio" checked={audienceType === "inactive"} onChange={() => chooseAudience("inactive")} className="accent-[hsl(var(--primary))]" />
                  Sin entrar desde hace más de
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={inactiveDays}
                    onChange={(e) => setInactiveDays(Math.max(1, Number(e.target.value) || 1))}
                    className="h-8 w-20"
                  />
                  días
                </span>
                <span className="font-mono text-xs text-muted-foreground">{counts.inactive ?? "—"}</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
            <Button variant="outline" className="gap-2" onClick={sendTest} disabled={busy !== null}>
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviarme una prueba
            </Button>
            <Button
              variant="gradient"
              className="gap-2"
              onClick={() => setConfirmOpen(true)}
              disabled={busy !== null || !recipients}
            >
              {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar a {recipients ?? 0} {recipientNoun}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {external
              ? "Solo reciben el correo los contactos activos: quien se dio de baja o ya tiene cuenta queda fuera. Cada correo lleva un enlace para darse de baja con un clic y sus botones invitan a crear una cuenta."
              : "Solo reciben correos los usuarios con el correo confirmado que no se han dado de baja; cada correo lleva un enlace para darse de baja con un clic."} Nadie recibe dos veces la misma campaña
            (misma plantilla y asunto). El plan gratuito de Resend permite unos 100 correos al día: si la audiencia es
            mayor, se envía a los primeros y, al repetir el envío otro día, solo a los que faltan.
          </p>
        </section>

        {/* ---------- Preview ---------- */}
        <section id="email-preview" className="scroll-mt-24 space-y-3 rounded-2xl border border-border/60 bg-card/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Vista previa</h2>
            <div className="flex rounded-lg border border-border/60 p-0.5">
              {(
                [
                  ["desktop", Monitor, "Escritorio"],
                  ["mobile", Smartphone, "Móvil"],
                ] as const
              ).map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={() => setDevice(key)}
                  className={cn(
                    "flex h-7 w-8 items-center justify-center rounded-md transition-colors",
                    device === key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          {preview && (
            <p className="truncate text-sm">
              <span className="text-muted-foreground">Asunto: </span>
              {subject.trim() || preview.subject}
            </p>
          )}
          <div className="relative flex justify-center overflow-hidden rounded-xl border border-border/60 bg-[#0a0a0b]">
            {previewLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40">
                <LoadingSpinner />
              </div>
            )}
            {previewError ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No se pudo generar la vista previa: {previewError}
              </p>
            ) : (
              <iframe
                title="Vista previa del correo"
                srcDoc={preview?.html ?? ""}
                sandbox="allow-same-origin"
                className={cn("h-[640px] bg-[#0a0a0b] transition-[width] duration-300", device === "mobile" ? "w-[390px]" : "w-full")}
              />
            )}
          </div>
        </section>

        <EmailContactsPanel contacts={contacts} onChange={loadContacts} />

        {/* ---------- Points changes ---------- */}
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card/30 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> Aviso automático de cambios de puntos
          </h2>
          {!config ? (
            <LoadingSpinner />
          ) : (
            <>
              <ToggleRow
                checked={config.pointsEmailEnabled}
                onChange={togglePointsEmail}
                label="Avisar a todos los usuarios cuando cambien los puntos"
                description="En cuanto la sincronización con el Munitorum detecta cambios, cada usuario recibe un resumen: sus miniaturas afectadas, su facción, los mayores cambios y el resumen por facción, con lo que sube y lo que baja."
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={previewPoints} disabled={busy !== null}>
                  {busy === "points-preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Monitor className="h-4 w-4" />}
                  Ver ejemplo
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={runPoints} disabled={busy !== null}>
                  {busy === "points" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Enviar pendientes ahora
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Nadie recibe dos veces el mismo aviso. Respeta el límite diario de Resend: si hay más usuarios, el resto lo recibe en
                los envíos siguientes (como muy tarde, al día siguiente a las 11:00).
              </p>
            </>
          )}
        </section>

        {/* ---------- Automation ---------- */}
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <BellRing className="h-4 w-4 text-primary" /> Recordatorio automático
            </h2>
            <Button size="sm" className="gap-2" onClick={saveConfig} disabled={!config || savingConfig}>
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
          {!config ? (
            <LoadingSpinner />
          ) : (
            <>
              <ToggleRow
                checked={config.reengagementEnabled}
                onChange={(v) => setConfig({ ...config, reengagementEnabled: v })}
                label="Enviar «Te echamos de menos» automáticamente"
                description="Cada día a las 11:00 se envía el resumen de novedades a quien lleva tiempo sin entrar."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reengagement-days">Días sin entrar</Label>
                  <Input
                    id="reengagement-days"
                    type="number"
                    min={3}
                    max={180}
                    value={config.reengagementDays}
                    onChange={(e) => setConfig({ ...config, reengagementDays: Math.max(3, Number(e.target.value) || 3) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reengagement-cooldown">No repetir antes de (días)</Label>
                  <Input
                    id="reengagement-cooldown"
                    type="number"
                    min={7}
                    max={365}
                    value={config.reengagementCooldownDays}
                    onChange={(e) =>
                      setConfig({ ...config, reengagementCooldownDays: Math.max(7, Number(e.target.value) || 7) })
                    }
                  />
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={runReminders} disabled={busy !== null}>
                {busy === "reminders" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Enviar recordatorios ahora
              </Button>
            </>
          )}
        </section>

        {/* ---------- History ---------- */}
        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/30 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <History className="h-4 w-4 text-primary" /> Historial
          </h2>
          {campaigns === null ? (
            <LoadingSpinner />
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no se ha enviado ningún correo.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {campaigns.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {KIND_LABEL[c.kind]} · {c.audience} · {formatDate(c.createdAt)}
                    </p>
                    {c.error && <p className="mt-1 line-clamp-2 text-xs text-destructive">{c.error}</p>}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 font-mono text-xs",
                      c.failed ? "bg-destructive/15 text-destructive" : "bg-emerald-500/10 text-emerald-500",
                    )}
                  >
                    {c.sent}/{c.recipients}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Enviar la campaña?</DialogTitle>
            <DialogDescription>
              Se enviará «{subject.trim() || preview?.subject}» a {recipients ?? 0} {recipientNoun}. No se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="gradient" className="gap-2" onClick={sendCampaign}>
              <Send className="h-4 w-4" /> Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
