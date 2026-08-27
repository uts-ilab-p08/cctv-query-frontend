import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CamerasModal } from "@/components/modals/CamerasModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { FiltersModal } from "@/components/results/FiltersModal";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-1 flex h-screen w-full min-w-[1280px] overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>

      <FiltersModal />
      <SettingsModal />
      <CamerasModal />
    </div>
  );
}
