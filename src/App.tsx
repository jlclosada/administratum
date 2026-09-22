import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AuthPage } from "@/pages/AuthPage";
import { LandingPage } from "@/pages/LandingPage";
import { AvisoLegalPage } from "@/pages/legal/AvisoLegalPage";
import { CookiesPage } from "@/pages/legal/CookiesPage";
import { PrivacidadPage } from "@/pages/legal/PrivacidadPage";
import { TerminosPage } from "@/pages/legal/TerminosPage";
import { ResetPasswordScreen } from "@/pages/ResetPasswordScreen";
import { useAuthStore } from "@/stores";
import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const ArmyDetailPage = lazy(() => import("@/pages/ArmyDetailPage").then((m) => ({ default: m.ArmyDetailPage })));
const ArmyListDetailPage = lazy(() => import("@/pages/ArmyListDetailPage").then((m) => ({ default: m.ArmyListDetailPage })));
const ArmyListsPage = lazy(() => import("@/pages/ArmyListsPage").then((m) => ({ default: m.ArmyListsPage })));
const ArticleDetailPage = lazy(() => import("@/pages/ArticleDetailPage").then((m) => ({ default: m.ArticleDetailPage })));
const ArticleEditorPage = lazy(() => import("@/pages/ArticleEditorPage").then((m) => ({ default: m.ArticleEditorPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const GalleryPage = lazy(() => import("@/pages/GalleryPage").then((m) => ({ default: m.GalleryPage })));
const GameDetailPage = lazy(() => import("@/pages/GameDetailPage").then((m) => ({ default: m.GameDetailPage })));
const GamesPage = lazy(() => import("@/pages/GamesPage").then((m) => ({ default: m.GamesPage })));
const GuideDetailPage = lazy(() => import("@/pages/GuideDetailPage").then((m) => ({ default: m.GuideDetailPage })));
const GuideEditorPage = lazy(() => import("@/pages/GuideEditorPage").then((m) => ({ default: m.GuideEditorPage })));
const GuidesPage = lazy(() => import("@/pages/GuidesPage").then((m) => ({ default: m.GuidesPage })));
const HomePage = lazy(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const MiniatureDetailPage = lazy(() => import("@/pages/MiniatureDetailPage").then((m) => ({ default: m.MiniatureDetailPage })));
const MyPaintsPage = lazy(() => import("@/pages/MyPaintsPage").then((m) => ({ default: m.MyPaintsPage })));
const PointsCatalogPage = lazy(() => import("@/pages/PointsCatalogPage").then((m) => ({ default: m.PointsCatalogPage })));
const PointsCatalogFactionPage = lazy(() => import("@/pages/PointsCatalogPage").then((m) => ({ default: m.PointsCatalogFactionPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingSpinner size="lg" text="Cargando..." />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="articulos/nuevo" element={<ArticleEditorPage />} />
            <Route path="articulos/:articleId" element={<ArticleDetailPage />} />
            <Route path="articulos/:articleId/editar" element={<ArticleEditorPage />} />
            <Route path="guias" element={<GuidesPage />} />
            <Route path="guias/nueva" element={<GuideEditorPage />} />
            <Route path="guias/:guideId" element={<GuideDetailPage />} />
            <Route path="guias/:guideId/editar" element={<GuideEditorPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="games" element={<GamesPage />} />
            <Route path="games/:gameId" element={<GameDetailPage />} />
            <Route path="games/:gameId/armies/:armyId" element={<ArmyDetailPage />} />
            <Route path="games/:gameId/armies/:armyId/miniatures/:miniatureId" element={<MiniatureDetailPage />} />
            <Route path="paints" element={<MyPaintsPage />} />
            <Route path="lists" element={<ArmyListsPage />} />
            <Route path="lists/:listId" element={<ArmyListDetailPage />} />
            <Route path="catalogo-puntos" element={<PointsCatalogPage />} />
            <Route path="catalogo-puntos/:factionSlug" element={<PointsCatalogFactionPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

/** Everything that depends on auth state — loading, password recovery, landing/auth, or the main app. */
function AppGate() {
  const { user, initialized, init, recoveryMode } = useAuthStore();
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const toaster = (
    <Toaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        style: {
          background: "hsl(240 12% 7.5% / 0.85)",
          border: "1px solid hsl(240 6% 16%)",
          backdropFilter: "blur(16px)",
          color: "hsl(0 0% 98%)",
        },
      }}
    />
  );

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  // User arrived from a password-recovery email link: let them set a new password.
  if (recoveryMode) {
    return (
      <>
        <ResetPasswordScreen />
        {toaster}
      </>
    );
  }

  if (!user) {
    return (
      <>
        {authMode ? (
          <AuthPage initialMode={authMode} onBack={() => setAuthMode(null)} />
        ) : (
          <LandingPage onEnter={(mode) => setAuthMode(mode ?? "login")} />
        )}
        {toaster}
      </>
    );
  }

  return (
    <>
      <AnimatedRoutes />
      {toaster}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Reachable regardless of auth state — legal pages are never gated. */}
        <Route path="/legal/aviso-legal" element={<AvisoLegalPage />} />
        <Route path="/legal/privacidad" element={<PrivacidadPage />} />
        <Route path="/legal/cookies" element={<CookiesPage />} />
        <Route path="/legal/terminos" element={<TerminosPage />} />
        <Route path="*" element={<AppGate />} />
      </Routes>
    </BrowserRouter>
  );
}
