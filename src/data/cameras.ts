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
