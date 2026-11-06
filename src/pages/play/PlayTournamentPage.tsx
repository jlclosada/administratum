import { useFactions } from "@/components/matrix/factions";
import { FactionAvatar } from "@/components/matrix/MatrixParts";
import { JoinDialog, ListDialog, PaymentDialog, RegisterDialog } from "@/components/play/EntryDialogs";
import { ListView, MatchCard, PaymentPill, PlayHeader, RosterChips, StandingsTable } from "@/components/play/PlayBits";
import { usePlayData, type PlayView } from "@/components/play/usePlayData";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { leavePlayEntry, updatePlayEntry } from "@/db";
import { csvName, downloadCsv, gamesCsv, standingsCsv } from "@/lib/play/exportCsv";
import { useIsAdmin } from "@/lib/admin";
import { copyText } from "@/lib/clipboard";
import {
  capacityLabel,
  ENTRY_STATUS_LABEL,
  entryNoun,
  feeLabel,
  fmtDateTime,
  formatSummary,
  listsEditable,
  listsVisible,
  PAIRING_LABEL,
  registrationOpen,
  SCORING_LABEL,
  TEAM_PAIRING_LABEL,
  whereLabel,
} from "@/lib/play/labels";
import type { PlayEntryPlayer, PlayList } from "@/lib/play/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { ChevronDown, ClipboardCopy, Download, FileText, Loader2, LogOut, Settings, Swords, Trophy, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type Tab = "info" | "inscritos" | "listas" | "rondas" | "clasificacion";

/**
 * A tournament organised in Administratum: everything a player needs —
 * details and rules pack, sign-up, their entry (payment, team code, lists),
 * the rounds with live scores and the standings.
 */
export function PlayTournamentPage() {
  const { tournamentId } = useParams();
  const { view, reload } = usePlayData(tournamentId);
  const user = useAuthStore((s) => s.user);
  const openAuth = useAuthStore((s) => s.openAuth);
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("info");
  const [dialog, setDialog] = useState<"register" | "join" | null>(null);

  if (view === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (view === null) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h1 className="font-display text-2xl font-bold">Torneo no encontrado</h1>
        <p className="text-sm text-muted-foreground">Puede que aún sea un borrador o que se haya borrado.</p>
        <Button asChild variant="gradient">
          <Link to="/competitivo/torneos">Ver calendario</Link>
        </Button>
      </div>
    );
  }

  const t = view.tournament;
  const canManage = view.isOrganizer || isAdmin;
  const registered = view.entries.filter((e) => e.status === "registered");
  const waitlist = view.entries.filter((e) => e.status === "waitlist");
  const open = registrationOpen(t);
  const requireUser = (fn: () => void) => () => (user ? fn() : openAuth("signup"));
  const myGame = (() => {
    if (!view.myEntry || !view.rounds.length) return null;
    const last = view.rounds[view.rounds.length - 1]!;
    const match = view.matches.find((m) => m.roundId === last.id && (m.entryA === view.myEntry!.id || m.entryB === view.myEntry!.id));
    return match ? { match, round: last } : null;
  })();
  const tabs: [Tab, string][] = [
    ["info", "Información"],
    ["inscritos", `Inscritos ${registered.length}/${t.maxEntries}`],
    ["listas", "Listas"],
    ["rondas", `Rondas${view.rounds.length ? ` ${view.rounds.length}/${t.rounds}` : ""}`],
    ["clasificacion", "Clasificación"],
  ];

  return (
    <PageTransition>
      <Seo title={t.name} description={t.description || `${formatSummary(t)} a ${t.pointsLimit} puntos · ${whereLabel(t)}`} path={`/torneos/${t.id}`} />
      <div className="mx-auto max-w-6xl space-y-6">
        <PlayHeader t={t}>
          {canManage && (
            <Button asChild variant="outline" className="gap-2">
              <Link to={`/torneos/${t.id}/gestionar`}>
                <Settings className="h-4 w-4" /> Gestionar
              </Link>
            </Button>
          )}
          {open && !view.myEntry && (
            <Button variant="gradient" className="gap-2" onClick={requireUser(() => setDialog("register"))}>
              <UserPlus className="h-4 w-4" /> {t.teamSize === 1 ? "Inscribirme" : t.teamSize === 2 ? "Inscribir pareja" : "Inscribir equipo"}
            </Button>
          )}
          {t.teamSize > 1 && !view.myEntry && (t.status === "open" || t.status === "closed") && (
            <Button variant="outline" className="gap-2" onClick={requireUser(() => setDialog("join"))}>
              <Users className="h-4 w-4" /> Unirme a un equipo
            </Button>
          )}
          {myGame && (
            <Button variant="gradient" className="gap-2" onClick={() => navigate(`/torneos/${t.id}/partidas/${myGame.match.id}`)}>
              <Swords className="h-4 w-4" /> Mi partida · Ronda {myGame.round.number}
            </Button>
          )}
        </PlayHeader>

        {view.myEntry && <MyEntryPanel view={view} onChange={reload} />}

        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" aria-label="Secciones">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                tab === key ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "info" && <InfoTab view={view} />}
        {tab === "inscritos" && (
          <div className="space-y-6">
            <EntryGrid view={view} ids={registered.map((e) => e.id)} empty={`Aún no hay ${entryNoun(t, true)} inscritos.`} />
            {waitlist.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-bold">Lista de espera</h2>
                <EntryGrid view={view} ids={waitlist.map((e) => e.id)} empty="" />
              </section>
            )}
          </div>
        )}
        {tab === "listas" && <ListsTab view={view} />}
        {tab === "rondas" && <RoundsTab view={view} />}
        {tab === "clasificacion" && (
          <div className="space-y-4">
            <StandingsTable view={view} />
            {view.table.some((r) => r.played) && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadCsv(csvName(t, "clasificacion"), standingsCsv(view))}>
                  <Download className="h-3.5 w-3.5" /> Clasificación (CSV)
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadCsv(csvName(t, "partidas"), gamesCsv(view))}>
                  <Download className="h-3.5 w-3.5" /> Partidas (CSV)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {dialog === "register" && (
        <RegisterDialog view={view} open onClose={() => setDialog(null)} onDone={() => (setDialog(null), reload())} />
      )}
      {dialog === "join" && <JoinDialog view={view} open onClose={() => setDialog(null)} onDone={() => (setDialog(null), reload())} />}
    </PageTransition>
  );
}

function InfoTab({ view }: { view: PlayView }) {
  const t = view.tournament;
  const facts: [string, string][] = [
    ["Formato", `${formatSummary(t)} · ${t.pointsLimit} puntos`],
    ["Rondas", `${t.rounds} · ${PAIRING_LABEL[t.pairingSystem]}`],
    ...(t.teamSize > 1
      ? ([
          ["Cruces", TEAM_PAIRING_LABEL[t.teamPairing]],
          ["Puntuación", SCORING_LABEL[t.scoring]],
        ] as [string, string][])
      : []),
    ["Plazas", capacityLabel(t)],
    ["Inscripción", feeLabel(t)],
    ...(t.registrationDeadline ? ([["Cierre de inscripción", fmtDateTime(t.registrationDeadline)]] as [string, string][]) : []),
    ...(t.listDeadline ? ([["Límite de listas", fmtDateTime(t.listDeadline)]] as [string, string][]) : []),
    ["Misiones", t.missionPack],
    ["Lugar", [whereLabel(t), t.address].filter(Boolean).join(" · ")],
  ];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        {t.description && <p className="text-lg text-muted-foreground">{t.description}</p>}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <FileText className="h-4 w-4 text-primary" /> Bases
          </h2>
          {t.rules ? (
            <div className="whitespace-pre-wrap rounded-2xl border border-border/60 bg-card/30 p-4 text-sm leading-relaxed">{t.rules}</div>
          ) : (
            <p className="text-sm text-muted-foreground">La organización aún no ha publicado las bases.</p>
          )}
        </section>
      </div>
      <dl className="space-y-2">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border/60 bg-card/30 p-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="text-sm font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EntryGrid({ view, ids, empty }: { view: PlayView; ids: string[]; empty: string }) {
  if (!ids.length) return empty ? <p className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">{empty}</p> : null;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ids.map((id) => {
        const e = view.entryById.get(id)!;
        const players = view.playersOf(id);
        return (
          <li key={id} className={cn("space-y-2 rounded-2xl border bg-card/40 p-4", view.myEntry?.id === id ? "border-primary/50" : "border-border/60")}>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold">{e.name}</p>
              {view.tournament.teamSize > 1 && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {players.length}/{view.tournament.teamSize}
                </span>
              )}
            </div>
            <RosterChips players={players} />
          </li>
        );
      })}
    </ul>
  );
}

function ListsTab({ view }: { view: PlayView }) {
  const t = view.tournament;
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = listsVisible(t) || view.isOrganizer;
  const byPlayer = new Map(view.lists.map((l) => [l.entryPlayerId, l]));
  if (!visible) {
    return (
      <p className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
        Las listas se hacen públicas {t.listDeadline ? `el ${fmtDateTime(t.listDeadline)}` : "cuando la organización las publique"}. Hasta entonces solo las ve cada {entryNoun(t)} y la organización.
      </p>
    );
  }
  const entries = view.entries.filter((e) => e.status === "registered");
  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="space-y-2 rounded-2xl border border-border/60 bg-card/30 p-3">
          {t.teamSize > 1 && <p className="px-1 font-semibold">{e.name}</p>}
          {view.playersOf(e.id).map((p) => {
            const list = byPlayer.get(p.id);
            const isOpen = openId === p.id;
            return (
              <div key={p.id}>
                <button
                  type="button"
                  disabled={!list}
                  onClick={() => setOpenId(isOpen ? null : p.id)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-accent disabled:hover:bg-transparent"
                >
                  <PlayerLine player={p} list={list} />
                  {list ? <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} /> : <span className="text-xs text-muted-foreground">Sin lista</span>}
                </button>
                {isOpen && list && (
                  <div className="mt-2">
                    <ListView text={list.listText} author={p.displayName} />
                  </div>
                )}
              </div>
            );
          })}
        </li>
      ))}
    </ul>
  );
}

function PlayerLine({ player, list }: { player: PlayEntryPlayer; list?: PlayList }) {
  const factions = useFactions();
  const faction = list?.faction || player.faction;
  return (
    <>
      <FactionAvatar factions={factions} faction={faction} className="h-9 w-9" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{player.displayName}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {faction || "Sin ejército"}
          {list?.detachment ? ` · ${list.detachment}` : ""}
        </span>
      </span>
    </>
  );
}

function RoundsTab({ view }: { view: PlayView }) {
  if (!view.rounds.length) {
    return <p className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">Los emparejamientos aparecerán aquí cuando empiece el torneo.</p>;
  }
  return (
    <div className="space-y-6">
      {[...view.rounds].reverse().map((round) => (
        <section key={round.id} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-bold">Ronda {round.number}</h2>
            <span className="text-xs text-muted-foreground">
              {[round.deployment, round.layout && `Layout ${round.layout}`].filter(Boolean).join(" · ")}
              {round.status === "finished" ? " · Terminada" : " · En juego"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {view.matches
              .filter((m) => m.roundId === round.id)
              .map((m) => (
                <MatchCard key={m.id} view={view} match={m} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** The signed-in user's entry: status, payment, team code, roster and lists. */
function MyEntryPanel({ view, onChange }: { view: PlayView; onChange: () => void }) {
  const t = view.tournament;
  const entry = view.myEntry!;
  const user = useAuthStore((s) => s.user);
  const [dialog, setDialog] = useState<{ kind: "payment" } | { kind: "list"; player: PlayEntryPlayer } | null>(null);
  const players = view.playersOf(entry.id);
  const payment = view.payments.find((p) => p.entryId === entry.id);
  const lists = new Map(view.lists.map((l) => [l.entryPlayerId, l]));
  const captain = entry.captainId === user?.id;
  const editable = listsEditable(t);
  const changeable = t.status === "open" || t.status === "closed";
  const me = players.find((p) => p.userId === user?.id);

  async function withdraw() {
    if (!window.confirm(`¿Retirar ${t.teamSize === 1 ? "tu inscripción" : `a ${entry.name}`} del torneo?`)) return;
    try {
      await updatePlayEntry(entry.id, { withdraw: true });
      toast.success("Inscripción retirada.");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function removePlayer(p: PlayEntryPlayer) {
    if (!window.confirm(`¿Quitar a ${p.displayName} del equipo?`)) return;
    try {
      if (p.userId === user?.id && !captain) await leavePlayEntry(p.id);
      else await updatePlayEntry(entry.id, { players: [{ id: p.id, remove: true }] });
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-primary/30 bg-brand-soft p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Tu inscripción</p>
          <h2 className="font-display text-2xl font-black">{entry.name}</h2>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                entry.status === "registered" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-400/15 text-amber-200",
              )}
            >
              {ENTRY_STATUS_LABEL[entry.status]}
            </span>
            {payment && <PaymentPill status={payment.status} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {payment && t.entryFee > 0 && payment.status !== "paid" && payment.status !== "waived" && (
            <Button variant="gradient" size="sm" onClick={() => setDialog({ kind: "payment" })}>
              {payment.status === "submitted" ? "Cambiar justificante" : "He pagado"}
            </Button>
          )}
          {changeable && captain && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={withdraw}>
              <LogOut className="h-3.5 w-3.5" /> Retirar
            </Button>
          )}
        </div>
      </div>

      {entry.status === "waitlist" && <p className="text-sm text-amber-200">Estás en lista de espera: si alguien se retira, entras automáticamente.</p>}
      {payment?.status === "rejected" && payment.organizerNote && <p className="text-sm text-red-300">La organización dice: {payment.organizerNote}</p>}

      {t.teamSize > 1 && captain && changeable && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-3">
          <span className="text-sm">Código para que se unan tus compañeros:</span>
          <span className="font-mono text-lg font-bold tracking-[0.3em]">{entry.joinCode}</span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              copyText(`Únete a ${entry.name} en ${t.name}: ${window.location.origin}/torneos/${t.id} · código ${entry.joinCode}`).then(() =>
                toast.success("Invitación copiada."),
              )
            }
          >
            <ClipboardCopy className="h-3.5 w-3.5" /> Copiar invitación
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {players.map((p) => {
          const list = lists.get(p.id);
          const canEdit = editable && (captain || p.userId === user?.id);
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-2.5">
              <PlayerLine player={p} list={list} />
              <span className={cn("hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:inline-flex", list ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-400/15 text-amber-200")}>
                {list ? "Lista enviada" : "Falta lista"}
              </span>
              {canEdit && (
                <Button variant={list ? "outline" : "gradient"} size="sm" onClick={() => setDialog({ kind: "list", player: p })}>
                  {list ? "Editar lista" : "Subir lista"}
                </Button>
              )}
              {changeable && ((captain && p.userId !== user?.id) || (!captain && p.id === me?.id)) && (
                <Button variant="ghost" size="sm" onClick={() => removePlayer(p)} aria-label={p.userId === user?.id ? "Salir del equipo" : `Quitar a ${p.displayName}`}>
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {t.teamSize > 1 && players.length < t.teamSize && (
        <p className="text-sm text-muted-foreground">
          Faltan {t.teamSize - players.length} {t.teamSize - players.length === 1 ? "jugador" : "jugadores"}. Comparte el código para que se unan.
        </p>
      )}
      {!editable && (t.status === "open" || t.status === "closed") && <p className="text-xs text-muted-foreground">El plazo de listas ha terminado.</p>}

      {dialog?.kind === "payment" && (
        <PaymentDialog view={view} entry={entry} payment={payment} open onClose={() => setDialog(null)} onDone={() => (setDialog(null), onChange())} />
      )}
      {dialog?.kind === "list" && (
        <ListDialog view={view} player={dialog.player} current={lists.get(dialog.player.id)} open onClose={() => setDialog(null)} onDone={() => (setDialog(null), onChange())} />
      )}
    </section>
  );
}
