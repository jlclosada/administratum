import { TournamentAdmin } from "@/components/competitive/TournamentAdmin";
import { AdminShell } from "@/components/shared/AdminShell";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { getTournaments } from "@/db";
import type { Tournament } from "@/types";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { AdminOutletContext } from "./AdminLayout";

export function AdminTournamentsPage() {
  const { refreshOverview } = useOutletContext<AdminOutletContext>();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTournaments(false)
      .then(setTournaments)
      .finally(() => setLoading(false));
  }, []);

  const active = tournaments.filter((t) => t.status !== "finished");
  const attendees = active.reduce((n, t) => n + t.attendeeCount, 0);

  return (
    <AdminShell
      title="Torneos"
      subtitle={`${active.length} activos · ${attendees} asistentes apuntados · ${tournaments.length - active.length} finalizados`}
    >
      {loading ? (
        <LoadingSpinner />
      ) : (
        <TournamentAdmin
          tournaments={tournaments}
          onChange={(next) => {
            setTournaments(next);
            refreshOverview();
          }}
        />
      )}
    </AdminShell>
  );
}
