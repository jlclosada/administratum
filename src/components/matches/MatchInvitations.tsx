import { MatchInvitePicker } from "@/components/matches/MatchInvitePicker";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { acceptMatchInvitation, declineMatchInvitation, inviteToMatch, sendMatchInviteEmails, withdrawMatchInvitation } from "@/db";
import { clearPendingInvite } from "@/lib/pendingInvite";
import type { MatchInvitation, MatchInvitee, Profile } from "@/types";
import { Check, Loader2, Mail, Send, Swords, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * "X te ha invitado a esta partida": accept (with an army) or decline. Works
 * for an invited player (by id) and for the email link (token); a visitor
 * without an account is asked to sign up first.
 */
export function InvitationBanner({
  hostName,
  invitationId,
  token,
  signedIn,
  factions,
  defaultFaction,
  onSignUp,
  onDone,
}: {
  hostName: string;
  invitationId?: string;
  token?: string;
  signedIn: boolean;
  factions: string[];
  defaultFaction: string;
  onSignUp: () => void;
  onDone: (accepted: boolean) => void;
}) {
  const [faction, setFaction] = useState(defaultFaction);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  async function answer(accept: boolean) {
    setBusy(accept ? "accept" : "decline");
    try {
      if (accept) await acceptMatchInvitation({ id: invitationId, token, faction: faction || null });
      else await declineMatchInvitation({ id: invitationId, token });
      clearPendingInvite();
      toast.success(accept ? "¡Invitación aceptada! Ya tienes tu plaza." : "Invitación rechazada");
      onDone(accept);
    } catch (err) {
      toast.error((err as Error).message || "No se pudo responder a la invitación.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-primary/50 bg-brand-soft p-5 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Swords className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{hostName} te ha invitado a esta partida</p>
        <p className="text-sm text-muted-foreground">
          {signedIn ? "Tienes una plaza reservada. Acepta para entrar en el chat y ver la dirección exacta." : "Crea tu cuenta gratis (o inicia sesión) para aceptarla."}
        </p>
      </div>
      {signedIn ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={faction}
            onChange={(e) => setFaction(e.target.value)}
            className="h-9 rounded-md border border-input bg-background/60 px-3 text-sm"
            aria-label="Tu ejército"
          >
            <option value="">Ejército por decidir</option>
            {factions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => answer(false)} disabled={busy !== null}>
            {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Rechazar
          </Button>
          <Button variant="gradient" size="sm" className="gap-1.5" onClick={() => answer(true)} disabled={busy !== null}>
            {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aceptar
          </Button>
        </div>
      ) : (
        <Button variant="gradient" onClick={onSignUp}>
          Crear cuenta y aceptar
        </Button>
      )}
    </section>
  );
}

const STATUS_LABEL: Record<MatchInvitation["status"], string> = { pending: "Pendiente", accepted: "Aceptada", declined: "Rechazada" };

/** The host's invitations: who was invited, their answer, withdraw, invite more. */
export function HostInvitations({
  matchId,
  invitations,
  profiles,
  seatsLeft,
  exclude,
  onChange,
}: {
  matchId: string;
  invitations: MatchInvitation[];
  profiles: Map<string, Profile>;
  seatsLeft: number;
  exclude: string[];
  onChange: () => void;
}) {
  const [draft, setDraft] = useState<MatchInvitee[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const shown = invitations.filter((i) => i.status !== "accepted");

  async function send() {
    setBusy("send");
    let ok = 0;
    for (const i of draft) {
      try {
        await inviteToMatch(matchId, i);
        ok += 1;
      } catch (err) {
        toast.error(`${i.kind === "user" ? i.profile.displayName : i.email}: ${(err as Error).message}`);
      }
    }
    if (ok) {
      await sendMatchInviteEmails(matchId).catch(() => toast.warning("Invitación creada, pero no se pudo enviar el correo."));
      toast.success(ok === 1 ? "Invitación enviada" : `${ok} invitaciones enviadas`);
    }
    setDraft([]);
    setBusy(null);
    onChange();
  }

  async function withdraw(id: string) {
    setBusy(id);
    try {
      await withdrawMatchInvitation(id);
      onChange();
    } catch {
      toast.error("No se pudo retirar la invitación.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-5">
      <h2 className="font-semibold">Invitar a un rival</h2>
      {shown.length > 0 && (
        <ul className="space-y-2">
          {shown.map((i) => {
            const p = i.invitedUser ? profiles.get(i.invitedUser) : undefined;
            return (
              <li key={i.id} className="flex items-center gap-2.5 text-sm">
                {p ? (
                  <UserAvatar src={p.avatarUrl} name={p.displayName} size="sm" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{p?.displayName ?? i.email ?? "Jugador"}</span>
                <span className={i.status === "declined" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{STATUS_LABEL[i.status]}</span>
                <button
                  type="button"
                  onClick={() => withdraw(i.id)}
                  disabled={busy === i.id}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  aria-label={i.status === "pending" ? "Retirar invitación" : "Quitar de la lista"}
                  title={i.status === "pending" ? "Retirar y liberar la plaza" : "Quitar"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <MatchInvitePicker value={draft} onChange={setDraft} max={seatsLeft} exclude={exclude} disabled={busy === "send"} />
      {draft.length > 0 && (
        <Button className="w-full gap-2" onClick={send} disabled={busy === "send"}>
          {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Enviar {draft.length === 1 ? "invitación" : `${draft.length} invitaciones`}
        </Button>
      )}
      {seatsLeft === 0 && draft.length === 0 && <p className="text-xs text-muted-foreground">No quedan plazas libres para invitar.</p>}
    </section>
  );
}
