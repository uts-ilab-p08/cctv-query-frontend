"use client";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Modal } from "@/components/ui/Modal";
import { cameraNames, tagNames } from "@/data/cameras";
import { useAppStore } from "@/lib/store";

export function FiltersModal() {
  const openModal = useAppStore((state) => state.openModal);
  const setOpenModal = useAppStore((state) => state.setOpenModal);
  const filters = useAppStore((state) => state.filters);
  const toggleCameraFilter = useAppStore((state) => state.toggleCameraFilter);
  const toggleTagFilter = useAppStore((state) => state.toggleTagFilter);
  const setConfidenceFilter = useAppStore((state) => state.setConfidenceFilter);
  const setDateFrom = useAppStore((state) => state.setDateFrom);
  const setDateTo = useAppStore((state) => state.setDateTo);

  const close = () => setOpenModal(null);

  return (
    <Modal
      open={openModal === "filters"}
      onClose={close}
      title="Filters"
      width={520}
      footer={
        <Button size="lg" onClick={close} className="mt-[18px] h-[46px] w-full rounded-md">
          Apply filters
        </Button>
      }
    >
      <fieldset className="mb-5 border-0 p-0">
        <legend className="text-ink-muted mb-2 text-xs">Cameras</legend>
        <div className="flex flex-wrap gap-2">
          {cameraNames.map((camera) => (
            <Chip
              key={camera}
              tone="navy"
              active={filters.cameras.includes(camera)}
              onClick={() => toggleCameraFilter(camera)}
              className="rounded-xl px-3 py-1.5"
            >
              {camera}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="mb-5 flex flex-wrap gap-5">
        <div>
          <FieldLabel htmlFor="filter-date-from">From</FieldLabel>
          <input
            id="filter-date-from"
            type="datetime-local"
            value={filters.dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="border-border-input text-ink rounded-xs border bg-white px-2.5 py-2 font-mono text-[13px]"
          />
        </div>
        <div>
          <FieldLabel htmlFor="filter-date-to">To</FieldLabel>
          <input
            id="filter-date-to"
            type="datetime-local"
            value={filters.dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="border-border-input text-ink rounded-xs border bg-white px-2.5 py-2 font-mono text-[13px]"
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <FieldLabel htmlFor="filter-confidence">
            Min. Confidence — {filters.confidence}%
          </FieldLabel>
          <input
            id="filter-confidence"
            type="range"
            min={0}
            max={100}
            value={filters.confidence}
            onChange={(event) => setConfidenceFilter(Number(event.target.value))}
            className="accent-indigo-strong w-full"
          />
        </div>
      </div>

      <fieldset className="mb-2 border-0 p-0">
        <legend className="text-ink-muted mb-2 text-xs">Event type</legend>
        <div className="flex flex-wrap gap-2">
          {tagNames.map((tag) => (
            <Chip
              key={tag}
              mono={false}
              active={filters.tags.includes(tag)}
              onClick={() => toggleTagFilter(tag)}
              className="rounded-xl px-3 py-1.5"
            >
              {tag}
            </Chip>
          ))}
        </div>
      </fieldset>
    </Modal>
  );
}
