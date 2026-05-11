import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import {
    CheckCircle,
    Database,
    Download,
    Info,
    Loader2,
    Palette,
    RefreshCw,
    Settings,
} from "lucide-react";
import { useState } from "react";

const APP_VERSION = "0.3.0";

type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; version: string }
  | { status: "downloading"; progress: number }
  | { status: "ready" }
  | { status: "up-to-date" }
  | { status: "error"; message: string };

export function SettingsPage() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: "idle",
  });

  async function handleCheckUpdate() {
    try {
      setUpdateState({ status: "checking" });
      const update = await check();
      if (update) {
        setUpdateState({ status: "available", version: update.version });
      } else {
        setUpdateState({ status: "up-to-date" });
      }
    } catch (err) {
      setUpdateState({
        status: "error",
        message: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  async function handleDownloadAndInstall() {
    try {
      setUpdateState({ status: "downloading", progress: 0 });
      const update = await check();
      if (!update) return;

      let downloaded = 0;
      let totalLength = 0;

      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalLength = event.data.contentLength;
          downloaded = 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          const pct = totalLength > 0 ? Math.round((downloaded / totalLength) * 100) : 0;
          setUpdateState({ status: "downloading", progress: pct });
        } else if (event.event === "Finished") {
          setUpdateState({ status: "ready" });
        }
      });

      setUpdateState({ status: "ready" });
    } catch (err) {
      setUpdateState({
        status: "error",
        message: err instanceof Error ? err.message : "Error al descargar",
      });
    }
  }

  async function handleRelaunch() {
    await relaunch();
  }
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-muted-foreground">Configuración de la aplicación</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-5 w-5 text-primary" />
                Apariencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tema oscuro activo. Más opciones de personalización próximamente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-5 w-5 text-primary" />
                Base de Datos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                SQLite local. Tus datos se guardan automáticamente en tu
                dispositivo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-5 w-5 text-primary" />
                Funcionalidades Futuras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Sincronización cloud</li>
                <li>• Exportación PDF</li>
                <li>• Wishlist</li>
                <li>• Comunidad</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-5 w-5 text-primary" />
                Acerca de
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Administratum</span> v{APP_VERSION}
                </p>
                <p>Gestor premium de colecciones de miniaturas</p>
                <p>Hecho con Tauri + React + TypeScript</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-5 w-5 text-primary" />
                Actualizaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {updateState.status === "idle" && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Comprueba si hay una nueva versión disponible.
                  </p>
                  <Button size="sm" variant="outline" onClick={handleCheckUpdate} className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Buscar
                  </Button>
                </div>
              )}

              {updateState.status === "checking" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Comprobando actualizaciones...
                </div>
              )}

              {updateState.status === "up-to-date" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Estás en la última versión (v{APP_VERSION})
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleCheckUpdate} className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Volver a comprobar
                  </Button>
                </div>
              )}

              {updateState.status === "available" && (
                <div className="space-y-3">
                  <p className="text-sm">
                    Nueva versión disponible:{" "}
                    <span className="font-semibold text-primary">v{updateState.version}</span>
                  </p>
                  <Button size="sm" onClick={handleDownloadAndInstall} className="gap-2">
                    <Download className="h-3.5 w-3.5" />
                    Descargar e instalar
                  </Button>
                </div>
              )}

              {updateState.status === "downloading" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Descargando actualización...
                  </div>
                  <Progress value={updateState.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {updateState.progress}%
                  </p>
                </div>
              )}

              {updateState.status === "ready" && (
                <div className="space-y-3">
                  <p className="text-sm text-green-400">
                    Actualización lista. Reinicia para aplicar los cambios.
                  </p>
                  <Button size="sm" onClick={handleRelaunch} className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reiniciar ahora
                  </Button>
                </div>
              )}

              {updateState.status === "error" && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    Error: {updateState.message}
                  </p>
                  <Button size="sm" variant="outline" onClick={handleCheckUpdate} className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reintentar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
