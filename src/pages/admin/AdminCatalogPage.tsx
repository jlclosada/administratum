import { AdminShell } from "@/components/shared/AdminShell";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COLLECTION_GAME_NAME,
  createArmyPreset,
  deleteArmyPreset,
  getArmyPresets,
  getUnitCatalogCount,
  upsertFactionCatalog,
  upsertUnitCatalog,
} from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { ArmyPreset, FactionCatalogEntry, UnitCatalogEntry } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, Loader2, Plus, RefreshCw, Shield, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AdminCatalogPage() {
  // Warhammer 40,000 only.
  const selectedGame = COLLECTION_GAME_NAME;
  const [presets, setPresets] = useState<ArmyPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [factionName, setFactionName] = useState("");
  const [factionDesc, setFactionDesc] = useState("");
  const [factionColor, setFactionColor] = useState("#8b5cf6");
  const [factionImage, setFactionImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [creatingFaction, setCreatingFaction] = useState(false);
  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [syncingCatalog, setSyncingCatalog] = useState(false);

  useEffect(() => {
    getUnitCatalogCount().then(setCatalogCount);
  }, []);

  // ---- Faction management ----
  useEffect(() => {
    if (!selectedGame) return;
    setPresetsLoading(true);
    getArmyPresets(selectedGame)
      .then(setPresets)
      .catch((err) => console.error("Failed to load presets:", err))
      .finally(() => setPresetsLoading(false));
  }, [selectedGame]);

  async function handlePickFactionImage() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploadingImage(true);
      const url = await uploadFile(file, "factions");
      setFactionImage(url);
    } catch (err) {
      console.error("Failed to upload image:", err);
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleCreateFaction() {
    if (!factionName.trim() || !selectedGame) return;
    setCreatingFaction(true);
    try {
      const created = await createArmyPreset({
        gameName: selectedGame,
        name: factionName.trim(),
        description: factionDesc.trim(),
        color: factionColor,
        image: factionImage,
        sortOrder: presets.length,
      });
      setPresets((p) => [...p, created]);
      setFactionName("");
      setFactionDesc("");
      setFactionColor("#8b5cf6");
      setFactionImage(null);
      toast.success("Facción creada");
    } catch (err) {
      console.error("Failed to create faction:", err);
      toast.error("No se pudo crear la facción. Revisa tus permisos.");
    } finally {
      setCreatingFaction(false);
    }
  }

  async function handleSyncCatalog() {
    setSyncingCatalog(true);
    try {
      const res = await fetch("/data/mfm-catalog.json");
      if (!res.ok) throw new Error("No se pudo leer el catálogo MFM");
      const file = (await res.json()) as {
        version?: string;
        unitCount?: number;
        units: Omit<UnitCatalogEntry, "id" | "createdAt" | "updatedAt">[];
        factions?: Omit<FactionCatalogEntry, "id" | "createdAt" | "updatedAt">[];
      };
      if (!file.units?.length) throw new Error("El catálogo está vacío");
      await upsertUnitCatalog(file.units);
      if (file.factions?.length) await upsertFactionCatalog(file.factions);
      const n = await getUnitCatalogCount();
      setCatalogCount(n);
      toast.success(
        `Catálogo sincronizado: ${n} unidades${file.factions?.length ? `, ${file.factions.length} facciones` : ""} (MFM ${file.version ?? ""})`,
      );
    } catch (err) {
      console.error("Failed to sync catalog:", err);
      toast.error(
        "No se pudo sincronizar. Ejecuta supabase/unit_catalog.sql en Supabase y vuelve a intentar.",
      );
    } finally {
      setSyncingCatalog(false);
    }
  }

  async function handleDeleteFaction(id: string) {
    try {
      await deleteArmyPreset(id);
      setPresets((p) => p.filter((x) => x.id !== id));
      toast.success("Facción eliminada");
    } catch (err) {
      console.error("Failed to delete faction:", err);
      toast.error("No se pudo eliminar la facción.");
    }
  }


  return (
    <AdminShell title="Catálogo y facciones" subtitle="Datos oficiales del Munitorum y facciones disponibles al crear ejércitos">
      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 font-semibold">
            <RefreshCw className="h-4 w-4 text-primary" /> Catálogo Munitorum (Warhammer 40,000)
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Un cron relee el Munitorum Field Manual cada día y actualiza puntos del catálogo y de las miniaturas
            enlazadas. Puedes forzar una sincronización manual desde el fichero incluido.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <p className="font-display text-2xl font-black tabular-nums">{catalogCount ?? "—"}</p>
            <p className="text-xs text-muted-foreground">unidades</p>
          </div>
          <Button onClick={handleSyncCatalog} disabled={syncingCatalog} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", syncingCatalog && "animate-spin")} />
            {syncingCatalog ? "Sincronizando…" : "Sincronizar"}
          </Button>
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-border/60 bg-card/30 p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Shield className="h-4 w-4 text-primary" /> Facciones de Warhammer 40.000
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Las facciones que los usuarios pueden elegir al crear un ejército, cada una con su imagen.
          </p>
        </div>
            {/* Existing factions */}
            {presetsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : presets.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <AnimatePresence>
                  {presets.map((preset) => (
                    <motion.div
                      key={preset.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border/60 bg-card/40 p-2.5"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                        {preset.image ? (
                          <img
                            src={preset.image}
                            alt={preset.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-full w-full items-center justify-center"
                            style={{ backgroundColor: `${preset.color}33` }}
                          >
                            <Shield
                              className="h-6 w-6"
                              style={{ color: preset.color }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: preset.color }}
                          />
                          <p className="truncate text-sm font-semibold">
                            {preset.name}
                          </p>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {preset.description || "Sin descripción"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaction(preset.id)}
                        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Eliminar facción"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border/60 py-6 text-center text-sm text-muted-foreground">
                No hay facciones para {selectedGame}. Crea la primera abajo.
              </p>
            )}

            {/* New faction form */}
            <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
              <p className="text-sm font-semibold">Nueva facción</p>
              <div className="flex gap-4">
                {/* Image */}
                {factionImage ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border">
                    <img
                      src={factionImage}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFactionImage(null)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePickFactionImage}
                    disabled={uploadingImage}
                    className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-[10px]">Imagen</span>
                      </>
                    )}
                  </button>
                )}
                {/* Fields */}
                <div className="flex-1 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="faction-name">Nombre</Label>
                    <Input
                      id="faction-name"
                      value={factionName}
                      onChange={(e) => setFactionName(e.target.value)}
                      placeholder="Ej: Ultramarines"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="faction-color" className="shrink-0">
                      Color
                    </Label>
                    <input
                      type="color"
                      id="faction-color"
                      value={factionColor}
                      onChange={(e) => setFactionColor(e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border border-input bg-transparent"
                    />
                    <span className="text-xs text-muted-foreground">
                      {factionColor}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faction-desc">Descripción (opcional)</Label>
                <Textarea
                  id="faction-desc"
                  value={factionDesc}
                  onChange={(e) => setFactionDesc(e.target.value)}
                  placeholder="Breve descripción de la facción..."
                  rows={2}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateFaction}
                  disabled={!factionName.trim() || creatingFaction}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {creatingFaction ? "Creando..." : "Añadir facción"}
                </Button>
              </div>
            </div>
      </section>
    </AdminShell>
  );
}
