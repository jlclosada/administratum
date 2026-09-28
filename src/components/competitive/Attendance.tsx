import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { getMyAttendance, getTournamentAttendees, setAttendance, type Attendee } from "@/db";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import type { Tournament } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

/** "Asistiré" button plus the public list of who is going. */
export function Attendance({
  tournament,
  onCountChange,
}: {
  tournament: Tournament;
  onCountChange: (count: number) => void;
}) {
  const me = useAuthStore((s) => s.user);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attending, setAttending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getTournamentAttendees(tournament.id), me ? getMyAttendance() : Promise.resolve(new Set<string>())])
      .then(([list, mine]) => {
        setAttendees(list);
        setAttending(mine.has(tournament.id));
      })
      .finally(() => setLoading(false));
  }, [tournament.id, me]);

  const count = attendees.length;
  const max = tournament.maxPlayers;
  const full = max !== null && count >= max;
  const finished = tournament.status === "finished";

  async function toggle() {
    setBusy(true);
    const next = !attending;
    try {
      await setAttendance(tournament.id, next);
      const list = await getTournamentAttendees(tournament.id);
      setAttendees(list);
      setAttending(next);
      onCountChange(list.length);
      toast.success(next ? "¡Apuntado! Nos vemos en el torneo" : "Ya no asistirás a este torneo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar tu asistencia.");
    } finally {
      setBusy(false);
    }
  }

  let action: React.ReactNode = null;
  if (me && !finished) {
    action = attending ? (
      <Button variant="outline" className="gap-2 border-emerald-500/40 text-emerald-400" disabled={busy} onClick={toggle}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Asistirás · Cancelar
      </Button>
    ) : (
      <Button variant="gradient" className="gap-2" disabled={busy || full} onClick={toggle}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
        {full ? "Sin plazas" : "Asistiré"}
      </Button>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-black tracking-tight">
            <Users className="h-5 w-5 text-primary" />
            {finished ? "Asistieron" : "Asistentes"}
            <span className="font-mono text-base text-muted-foreground">
              {count}
              {max ? ` / ${max}` : ""}
            </span>
          </h2>
          {max !== null && (
            <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full rounded-full", full ? "bg-rose-500" : "bg-emerald-500")}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (count / max) * 100)}%` }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
          )}
        </div>
        {action}
        {!me && !finished && <p className="text-sm text-muted-foreground">Inicia sesión para apuntarte.</p>}
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : count === 0 ? (
        <p className="text-sm text-muted-foreground">
          {finished ? "Nadie marcó su asistencia." : "Todavía no hay nadie apuntado. ¡Sé el primero!"}
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3">
          <AnimatePresence initial={false}>
            {attendees.map(({ profile }) => (
              <motion.li
                key={profile.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Link to={`/perfil/${profile.id}`} className="group flex flex-col items-center gap-1.5 text-center">
                  <UserAvatar
                    src={profile.avatarUrl}
                    name={profile.displayName}
                    size="lg"
                    className={cn(
                      "transition-transform group-hover:scale-105",
                      profile.id === me?.id && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background",
                    )}
                  />
                  <span className="w-full truncate text-xs group-hover:text-primary">{profile.displayName || "Sin nombre"}</span>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
