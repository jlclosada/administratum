import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { RichTextEditor } from "@/components/shared/RichText";
import { TagsInput } from "@/components/shared/TagsInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    createArticle,
    getArticleById,
    updateArticle,
} from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { pickFiles, uploadFile } from "@/lib/storage";
import type { RichContent } from "@/types";
import { ArrowLeft, ImageIcon, Loader2, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function ArticleEditorPage() {
  const { articleId } = useParams<{ articleId: string }>();
  const isEdit = !!articleId;
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState<RichContent>(null);
  const [published, setPublished] = useState(true);

  useEffect(() => {
    if (!isEdit || !articleId) return;
    getArticleById(articleId)
      .then((a) => {
        if (!a) return;
        setTitle(a.title);
        setExcerpt(a.excerpt);
        setCoverImage(a.coverImage);
        setTags(a.tags);
        setContent(a.content);
        setPublished(a.published);
      })
      .catch((err) => console.error("Failed to load article:", err))
      .finally(() => setLoading(false));
  }, [isEdit, articleId]);

  async function handlePickCover() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploadingCover(true);
      const url = await uploadFile(file, "articles");
      setCoverImage(url);
    } catch (err) {
      console.error("Failed to upload cover:", err);
      toast.error("No se pudo subir la imagen.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSave(publish: boolean) {
    if (!title.trim()) {
      toast.error("El título es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && articleId) {
        await updateArticle({
          id: articleId,
          title: title.trim(),
          excerpt: excerpt.trim(),
          coverImage,
          tags,
          content,
          published: publish,
        });
        toast.success("Artículo actualizado");
        navigate(`/articulos/${articleId}`);
      } else {
        const created = await createArticle({
          title: title.trim(),
          excerpt: excerpt.trim(),
          coverImage,
          tags,
          content,
          published: publish,
        });
        toast.success(publish ? "Artículo publicado" : "Borrador guardado");
        navigate(`/articulos/${created.id}`);
      }
    } catch (err) {
      console.error("Failed to save article:", err);
      toast.error("No se pudo guardar. Revisa tus permisos de administrador.");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <PageTransition>
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Acceso restringido</h1>
          <p className="text-sm text-muted-foreground">
            Solo el administrador puede publicar artículos.
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
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
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
              {published ? "Publicar" : "Publicar"}
            </Button>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight">
          {isEdit ? "Editar artículo" : "Nuevo artículo"}
        </h1>

        {/* Cover */}
        <div className="space-y-2">
          <Label>Imagen de portada</Label>
          {coverImage ? (
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border">
              <img src={coverImage} alt="Portada" className="h-full w-full object-cover" />
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
          <Label htmlFor="art-title">Título</Label>
          <Input
            id="art-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del artículo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="art-excerpt">Extracto</Label>
          <Textarea
            id="art-excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Breve resumen que aparecerá en las tarjetas..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Etiquetas</Label>
          <TagsInput value={tags} onChange={setTags} placeholder="Añade una etiqueta y pulsa Enter" />
        </div>

        <div className="space-y-2">
          <Label>Contenido</Label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            uploadFolder="articles"
            placeholder="Escribe el contenido del artículo..."
          />
        </div>
      </div>
    </PageTransition>
  );
}
