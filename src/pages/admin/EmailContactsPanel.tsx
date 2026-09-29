import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addEmailContacts, deleteEmailContact } from "@/db";
import { parseEmails } from "@/lib/emailContacts";
import { cn } from "@/lib/utils";
import type { EmailContact, EmailContactAddStatus } from "@/types";
import { Loader2, Search, ShieldAlert, Trash2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS: Record<EmailContact["status"], { label: string; className: string }> = {
  activo: { label: "Activo", className: "bg-emerald-500/10 text-emerald-500" },
  baja: { label: "Baja", className: "bg-muted text-muted-foreground" },
  usuario: { label: "Ya es usuario", className: "bg-primary/10 text-primary" },
};

const ADD_SUMMARY: { status: EmailContactAddStatus; one: string; many: string }[] = [
  { status: "añadido", one: "1 añadido", many: "{n} añadidos" },
  { status: "existente", one: "1 ya estaba", many: "{n} ya estaban" },
  { status: "usuario", one: "1 ya es usuario", many: "{n} ya son usuarios" },
  { status: "baja", one: "1 se dio de baja", many: "{n} se dieron de baja" },
  { status: "inválido", one: "1 no válido", many: "{n} no válidos" },
];

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

/**
 * People without an account who agreed to receive Administratum emails.
 * Consent is mandatory (LSSI art. 21) and its source is stored as proof.
 */
export function EmailContactsPanel({
  contacts,
  onChange,
}: {
  contacts: EmailContact[] | null;
  onChange: () => void;
}) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<{ summary: string; invalid: string[] } | null>(null);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const parsed = useMemo(() => parseEmails(text), [text]);
  const canAdd = parsed.length > 0 && source.trim().length >= 3 && consent && !adding;
  const active = contacts?.filter((c) => c.status === "activo").length ?? 0;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (contacts ?? []).filter((c) => !q || c.email.includes(q) || c.source.toLowerCase().includes(q));
  }, [contacts, query]);

  async function add() {
    setAdding(true);
    setResult(null);
    try {
      const rows = await addEmailContacts(parsed, source.trim());
      const count = (s: EmailContactAddStatus) => rows.filter((r) => r.status === s).length;
      const summary = ADD_SUMMARY.filter((x) => count(x.status) > 0)
        .map((x) => (count(x.status) === 1 ? x.one : x.many.replace("{n}", String(count(x.status)))))
        .join(" · ");
      setResult({ summary, invalid: rows.filter((r) => r.status === "inválido").map((r) => r.email) });
      if (count("añadido") > 0) {
        toast.success(count("añadido") === 1 ? "Contacto añadido" : `${count("añadido")} contactos añadidos`);
        setText("");
        setConsent(false);
      }
      onChange();
    } catch (err) {
      toast.error((err as Error).message || "No se pudieron añadir los contactos.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(email: string) {
    setDeleting(email);
    try {
      await deleteEmailContact(email);
      onChange();
    } catch {
      toast.error("No se pudo eliminar el contacto.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border/60 bg-card/30 p-5 2xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Users className="h-4 w-4 text-primary" /> Contactos externos
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {contacts ? `${active} activos de ${contacts.length}` : "—"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Add */}
        <div className="space-y-4">
          <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p>
              Solo personas que hayan <strong className="text-foreground">aceptado recibir correos de Administratum</strong>{" "}
              (por ejemplo, en la hoja de inscripción de un torneo o en tu club). Enviar publicidad sin consentimiento
              está prohibido por la LSSI (art. 21) y Resend puede bloquear el dominio: nunca añadas direcciones
              compradas ni sacadas de internet.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contacts-emails">Direcciones</Label>
            <textarea
              id="contacts-emails"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={"Una por línea o separadas por comas\nlaura@ejemplo.es\nmarcos@ejemplo.es"}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              {parsed.length === 0
                ? "Puedes pegar una columna de Excel o una lista de correos."
                : `${parsed.length} ${parsed.length === 1 ? "dirección detectada" : "direcciones detectadas"}.`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contacts-source">Cómo dieron su consentimiento</Label>
            <Input
              id="contacts-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={300}
              placeholder="Ej.: hoja de inscripción del Open de Talavera, 12/10/2026"
            />
            <p className="text-xs text-muted-foreground">Se guarda con cada contacto como prueba del consentimiento.</p>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 accent-[hsl(var(--primary))]"
            />
            <span>Confirmo que todas estas personas han aceptado recibir correos de Administratum.</span>
          </label>

          <Button className="gap-2" onClick={add} disabled={!canAdd}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {parsed.length === 0
              ? "Añadir contactos"
              : `Añadir ${parsed.length} ${parsed.length === 1 ? "contacto" : "contactos"}`}
          </Button>

          {result && (
            <div className="rounded-xl border border-border/60 bg-background/40 p-3 text-xs">
              <p className="font-medium">{result.summary}</p>
              {result.invalid.length > 0 && (
                <p className="mt-1 break-all text-muted-foreground">No válidos: {result.invalid.join(", ")}</p>
              )}
              <p className="mt-1 text-muted-foreground">
                Los que ya son usuarios reciben los correos según sus propias preferencias.
              </p>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex min-w-0 flex-col gap-3">
          {contacts && contacts.length > 6 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por correo u origen"
                className="pl-9"
                aria-label="Buscar contactos"
              />
            </div>
          )}
          {contacts === null ? (
            <LoadingSpinner />
          ) : contacts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              Todavía no hay contactos externos.
            </p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-border/50 overflow-y-auto rounded-xl border border-border/60">
              {shown.map((c) => (
                <li key={c.email} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm">{c.email}</p>
                    <p className="truncate text-xs text-muted-foreground" title={c.source}>
                      {c.source} · {formatDay(c.createdAt)}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", STATUS[c.status].className)}>
                    {STATUS[c.status].label}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(c.email)}
                    disabled={deleting === c.email}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    aria-label={`Eliminar ${c.email}`}
                    title="Eliminar contacto"
                  >
                    {deleting === c.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </li>
              ))}
              {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">Sin resultados.</li>}
            </ul>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Quien se da de baja desde un correo queda bloqueado para siempre, aunque vuelvas a añadirlo. Eliminar un
            contacto no lo bloquea: solo lo quita de la lista.
          </p>
        </div>
      </div>
    </section>
  );
}
