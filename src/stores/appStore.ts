import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  currentView: "dashboard" | "games" | "army" | "miniature" | "gallery" | "settings";
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setCurrentView: (view: AppState["currentView"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  currentView: "dashboard",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCurrentView: (view) => set({ currentView: view }),
}));
