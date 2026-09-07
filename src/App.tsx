import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AdminPage } from "@/pages/AdminPage";
import { ArmyDetailPage } from "@/pages/ArmyDetailPage";
import { ArmyListDetailPage } from "@/pages/ArmyListDetailPage";
import { ArmyListsPage } from "@/pages/ArmyListsPage";
import { ArticleDetailPage } from "@/pages/ArticleDetailPage";
import { ArticleEditorPage } from "@/pages/ArticleEditorPage";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { GalleryPage } from "@/pages/GalleryPage";
import { GameDetailPage } from "@/pages/GameDetailPage";
import { GamesPage } from "@/pages/GamesPage";
import { GuideDetailPage } from "@/pages/GuideDetailPage";
import { GuideEditorPage } from "@/pages/GuideEditorPage";
import { GuidesPage } from "@/pages/GuidesPage";
import { HomePage } from "@/pages/HomePage";
import { LandingPage } from "@/pages/LandingPage";
import { MiniatureDetailPage } from "@/pages/MiniatureDetailPage";
import { MyPaintsPage } from "@/pages/MyPaintsPage";
import { ResetPasswordScreen } from "@/pages/ResetPasswordScreen";
import { SettingsPage } from "@/pages/SettingsPage";
import { useAuthStore } from "@/stores";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
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
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
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
    <BrowserRouter>
      <AnimatedRoutes />
      {toaster}
    </BrowserRouter>
  );
}
