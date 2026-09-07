import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowRight,
    Check,
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    Lock,
    Palette,
} from "lucide-react";
import { useMemo, useState } from "react";

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
  return { score, label: pw ? labels[score] : "", color: colors[score] };
}

export function ResetPasswordScreen() {
  const { updatePassword, clearRecoveryMode, loading } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8)
      return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ha ocurrido un error.");
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-6">
      <div className="pointer-events-none absolute inset-0 spotlight" />
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-[0.15]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient glow-sm">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <span className="font-display text-lg font-bold tracking-widest">
            ADMINISTRATUM
          </span>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/60 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Contraseña actualizada
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Tu contraseña se ha cambiado correctamente. Ya puedes usar tu
                cuenta con normalidad.
              </p>
              <button
                type="button"
                onClick={clearRecoveryMode}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                  Elige una nueva contraseña
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Introduce y confirma tu nueva contraseña para recuperar el
                  acceso.
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="new-password"
                    className="text-sm font-medium text-foreground/90"
                  >
                    Nueva contraseña
                  </label>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      id="new-password"
                      type={show ? "text" : "password"}
                      value={password}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-xl border border-input bg-background/40 pl-11 pr-11 text-sm shadow-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-background/70 focus:ring-4 focus:ring-primary/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      tabIndex={-1}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {show ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {password && (
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
                      Seguridad:{" "}
                      <span className="font-medium">{strength.label}</span>
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirm-password"
                    className="text-sm font-medium text-foreground/90"
                  >
                    Confirmar contraseña
                  </label>
                  <div className="group relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      id="confirm-password"
                      type={show ? "text" : "password"}
                      value={confirm}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      onChange={(e) => setConfirm(e.target.value)}
                      className="h-12 w-full rounded-xl border border-input bg-background/40 pl-11 pr-11 text-sm shadow-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-background/70 focus:ring-4 focus:ring-primary/15"
                    />
                    {confirm && password === confirm && (
                      <Check className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Guardar nueva contraseña
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
