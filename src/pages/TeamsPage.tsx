import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { TeamEmblem } from "@/components/teams/TeamEmblem";
import { TeamFormDialog } from "@/components/teams/TeamFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptTeamInvitation, deleteTeamInvitation, getMyTeamInvitations, getMyTeams, searchTeams, type TeamWithRole } from "@/db";
import type { Team, TeamInvitation } from "@/types";
import { Check, Loader2, MapPin, Plus, Search, Shield, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ROLE_LABEL } from "@/lib/teams";

function TeamCard({ team, badge }: { team: Team; badge?: string }) {
  return (
    <Link
      to={`/equipos/${team.id}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40"
    >
      {team.banner && <img src={team.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15 transition-opacity group-hover:opacity-25" />}
      <TeamEmblem team={team} className="relative" />
      <span className="relative min-w-0 flex-1">
        <span className="block truncate font-semibold">{team.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {team.memberCount} {team.memberCount === 1 ? "miembro" : "miembros"}
          </span>
          {team.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {team.location}
            </span>
          )}
        </span>
      </span>
      {badge && <span className="relative rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">{badge}</span>}
    </Link>
  );
}

/** "Equipos": your teams, invitations waiting for you, and the public directory. */
export function TeamsPage() {
  const navigate = useNavigate();
  const [mine, setMine] = useState<TeamWithRole[] | null>(null);
  const [invites, setInvites] = useState<(TeamInvitation & { team: Team | null })[]>([]);
  const [directory, setDirectory] = useState<Team[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getMyTeams().then(setMine);
    getMyTeamInvitations().then(setInvites);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchTeams(query).then(setDirectory), 250);
    return () => clearTimeout(t);
  }, [query]);

  async function accept(inv: TeamInvitation) {
    setBusy(inv.id);
    try {
      const teamId = await acceptTeamInvitation(inv.id);
      toast.success("¡Bienvenido al equipo!");
      navigate(`/equipos/${teamId}`);
    } catch {
      toast.error("No se pudo aceptar la invitación.");
      setBusy(null);
    }
  }

  async function decline(inv: TeamInvitation) {
    setBusy(inv.id);
    try {
      await deleteTeamInvitation(inv.id);
      setInvites((prev) => prev.filter((i) => i.id !== inv.id));
    } finally {
      setBusy(null);
    }
  }

  const myIds = new Set((mine ?? []).map((t) => t.id));

  return (
    <PageTransition>
      <Seo title="Equipos" path="/equipos" noindex />
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Mi espacio</p>
            <h1 className="mt-1 font-display text-3xl font-black tracking-tight">Equipos</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Tu grupo de juego con tablón, chat, listas compartidas y los torneos a los que vais. Solo se entra por invitación.
            </p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Crear equipo
          </Button>
        </header>

        {invites.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold">Invitaciones</h2>
            {invites.map((inv) =>
              inv.team ? (
                <div key={inv.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-primary/40 bg-brand-soft p-4">
                  <TeamEmblem team={inv.team} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{inv.team.name}</p>
                    <p className="text-xs text-muted-foreground">Te han invitado a unirte · {inv.team.memberCount} miembros</p>
                  </div>
                  <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => decline(inv)} disabled={busy === inv.id}>
                    <X className="h-4 w-4" /> Rechazar
                  </Button>
                  <Button size="sm" variant="gradient" className="gap-1.5" onClick={() => accept(inv)} disabled={busy === inv.id}>
                    {busy === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Unirme
                  </Button>
                </div>
              ) : null,
            )}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold">Mis equipos</h2>
          {mine === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : mine.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center">
              <Shield className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 font-medium">Aún no estás en ningún equipo</p>
              <p className="mt-1 text-sm text-muted-foreground">Crea el tuyo e invita a tu grupo, o espera a que te inviten.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {mine.map((t) => (
                <TeamCard key={t.id} team={t} badge={ROLE_LABEL[t.myRole]} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Explorar equipos</h2>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o ciudad" className="pl-9" aria-label="Buscar equipos" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {directory
              .filter((t) => !myIds.has(t.id))
              .map((t) => (
                <TeamCard key={t.id} team={t} />
              ))}
          </div>
          {directory.filter((t) => !myIds.has(t.id)).length === 0 && <p className="text-sm text-muted-foreground">No hay otros equipos que coincidan.</p>}
        </section>
      </div>

      {creating && (
        <TeamFormDialog
          onClose={() => setCreating(false)}
          onSaved={(team) => {
            setCreating(false);
            navigate(`/equipos/${team.id}?tab=miembros`);
          }}
        />
      )}
    </PageTransition>
  );
}
