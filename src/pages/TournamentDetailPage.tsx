import { FeaturedListCard, StatusPill } from "@/components/competitive/cards";
import { countdownLabel, formatDateRange } from "@/components/competitive/status";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { RichTextRenderer } from "@/components/shared/RichText";
import { Button } from "@/components/ui/button";
import { getFeaturedLists, getTournamentById } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import type { FeaturedList, Tournament } from "@/types";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  FileText,
  MapPin,
  Pencil,
  ScrollText,
  Swords,
  Ticket,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

function hasContent(rules: Tournament["rules"]): boolean {
  const content = rules && (rules as { content?: unknown[] }).content;
  return Array.isArray(content) && content.length > 0;
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 font-semibold">{value}</dd>
      </div>
    </div>
  );
}

export function TournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [lists, setLists] = useState<FeaturedList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) return;
    Promise.all([getTournamentById(tournamentId), getFeaturedLists()])
      .then(([t, all]) => {
        setTournament(t);
        // Featured lists reference tournaments by name (free text).
        const name = t?.name.trim().toLowerCase();
        setLists(name ? all.filter((l) => l.tournamentName?.trim().toLowerCase() === name) : []);
      })
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando torneo..." />
      </div>
    );
  }

  if (!tournament) {
    return (
      <EmptyState
        icon={<Trophy className="h-8 w-8" />}
        title="Torneo no encontrado"
        description="Puede que se haya eliminado o que el enlace no sea correcto."
        action={{ label: "Volver a Competitivo", onClick: () => navigate("/competitivo") }}
      />
    );
  }

  const t = tournament;
  const countdown = countdownLabel(t);
  const facts = [
    { icon: <CalendarDays className="h-4 w-4" />, label: "Fecha", value: formatDateRange(t) },
    t.location && { icon: <MapPin className="h-4 w-4" />, label: "Lugar", value: t.location },
    t.pointsLimit && { icon: <Swords className="h-4 w-4" />, label: "Formato", value: `${t.pointsLimit} puntos` },
    t.maxPlayers && { icon: <Users className="h-4 w-4" />, label: "Plazas", value: t.maxPlayers },
    t.entryFee && { icon: <Ticket className="h-4 w-4" />, label: "Inscripción", value: t.entryFee },
  ].filter(Boolean) as { icon: ReactNode; label: string; value: ReactNode }[];

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/competitivo")}>
            <ArrowLeft className="h-4 w-4" /> Competitivo
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/admin/competitivo")}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
          )}
        </div>

        {/* Hero */}
        <header className="relative isolate overflow-hidden rounded-3xl border border-border/60">
          <motion.img
            src={t.coverImage || "/images/landing-hero.jpg"}
            alt=""
            initial={{ scale: 1.12, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/70 to-black/20" />
          <div className="flex min-h-[320px] flex-col justify-end p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={t.status} />
              {countdown && (
                <span className="rounded-full bg-white px-3 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-950">
                  {countdown}
                </span>
              )}
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              className="mt-4 font-display text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl"
            >
              {t.name}
            </motion.h1>
            {t.description && <p className="mt-4 max-w-2xl text-white/75">{t.description}</p>}
            {t.externalLink && (
              <a
                href={t.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-shadow hover:shadow-[0_0_40px_rgba(255,255,255,0.35)]"
              >
                {t.status === "finished" ? "Más información" : "Inscribirse"}
                <ExternalLink className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            )}
          </div>
        </header>

        {/* Key facts */}
        <dl className="grid divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card/30 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 [&>*]:border-border/60 sm:[&>*]:border-b lg:[&>*]:border-r">
          {facts.map((f) => (
            <Fact key={f.label} {...f} />
          ))}
        </dl>

        {/* Rules */}
        <section>
          <div className="mb-5 flex items-center gap-2 border-b border-border/60 pb-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-black tracking-tight">Bases del torneo</h2>
          </div>
          {hasContent(t.rules) ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-8"
            >
              <RichTextRenderer content={t.rules} className="text-[15px] leading-relaxed" />
            </motion.div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              La organización todavía no ha publicado las bases de este torneo.
            </p>
          )}
        </section>

        {lists.length > 0 && (
          <section>
            <div className="mb-5 flex items-center gap-2 border-b border-border/60 pb-3">
              <ScrollText className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-black tracking-tight">Listas destacadas del torneo</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {lists.map((l, i) => (
                <FeaturedListCard key={l.id} l={l} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
