import { ArmyListCard } from "@/components/shared/ArmyListNode";
import { ArmyListPasteField } from "@/components/shared/ArmyListPasteField";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addTeamPostComment,
  createTeamPost,
  deleteTeamPost,
  deleteTeamPostComment,
  getTeamPostComments,
  getTeamPosts,
  setTeamPostPinned,
} from "@/db";
import type { ParsedArmyList } from "@/lib/armyListParser";
import { timeAgo } from "@/lib/notifications";
import { pickFiles, uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Profile, TeamPost, TeamPostComment } from "@/types";
import { ImageIcon, Loader2, MessageSquare, Pin, PinOff, ScrollText, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

function Composer({ teamId, onPosted, startWithList }: { teamId: string; onPosted: (p: TeamPost) => void; startWithList?: boolean }) {
  const [body, setBody] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [withList, setWithList] = useState(!!startWithList);
  const [raw, setRaw] = useState("");
  const [list, setList] = useState<ParsedArmyList | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<"upload" | "post" | null>(null);

  async function addImage() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setBusy("upload");
      setImage(await uploadFile(file, "teams"));
    } catch {
      toast.error("No se pudo subir la imagen.");
    } finally {
      setBusy(null);
    }
  }

  const canPost = withList ? !!list : body.trim().length > 0 || !!image;

  async function post() {
    if (!canPost) return;
    setBusy("post");
    try {
      const created = await createTeamPost({
        teamId,
        body: body.trim(),
        image,
        list: withList && list ? { title: title.trim() || list.listName || `${list.factionName} ${list.totalPoints} pts`, data: list } : null,
      });
      onPosted(created);
      setBody("");
      setImage(null);
      setRaw("");
      setList(null);
      setTitle("");
      setWithList(false);
    } catch {
      toast.error("No se pudo publicar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-4">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={withList ? 2 : 3}
        maxLength={4000}
        placeholder={withList ? "¿Qué quieres que miren de la lista? (opcional)" : "Escribe al equipo: quedadas, ideas, avisos…"}
      />
      {image && (
        <div className="relative w-fit">
          <img src={image} alt="" className="max-h-48 rounded-xl" />
          <button
            type="button"
            onClick={() => setImage(null)}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
            aria-label="Quitar imagen"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {withList && (
        <div className="space-y-2 rounded-xl border border-border/60 p-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la lista (p. ej. Magnus 2000 pts)" maxLength={80} />
          <ArmyListPasteField value={raw} onChange={setRaw} onParsed={setList} rows={6} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={addImage} disabled={busy !== null}>
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />} Imagen
        </Button>
        <Button
          type="button"
          variant={withList ? "secondary" : "ghost"}
          size="sm"
          className="gap-2"
          onClick={() => setWithList((v) => !v)}
        >
          <ScrollText className="h-4 w-4" /> {withList ? "Quitar lista" : "Compartir lista"}
        </Button>
        <Button type="button" variant="gradient" size="sm" className="ml-auto gap-2" onClick={post} disabled={!canPost || busy !== null}>
          {busy === "post" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publicar
        </Button>
      </div>
    </section>
  );
}

function Comments({
  post,
  profiles,
  myId,
  canModerate,
  onCount,
}: {
  post: TeamPost;
  profiles: Map<string, Profile>;
  myId: string | undefined;
  canModerate: boolean;
  onCount: (n: number) => void;
}) {
  const [comments, setComments] = useState<TeamPostComment[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getTeamPostComments(post.id).then(setComments);
  }, [post.id]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const c = await addTeamPostComment(post.id, post.teamId, text.trim());
      const next = [...(comments ?? []), c];
      setComments(next);
      onCount(next.length);
      setText("");
    } catch {
      toast.error("No se pudo comentar.");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    await deleteTeamPostComment(id).catch(() => toast.error("No se pudo borrar."));
    const next = (comments ?? []).filter((c) => c.id !== id);
    setComments(next);
    onCount(next.length);
  }

  return (
    <div className="space-y-3 border-t border-border/50 pt-3">
      {comments === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        comments.map((c) => {
          const author = profiles.get(c.authorId);
          return (
            <div key={c.id} className="group flex gap-2.5">
              <UserAvatar src={author?.avatarUrl} name={author?.displayName} size="sm" />
              <div className="min-w-0 flex-1 rounded-xl bg-muted/60 px-3 py-2">
                <p className="text-xs">
                  <span className="font-semibold">{author?.displayName ?? "Miembro"}</span>
                  <span className="ml-2 text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </p>
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              </div>
              {(c.authorId === myId || canModerate) && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="self-center rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Borrar comentario"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })
      )}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escribe un comentario…"
          maxLength={1000}
        />
        <Button size="icon" onClick={send} disabled={sending || !text.trim()} aria-label="Comentar">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

/** A shared army list, folded to a preview until the reader opens it. */
function CollapsibleList({ post, authorName }: { post: TeamPost; authorName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className={cn(!open && "max-h-64 overflow-hidden")}>
        <ArmyListCard data={post.listData!} authorName={authorName} result={null} />
      </div>
      {!open && (
        <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-gradient-to-t from-card to-transparent pb-3">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Ver lista completa · {post.listData!.totalPoints} pts
          </Button>
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  profiles,
  myId,
  canModerate,
  onChange,
  onDelete,
}: {
  post: TeamPost;
  profiles: Map<string, Profile>;
  myId: string | undefined;
  canModerate: boolean;
  onChange: (p: TeamPost) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const author = profiles.get(post.authorId);

  async function togglePin() {
    try {
      await setTeamPostPinned(post.id, !post.pinned);
      onChange({ ...post, pinned: !post.pinned });
    } catch {
      toast.error("No se pudo fijar.");
    }
  }

  return (
    <article className={cn("space-y-3 rounded-2xl border bg-card/40 p-4", post.pinned ? "border-primary/40" : "border-border/60")}>
      <header className="flex items-center gap-3">
        <Link to={`/perfil/${post.authorId}`}>
          <UserAvatar src={author?.avatarUrl} name={author?.displayName} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{author?.displayName ?? "Miembro"}</p>
          <p className="text-xs text-muted-foreground">
            {timeAgo(post.createdAt)}
            {post.kind === "list" && " · ha compartido una lista"}
          </p>
        </div>
        {post.pinned && (
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
            <Pin className="h-3 w-3" /> Fijado
          </span>
        )}
        {canModerate && (
          <button type="button" onClick={togglePin} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={post.pinned ? "Desfijar" : "Fijar"} title={post.pinned ? "Desfijar" : "Fijar arriba"}>
            {post.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        )}
        {(post.authorId === myId || canModerate) && (
          <button type="button" onClick={onDelete} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Borrar publicación">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>
      {post.listTitle && <h3 className="font-display text-lg font-bold">{post.listTitle}</h3>}
      {post.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>}
      {post.image && <img src={post.image} alt="" loading="lazy" className="max-h-[480px] w-full rounded-xl object-cover" />}
      {post.listData && <CollapsibleList post={post} authorName={author?.displayName ?? ""} />}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <MessageSquare className="h-4 w-4" />
        {post.commentCount ? `${post.commentCount} ${post.commentCount === 1 ? "comentario" : "comentarios"}` : "Comentar"}
      </button>
      {open && (
        <Comments
          post={post}
          profiles={profiles}
          myId={myId}
          canModerate={canModerate}
          onCount={(n) => onChange({ ...post, commentCount: n })}
        />
      )}
    </article>
  );
}

/** The team's board: posts, shared army lists and their comments. */
export function TeamBoard({
  teamId,
  profiles,
  myId,
  canModerate,
  listsOnly = false,
}: {
  teamId: string;
  /** Profiles of the members (authors of posts and comments). */
  profiles: Map<string, Profile>;
  myId: string | undefined;
  canModerate: boolean;
  listsOnly?: boolean;
}) {
  const [posts, setPosts] = useState<TeamPost[] | null>(null);

  useEffect(() => {
    getTeamPosts(teamId).then(setPosts);
  }, [teamId]);

  const shown = (posts ?? []).filter((p) => !listsOnly || p.kind === "list");
  const sorted = [...shown].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));

  async function remove(id: string) {
    try {
      await deleteTeamPost(id);
      setPosts((prev) => (prev ?? []).filter((p) => p.id !== id));
    } catch {
      toast.error("No se pudo borrar.");
    }
  }

  return (
    <div className="space-y-4">
      <Composer key={listsOnly ? "lists" : "posts"} teamId={teamId} startWithList={listsOnly} onPosted={(p) => setPosts((prev) => [p, ...(prev ?? [])])} />
      {posts === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
          {listsOnly ? "Nadie ha compartido listas todavía. Pega la tuya para que el equipo la revise." : "El tablón está vacío. ¡Escribe la primera publicación!"}
        </p>
      ) : (
        sorted.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            profiles={profiles}
            myId={myId}
            canModerate={canModerate}
            onChange={(next) => setPosts((prev) => (prev ?? []).map((x) => (x.id === next.id ? next : x)))}
            onDelete={() => remove(p.id)}
          />
        ))
      )}
    </div>
  );
}
