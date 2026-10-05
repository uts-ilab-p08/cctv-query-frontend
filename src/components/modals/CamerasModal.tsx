"use client";

import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { getCameras } from "@/lib/api/endpoints";
import { topMatches } from "@/lib/matches";
import { useAppStore } from "@/store/useAppStore";
import type { CameraDirectoryEntry } from "@/types";

interface SearchCamera {
  code: string;
  scene?: string;
  /** Top matches on this camera. */
  matchCount: number;
}

const plural = (count: number, word: string, many = `${word}s`) =>
  `${count} ${count === 1 ? word : many}`;

/**
 * The cameras behind the Results strip (opened from the Topbar on Results). The full
 * directory lives on the Indexed Cameras screen; here it only adds each camera's total.
 */
export function CamerasModal() {
  const camerasOpen = useAppStore((state) => state.camerasOpen);
  const closeCameras = useAppStore((state) => state.closeCameras);
  const results = useAppStore((state) => state.results);

  const [directory, setDirectory] = useState<CameraDirectoryEntry[]>([]);

  useEffect(() => {
    if (!camerasOpen) return;
    let cancelled = false;
    getCameras()
      .then((cameras) => {
        if (!cancelled) setDirectory(cameras);
      })
      .catch(() => {
        // The totals are extra: the list itself comes from the search.
        if (!cancelled) setDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [camerasOpen]);

  const matches = useMemo(() => topMatches(results), [results]);
  const cameras: SearchCamera[] = useMemo(
    () =>
      [...Map.groupBy(matches, (clip) => clip.code)].map(([code, clips]) => ({
        code,
        scene: clips[0].scene,
        matchCount: clips.length,
      })),
    [matches],
  );
  const indexedEvents = new Map(directory.map((camera) => [camera.code, camera.eventCount]));

  // Group by scene when the matches carry it; otherwise one flat list.
  const groups: Array<[string | null, SearchCamera[]]> = cameras.some((c) => c.scene)
    ? [...Map.groupBy(cameras, (camera) => camera.scene ?? "other")]
    : [[null, cameras]];

  return (
    <Modal
      open={camerasOpen}
      onClose={closeCameras}
      title="Cameras in this search"
      description={`The cameras behind the top ${plural(matches.length, "match", "matches")}.`}
      width={480}
    >
      {groups.map(([scene, group]) => (
        <div
          key={scene ?? "all"}
          role={scene ? "group" : undefined}
          aria-label={scene ?? undefined}
          className="mb-4 last:mb-0"
        >
          {scene ? (
            <h3 className="text-ink-3 mb-1.5 font-mono text-[11px] tracking-[1px] uppercase">
              {scene}
            </h3>
          ) : null}
          <ul className="border-hairline rounded-chip flex flex-col overflow-hidden border">
            {group.map((camera) => {
              const total = indexedEvents.get(camera.code);
              return (
                <li
                  key={camera.code}
                  className="bg-panel-solid border-hairline flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <p className="text-ink font-mono text-[13px] font-semibold">{camera.code}</p>
                  <span className="flex items-center gap-2">
                    {total !== undefined ? (
                      <span className="text-ink-3 font-mono text-[11px]">{total} indexed</span>
                    ) : null}
                    <span className="bg-accent-soft text-accent rounded-chip px-2 py-[3px] font-mono text-[11px]">
                      {plural(camera.matchCount, "match", "matches")}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </Modal>
  );
}
