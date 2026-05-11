import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { getAllImages } from "@/db";
import type { MiniatureImage } from "@/types";
import { motion } from "framer-motion";
import { ImageIcon, X, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";

export function GalleryPage() {
  const [images, setImages] = useState<(MiniatureImage & { miniatureName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    try {
      const data = await getAllImages();
      setImages(data);
    } catch (err) {
      console.error("Failed to load images:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando galería..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Galería</h1>
          <p className="text-muted-foreground">
            Todas las imágenes de tu colección
          </p>
        </div>

        {images.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="h-8 w-8 text-muted-foreground" />}
            title="Sin imágenes"
            description="Las imágenes que subas a tus miniaturas aparecerán aquí"
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
            className="columns-2 gap-4 sm:columns-3 lg:columns-4"
          >
            {images.map((img) => (
              <motion.div
                key={img.id}
                variants={{
                  hidden: { opacity: 0, scale: 0.9 },
                  show: { opacity: 1, scale: 1 },
                }}
                className="mb-4 break-inside-avoid"
              >
                <Card
                  className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
                  onClick={() => setSelectedImage(img.filePath)}
                >
                  <div className="relative">
                    <img
                      src={img.filePath}
                      alt={img.fileName}
                      className="w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                      <ZoomIn className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  {img.miniatureName && (
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {img.miniatureName}
                      </p>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Lightbox */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
            <DialogTitle className="sr-only">Vista de imagen</DialogTitle>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-12 top-0 text-white hover:bg-white/20"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="max-h-[80vh] w-full rounded-xl object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
