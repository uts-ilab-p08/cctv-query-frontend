import type { ReactNode } from "react";

import { AmbientBackdrop } from "@/components/layout/AmbientBackdrop";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CamerasModal } from "@/components/modals/CamerasModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { FiltersModal } from "@/components/results/FiltersModal";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    // `relative overflow-hidden` anchors and clips the ambient glows. It does not
    // trap the fixed assistant panel — only transform/filter/backdrop-filter
    // ancestors create a containing block for `fixed`, and this shell has none.
    <div className="relative flex h-dvh min-h-dvh w-full min-w-[1280px] overflow-hidden">
      <AmbientBackdrop />

      <Sidebar />
      <div className="relative z-1 flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>

      <FiltersModal />
      <SettingsModal />
      <CamerasModal />
    </div>
  );
}
