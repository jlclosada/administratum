import { UserAvatar } from "@/components/shared/UserAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { notificationLink, notificationText, timeAgo } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/stores";
import type { AppNotification } from "@/types";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Heart, MessageSquare, UserCheck, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TYPE_ICON = {
  friend_request: { Icon: UserPlus, className: "bg-sky-500" },
  friend_accepted: { Icon: UserCheck, className: "bg-emerald-500" },
  like: { Icon: Heart, className: "bg-rose-500" },
  comment_like: { Icon: Heart, className: "bg-rose-500" },
  comment: { Icon: MessageSquare, className: "bg-violet-500" },
} as const;

function NotificationRow({ n, onOpen }: { n: AppNotification; onOpen: () => void }) {
  const actor = useNotificationStore((s) => (n.actorId ? s.actors.get(n.actorId) : undefined));
  const remove = useNotificationStore((s) => s.remove);
  const { Icon, className } = TYPE_ICON[n.type];
  const name = actor?.displayName || "Alguien";

  return (
    <div className={cn("group relative flex gap-3 px-4 py-3 transition-colors hover:bg-accent/60", !n.readAt && "bg-rose-500/[0.05]")}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 gap-3 text-left">
        <span className="relative shrink-0">
          <UserAvatar src={actor?.avatarUrl} name={name} />
          <span
            className={cn(
              "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-card",
              className,
            )}
          >
            <Icon className="h-3 w-3" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-snug">
            <span className="font-semibold">{name}</span> {notificationText(n)}
          </span>
          {n.excerpt && <span className="mt-0.5 block truncate text-xs text-muted-foreground">«{n.excerpt}»</span>}
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
        </span>
      </button>
      {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Sin leer" />}
      <button
        type="button"
        onClick={() => remove(n.id)}
        aria-label="Eliminar notificación"
        className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground group-hover:flex"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const items = useNotificationStore((s) => s.items);
  const unread = useNotificationStore((s) => s.unread);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [open, setOpen] = useState(false);

  function openNotification(n: AppNotification) {
    setOpen(false);
    markRead(n.id);
    navigate(notificationLink(n));
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
          className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            open && "bg-brand-soft text-foreground",
          )}
        >
          <motion.span
            key={unread}
            animate={unread > 0 ? { rotate: [0, -18, 14, -8, 4, 0] } : undefined}
            transition={{ duration: 0.6 }}
            className="flex"
          >
            <Bell className="h-5 w-5" />
          </motion.span>
          {unread > 0 && (
            <motion.span
              key={`b${unread}`}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.6, duration: 0.4 }}
              className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white"
            >
              {unread > 99 ? "99+" : unread}
            </motion.span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="font-display text-sm font-semibold">Notificaciones</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como leídas
            </button>
          )}
        </div>
        <div className="max-h-[min(28rem,70vh)] divide-y divide-border/40 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No tienes notificaciones</p>
              <p className="text-xs text-muted-foreground">
                Aquí verás solicitudes de amistad, me gusta y comentarios en tus publicaciones.
              </p>
            </div>
          ) : (
            items.map((n) => <NotificationRow key={n.id} n={n} onOpen={() => openNotification(n)} />)
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
