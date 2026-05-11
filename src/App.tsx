import { AppLayout } from "@/components/layout/AppLayout";
import { seedDefaultGames } from "@/db";
import { ArmyDetailPage } from "@/pages/ArmyDetailPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { GalleryPage } from "@/pages/GalleryPage";
import { GameDetailPage } from "@/pages/GameDetailPage";
import { GamesPage } from "@/pages/GamesPage";
import { MiniatureDetailPage } from "@/pages/MiniatureDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

function AnimatedRoutes() {
  const location = useLocation();

  useEffect(() => {
    seedDefaultGames().catch((err) =>
      console.error("Failed to seed default games:", err)
    );
  }, []);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/:gameId" element={<GameDetailPage />} />
          <Route path="games/:gameId/armies/:armyId" element={<ArmyDetailPage />} />
          <Route path="games/:gameId/armies/:armyId/miniatures/:miniatureId" element={<MiniatureDetailPage />} />
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
