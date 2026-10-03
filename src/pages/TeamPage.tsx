import { EmptyState } from "@/components/shared/EmptyState";
import { GroupChat } from "@/components/shared/GroupChat";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { TeamBoard } from "@/components/teams/TeamBoard";
import { TeamEmblem } from "@/components/teams/TeamEmblem";
import { TeamFormDialog } from "@/components/teams/TeamFormDialog";
import { TeamMembersPanel } from "@/components/teams/TeamMembersPanel";
import { ROLE_LABEL } from "@/lib/teams";
import { TeamTournaments } from "@/components/teams/TeamTournaments";
import { Button } from "@/components/ui/button";
import {
  acceptTeamInvitation,
  deleteTeam,
  getMyTeamInvitations,
  getProfilesByIds,
  getTeam,
  getTeamMembers,
  getTeamMessages,
  leaveTeam,
  sendTeamMessage,
  subscribeToChat,
} from "@/db";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import type { Profile, Team, TeamInvitation, TeamMember } from "@/types";
import { ArrowLeft, Check, LayoutList, Lock, LogOut, MapPin, MessageCircle, Pencil, ScrollText, Shield, Trash2, Trophy, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const TABS = [
  { key: "tablon", label: "Tablón", icon: LayoutList },
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "listas", label: "Listas", icon: ScrollText },
  { key: "torneos", label: "Torneos", icon: Trophy },
  { key: "miembros", label: "Miembros", icon: Users },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** A team's space: board, chat, shared lists, tournaments and roster (members only). */
export function TeamPage() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const myId = useAuthStore((s) => s.user?.id);
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [editing, setEditing] = useState(false);

  const tab = (TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "tablon") as TabKey;
  const setTab = (key: TabKey) => setParams(key === "tablon" ? {} : { tab: key }, { replace: true });

  const loadMembers = useCallback(async () => {
    const m = await getTeamMembers(teamId);
    setMembers(m);
    setProfiles(await getProfilesByIds(m.map((x) => x.userId)));
  }, [teamId]);

  useEffect(() => {
    setTeam(undefined);
    getTeam(teamId).then(setTeam);
    loadMembers();
    getMyTeamInvitations().then((inv) => setInvitation(inv.find((i) => i.teamId === teamId) ?? null));
  }, [teamId, loadMembers]);

  const myRole = members.find((m) => m.userId === myId)?.role ?? null;
  const isManager = myRole === "owner" || myRole === "admin";
  const memberIds = useMemo(() => members.map((m) => m.userId), [members]);
  const loadChat = useCallback(() => getTeamMessages(teamId), [teamId]);
  const sendChat = useCallback((body: string) => sendTeamMessage(teamId, body), [teamId]);
  const subscribeChat = useCallback((cb: Parameters<typeof subscribeToChat>[3]) => subscribeToChat("team_messages", "team_id", teamId, cb), [teamId]);

  if (team === undefined) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner text="Cargando equipo…" />
      </div>
    );
  }
  if (team === null) {
    return (
      <EmptyState
        icon={<Shield className="h-8 w-8 text-muted-foreground" />}
        title="Equipo no encontrado"
        description="Puede que lo hayan borrado."
        action={{ label: "Ver equipos", onClick: () => navigate("/equipos") }}
      />
    );
  }

  async function accept() {
    if (!invitation) return;
    try {
      await acceptTeamInvitation(invitation.id);
      setInvitation(null);
      await loadMembers();
      toast.success("¡Bienvenido al equipo!");
    } catch {
      toast.error("No se pudo aceptar la invitación.");
    }
  }

  async function leave() {
    if (!confirm(`¿Salir de ${team!.name}? Necesitarás otra invitación para volver.`)) return;
    try {
      await leaveTeam(teamId);
      navigate("/equipos");
    } catch {
      toast.error("No se pudo salir del equipo.");
    }
  }

  async function remove() {
    if (!confirm(`¿Borrar ${team!.name}? Se perderán el tablón, el chat y las listas. No se puede deshacer.`)) return;
    try {
      await deleteTeam(teamId);
      toast.success("Equipo borrado");
      navigate("/equipos");
    } catch {
      toast.error("No se pudo borrar el equipo.");
    }
  }

  return (
    <PageTransition>
      <Seo title={team.name} path={`/equipos/${team.id}`} noindex />
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to="/equipos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Equipos
        </Link>

        {/* Header */}
        <header className="overflow-hidden rounded-3xl border border-border/60 bg-card/40">
          <div className="relative h-36 bg-muted sm:h-48">
            <img src={team.banner ?? "/email/hero.jpg"} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          </div>
          <div className="relative -mt-14 flex flex-wrap items-end gap-4 px-5 pb-5 sm:px-6">
            <TeamEmblem team={team} size="lg" className="ring-4 ring-card" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{team.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {team.memberCount} {team.memberCount === 1 ? "miembro" : "miembros"}
                </span>
                {team.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {team.location}
                  </span>
                )}
                {myRole && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">{ROLE_LABEL[myRole]}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              {isManager && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
              {myRole && myRole !== "owner" && (
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={leave}>
                  <LogOut className="h-3.5 w-3.5" /> Salir
                </Button>
              )}
              {myRole === "owner" && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={remove}>
                  <Trash2 className="h-3.5 w-3.5" /> Borrar
                </Button>
              )}
            </div>
          </div>
          {team.description && <p className="whitespace-pre-wrap border-t border-border/50 px-5 py-4 text-sm leading-relaxed sm:px-6">{team.description}</p>}
        </header>

        {!myRole ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-5">
              <Lock className="h-5 w-5 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{invitation ? "Te han invitado a este equipo" : "Equipo privado"}</p>
                <p className="text-sm text-muted-foreground">
                  {invitation
                    ? "Únete para ver el tablón, el chat, las listas y los torneos del equipo."
                    : "Solo se entra por invitación de sus administradores. El tablón y el chat son solo para miembros."}
                </p>
              </div>
              {invitation && (
                <Button variant="gradient" className="gap-2" onClick={accept}>
                  <Check className="h-4 w-4" /> Unirme
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {members.map((m) => (
                <Link key={m.userId} to={`/perfil/${m.userId}`} className="flex items-center gap-2 rounded-full border border-border/60 py-1 pl-1 pr-3 text-sm hover:border-primary/40">
                  <UserAvatar src={profiles.get(m.userId)?.avatarUrl} name={profiles.get(m.userId)?.displayName} size="sm" />
                  {profiles.get(m.userId)?.displayName ?? "Miembro"}
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <>
            <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="Secciones del equipo">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    tab === t.key ? "bg-brand-soft text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                  aria-current={tab === t.key ? "page" : undefined}
                >
                  <t.icon className={cn("h-4 w-4", tab === t.key && "text-primary")} /> {t.label}
                </button>
              ))}
            </nav>

            {tab === "tablon" && <TeamBoard teamId={teamId} profiles={profiles} myId={myId} canModerate={isManager} />}
            {tab === "listas" && <TeamBoard teamId={teamId} profiles={profiles} myId={myId} canModerate={isManager} listsOnly />}
            {tab === "chat" && <GroupChat currentUserId={myId} load={loadChat} send={sendChat} subscribe={subscribeChat} />}
            {tab === "torneos" && <TeamTournaments memberIds={memberIds} profiles={profiles} myId={myId} />}
            {tab === "miembros" && (
              <TeamMembersPanel teamId={teamId} members={members} profiles={profiles} myId={myId} myRole={myRole} onMembersChange={loadMembers} />
            )}
          </>
        )}
      </div>

      {editing && (
        <TeamFormDialog
          team={team}
          onClose={() => setEditing(false)}
          onSaved={(t) => {
            setTeam(t);
            setEditing(false);
          }}
        />
      )}
    </PageTransition>
  );
}
