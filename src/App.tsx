import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AuthCallbackPage, CONFIRM_PATH } from "@/pages/AuthCallbackPage";
import { AuthPage } from "@/pages/AuthPage";
import { LandingPage } from "@/pages/LandingPage";
import { AvisoLegalPage } from "@/pages/legal/AvisoLegalPage";
import { CookiesPage } from "@/pages/legal/CookiesPage";
import { PrivacidadPage } from "@/pages/legal/PrivacidadPage";
import { TerminosPage } from "@/pages/legal/TerminosPage";
import { ResetPasswordScreen } from "@/pages/ResetPasswordScreen";
import { lazyRoute } from "@/lib/chunkReload";
import { useAuthStore, useNotificationStore, useProfileStore, useSocialStore } from "@/stores";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";

const AdminLayout = lazyRoute(() => import("@/pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminOverviewPage = lazyRoute(() => import("@/pages/admin/AdminOverviewPage").then((m) => ({ default: m.AdminOverviewPage })));
const AdminUsersPage = lazyRoute(() => import("@/pages/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })));
const AdminAdsPage = lazyRoute(() => import("@/pages/AdminAdsPage").then((m) => ({ default: m.AdminAdsPage })));
const AdminArticlesPage = lazyRoute(() => import("@/pages/admin/AdminArticlesPage").then((m) => ({ default: m.AdminArticlesPage })));
const AdminSpotlightPage = lazyRoute(() => import("@/pages/admin/AdminSpotlightPage").then((m) => ({ default: m.AdminSpotlightPage })));
const AdminTournamentsPage = lazyRoute(() => import("@/pages/admin/AdminTournamentsPage").then((m) => ({ default: m.AdminTournamentsPage })));
const AdminListsPage = lazyRoute(() => import("@/pages/admin/AdminListsPage").then((m) => ({ default: m.AdminListsPage })));
const AdminCatalogPage = lazyRoute(() => import("@/pages/admin/AdminCatalogPage").then((m) => ({ default: m.AdminCatalogPage })));
const AdminSettingsPage = lazyRoute(() => import("@/pages/admin/AdminSettingsPage").then((m) => ({ default: m.AdminSettingsPage })));
const CompetitivoPage = lazyRoute(() => import("@/pages/CompetitivoPage").then((m) => ({ default: m.CompetitivoPage })));
const TournamentDetailPage = lazyRoute(() => import("@/pages/TournamentDetailPage").then((m) => ({ default: m.TournamentDetailPage })));
const FeaturedListDetailPage = lazyRoute(() => import("@/pages/FeaturedListDetailPage").then((m) => ({ default: m.FeaturedListDetailPage })));
const ArmyDetailPage = lazyRoute(() => import("@/pages/ArmyDetailPage").then((m) => ({ default: m.ArmyDetailPage })));
const ArmyListDetailPage = lazyRoute(() => import("@/pages/ArmyListDetailPage").then((m) => ({ default: m.ArmyListDetailPage })));
const ArmyListsPage = lazyRoute(() => import("@/pages/ArmyListsPage").then((m) => ({ default: m.ArmyListsPage })));
const ArticleDetailPage = lazyRoute(() => import("@/pages/ArticleDetailPage").then((m) => ({ default: m.ArticleDetailPage })));
const ArticleEditorPage = lazyRoute(() => import("@/pages/ArticleEditorPage").then((m) => ({ default: m.ArticleEditorPage })));
const DashboardPage = lazyRoute(() => import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const DownloadsPage = lazyRoute(() => import("@/pages/DownloadsPage").then((m) => ({ default: m.DownloadsPage })));
const GalleryPage = lazyRoute(() => import("@/pages/GalleryPage").then((m) => ({ default: m.GalleryPage })));
const GameDetailPage = lazyRoute(() => import("@/pages/GameDetailPage").then((m) => ({ default: m.GameDetailPage })));
const GamesPage = lazyRoute(() => import("@/pages/GamesPage").then((m) => ({ default: m.GamesPage })));
const GuideDetailPage = lazyRoute(() => import("@/pages/GuideDetailPage").then((m) => ({ default: m.GuideDetailPage })));
const GuideEditorPage = lazyRoute(() => import("@/pages/GuideEditorPage").then((m) => ({ default: m.GuideEditorPage })));
const GuidesPage = lazyRoute(() => import("@/pages/GuidesPage").then((m) => ({ default: m.GuidesPage })));
const HomePage = lazyRoute(() => import("@/pages/HomePage").then((m) => ({ default: m.HomePage })));
const MiniatureDetailPage = lazyRoute(() => import("@/pages/MiniatureDetailPage").then((m) => ({ default: m.MiniatureDetailPage })));
const MyPaintsPage = lazyRoute(() => import("@/pages/MyPaintsPage").then((m) => ({ default: m.MyPaintsPage })));
const PointsCatalogPage = lazyRoute(() => import("@/pages/PointsCatalogPage").then((m) => ({ default: m.PointsCatalogPage })));
const PointsCatalogFactionPage = lazyRoute(() => import("@/pages/PointsCatalogPage").then((m) => ({ default: m.PointsCatalogFactionPage })));
const SettingsPage = lazyRoute(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazyRoute(() => import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const FriendsPage = lazyRoute(() => import("@/pages/FriendsPage").then((m) => ({ default: m.FriendsPage })));
const MessagesPage = lazyRoute(() => import("@/pages/MessagesPage").then((m) => ({ default: m.MessagesPage })));
const CommunityListDetailPage = lazyRoute(() => import("@/pages/CommunityListDetailPage").then((m) => ({ default: m.CommunityListDetailPage })));
const SharedPhotosPage = lazyRoute(() => import("@/pages/SharedPhotosPage").then((m) => ({ default: m.SharedPhotosPage })));

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingSpinner size="lg" text="Cargando..." />
    </div>
  );
}

/**
 * Routes remount (and re-animate) per pathname, except inside sections that
 * keep a persistent layout: switching chats or admin sections swaps only
 * the inner content.
 */
function routeKey(pathname: string): string {
  if (pathname.startsWith("/mensajes")) return "/mensajes";
  if (pathname.startsWith("/admin")) return "/admin";
  return pathname;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        <Routes
          location={location}
          key={routeKey(location.pathname)}
        >
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
            <Route path="descargas" element={<DownloadsPage />} />
            <Route path="competitivo" element={<CompetitivoPage />} />
            <Route path="competitivo/listas/:listId" element={<FeaturedListDetailPage />} />
            <Route path="competitivo/torneos/:tournamentId" element={<TournamentDetailPage />} />
            <Route path="comunidad" element={<SharedPhotosPage />} />
            <Route path="comunidad/listas/:listId" element={<CommunityListDetailPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="perfil/:userId" element={<ProfilePage />} />
            <Route path="amigos" element={<FriendsPage />} />
            <Route path="mensajes" element={<MessagesPage />} />
            <Route path="mensajes/:userId" element={<MessagesPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
              <Route path="articulos" element={<AdminArticlesPage />} />
              <Route path="miniatura" element={<AdminSpotlightPage />} />
              <Route path="torneos" element={<AdminTournamentsPage />} />
              <Route path="listas" element={<AdminListsPage />} />
              <Route path="publicidad" element={<AdminAdsPage />} />
              <Route path="catalogo" element={<AdminCatalogPage />} />
              <Route path="ajustes" element={<AdminSettingsPage />} />
              <Route path="competitivo" element={<Navigate to="/admin/torneos" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

/** Everything that depends on auth state — loading, password recovery, landing/auth, or the main app. */
function AppGate() {
  const { user, initialized, init, recoveryMode } = useAuthStore();
  const { fetchProfile, clear: clearProfile } = useProfileStore();
  const { start: startSocial, stop: stopSocial } = useSocialStore();
  const { start: startNotifications, stop: stopNotifications } = useNotificationStore();
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const navigate = useNavigate();

  // Confirmation links from emails sent before the callback page existed
  // land on "/" — send their errors (expired / used link) there too.
  useEffect(() => {
    if (/error_code=|error_description=/.test(window.location.hash)) {
      navigate(`${CONFIRM_PATH}${window.location.hash}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      startSocial(user.id);
      startNotifications(user.id, navigate);
    } else {
      clearProfile();
      stopSocial();
      stopNotifications();
    }
    // Re-fetch only when the signed-in user actually changes, not on every
    // token refresh (which produces a new `user` object with the same id).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          {/* Reachable regardless of auth state — legal pages are never gated. */}
          <Route path="/legal/aviso-legal" element={<AvisoLegalPage />} />
          <Route path="/legal/privacidad" element={<PrivacidadPage />} />
          <Route path="/legal/cookies" element={<CookiesPage />} />
          <Route path="/legal/terminos" element={<TerminosPage />} />
          <Route path={CONFIRM_PATH} element={<AuthCallbackPage />} />
          <Route path="*" element={<AppGate />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}
