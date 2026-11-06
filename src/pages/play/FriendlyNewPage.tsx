import { FactionPicker } from "@/components/matrix/FactionPicker";
import { useFactions } from "@/components/matrix/factions";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFriendlyGame, getMatch, getMatchPlayers, getProfilesByIds, searchProfiles } from "@/db";
import { parseArmyListExport, sumUnitPoints } from "@/lib/armyListParser";
import { cn } from "@/lib/utils";
import { useAuthStore, useProfileStore } from "@/stores";
import type { Profile } from "@/types";
import { ArrowLeft, ChevronDown, Dices, Loader2, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const POINTS = [500, 1000, 1500, 2000, 2500, 3000];
const today = () => new Date().toISOString().slice(0, 10);

function ListField({ value, onChange, who }: { value: string; onChange: (v: string) => void; who: string }) {
  const [open, setOpen] = useState(!!value);
  const parsed = useMemo(() => (value.trim() ? parseArmyListExport(value) : null), [value]);
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 text-sm font-medium text-primary" aria-expanded={open}>
        {value ? "Lista añadida" : `Añadir la lista de ${who} (opcional)`}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <Textarea value={value} onChange={(e) => onChange(e.target.value.slice(0, 20000))} rows={6} placeholder="Pega la exportación de la app oficial…" className="font-mono text-xs" />
          {parsed && (
            <p className="text-xs text-muted-foreground">
              {parsed.factionName}
              {parsed.detachmentName ? ` · ${parsed.detachmentName}` : ""} · {sumUnitPoints(parsed) + (parsed.detachmentPoints ?? 0)} puntos
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Start a one-off game: your army, the rival (an Administratum user or just a
 * name), points and lists. From the game finder (?partida=…) it comes filled in.
 */
export function FriendlyNewPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const matchId = search.get("partida");
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const factions = useFactions();
  const myName = profile?.displayName || user?.email?.split("@")[0] || "Yo";

  const [factionA, setFactionA] = useState("");
  const [listA, setListA] = useState("");
  const [rivalMode, setRivalMode] = useState<"user" | "guest">("user");
  const [rival, setRival] = useState<Profile | null>(null);
  const [guestName, setGuestName] = useState("");
  const [factionB, setFactionB] = useState("");
  const [listB, setListB] = useState("");
  const [points, setPoints] = useState(2000);
  const [playedOn, setPlayedOn] = useState(today());
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);

  // From the finder: the other player of that pick-up game, the points, the factions.
  useEffect(() => {
    if (!matchId || !user) return;
    (async () => {
      const [m, players] = await Promise.all([getMatch(matchId), getMatchPlayers(matchId)]);
      if (!m) return;
      if (m.pointsLimit) setPoints(m.pointsLimit);
      const others = [{ userId: m.hostId, faction: m.hostFaction }, ...players.map((p) => ({ userId: p.userId, faction: p.faction }))];
      const me = others.find((o) => o.userId === user.id);
      const other = others.find((o) => o.userId !== user.id);
      if (me?.faction) setFactionA(me.faction);
      if (other) {
        const profiles = await getProfilesByIds([other.userId]);
        const p = profiles.get(other.userId);
        if (p) setRival(p);
        if (other.faction) setFactionB(other.faction);
      }
      if (m.startsOn) setPlayedOn(m.startsOn);
    })();
  }, [matchId, user]);

  useEffect(() => {
    if (rivalMode !== "user" || term.trim().length < 2) return setResults([]);
    const id = setTimeout(() => searchProfiles(term).then((r) => setResults(r.filter((p) => p.id !== user?.id))), 250);
    return () => clearTimeout(id);
  }, [term, rivalMode, user?.id]);

  const rivalName = rivalMode === "user" ? (rival?.displayName ?? "") : guestName.trim();
  const ready = !!rivalName;

  async function start() {
    setBusy(true);
    try {
      const g = await createFriendlyGame({
        playerB: rivalMode === "user" ? (rival?.id ?? null) : null,
        nameA: myName,
        nameB: rivalName,
        factionA,
        factionB,
        listA: listA.trim(),
        listB: listB.trim(),
        pointsLimit: points,
        matchId: matchId ?? null,
        playedOn,
      });
      navigate(`/competitivo/partida/${g.id}`, { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <Seo title="Nueva partida" path="/competitivo/partida/nueva" noindex />
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <Link to="/competitivo/partidas" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground" aria-label="Mis partidas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Partida suelta · 11ª edición</p>
            <h1 className="font-display text-2xl font-black tracking-tight">Nueva partida</h1>
          </div>
        </div>

        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Tú · {myName}
          </h2>
          <FactionPicker factions={factions} value={factionA} onChange={setFactionA} who={myName} />
          <ListField value={listA} onChange={setListA} who={myName} />
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Rival
          </h2>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-background/40 p-1">
            {(
              [
                ["user", "Tiene cuenta"],
                ["guest", "Sin cuenta"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRivalMode(k)}
                className={cn("rounded-lg py-2 text-sm font-medium", rivalMode === k ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
          {rivalMode === "user" ? (
            rival ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-2.5">
                <UserAvatar src={rival.avatarUrl} name={rival.displayName} />
                <span className="flex-1 font-medium">{rival.displayName}</span>
                <button type="button" onClick={() => setRival(null)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground" aria-label="Cambiar rival">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Busca a tu rival por su nombre" className="h-11 pl-9" aria-label="Buscar rival" />
                </label>
                {results.length > 0 && (
                  <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => (setRival(p), setTerm(""))} className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-accent">
                          <UserAvatar src={p.avatarUrl} name={p.displayName} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{p.displayName}</span>
                            {p.favoriteFaction && <span className="block truncate text-xs text-muted-foreground">{p.favoriteFaction}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">Le llegará un aviso y podrá llevar su lado de la partida desde su móvil.</p>
              </div>
            )
          ) : (
            <label className="relative block">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value.slice(0, 60))} placeholder="Nombre del rival" className="h-11 pl-9" aria-label="Nombre del rival" />
            </label>
          )}
          <FactionPicker factions={factions} value={factionB} onChange={setFactionB} who={rivalName || "tu rival"} />
          <ListField value={listB} onChange={setListB} who={rivalName || "tu rival"} />
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <span className="text-sm font-medium">Puntos</span>
          <div className="flex flex-wrap gap-2">
            {POINTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPoints(n)}
                aria-pressed={points === n}
                className={cn("rounded-full border px-4 py-2 text-sm font-medium", points === n ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground")}
              >
                {n}
              </button>
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Fecha</span>
            <Input type="date" value={playedOn} onChange={(e) => setPlayedOn(e.target.value || today())} className="h-11 w-48" />
          </label>
        </section>

        <div className="sticky bottom-0 z-20 -mx-4 border-t border-border/60 bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
          <Button variant="gradient" size="lg" className="w-full gap-2" disabled={busy || !ready} onClick={start}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />} Empezar partida
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
