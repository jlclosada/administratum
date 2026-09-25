import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { getConversations, getMessagesWith, markConversationRead, sendMessage } from "@/db";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAuthStore, useSocialStore } from "@/stores";
import type { Conversation, Message } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, MessageCircle, Search, Send, UserPlus } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const MAX_LENGTH = 2000;

type ChatMessage = Message & { pending?: boolean };

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export function MessagesPage() {
  const { userId: activeId } = useParams<{ userId: string }>();
  const myId = useAuthStore((s) => s.user?.id);
  const { addListener, setActiveChat, refresh: refreshSocial } = useSocialStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const loadConversations = useCallback(() => getConversations().then(setConversations), []);

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
  }, [loadConversations]);

  // Keep the list's previews/unread badges live.
  useEffect(
    () =>
      addListener((m) => {
        setConversations((prev) => {
          const otherId = m.senderId === myId ? m.recipientId : m.senderId;
          const next = prev.map((c) =>
            c.other.id === otherId
              ? {
                  ...c,
                  lastMessage: m,
                  unread: m.recipientId === myId && otherId !== activeId ? c.unread + 1 : c.unread,
                }
              : c,
          );
          return next.sort(
            (a, b) =>
              new Date(b.lastMessage?.createdAt ?? 0).getTime() - new Date(a.lastMessage?.createdAt ?? 0).getTime(),
          );
        });
      }),
    [addListener, myId, activeId],
  );

  useEffect(() => {
    setActiveChat(activeId ?? null);
    return () => setActiveChat(null);
  }, [activeId, setActiveChat]);

  const active = conversations.find((c) => c.other.id === activeId);
  const shown = conversations.filter((c) =>
    c.other.displayName.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  return (
    <PageTransition>
      <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-[480px] max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm">
        {/* Conversation list */}
        <aside
          className={cn(
            "flex w-full flex-col border-r border-border/60 md:w-80 md:shrink-0",
            activeId && "hidden md:flex",
          )}
        >
          <div className="space-y-3 border-b border-border/60 p-4">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-xl font-bold">Mensajes</h1>
              <Link to="/amigos" className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Amigos">
                <UserPlus className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar conversación…"
                className="h-8 w-full rounded-full border border-border/60 bg-transparent pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Solo puedes chatear con tus amigos.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/amigos">Buscar amigos</Link>
                </Button>
              </div>
            ) : (
              shown.map((c) => (
                <Link
                  key={c.other.id}
                  to={`/mensajes/${c.other.id}`}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
                    c.other.id === activeId && "bg-accent/70",
                  )}
                >
                  {c.other.id === activeId && (
                    <motion.span layoutId="chat-active" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />
                  )}
                  <UserAvatar src={c.other.avatarUrl} name={c.other.displayName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate text-sm", c.unread > 0 ? "font-bold" : "font-medium")}>
                        {c.other.displayName || "Sin nombre"}
                      </p>
                      {c.lastMessage && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastMessage.createdAt)}</span>
                      )}
                    </div>
                    <p className={cn("truncate text-xs", c.unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                      {c.lastMessage
                        ? `${c.lastMessage.senderId === myId ? "Tú: " : ""}${c.lastMessage.content}`
                        : "Di hola 👋"}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {c.unread}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={cn("flex min-w-0 flex-1 flex-col", !activeId && "hidden md:flex")}>
          {activeId && myId ? (
            loading ? (
              <div className="flex flex-1 items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : active ? (
              <Thread
                key={activeId}
                conversation={active}
                myId={myId}
                onRead={() => {
                  setConversations((prev) => prev.map((c) => (c.other.id === activeId ? { ...c, unread: 0 } : c)));
                  refreshSocial();
                }}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">Solo puedes enviar mensajes a tus amigos.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/perfil/${activeId}`}>Ver perfil</Link>
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <motion.div
                initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground/80"
              >
                <MessageCircle className="h-7 w-7" />
              </motion.div>
              <p className="font-semibold">Tus mensajes</p>
              <p className="text-sm text-muted-foreground">Elige una conversación para empezar a chatear.</p>
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}

function Thread({
  conversation,
  myId,
  onRead,
}: {
  conversation: Conversation;
  myId: string;
  onRead: () => void;
}) {
  const navigate = useNavigate();
  const other = conversation.other;
  const addListener = useSocialStore((s) => s.addListener);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const markRead = useCallback(() => {
    markConversationRead(other.id).then(onRead);
  }, [other.id, onRead]);

  useEffect(() => {
    getMessagesWith(other.id)
      .then(setMessages)
      .finally(() => setLoading(false));
    markRead();
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [other.id]);

  useEffect(
    () =>
      addListener((m) => {
        const inThread =
          (m.senderId === other.id && m.recipientId === myId) || (m.senderId === myId && m.recipientId === other.id);
        if (!inThread) return;
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          // Our own message echoed back: replace the optimistic copy.
          const pendingIdx = prev.findIndex((x) => x.pending && x.senderId === m.senderId && x.content === m.content);
          if (pendingIdx >= 0) return prev.map((x, i) => (i === pendingIdx ? m : x));
          return [...prev, m];
        });
        if (m.senderId === other.id) markRead();
      }),
    [addListener, other.id, myId, markRead],
  );

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: loading ? "auto" : "smooth" });
  }, [messages.length, loading]);

  async function handleSend() {
    const content = draft.trim();
    if (!content) return;
    const temp: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: myId,
      recipientId: other.id,
      content,
      readAt: null,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, temp]);
    setDraft("");
    try {
      const saved = await sendMessage(other.id, content);
      setMessages((prev) => {
        if (prev.some((x) => x.id === saved.id)) return prev.filter((x) => x.id !== temp.id);
        return prev.map((x) => (x.id === temp.id ? saved : x));
      });
    } catch {
      setMessages((prev) => prev.filter((x) => x.id !== temp.id));
      setDraft(content);
      toast.error("No se pudo enviar el mensaje.");
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  const groups = useMemo(() => {
    const out: { day: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <button
          type="button"
          onClick={() => navigate("/mensajes")}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent md:hidden"
          aria-label="Volver a conversaciones"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Link to={`/perfil/${other.id}`} className="group flex min-w-0 items-center gap-3">
          <UserAvatar src={other.avatarUrl} name={other.displayName} size="sm" />
          <span className="truncate text-sm font-semibold group-hover:text-primary">{other.displayName || "Sin nombre"}</span>
        </Link>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <UserAvatar src={other.avatarUrl} name={other.displayName} size="lg" />
            <p className="font-semibold">{other.displayName}</p>
            <p className="text-sm text-muted-foreground">Empieza la conversación.</p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.day} className="space-y-1">
              <p className="py-2 text-center text-[11px] font-medium capitalize text-muted-foreground">{g.day}</p>
              <AnimatePresence initial={false}>
                {g.items.map((m, i) => {
                  const mine = m.senderId === myId;
                  const next = g.items[i + 1];
                  const lastOfRun = !next || next.senderId !== m.senderId;
                  return (
                    <motion.div
                      key={m.id}
                      layout="position"
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "group max-w-[78%] px-3.5 py-2 text-sm leading-relaxed",
                          mine
                            ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-2xl rounded-bl-md bg-muted text-foreground",
                          !lastOfRun && (mine ? "rounded-br-2xl" : "rounded-bl-2xl"),
                          m.pending && "opacity-60",
                        )}
                        title={clockTime(m.createdAt)}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        {lastOfRun && (
                          <p className={cn("mt-0.5 text-right text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {m.pending ? "Enviando…" : clockTime(m.createdAt)}
                            {mine && !m.pending && m.readAt && " · Visto"}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background/60 p-1.5 pl-3 focus-within:ring-2 focus-within:ring-ring">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKey}
            placeholder="Escribe un mensaje…"
            rows={1}
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-sm [field-sizing:content] placeholder:text-muted-foreground focus-visible:outline-none"
          />
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button size="icon" className="h-9 w-9 rounded-xl" disabled={!draft.trim()} onClick={handleSend} aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </>
  );
}
