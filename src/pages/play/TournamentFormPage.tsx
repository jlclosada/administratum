import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPlayTournament, getPlayEntries, getPlayTournament, updatePlayTournament, type PlayTournamentDTO } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import {
  capacityLabel,
  dateRange,
  feeLabel,
  FORMAT_LABEL,
  formatSummary,
  PAIRING_LABEL,
  SCORING_LABEL,
  TEAM_PAIRING_LABEL,
  whereLabel,
} from "@/lib/play/labels";
import type { PlayFormat } from "@/lib/play/types";
import { uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2, Minus, Plus, Trophy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const STEPS = [
  ["formato", "Formato"],
  ["plazas", "Plazas"],
  ["lugar", "Lugar y fechas"],
  ["inscripcion", "Inscripción"],
  ["bases", "Bases"],
  ["revisar", "Revisar"],
] as const;
type Step = (typeof STEPS)[number][0];

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const DEFAULTS: PlayTournamentDTO = {
  organizerName: "",
  name: "",
  description: "",
  rules: "",
  coverImage: null,
  format: "teams",
  teamSize: 5,
  pointsLimit: 2000,
  rounds: 3,
  pairingSystem: "swiss",
  teamPairing: "wtc",
  scoring: "wtc",
  uniqueFactions: true,
  maxEntries: 8,
  locationType: "presencial",
  venueName: "",
  address: "",
  city: "",
  onlinePlatform: "",
  entryFee: 0,
  paymentInfo: "",
  startsOn: inDays(30),
  endsOn: null,
  startTime: "10:00",
  registrationDeadline: null,
  listDeadline: null,
  missionPack: "Chapter Approved 2026-27",
  status: "draft",
  listsPublic: false,
};

const POINTS = [1000, 1500, 2000, 2500, 3000];

/** ISO ⇄ the value of an <input type="datetime-local"> (local time). */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Choice<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: ReactNode; hint?: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-xl border p-3 text-left transition-colors disabled:opacity-50",
            value === o.value ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40",
          )}
        >
          <span className="flex items-center justify-between gap-2 text-sm font-semibold">
            {o.label}
            {value === o.value && <Check className="h-4 w-4 text-primary" />}
          </span>
          {o.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Menos ${label}`}>
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))}
        aria-label={label}
        className="h-11 w-20 rounded-xl border border-input bg-background/60 text-center font-display text-xl font-black tabular-nums"
      />
      <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Más ${label}`}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Create or edit a tournament organised in Administratum, step by step:
 * format, spots, venue and dates, entry fee, rules pack, review.
 */
export function TournamentFormPage() {
  const { tournamentId } = useParams();
  const editing = !!tournamentId;
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const [form, setForm] = useState<PlayTournamentDTO | null>(editing ? null : DEFAULTS);
  const [hasEntries, setHasEntries] = useState(false);
  const [step, setStep] = useState<Step>("formato");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    Promise.all([getPlayTournament(tournamentId), getPlayEntries(tournamentId)]).then(([t, entries]) => {
      if (!t || (t.organizerId !== user?.id && !isAdmin)) {
        toast.error("No puedes editar este torneo.");
        navigate(`/torneos/${tournamentId}`, { replace: true });
        return;
      }
      const { id: _id, organizerId: _o, createdAt: _c, updatedAt: _u, ...dto } = t;
      setForm(dto);
      setHasEntries(entries.some((e) => e.status !== "withdrawn"));
    });
  }, [tournamentId, user?.id, isAdmin, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  if (!form) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = (patch: Partial<PlayTournamentDTO>) => setForm({ ...form, ...patch });
  const setFormat = (format: PlayFormat) =>
    set({ format, teamSize: format === "singles" ? 1 : format === "doubles" ? 2 : form.teamSize >= 3 ? form.teamSize : 5 });

  const errors: Partial<Record<Step, string>> = {};
  if (form.name.trim().length < 3) errors.formato = "Ponle un nombre al torneo (mínimo 3 letras).";
  if (!form.startsOn) errors.lugar = "Indica la fecha del torneo.";
  else if (form.endsOn && form.endsOn < form.startsOn) errors.lugar = "El último día no puede ser anterior al primero.";
  else if (form.locationType === "presencial" && !form.city.trim()) errors.lugar = "Indica la ciudad.";
  const index = STEPS.findIndex(([k]) => k === step);
  const firstError = STEPS.find(([k]) => errors[k])?.[0];

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      set({ coverImage: await uploadFile(file, "tournaments") });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(status?: PlayTournamentDTO["status"]) {
    if (firstError) {
      setStep(firstError);
      toast.error(errors[firstError]!);
      return;
    }
    setSaving(true);
    try {
      const current = form!;
      const dto: PlayTournamentDTO = { ...current, name: current.name.trim(), status: status ?? current.status };
      const t = editing ? await updatePlayTournament(tournamentId!, dto) : await createPlayTournament(dto);
      toast.success(editing ? "Cambios guardados." : status === "open" ? "¡Torneo creado y abierto a inscripciones!" : "Torneo guardado como borrador.");
      navigate(`/torneos/${t.id}/gestionar`, { replace: !editing });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const players = form.maxEntries * form.teamSize;

  return (
    <PageTransition>
      <Seo title={editing ? "Editar torneo" : "Crear torneo"} path="/competitivo/organizar/nuevo" noindex />
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center gap-3">
          <Link
            to={editing ? `/torneos/${tournamentId}/gestionar` : "/competitivo/organizar"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{editing ? "Editar torneo" : "Nuevo torneo"}</p>
            <h1 className="truncate font-display text-xl font-black tracking-tight sm:text-2xl">{form.name || "Tu torneo de Warhammer 40K"}</h1>
          </div>
        </div>

        <nav aria-label="Pasos" className="sticky top-16 z-30 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-xl sm:mx-0">
          <ol className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STEPS.map(([key, label], i) => (
              <li key={key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(key)}
                  aria-current={step === key ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
                    step === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="font-mono text-[10px] opacity-70">{i + 1}</span> {label}
                  {errors[key] && step !== key && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-6 rounded-3xl border border-border/60 bg-card/30 p-4 sm:p-6">
          {step === "formato" && (
            <>
              <Field label="Nombre del torneo">
                <Input value={form.name} onChange={(e) => set({ name: e.target.value.slice(0, 100) })} placeholder="Ej.: GT Primavera 2027" className="h-11" />
              </Field>
              <Field label="Tienda u organización" hint="Aparece en la página del torneo.">
                <Input value={form.organizerName} onChange={(e) => set({ organizerName: e.target.value.slice(0, 80) })} placeholder="Ej.: Club La Letanía" className="h-11" />
              </Field>
              <div className="space-y-2">
                <span className="text-sm font-medium">Formato</span>
                <Choice
                  value={form.format}
                  onChange={setFormat}
                  disabled={hasEntries}
                  options={[
                    { value: "singles", label: FORMAT_LABEL.singles, hint: "Cada jugador por su cuenta" },
                    { value: "doubles", label: FORMAT_LABEL.doubles, hint: "Equipos de 2" },
                    { value: "teams", label: FORMAT_LABEL.teams, hint: "De 3 a 8 jugadores (WTC: 8)" },
                  ]}
                />
                {hasEntries && <p className="text-xs text-amber-300">Ya hay inscripciones: el formato y el tamaño de equipo no se pueden cambiar.</p>}
              </div>
              {form.format === "teams" && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Jugadores por equipo</span>
                  <div className="flex flex-wrap gap-2">
                    {[3, 4, 5, 6, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={hasEntries}
                        onClick={() => set({ teamSize: n })}
                        aria-pressed={form.teamSize === n}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50",
                          form.teamSize === n ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground",
                        )}
                      >
                        {n} jugadores{n === 8 && <span className="ml-1 font-mono text-[10px] opacity-70">WTC</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <span className="text-sm font-medium">Puntos por lista</span>
                <div className="flex flex-wrap gap-2">
                  {POINTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set({ pointsLimit: n })}
                      aria-pressed={form.pointsLimit === n}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium",
                        form.pointsLimit === n ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Rondas</span>
                  <Stepper value={form.rounds} min={1} max={12} onChange={(rounds) => set({ rounds })} label="rondas" />
                </div>
                <Field label="Pack de misiones">
                  <Input value={form.missionPack} onChange={(e) => set({ missionPack: e.target.value.slice(0, 120) })} className="h-11" />
                </Field>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Emparejamientos entre {form.format === "singles" ? "jugadores" : "equipos"}</span>
                <Choice
                  value={form.pairingSystem}
                  onChange={(pairingSystem) => set({ pairingSystem })}
                  options={[
                    { value: "swiss", label: "Suizo", hint: "Se enfrentan los que van igual, sin repetir rival" },
                    { value: "manual", label: "Manual", hint: "La organización decide cada ronda" },
                  ]}
                />
              </div>
              {form.format !== "singles" && (
                <>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Cruces dentro de cada enfrentamiento</span>
                    <Choice
                      value={form.teamPairing}
                      onChange={(teamPairing) => set({ teamPairing })}
                      options={[
                        { value: "wtc", label: "Formato WTC", hint: "Defensores y atacantes, con la matriz de cada equipo" },
                        { value: "free", label: "Libre", hint: "Los capitanes acuerdan quién juega contra quién" },
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Cómo se gana un enfrentamiento</span>
                    <Choice
                      value={form.scoring}
                      onChange={(scoring) => set({ scoring })}
                      options={[
                        { value: "wtc", label: "Puntos 20-0", hint: "Cada partida reparte 20 puntos según la diferencia de PV (WTC)" },
                        { value: "wins", label: "Partidas ganadas", hint: "Gana quien gane más partidas" },
                      ]}
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3">
                    <input type="checkbox" checked={form.uniqueFactions} onChange={(e) => set({ uniqueFactions: e.target.checked })} className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
                    <span>
                      <span className="block text-sm font-medium">Una facción por equipo</span>
                      <span className="block text-xs text-muted-foreground">Como en el WTC: no se pueden repetir ejércitos dentro de un mismo equipo.</span>
                    </span>
                  </label>
                </>
              )}
            </>
          )}

          {step === "plazas" && (
            <>
              <div className="space-y-2">
                <span className="text-sm font-medium">¿Cuántos {form.format === "singles" ? "jugadores" : form.format === "doubles" ? "parejas" : "equipos"} caben?</span>
                <Stepper value={form.maxEntries} min={2} max={512} onChange={(maxEntries) => set({ maxEntries })} label="plazas" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="font-display text-3xl font-black tabular-nums">{form.maxEntries}</p>
                  <p className="text-xs text-muted-foreground">{form.format === "singles" ? "jugadores" : form.format === "doubles" ? "parejas" : "equipos"}</p>
                </div>
                {form.teamSize > 1 && (
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="font-display text-3xl font-black tabular-nums">{players}</p>
                    <p className="text-xs text-muted-foreground">jugadores en total</p>
                  </div>
                )}
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="font-display text-3xl font-black tabular-nums">{Math.ceil(players / 2)}</p>
                  <p className="text-xs text-muted-foreground">mesas por ronda</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Cuando se llenen las plazas, las nuevas inscripciones pasan a la lista de espera. Si alguien se retira, entra el primero de la lista.
              </p>
            </>
          )}

          {step === "lugar" && (
            <>
              <Choice
                value={form.locationType}
                onChange={(locationType) => set({ locationType })}
                options={[
                  { value: "presencial", label: "Presencial", hint: "En tienda, club o local" },
                  { value: "online", label: "Online", hint: "Tabletop Simulator u otra plataforma" },
                ]}
              />
              {form.locationType === "presencial" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Local">
                    <Input value={form.venueName} onChange={(e) => set({ venueName: e.target.value.slice(0, 120) })} placeholder="Ej.: Tienda Dados y Dragones" className="h-11" />
                  </Field>
                  <Field label="Ciudad">
                    <Input value={form.city} onChange={(e) => set({ city: e.target.value.slice(0, 80) })} placeholder="Ej.: Madrid" className="h-11" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Dirección">
                      <Input value={form.address} onChange={(e) => set({ address: e.target.value.slice(0, 200) })} placeholder="Calle, número" className="h-11" />
                    </Field>
                  </div>
                </div>
              ) : (
                <Field label="Plataforma">
                  <Input value={form.onlinePlatform} onChange={(e) => set({ onlinePlatform: e.target.value.slice(0, 80) })} placeholder="Ej.: Tabletop Simulator + Discord" className="h-11" />
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Fecha">
                  <Input type="date" value={form.startsOn} onChange={(e) => set({ startsOn: e.target.value })} className="h-11" />
                </Field>
                <Field label="Último día" hint="Si dura más de un día.">
                  <Input type="date" value={form.endsOn ?? ""} min={form.startsOn} onChange={(e) => set({ endsOn: e.target.value || null })} className="h-11" />
                </Field>
                <Field label="Hora de inicio">
                  <Input type="time" value={form.startTime?.slice(0, 5) ?? ""} onChange={(e) => set({ startTime: e.target.value || null })} className="h-11" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cierre de inscripción" hint="Opcional. Después ya no se admiten equipos.">
                  <Input
                    type="datetime-local"
                    value={toLocalInput(form.registrationDeadline)}
                    onChange={(e) => set({ registrationDeadline: fromLocalInput(e.target.value) })}
                    className="h-11"
                  />
                </Field>
                <Field label="Límite para subir listas" hint="Después, las listas se hacen públicas y no se pueden cambiar.">
                  <Input type="datetime-local" value={toLocalInput(form.listDeadline)} onChange={(e) => set({ listDeadline: fromLocalInput(e.target.value) })} className="h-11" />
                </Field>
              </div>
            </>
          )}

          {step === "inscripcion" && (
            <>
              <Field label="Precio por jugador (€)" hint="0 si es gratis.">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  value={form.entryFee}
                  onChange={(e) => set({ entryFee: Math.max(0, Number(e.target.value) || 0) })}
                  className="h-11 w-40"
                />
              </Field>
              {form.entryFee > 0 && (
                <>
                  <p className="rounded-xl border border-border/60 bg-background/40 p-3 text-sm">{feeLabel(form)}</p>
                  <Field label="Cómo pagar" hint="Bizum, transferencia, en tienda… Lo verá cada inscrito junto a su justificante de pago.">
                    <Textarea
                      value={form.paymentInfo}
                      onChange={(e) => set({ paymentInfo: e.target.value.slice(0, 1000) })}
                      placeholder="Ej.: Bizum al 600 000 000 indicando el nombre del equipo, o en tienda."
                      rows={4}
                    />
                  </Field>
                  <p className="text-sm text-muted-foreground">
                    Cada inscripción podrá adjuntar su justificante. Tú lo validas desde la gestión del torneo y ves en todo momento quién ha pagado.
                  </p>
                </>
              )}
            </>
          )}

          {step === "bases" && (
            <>
              <Field label="Descripción corta" hint="Se ve en el calendario y al compartir el enlace.">
                <Textarea value={form.description} onChange={(e) => set({ description: e.target.value.slice(0, 2000) })} rows={3} placeholder="Ej.: Torneo por equipos de 5 a 2000 puntos con premios para los tres primeros." />
              </Field>
              <Field label="Bases del torneo" hint="Horarios, misiones, pintado, premios, normas de conducta…">
                <Textarea value={form.rules} onChange={(e) => set({ rules: e.target.value.slice(0, 20000) })} rows={12} placeholder={"09:30 Recepción\n10:00 Ronda 1\n…"} />
              </Field>
              <div className="space-y-2">
                <span className="text-sm font-medium">Imagen de portada</span>
                <div className="flex items-center gap-3">
                  {form.coverImage && <img src={form.coverImage} alt="" className="h-16 w-28 rounded-lg object-cover" />}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-accent">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {form.coverImage ? "Cambiar" : "Subir imagen"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadCover(e.target.files?.[0])} />
                  </label>
                  {form.coverImage && (
                    <button type="button" className="text-xs text-muted-foreground underline" onClick={() => set({ coverImage: null })}>
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {step === "revisar" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Trophy className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold">{form.name || "Sin nombre"}</h2>
                  <p className="text-sm text-muted-foreground">{form.organizerName || "Sin organización"}</p>
                </div>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {[
                  ["Formato", `${formatSummary(form)} · ${form.pointsLimit} puntos · ${form.rounds} rondas`],
                  ["Plazas", capacityLabel(form)],
                  ["Emparejamientos", PAIRING_LABEL[form.pairingSystem]],
                  ...(form.format !== "singles"
                    ? [
                        ["Cruces", TEAM_PAIRING_LABEL[form.teamPairing]],
                        ["Puntuación", SCORING_LABEL[form.scoring]],
                      ]
                    : []),
                  ["Fecha", dateRange(form)],
                  ["Lugar", whereLabel(form)],
                  ["Inscripción", feeLabel(form)],
                  ["Misiones", form.missionPack],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              {firstError && <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm">{errors[firstError]}</p>}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 border-t border-border/60 bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="lg" className="px-4" disabled={index === 0} onClick={() => setStep(STEPS[index - 1]![0])} aria-label="Paso anterior">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {step !== "revisar" ? (
              <Button variant="gradient" size="lg" className="flex-1 gap-2" onClick={() => setStep(STEPS[index + 1]![0])}>
                Siguiente: {STEPS[index + 1]![1]} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : editing ? (
              <Button variant="gradient" size="lg" className="flex-1 gap-2" disabled={saving} onClick={() => save()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar cambios
              </Button>
            ) : (
              <>
                <Button variant="outline" size="lg" className="flex-1 px-3" disabled={saving} onClick={() => save("draft")}>
                  Guardar borrador
                </Button>
                <Button variant="gradient" size="lg" className="flex-1 gap-2 px-3" disabled={saving} onClick={() => save("open")}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Crear y abrir inscripción
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
