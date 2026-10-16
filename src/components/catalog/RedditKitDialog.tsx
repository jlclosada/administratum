import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { copyText } from "@/lib/clipboard";
import { buildPointsPost, SUBREDDITS, type PostChange } from "@/lib/redditPost";
import { cn } from "@/lib/utils";
import { Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Admins only: the Reddit post for an update, ready to copy. Posting stays
 * manual on purpose — automated self-promotion gets accounts and the domain
 * banned on Reddit.
 */
export function RedditKitDialog({ changes, day, version, onClose }: { changes: PostChange[]; day: string; version: string | null; onClose: () => void }) {
  const [lang, setLang] = useState<"es" | "en">("en");
  const post = useMemo(() => buildPointsPost(changes, day, version, lang), [changes, day, version, lang]);

  async function copy(text: string, what: string) {
    await copyText(text);
    toast.success(`${what} copiado`);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publicar en Reddit</DialogTitle>
          <DialogDescription>
            Copia el título y el texto, abre el subreddit y pégalos en un post de texto. Publica desde tu cuenta, con calma: una vez por
            actualización y respondiendo a los comentarios.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex rounded-xl border border-border/60 p-0.5 text-sm">
            {(
              [
                ["en", "Inglés (subreddits internacionales)"],
                ["es", "Español (comunidades hispanas)"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLang(key)}
                className={cn("flex-1 rounded-lg px-3 py-1.5", lang === key ? "bg-accent font-medium" : "text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={post.title} readOnly aria-label="Título" />
            <Button variant="outline" className="shrink-0 gap-1.5" onClick={() => copy(post.title, "Título")}>
              <Copy className="h-4 w-4" /> Título
            </Button>
          </div>
          <Textarea value={post.body} readOnly rows={12} className="font-mono text-xs" aria-label="Texto del post" />
          <div className="flex flex-wrap items-center gap-2">
            <Button className="gap-1.5" onClick={() => copy(post.body, "Texto")}>
              <Copy className="h-4 w-4" /> Copiar texto
            </Button>
            {SUBREDDITS.filter((s) => s.lang === lang).map((s) => (
              <a
                key={s.name}
                href={`https://www.reddit.com/r/${s.name}/submit?type=TEXT&title=${encodeURIComponent(post.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                title={s.note}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:border-primary/40"
              >
                r/{s.name} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
          {lang === "es" && (
            <p className="text-xs text-muted-foreground">
              Para la versión en español, compártela en comunidades hispanas (subreddits en español, grupos de Facebook y Discord de clubes).
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
