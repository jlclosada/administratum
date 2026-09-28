import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { lazyRoute } from "@/lib/chunkReload";
import { CONFIRM_PATH } from "@/lib/site";
import { isPublicPath } from "@/lib/publicPaths";
import {
  useAuthStore,
  useNotificationStore,
  useProfileStore,
  useSocialStore,
} from "@/stores";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Toaster } from "sonner";

// Entry screens outside the app shell load on demand too, so a visitor
// landing on a public page doesn't download the landing, sign-in or legal
// pages (and vice versa).
const LandingPage = lazyRoute(() =>
  import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const AuthPage = lazyRoute(() =>
  import("@/pages/AuthPage").then((m) => ({ default: m.AuthPage })),
);
const AuthCallbackPage = lazyRoute(() =>
  import("@/pages/AuthCallbackPage").then((m) => ({
    default: m.AuthCallbackPage,
  })),
);
const ResetPasswordScreen = lazyRoute(() =>
  import("@/pages/ResetPasswordScreen").then((m) => ({
    default: m.ResetPasswordScreen,
  })),
);
const AvisoLegalPage = lazyRoute(() =>
  import("@/pages/legal/AvisoLegalPage").then((m) => ({
    default: m.AvisoLegalPage,
  })),
);
const CookiesPage = lazyRoute(() =>
  import("@/pages/legal/CookiesPage").then((m) => ({ default: m.CookiesPage })),
);
const PrivacidadPage = lazyRoute(() =>
  import("@/pages/legal/PrivacidadPage").then((m) => ({
    default: m.PrivacidadPage,
  })),
);
const TerminosPage = lazyRoute(() =>
  import("@/pages/legal/TerminosPage").then((m) => ({
    default: m.TerminosPage,
  })),
);
const AdminLayout = lazyRoute(() =>
  import("@/pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const AdminOverviewPage = lazyRoute(() =>
  import("@/pages/admin/AdminOverviewPage").then((m) => ({
    default: m.AdminOverviewPage,
  })),
);
const AdminUsersPage = lazyRoute(() =>
  import("@/pages/AdminUsersPage").then((m) => ({ default: m.AdminUsersPage })),
);
const AdminAdsPage = lazyRoute(() =>
  import("@/pages/AdminAdsPage").then((m) => ({ default: m.AdminAdsPage })),
);
const AdminArticlesPage = lazyRoute(() =>
  import("@/pages/admin/AdminArticlesPage").then((m) => ({
    default: m.AdminArticlesPage,
  })),
);
const AdminSpotlightPage = lazyRoute(() =>
  import("@/pages/admin/AdminSpotlightPage").then((m) => ({
    default: m.AdminSpotlightPage,
  })),
);
const AdminTournamentsPage = lazyRoute(() =>
  import("@/pages/admin/AdminTournamentsPage").then((m) => ({
    default: m.AdminTournamentsPage,
  })),
);
const AdminListsPage = lazyRoute(() =>
  import("@/pages/admin/AdminListsPage").then((m) => ({
    default: m.AdminListsPage,
  })),
);
const AdminCatalogPage = lazyRoute(() =>
  import("@/pages/admin/AdminCatalogPage").then((m) => ({
    default: m.AdminCatalogPage,
  })),
);
const AdminSettingsPage = lazyRoute(() =>
  import("@/pages/admin/AdminSettingsPage").then((m) => ({
    default: m.AdminSettingsPage,
  })),
);
const CompetitivoPage = lazyRoute(() =>
  import("@/pages/CompetitivoPage").then((m) => ({
    default: m.CompetitivoPage,
  })),
);
const TournamentDetailPage = lazyRoute(() =>
  import("@/pages/TournamentDetailPage").then((m) => ({
    default: m.TournamentDetailPage,
  })),
);
const FeaturedListDetailPage = lazyRoute(() =>
  import("@/pages/FeaturedListDetailPage").then((m) => ({
    default: m.FeaturedListDetailPage,
  })),
);
const ArmyDetailPage = lazyRoute(() =>
  import("@/pages/ArmyDetailPage").then((m) => ({ default: m.ArmyDetailPage })),
);
const ArmyListDetailPage = lazyRoute(() =>
  import("@/pages/ArmyListDetailPage").then((m) => ({
    default: m.ArmyListDetailPage,
  })),
);
const ArmyListsPage = lazyRoute(() =>
  import("@/pages/ArmyListsPage").then((m) => ({ default: m.ArmyListsPage })),
);
const ArticleDetailPage = lazyRoute(() =>
  import("@/pages/ArticleDetailPage").then((m) => ({
    default: m.ArticleDetailPage,
  })),
);
const ArticleEditorPage = lazyRoute(() =>
  import("@/pages/ArticleEditorPage").then((m) => ({
    default: m.ArticleEditorPage,
  })),
);
const DashboardPage = lazyRoute(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const DownloadsPage = lazyRoute(() =>
  import("@/pages/DownloadsPage").then((m) => ({ default: m.DownloadsPage })),
);
const GalleryPage = lazyRoute(() =>
  import("@/pages/GalleryPage").then((m) => ({ default: m.GalleryPage })),
);
const CollectionPage = lazyRoute(() =>
  import("@/pages/CollectionPage").then((m) => ({ default: m.CollectionPage })),
);
const GuideDetailPage = lazyRoute(() =>
  import("@/pages/GuideDetailPage").then((m) => ({
    default: m.GuideDetailPage,
  })),
);
const GuideEditorPage = lazyRoute(() =>
  import("@/pages/GuideEditorPage").then((m) => ({
    default: m.GuideEditorPage,
  })),
);
const GuidesPage = lazyRoute(() =>
  import("@/pages/GuidesPage").then((m) => ({ default: m.GuidesPage })),
);
const HomePage = lazyRoute(() =>
  import("@/pages/HomePage").then((m) => ({ default: m.HomePage })),
);
const MiniatureDetailPage = lazyRoute(() =>
  import("@/pages/MiniatureDetailPage").then((m) => ({
    default: m.MiniatureDetailPage,
  })),
);
const MyPaintsPage = lazyRoute(() =>
  import("@/pages/MyPaintsPage").then((m) => ({ default: m.MyPaintsPage })),
);
const PointsCatalogPage = lazyRoute(() =>
  import("@/pages/PointsCatalogPage").then((m) => ({
    default: m.PointsCatalogPage,
  })),
);
const PointsCatalogFactionPage = lazyRoute(() =>
  import("@/pages/PointsCatalogPage").then((m) => ({
    default: m.PointsCatalogFactionPage,
  })),
);
const SettingsPage = lazyRoute(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const ProfilePage = lazyRoute(() =>
  import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const FriendsPage = lazyRoute(() =>
  import("@/pages/FriendsPage").then((m) => ({ default: m.FriendsPage })),
);
const MessagesPage = lazyRoute(() =>
  import("@/pages/MessagesPage").then((m) => ({ default: m.MessagesPage })),
);
const CommunityListDetailPage = lazyRoute(() =>
  import("@/pages/CommunityListDetailPage").then((m) => ({
    default: m.CommunityListDetailPage,
  })),
);
const SharedPhotosPage = lazyRoute(() =>
  import("@/pages/SharedPhotosPage").then((m) => ({
    default: m.SharedPhotosPage,
  })),
);

/**
 * Pages anyone can read without an account: articles, guides, the points
 * catalog, downloads, Competitivo, Comunidad and public profiles. Signed-in
 * users get them too, alongside their private pages.
 */
const publicRoutes = (
  <>
    <Route path="articulos/:articleId" element={<ArticleDetailPage />} />
    <Route path="guias" element={<GuidesPage />} />
    <Route path="guias/:guideId" element={<GuideDetailPage />} />
    <Route path="catalogo-puntos" element={<PointsCatalogPage />} />
    <Route
      path="catalogo-puntos/:factionSlug"
      element={<PointsCatalogFactionPage />}
    />
    <Route path="descargas" element={<DownloadsPage />} />
    <Route path="competitivo" element={<CompetitivoPage />} />
    <Route
      path="competitivo/listas/:listId"
      element={<FeaturedListDetailPage />}
    />
    <Route
      path="competitivo/torneos/:tournamentId"
      element={<TournamentDetailPage />}
    />
    <Route path="comunidad" element={<SharedPhotosPage />} />
    <Route
      path="comunidad/listas/:listId"
      element={<CommunityListDetailPage />}
    />
    <Route path="perfil/:userId" element={<ProfilePage />} />
  </>
);

function FullScreenFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
    </div>
  );
}

/** /games/:gameId/armies/:armyId[/miniatures/:id] → /coleccion/:armyId[/miniaturas/:id] */
function LegacyArmyRedirect() {
  const { armyId, miniatureId } = useParams();
  return (
    <Navigate
      to={`/coleccion/${armyId}${miniatureId ? `/miniaturas/${miniatureId}` : ""}`}
      replace
    />
  );
}

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

function AnimatedRoutes({ guest = false }: { guest?: boolean }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={routeKey(location.pathname)}>
          {guest ? (
            <Route path="/" element={<AppLayout />}>
              {publicRoutes}
            </Route>
          ) : (
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              {publicRoutes}
              <Route path="articulos/nuevo" element={<ArticleEditorPage />} />
              <Route
                path="articulos/:articleId/editar"
                element={<ArticleEditorPage />}
              />
              <Route path="guias/nueva" element={<GuideEditorPage />} />
              <Route
                path="guias/:guideId/editar"
                element={<GuideEditorPage />}
              />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="coleccion" element={<CollectionPage />} />
              <Route path="coleccion/:armyId" element={<ArmyDetailPage />} />
              <Route
                path="coleccion/:armyId/miniaturas/:miniatureId"
                element={<MiniatureDetailPage />}
              />
              {/* Old game-based URLs (bookmarks) → the 40K collection. */}
              <Route path="games" element={<Navigate to="/coleccion" replace />} />
              <Route path="games/:gameId" element={<Navigate to="/coleccion" replace />} />
              <Route path="games/:gameId/armies/:armyId" element={<LegacyArmyRedirect />} />
              <Route
                path="games/:gameId/armies/:armyId/miniatures/:miniatureId"
                element={<LegacyArmyRedirect />}
              />
              <Route path="paints" element={<MyPaintsPage />} />
              <Route path="lists" element={<ArmyListsPage />} />
              <Route path="lists/:listId" element={<ArmyListDetailPage />} />
              <Route path="perfil" element={<ProfilePage />} />
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
                <Route
                  path="competitivo"
                  element={<Navigate to="/admin/torneos" replace />}
                />
              </Route>
            </Route>
          )}
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

/** Everything that depends on auth state — loading, password recovery, landing/auth, or the main app. */
function AppGate() {
  const {
    user,
    initialized,
    init,
    recoveryMode,
    authPrompt,
    openAuth,
    closeAuth,
  } = useAuthStore();
  const { fetchProfile, clear: clearProfile } = useProfileStore();
  const { start: startSocial, stop: stopSocial } = useSocialStore();
  const { start: startNotifications, stop: stopNotifications } =
    useNotificationStore();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

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

  // Campaign links (e.g. the promo email) use ?registro=1 to open sign-up.
  useEffect(() => {
    if (initialized && !user && new URLSearchParams(search).has("registro"))
      openAuth("signup");
    // Only on arrival: later navigations shouldn't reopen the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

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

  // Guests: the landing at "/", public content everywhere it exists, and the
  // sign-in screen for private pages (after signing in they stay on that URL).
  if (!user) {
    let screen;
    if (authPrompt)
      screen = <AuthPage initialMode={authPrompt} onBack={closeAuth} />;
    else if (pathname === "/")
      screen = <LandingPage onEnter={(mode) => openAuth(mode ?? "login")} />;
    else if (isPublicPath(pathname)) screen = <AnimatedRoutes guest />;
    else screen = <AuthPage initialMode="login" onBack={() => navigate("/")} />;
    return (
      <>
        {screen}
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
        <Suspense fallback={<FullScreenFallback />}>
          <Routes>
            {/* Reachable regardless of auth state — legal pages are never gated. */}
            <Route path="/legal/aviso-legal" element={<AvisoLegalPage />} />
            <Route path="/legal/privacidad" element={<PrivacidadPage />} />
            <Route path="/legal/cookies" element={<CookiesPage />} />
            <Route path="/legal/terminos" element={<TerminosPage />} />
            <Route path={CONFIRM_PATH} element={<AuthCallbackPage />} />
            <Route path="*" element={<AppGate />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  );
}
