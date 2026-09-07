import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores";
import {
    CheckCircle,
    Database,
    Info,
    LogOut,
    Palette,
    UserRound,
} from "lucide-react";

const APP_VERSION = "1.1.0";

export function SettingsPage() {
  const { user, signOut } = useAuthStore();

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
                <UserRound className="h-5 w-5 text-primary" />
                Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground">Sesión iniciada como</p>
                <p className="font-medium text-foreground break-all">{user?.email}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => signOut()} className="gap-2">
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesión
              </Button>
            </CardContent>
          </Card>

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
                Tus datos se sincronizan de forma segura en la nube con Supabase y
                están disponibles desde cualquier dispositivo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Funcionalidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span className="text-muted-foreground">Gestión de juegos, ejércitos y miniaturas</span></li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span className="text-muted-foreground">Editor de procesos de pintura con texto enriquecido</span></li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span className="text-muted-foreground">Colección de pinturas con wishlist/carrito</span></li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span className="text-muted-foreground">Seguimiento de progreso de pintado</span></li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span className="text-muted-foreground">Exportación PDF de guías de pintura</span></li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span className="text-muted-foreground">Galería de imágenes con drag & drop</span></li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span className="text-muted-foreground">Listas de ejército para partidas</span></li>
                <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /><span className="text-muted-foreground">Base de datos Citadel + Vallejo Model Color</span></li>
              </ul>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
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
                <p>Gestor de colecciones de miniaturas para Warhammer</p>
                <p>Hecho con React + TypeScript + Supabase</p>
                <p className="pt-2 text-xs">© {new Date().getFullYear()} Jose Luis Caceres Losada. Todos los derechos reservados.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
