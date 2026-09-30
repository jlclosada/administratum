import { ShareListDialog } from "@/components/community/ShareListDialog";
import { SharePhotoDialog } from "@/components/community/SharePhotoDialog";
import { AvatarUploader } from "@/components/shared/AvatarUploader";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COLLECTION_GAME_NAME, getFactionCatalog } from "@/db";
import { profileCompletion } from "@/lib/profileCompletion";
import { cn } from "@/lib/utils";
import { useAuthStore, useProfileStore } from "@/stores";
import type { FactionCatalogEntry, Profile } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brush,
  Camera,
  Check,
  Loader2,
  MapPin,
  ScrollText,
  Search,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BIO_MAX = 280;
const STEPS = ["Tu identidad", "Tu facción", "Sobre ti", "Tu primer paso"] as const;

/** Starters the user can tap to begin their bio. */
const BIO_STARTERS = [
  "Pinto miniaturas desde ",
  "Juego sobre todo partidas ",
  "Colecciono ",
  "Busco rivales en ",
  "Mi ejército favorito es ",
];

type Draft = Pick<Profile, "displayName" | "avatarUrl" | "location" | "favoriteFaction" | "bio">;

// ---------------------------------------------------------------------------
// Live preview: the profile card as others will see it
// ---------------------------------------------------------------------------

function ProfilePreview({ draft, faction }: { draft: Draft; faction?: FactionCatalogEntry }) {
  const { percent, missing } = profileCompletion({
    id: "",
    website: null,
    links: [],
    role: "user",
    createdAt: "",
    updatedAt: "",
    ...draft,
  });
  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-2xl backdrop-blur-md">
      <div className="relative h-28 overflow-hidden bg-muted">
        <img
          src={faction?.image ?? "/email/hero.jpg"}
          alt=""
          className="h-full w-full object-cover opacity-80 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
      </div>
      <div className="-mt-10 px-6 pb-6">
        <span className="relative inline-block rounded-full bg-card p-1">
          <UserAvatar src={draft.avatarUrl} name={draft.displayName || "?"} size="lg" />
        </span>
        <p className="mt-2 truncate font-display text-xl font-bold">{draft.displayName || "Tu nombre"}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Swords className="h-3 w-3" /> {draft.favoriteFaction || "Sin facción"}
          </span>
          {draft.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {draft.location}
            </span>
          )}
        </p>
        <p className={cn("mt-3 line-clamp-4 text-sm leading-relaxed", draft.bio ? "text-foreground/85" : "text-muted-foreground/60")}>
          {draft.bio || "Aquí aparecerá tu biografía."}
        </p>

        <div className="mt-5 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Perfil completado</span>
            <span className="font-mono tabular-nums text-primary">{percent}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-brand-gradient"
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={{ type: "spring", stiffness: 140, damping: 22 }}
            />
          </div>
          {missing.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">Falta: {missing.map((m) => m.label.toLowerCase()).join(", ")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

function StepHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      <h1 className="font-display text-3xl font-black leading-tight tracking-tight sm:text-4xl">{title}</h1>
      <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">{text}</p>
    </div>
  );
}

function FactionPicker({
  factions,
  value,
  onChange,
}: {
  factions: FactionCatalogEntry[] | null;
  value: string | null;
  onChange: (name: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (factions ?? []).filter((f) => !q || f.factionName.toLowerCase().includes(q));
  }, [factions, query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar facción" className="pl-9" aria-label="Buscar facción" />
      </div>
      {factions === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid max-h-[46vh] grid-cols-2 gap-2.5 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-3">
          {shown.map((f) => {
            const selected = value === f.factionName;
            return (
              <button
                key={f.factionSlug}
                type="button"
                onClick={() => onChange(selected ? null : f.factionName)}
                aria-pressed={selected}
                className={cn(
                  "group relative flex aspect-[4/3] items-end overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow,transform] duration-200 active:scale-[0.98]",
                  selected ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary))]" : "border-border/60 hover:border-primary/40",
                )}
              >
                {f.image && (
                  <img
                    src={f.image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <span className="relative w-full p-2.5 text-[13px] font-semibold leading-tight text-white">{f.factionName}</span>
                {selected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            );
          })}
          {shown.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">Ninguna facción coincide.</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn("text-sm transition-colors", value ? "text-muted-foreground hover:text-foreground" : "font-medium text-primary")}
      >
        {value ? "Todavía no lo tengo claro" : "✓ Todavía no lo tengo claro (puedes elegirla más tarde)"}
      </button>
    </div>
  );
}

interface Suggestion {
  key: string;
  icon: LucideIcon;
  title: string;
  text: string;
  action: "photo" | "list" | string;
}

function suggestions(faction: string | null): Suggestion[] {
  return [
    {
      key: "army",
      icon: Swords,
      title: faction ? `Registra tu ejército de ${faction}` : "Registra tu primer ejército",
      text: "Apunta tus miniaturas y su estado de pintura, con los puntos oficiales siempre al día.",
      action: "/coleccion",
    },
    {
      key: "photo",
      icon: Camera,
      title: "Comparte una foto de tus miniaturas",
      text: "Tu última miniatura pintada, un ejército entero o un proyecto a medias.",
      action: "photo",
    },
    {
      key: "list",
      icon: ScrollText,
      title: "Publica una lista de ejército",
      text: "Pega la lista de la app oficial y recibe comentarios de la comunidad.",
      action: "list",
    },
    {
      key: "tournament",
      icon: Trophy,
      title: "Busca un torneo",
      text: "Mira los próximos torneos y apúntate con un clic.",
      action: "/competitivo",
    },
    {
      key: "guide",
      icon: Brush,
      title: "Escribe una guía de pintura",
      text: "Enseña cómo pintas tu esquema favorito paso a paso.",
      action: "/guias/nueva",
    },
    {
      key: "people",
      icon: Users,
      title: "Encuentra a otros jugadores",
      text: "Descubre colecciones y añade amigos para seguir lo que publican.",
      action: "/comunidad",
    },
  ];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Welcome wizard shown once, the first time a new user enters the app:
 * identity, faction, bio, then a nudge towards their first piece of content.
 * Every step saves as it goes; finishing or skipping sets `onboarded_at`.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  // The URL they arrived at (e.g. a shared list): skipping keeps them there.
  const { pathname, search } = useLocation();
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  const metaName =
    (user?.user_metadata?.display_name as string | undefined) || (user?.user_metadata?.full_name as string | undefined) || "";
  const [draft, setDraft] = useState<Draft>(() => ({
    displayName: profile?.displayName || metaName,
    avatarUrl: profile?.avatarUrl ?? null,
    location: profile?.location ?? "",
    favoriteFaction: profile?.favoriteFaction ?? null,
    bio: profile?.bio ?? "",
  }));
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [factions, setFactions] = useState<FactionCatalogEntry[] | null>(null);
  const [dialog, setDialog] = useState<"photo" | "list" | null>(null);

  useEffect(() => {
    getFactionCatalog(COLLECTION_GAME_NAME)
      .then((rows) => setFactions([...rows].filter((f) => f.image).sort((a, b) => a.factionName.localeCompare(b.factionName, "es"))))
      .catch(() => setFactions([]));
  }, []);

  const faction = factions?.find((f) => f.factionName === draft.favoriteFaction);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const nameOk = draft.displayName.trim().length >= 2;
  const firstName = draft.displayName.trim().split(" ")[0] || "";

  function go(to: number) {
    setDirection(to > step ? 1 : -1);
    setStep(to);
    window.scrollTo({ top: 0 });
  }

  async function saveAndNext(e?: FormEvent) {
    e?.preventDefault();
    if (step === 0 && !nameOk) return;
    setSaving(true);
    try {
      await updateProfile({
        displayName: draft.displayName.trim(),
        location: draft.location.trim(),
        favoriteFaction: draft.favoriteFaction,
        bio: draft.bio.trim().slice(0, BIO_MAX),
      });
      go(step + 1);
    } catch {
      toast.error("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(url: string | null) {
    set("avatarUrl", url);
    try {
      await updateProfile({ avatarUrl: url });
    } catch {
      toast.error("No se pudo guardar la foto.");
    }
  }

  /** Leaves the wizard for good, optionally landing somewhere specific. */
  async function finish(to = "/") {
    setSaving(true);
    navigate(to);
    try {
      await updateProfile({ onboarded: true });
    } catch {
      setSaving(false);
      toast.error("No se pudo guardar. Inténtalo de nuevo.");
    }
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 32 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -32 }),
  };

  return (
    <div className="relative isolate min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img src="/images/landing-hero.jpg" alt="" className="h-full w-full object-cover opacity-[0.12]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
      </div>

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-4 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <img src="/images/logo.png" alt="Administratum" className="h-8 w-auto" />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
            Paso {step + 1} de {STEPS.length}
          </span>
          <Button variant="ghost" size="sm" onClick={() => finish(`${pathname}${search}`)} disabled={saving}>
            Saltar por ahora
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ol className="grid grid-cols-4 gap-2" aria-label="Progreso">
          {STEPS.map((label, i) => (
            <li key={label} className="space-y-1.5">
              <span className="block h-1 overflow-hidden rounded-full bg-muted">
                <motion.span
                  className="block h-full bg-brand-gradient"
                  initial={false}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className={cn("hidden text-[11px] sm:block", i === step ? "text-foreground" : "text-muted-foreground/70")}>{label}</span>
            </li>
          ))}
        </ol>
      </div>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:pt-12">
        <div className="min-w-0">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <form onSubmit={saveAndNext} className="space-y-8">
                  <StepHeading
                    eyebrow="Bienvenido a Administratum"
                    title={firstName ? `Hola, ${firstName}. Preséntate a la comunidad` : "Preséntate a la comunidad"}
                    text="Cuatro pasos rápidos para que otros jugadores te conozcan. Puedes cambiarlo todo después en Ajustes."
                  />
                  <div className="space-y-2">
                    <Label>Foto de perfil</Label>
                    <AvatarUploader avatarUrl={draft.avatarUrl} fallbackLabel={(draft.displayName.trim()[0] ?? "?").toUpperCase()} onChange={handleAvatar} />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ob-name">Nombre visible</Label>
                      <Input
                        id="ob-name"
                        value={draft.displayName}
                        onChange={(e) => set("displayName", e.target.value)}
                        maxLength={40}
                        placeholder="Cómo te verán los demás"
                        autoComplete="nickname"
                        autoFocus
                      />
                      {!nameOk && draft.displayName.length > 0 && (
                        <p className="text-xs text-destructive">Al menos 2 caracteres.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ob-location">Ubicación (opcional)</Label>
                      <Input
                        id="ob-location"
                        value={draft.location}
                        onChange={(e) => set("location", e.target.value)}
                        maxLength={60}
                        placeholder="Ciudad o provincia"
                        autoComplete="address-level2"
                      />
                      <p className="text-xs text-muted-foreground">Ayuda a encontrar rivales y torneos cerca de ti.</p>
                    </div>
                  </div>
                  <StepActions saving={saving} disabled={!nameOk} />
                </form>
              )}

              {step === 1 && (
                <form onSubmit={saveAndNext} className="space-y-6">
                  <StepHeading
                    eyebrow="Paso 2"
                    title="¿Qué ejército llevas a la mesa?"
                    text="Tu facción favorita aparece en tu perfil y nos ayuda a enseñarte contenido que te interese."
                  />
                  <FactionPicker factions={factions} value={draft.favoriteFaction} onChange={(v) => set("favoriteFaction", v)} />
                  <StepActions saving={saving} onBack={() => go(0)} />
                </form>
              )}

              {step === 2 && (
                <form onSubmit={saveAndNext} className="space-y-6">
                  <StepHeading
                    eyebrow="Paso 3"
                    title="Cuéntanos algo de ti"
                    text="Qué pintas, cómo juegas o qué buscas en la comunidad. Unas líneas bastan."
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ob-bio">Biografía</Label>
                      <span className={cn("text-xs tabular-nums", draft.bio.length > BIO_MAX ? "text-destructive" : "text-muted-foreground")}>
                        {draft.bio.length}/{BIO_MAX}
                      </span>
                    </div>
                    <Textarea
                      id="ob-bio"
                      value={draft.bio}
                      onChange={(e) => set("bio", e.target.value)}
                      rows={5}
                      maxLength={BIO_MAX}
                      placeholder="Ej.: Pinto Mil Hijos desde 2019 y juego torneos en Madrid. Siempre buscando esquemas de color nuevos."
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">¿No sabes por dónde empezar?</p>
                    <div className="flex flex-wrap gap-2">
                      {BIO_STARTERS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            const next = draft.bio.trim() ? `${draft.bio.trim()} ${s}` : s;
                            set("bio", next.slice(0, BIO_MAX));
                            requestAnimationFrame(() => {
                              const el = document.getElementById("ob-bio") as HTMLTextAreaElement | null;
                              el?.focus();
                              el?.setSelectionRange(el.value.length, el.value.length);
                            });
                          }}
                          className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                          {s.trim()}…
                        </button>
                      ))}
                    </div>
                  </div>
                  <StepActions saving={saving} onBack={() => go(1)} />
                </form>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <StepHeading
                    eyebrow="Todo listo"
                    title={firstName ? `Bienvenido, ${firstName}. ¿Por dónde empiezas?` : "¿Por dónde empiezas?"}
                    text="Tu perfil ya está visible para la comunidad. Elige tu primer paso o ve directamente al inicio."
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {suggestions(draft.favoriteFaction).map((s, i) => (
                      <button
                        key={s.key}
                        type="button"
                        disabled={saving}
                        onClick={() => (s.action === "photo" || s.action === "list" ? setDialog(s.action) : finish(s.action))}
                        className={cn(
                          "group flex items-start gap-3 rounded-2xl border p-4 text-left transition-[border-color,background-color,transform] duration-200 active:scale-[0.99] disabled:opacity-60",
                          i === 0 ? "border-primary/50 bg-brand-soft" : "border-border/60 bg-card/40 hover:border-primary/40 hover:bg-card/70",
                        )}
                      >
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-primary")}>
                          <s.icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            {s.title}
                            {i === 0 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Recomendado</span>}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{s.text}</span>
                        </span>
                        <ArrowRight className="ml-auto mt-3 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button variant="gradient" size="lg" className="gap-2" onClick={() => finish()} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Ir al inicio
                    </Button>
                    <Button variant="ghost" className="gap-2" onClick={() => go(2)} disabled={saving}>
                      <ArrowLeft className="h-4 w-4" /> Atrás
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className={cn("lg:block", step === 3 ? "block" : "hidden")}>
          <div className="lg:sticky lg:top-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Así te verán</p>
            <ProfilePreview draft={draft} faction={faction} />
          </div>
        </aside>
      </main>

      {dialog === "photo" && (
        <SharePhotoDialog
          onClose={() => setDialog(null)}
          onShared={() => {
            setDialog(null);
            toast.success("¡Tu primera foto ya está en la comunidad!");
            finish("/");
          }}
        />
      )}
      {dialog === "list" && (
        <ShareListDialog
          onClose={() => setDialog(null)}
          onShared={(list) => {
            setDialog(null);
            toast.success("¡Tu primera lista ya está publicada!");
            finish(`/comunidad/listas/${list.id}`);
          }}
        />
      )}
    </div>
  );
}

function StepActions({ saving, disabled, onBack }: { saving: boolean; disabled?: boolean; onBack?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button type="submit" variant="gradient" size="lg" className="gap-2" disabled={saving || disabled}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Continuar <ArrowRight className="h-4 w-4" />
      </Button>
      {onBack && (
        <Button type="button" variant="ghost" className="gap-2" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4" /> Atrás
        </Button>
      )}
    </div>
  );
}
