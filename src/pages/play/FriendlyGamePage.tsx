import { GameTracker } from "@/components/play/GameTracker";
import { Button } from "@/components/ui/button";
import { confirmFriendlyGame, deleteFriendlyGame, getFriendlyGame, subscribeToFriendlyGame, updateFriendlyGame } from "@/db";
import { parseArmyListExport } from "@/lib/armyListParser";
import type { FriendlyGame } from "@/lib/play/types";
import { useAuthStore } from "@/stores";
import { Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const detachmentOf = (list: string) => (list ? (parseArmyListExport(list)?.detachmentName ?? undefined) : undefined);

/** A one-off game: the shared tracker, saved to both players' history. */
export function FriendlyGamePage() {
  const { gameId = "" } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [game, setGame] = useState<FriendlyGame | null | undefined>(undefined);

  const load = useCallback(() => getFriendlyGame(gameId).then(setGame), [gameId]);
  useEffect(() => {
    load();
  }, [load]);

  // Live from the other phone, with a slow refresh as a fallback.
  useEffect(() => {
    if (!game || game.status === "confirmed") return;
    const unsubscribe = subscribeToFriendlyGame(gameId, load);
    const id = setInterval(() => document.visibilityState === "visible" && load(), 20_000);
    return () => {
      unsubscribe();
      clearInterval(id);
    };
  }, [gameId, game?.status, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (game === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!game) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Partida no encontrada</h1>
        <p className="text-sm text-muted-foreground">Solo la ven los dos jugadores.</p>
        <Button asChild variant="gradient">
          <Link to="/competitivo/partidas">Mis partidas</Link>
        </Button>
      </div>
    );
  }

  const uid = user?.id;
  const open = game.status !== "confirmed";
  const isA = !!uid && (uid === game.playerA || uid === game.createdBy);
  // Against someone without an account, the creator keeps both sides.
  const canB = !!uid && (uid === game.playerB || (!game.playerB && isA));

  async function remove() {
    if (!window.confirm("¿Borrar esta partida? No se puede deshacer.")) return;
    try {
      await deleteFriendlyGame(game!.id);
      navigate("/competitivo/partidas", { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <GameTracker
        game={{ ...game, label: `${game.pointsLimit} pts` }}
        sides={{
          a: { name: game.nameA, faction: game.factionA, listText: game.listA || undefined, listDetachment: detachmentOf(game.listA) },
          b: { name: game.nameB, faction: game.factionB, listText: game.listB || undefined, listDetachment: detachmentOf(game.listB) },
        }}
        can={{ a: open && isA, b: open && canB }}
        back={{ to: "/competitivo/partidas", label: "Mis partidas" }}
        seo={{ title: `${game.nameA} vs ${game.nameB}`, path: `/competitivo/partida/${game.id}` }}
        confirmedNote="Queda en el historial de los dos."
        load={() => getFriendlyGame(game.id)}
        save={(patch) => updateFriendlyGame(game.id, patch)}
        submit={() => updateFriendlyGame(game.id, { status: "submitted" })}
        confirm={() => confirmFriendlyGame(game.id)}
        onChanged={load}
      />
      {uid === game.createdBy && (
        <div className="mx-auto flex max-w-4xl justify-end">
          <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" /> Borrar partida
          </Button>
        </div>
      )}
    </div>
  );
}
