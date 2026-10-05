"use client";

import { Cctv } from "lucide-react";
import { useEffect, useState } from "react";

import { QueryListSkeleton } from "@/components/ui/QueryListSkeleton";
import { StatCard } from "@/components/ui/StatCard";
import { getCameras } from "@/lib/api/endpoints";
import type { CameraDirectoryEntry } from "@/types";

type LoadStatus = "loading" | "ready" | "error";

const eventsLabel = (count: number) => `${count} ${count === 1 ? "event" : "events"}`;

/** Every camera the backend has indexed (`GET /api/v1/cameras`), grouped by scene. */
export function CamerasScreen() {
  const [directory, setDirectory] = useState<CameraDirectoryEntry[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  // Bumped by "Retry" to re-run the fetch effect.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getCameras()
      .then((cameras) => {
        if (cancelled) return;
        setDirectory(cameras);
        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Could not load the cameras.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Group by scene when the backend provides it; otherwise one flat list.
  const hasScenes = directory.some((camera) => camera.scene);
  const groups: Array<[string | null, CameraDirectoryEntry[]]> = hasScenes
    ? [...Map.groupBy(directory, (camera) => camera.scene ?? "other")]
    : [[null, directory]];
  const totalEvents = directory.reduce((sum, camera) => sum + camera.eventCount, 0);

  return (
    <div className="mx-auto w-full max-w-[960px] px-8 pt-12 pb-15">
      <h1 className="mb-1.5 text-2xl font-bold">Indexed Cameras</h1>
      <p className="text-ink-2 mb-7 text-sm">
        Archived footage sources the assistant searches. Not a live feed.
      </p>

      {status === "loading" ? (
        <QueryListSkeleton label="Loading cameras" className="gap-3" />
      ) : null}

      {status === "error" ? (
        <div
          role="alert"
          className="rounded-card glass-card-flat flex items-center justify-between gap-4 px-[18px] py-4"
        >
          <p className="text-flag text-sm">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="glass-card-flat text-ink-2 hover:text-ink h-9 shrink-0 cursor-pointer rounded-full px-4 font-sans text-[13px] transition-colors duration-150"
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" && directory.length === 0 ? (
        <section className="flex flex-col items-center px-6 py-10 text-center">
          <span
            aria-hidden
            className="border-accent-line bg-accent-soft text-accent-strong mb-5 flex size-14 items-center justify-center rounded-full border"
          >
            <Cctv size={24} strokeWidth={1.8} />
          </span>
          <h2 className="text-ink mb-2 text-[20px] font-semibold">No cameras indexed yet</h2>
          <p className="text-ink-2 max-w-[44ch] text-sm">
            Cameras appear here once their footage has been annotated and indexed.
          </p>
        </section>
      ) : null}

      {status === "ready" && directory.length > 0 ? (
        <>
          <ul
            aria-label="Directory summary"
            className="mb-9 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3"
          >
            <li>
              <StatCard label="CAMERAS" value={directory.length} />
            </li>
            <li>
              <StatCard label="SCENES" value={hasScenes ? groups.length : "—"} />
            </li>
            <li>
              <StatCard label="INDEXED EVENTS" value={totalEvents} />
            </li>
          </ul>

          {groups.map(([scene, cameras]) => (
            <section
              key={scene ?? "all"}
              aria-labelledby={scene ? `scene-${scene}` : undefined}
              className="mb-8 last:mb-0"
            >
              {scene ? (
                <h2
                  id={`scene-${scene}`}
                  className="text-ink-3 mb-3 font-mono text-[11px] tracking-[1.4px] uppercase"
                >
                  {scene}
                </h2>
              ) : null}
              <ul className="grid list-none [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))] gap-3 p-0">
                {cameras.map((camera) => (
                  <li
                    key={camera.code}
                    className="glass-card-flat flex items-center gap-3 rounded-xl p-4"
                  >
                    <span
                      aria-hidden
                      className="border-accent-line bg-accent-soft text-accent-strong flex size-10 shrink-0 items-center justify-center rounded-full border"
                    >
                      <Cctv size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-ink truncate font-mono text-[14px] font-semibold">
                        {camera.code}
                      </p>
                      <p className="text-ink-3 font-mono text-[12px]">
                        {eventsLabel(camera.eventCount)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      ) : null}
    </div>
  );
}
