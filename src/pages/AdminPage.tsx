import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    createArmyPreset,
    createMiniatureSpotlight,
    deleteArmyPreset,
    getAppConfig,
    getArmyPresets,
    getCurrentMiniatureSpotlight,
    getDashboardStats,
    getUnitCatalogCount,
    upsertFactionCatalog,
    upsertUnitCatalog,
    updateAppConfig,
} from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { pickFiles, uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { AppConfig, ArmyPreset, DashboardStats, FactionCatalogEntry, MiniatureSpotlight, UnitCatalogEntry } from "@/types";
import { PRESET_GAMES } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
    ImageIcon,
    Loader2,
    Megaphone,
    MonitorPlay,
    Palette,
    Plus,
    RefreshCw,
    Save,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Star,
    Sword,
    Trash2,
    Trophy,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4 text-left transition-colors hover:border-primary/30"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-gradient" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

export function AdminPage() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [config, setConfig] = useState<AppConfig>({
    announcement: "",
    announcementEnabled: false,
    signupsEnabled: true,
  });

  // Faction (army preset) management
  const [selectedGame, setSelectedGame] = useState<string>(
    PRESET_GAMES[0]?.name ?? ""
  );
  const [presets, setPresets] = useState<ArmyPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [factionName, setFactionName] = useState("");
  const [factionDesc, setFactionDesc] = useState("");
  const [factionColor, setFactionColor] = useState("#8b5cf6");
  const [factionImage, setFactionImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [creatingFaction, setCreatingFaction] = useState(false);
  const [catalogCount, setCatalogCount] = useState(0);
  const [syncingCatalog, setSyncingCatalog] = useState(false);

  // Miniature spotlight ("Miniatura del mes")
  const [spotlight, setSpotlight] = useState<MiniatureSpotlight | null>(null);
  const [spotlightTitle, setSpotlightTitle] = useState("");
  const [spotlightFaction, setSpotlightFaction] = useState("");
  const [spotlightPainter, setSpotlightPainter] = useState("");
  const [spotlightDesc, setSpotlightDesc] = useState("");
  const [spotlightImage, setSpotlightImage] = useState<string | null>(null);
  const [uploadingSpotlightImage, setUploadingSpotlightImage] = useState(false);
  const [savingSpotlight, setSavingSpotlight] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [cfg, dashboard, units, currentSpotlight] = await Promise.all([
          getAppConfig(),
          getDashboardStats(),
          getUnitCatalogCount(),
          getCurrentMiniatureSpotlight(),
        ]);
        setConfig(cfg);
        setStats(dashboard);
        setCatalogCount(units);
        setSpotlight(currentSpotlight);
      } catch (err) {
        console.error("Failed to load admin data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateAppConfig(config);
      toast.success("Configuración guardada");
    } catch (err) {
      console.error("Failed to save config:", err);
      toast.error("No se pudo guardar. Revisa tus permisos de administrador.");
    } finally {
      setSaving(false);
    }
  }

  // ---- Faction management ----
  useEffect(() => {
    if (!isAdmin || !selectedGame) return;
    setPresetsLoading(true);
    getArmyPresets(selectedGame)
      .then(setPresets)
      .catch((err) => console.error("Failed to load presets:", err))
      .finally(() => setPresetsLoading(false));
  }, [isAdmin, selectedGame]);

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

  // ---- Miniature spotlight ----
  async function handlePickSpotlightImage() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploadingSpotlightImage(true);
      const url = await uploadFile(file, "spotlight");
      setSpotlightImage(url);
    } catch (err) {
      console.error("Failed to upload spotlight image:", err);
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploadingSpotlightImage(false);
    }
  }

  async function handlePublishSpotlight() {
    if (!spotlightTitle.trim()) return;
    setSavingSpotlight(true);
    try {
      const created = await createMiniatureSpotlight({
        title: spotlightTitle.trim(),
        factionName: spotlightFaction.trim() || null,
        painterName: spotlightPainter.trim() || null,
        description: spotlightDesc.trim(),
        image: spotlightImage,
      });
      setSpotlight(created);
      setSpotlightTitle("");
      setSpotlightFaction("");
      setSpotlightPainter("");
      setSpotlightDesc("");
      setSpotlightImage(null);
      toast.success("Miniatura del mes publicada");
    } catch (err) {
      console.error("Failed to publish spotlight:", err);
      toast.error("No se pudo publicar. Revisa tus permisos.");
    } finally {
      setSavingSpotlight(false);
    }
  }

  if (!isAdmin) {
    return (
      <PageTransition>
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Acceso restringido</h1>
          <p className="text-sm text-muted-foreground">
            Este panel solo está disponible para la cuenta administradora.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
        </div>
      </PageTransition>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando panel..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lg glow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Administración
            </h1>
            <p className="text-muted-foreground">
              Panel del creador · gestiona la web
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } },
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
              <StatCard label="Miniaturas" value={stats.totalMiniatures} icon={<Sword className="h-5 w-5" />} color="#8b5cf6" />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
              <StatCard label="Pintadas" value={stats.totalPainted} icon={<Palette className="h-5 w-5" />} color="#34d399" />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
              <StatCard label="Ejércitos" value={stats.totalArmies} icon={<Users className="h-5 w-5" />} color="#60a5fa" />
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
              <StatCard label="Juegos" value={stats.totalGames} icon={<Sword className="h-5 w-5" />} color="#f59e0b" />
            </motion.div>
          </motion.div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Catálogo Munitorum (Warhammer 40,000)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Registra en la base de datos todas las miniaturas oficiales con sus
              puntos. Después, al añadir una miniatura a un ejército, el usuario
              podrá buscarla y seleccionarla.
            </p>
            <p className="text-sm">
              Unidades en base de datos:{" "}
              <span className="font-semibold">{catalogCount}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Cada día un cron vuelve a leer el Munitorum Field Manual. Si cambian
              los puntos, se actualizan el catálogo y todas las miniaturas de los
              usuarios enlazadas a esas fichas.
            </p>
            <Button
              onClick={handleSyncCatalog}
              disabled={syncingCatalog}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncingCatalog ? "animate-spin" : ""}`} />
              {syncingCatalog ? "Sincronizando..." : "Sincronizar catálogo MFM"}
            </Button>
          </CardContent>
        </Card>

        {/* Announcement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Anuncio global
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Muestra un banner en la parte superior de la app para todos los
              usuarios (por ejemplo, mantenimiento o novedades).
            </p>
            <div className="space-y-2">
              <Label htmlFor="announcement">Mensaje</Label>
              <Textarea
                id="announcement"
                value={config.announcement}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, announcement: e.target.value }))
                }
                placeholder="Ej: Nueva actualización disponible..."
                rows={2}
              />
            </div>
            <Toggle
              checked={config.announcementEnabled}
              onChange={(v) =>
                setConfig((c) => ({ ...c, announcementEnabled: v }))
              }
              label="Mostrar anuncio"
              description="Activa el banner para todos los usuarios."
            />
          </CardContent>
        </Card>

        {/* Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Acceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Toggle
              checked={config.signupsEnabled}
              onChange={(v) => setConfig((c) => ({ ...c, signupsEnabled: v }))}
              label="Permitir nuevos registros"
              description="Si se desactiva, oculta el formulario de registro en la pantalla de acceso."
            />
          </CardContent>
        </Card>

        {/* Miniature spotlight */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Miniatura del mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se muestra en el hueco destacado de la página de inicio. Publicar una
              nueva sustituye la que se ve ahora mismo (el historial se conserva).
            </p>
            {spotlight && (
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {spotlight.image && (
                    <img src={spotlight.image} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">Actual: {spotlight.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[spotlight.factionName, spotlight.painterName].filter(Boolean).join(" · ") || "Sin detalles"}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={handlePickSpotlightImage}
                disabled={uploadingSpotlightImage}
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              >
                {uploadingSpotlightImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : spotlightImage ? (
                  <img src={spotlightImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6" />
                )}
              </button>
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  value={spotlightTitle}
                  onChange={(e) => setSpotlightTitle(e.target.value)}
                  placeholder="Nombre de la miniatura"
                />
                <Input
                  value={spotlightFaction}
                  onChange={(e) => setSpotlightFaction(e.target.value)}
                  placeholder="Facción (opcional)"
                />
                <Input
                  value={spotlightPainter}
                  onChange={(e) => setSpotlightPainter(e.target.value)}
                  placeholder="Pintada por (opcional)"
                  className="sm:col-span-2"
                />
              </div>
            </div>
            <Textarea
              value={spotlightDesc}
              onChange={(e) => setSpotlightDesc(e.target.value)}
              placeholder="Notas sobre la técnica, el esquema de color…"
              rows={2}
            />
            <Button
              onClick={handlePublishSpotlight}
              disabled={savingSpotlight || !spotlightTitle.trim()}
              className="gap-2"
            >
              <Star className="h-4 w-4" />
              {savingSpotlight ? "Publicando..." : "Publicar como miniatura del mes"}
            </Button>
          </CardContent>
        </Card>

        {/* Users + ads live on their own pages, like Competitivo */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Consulta los usuarios, nombra administradores o elimina cuentas.
              </p>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/usuarios")}>
                <Users className="h-4 w-4" />
                Gestionar usuarios
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorPlay className="h-5 w-5 text-primary" />
                Publicidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Anuncios de imagen con enlace en los márgenes laterales de la web.
              </p>
              <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/publicidad")}>
                <MonitorPlay className="h-4 w-4" />
                Gestionar anuncios
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Competitivo (tournaments + featured lists) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Competitivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gestiona los torneos y las listas destacadas que se muestran en la
              sección Competitivo.
            </p>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/competitivo")}>
              <Trophy className="h-4 w-4" />
              Abrir gestión de Competitivo
            </Button>
          </CardContent>
        </Card>

        {/* Factions per game */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Facciones por juego
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Define las facciones que los usuarios podrán elegir al crear un
              ejército. Cada facción tiene su propia imagen.
            </p>

            {/* Game selector */}
            <div className="flex flex-wrap gap-2">
              {PRESET_GAMES.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => setSelectedGame(g.name)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
                    selectedGame === g.name
                      ? "border-transparent bg-brand-gradient text-white shadow"
                      : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {g.name}
                </button>
              ))}
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
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            variant="gradient"
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
