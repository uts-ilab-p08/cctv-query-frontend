import type { ClipTag } from "@/types";

/** Camera codes indexed in the demo dataset, in directory order. */
export const cameraNames = [
  "G299",
  "G301",
  "G328",
  "G420",
  "G421",
  "G423",
  "G424",
  "G506",
] as const;

/**
 * MOCK scene (site within the facility) per demo camera, MEVA-style (`admin`,
 * `school`, …). Illustrative only — the real value comes from
 * `bronze.videos.scene` once /search and /cameras return it.
 */
export const cameraScenes: Record<string, string> = {
  G299: "school",
  G301: "school",
  G328: "admin",
  G420: "admin",
  G421: "hospital",
  G423: "hospital",
  G424: "hospital",
  G506: "bus",
};

/** Scenes available as filter chips, in display order. */
export const sceneNames = [...new Set(Object.values(cameraScenes))];

/** Event types available as filter chips. */
export const tagNames: ClipTag[] = [
  "Person",
  "Vehicle",
  "Entry",
  "Exit",
  "Loitering",
  "Object Left",
];
