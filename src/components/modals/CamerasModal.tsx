"use client";

import { Modal } from "@/components/ui/Modal";
import { getCameraDirectory } from "@/lib/clips";
import { useAppStore } from "@/lib/store";

export function CamerasModal() {
  const openModal = useAppStore((state) => state.openModal);
  const setOpenModal = useAppStore((state) => state.setOpenModal);
  const selectedPrecinct = useAppStore((state) => state.selectedPrecinct);

  const directory = getCameraDirectory();

  return (
    <Modal
      open={openModal === "cameras"}
      onClose={() => setOpenModal(null)}
      title="Indexed Cameras"
      description={`${selectedPrecinct} · archived footage sources, not a live feed.`}
      width={480}
    >
      <ul className="border-border bg-border flex flex-col gap-px overflow-hidden rounded-md border">
        {directory.map((camera) => (
          <li key={camera.code} className="flex items-center justify-between bg-white px-4 py-3">
            <div>
              <p className="text-ink font-mono text-[13px] font-semibold">{camera.code}</p>
              <p className="text-ink-subtle text-xs">{camera.perspective}</p>
            </div>
            <span className="bg-indigo-wash text-indigo-strong rounded-xs px-2 py-[3px] font-mono text-[11px]">
              {camera.eventCount} events
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
