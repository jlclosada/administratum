import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createSharedPhoto } from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import type { SharedPhoto } from "@/types";
import { ImageIcon, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SharePhotoDialog({
  onClose,
  onShared,
}: {
  onClose: () => void;
  onShared: (photo: SharedPhoto) => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [armyName, setArmyName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handlePick() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploading(true);
      setImage(await uploadFile(file, "shared"));
    } catch (err) {
      console.error("Failed to upload photo:", err);
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleShare() {
    if (!image) return;
    setSaving(true);
    try {
      const created = await createSharedPhoto({
        image,
        caption: caption.trim(),
        armyName: armyName.trim() || null,
      });
      toast.success("Foto compartida con la comunidad");
      onShared(created);
    } catch (err) {
      console.error("Failed to share photo:", err);
      toast.error("No se pudo compartir la foto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Compartir foto</DialogTitle>
        <div className="space-y-4">
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : image ? (
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2">
                <ImageIcon className="h-6 w-6" />
                <span className="text-sm">Elegir foto</span>
              </span>
            )}
          </button>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Escribe una descripción…"
          />
          <Input
            value={armyName}
            onChange={(e) => setArmyName(e.target.value)}
            placeholder="Ejército o facción (opcional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button className="gap-2" disabled={!image || saving} onClick={handleShare}>
              {saving ? "Compartiendo..." : "Compartir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
