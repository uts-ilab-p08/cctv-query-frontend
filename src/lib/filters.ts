import type { Clip, Filters } from "@/types";

export const emptyFilters: Filters = {
  cameras: [],
  tags: [],
  confidence: 0,
  dateFrom: "",
  dateTo: "",
};

/**
 * Narrow the clip set down to the active filters, chronologically ordered.
 * An empty camera or tag list means "no restriction on that axis".
 */
export function filterClips(clips: Clip[], filters: Filters): Clip[] {
  return clips
    .filter((clip) => filters.cameras.length === 0 || filters.cameras.includes(clip.camera))
    .filter(
      (clip) => filters.tags.length === 0 || filters.tags.some((tag) => clip.tags.includes(tag)),
    )
    .filter((clip) => clip.confidence >= filters.confidence)
    .sort((a, b) => a.order - b.order);
}

export interface FilterChip {
  key: string;
  label: string;
  kind: "camera" | "tag";
}

/** Removable chips summarising what is currently constraining the results. */
export function getActiveFilterChips(filters: Filters): FilterChip[] {
  return [
    ...filters.cameras.map((camera): FilterChip => ({
      key: `camera:${camera}`,
      label: camera,
      kind: "camera",
    })),
    ...filters.tags.map((tag): FilterChip => ({ key: `tag:${tag}`, label: tag, kind: "tag" })),
  ];
}

export function hasActiveFilters(filters: Filters): boolean {
  return filters.cameras.length > 0 || filters.tags.length > 0;
}
