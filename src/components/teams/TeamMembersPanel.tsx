import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteTeamInvitation, getProfilesByIds, getTeamInvitations, inviteToTeam, removeTeamMember, searchProfiles, setTeamRole } from "@/db";
import { ROLE_LABEL } from "@/lib/teams";
import { cn } from "@/lib/utils";
import type { Profile, TeamInvitation, TeamMember, TeamRole } from "@/types";
import { Crown, Loader2, Search, Shield, ShieldCheck, UserMinus, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";


/** Roster, invitations (search users and invite) and roles. */
export function TeamMembersPanel({
  teamId,
  members,
  profiles,
  myId,
  myRole,
  onMembersChange,
}: {
  teamId: string;
  members: TeamMember[];
  profiles: Map<string, Profile>;
  myId: string | undefined;
  myRole: TeamRole | null;
  onMembersChange: () => void;
}) {
  const canManage = myRole === "owner" || myRole === "admin";
  const [invites, setInvites] = useState<TeamInvitation[]>([]);
  const [invited, setInvited] = useState<Map<string, Profile>>(new Map());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) return;
    getTeamInvitations(teamId).then(async (rows) => {
      setInvites(rows);
      setInvited(await getProfilesByIds(rows.map((r) => r.userId)));
    });
  }, [teamId, canManage]);

  useEffect(() => {
    if (!canManage || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchProfiles(query.trim())
        .then(setResults)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, canManage]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);
  const invitedIds = useMemo(() => new Set(invites.map((i) => i.userId)), [invites]);

  async function invite(p: Profile) {
    setBusy(p.id);
    try {
      const inv = await inviteToTeam(teamId, p.id);
      setInvites((prev) => [...prev, inv]);
      setInvited((prev) => new Map(prev).set(p.id, p));
      toast.success(`Invitación enviada a ${p.displayName}`);
    } catch {
      toast.error("No se pudo invitar.");
    } finally {
      setBusy(null);
    }
  }

  async function withdraw(inv: TeamInvitation) {
    setBusy(inv.id);
    try {
      await deleteTeamInvitation(inv.id);
      setInvites((prev) => prev.filter((i) => i.id !== inv.id));
    } finally {
      setBusy(null);
    }
  }

  async function changeRole(m: TeamMember, role: TeamRole) {
    if (role === "owner" && !confirm("¿Ceder el equipo? Pasarás a ser admin y no podrás deshacerlo tú.")) return;
    setBusy(m.userId);
    try {
      await setTeamRole(teamId, m.userId, role);
      onMembersChange();
    } catch (err) {
      toast.error((err as Error).message || "No se pudo cambiar el rol.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(m: TeamMember) {
    const name = profiles.get(m.userId)?.displayName ?? "este miembro";
    if (!confirm(`¿Expulsar a ${name} del equipo?`)) return;
    setBusy(m.userId);
    try {
      await removeTeamMember(teamId, m.userId);
      onMembersChange();
    } catch {
      toast.error("No se pudo expulsar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <UserPlus className="h-4 w-4 text-primary" /> Invitar jugadores
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busca por nombre de usuario" className="pl-9" aria-label="Buscar usuarios" />
          </div>
          {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {results.length > 0 && (
            <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
              {results.map((p) => {
                const state = memberIds.has(p.id) ? "Ya es miembro" : invitedIds.has(p.id) ? "Invitado" : null;
                return (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <UserAvatar src={p.avatarUrl} name={p.displayName} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">{p.displayName}</span>
                    {state ? (
                      <span className="text-xs text-muted-foreground">{state}</span>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => invite(p)} disabled={busy === p.id}>
                        {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Invitar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Invitaciones pendientes</p>
              <div className="flex flex-wrap gap-2">
                {invites.map((i) => (
                  <span key={i.id} className="flex items-center gap-2 rounded-full border border-border/60 py-1 pl-1 pr-2 text-sm">
                    <UserAvatar src={invited.get(i.userId)?.avatarUrl} name={invited.get(i.userId)?.displayName} size="xs" />
                    {invited.get(i.userId)?.displayName ?? "Usuario"}
                    <button type="button" onClick={() => withdraw(i)} className="text-muted-foreground hover:text-destructive" aria-label="Retirar invitación" disabled={busy === i.id}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <h2 className="border-b border-border/50 px-4 py-3 font-semibold">
          {members.length} {members.length === 1 ? "miembro" : "miembros"}
        </h2>
        <ul className="divide-y divide-border/50">
          {members.map((m) => {
            const p = profiles.get(m.userId);
            const RoleIcon = m.role === "owner" ? Crown : m.role === "admin" ? ShieldCheck : Shield;
            const canRemove = canManage && m.role !== "owner" && m.userId !== myId && !(myRole === "admin" && m.role === "admin");
            return (
              <li key={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link to={`/perfil/${m.userId}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar src={p?.avatarUrl} name={p?.displayName} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p?.displayName ?? "Usuario"}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p?.favoriteFaction ?? ""}</span>
                  </span>
                </Link>
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    m.role === "owner" ? "bg-primary/15 text-primary" : m.role === "admin" ? "bg-sky-500/15 text-sky-400" : "bg-muted text-muted-foreground",
                  )}
                >
                  <RoleIcon className="h-3 w-3" /> {ROLE_LABEL[m.role]}
                </span>
                {myRole === "owner" && m.userId !== myId && (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value as TeamRole)}
                    disabled={busy === m.userId}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                    aria-label={`Rol de ${p?.displayName ?? "miembro"}`}
                  >
                    <option value="member">Miembro</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Ceder el equipo</option>
                  </select>
                )}
                {canRemove && (
                  <button type="button" onClick={() => remove(m)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Expulsar" title="Expulsar del equipo">
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
