import { useFactions } from "@/components/matrix/factions";
import { FactionPicker } from "@/components/matrix/FactionPicker";
import { MatchCard, PaymentPill, PlayHeader, RosterChips, StandingsTable } from "@/components/play/PlayBits";
import { usePlayData, type PlayView } from "@/components/play/usePlayData";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  addEntryByOrganizer,
  createPlayRound,
  deleteEntry,
  deletePlayRound,
  deletePlayTournament,
  getReceiptUrl,
  setEntryDropped,
  setEntryStatus,
  setPaymentStatus,
  setPlayRoundStatus,
  updatePlayTournament,
} from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { copyText } from "@/lib/clipboard";
import { DEPLOYMENTS, LAYOUTS } from "@/lib/play/missions";
import { csvName, downloadCsv, entriesCsv, gamesCsv, standingsCsv } from "@/lib/play/exportCsv";
import { ENTRY_STATUS_LABEL, entryNoun, listsVisible } from "@/lib/play/labels";
import { matchResult } from "@/lib/play/standings";
import { shuffle, swissPairings, type Pairing } from "@/lib/play/swiss";
import type { PaymentStatus, PlayEntry, PlayStatus } from "@/lib/play/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { ArrowLeft, ClipboardCopy, Download, Eye, Loader2, Pencil, Plus, Shuffle, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

type Tab = "panel" | "inscripciones" | "rondas" | "clasificacion";

const run = async (fn: () => Promise<unknown>, ok?: string) => {
  try {
    await fn();
    if (ok) toast.success(ok);
    return true;
  } catch (err) {
    toast.error((err as Error).message);
    return false;
  }
};

/** Organiser's console: status, entries and payments, rounds and pairings, standings. */
export function ManageTournamentPage() {
  const { tournamentId } = useParams();
  const { view, reload } = usePlayData(tournamentId);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<Tab>("panel");

  if (view === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (view === null || (view.tournament.organizerId !== user?.id && !isAdmin)) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">No puedes gestionar este torneo</h1>
        <Button asChild variant="gradient">
          <Link to="/competitivo/organizar">Mis torneos</Link>
        </Button>
      </div>
    );
  }

  const t = view.tournament;
  const pendingPayments = view.payments.filter((p) => p.status === "submitted").length;
  const tabs: [Tab, string][] = [
    ["panel", "Panel"],
    ["inscripciones", `Inscripciones${pendingPayments ? ` · ${pendingPayments} por validar` : ""}`],
    ["rondas", `Rondas ${view.rounds.length}/${t.rounds}`],
    ["clasificacion", "Clasificación"],
  ];

  return (
    <PageTransition>
      <Seo title={`Gestionar ${t.name}`} path={`/torneos/${t.id}/gestionar`} noindex />
      <div className="mx-auto max-w-6xl space-y-6">
        <Link to="/competitivo/organizar" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Mis torneos
        </Link>
        <PlayHeader t={t}>
          <Button asChild variant="outline" className="gap-2">
            <Link to={`/torneos/${t.id}`}>
              <Eye className="h-4 w-4" /> Ver como jugador
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to={`/torneos/${t.id}/editar`}>
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => copyText(`${window.location.origin}/torneos/${t.id}`).then(() => toast.success("Enlace copiado."))}
          >
            <ClipboardCopy className="h-4 w-4" /> Copiar enlace
          </Button>
        </PlayHeader>

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

        {tab === "panel" && <PanelTab view={view} reload={reload} goRounds={() => setTab("rondas")} />}
        {tab === "inscripciones" && <EntriesTab view={view} reload={reload} />}
        {tab === "rondas" && <RoundsTab view={view} reload={reload} />}
        {tab === "clasificacion" && <StandingsTable view={view} />}
      </div>
    </PageTransition>
  );
}

// ---------------------------------------------------------------- panel

function PanelTab({ view, reload, goRounds }: { view: PlayView; reload: () => void; goRounds: () => void }) {
  const t = view.tournament;
  const navigate = useNavigate();
  const registered = view.entries.filter((e) => e.status === "registered");
  const waitlist = view.entries.filter((e) => e.status === "waitlist");
  const activePlayers = view.players.filter((p) => registered.some((e) => e.id === p.entryId));
  const paid = view.payments.filter((p) => registered.some((e) => e.id === p.entryId) && (p.status === "paid" || p.status === "waived"));
  const listsIn = view.lists.filter((l) => activePlayers.some((p) => p.id === l.entryPlayerId));
  const allRoundsDone = view.rounds.length >= t.rounds && view.rounds.every((r) => r.status === "finished");

  const setStatus = (status: PlayStatus, ok: string) => run(() => updatePlayTournament(t.id, { status }), ok).then(reload);

  const stats: [string, string, string?][] = [
    [`${registered.length}/${t.maxEntries}`, `${entryNoun(t, true)} inscritos`],
    [`${waitlist.length}`, "en lista de espera"],
    [`${activePlayers.length}`, "jugadores"],
    [`${paid.length}/${registered.length}`, "pagos validados", view.payments.some((p) => p.status === "submitted") ? "text-sky-300" : undefined],
    [`${listsIn.length}/${activePlayers.length}`, "listas recibidas"],
    [`${view.rounds.length}/${t.rounds}`, "rondas"],
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([n, label, tone]) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <p className={cn("font-display text-3xl font-black tabular-nums", tone)}>{n}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3 rounded-3xl border border-border/60 bg-card/30 p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold">Estado del torneo</h2>
        <div className="flex flex-wrap gap-2">
          {t.status === "draft" && (
            <Button variant="gradient" onClick={() => setStatus("open", "Torneo publicado: ya se pueden inscribir.")}>
              Publicar y abrir inscripción
            </Button>
          )}
          {t.status === "open" && (
            <Button variant="outline" onClick={() => setStatus("closed", "Inscripción cerrada.")}>
              Cerrar inscripción
            </Button>
          )}
          {t.status === "closed" && (
            <Button variant="outline" onClick={() => setStatus("open", "Inscripción reabierta.")}>
              Reabrir inscripción
            </Button>
          )}
          {(t.status === "open" || t.status === "closed" || t.status === "in_progress") && view.rounds.length < t.rounds && (
            <Button variant="gradient" onClick={goRounds}>
              {view.rounds.length ? `Preparar ronda ${view.rounds.length + 1}` : "Empezar el torneo: ronda 1"}
            </Button>
          )}
          {t.status === "in_progress" && (
            <Button variant={allRoundsDone ? "gradient" : "outline"} onClick={() => window.confirm("¿Dar el torneo por terminado?") && setStatus("finished", "¡Torneo finalizado!")}>
              Finalizar torneo
            </Button>
          )}
          {!listsVisible(t) && t.status !== "draft" && (
            <Button variant="outline" onClick={() => run(() => updatePlayTournament(t.id, { listsPublic: true }), "Listas publicadas.").then(reload)}>
              Publicar listas ya
            </Button>
          )}
          {t.status !== "cancelled" && t.status !== "finished" && t.status !== "draft" && (
            <Button variant="ghost" className="text-destructive" onClick={() => window.confirm("¿Cancelar el torneo? Los inscritos lo verán como cancelado.") && setStatus("cancelled", "Torneo cancelado.")}>
              Cancelar torneo
            </Button>
          )}
          {(t.status === "draft" || t.status === "cancelled") && (
            <Button
              variant="ghost"
              className="gap-1.5 text-destructive"
              onClick={async () => {
                if (!window.confirm("¿Borrar el torneo y todos sus datos? No se puede deshacer.")) return;
                if (await run(() => deletePlayTournament(t.id), "Torneo borrado.")) navigate("/competitivo/organizar");
              }}
            >
              <Trash2 className="h-4 w-4" /> Borrar
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t.status === "draft" && "Solo tú lo ves. Publícalo cuando esté listo para abrir las inscripciones."}
          {t.status === "open" && "Los jugadores pueden inscribirse. Al llenarse las plazas, las nuevas inscripciones pasan a lista de espera."}
          {t.status === "closed" && "No se admiten más inscripciones. Los inscritos aún pueden ajustar plantillas y listas hasta el límite."}
          {t.status === "in_progress" && "El torneo está en marcha: genera cada ronda cuando termine la anterior."}
          {t.status === "finished" && "Torneo terminado. La clasificación queda publicada."}
          {t.status === "cancelled" && "Torneo cancelado."}
        </p>
      </section>

      <section className="space-y-3 rounded-3xl border border-border/60 bg-card/30 p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold">Exportar</h2>
        <p className="text-sm text-muted-foreground">Archivos CSV que se abren en Excel o Google Sheets.</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["Clasificación", "clasificacion", standingsCsv],
              ["Partidas y resultados", "partidas", gamesCsv],
              ["Inscripciones y pagos", "inscripciones", entriesCsv],
            ] as const
          ).map(([label, file, make]) => (
            <Button key={file} variant="outline" className="gap-2" onClick={() => downloadCsv(csvName(t, file), make(view))}>
              <Download className="h-4 w-4" /> {label}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- entries & payments

const FILTERS = [
  ["all", "Todos"],
  ["submitted", "Pago por validar"],
  ["pending", "Sin pagar"],
  ["waitlist", "Lista de espera"],
  ["withdrawn", "Retirados"],
] as const;

function EntriesTab({ view, reload }: { view: PlayView; reload: () => void }) {
  const t = view.tournament;
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [adding, setAdding] = useState(false);
  const payment = (id: string) => view.payments.find((p) => p.entryId === id);
  const shown = view.entries.filter((e) => {
    const p = payment(e.id);
    if (filter === "all") return e.status !== "withdrawn";
    if (filter === "submitted") return p?.status === "submitted";
    if (filter === "pending") return e.status !== "withdrawn" && (p?.status === "pending" || p?.status === "rejected");
    return e.status === filter;
  });

  const pay = (e: PlayEntry, status: PaymentStatus) => {
    const note = status === "rejected" ? (window.prompt("¿Por qué se rechaza? (lo verá el equipo)") ?? "") : "";
    run(() => setPaymentStatus(e.id, status, note)).then(reload);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", filter === key ? "border-primary bg-primary/15" : "border-border/60 text-muted-foreground")}
          >
            {label}
          </button>
        ))}
        <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={() => setAdding(true)}>
          <UserPlus className="h-3.5 w-3.5" /> Añadir a mano
        </Button>
      </div>

      {shown.length === 0 && <p className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">Nada por aquí.</p>}

      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {shown.map((e) => {
          const p = payment(e.id);
          const players = view.playersOf(e.id);
          const lists = view.lists.filter((l) => l.entryId === e.id).length;
          return (
            <li key={e.id} className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        e.status === "registered" ? "bg-emerald-500/15 text-emerald-300" : e.status === "waitlist" ? "bg-amber-400/15 text-amber-200" : "bg-background/60 text-muted-foreground",
                      )}
                    >
                      {ENTRY_STATUS_LABEL[e.status]}
                      {e.dropped ? " · abandona" : ""}
                    </span>
                    {p && <PaymentPill status={p.status} />}
                    <span className="rounded-full bg-background/60 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                      Listas {lists}/{players.length}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {players.length}/{t.teamSize}
                </span>
              </div>
              <RosterChips players={players} />
              {p && (p.reference || p.receiptPath) && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-background/40 p-2.5 text-xs">
                  {p.reference && <span>Ref.: {p.reference}</span>}
                  {p.receiptPath && (
                    <button
                      type="button"
                      className="font-medium text-primary underline"
                      onClick={async () => {
                        const url = await getReceiptUrl(p.receiptPath!);
                        if (url) window.open(url, "_blank", "noopener");
                        else toast.error("No se pudo abrir el justificante.");
                      }}
                    >
                      Ver justificante
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {p && p.status !== "paid" && t.entryFee > 0 && (
                  <Button size="sm" variant="gradient" onClick={() => pay(e, "paid")}>
                    Marcar pagado
                  </Button>
                )}
                {p && p.status === "submitted" && (
                  <Button size="sm" variant="outline" onClick={() => pay(e, "rejected")}>
                    Rechazar pago
                  </Button>
                )}
                {p && p.status !== "waived" && p.status !== "paid" && (
                  <Button size="sm" variant="ghost" onClick={() => pay(e, "waived")}>
                    Exento
                  </Button>
                )}
                {e.status === "waitlist" && (
                  <Button size="sm" variant="outline" onClick={() => run(() => setEntryStatus(e.id, "registered"), "Inscrito.").then(reload)}>
                    Pasar a inscrito
                  </Button>
                )}
                {e.status === "registered" && t.status !== "in_progress" && t.status !== "finished" && (
                  <Button size="sm" variant="ghost" onClick={() => window.confirm(`¿Retirar a ${e.name}?`) && run(() => setEntryStatus(e.id, "withdrawn")).then(reload)}>
                    Retirar
                  </Button>
                )}
                {e.status === "registered" && t.status === "in_progress" && (
                  <Button size="sm" variant="ghost" onClick={() => run(() => setEntryDropped(e.id, !e.dropped), e.dropped ? "Vuelve a emparejarse." : "No se emparejará en las próximas rondas.").then(reload)}>
                    {e.dropped ? "Vuelve al torneo" : "Abandona"}
                  </Button>
                )}
                {e.status === "withdrawn" && (
                  <Button size="sm" variant="ghost" onClick={() => run(() => setEntryStatus(e.id, "registered"), "Inscripción recuperada.").then(reload)}>
                    Recuperar
                  </Button>
                )}
                {!view.matches.some((m) => m.entryA === e.id || m.entryB === e.id) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    aria-label={`Eliminar ${e.name}`}
                    onClick={() => window.confirm(`¿Eliminar a ${e.name} y sus datos?`) && run(() => deleteEntry(e.id)).then(reload)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {adding && <AddEntryDialog view={view} onClose={() => setAdding(false)} onDone={() => (setAdding(false), reload())} />}
    </div>
  );
}

function AddEntryDialog({ view, onClose, onDone }: { view: PlayView; onClose: () => void; onDone: () => void }) {
  const t = view.tournament;
  const factions = useFactions();
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(() => Array.from({ length: t.teamSize }, () => ({ displayName: "", faction: "" })));
  const [paid, setPaid] = useState(t.entryFee === 0);
  const [busy, setBusy] = useState(false);
  const filled = players.filter((p) => p.displayName.trim());

  async function submit() {
    setBusy(true);
    const ok = await run(
      () => addEntryByOrganizer(t.id, ((t.teamSize === 1 ? filled[0]?.displayName : name) ?? "").trim(), filled, paid),
      "Inscripción añadida.",
    );
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogTitle className="font-display text-xl">Añadir inscripción</DialogTitle>
        <p className="text-sm text-muted-foreground">Para jugadores sin cuenta o que se apuntan en la tienda.</p>
        {t.teamSize > 1 && <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} placeholder={`Nombre ${t.teamSize === 2 ? "de la pareja" : "del equipo"}`} className="h-11" />}
        <ul className="space-y-2">
          {players.map((p, i) => (
            <li key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-border/60 p-2.5 sm:grid-cols-2">
              <Input
                value={p.displayName}
                onChange={(e) => setPlayers(players.map((x, k) => (k === i ? { ...x, displayName: e.target.value.slice(0, 60) } : x)))}
                placeholder={`Jugador ${i + 1}`}
                className="h-12 rounded-xl"
              />
              <FactionPicker factions={factions} value={p.faction} onChange={(f) => setPlayers(players.map((x, k) => (k === i ? { ...x, faction: f } : x)))} who={p.displayName || `Jugador ${i + 1}`} />
            </li>
          ))}
        </ul>
        {t.entryFee > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Ya ha pagado
          </label>
        )}
        <Button variant="gradient" size="lg" disabled={busy || !filled.length || (t.teamSize > 1 && !name.trim())} onClick={submit}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Añadir
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- rounds

function RoundsTab({ view, reload }: { view: PlayView; reload: () => void }) {
  const t = view.tournament;
  const next = view.rounds.length + 1;
  const [proposal, setProposal] = useState<Pairing[] | null>(null);
  const [deployment, setDeployment] = useState("");
  const [layout, setLayout] = useState("");
  const [busy, setBusy] = useState(false);
  const active = view.entries.filter((e) => e.status === "registered" && !e.dropped);
  const lastRound = view.rounds[view.rounds.length - 1];
  const lastOpen = lastRound && view.matches.filter((m) => m.roundId === lastRound.id).some((m) => !matchResult(t, m, view.games).final);

  function generate() {
    const ids = active.map((e) => e.id);
    const ranked = view.rounds.length === 0 ? shuffle(ids) : view.table.map((r) => r.entryId).filter((id) => ids.includes(id));
    const played = view.matches.filter((m) => m.entryB).map((m) => [m.entryA, m.entryB!] as [string, string]);
    const byes = view.matches.filter((m) => !m.entryB).map((m) => m.entryA);
    setProposal(swissPairings(ranked, played, byes));
  }

  /** Put entry `id` in a slot, swapping with wherever it was. */
  function place(table: number, side: "a" | "b", id: string | null) {
    if (!proposal) return;
    const current = proposal.find((p) => p.table === table)![side];
    setProposal(
      proposal.map((p) => {
        let a = p.a as string | null;
        let b = p.b;
        if (p.table === table) {
          if (side === "a") a = id;
          else b = id;
        } else {
          if (a === id) a = current;
          if (b === id) b = current;
        }
        return { ...p, a: a ?? "", b };
      }),
    );
  }

  const played = new Set(view.matches.filter((m) => m.entryB).map((m) => [m.entryA, m.entryB].sort().join("|")));
  const rematches = proposal?.filter((p) => p.b && played.has([p.a, p.b].sort().join("|"))).length ?? 0;

  async function publish() {
    if (!proposal) return;
    if (lastOpen && !window.confirm(`La ronda ${lastRound!.number} aún tiene resultados sin confirmar. ¿Publicar la ronda ${next} igualmente?`)) return;
    setBusy(true);
    const ok = await run(
      () =>
        createPlayRound(
          t.id,
          next,
          proposal.filter((p) => p.a).map((p) => ({ a: p.a, b: p.b, table: p.table })),
          deployment,
          layout,
        ),
      `Ronda ${next} publicada.`,
    );
    if (ok && lastRound && lastRound.status !== "finished") await setPlayRoundStatus(lastRound.id, "finished").catch(() => undefined);
    setBusy(false);
    if (ok) {
      setProposal(null);
      reload();
    }
  }

  return (
    <div className="space-y-6">
      {view.rounds.length < t.rounds && t.status !== "draft" && t.status !== "cancelled" && t.status !== "finished" && (
        <section className="space-y-4 rounded-3xl border border-primary/30 bg-brand-soft p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">Ronda {next}</h2>
              <p className="text-sm text-muted-foreground">
                {active.length} {entryNoun(t, true)} en juego ·{" "}
                {view.rounds.length === 0 ? "sorteo aleatorio" : t.pairingSystem === "swiss" ? "emparejamiento suizo por clasificación" : "emparejamiento manual"}
              </p>
            </div>
            <Button variant={proposal ? "outline" : "gradient"} className="gap-2" disabled={active.length < 2} onClick={generate}>
              <Shuffle className="h-4 w-4" /> {proposal ? "Volver a generar" : "Generar emparejamientos"}
            </Button>
          </div>
          {active.length < 2 && <p className="text-sm text-amber-200">Hacen falta al menos dos {entryNoun(t, true)} inscritos.</p>}
          {proposal && (
            <>
              <ul className="space-y-2">
                {proposal.map((p) => (
                  <li key={p.table} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-2">
                    <span className="font-mono text-xs text-muted-foreground">M{p.table}</span>
                    <select value={p.a} onChange={(e) => place(p.table, "a", e.target.value)} className="h-10 min-w-0 rounded-lg border border-input bg-background/60 px-2 text-sm" aria-label={`Mesa ${p.table}, lado A`}>
                      {active.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <select
                      value={p.b ?? ""}
                      onChange={(e) => place(p.table, "b", e.target.value || null)}
                      className={cn("h-10 min-w-0 rounded-lg border bg-background/60 px-2 text-sm", p.b && played.has([p.a, p.b].sort().join("|")) ? "border-amber-400" : "border-input")}
                      aria-label={`Mesa ${p.table}, lado B`}
                    >
                      <option value="">Descansa (bye)</option>
                      {active.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
              {rematches > 0 && <p className="text-sm text-amber-200">Hay {rematches} enfrentamiento(s) que ya se jugaron.</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Despliegue de la ronda</span>
                  <select value={deployment} onChange={(e) => setDeployment(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm">
                    <option value="">Lo sortean los jugadores</option>
                    {DEPLOYMENTS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Layout de escenografía</span>
                  <select value={layout} onChange={(e) => setLayout(e.target.value)} className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm">
                    <option value="">El recomendado para cada cruce</option>
                    {LAYOUTS.map((l) => (
                      <option key={l} value={l}>
                        Layout {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Button variant="gradient" size="lg" className="w-full gap-2" disabled={busy} onClick={publish}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publicar ronda {next}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t.teamSize === 1
                  ? "Al publicar se crea la partida de cada mesa."
                  : "Al publicar, cada enfrentamiento tendrá su página: los capitanes hacen su matriz en secreto y fijan los cruces de sus jugadores."}
              </p>
            </>
          )}
        </section>
      )}

      {[...view.rounds].reverse().map((round) => {
        const matches = view.matches.filter((m) => m.roundId === round.id);
        const done = matches.filter((m) => matchResult(t, m, view.games).final).length;
        const isLast = round.id === lastRound?.id;
        return (
          <section key={round.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">
                Ronda {round.number} <span className="text-sm font-normal text-muted-foreground">· {done}/{matches.length} terminadas</span>
              </h2>
              <div className="flex gap-1.5">
                {round.status !== "finished" && (
                  <Button size="sm" variant="outline" onClick={() => run(() => setPlayRoundStatus(round.id, "finished"), `Ronda ${round.number} cerrada.`).then(reload)}>
                    Cerrar ronda
                  </Button>
                )}
                {isLast && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive"
                    onClick={() => window.confirm(`¿Borrar la ronda ${round.number} con sus partidas y resultados?`) && run(() => deletePlayRound(round.id), "Ronda borrada.").then(reload)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Borrar
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {matches.map((m) => (
                <MatchCard key={m.id} view={view} match={m} />
              ))}
            </div>
          </section>
        );
      })}

      {view.rounds.length >= t.rounds && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Plus className="h-4 w-4" /> Ya están todas las rondas. Cuando se confirmen los resultados, finaliza el torneo desde el panel.
        </p>
      )}
    </div>
  );
}
