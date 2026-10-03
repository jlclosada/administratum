import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { getProfilesByIds } from "@/db";
import { cn } from "@/lib/utils";
import type { ChatMessage, Profile } from "@/types";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const time = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

/**
 * Live group chat (team or game). The caller wires the table: initial load,
 * send and a realtime subscription; RLS keeps it to the members.
 */
export function GroupChat({
  currentUserId,
  load,
  send,
  subscribe,
  emptyText = "Todavía no hay mensajes. ¡Rompe el hielo!",
  className,
}: {
  currentUserId: string | undefined;
  load: () => Promise<ChatMessage[]>;
  send: (body: string) => Promise<ChatMessage>;
  subscribe: (onMessage: (m: ChatMessage) => void) => () => void;
  emptyText?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map());
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const add = (m: ChatMessage) => setMessages((prev) => (prev?.some((x) => x.id === m.id) ? prev : [...(prev ?? []), m]));

  useEffect(() => {
    let alive = true;
    load().then((m) => alive && setMessages(m));
    const stop = subscribe(add);
    return () => {
      alive = false;
      stop();
    };
    // load/subscribe are stable per chat (callers memoize them by id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch profiles for authors we haven't seen yet.
  useEffect(() => {
    const missing = [...new Set((messages ?? []).map((m) => m.authorId))].filter((id) => !authors.has(id));
    if (missing.length) getProfilesByIds(missing).then((p) => setAuthors((prev) => new Map([...prev, ...p])));
  }, [messages, authors]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      add(await send(body));
      setText("");
    } catch {
      toast.error("No se pudo enviar el mensaje.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn("flex h-[60vh] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40", className)}>
      <div className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-4">
        {messages === null ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-8 w-8 opacity-40" />
            {emptyText}
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const mine = m.authorId === currentUserId;
            const newDay = !prev || day(prev.createdAt) !== day(m.createdAt);
            const grouped = !newDay && prev?.authorId === m.authorId;
            const author = authors.get(m.authorId);
            return (
              <div key={m.id}>
                {newDay && (
                  <p className="py-3 text-center text-[11px] font-medium text-muted-foreground/70 first-letter:uppercase">{day(m.createdAt)}</p>
                )}
                <div className={cn("flex items-end gap-2", mine && "flex-row-reverse", grouped ? "mt-0.5" : "mt-3")}>
                  <span className="w-8 shrink-0">
                    {!mine && !grouped && (
                      <Link to={`/perfil/${m.authorId}`}>
                        <UserAvatar src={author?.avatarUrl} name={author?.displayName} size="sm" />
                      </Link>
                    )}
                  </span>
                  <div className={cn("max-w-[78%]", mine && "text-right")}>
                    {!mine && !grouped && <p className="mb-0.5 text-xs font-medium text-muted-foreground">{author?.displayName ?? "…"}</p>}
                    <p
                      className={cn(
                        "inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-sm",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      {m.body}
                      <span className={cn("ml-2 align-bottom text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {time(m.createdAt)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-border/60 p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder="Escribe un mensaje…"
          aria-label="Mensaje"
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={sending || !text.trim()} aria-label="Enviar">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
