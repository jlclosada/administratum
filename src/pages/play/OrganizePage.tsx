import { PlayTournamentRow } from "@/components/play/PlayBits";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { getMyOrganizedTournaments } from "@/db";
import { formatSummary } from "@/lib/play/labels";
import type { PlayTournament } from "@/lib/play/types";
import { SEO_ORGANIZAR } from "@/lib/seoCopy";
import { useAuthStore } from "@/stores";
import { ArrowLeft, BadgeEuro, ClipboardList, Grid3x3, ListOrdered, Loader2, Plus, Shuffle, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const FEATURES = [
  { icon: Users, title: "Individual, parejas o equipos", text: "De 3 a 8 jugadores por equipo, con plazas por equipo y total de jugadores calculado." },
  { icon: BadgeEuro, title: "Inscripción y pagos", text: "Cada inscrito sube su justificante y tú validas quién ha pagado. Lista de espera automática." },
  { icon: ClipboardList, title: "Listas con fecha límite", text: "Los jugadores suben su lista de la app oficial; se publican al cerrar el plazo." },
  { icon: Shuffle, title: "Rondas suizas", text: "Emparejamientos sin repetir rival, editables antes de publicarlos, con byes automáticos." },
  { icon: Grid3x3, title: "Formato WTC", text: "Cada equipo prepara su matriz en secreto y los capitanes fijan los cruces de la ronda." },
  { icon: ListOrdered, title: "Resultados en directo", text: "Cada partida se puntúa ronda a ronda (11ª edición), los dos jugadores la confirman y la clasificación se actualiza sola." },
];

/** /competitivo/organizar: what organising here gives you, and your tournaments. */
export function OrganizePage() {
  const user = useAuthStore((s) => s.user);
  const openAuth = useAuthStore((s) => s.openAuth);
  const navigate = useNavigate();
  const [mine, setMine] = useState<PlayTournament[] | null>(null);

  useEffect(() => {
    if (user) getMyOrganizedTournaments().then(setMine).catch(() => setMine([]));
    else setMine(null);
  }, [user]);

  const create = () => (user ? navigate("/competitivo/organizar/nuevo") : openAuth("signup"));

  return (
    <PageTransition>
      <Seo {...SEO_ORGANIZAR} path="/competitivo/organizar" />
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/30 px-5 py-8 sm:px-10 sm:py-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <img src="/images/landing-hero.jpg" alt="" className="h-full w-full object-cover opacity-15 grayscale" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          </div>
          <Link to="/competitivo" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Competitivo
          </Link>
          <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
            <Trophy className="h-3.5 w-3.5" /> Para tiendas, clubes y organizadores
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">Organiza tu torneo de Warhammer 40K</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground sm:text-lg">
            De la inscripción a la clasificación final, todo en un sitio y desde el móvil. Gratis.
          </p>
          <Button variant="gradient" size="lg" className="mt-6 gap-2" onClick={create}>
            <Plus className="h-4 w-4" /> Crear torneo
          </Button>
        </header>

        {user && (
          <section className="space-y-3">
            <h2 className="font-display text-2xl font-bold">Tus torneos</h2>
            {mine === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : mine.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">Aún no has organizado ningún torneo.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {mine.map((t) => (
                  <li key={t.id} className="relative">
                    <PlayTournamentRow t={t} extra={<span className="text-xs text-muted-foreground">{formatSummary(t)}</span>} />
                    <Button asChild size="sm" variant="outline" className="absolute right-3 top-3">
                      <Link to={`/torneos/${t.id}/gestionar`}>Gestionar</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Todo lo que necesita tu torneo</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-border/60 bg-card/30 p-5">
                <Icon className="h-6 w-6 text-primary" />
                <p className="mt-3 font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageTransition>
  );
}
