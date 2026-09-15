"use client";

import { Modal } from "@/components/ui/Modal";
import { getCameraDirectory } from "@/lib/clips";
import { useAppStore } from "@/store/useAppStore";

export function CamerasModal() {
  const camerasOpen = useAppStore((state) => state.camerasOpen);
  const closeCameras = useAppStore((state) => state.closeCameras);
  const precinct = useAppStore((state) => state.precinct);

  const directory = getCameraDirectory();

  return (
    <Modal
      open={camerasOpen}
      onClose={closeCameras}
      title="Indexed Cameras"
      description={`${precinct} · archived footage sources, not a live feed.`}
      width={480}
    >
      <ul className="border-hairline bg-border flex flex-col gap-px overflow-hidden rounded-md border">
        {directory.map((camera) => (
          <li
            key={camera.code}
            className="bg-panel-solid flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-ink font-mono text-[13px] font-semibold">{camera.code}</p>
              <p className="text-ink-3 text-xs">{camera.perspective}</p>
            </div>
            <span className="bg-accent-soft text-accent rounded-xs px-2 py-[3px] font-mono text-[11px]">
              {camera.eventCount} events
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
