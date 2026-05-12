import { AppLayout } from "@/components/layout/AppLayout";
import { ArmyDetailPage } from "@/pages/ArmyDetailPage";
import { ArmyListDetailPage } from "@/pages/ArmyListDetailPage";
import { ArmyListsPage } from "@/pages/ArmyListsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { GalleryPage } from "@/pages/GalleryPage";
import { GameDetailPage } from "@/pages/GameDetailPage";
import { GamesPage } from "@/pages/GamesPage";
import { MiniatureDetailPage } from "@/pages/MiniatureDetailPage";
import { MyPaintsPage } from "@/pages/MyPaintsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AnimatePresence } from "framer-motion";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/:gameId" element={<GameDetailPage />} />
          <Route path="games/:gameId/armies/:armyId" element={<ArmyDetailPage />} />
          <Route path="games/:gameId/armies/:armyId/miniatures/:miniatureId" element={<MiniatureDetailPage />} />
          <Route path="paints" element={<MyPaintsPage />} />
          <Route path="lists" element={<ArmyListsPage />} />
          <Route path="lists/:listId" element={<ArmyListDetailPage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
