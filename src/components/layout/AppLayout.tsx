import { ScrollArea } from "@/components/ui/scroll-area";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
