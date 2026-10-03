import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { getAttendanceOf, getMyAttendance, getTournaments, setAttendance } from "@/db";
import { countdownLabel, parseDay } from "@/components/competitive/status";
import type { Profile, Tournament } from "@/types";
import { CalendarDays, Check, Loader2, MapPin, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

/**
 * Upcoming tournaments with which team members are going; "Me apunto" uses
 * the normal tournament attendance, so it also shows on the tournament page.
 */
export function TeamTournaments({ memberIds, profiles, myId }: { memberIds: string[]; profiles: Map<string, Profile>; myId: string | undefined }) {
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);
  const [going, setGoing] = useState<Map<string, string[]>>(new Map());
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const key = memberIds.join(",");

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    Promise.all([getTournaments(), getAttendanceOf(memberIds), getMyAttendance()]).then(([t, g, m]) => {
      const upcoming = t
        .filter((x) => x.status !== "finished" && (parseDay(x.startDate)?.getTime() ?? 0) >= today.getTime())
        .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
      // Tournaments the team is going to first.
      upcoming.sort((a, b) => (g.get(b.id)?.length ?? 0) - (g.get(a.id)?.length ?? 0));
      setTournaments(upcoming);
      setGoing(g);
      setMine(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function toggle(t: Tournament) {
    const attending = mine.has(t.id);
    setBusy(t.id);
    try {
      await setAttendance(t.id, !attending);
      const next = new Set(mine);
      if (attending) next.delete(t.id);
      else next.add(t.id);
      setMine(next);
      if (myId) {
        setGoing((prev) => {
          const map = new Map(prev);
          const list = (map.get(t.id) ?? []).filter((id) => id !== myId);
          map.set(t.id, attending ? list : [...list, myId]);
          return map;
        });
      }
    } catch (err) {
      toast.error((err as Error).message || "No se pudo actualizar la asistencia.");
    } finally {
      setBusy(null);
    }
  }

  if (tournaments === null) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (tournaments.length === 0) {
    return <p className="rounded-2xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">No hay torneos próximos publicados.</p>;
  }

  return (
    <ul className="space-y-3">
      {tournaments.map((t) => {
        const team = (going.get(t.id) ?? []).filter((id) => memberIds.includes(id));
        const attending = mine.has(t.id);
        return (
          <li key={t.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-4">
            <div className="min-w-0 flex-1">
              <Link to={`/competitivo/torneos/${t.id}`} className="font-semibold hover:text-primary">
                {t.name}
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> {countdownLabel(t) || t.startDate}
                </span>
                {t.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {t.location}
                  </span>
                )}
              </p>
              {team.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {team.slice(0, 6).map((id) => (
                      <UserAvatar key={id} src={profiles.get(id)?.avatarUrl} name={profiles.get(id)?.displayName} size="xs" className="ring-2 ring-card" />
                    ))}
                  </div>
                  <span className="text-xs text-primary">
                    <Trophy className="mr-1 inline h-3 w-3" />
                    {team.length} del equipo {team.length === 1 ? "va" : "van"}
                  </span>
                </div>
              )}
            </div>
            <Button size="sm" variant={attending ? "secondary" : "gradient"} className="gap-1.5" disabled={busy === t.id} onClick={() => toggle(t)}>
              {busy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : attending ? <Check className="h-3.5 w-3.5" /> : null}
              {attending ? "Voy" : "Me apunto"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
