import { FactionPicker } from "@/components/matrix/FactionPicker";
import { useDetachments, useFactions } from "@/components/matrix/factions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getMyTeams,
  getProfilesByIds,
  getTeamMembers,
  joinPlayEntry,
  registerForPlay,
  savePlayList,
  submitPlayPayment,
  updatePlayEntry,
  type TeamWithRole,
} from "@/db";
import { parseArmyListExport, sumUnitPoints } from "@/lib/armyListParser";
import { feeLabel } from "@/lib/play/labels";
import type { PlayEntry, PlayEntryPlayer, PlayList, PlayPayment } from "@/lib/play/types";
import { cn } from "@/lib/utils";
import { useAuthStore, useProfileStore } from "@/stores";
import { Check, FileUp, Loader2, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { PlayView } from "./usePlayData";

function Sheet({ open, onClose, title, description, children }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-xl sm:p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="border-b border-border/60 p-4 pr-12 sm:p-5 sm:pr-12">
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          {description && <DialogDescription className="mt-1 text-sm">{description}</DialogDescription>}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

const errorText = (err: unknown) => (err as { message?: string })?.message ?? "No se pudo completar.";

// ---------------------------------------------------------------- register

interface Pick {
  userId: string;
  name: string;
  faction: string;
  checked: boolean;
}

/**
 * Sign up: on your own (singles), or a team/pair — straight from one of your
 * Administratum teams (choosing who plays when it has more members than
 * needed) or just with a name, so teammates join with the code.
 */
export function RegisterDialog({ view, open, onClose, onDone }: { view: PlayView; open: boolean; onClose: () => void; onDone: () => void }) {
  const t = view.tournament;
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const factions = useFactions();
  const myName = profile?.displayName || user?.email?.split("@")[0] || "Jugador";
  const [name, setName] = useState("");
  const [faction, setFaction] = useState("");
  const [teams, setTeams] = useState<TeamWithRole[] | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [busy, setBusy] = useState(false);
  const single = t.teamSize === 1;

  useEffect(() => {
    if (open && !single && user) getMyTeams().then(setTeams);
  }, [open, single, user]);

  useEffect(() => {
    if (!teamId || !user) return setPicks([]);
    (async () => {
      const members = await getTeamMembers(teamId);
      const profiles = await getProfilesByIds(members.map((m) => m.userId));
      setPicks(
        members.map((m) => ({
          userId: m.userId,
          name: profiles.get(m.userId)?.displayName || "Jugador",
          faction: "",
          checked: m.userId === user.id,
        })),
      );
      setName(teams?.find((x) => x.id === teamId)?.name ?? "");
    })();
  }, [teamId, user, teams]);

  const chosen = picks.filter((p) => p.checked);
  const duplicated = t.uniqueFactions && new Set(chosen.map((p) => p.faction).filter(Boolean)).size < chosen.filter((p) => p.faction).length;

  async function submit() {
    if (!user) return;
    setBusy(true);
    try {
      const players = single
        ? [{ userId: user.id, displayName: myName, faction }]
        : teamId
          ? chosen.map((p) => ({ userId: p.userId, displayName: p.name, faction: p.faction }))
          : [{ userId: user.id, displayName: myName, faction }];
      await registerForPlay(t.id, single ? myName : name.trim(), teamId, players);
      toast.success("¡Inscripción hecha!");
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = single ? true : name.trim().length >= 1 && (!teamId || (chosen.length >= 1 && chosen.length <= t.teamSize && !duplicated));

  return (
    <Sheet open={open} onClose={onClose} title={single ? "Inscribirme" : t.teamSize === 2 ? "Inscribir pareja" : "Inscribir equipo"} description={feeLabel(t)}>
      {single ? (
        <div className="space-y-2">
          <p className="text-sm">
            Te inscribes como <strong>{myName}</strong>.
          </p>
          <span className="text-sm font-medium">Ejército</span>
          <FactionPicker factions={factions} value={faction} onChange={setFaction} who={myName} />
          <p className="text-xs text-muted-foreground">Puedes cambiarlo al subir tu lista.</p>
        </div>
      ) : (
        <>
          {teams && teams.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">¿Inscribes uno de tus equipos?</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTeamId(null)}
                  aria-pressed={!teamId}
                  className={cn("rounded-full border px-3 py-1.5 text-sm", !teamId ? "border-primary bg-primary/15" : "border-border/60 text-muted-foreground")}
                >
                  No, solo el nombre
                </button>
                {teams.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => setTeamId(x.id)}
                    aria-pressed={teamId === x.id}
                    className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", teamId === x.id ? "border-primary bg-primary/15" : "border-border/60 text-muted-foreground")}
                  >
                    <Users className="h-3.5 w-3.5" /> {x.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Nombre {t.teamSize === 2 ? "de la pareja" : "del equipo"}</span>
            <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder="Ej.: Los Osos de Ultramar" className="h-11" />
          </label>
          {teamId ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                ¿Quién juega? <span className="text-muted-foreground">({chosen.length} de {t.teamSize})</span>
              </p>
              {picks.length > t.teamSize && <p className="text-xs text-muted-foreground">Tu equipo tiene {picks.length} miembros: elige los {t.teamSize} que participan.</p>}
              <ul className="space-y-2">
                {picks.map((p, i) => (
                  <li key={p.userId} className={cn("space-y-2 rounded-xl border p-2.5", p.checked ? "border-primary/40 bg-primary/5" : "border-border/60")}>
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={p.checked}
                        disabled={!p.checked && chosen.length >= t.teamSize}
                        onChange={(e) => setPicks(picks.map((x, k) => (k === i ? { ...x, checked: e.target.checked } : x)))}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                      <span className="text-sm font-medium">{p.name}</span>
                      {p.userId === user?.id && <span className="text-xs text-muted-foreground">(tú, capitán)</span>}
                    </label>
                    {p.checked && (
                      <FactionPicker factions={factions} value={p.faction} onChange={(f) => setPicks(picks.map((x, k) => (k === i ? { ...x, faction: f } : x)))} who={p.name} />
                    )}
                  </li>
                ))}
              </ul>
              {duplicated && <p className="text-xs text-amber-300">En este torneo no se pueden repetir facciones dentro de un equipo.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-sm font-medium">Tu ejército</span>
              <FactionPicker factions={factions} value={faction} onChange={setFaction} who={myName} />
              <p className="text-xs text-muted-foreground">Al inscribirte tendrás un código para que tus compañeros se unan.</p>
            </div>
          )}
        </>
      )}
      {t.entryFee > 0 && t.paymentInfo && <p className="rounded-xl border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">{t.paymentInfo}</p>}
      <Button variant="gradient" size="lg" className="w-full gap-2" disabled={busy || !canSubmit} onClick={submit}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar inscripción
      </Button>
    </Sheet>
  );
}

// ---------------------------------------------------------------- join a team entry

export function JoinDialog({ view, open, onClose, onDone }: { view: PlayView; open: boolean; onClose: () => void; onDone: () => void }) {
  const t = view.tournament;
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const factions = useFactions();
  const myName = profile?.displayName || user?.email?.split("@")[0] || "Jugador";
  const [entryId, setEntryId] = useState("");
  const [code, setCode] = useState("");
  const [faction, setFaction] = useState("");
  const [busy, setBusy] = useState(false);
  const withRoom = view.entries.filter((e) => e.status !== "withdrawn" && view.playersOf(e.id).length < t.teamSize);

  async function submit() {
    setBusy(true);
    try {
      await joinPlayEntry(entryId, code, myName, faction);
      toast.success("¡Ya formas parte del equipo!");
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Unirme a un equipo inscrito" description="Pide el código a tu capitán. Si estáis en el mismo equipo de Administratum no hace falta.">
      {withRoom.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ahora mismo no hay equipos con plazas libres.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {withRoom.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setEntryId(e.id)}
                  aria-pressed={entryId === e.id}
                  className={cn("flex w-full items-center justify-between rounded-xl border p-3 text-left", entryId === e.id ? "border-primary bg-primary/10" : "border-border/60")}
                >
                  <span>
                    <span className="block font-medium">{e.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {view.playersOf(e.id).length} de {t.teamSize} jugadores
                    </span>
                  </span>
                  {entryId === e.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Código del equipo</span>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="ABC123" className="h-11 font-mono uppercase tracking-widest" />
          </label>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Tu ejército</span>
            <FactionPicker factions={factions} value={faction} onChange={setFaction} who={myName} />
          </div>
          <Button variant="gradient" size="lg" className="w-full gap-2" disabled={busy || !entryId} onClick={submit}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Unirme
          </Button>
        </>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------- payment

export function PaymentDialog({
  view,
  entry,
  payment,
  open,
  onClose,
  onDone,
}: {
  view: PlayView;
  entry: PlayEntry;
  payment: PlayPayment | undefined;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = view.tournament;
  const [reference, setReference] = useState(payment?.reference ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await submitPlayPayment(t.id, entry.id, reference.trim(), file);
      toast.success("Enviado: la organización validará tu pago.");
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Justificante de pago" description={feeLabel(t)}>
      {t.paymentInfo && <p className="whitespace-pre-wrap rounded-xl border border-border/60 bg-background/40 p-3 text-sm">{t.paymentInfo}</p>}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Referencia</span>
        <Input value={reference} onChange={(e) => setReference(e.target.value.slice(0, 200))} placeholder="Ej.: Bizum del 12/11 a nombre de Ana" className="h-11" />
      </label>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm hover:bg-accent">
        <FileUp className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">{file ? file.name : payment?.receiptPath ? "Ya enviaste un justificante. Sube otro si quieres cambiarlo." : "Adjuntar captura o PDF (opcional)"}</span>
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <p className="text-xs text-muted-foreground">Solo lo ve la organización del torneo.</p>
      <Button variant="gradient" size="lg" className="w-full gap-2" disabled={busy || (!reference.trim() && !file)} onClick={submit}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar
      </Button>
    </Sheet>
  );
}

// ---------------------------------------------------------------- army list

export function ListDialog({
  view,
  player,
  current,
  open,
  onClose,
  onDone,
}: {
  view: PlayView;
  player: PlayEntryPlayer;
  current: PlayList | undefined;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = view.tournament;
  const factions = useFactions();
  const [text, setText] = useState(current?.listText ?? "");
  const [faction, setFaction] = useState(current?.faction || player.faction);
  const [detachment, setDetachment] = useState(current?.detachment ?? "");
  const [busy, setBusy] = useState(false);
  const detachments = useDetachments(faction);
  const parsed = useMemo(() => (text.trim() ? parseArmyListExport(text) : null), [text]);
  const points = parsed ? sumUnitPoints(parsed) + (parsed.detachmentPoints ?? 0) : null;

  // Fill faction and detachment from the pasted export.
  useEffect(() => {
    if (!parsed) return;
    const match = factions.find((f) => f.name.toLowerCase() === parsed.factionName.toLowerCase() || f.es?.toLowerCase() === parsed.factionName.toLowerCase());
    if (match && !faction) setFaction(match.name);
    if (parsed.detachmentName && !detachment) setDetachment(parsed.detachmentName);
    // Only when the text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed]);

  async function submit() {
    setBusy(true);
    try {
      await savePlayList({ entryPlayerId: player.id, tournamentId: t.id, entryId: player.entryId, faction, detachment, listText: text.trim() });
      if (faction && faction !== player.faction) await updatePlayEntry(player.entryId, { players: [{ id: player.id, faction }] }).catch(() => undefined);
      toast.success("Lista guardada.");
      onDone();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Lista de ${player.displayName}`} description={`${t.pointsLimit} puntos · pega la exportación de la app oficial de Warhammer 40.000`}>
      <Textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 20000))} rows={10} placeholder="Pega aquí tu lista…" className="font-mono text-xs" />
      {parsed && (
        <p className={cn("rounded-xl border p-3 text-sm", points && points > t.pointsLimit ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/30 bg-emerald-500/10")}>
          {parsed.factionName}
          {parsed.detachmentName ? ` · ${parsed.detachmentName}` : ""} · {points} puntos
          {points && points > t.pointsLimit ? ` (pasa de ${t.pointsLimit})` : ""}
        </p>
      )}
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Ejército</span>
        <FactionPicker factions={factions} value={faction} onChange={(f) => (setFaction(f), setDetachment(""))} who={player.displayName} />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Destacamento</span>
        {detachments.length > 0 ? (
          <select value={detachment} onChange={(e) => setDetachment(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm">
            <option value="">Elige destacamento…</option>
            {[...new Set([...(detachment && !detachments.includes(detachment) ? [detachment] : []), ...detachments])].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        ) : (
          <Input value={detachment} onChange={(e) => setDetachment(e.target.value.slice(0, 120))} placeholder="Nombre del destacamento" className="h-11" />
        )}
      </label>
      <Button variant="gradient" size="lg" className="w-full gap-2" disabled={busy || !text.trim()} onClick={submit}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar lista
      </Button>
    </Sheet>
  );
}
