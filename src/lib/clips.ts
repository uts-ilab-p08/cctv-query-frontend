import { clips } from "@/data/clips";
import { cameraNames } from "@/data/cameras";
import type { CameraDirectoryEntry, Clip } from "@/types";

/**
 * TEST-ONLY read access to the fixture catalogue in `src/data`. The app reads clips
 * from the API (`src/lib/api/endpoints.ts`); tests use these to stand in for it.
 */

export function getAllClips(): Clip[] {
  return clips;
}

export function getClipById(id: string): Clip | undefined {
  return clips.find((clip) => clip.id === id);
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
      scene: sample?.scene,
      eventCount: clips.filter((clip) => clip.code === code).length,
    };
  });
}
