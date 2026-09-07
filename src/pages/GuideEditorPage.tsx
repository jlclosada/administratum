import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { RichTextEditor } from "@/components/shared/RichText";
import { TagsInput } from "@/components/shared/TagsInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGuide, getArmyPresets, getGuideById, searchPaints, updateGuide } from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import { useAuthStore } from "@/stores";
import type { GuidePaint, Paint, RichContent } from "@/types";
import { PRESET_ARMIES, PRESET_GAMES } from "@/types";
import { ArrowLeft, ImageIcon, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function GuideEditorPage() {
  const { guideId } = useParams<{ guideId: string }>();
  const isEdit = !!guideId;
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [gameName, setGameName] = useState<string>("");
  const [armyName, setArmyName] = useState("");
  const [factionOptions, setFactionOptions] = useState<string[]>([]);
  const [customFaction, setCustomFaction] = useState(false);
  const [paints, setPaints] = useState<GuidePaint[]>([]);
  const [content, setContent] = useState<RichContent>(null);

  // Paint search
  const [paintQuery, setPaintQuery] = useState("");
  const [paintResults, setPaintResults] = useState<Paint[]>([]);
  const paintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isEdit || !guideId) return;
    getGuideById(guideId)
      .then((g) => {
        if (!g) return;
        if (userId && g.userId !== userId) {
          setForbidden(true);
          return;
        }
        setTitle(g.title);
        setSummary(g.summary);
        setCoverImage(g.coverImage);
        setImages(g.images);
        setTags(g.tags);
        setGameName(g.gameName ?? "");
        setArmyName(g.armyName ?? "");
        setPaints(g.paints);
        setContent(g.content);
      })
      .catch((err) => console.error("Failed to load guide:", err))
      .finally(() => setLoading(false));
  }, [isEdit, guideId, userId]);

  useEffect(() => {
    if (paintTimer.current) clearTimeout(paintTimer.current);
    if (!paintQuery.trim()) {
      setPaintResults([]);
      return;
    }
    paintTimer.current = setTimeout(async () => {
      const res = await searchPaints(paintQuery.trim());
      setPaintResults(res.slice(0, 8));
    }, 200);
  }, [paintQuery]);

  // Load selectable factions for the chosen game (admin presets + defaults).
  useEffect(() => {
    if (!gameName) {
      setFactionOptions([]);
      return;
    }
    let active = true;
    (async () => {
      const presets = await getArmyPresets(gameName);
      const names = new Set<string>(presets.map((p) => p.name));
      for (const p of PRESET_ARMIES[gameName] ?? []) names.add(p.name);
      if (active) setFactionOptions(Array.from(names).sort());
    })();
    return () => {
      active = false;
    };
  }, [gameName]);

  // When switching to a game whose faction list doesn't include the current
  // army name, treat it as a custom faction so the value is preserved.
  useEffect(() => {
    if (armyName && factionOptions.length > 0 && !factionOptions.includes(armyName)) {
      setCustomFaction(true);
    }
  }, [factionOptions, armyName]);

  async function handlePickCover() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploadingCover(true);
      const url = await uploadFile(file, "guides");
      setCoverImage(url);
    } catch (err) {
      console.error("Failed to upload cover:", err);
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleAddGalleryImages() {
    try {
      const files = await pickFiles({ accept: "image/*", multiple: true });
      if (!files.length) return;
      setUploadingGallery(true);
      const urls: string[] = [];
      for (const file of files) {
        urls.push(await uploadFile(file, "guides"));
      }
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("Failed to upload images:", err);
      toast.error("No se pudieron subir las imágenes.");
    } finally {
      setUploadingGallery(false);
    }
  }

  function addPaint(p: Paint) {
    if (paints.some((x) => x.id === p.id)) return;
    setPaints((prev) => [
      ...prev,
      { id: p.id, name: p.name, hex: p.hexColor ?? undefined },
    ]);
    setPaintQuery("");
    setPaintResults([]);
  }

  async function handleSave(publish: boolean) {
    if (!title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim(),
        coverImage,
        images,
        tags,
        gameName: gameName || null,
        armyName: armyName.trim() || null,
        paints,
        content,
        published: publish,
      };
      if (isEdit && guideId) {
        await updateGuide({ id: guideId, ...payload });
        toast.success("Guía actualizada");
        navigate(`/guias/${guideId}`);
      } else {
        const created = await createGuide(payload);
        toast.success(publish ? "Guía publicada" : "Borrador guardado");
        navigate(`/guias/${created.id}`);
      }
    } catch (err) {
      console.error("Failed to save guide:", err);
      toast.error("No se pudo guardar la guía.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Sin permiso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Solo puedes editar tus propias guías.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/guias")}
          >
            Volver a las guías
          </Button>
        </div>
      </PageTransition>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => handleSave(false)}
            >
              Guardar borrador
            </Button>
            <Button
              variant="gradient"
              className="gap-2"
              disabled={saving}
              onClick={() => handleSave(true)}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Publicar
            </Button>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">
          {isEdit ? "Editar guía" : "Nueva guía de pintura"}
        </h1>

        {/* Cover */}
        <div className="space-y-2">
          <Label>Imagen de portada</Label>
          {coverImage ? (
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border">
              <img
                src={coverImage}
                alt="Portada"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setCoverImage(null)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePickCover}
              disabled={uploadingCover}
              className="flex aspect-[21/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
            >
              {uploadingCover ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm font-medium">Seleccionar portada</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guide-title">Título</Label>
          <Input
            id="guide-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Cómo pintar armaduras de Ultramarines"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guide-summary">Resumen</Label>
          <Textarea
            id="guide-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Breve descripción de lo que enseña tu guía..."
            rows={2}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="guide-game">Juego asociado</Label>
            <select
              id="guide-game"
              value={gameName}
              onChange={(e) => {
                setGameName(e.target.value);
                setArmyName("");
                setCustomFaction(false);
              }}
              className="h-9 w-full rounded-lg border border-input bg-background/40 px-3 text-sm outline-none focus:border-primary/60"
            >
              <option value="">Sin especificar</option>
              {PRESET_GAMES.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guide-army">Facción / ejército</Label>
            {gameName && factionOptions.length > 0 && !customFaction ? (
              <select
                id="guide-army"
                value={armyName}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setCustomFaction(true);
                    setArmyName("");
                  } else {
                    setArmyName(e.target.value);
                  }
                }}
                className="h-9 w-full rounded-lg border border-input bg-background/40 px-3 text-sm outline-none focus:border-primary/60"
              >
                <option value="">Sin especificar</option>
                {factionOptions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
                <option value="__custom__">Otra facción…</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id="guide-army"
                  value={armyName}
                  onChange={(e) => setArmyName(e.target.value)}
                  placeholder="Ej: Ultramarines"
                />
                {gameName && factionOptions.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setCustomFaction(false);
                      setArmyName("");
                    }}
                  >
                    Lista
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Etiquetas</Label>
          <TagsInput
            value={tags}
            onChange={setTags}
            placeholder="Ej: nmm, degradado, aerógrafo..."
          />
        </div>

        {/* Paints */}
        <div className="space-y-2">
          <Label>Pinturas utilizadas</Label>
          {paints.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {paints.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-xs"
                >
                  <span
                    className="h-3 w-3 rounded-full border border-white/20"
                    style={{ backgroundColor: p.hex ?? "#888" }}
                  />
                  {p.name}
                  <button
                    type="button"
                    onClick={() =>
                      setPaints((prev) => prev.filter((x) => x.id !== p.id))
                    }
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={paintQuery}
              onChange={(e) => setPaintQuery(e.target.value)}
              placeholder="Buscar pintura por nombre, marca o gama..."
              className="h-9 w-full rounded-lg border border-input bg-background/40 pl-10 pr-3 text-sm outline-none focus:border-primary/60"
            />
            {paintResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
                {paintResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addPaint(p)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20"
                      style={{ backgroundColor: p.hexColor ?? "#888" }}
                    />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.brand}
                    </span>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label>Contenido</Label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            uploadFolder="guides"
            placeholder="Explica tu proceso de pintura paso a paso..."
          />
        </div>

        {/* Gallery */}
        <div className="space-y-2">
          <Label>Galería de imágenes</Label>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((src) => (
              <div
                key={src}
                className="relative aspect-square overflow-hidden rounded-xl border border-border"
              >
                <img src={src} alt="Guía" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setImages((prev) => prev.filter((x) => x !== src))
                  }
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddGalleryImages}
              disabled={uploadingGallery}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
            >
              {uploadingGallery ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <Plus className="h-6 w-6" />
                  <span className="text-[10px]">Añadir</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
