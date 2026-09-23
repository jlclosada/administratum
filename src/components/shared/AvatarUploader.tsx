import { Button } from "@/components/ui/button";
import { pickFiles, removeFileByUrl, uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { AlertCircle, Camera, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

const MAX_SIZE = 5 * 1024 * 1024;

export function AvatarUploader({
  avatarUrl,
  fallbackLabel,
  onChange,
}: {
  avatarUrl: string | null;
  fallbackLabel: string;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    setError(null);
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Selecciona un archivo de imagen.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("La imagen no puede superar los 5 MB.");
        return;
      }
      setUploading(true);
      const previous = avatarUrl;
      const url = await uploadFile(file, "avatar");
      onChange(url);
      if (previous) removeFileByUrl(previous).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    const previous = avatarUrl;
    onChange(null);
    if (previous) removeFileByUrl(previous).catch(() => {});
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
      <div
        className={cn(
          "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-gradient text-2xl font-bold uppercase text-white",
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span>{fallbackLabel}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handlePick}
            disabled={uploading}
          >
            <Camera className="h-3.5 w-3.5" />
            {avatarUrl ? "Cambiar foto" : "Subir foto"}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleRemove}
              disabled={uploading}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Quitar
            </Button>
          )}
        </div>
        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 5 MB.</p>
        )}
      </div>
    </div>
  );
}
