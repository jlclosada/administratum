import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { acceptFriendRequest, removeFriendship, sendFriendRequest } from "@/db";
import { useSocialStore } from "@/stores";
import type { Friendship } from "@/types";
import { Check, ChevronDown, Clock, Loader2, UserMinus, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Add / cancel / accept / unfriend, depending on the current friendship. */
export function FriendButton({
  userId,
  myId,
  friendship,
  onChange,
}: {
  userId: string;
  myId: string;
  friendship: Friendship | null;
  onChange: (f: Friendship | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const refreshSocial = useSocialStore((s) => s.refresh);

  async function run(action: () => Promise<Friendship | null>, success?: string) {
    setBusy(true);
    try {
      onChange(await action());
      if (success) toast.success(success);
      refreshSocial();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  const spinner = busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null;

  if (!friendship) {
    return (
      <Button
        variant="gradient"
        className="gap-2"
        disabled={busy}
        onClick={() => run(() => sendFriendRequest(userId), "Solicitud de amistad enviada")}
      >
        {spinner ?? <UserPlus className="h-4 w-4" />}
        Añadir amigo
      </Button>
    );
  }

  if (friendship.status === "pending" && friendship.requesterId === myId) {
    return (
      <Button
        variant="outline"
        className="gap-2"
        disabled={busy}
        onClick={() =>
          run(async () => {
            await removeFriendship(friendship.id);
            return null;
          }, "Solicitud cancelada")
        }
        title="Cancelar solicitud"
      >
        {spinner ?? <Clock className="h-4 w-4" />}
        Solicitud enviada
      </Button>
    );
  }

  if (friendship.status === "pending") {
    return (
      <div className="flex gap-2">
        <Button
          variant="gradient"
          className="gap-2"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await acceptFriendRequest(friendship.id);
              return { ...friendship, status: "accepted" };
            }, "¡Ahora sois amigos!")
          }
        >
          {spinner ?? <Check className="h-4 w-4" />}
          Aceptar
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await removeFriendship(friendship.id);
              return null;
            })
          }
          aria-label="Rechazar solicitud"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={busy}>
          {spinner ?? <Check className="h-4 w-4 text-emerald-500" />}
          Amigos
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() =>
            run(async () => {
              await removeFriendship(friendship.id);
              return null;
            }, "Amistad eliminada")
          }
          className="text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
        >
          <UserMinus className="h-4 w-4" />
          Eliminar amistad
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
