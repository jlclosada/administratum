import { Button } from "@/components/ui/button";
import { getAppConfig } from "@/db";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    AtSign,
    Check,
    CheckCircle2,
    Eye,
    EyeOff,
    Images,
    Loader2,
    Lock,
    Palette,
    ShieldCheck,
    Sparkles,
    Swords,
    User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Mode = "login" | "signup" | "reset";

const features = [
  {
    icon: Swords,
    title: "Organiza tus ejércitos",
    desc: "Juegos, ejércitos y miniaturas en una jerarquía clara.",
  },
  {
    icon: Palette,
    title: "Registra tu pintura",
    desc: "Guías paso a paso y tu inventario de pinturas.",
  },
  {
    icon: Images,
    title: "Galería y listas",
    desc: "Sube fotos, crea listas de ejército y expórtalas en PDF.",
  },
];

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Excelente"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-emerald-500",
  ];
  return {
    score,
    label: pw ? labels[score] : "",
    color: colors[score],
  };
}

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}

function Field({
  id,
  label,
  type = "text",
  icon: Icon,
  value,
  onChange,
  placeholder,
  autoComplete,
  rightSlot,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground/90">
        {label}
      </label>
      <div className="group relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-12 w-full rounded-xl border border-input bg-background/40 pl-11 pr-11 text-sm shadow-sm outline-none transition-all",
            "placeholder:text-muted-foreground/60",
            "focus:border-primary/60 focus:bg-background/70 focus:ring-4 focus:ring-primary/15",
          )}
        />
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

export function AuthPage({
  initialMode = "login",
  onBack,
}: {
  initialMode?: Mode;
  onBack?: () => void;
} = {}) {
  const { signIn, signUp, resetPassword, loading } = useAuthStore();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [signupsEnabled, setSignupsEnabled] = useState(true);

  useEffect(() => {
    getAppConfig()
      .then((cfg) => {
        setSignupsEnabled(cfg.signupsEnabled);
        if (!cfg.signupsEnabled) setMode("login");
      })
      .catch(() => {});
  }, []);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const resetFeedback = () => {
    setError(null);
    setInfo(null);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetFeedback();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (mode === "reset") {
      if (!email) return setError("Introduce tu correo electrónico.");
      try {
        await resetPassword(email);
        setInfo("Te hemos enviado un enlace para restablecer tu contraseña.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha ocurrido un error.");
      }
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) return setError("Introduce tu nombre.");
      if (!email) return setError("Introduce tu correo electrónico.");
      if (password.length < 8)
        return setError("La contraseña debe tener al menos 8 caracteres.");
      if (password !== confirm) return setError("Las contraseñas no coinciden.");
      if (!accepted) return setError("Debes aceptar los términos para continuar.");

      try {
        const { needsConfirmation } = await signUp(email, password, name.trim());
        if (needsConfirmation) {
          setInfo(
            "¡Cuenta creada! Revisa tu correo y confirma tu cuenta para empezar.",
          );
          setMode("login");
          setPassword("");
          setConfirm("");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha ocurrido un error.");
      }
      return;
    }

    // login
    if (!email || !password)
      return setError("Introduce tu correo y contraseña.");
    try {
      await signIn(email, password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos."
            : err.message
          : "Ha ocurrido un error.",
      );
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 spotlight" />
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-[0.15]" />

      {/* ---------- Left brand panel ---------- */}
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden p-12 lg:flex xl:w-1/2">
        <div className="pointer-events-none absolute inset-0 bg-brand-soft" />
        <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-brand-gradient opacity-25 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-brand-gradient opacity-20 blur-3xl animate-float-slow" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient glow-sm">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <span className="font-display text-lg font-bold tracking-widest text-foreground">
            ADMINISTRATUM
          </span>
        </div>

        {/* Headline + features */}
        <div className="relative z-10 max-w-md">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Tu taller de miniaturas, reinventado
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground xl:text-5xl">
            Domina tu colección de{" "}
            <span className="text-gradient animate-gradient">wargaming</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Gestiona ejércitos, registra tus procesos de pintura y organiza cada
            miniatura con una experiencia diseñada para hobbyistas exigentes.
          </p>

          <div className="mt-10 space-y-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/50 backdrop-blur">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer trust */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Tus datos están protegidos y cifrados. Solo tú accedes a tu colección.
        </div>
      </div>

      {/* ---------- Right form panel ---------- */}
      <div className="relative z-10 flex w-full flex-1 items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </button>
          )}
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient glow-sm">
              <Palette className="h-6 w-6 text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-widest">
              ADMINISTRATUM
            </span>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/60 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                {mode === "login" && "Bienvenido de nuevo"}
                {mode === "signup" && "Crea tu cuenta"}
                {mode === "reset" && "Recupera tu acceso"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "login" && "Inicia sesión para continuar con tu colección."}
                {mode === "signup" && "Únete y empieza a organizar tu hobby."}
                {mode === "reset" &&
                  "Introduce tu correo y te enviaremos un enlace."}
              </p>
            </div>

            {/* Segmented control */}
            {mode !== "reset" && signupsEnabled && (
              <div className="relative mb-6 grid grid-cols-2 rounded-xl border border-border/60 bg-muted/40 p-1">
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className="relative z-10 rounded-lg py-2 text-sm font-semibold transition-colors"
                  >
                    <span
                      className={
                        mode === m ? "text-white" : "text-muted-foreground"
                      }
                    >
                      {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
                    </span>
                    {mode === m && (
                      <motion.span
                        layoutId="auth-tab"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute inset-0 -z-10 rounded-lg bg-brand-gradient shadow"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Alerts */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
              {info && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-500">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{info}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence initial={false} mode="popLayout">
                {mode === "signup" && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Field
                      id="name"
                      label="Nombre"
                      icon={UserIcon}
                      value={name}
                      onChange={setName}
                      placeholder="Tu nombre de hobbyista"
                      autoComplete="name"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Field
                id="email"
                label="Correo electrónico"
                type="email"
                icon={AtSign}
                value={email}
                onChange={setEmail}
                placeholder="tu@correo.com"
                autoComplete="email"
              />

              {mode !== "reset" && (
                <Field
                  id="password"
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  icon={Lock}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showPassword ? "Ocultar" : "Mostrar"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
              )}

              {/* Password strength (signup) */}
              {mode === "signup" && password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          i < strength.score ? strength.color : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Seguridad: <span className="font-medium">{strength.label}</span>
                  </p>
                </div>
              )}

              {mode === "signup" && (
                <Field
                  id="confirm"
                  label="Confirmar contraseña"
                  type={showPassword ? "text" : "password"}
                  icon={Lock}
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  rightSlot={
                    confirm && password === confirm ? (
                      <Check className="mr-1.5 h-4 w-4 text-emerald-500" />
                    ) : undefined
                  }
                />
              )}

              {/* Options row */}
              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                    />
                    Recordarme
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {mode === "signup" && (
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
                  />
                  <span>
                    Acepto los{" "}
                    <span className="font-medium text-foreground">
                      términos del servicio
                    </span>{" "}
                    y la política de privacidad.
                  </span>
                </label>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-gradient text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {mode === "login" && "Entrar"}
                    {mode === "signup" && "Crear mi cuenta"}
                    {mode === "reset" && "Enviar enlace"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              {mode === "reset" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => switchMode("login")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver a iniciar sesión
                </Button>
              )}
            </form>
          </div>

          {mode !== "reset" && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? "¿Aún no tienes cuenta? " : "¿Ya tienes cuenta? "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "Regístrate gratis" : "Inicia sesión"}
              </button>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
