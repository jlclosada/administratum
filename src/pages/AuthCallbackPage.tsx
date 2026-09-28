import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores";
import type { EmailOtpType } from "@supabase/supabase-js";
import { AlertTriangle, Loader2, MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const CONFIRM_PATH = "/auth/confirmar";

type State =
  | { kind: "working" }
  | { kind: "error"; message: string; expired: boolean }
  | { kind: "resent"; email: string };

function readParams() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const get = (k: string) => url.searchParams.get(k) ?? hash.get(k);
  return {
    tokenHash: get("token_hash"),
    type: get("type") as EmailOtpType | null,
    code: url.searchParams.get("code"),
    errorCode: get("error_code") ?? get("error"),
    errorDescription: get("error_description"),
  };
}

/**
 * Landing page of the account-confirmation email. Handles every shape the
 * link can take — the recommended `?token_hash=` template (verified here,
 * so it also works when the email is opened on another device), a PKCE
 * `?code=`, or the default template's `#access_token` (consumed by the
 * Supabase client on load) — then drops the user into the app signed in.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const init = useAuthStore((s) => s.init);
  const [state, setState] = useState<State>({ kind: "working" });
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    init();
    const { tokenHash, type, code, errorCode, errorDescription } = readParams();

    (async () => {
      if (errorCode || errorDescription) {
        const expired = /expired|invalid|otp/i.test(`${errorCode} ${errorDescription}`);
        setState({
          kind: "error",
          expired,
          message: expired
            ? "El enlace ha caducado o ya se ha utilizado."
            : "No se pudo confirmar la cuenta con este enlace.",
        });
        return;
      }
      try {
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
          if (type === "recovery") useAuthStore.setState({ recoveryMode: true });
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Sin sesión");
        useAuthStore.setState({ user: data.session.user, session: data.session, initialized: true });
        navigate("/", { replace: true });
        // The app's toaster mounts with the next screen.
        setTimeout(
          () =>
            toast.success(type === "recovery" ? "Elige tu nueva contraseña" : "¡Cuenta confirmada! Ya has iniciado sesión."),
          300,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        setState({
          kind: "error",
          expired: /expired|invalid|otp|Sin sesión/i.test(message),
          message: "El enlace ha caducado o ya se ha utilizado.",
        });
      }
    })();
  }, [init, navigate]);

  async function handleResend() {
    if (!email.trim()) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}${CONFIRM_PATH}` },
    });
    setResending(false);
    if (error) {
      toast.error("No se pudo reenviar el correo. Revisa la dirección e inténtalo de nuevo.");
      return;
    }
    setState({ kind: "resent", email: email.trim() });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <img src="/images/logo.png" alt="Administratum" className="mx-auto h-10 w-auto" />

        {state.kind === "working" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Confirmando tu cuenta…</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold">{state.message}</h1>
            <p className="text-sm text-muted-foreground">
              {state.expired
                ? "Los enlaces de confirmación solo sirven una vez. Si ya confirmaste la cuenta, inicia sesión; si no, te enviamos otro enlace."
                : "Prueba a iniciar sesión o pide un enlace nuevo."}
            </p>
            <div className="space-y-2 text-left">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                aria-label="Correo electrónico"
                autoComplete="email"
              />
              <Button className="w-full" disabled={resending || !email.trim()} onClick={handleResend}>
                {resending && <Loader2 className="h-4 w-4 animate-spin" />}
                Reenviar correo de confirmación
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/", { replace: true })}>
                Ir a iniciar sesión
              </Button>
            </div>
          </div>
        )}

        {state.kind === "resent" && (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <MailCheck className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold">Correo enviado</h1>
            <p className="text-sm text-muted-foreground">
              Hemos enviado un enlace nuevo a <span className="font-medium text-foreground">{state.email}</span>. Ábrelo y
              entrarás directamente en tu cuenta.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
