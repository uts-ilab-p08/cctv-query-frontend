import { clips } from "@/data/clips";
import { cameraNames } from "@/data/cameras";
import type { CameraDirectoryEntry, Clip } from "@/types";

/**
 * Read access to the clip catalogue. Every screen goes through these helpers,
 * so pointing them at a real API means editing only this file.
 */

export function getAllClips(): Clip[] {
  return clips;
}

export function getClipById(id: string): Clip | undefined {
  return clips.find((clip) => clip.id === id);
}

/** Falls back to a placeholder still frame when the backend doesn't provide one yet. */
export function getThumbUrl(clip: Clip): string {
  return clip.thumbnailUrl ?? `https://picsum.photos/seed/cctv-${clip.code}-${clip.id}/640/400`;
}

export type ConfidenceLevel = "high" | "mid" | "low";

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 85) return "high";
  if (confidence >= 65) return "mid";
  return "low";
}

/** Clips nearest in time to the given one, closest first. */
export function getRelatedClips(clip: Clip, limit = 4): Clip[] {
  return clips
    .filter((candidate) => candidate.id !== clip.id)
    .sort((a, b) => Math.abs(a.order - clip.order) - Math.abs(b.order - clip.order))
    .slice(0, limit);
}

/** Camera list with the number of indexed events behind each code. */
export function getCameraDirectory(): CameraDirectoryEntry[] {
  return cameraNames.map((code) => {
    const sample = clips.find((clip) => clip.code === code);
    return {
      code,
      perspective: sample?.perspective ?? "—",
      eventCount: clips.filter((clip) => clip.code === code).length,
    };
  });
}
