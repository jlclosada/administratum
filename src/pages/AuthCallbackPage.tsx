import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { takeReturnTo, useAuthStore } from "@/stores";
import type { EmailOtpType, Session } from "@supabase/supabase-js";
import { AlertTriangle, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const CONFIRM_PATH = "/auth/confirmar";

/**
 * What brought the user here. `flow=magiclink` is added by our own email
 * template, `flow=oauth` by the "Continuar con Google" redirect.
 */
type Flow = "signup" | "magiclink" | "recovery" | "invite" | "email_change" | "oauth";

type State =
  | { kind: "working" }
  | { kind: "error"; message: string; expired: boolean }
  | { kind: "resent"; email: string }
  | { kind: "done"; title: string; message: string };

const COPY: Record<
  Flow,
  { working: string; success: string; expired: string; resend: string | null; failTitle?: string }
> = {
  signup: {
    working: "Confirmando tu cuenta…",
    success: "¡Cuenta confirmada! Ya has iniciado sesión.",
    expired: "Los enlaces de confirmación solo sirven una vez. Si ya confirmaste la cuenta, inicia sesión; si no, te enviamos otro enlace.",
    resend: "Reenviar correo de confirmación",
  },
  magiclink: {
    working: "Iniciando sesión…",
    success: "Has iniciado sesión.",
    expired: "Los enlaces de acceso caducan en poco tiempo y solo sirven una vez. Inicia sesión con tu contraseña.",
    resend: null,
  },
  recovery: {
    working: "Comprobando el enlace…",
    success: "Elige tu nueva contraseña.",
    expired: "Los enlaces para restablecer la contraseña caducan en poco tiempo y solo sirven una vez. Pide uno nuevo.",
    resend: "Enviar un enlace nuevo",
  },
  invite: {
    working: "Aceptando la invitación…",
    success: "¡Bienvenido! Elige una contraseña para tu cuenta.",
    expired: "La invitación ha caducado o ya se ha utilizado. Pide a quien te invitó que te envíe otra.",
    resend: null,
  },
  oauth: {
    working: "Iniciando sesión con Google…",
    success: "Has iniciado sesión con Google.",
    failTitle: "No se pudo iniciar sesión con Google",
    expired: "Vuelve a intentarlo. Si el problema continúa, entra con tu correo y contraseña.",
    resend: null,
  },
  email_change: {
    working: "Confirmando tu nuevo correo…",
    success: "Correo electrónico actualizado.",
    expired: "El enlace ha caducado o ya se ha utilizado. Puedes volver a cambiar el correo desde Ajustes.",
    resend: null,
  },
};

function readParams() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const get = (k: string) => url.searchParams.get(k) ?? hash.get(k);
  const type = get("type");
  const flow: Flow =
    get("flow") === "oauth"
      ? "oauth"
      : get("flow") === "magiclink" || type === "magiclink"
        ? "magiclink"
        : type === "recovery" || type === "invite" || type === "email_change"
          ? type
          : "signup";
  // "signup"/"magiclink" are deprecated verifyOtp types; both are "email" now.
  const otpType: EmailOtpType | null =
    type === "signup" || type === "magiclink" ? "email" : (type as EmailOtpType | null);
  return {
    flow,
    tokenHash: get("token_hash"),
    otpType,
    code: url.searchParams.get("code"),
    errorCode: get("error_code") ?? get("error"),
    errorDescription: get("error_description"),
  };
}

/**
 * Landing page for every auth email: account confirmation, password reset,
 * sign-in link, invitation and email change. Handles the custom templates'
 * `?token_hash=&type=` links (verified here, so they work on any device and
 * survive mail scanners that open links), a PKCE `?code=`, or the default
 * templates' `#access_token` (consumed by the Supabase client on load).
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const init = useAuthStore((s) => s.init);
  const [params] = useState(readParams);
  const copy = COPY[params.flow];
  const [state, setState] = useState<State>({ kind: "working" });
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    init();
    const { flow, tokenHash, otpType, code, errorCode, errorDescription } = params;
    const expiredState: State = {
      kind: "error",
      expired: true,
      message: copy.failTitle ?? "El enlace ha caducado o ya se ha utilizado.",
    };

    (async () => {
      if (errorCode || errorDescription) {
        const expired = /expired|invalid|otp/i.test(`${errorCode} ${errorDescription}`);
        setState(
          expired || flow === "oauth"
            ? expiredState
            : { kind: "error", expired: false, message: "No se pudo completar la acción con este enlace." },
        );
        return;
      }
      try {
        let session: Session | null = null;
        if (tokenHash && otpType) {
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
          if (error) throw error;
          session = data.session;
          // Secure email change sends a link to both addresses; the first one
          // confirmed succeeds without a session.
          if (!session && flow === "email_change") {
            setState({
              kind: "done",
              title: "Enlace confirmado",
              message: "Para terminar el cambio, abre también el enlace que te hemos enviado a la otra dirección de correo.",
            });
            return;
          }
        } else if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          session = data.session;
        } else {
          session = (await supabase.auth.getSession()).data.session;
        }
        if (!session) throw new Error("Sin sesión");

        // Signing up with Google skips the terms checkbox; the button's notice
        // stands in for it, so record the consent the same way.
        if (flow === "oauth" && !session.user.user_metadata?.terms_accepted_at) {
          void supabase.auth.updateUser({ data: { terms_accepted_at: new Date().toISOString() } });
        }

        const setPassword = flow === "recovery" || flow === "invite";
        useAuthStore.setState({
          user: session.user,
          session,
          initialized: true,
          ...(setPassword ? { recoveryMode: true } : {}),
        });
        navigate(flow === "email_change" ? "/settings" : setPassword ? "/" : takeReturnTo(), { replace: true });
        // The app's toaster mounts with the next screen.
        setTimeout(() => toast.success(copy.success), 300);
      } catch {
        setState(expiredState);
      }
    })();
  }, [init, navigate, params, copy]);

  async function handleResend() {
    const address = email.trim();
    if (!address) return;
    setResending(true);
    const { error } =
      params.flow === "recovery"
        ? await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/` })
        : await supabase.auth.resend({
            type: "signup",
            email: address,
            options: { emailRedirectTo: `${window.location.origin}${CONFIRM_PATH}` },
          });
    setResending(false);
    if (error) {
      toast.error("No se pudo enviar el correo. Revisa la dirección o espera unos minutos e inténtalo de nuevo.");
      return;
    }
    setState({ kind: "resent", email: address });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Seo title="Confirmación" path={CONFIRM_PATH} noindex />
      <div className="w-full max-w-sm space-y-5 text-center">
        <img src="/images/logo.png" alt="Administratum" className="mx-auto h-10 w-auto" />

        {state.kind === "working" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{copy.working}</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold">{state.message}</h1>
            <p className="text-sm text-muted-foreground">
              {state.expired ? copy.expired : "Prueba a iniciar sesión o pide un enlace nuevo."}
            </p>
            <div className="space-y-2 text-left">
              {copy.resend && (
                <>
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
                    {copy.resend}
                  </Button>
                </>
              )}
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
              Hemos enviado un enlace nuevo a <span className="font-medium text-foreground">{state.email}</span>. Si no
              lo ves en unos minutos, revisa la carpeta de spam.
            </p>
          </div>
        )}

        {state.kind === "done" && (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="font-display text-xl font-bold">{state.title}</h1>
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/", { replace: true })}>
              Volver al inicio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
