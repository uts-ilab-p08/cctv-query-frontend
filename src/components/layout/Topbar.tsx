"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cameraNames } from "@/data/cameras";
import { useAppStore } from "@/store/useAppStore";

const BREADCRUMBS: ReadonlyArray<{ prefix: string; label: string }> = [
  { prefix: "/dashboard", label: "Query" },
  { prefix: "/results", label: "Results" },
  { prefix: "/clips", label: "Clip Detail" },
  { prefix: "/saved", label: "Saved Queries" },
  { prefix: "/reports", label: "Reports" },
  { prefix: "/pipeline", label: "Annotation Pipeline" },
];

/**
 * SPEC §1 — 64px sticky bar at z-25, which must stay above the query field's
 * own z-20 stacking context so the field never scrolls over the bar.
 */
export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const openCameras = useAppStore((state) => state.openCameras);

  const breadcrumb =
    BREADCRUMBS.find((entry) => pathname.startsWith(entry.prefix))?.label ?? "Query";
  const showBack = !pathname.startsWith("/dashboard");

  return (
    <header className="surface-topbar border-hairline sticky top-0 z-25 flex h-16 shrink-0 items-center justify-between border-b px-8">
      <div className="flex items-center gap-3.5">
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            className="glass-card-flat text-ink-2 hover:text-ink flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150"
          >
            <ArrowLeft size={14} strokeWidth={2} aria-hidden />
            Back
          </button>
        ) : null}
        <h1 className="text-[15px] font-semibold">{breadcrumb}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={openCameras}
          className="text-ink-2 hover:text-ink flex cursor-pointer items-center gap-2 font-mono text-xs transition-colors duration-150"
        >
          <span aria-hidden className="bg-accent size-[7px] rounded-full" />
          Archived footage · {cameraNames.length} cameras indexed
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
