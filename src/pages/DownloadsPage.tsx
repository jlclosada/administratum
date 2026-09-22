import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getDownloads } from "@/db";
import type { DownloadEntry } from "@/types";
import { motion } from "framer-motion";
import { Download, FileText, FolderOpen, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DownloadCard({ entry, index }: { entry: DownloadEntry; index: number }) {
  return (
    <motion.a
      href={entry.fileUrl}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
      className="group flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card/40 p-3.5 transition-all hover:border-primary/40 hover:shadow-lg"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
        {entry.thumbnail ? (
          <img
            src={entry.thumbnail}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-medium text-foreground">{entry.title}</p>
          {entry.isNew && (
            <Badge className="gap-1 bg-primary/15 text-[10px] text-primary hover:bg-primary/15">
              <Sparkles className="h-2.5 w-2.5" />
              Nuevo
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[formatDate(entry.sourceUpdatedAt), entry.fileSize].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </motion.a>
  );
}

export function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getDownloads("Warhammer 40,000")
      .then(setDownloads)
      .catch((err) => console.error("Failed to load downloads:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return downloads;
    return downloads.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.topics.some((t) => t.toLowerCase().includes(q)),
    );
  }, [downloads, query]);

  const groups = useMemo(() => {
    const map = new Map<string, DownloadEntry[]>();
    for (const entry of filtered) {
      const list = map.get(entry.category) ?? [];
      list.push(entry);
      map.set(entry.category, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando descargas..." />
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={<FolderOpen className="h-8 w-8 text-muted-foreground" />}
          title="Sin descargas todavía"
          description="Un administrador debe sincronizar el catálogo de descargas oficiales desde el panel de administración."
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="text-gradient animate-gradient">Descargas</span>
          </h1>
          <p className="text-muted-foreground">
            Reglas, erratas y material oficial de Warhammer Community, siempre
            al día.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar un documento…"
            className="pl-10"
          />
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún documento coincide con «{query}».
          </p>
        ) : (
          groups.map(([category, entries]) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{category}</h2>
                <Badge variant="secondary">{entries.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {entries.map((entry, i) => (
                  <DownloadCard key={entry.id} entry={entry} index={i} />
                ))}
              </div>
            </section>
          ))
        )}

        <p className="text-[11px] text-muted-foreground">
          Archivos oficiales de Games Workshop, enlazados desde Warhammer
          Community. No es un servicio oficial de Games Workshop.
        </p>
      </div>
    </PageTransition>
  );
}
