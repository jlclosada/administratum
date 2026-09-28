import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatResult } from "@/lib/armyListParser";
import { timeAgo } from "@/lib/time";
import type { CommunityList, Profile } from "@/types";
import { motion } from "framer-motion";
import { ArrowUpRight, Heart, MessageCircle, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * A shared list in the Comunidad feed. The whole card links to the list;
 * the author link sits outside that link (no nested anchors).
 */
export function CommunityListCard({
  list,
  author,
  index = 0,
  showAuthor = true,
}: {
  list: CommunityList;
  author: Profile | undefined;
  index?: number;
  showAuthor?: boolean;
}) {
  const result = formatResult(list.result);
  const units = list.listData.categories.reduce((n, c) => n + c.units.length, 0);
  const name = author?.displayName || list.authorName;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.07, ease: [0.23, 1, 0.32, 1] }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/50 transition-[border-color,box-shadow,transform] duration-300 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:border-emerald-500/40 [@media(hover:hover)]:hover:shadow-[0_20px_60px_-24px_rgba(16,185,129,0.3)]"
    >
      {showAuthor && (
        <header className="flex items-center gap-2.5 px-3.5 py-3">
          <Link to={`/perfil/${list.userId}`} className="shrink-0">
            <UserAvatar src={author?.avatarUrl} name={name} size="sm" />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <Link to={`/perfil/${list.userId}`} className="block truncate text-sm font-semibold hover:underline">
              {name}
            </Link>
            <span className="text-xs text-muted-foreground">{timeAgo(list.createdAt)}</span>
          </div>
        </header>
      )}

      <Link to={`/comunidad/listas/${list.id}`} className="flex flex-1 flex-col bg-[#050807] font-mono">
        <div className="flex items-center justify-between gap-2 border-y border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-2">
          <span className="flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-500/80">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate">{list.factionName}</span>
          </span>
          <span className="shrink-0 text-xs text-emerald-400">{list.totalPoints} pts</span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-sans text-lg font-bold leading-tight text-zinc-100">{list.title}</h3>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-500/50 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
          </div>
          {list.detachmentName && <p className="truncate text-xs text-zinc-500">&gt; {list.detachmentName}</p>}
          <p className="line-clamp-3 font-sans text-sm leading-relaxed text-zinc-400">{list.description}</p>
        </div>
        <div className="flex items-center gap-4 border-t border-emerald-500/15 px-4 py-2.5 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" /> {list.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> {list.commentCount}
          </span>
          <span>{units} unidades</span>
          {result && (
            <span className="ml-auto flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
              <Trophy className="h-3 w-3" /> {result}
            </span>
          )}
        </div>
      </Link>
    </motion.article>
  );
}
