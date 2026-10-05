"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getCameras } from "@/lib/api/endpoints";
import { topMatches } from "@/lib/matches";
import { useAppStore } from "@/store/useAppStore";

const FOOTAGE_CLASS =
  "text-ink-2 hover:text-ink flex cursor-pointer items-center gap-2 font-mono text-xs no-underline transition-colors duration-150";

const camerasLabel = (count: number) => `${count} ${count === 1 ? "camera" : "cameras"}`;

const BREADCRUMBS: ReadonlyArray<{ prefix: string; label: string }> = [
  { prefix: "/dashboard", label: "Query" },
  { prefix: "/results", label: "Results" },
  { prefix: "/clips", label: "Clip Detail" },
  { prefix: "/saved", label: "Saved Queries" },
  { prefix: "/pipeline", label: "Annotation Pipeline" },
  { prefix: "/cameras", label: "Indexed Cameras" },
  { prefix: "/settings", label: "Settings" },
  { prefix: "/profile", label: "Profile" },
];

/**
 * SPEC §1 — 64px sticky bar at z-25, which must stay above the query field's
 * own z-20 stacking context so the field never scrolls over the bar.
 */
export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const openCameras = useAppStore((state) => state.openCameras);
  const results = useAppStore((state) => state.results);
  const searchPending = useAppStore((state) => state.searchPending);
  /** Distinct cameras behind the Results strip — what the cameras dialog lists there. */
  const camerasInSearch = useMemo(
    () => new Set(topMatches(results).map((clip) => clip.code)).size,
    [results],
  );
  /** Cameras in the backend's directory; unknown (no count shown) until it answers. */
  const [cameraCount, setCameraCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCameras()
      .then((cameras) => {
        if (!cancelled) setCameraCount(cameras.length);
      })
      .catch(() => {
        // The count is decoration; the Indexed Cameras screen reports the error.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const breadcrumb =
    BREADCRUMBS.find((entry) => pathname.startsWith(entry.prefix))?.label ?? "Query";
  const showBack = !pathname.startsWith("/dashboard");
  // On Results the indicator is about this search; mid-search `results` is still the
  // previous set, so it falls back to the directory link until the answer arrives.
  const scopedToSearch = pathname.startsWith("/results") && !searchPending && camerasInSearch > 0;

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
        {scopedToSearch ? (
          <button type="button" onClick={openCameras} className={FOOTAGE_CLASS}>
            <span aria-hidden className="bg-accent size-[7px] rounded-full" />
            {camerasLabel(camerasInSearch)} in this search
          </button>
        ) : (
          <Link href="/cameras" className={FOOTAGE_CLASS}>
            <span aria-hidden className="bg-accent size-[7px] rounded-full" />
            Archived footage
            {cameraCount !== null ? ` · ${camerasLabel(cameraCount)} indexed` : null}
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
